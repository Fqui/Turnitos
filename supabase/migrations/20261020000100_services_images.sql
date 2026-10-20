-- Hasta 5 fotos por servicio. image_url sigue siendo la foto principal (= images[1]).
alter table public.services
  add column if not exists images text[] not null default '{}';

alter table public.services
  drop constraint if exists services_images_max_5;
alter table public.services
  add constraint services_images_max_5 check (coalesce(array_length(images, 1), 0) <= 5);
