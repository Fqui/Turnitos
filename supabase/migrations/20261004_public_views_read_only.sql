-- Las vistas públicas son de postgres (que saltea RLS) y se pueden actualizar
-- automáticamente: con INSERT/UPDATE/DELETE para anon y authenticated, cualquiera
-- con la anon key podía modificar o borrar negocios y reservas a través de ellas.
-- La app solo las lee, así que se dejan de solo lectura.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
    ON public.businesses_public, public.bookings_public
    FROM PUBLIC, anon, authenticated;
