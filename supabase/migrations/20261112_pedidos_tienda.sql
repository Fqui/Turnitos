-- Pedidos de la tienda online + aviso push "Nueva compra en tu tienda".
--
-- Flujo:
--   1. La clienta toca "Confirmar pedido vía WhatsApp" -> create_store_order()
--      guarda el pedido como 'unconfirmed' (sin aviso) y devuelve número y token.
--   2. Toca "Sí, ya lo envié" -> confirm_store_order() lo pasa a 'new'.
--   3. El trigger de UPDATE a 'new' llama a la edge function notify-new-booking
--      (mismo secreto de Vault) con { order_id } y se manda el push.
-- La clienta no deja datos personales. Los precios se toman del catálogo del
-- negocio (businesses.metadata.store_products), no de lo que manda el navegador.

-- ---------------------------------------------------------------------------
-- 1. Tabla
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id text NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    order_number integer NOT NULL,
    items jsonb NOT NULL,
    subtotal numeric(12,2) NOT NULL,
    discount numeric(12,2) NOT NULL DEFAULT 0,
    total numeric(12,2) NOT NULL,
    coupon_label text,
    status text NOT NULL DEFAULT 'unconfirmed'
        CHECK (status IN ('unconfirmed', 'new', 'delivered', 'cancelled')),
    confirm_token uuid NOT NULL DEFAULT gen_random_uuid(),
    confirmed_at timestamptz,
    seen_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (business_id, order_number)
);

CREATE INDEX IF NOT EXISTS idx_store_orders_business_created
    ON public.store_orders (business_id, created_at DESC);

ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;

-- Solo quien gestiona el negocio ve sus pedidos. Nadie inserta/edita directo:
-- todo pasa por las funciones de abajo.
DROP POLICY IF EXISTS "store_orders_manager_select" ON public.store_orders;
CREATE POLICY "store_orders_manager_select" ON public.store_orders
    FOR SELECT TO authenticated
    USING (public.can_manage_business(business_id));

REVOKE ALL ON public.store_orders FROM anon, authenticated;
-- Todas las columnas menos el token de confirmación (no lo necesita ni el negocio)
GRANT SELECT (id, business_id, order_number, items, subtotal, discount, total, coupon_label,
              status, confirmed_at, seen_at, created_at, updated_at)
    ON public.store_orders TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Crear pedido (clienta anónima o logueada)
-- ---------------------------------------------------------------------------
-- p_items: [{ "id": "<id de producto>", "qty": 2, "size": "M" }, ...]
CREATE OR REPLACE FUNCTION public.create_store_order(
    p_business_id text,
    p_items jsonb,
    p_discount numeric DEFAULT 0,
    p_coupon_label text DEFAULT NULL
)
RETURNS TABLE (order_id uuid, order_number integer, confirm_token uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    v_products jsonb;
    v_item jsonb;
    v_product jsonb;
    v_qty integer;
    v_size text;
    v_items jsonb := '[]'::jsonb;
    v_subtotal numeric := 0;
    v_discount numeric;
    v_number integer;
    v_row public.store_orders;
BEGIN
    SELECT b.metadata -> 'store_products' INTO v_products
    FROM public.businesses b
    WHERE b.id = p_business_id
      AND coalesce(b.store_enabled, true);

    IF v_products IS NULL OR jsonb_typeof(v_products) <> 'array' THEN
        RAISE EXCEPTION 'Tienda no disponible' USING ERRCODE = '22023';
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array'
       OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 50 THEN
        RAISE EXCEPTION 'Pedido inválido' USING ERRCODE = '22023';
    END IF;

    -- Anti-spam: como mucho 10 pedidos sin confirmar por negocio en 10 minutos
    IF (SELECT count(*) FROM public.store_orders o
        WHERE o.business_id = p_business_id
          AND o.status = 'unconfirmed'
          AND o.created_at > now() - interval '10 minutes') >= 10 THEN
        RAISE EXCEPTION 'Demasiados pedidos, probá en unos minutos' USING ERRCODE = '54000';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_qty := CASE WHEN (v_item ->> 'qty') ~ '^\d{1,3}$' THEN (v_item ->> 'qty')::integer ELSE 0 END;
        IF v_qty < 1 OR v_qty > 99 THEN
            RAISE EXCEPTION 'Cantidad inválida' USING ERRCODE = '22023';
        END IF;

        SELECT p INTO v_product
        FROM jsonb_array_elements(v_products) p
        WHERE p ->> 'id' = v_item ->> 'id'
          AND coalesce((p ->> 'is_active')::boolean, true)
        LIMIT 1;

        IF v_product IS NULL THEN
            RAISE EXCEPTION 'Producto no disponible' USING ERRCODE = '22023';
        END IF;

        v_size := nullif(left(v_item ->> 'size', 40), '');
        v_items := v_items || jsonb_build_object(
            'id', v_product ->> 'id',
            'name', left(v_product ->> 'name', 120),
            'size', v_size,
            'qty', v_qty,
            'price', coalesce((v_product ->> 'price')::numeric, 0)
        );
        v_subtotal := v_subtotal + v_qty * coalesce((v_product ->> 'price')::numeric, 0);
    END LOOP;

    v_discount := least(greatest(coalesce(p_discount, 0), 0), v_subtotal);

    -- Número correlativo por negocio
    PERFORM pg_advisory_xact_lock(hashtext('store_orders:' || p_business_id));
    SELECT coalesce(max(o.order_number), 0) + 1 INTO v_number
    FROM public.store_orders o WHERE o.business_id = p_business_id;

    INSERT INTO public.store_orders (business_id, order_number, items, subtotal, discount, total, coupon_label)
    VALUES (p_business_id, v_number, v_items, v_subtotal, v_discount, v_subtotal - v_discount,
            nullif(left(p_coupon_label, 80), ''))
    RETURNING * INTO v_row;

    RETURN QUERY SELECT v_row.id, v_row.order_number, v_row.confirm_token;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_store_order(text, jsonb, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_store_order(text, jsonb, numeric, text) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. La clienta confirma que mandó el WhatsApp
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.confirm_store_order(p_order_id uuid, p_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
    UPDATE public.store_orders
    SET status = 'new', confirmed_at = now(), updated_at = now()
    WHERE id = p_order_id
      AND confirm_token = p_token
      AND status = 'unconfirmed'
      AND created_at > now() - interval '2 days';
    RETURN FOUND;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.confirm_store_order(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_store_order(uuid, uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. El negocio cambia el estado o marca como visto
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_store_order_status(p_order_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    v_business text;
BEGIN
    SELECT business_id INTO v_business FROM public.store_orders WHERE id = p_order_id;
    IF v_business IS NULL OR NOT public.can_manage_business(v_business) THEN
        RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
    END IF;
    IF p_status NOT IN ('new', 'delivered', 'cancelled') THEN
        RAISE EXCEPTION 'Estado inválido' USING ERRCODE = '22023';
    END IF;

    UPDATE public.store_orders
    SET status = p_status,
        confirmed_at = coalesce(confirmed_at, now()),
        seen_at = coalesce(seen_at, now()),
        updated_at = now()
    WHERE id = p_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_store_orders_seen(p_business_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
    IF NOT public.can_manage_business(p_business_id) THEN
        RAISE EXCEPTION 'No autorizado' USING ERRCODE = '42501';
    END IF;
    UPDATE public.store_orders SET seen_at = now()
    WHERE business_id = p_business_id AND seen_at IS NULL AND status = 'new';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_store_order_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_store_order_status(uuid, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_store_orders_seen(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_store_orders_seen(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. Trigger: pedido confirmado -> push al negocio
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_new_store_order_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
    v_url text;
    v_secret text;
BEGIN
    -- Solo cuando la clienta confirma; si el negocio lo pasa a "nuevo" a mano ya viene visto
    IF NEW.status <> 'new' OR OLD.status <> 'unconfirmed' OR NEW.seen_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.push_subscriptions s WHERE s.business_id = NEW.business_id) THEN
        RETURN NEW;
    END IF;

    SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'push_notify_url';
    SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'push_webhook_secret';
    IF v_url IS NULL OR v_secret IS NULL THEN
        RETURN NEW;
    END IF;

    PERFORM net.http_post(
        url := v_url,
        body := jsonb_build_object('order_id', NEW.id),
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
        timeout_milliseconds := 8000
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_new_store_order_push: %', SQLERRM;
    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_new_store_order_push() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trigger_90_notify_new_store_order_push ON public.store_orders;
CREATE TRIGGER trigger_90_notify_new_store_order_push
    AFTER UPDATE OF status ON public.store_orders
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_new_store_order_push();
