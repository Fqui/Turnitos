# CLAUDE.md — TurnitosLR

Guía de cómo trabajar en este repo. Proyecto de un solo autor (fernando).

## Qué es
Plataforma de reservas de turnos para complejos deportivos y negocios (turnitoslr.com).
Stack: React 19 + Vite, Zustand, React Router, Supabase (base de datos, auth, edge functions), Firebase, deploy en Vercel.

- `src/pages`, `src/components`, `src/stores`, `src/services`: la app
- `supabase/migrations`, `supabase/functions`: base de datos y funciones del servidor
- `docs/TECHNICAL_MANUAL.md`: arquitectura y base de datos
- `WORKFLOW.md`: flujo de ramas y Vercel
- `DESIGN_GUIDELINES.md`: medidas de imágenes y banners

## Forma de trabajo
1. **Primero el plan.** Antes de tocar código, mostrar un plan corto (qué se cambia, en qué archivos, qué riesgos hay) y esperar el OK de fernando.
2. **Nunca commit a `main`.** Siempre una rama nueva por tarea; Vercel genera una preview por rama.
3. **Commits convencionales en español**, con scope: `feat(cobros): ...`, `fix(seguridad): ...`.
4. **Pull Request hacia `main`** cuando el cambio esté listo; el merge lo hace fernando después de probar la preview.
5. Antes de subir: `npm run lint` y `npm run build` sin errores.

## Cómo mostrar resultados
- Un resumen corto de qué cambió y qué conviene probar. Sin capturas ni explicaciones largas.

## Base de datos (Supabase)
- Claude puede aplicar cambios directamente en la base de datos de producción.
- Todo cambio de esquema se guarda también como archivo SQL en `supabase/migrations/` para que quede registro.
- Revisar las tablas existentes y las políticas RLS antes de cambiar el esquema; nunca debilitar la seguridad (datos de clientes y de cobro son privados).
- Avisar en el resumen qué se aplicó en producción.

## Prioridades
- Celular y escritorio son igual de importantes: todo cambio visual tiene que verse bien en los dos.
- Respetar el tema claro/oscuro y la tipografía Plus Jakarta Sans.

## Idioma
- Commits, PRs y comunicación: español.
- Código, nombres de variables y funciones: inglés (como está hoy).
