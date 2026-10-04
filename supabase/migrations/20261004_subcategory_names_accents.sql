-- Corrige tildes y espacios en los nombres visibles de las subcategorías.
-- Los slugs no cambian, así que los filtros y links existentes siguen funcionando.
update public.subcategories set name = 'Estética'          where slug = 'estetica';
update public.subcategories set name = 'Barbería'          where slug = 'barberia';
update public.subcategories set name = 'Peluquería'        where slug = 'peluqueria';
update public.subcategories set name = 'Salón de Uñas'     where slug = 'salon-de-unas';
update public.subcategories set name = 'Pádel'             where slug = 'padel';
update public.subcategories set name = 'Fútbol'            where slug = 'futbol';
update public.subcategories set name = 'Peluquería Canina' where slug = 'peluqueria-canina';
