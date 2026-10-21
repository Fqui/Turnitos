-- Carga de negocios (cargar-negocios.mjs): horarios de ingreso de alquileres, punto de la portada y seña.
-- Claves nuevas de p_data que entiende admin_apply_business_extras:
--   horarios_ingreso: { start_times: { "0".."6": ["HH:MM"] }, max_end: minutos | null } -> metadata.rental_schedule
--   portada_foco:     { x, y } en %                                                  -> metadata.banner_focus
--   sena:             { porcentaje } o { monto } ; porcentaje 0 la desactiva             -> payment_settings.deposit
--   transferencia:    { alias, cbu, banco, titular }                                  -> payment_settings.bank_details + método transferencia
-- El resto queda igual que antes.

CREATE OR REPLACE FUNCTION public.admin_apply_business_extras(p_business_id text, p_data jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
    v_coupons  jsonb;
    v_links    jsonb;
    v_special  jsonb;
    v_hours    jsonb;
    v_pol      jsonb := p_data->'politicas';
    v_sena     jsonb := p_data->'sena';
    v_bank     jsonb := p_data->'transferencia';
    v_deposit  jsonb;
BEGIN
    IF jsonb_typeof(p_data->'cupones') = 'array' THEN
        SELECT coalesce(jsonb_agg(jsonb_build_object(
                   'id', 'coup_' || (extract(epoch FROM now())::bigint * 1000 + n),
                   'code', upper(c->>'codigo'),
                   'type', CASE c->>'tipo' WHEN 'fijo' THEN 'fixed' WHEN 'regalo' THEN 'gift' ELSE 'percentage' END,
                   'value', coalesce((c->>'valor')::numeric, 0),
                   'active', true,
                   'description', coalesce(c->>'descripcion', ''),
                   'gift_title', c->>'regalo',
                   'min_spend', coalesce((c->>'minimo')::numeric, 0),
                   'max_discount', (c->>'tope')::numeric,
                   'max_uses', (c->>'max_usos')::integer,
                   'used_count', 0,
                   'start_date', NULL,
                   'end_date', c->>'vence',
                   'valid_days', '[]'::jsonb,
                   'one_per_customer', coalesce((c->>'uno_por_cliente')::boolean, true)
               ) ORDER BY n), '[]'::jsonb)
        INTO v_coupons
        FROM jsonb_array_elements(p_data->'cupones') WITH ORDINALITY AS x(c, n);
    END IF;

    IF jsonb_typeof(p_data->'links') = 'array' THEN
        SELECT coalesce(jsonb_agg(jsonb_build_object(
                   'id', 'link_' || (extract(epoch FROM now())::bigint * 1000 + n),
                   'title', l->>'titulo',
                   'subtitle', coalesce(l->>'subtitulo', ''),
                   'url', l->>'url',
                   'icon', coalesce(l->>'icono', '🔗'),
                   'enabled', true,
                   'highlight', coalesce((l->>'destacado')::boolean, false),
                   'button_color', l->>'color',
                   'file_url', NULL, 'file_name', NULL, 'file_size', NULL
               ) ORDER BY n), '[]'::jsonb)
        INTO v_links
        FROM jsonb_array_elements(p_data->'links') WITH ORDINALITY AS x(l, n);
    END IF;

    IF jsonb_typeof(p_data->'dias_especiales') = 'array' THEN
        SELECT coalesce(jsonb_agg(jsonb_build_object(
                   'id', 'special_' || (extract(epoch FROM now())::bigint * 1000 + n),
                   'date', d->>'fecha',
                   'type', CASE d->>'tipo' WHEN 'cerrado' THEN 'closed' WHEN 'feriado' THEN 'holiday'
                                           WHEN 'horario' THEN 'special_hours' ELSE 'special_price' END,
                   'description', coalesce(d->>'descripcion', ''),
                   'open', d->>'abre',
                   'close', d->>'cierra',
                   'priceMode', CASE WHEN d->>'tipo' = 'precio' THEN
                                    CASE d->>'modo' WHEN 'fijo' THEN 'fixed' WHEN 'recargo' THEN 'surcharge' ELSE 'discount_percent' END
                                END,
                   'priceVal', CASE WHEN d->>'tipo' = 'precio' THEN (d->>'valor')::numeric END
               ) ORDER BY n), '[]'::jsonb)
        INTO v_special
        FROM jsonb_array_elements(p_data->'dias_especiales') WITH ORDINALITY AS x(d, n);

        SELECT CASE WHEN hours IS NULL OR hours = '' THEN '{}'::jsonb ELSE hours::jsonb END
        INTO v_hours FROM public.businesses WHERE id = p_business_id;
        v_hours := v_hours || jsonb_build_object('special_days', v_special);
    END IF;

    IF jsonb_typeof(v_sena) = 'object' THEN
        v_deposit := CASE
            WHEN nullif(v_sena->>'monto', '') IS NOT NULL THEN jsonb_build_object(
                'enabled', (v_sena->>'monto')::numeric > 0, 'type', 'fixed',
                'percentage', 30, 'fixed_amount', (v_sena->>'monto')::numeric)
            ELSE jsonb_build_object(
                'enabled', coalesce((v_sena->>'porcentaje')::numeric, 30) > 0, 'type', 'percentage',
                'percentage', coalesce((v_sena->>'porcentaje')::numeric, 30), 'fixed_amount', 0)
        END;
    END IF;

    UPDATE public.businesses b SET
        hours = coalesce(v_hours::text, b.hours),
        booking_rules = CASE WHEN jsonb_typeof(v_pol) = 'object' THEN
            jsonb_set(jsonb_set(jsonb_set(jsonb_set(coalesce(b.booking_rules, '{}'::jsonb),
                '{cancellation,deadline_hours}', to_jsonb(coalesce((v_pol->>'cancelacion_horas')::integer, (b.booking_rules #>> '{cancellation,deadline_hours}')::integer, 24))),
                '{cancellation,refund_policy}', to_jsonb(coalesce(v_pol->>'reembolso', b.booking_rules #>> '{cancellation,refund_policy}', 'full'))),
                '{advance_booking,max_days}', to_jsonb(coalesce((v_pol->>'anticipacion_dias')::integer, (b.booking_rules #>> '{advance_booking,max_days}')::integer, 30))),
                '{advance_booking,min_hours}', to_jsonb(coalesce((v_pol->>'anticipacion_min_horas')::integer, (b.booking_rules #>> '{advance_booking,min_hours}')::integer, 2)))
            ELSE b.booking_rules END,
        payment_settings = coalesce(b.payment_settings, '{}'::jsonb)
            || CASE WHEN v_deposit IS NOT NULL THEN jsonb_build_object('deposit', v_deposit) ELSE '{}'::jsonb END
            || CASE WHEN jsonb_typeof(v_bank) = 'object' THEN jsonb_build_object(
                    'bank_details', jsonb_build_object(
                        'alias', coalesce(v_bank->>'alias', ''),
                        'cbu', coalesce(v_bank->>'cbu', ''),
                        'bank_name', coalesce(v_bank->>'banco', ''),
                        'account_holder', coalesce(v_bank->>'titular', '')),
                    'methods', '[{"type": "cash", "enabled": true}, {"type": "transfer", "enabled": true}]'::jsonb)
               ELSE '{}'::jsonb END,
        metadata = b.metadata
            || CASE WHEN v_coupons IS NOT NULL THEN jsonb_build_object('coupons', v_coupons) ELSE '{}'::jsonb END
            || CASE WHEN v_links IS NOT NULL THEN jsonb_build_object('custom_links', v_links) ELSE '{}'::jsonb END
            || CASE WHEN jsonb_typeof(p_data->'descuentos_duracion') = 'object'
                    THEN jsonb_build_object('duration_discounts', p_data->'descuentos_duracion') ELSE '{}'::jsonb END
            || CASE WHEN jsonb_typeof(p_data->'horarios_ingreso') = 'object'
                    THEN jsonb_build_object('rental_schedule', p_data->'horarios_ingreso') ELSE '{}'::jsonb END
            || CASE WHEN jsonb_typeof(p_data->'portada_foco') = 'object'
                    THEN jsonb_build_object('banner_focus', jsonb_build_object(
                        'x', (p_data->'portada_foco'->>'x')::numeric, 'y', (p_data->'portada_foco'->>'y')::numeric))
                    ELSE '{}'::jsonb END
    WHERE b.id = p_business_id;
END;
$function$;
