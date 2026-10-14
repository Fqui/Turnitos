-- ==============================================================================
-- Registro de Caja Diaria y Artículos y Stock (negocios de canchas / deportes)
--
-- Datos privados del negocio: solo el dueño, su vendedor o el super admin
-- (public.can_manage_business) pueden leer y escribir. Nada es público.
-- Las operaciones que tocan caja + stock van por funciones para que sean atómicas.
-- ==============================================================================

-- 1. Artículos y stock
CREATE TABLE IF NOT EXISTS public.sport_canteen_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL CHECK (length(btrim(name)) > 0),
    category TEXT NOT NULL DEFAULT 'Bebidas', -- 'Bebidas' | 'Snacks' | 'Equipamiento' | 'Alquileres' | 'Otro'
    sale_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (sale_price >= 0),
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
    track_stock BOOLEAN NOT NULL DEFAULT true, -- false para alquileres de paletas, etc.
    current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    min_stock_alert INTEGER NOT NULL DEFAULT 5 CHECK (min_stock_alert >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sport_canteen_products_biz ON public.sport_canteen_products(business_id);

-- 2. Cajas (un turno de caja: apertura -> cierre con arqueo)
CREATE TABLE IF NOT EXISTS public.sport_cash_registers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    opened_by TEXT NOT NULL DEFAULT 'Encargado',
    initial_cash NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (initial_cash >= 0),
    closed_at TIMESTAMPTZ,
    closed_by TEXT,
    expected_cash NUMERIC(12, 2),
    expected_transfers NUMERIC(12, 2),
    final_cash_counted NUMERIC(12, 2),
    difference NUMERIC(12, 2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sport_cash_registers_biz ON public.sport_cash_registers(business_id, opened_at DESC);
-- Una sola caja abierta por negocio
CREATE UNIQUE INDEX IF NOT EXISTS uq_sport_cash_registers_open
    ON public.sport_cash_registers(business_id) WHERE status = 'open';

-- 3. Movimientos de caja (no se borran: se anulan)
CREATE TABLE IF NOT EXISTS public.sport_cash_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cash_register_id UUID NOT NULL REFERENCES public.sport_cash_registers(id) ON DELETE CASCADE,
    business_id TEXT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('booking_income', 'canteen_sale', 'manual_income', 'manual_expense')),
    payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'transfer')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    description TEXT NOT NULL DEFAULT '',
    items_detail JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{product_id, name, quantity, unit_price}]
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    voided_at TIMESTAMPTZ,
    voided_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sport_cash_movements_reg ON public.sport_cash_movements(cash_register_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sport_cash_movements_biz ON public.sport_cash_movements(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sport_cash_movements_booking ON public.sport_cash_movements(booking_id) WHERE booking_id IS NOT NULL;

-- 4. RLS: solo quien administra el negocio
ALTER TABLE public.sport_canteen_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sport_cash_registers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sport_cash_movements   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sport_canteen_products_manage" ON public.sport_canteen_products
    FOR ALL TO authenticated
    USING (public.can_manage_business(business_id))
    WITH CHECK (public.can_manage_business(business_id));

-- Cajas: se leen y se abren desde la app; el cierre va por close_sport_cash_register()
CREATE POLICY "sport_cash_registers_select" ON public.sport_cash_registers
    FOR SELECT TO authenticated
    USING (public.can_manage_business(business_id));

CREATE POLICY "sport_cash_registers_insert" ON public.sport_cash_registers
    FOR INSERT TO authenticated
    WITH CHECK (public.can_manage_business(business_id) AND status = 'open');

-- Movimientos: solo lectura directa; altas y anulaciones por funciones
CREATE POLICY "sport_cash_movements_select" ON public.sport_cash_movements
    FOR SELECT TO authenticated
    USING (public.can_manage_business(business_id));

REVOKE ALL ON public.sport_canteen_products, public.sport_cash_registers, public.sport_cash_movements FROM anon;

-- 5. Funciones

-- Ajuste de stock atómico (reingreso de mercadería, correcciones)
CREATE OR REPLACE FUNCTION public.adjust_sport_product_stock(p_product_id uuid, p_delta integer)
RETURNS public.sport_canteen_products
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_row public.sport_canteen_products;
BEGIN
    SELECT * INTO v_row FROM public.sport_canteen_products WHERE id = p_product_id FOR UPDATE;
    IF v_row.id IS NULL OR NOT public.can_manage_business(v_row.business_id) THEN
        RAISE EXCEPTION 'Artículo no encontrado';
    END IF;

    UPDATE public.sport_canteen_products
       SET current_stock = GREATEST(0, current_stock + p_delta),
           updated_at = now()
     WHERE id = p_product_id
     RETURNING * INTO v_row;
    RETURN v_row;
END;
$$;

-- Registrar un movimiento en la caja abierta (descuenta stock de los artículos vendidos)
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
        IF v_item ? 'product_id' AND COALESCE(v_item->>'product_id', '') <> '' THEN
            UPDATE public.sport_canteen_products
               SET current_stock = GREATEST(0, current_stock - GREATEST(1, COALESCE((v_item->>'quantity')::int, 1))),
                   updated_at = now()
             WHERE id = (v_item->>'product_id')::uuid
               AND business_id = p_business_id
               AND track_stock;
        END IF;
    END LOOP;

    INSERT INTO public.sport_cash_movements
        (cash_register_id, business_id, type, payment_method, amount, description, items_detail, booking_id)
    VALUES
        (v_register_id, p_business_id, p_type, p_payment_method, p_amount, COALESCE(p_description, ''),
         COALESCE(p_items, '[]'::jsonb), p_booking_id)
    RETURNING * INTO v_mov;

    RETURN v_mov;
END;
$$;

-- Anular un movimiento de la caja abierta (devuelve el stock)
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
               SET current_stock = current_stock + GREATEST(1, COALESCE((v_item->>'quantity')::int, 1)),
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

-- Cerrar la caja: los totales esperados se calculan acá, no en el navegador
CREATE OR REPLACE FUNCTION public.close_sport_cash_register(
    p_register_id uuid,
    p_cash_counted numeric,
    p_closed_by text DEFAULT NULL,
    p_notes text DEFAULT NULL
)
RETURNS public.sport_cash_registers
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
    v_reg public.sport_cash_registers;
    v_cash numeric;
    v_transfers numeric;
BEGIN
    SELECT * INTO v_reg FROM public.sport_cash_registers WHERE id = p_register_id FOR UPDATE;
    IF v_reg.id IS NULL OR NOT public.can_manage_business(v_reg.business_id) THEN
        RAISE EXCEPTION 'Caja no encontrada';
    END IF;
    IF v_reg.status <> 'open' THEN
        RAISE EXCEPTION 'La caja ya está cerrada';
    END IF;

    SELECT
        v_reg.initial_cash + COALESCE(SUM(CASE WHEN payment_method = 'cash'
            THEN CASE WHEN type = 'manual_expense' THEN -amount ELSE amount END END), 0),
        COALESCE(SUM(CASE WHEN payment_method = 'transfer'
            THEN CASE WHEN type = 'manual_expense' THEN -amount ELSE amount END END), 0)
      INTO v_cash, v_transfers
      FROM public.sport_cash_movements
     WHERE cash_register_id = p_register_id AND voided_at IS NULL;

    UPDATE public.sport_cash_registers
       SET status = 'closed',
           closed_at = now(),
           closed_by = COALESCE(NULLIF(btrim(COALESCE(p_closed_by, '')), ''), opened_by),
           expected_cash = v_cash,
           expected_transfers = v_transfers,
           final_cash_counted = p_cash_counted,
           difference = p_cash_counted - v_cash,
           notes = NULLIF(btrim(COALESCE(p_notes, '')), '')
     WHERE id = p_register_id
     RETURNING * INTO v_reg;
    RETURN v_reg;
END;
$$;

REVOKE ALL ON FUNCTION public.adjust_sport_product_stock(uuid, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.register_sport_cash_movement(text, text, text, numeric, text, jsonb, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.void_sport_cash_movement(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.close_sport_cash_register(uuid, numeric, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_sport_product_stock(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_sport_cash_movement(text, text, text, numeric, text, jsonb, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.void_sport_cash_movement(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_sport_cash_register(uuid, numeric, text, text) TO authenticated;

-- 6. Limpieza: datos de caja que la primera versión guardó en businesses.metadata (lectura pública)
UPDATE public.businesses
   SET metadata = metadata - 'sport_canteen_products' - 'active_cash_register' - 'cash_register_history'
 WHERE metadata ?| ARRAY['sport_canteen_products', 'active_cash_register', 'cash_register_history'];
