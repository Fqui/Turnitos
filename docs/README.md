# Documentación de TurnitosLR

Documentación técnica y funcional de **TurnitosLR** (www.turnitoslr.com), la plataforma de turnos y reservas online para negocios de La Rioja.

> Relevamiento hecho sobre el commit `f8aba8a` (rama `main`, 28/09/2026). Si el código cambia, actualizá el documento que corresponda.

## Índice

| # | Documento | Para qué sirve |
|---|---|---|
| 1 | [Visión general](01-vision-general.md) | Qué es la plataforma, quién la usa, qué hace cada parte |
| 2 | [Arquitectura](02-arquitectura.md) | Stack, rutas, subdominios, capas del código, estado, PWA, deploy |
| 3 | [Base de datos](03-base-de-datos.md) | Tablas, columnas clave, JSON `metadata`, funciones, triggers, storage |
| 4 | [Flujos principales](04-flujos.md) | Cómo funciona cada flujo: reservas, login, alta de negocios, reseñas, tienda, notificaciones |
| 5 | [Planes y comisiones](05-planes-y-comisiones.md) | Cómo cobra la plataforma según el código, y dónde difiere del modelo comercial |
| 6 | [Seguridad y riesgos](06-seguridad-y-riesgos.md) | **Leer primero.** Problemas encontrados, por prioridad, con la solución propuesta |
| 7 | [Deuda técnica](07-deuda-tecnica.md) | Código muerto, bugs detectados por lint, desorden de archivos |
| 8 | [Desarrollo y deploy](08-desarrollo-y-deploy.md) | Cómo levantar el proyecto, variables de entorno, flujo de ramas, scripts |

Además, en la raíz del repo hay un [`CLAUDE.md`](../CLAUDE.md) con el resumen que necesita un asistente de IA (o un desarrollador nuevo) para trabajar en el código sin romper nada.

## Documentos anteriores

Los documentos que existían antes de este relevamiento se movieron a [`docs/legacy/`](legacy/). Se conservan como historia, pero **varios están desactualizados** (por ejemplo, `TECHNICAL_MANUAL.md` dice que la app usa `HashRouter` y GitHub Pages; hoy usa `BrowserRouter` y Vercel). Ante cualquier contradicción, vale lo que dice esta carpeta.

Siguen vigentes en la raíz:

- [`WORKFLOW.md`](../WORKFLOW.md): flujo de ramas y previews con Vercel.
- [`DESIGN_GUIDELINES.md`](../DESIGN_GUIDELINES.md): medidas de banners, logos e imágenes.
