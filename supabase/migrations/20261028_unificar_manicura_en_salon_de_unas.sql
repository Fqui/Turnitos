-- Belleza: "Manicura" se unifica dentro de "Salón de Uñas".
-- Los negocios con Manicura pasan a Salón de Uñas y se borra la subcategoría.
insert into public.business_subcategories (business_id, subcategory_id)
select bs.business_id, su.id
from public.business_subcategories bs
join public.subcategories m on m.id = bs.subcategory_id and m.slug = 'manicura'
join public.subcategories su on su.slug = 'salon-de-unas' and su.category_id = m.category_id
on conflict (business_id, subcategory_id) do nothing;

delete from public.subcategories where slug = 'manicura';

-- Spa compartía el orden 3 con Salón de Uñas.
update public.subcategories set display_order = 4 where slug = 'spa';
