# MCP de TurnitosLR

Servidor MCP (Streamable HTTP, sin sesión, respuestas JSON) para armar demos de negocios desde Claude.

- URL: `https://pjtakqbegttsazhkcsmv.supabase.co/functions/v1/mcp`
- Autenticación: secret `MCP_SECRET` de la función (Supabase → Edge Functions → Secrets). Va en el header `x-mcp-secret` o al final de la URL: `.../functions/v1/mcp/<secreto>` (para los conectores de claude.ai, que no permiten headers). La URL con el secreto es una credencial: no compartirla.
- Se despliega con `verify_jwt = false` (la función hace su propia autenticación).
- Todo lo que modifica o borra solo actúa sobre negocios con `metadata.simulacion = true`.

## Herramientas

| Herramienta | Qué hace |
|---|---|
| `crear_negocio_demo({ negocio })` | Mismo formato que `scripts/negocios/*.json` (ver `scripts/negocios/README.md`). Siempre simulación, estado `trial` y seña 30 %. Si el slug ya existe devuelve error y no crea otro. Devuelve slug, link y accesos. |
| `subir_media({ slug, archivos })` | Cada archivo: `url` (https) o `base64`, `destino` (`portada`, `logo`, `galeria`, `destacada`, `servicio`), `ref` (título de la galería o del círculo, o nombre del servicio), `categoria` (galería) y `nombre` opcional. Sube a `business-images/simulacion/<slug>/` con nombre estable (un reintento pisa el archivo y no duplica en la base). |
| `actualizar_negocio({ slug, cambios })` | `portada`, `portada_foco`, `color`, `tema` (o `colores: { color, tema }`), `bio`, `links`, `horarios`, `horarios_ingreso` (alquileres). |
| `borrar_demo({ slug })` | Borra negocio, cuenta y archivos. Se niega si no es de simulación (`admin_delete_simulated_business`). |
| `buscar_negocio({ texto })` | Por slug, link o parte del nombre. |

`normalize.ts` es la misma validación que `scripts/negocios/cargar-negocios.mjs`: si cambia una, cambiar la otra.
