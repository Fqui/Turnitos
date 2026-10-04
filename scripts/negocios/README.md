# Carga masiva de negocios

Crea negocios completos desde un JSON o CSV: cuenta del dueño, plan, suscripción y todo el perfil (fotos, tema, profesionales, servicios, canchas, tienda, comodidades, galería y precios). Usa `public.admin_seed_business()`, que llama a la misma alta que los formularios, y `public.admin_apply_business_profile()` para el perfil (`supabase/migrations/20261004_seed_business*.sql`).

```bash
node scripts/negocios/cargar-negocios.mjs scripts/negocios/ejemplo-simulacion.json --probar   # solo valida
node scripts/negocios/cargar-negocios.mjs scripts/negocios/ejemplo-simulacion.json            # carga
node scripts/negocios/cargar-negocios.mjs archivo.json --actualizar                           # completa negocios que ya existen
node scripts/negocios/cargar-negocios.mjs --borrar-simulacion                                  # borra los de prueba
```

- Con `SUPABASE_SERVICE_ROLE_KEY` en `.env.local` carga directo y guarda los accesos en `scripts/negocios/salida/accesos-*.csv`.
- Sin la clave (o con `--sql`) genera `scripts/negocios/salida/<archivo>.sql` para correr en el editor SQL de Supabase. Es todo o nada y devuelve link, email y contraseña de cada negocio.
- `--actualizar` busca cada negocio por su link y le aplica el archivo. Solo cambia los campos que vienen; si vienen `servicios`, los reemplaza.
- `salida/` no se sube a git: tiene contraseñas.

## Campos

| Campo | Obligatorio | Notas |
|---|---|---|
| `nombre` | sí | Define el link: `nombre-sin-tildes.turnitoslr.com`. Si ya existe se agrega `-2`, `-3`… |
| `rubro` | sí | `canchas`, `belleza`, `salud`, `alquileres` o `mascotas` |
| `subcategorias` | no | Nombres como en la app (`Pádel`, `Barbería`, `Quinchos`…) |
| `whatsapp`, `direccion`, `descripcion`, `instagram`, `facebook`, `tiktok` | no | |
| `latitud`, `longitud` | no | Para el mapa |
| `logo`, `portada` | no | URL de imagen. Sin logo el perfil queda incompleto |
| `tema`, `color` | no | `light` o `dark`, y el color de los botones (`#D4A373`) |
| `horarios` | no | Mismo formato que `businesses.hours`. Si falta se usa uno típico del rubro |
| `profesionales` | belleza/salud | `[{ "nombre", "rol", "foto" }]`. Define la cantidad (y el plan) |
| `servicios` | belleza/salud | `[{ "nombre", "duracion", "precio", "categoria", "descripcion", "foto" }]` |
| `canchas` | canchas | `[{ "nombre", "precio", "deporte" }]`. Define la cantidad (y el plan) |
| `precio_hora`, `capacidad` | alquileres | La página pública cobra por hora |
| `duraciones`, `tarifas` | alquileres | Horas a elegir (`[4, 6, 8]`) y precio por hora según invitados: `[{ "desde", "hasta", "precio" }]` |
| `descripcion_larga`, `galeria` | alquileres | `galeria`: `[{ "url", "titulo", "categoria", "destacada" }]` |
| `comodidades` | no | `[{ "nombre", "icono" }]`, con un icono de `src/components/common/AmenityIcon.jsx` (`Wifi`, `Car`, `Flame`…) |
| `destacados` | no | Círculos del perfil: `[{ "titulo", "fotos": [urls] }]` |
| `extras` | no | Se suman a la reserva: `[{ "nombre", "precio", "descripcion", "foto" }]`. En alquileres: `icono` (emoji) y `por_cantidad` |
| `tienda` | no | `{ "banner", "titulo", "subtitulo", "productos": [{ "nombre", "precio", "categoria", "descripcion", "foto" }] }` |
| `slug`, `email` | no | Para forzar link o email de acceso |
| `vendedor_id`, `estado` | no | `estado`: `trial` (default), `active` o `inactive` |
| `simulacion` | no | `true` marca el negocio para poder borrarlo con `--borrar-simulacion` |

En CSV van los campos simples; las listas se separan con `|` y los campos internos con `:` (ver `plantilla.csv`):
`Corte:30:9000:Cortes|Barba:20:6000:Barba`, `Cancha 1:14000:padel`, `Juan:Barbero`. Tienda, galería, comodidades y destacados solo se cargan desde JSON.

Las fotos de `ejemplo-simulacion.json` son de Unsplash. Para negocios reales conviene subirlas al bucket `business-images` de Supabase y usar esas URLs.

Cada dueño entra a `/portal` con el email y la contraseña provisoria, y se le pide cambiarla.
