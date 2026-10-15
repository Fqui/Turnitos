alter table public.promotions
    add column if not exists promo_kind text not null default 'general'
        check (promo_kind in ('general', 'schedule', 'weekday', 'service', 'first_visit', 'advance', 'visibility')),
    add column if not exists valid_days smallint[],
    add column if not exists time_from time,
    add column if not exists time_to time,
    add column if not exists min_advance_days integer,
    add column if not exists first_visit_only boolean not null default false,
    add column if not exists max_uses_per_customer integer;
