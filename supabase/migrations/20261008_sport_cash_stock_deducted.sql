-- ==============================================================================
-- Caja: anular un movimiento devuelve solo el stock que realmente se descontó.
--
-- Antes, vender 3 de un artículo con stock 1 dejaba el stock en 0 (no baja de 0),
-- pero anular esa venta devolvía 3 y el stock quedaba inflado.
-- Ahora cada ítem guarda "stock_deducted" (lo que se descontó de verdad) y la
-- anulación devuelve ese número. Los movimientos viejos sin ese dato siguen
-- devolviendo "quantity" como antes.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.register_sport_cash_movement(
    p_business_id text,
    p_type text,
    p_payment_method text,
    p_amount numeric,
    p_description text DEFAULT '',
    p_items jsonb DEFAULT '[]'::jsonb,
    p_booking_id uuid DEFAULT NULL
)
RETURNS public.sport_cash_movements
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_register_id uuid;
    v_item jsonb;
    v_items jsonb := '[]'::jsonb;
    v_qty integer;
    v_stock integer;
    v_deducted integer;
    v_mov public.sport_cash_movements;
BEGIN
    IF NOT public.can_manage_business(p_business_id) THEN
        RAISE EXCEPTION 'Sin permiso';
    END IF;

    SELECT id INTO v_register_id
      FROM public.sport_cash_registers
     WHERE business_id = p_business_id AND status = 'open'
     FOR UPDATE;
    IF v_register_id IS NULL THEN
        RAISE EXCEPTION 'No hay una caja abierta';
    END IF;

    IF p_booking_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.bookings WHERE id = p_booking_id AND business_id = p_business_id
    ) THEN
        RAISE EXCEPTION 'Reserva no encontrada';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_items, '[]'::jsonb)) LOOP
        v_qty := GREATEST(1, COALESCE((v_item->>'quantity')::int, 1));
        v_deducted := 0;

        IF v_item ? 'product_id' AND COALESCE(v_item->>'product_id', '') <> '' THEN
            SELECT current_stock INTO v_stock
              FROM public.sport_canteen_products
             WHERE id = (v_item->>'product_id')::uuid
               AND business_id = p_business_id
               AND track_stock
             FOR UPDATE;

            IF FOUND THEN
                v_deducted := LEAST(v_stock, v_qty);
                UPDATE public.sport_canteen_products
                   SET current_stock = v_stock - v_deducted,
                       updated_at = now()
                 WHERE id = (v_item->>'product_id')::uuid;
            END IF;
        END IF;

        v_items := v_items || jsonb_build_array(
            v_item || jsonb_build_object('quantity', v_qty, 'stock_deducted', v_deducted)
        );
    END LOOP;

    INSERT INTO public.sport_cash_movements
        (cash_register_id, business_id, type, payment_method, amount, description, items_detail, booking_id)
    VALUES
        (v_register_id, p_business_id, p_type, p_payment_method, p_amount, COALESCE(p_description, ''),
         v_items, p_booking_id)
    RETURNING * INTO v_mov;

    RETURN v_mov;
END;
$$;

CREATE OR REPLACE FUNCTION public.void_sport_cash_movement(p_movement_id uuid, p_reason text DEFAULT '')
RETURNS public.sport_cash_movements
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_mov public.sport_cash_movements;
    v_item jsonb;
BEGIN
    SELECT m.* INTO v_mov
      FROM public.sport_cash_movements m
      JOIN public.sport_cash_registers r ON r.id = m.cash_register_id
     WHERE m.id = p_movement_id AND r.status = 'open'
     FOR UPDATE OF m;
    IF v_mov.id IS NULL OR NOT public.can_manage_business(v_mov.business_id) THEN
        RAISE EXCEPTION 'Movimiento no encontrado o caja cerrada';
    END IF;
    IF v_mov.voided_at IS NOT NULL THEN
        RETURN v_mov;
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(v_mov.items_detail) LOOP
        IF v_item ? 'product_id' AND COALESCE(v_item->>'product_id', '') <> '' THEN
            UPDATE public.sport_canteen_products
               SET current_stock = current_stock + CASE
                       WHEN v_item ? 'stock_deducted' THEN GREATEST(0, COALESCE((v_item->>'stock_deducted')::int, 0))
                       ELSE GREATEST(1, COALESCE((v_item->>'quantity')::int, 1))
                   END,
                   updated_at = now()
             WHERE id = (v_item->>'product_id')::uuid
               AND business_id = v_mov.business_id
               AND track_stock;
        END IF;
    END LOOP;

    UPDATE public.sport_cash_movements
       SET voided_at = now(), voided_reason = NULLIF(btrim(COALESCE(p_reason, '')), '')
     WHERE id = p_movement_id
     RETURNING * INTO v_mov;
    RETURN v_mov;
END;
$$;

REVOKE ALL ON FUNCTION public.register_sport_cash_movement(text, text, text, numeric, text, jsonb, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.void_sport_cash_movement(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_sport_cash_movement(text, text, text, numeric, text, jsonb, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.void_sport_cash_movement(uuid, text) TO authenticated;
