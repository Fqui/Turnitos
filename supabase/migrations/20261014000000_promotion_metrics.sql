-- Métricas de publicidades del Home: vistas, clics y reservas por promo
create table if not exists public.promotion_events (
    id bigserial primary key,
    promotion_id uuid not null references public.promotions(id) on delete cascade,
    event_type text not null check (event_type in ('view', 'click')),
    created_at timestamptz not null default now()
);
create index if not exists promotion_events_promo_idx on public.promotion_events (promotion_id, event_type);

alter table public.promotion_events enable row level security;
-- Sin políticas: solo se escribe y se lee por las funciones de abajo.

create or replace function public.track_promotion_event(p_promotion_id uuid, p_event_type text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if p_event_type not in ('view', 'click') then
        return;
    end if;
    if not exists (select 1 from promotions where id = p_promotion_id) then
        return;
    end if;
    insert into promotion_events (promotion_id, event_type) values (p_promotion_id, p_event_type);
end;
$$;

-- Superadmin ve todas; un negocio ve solo las suyas.
create or replace function public.get_promotion_stats()
returns table (
    promotion_id uuid,
    views bigint,
    clicks bigint,
    bookings bigint,
    revenue numeric
)
language sql
stable
security definer
set search_path = public
as $$
    select p.id,
        (select count(*) from promotion_events e where e.promotion_id = p.id and e.event_type = 'view'),
        (select count(*) from promotion_events e where e.promotion_id = p.id and e.event_type = 'click'),
        (select count(*) from bookings b where b.promo_id = p.id and coalesce(b.status, '') not in ('cancelled', 'canceled', 'rejected', 'blocked')),
        (select coalesce(sum(b.price), 0) from bookings b where b.promo_id = p.id and coalesce(b.status, '') not in ('cancelled', 'canceled', 'rejected', 'blocked'))
    from promotions p
    where is_super_admin() or (p.business_id is not null and can_manage_business(p.business_id));
$$;

revoke all on function public.track_promotion_event(uuid, text) from public;
grant execute on function public.track_promotion_event(uuid, text) to anon, authenticated;
revoke all on function public.get_promotion_stats() from public, anon;
grant execute on function public.get_promotion_stats() to authenticated;
