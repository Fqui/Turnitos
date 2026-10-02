# 8. Desarrollo y deploy

## Requisitos

- Node.js 20 o superior (probado con Node 22) y npm.
- Acceso al proyecto de Supabase (URL y clave `anon`).
- Para deploy: acceso al proyecto en Vercel conectado al repo `Fqui/Turnitos`.

## Levantar el proyecto en local

```bash
git clone https://github.com/Fqui/Turnitos.git
cd Turnitos
npm install
# crear .env (ver abajo)
npm run dev          # http://localhost:5174 (también expuesto en la red local)
```

Para probar un subdominio de negocio en local: `http://mi-negocio.localhost:5174`.

## Variables de entorno

Archivo `.env` en la raíz (está en `.gitignore`, **nunca** se sube):

| Variable | Obligatoria | Uso |
|---|---|---|
| `VITE_SUPABASE_URL` | Sí | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Sí | Clave pública `anon` (va al navegador; la seguridad depende de RLS) |
| `VITE_SUPERADMIN_EMAIL` | No | Email que usa la pantalla de PIN de super admin (ver Seguridad) |
| `VITE_DEMO_MODE` | No | `true` fuerza datos de ejemplo; `false` fuerza Supabase |
| `VITE_BASE_PATH` | No | Ruta base; solo se usaba para GitHub Pages |

En **Vercel** tienen que estar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (las usan el build, el sitemap y la función `api/og.js`).

Para los scripts de mantenimiento que necesitan permisos totales, usar `SUPABASE_SERVICE_ROLE_KEY` **solo como variable de entorno local**, nunca escrita en un archivo del repo.

## Scripts de npm

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (Vite, puerto 5174) |
| `npm run build` | Genera `public/sitemap.xml` desde Supabase y compila a `dist/` |
| `npm run preview` | Sirve el build localmente |
| `npm run lint` | ESLint (hoy con ~400 errores, ver [Deuda técnica](07-deuda-tecnica.md)) |
| `npm run sitemap` | Solo regenera el sitemap |
| `npm run deploy` | Legacy (GitHub Pages). **No usar** |

## Flujo de trabajo y deploy

Está descrito en [`WORKFLOW.md`](../WORKFLOW.md). En resumen:

1. Nunca commitear directo a `main`.
2. Crear una rama, hacer los cambios y `git push`.
3. Vercel genera un **preview** con URL propia para probar (celular incluido).
4. Abrir un Pull Request a `main` y hacer merge → Vercel publica en `turnitoslr.com`.

Si después de un deploy se ve una versión vieja, ver [`docs/legacy/VERCEL_REDEPLOY.md`](legacy/VERCEL_REDEPLOY.md) (redeploy manual y limpieza del service worker).

## Cambios en la base de datos

Hoy los cambios se aplican pegando SQL en el **SQL Editor** de Supabase. Para que quede registro:

1. Crear un archivo en `supabase/migrations/` con fecha y descripción: `AAAAMMDD_descripcion.sql`.
2. Escribirlo de forma que se pueda correr dos veces sin romper (`IF NOT EXISTS`, `CREATE OR REPLACE`).
3. Ejecutarlo en Supabase y commitear el archivo en la misma rama que el código que lo necesita.
4. No guardar scripts de debug o pruebas en esa carpeta.

### Exportar el esquema real

Para tener por fin el esquema completo versionado (recomendado, ver [Base de datos](03-base-de-datos.md)), con la [CLI de Supabase](https://supabase.com/docs/guides/cli):

```bash
npx supabase login
npx supabase link --project-ref <ref-del-proyecto>
npx supabase db dump --schema public -f supabase/schema_actual.sql
```

## Backups

`backups/README.md` explica el formato y cómo restaurar. Los `.json` no se suben al repo. Antes de cualquier migración grande (por ejemplo, activar RLS o unificar recursos), hacer un backup desde Supabase (Database → Backups) o con `supabase db dump --data-only`.

## Checklist antes de hacer merge a `main`

- [ ] Probado en el preview de Vercel, en celular y escritorio.
- [ ] Probados los tres tipos de negocio si se tocó reservas o perfiles (cancha, servicio, alquiler).
- [ ] Si hubo SQL: archivo en `supabase/migrations/` y ejecutado en Supabase.
- [ ] Sin claves ni contraseñas en el código.
- [ ] `npm run build` sin errores.
- [ ] Si cambió algo documentado en `docs/`, actualizado.
