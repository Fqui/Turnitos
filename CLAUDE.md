# CLAUDE.md — Contexto para trabajar en TurnitosLR

Este archivo resume lo que un asistente de IA (o un desarrollador nuevo) necesita saber antes de tocar el código. La documentación completa está en [`docs/`](docs/README.md).

## Qué es

Plataforma de turnos y reservas online para negocios de **La Rioja, Argentina** (www.turnitoslr.com): marketplace público + panel de gestión para cada negocio + panel de vendedores y super admin. Tres tipos de negocio: **deportes** (canchas), **servicios** (profesionales) y **alquileres** (quinchos/salones). Todo el producto está en español rioplatense; textos de UI, commits y docs en español.

## Stack

React 19 + Vite 7 + React Router 7 (`BrowserRouter`) + Zustand + Framer Motion + Leaflet + Recharts. Datos en **Supabase** (Postgres, Auth, Storage `business-images`, Realtime) usados **directo desde el navegador** con la clave `anon`. Hosting en **Vercel** (`vercel.json` + `api/og.js` para vistas previas). Push con Firebase Cloud Messaging. Sin backend propio.

## Mapa rápido

- Rutas: `src/App.jsx` (incluye subdominios `negocio.turnitoslr.com`).
- Perfil público: `src/pages/BusinessProfileRouter.jsx` decide entre `BusinessProfile` (canchas/servicios) y `VenueProfile` (alquileres).
- Panel del negocio: `src/pages/BusinessPortal.jsx` + `src/components/business/**` + `src/components/BusinessSettings.jsx`.
- Super admin / vendedores / login unificado: `src/components/seller/**`.
- Acceso a datos: `src/services/supabase/*.js` (vía `supabaseService.js` y `serviceAdapter.js`).
- Reglas de planes y comisiones: `src/utils/subscriptionUtils.js`.
- Estado del panel: `src/stores/` (Zustand).

## Reglas al trabajar

1. **Nunca commitear a `main`**: rama nueva → preview de Vercel → PR (ver `WORKFLOW.md`).
2. **Nunca escribir claves ni contraseñas en el código.** El repo es público y ya tuvo la clave `service_role` filtrada.
3. Los cambios de base van como archivo en `supabase/migrations/AAAAMMDD_descripcion.sql`, idempotentes, y se ejecutan a mano en Supabase. El esquema de las tablas centrales **no** está completo en el repo: no asumir columnas; revisar el código que las usa o pedir el esquema real.
4. Muchos datos del negocio viven en `businesses.metadata` (JSON) y los días especiales en `businesses.hours.special_days`. Guardar con `patchBusiness`, que separa columnas reales (`VALID_COLUMNS`) de `metadata`.
5. Canchas/servicios/profesionales existen en tablas legacy (`courts`, `services`, `specialists`) **y** en `resources`. Si se toca uno, revisar el otro.
6. Probar siempre los tres tipos de negocio cuando se toquen reservas, disponibilidad o perfiles.
7. Fechas de reservas: `bookings.date` texto `YYYY-MM-DD` + `time` `HH:MM`, y además `start_time`/`end_time`.
8. El linter tiene ~400 errores heredados: no agregar nuevos y corregir los del archivo que se toque.

## Problemas conocidos importantes

Antes de tocar login, permisos o reservas, leer [`docs/06-seguridad-y-riesgos.md`](docs/06-seguridad-y-riesgos.md). Resumen: el login de negocio y el de super admin no validan bien la contraseña, la página pública escribe `localStorage.business` (que el panel usa como sesión), las rutas protegidas solo miran `localStorage`, y RLS probablemente no está configurado. Las comisiones y límites de plan se calculan en el navegador.

Los precios del código no coinciden del todo con el modelo comercial vigente: ver [`docs/05-planes-y-comisiones.md`](docs/05-planes-y-comisiones.md).
