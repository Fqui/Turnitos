# Carga masiva de negocios

Crea negocios completos (cuenta del dueño, plan, suscripción, perfil, profesionales, servicios, canchas y precios) desde un JSON o CSV. Usa `public.admin_seed_business()` (`supabase/migrations/20261004_seed_business.sql`), que llama a la misma alta que los formularios.

```bash
node scripts/negocios/cargar-negocios.mjs scripts/negocios/ejemplo-simulacion.json --probar   # solo valida
node scripts/negocios/cargar-negocios.mjs scripts/negocios/ejemplo-simulacion.json            # carga
node scripts/negocios/cargar-negocios.mjs --borrar-simulacion                                  # borra los de prueba
```

- Con `SUPABASE_SERVICE_ROLE_KEY` en `.env.local` carga directo y guarda los accesos en `scripts/negocios/salida/accesos-*.csv`.
- Sin la clave (o con `--sql`) genera `scripts/negocios/salida/<archivo>.sql` para correr en el editor SQL de Supabase. Es todo o nada y devuelve link, email y contraseña de cada negocio.
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
| `horarios` | no | Mismo formato que `businesses.hours`. Si falta se usa uno típico del rubro |
| `profesionales` | belleza/salud | `[{ "nombre", "rol" }]`. Define la cantidad (y el plan) |
| `servicios` | belleza/salud | `[{ "nombre", "duracion", "precio", "categoria" }]` |
| `canchas` | canchas | `[{ "nombre", "precio", "deporte" }]`. Define la cantidad (y el plan) |
| `precio_hora` / `precio_dia`, `capacidad` | alquileres | |
| `slug`, `email` | no | Para forzar link o email de acceso |
| `vendedor_id`, `estado` | no | `estado`: `trial` (default), `active` o `inactive` |
| `simulacion` | no | `true` marca el negocio para poder borrarlo con `--borrar-simulacion` |

En CSV las listas van separadas por `|` y los campos internos por `:` (ver `plantilla.csv`):
`Corte:30:9000:Cortes|Barba:20:6000:Barba`, `Cancha 1:14000:padel`, `Juan:Barbero`.

Cada dueño entra a `/portal` con el email y la contraseña provisoria, y se le pide cambiarla.
