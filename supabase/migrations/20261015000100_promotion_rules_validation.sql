create or replace function public.validate_booking_promo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_promo public.promotions%rowtype;
    v_ok boolean := true;
    v_today date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
    v_time time;
    v_phone text;
    v_cap numeric;
begin
    if NEW.promo_id is null then
        return NEW;
    end if;
    -- El dueño, su vendedor o el SuperAdmin pueden cargar la promo a mano
    if public.can_manage_business(NEW.business_id) then
        return NEW;
    end if;

    select * into v_promo from public.promotions where id = NEW.promo_id;

    if not found
       or v_promo.business_id is distinct from NEW.business_id
       or v_promo.active is false
       or (v_promo.start_date is not null and NEW.date < v_promo.start_date)
       or (v_promo.end_date is not null and NEW.date > v_promo.end_date)
       or (v_promo.service_id is not null and NEW.service_id is distinct from v_promo.service_id) then
        v_ok := false;
    end if;

    if v_ok and v_promo.valid_days is not null
       and not (extract(dow from NEW.date)::smallint = any (v_promo.valid_days)) then
        v_ok := false;
    end if;

    if v_ok and (v_promo.time_from is not null or v_promo.time_to is not null) then
        begin
            v_time := NEW.time::time;
        exception when others then
            v_time := null;
        end;
        if v_time is null
           or (v_promo.time_from is not null and v_time < v_promo.time_from)
           or (v_promo.time_to is not null and v_time >= v_promo.time_to) then
            v_ok := false;
        end if;
    end if;

    if v_ok and v_promo.min_advance_days is not null
       and NEW.date - v_today < v_promo.min_advance_days then
        v_ok := false;
    end if;

    v_phone := regexp_replace(coalesce(NEW.customer_phone, ''), '\D', '', 'g');

    if v_ok and v_promo.first_visit_only then
        if v_phone = '' or exists (
            select 1 from public.bookings b
            where b.business_id = NEW.business_id
              and regexp_replace(coalesce(b.customer_phone, ''), '\D', '', 'g') = v_phone
              and coalesce(b.status, '') not in ('cancelled', 'canceled', 'rejected', 'blocked')
        ) then
            v_ok := false;
        end if;
    end if;

    if v_ok and v_promo.max_uses_per_customer is not null then
        if v_phone = '' or (
            select count(*) from public.bookings b
            where b.promo_id = v_promo.id
              and regexp_replace(coalesce(b.customer_phone, ''), '\D', '', 'g') = v_phone
              and coalesce(b.status, '') not in ('cancelled', 'canceled', 'rejected', 'blocked')
        ) >= v_promo.max_uses_per_customer then
            v_ok := false;
        end if;
    end if;

    if not v_ok then
        -- No cumple: precio normal, sin promo
        NEW.price := coalesce(NEW.price, 0) + coalesce(NEW.discount_applied, 0);
        NEW.discount_applied := 0;
        NEW.promo_id := null;
        return NEW;
    end if;

    -- Cumple: el descuento no puede pasar lo que da la promo
    if coalesce(NEW.base_price, 0) > 0 and coalesce(NEW.discount_applied, 0) > 0 then
        v_cap := case when v_promo.discount_type = 'fixed'
                      then least(coalesce(v_promo.discount_value, 0), NEW.base_price)
                      else round(NEW.base_price * coalesce(v_promo.discount_value, 0) / 100) end;
        if NEW.discount_applied > v_cap then
            NEW.price := coalesce(NEW.price, 0) + (NEW.discount_applied - v_cap);
            NEW.discount_applied := v_cap;
        end if;
    end if;

    return NEW;
end;
$$;

drop trigger if exists trigger_15_validate_booking_promo on public.bookings;
create trigger trigger_15_validate_booking_promo
    before insert on public.bookings
    for each row execute function public.validate_booking_promo();
