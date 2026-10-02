# 7. Deuda técnica

Lo que no es un problema de seguridad pero hace el proyecto más difícil de mantener o puede generar bugs. Ordenado de más a menos impacto.

## 1. Bugs probables detectados por el linter

`npm run lint` reporta **418 problemas** (386 errores). La mayoría son variables sin usar, pero hay algunos que **probablemente rompen funcionalidades**:

| Archivo | Línea | Problema | Efecto probable |
|---|---|---|---|
| `src/pages/BusinessPortal.jsx` | ~806 | Usa `business`, que no existe en ese alcance (`no-undef`) | **Cancelar una reserva desde el panel puede fallar** con error |
| `src/pages/Home.jsx` | ~247 | Usa `list`, que no existe (`no-undef`) | El ordenamiento con "cerca mío" activo puede romperse |
| `src/components/calendars/SlotCalendar/WeekView.jsx` | ~246 | Usa `currentDate`, que no existe | "Bloquear todas las canchas a esta hora" en la vista semanal puede fallar |
| `src/components/business/BookingDetailsModal.jsx` | 65–246 | Hooks de React llamados después de un `return` condicional (`rules-of-hooks`, 18 casos) | Errores intermitentes o pantallas en blanco al abrir/cerrar el detalle |
| `src/components/BookingSummary.jsx` | 100–136 | Ídem (3 casos) | Ídem en el resumen de reserva |
| `src/pages/VenueProfile.jsx` | 23 | Usa `L` (Leaflet) sin importarlo | Funciona solo porque Leaflet deja `window.L` global; frágil |

Conviene corregir estos primero y después ir limpiando el resto.

## 2. Dos modelos de recursos conviviendo

Canchas, servicios y profesionales existen en tablas viejas (`courts`, `services`, `specialists`) **y** en `resources`. El código escribe en ambos lados, mantiene IDs cruzados en `metadata` y tiene lógica de traducción al reservar. Es la principal fuente de bugs de disponibilidad (varios commits recientes son "fix" de especialistas y horarios). Plan sugerido: elegir un modelo, migrar los datos una vez y borrar el otro.

## 3. Esquema de base de datos no reproducible

Ver [Base de datos](03-base-de-datos.md#advertencia-previa-el-esquema-no-está-completo-en-el-repo). Además:
- `supabase/migrations/` mezcla migraciones reales con 25 scripts de `debug_`, `check_`, `seed_`, `cleanup_`, `fix_`, `verify_`, `update_`.
- Hay migraciones en tres lugares: `supabase/migrations/`, `migrations/` y archivos `.sql` sueltos en la raíz.
- Algunas migraciones se contradicen (`subscription_plans` se crea dos veces con estructuras distintas).

**Propuesta:** exportar el esquema real como migración base (`supabase db dump`), mover scripts de debug/seed a otra carpeta y, desde ahí, versionar cada cambio.

## 4. Archivos sobrantes en la raíz y en `src`

| Archivo/carpeta | Estado |
|---|---|
| `*.sql` sueltos en la raíz (`RUN_IN_SUPABASE.sql`, `clear_data.sql`, `create_super_admin.sql`…) | Scripts manuales ya ejecutados; mover a `supabase/scripts/` o borrar |
| `seed.js`, `seed_promotions.js`, `migrate_auth.js`, `migration_promotions_link.js`, `test-supabase.js` | Scripts de un solo uso; los tres primeros (y `scripts/seed80FullBusinesses.js`) tienen **la clave `service_role` escrita** |
| `google_apps_script.js`, `src/config/googleSheets.js`, `src/services/googleSheetsService.js` | Integración con Google Sheets que ya no se usa |
| `deploy.ps1`, script `npm run deploy`, dependencia `gh-pages`, `VITE_BASE_PATH` | Restos de cuando se publicaba en GitHub Pages |
| `scripts/legacy/`, `public/venue-mockup*.html` (duplicados) | Mockups y scripts viejos; los de `public/` se publican en el sitio |
| `src/pages/BusinessPortal_old.jsx`, `src/pages/Admin.jsx` (importado pero sin ruta) | Pantallas viejas |
| Componentes sin uso: `Hero`, `PadelMobileTimeline`, `SpecialistsShowcase`, `DashboardCalendar`, `DashboardStats`, `BusinessForm`, `PwaInstallBanner`, `profile/ProfileStoreSection`, `services/supabaseServiceExtensions.js`, `stores/index.js`, `public/registerSW.js` | Nadie los importa |
| Modo demo (`mockService.js`, `src/data/`) | Solo se activa en `github.io`; evaluar si sigue teniendo sentido |

## 5. Archivos gigantes y estilos inline

Varios componentes superan las 1.000 líneas (`BookingDetailsModal` 2.823, `BusinessStore` 2.441, `NewBookingModal` 1.501, `BusinessProfile` 1.451, `StoreTab` 1.416…) y casi todo el estilo está escrito *inline* (`style={{…}}`; ~300 bloques solo en `BookingDetailsModal`). Hace difícil reutilizar y mantener un diseño coherente. No es urgente; se puede ir partiendo cuando se toque cada pantalla.

## 6. Rendimiento

- El chunk del panel (`BusinessPortal`) pesa ~570 KB sin comprimir; `charts` ~330 KB.
- `public/` pesa ~23 MB, sobre todo imágenes PNG/JPG de 0,5–1 MB de negocios demo. Convertir a WebP y redimensionar (como pide `DESIGN_GUIDELINES.md`) o moverlas a Storage.
- `getBusinesses()` trae **todos** los negocios con servicios, canchas y profesionales en una sola consulta; con muchos negocios va a ponerse lenta. Conviene paginar y traer solo lo que muestra la home.

## 7. Datos inconsistentes que el código "parcha"

- `businesses.metadata` a veces guardado como string partido en caracteres (`cleanBusinessMeta`).
- Fechas en dos formatos (`YYYY-MM-DD` y `DD/MM/YYYY`).
- IDs de negocio de texto y UUID mezclados (hay migraciones `fix_bookings_*_uuid`).
- Productos de tienda en `metadata.store_products` y en la tabla `store_products`.
- `logo`/`logo_url`, `banner_image`/`banner_url`, `rating`/`rating_avg` duplicados.

Normalizar en la base evita el código defensivo repetido en cada pantalla.

## 8. Documentación desactualizada

`README.md` y `docs/legacy/TECHNICAL_MANUAL.md` describen GitHub Pages, `HashRouter` y un RLS que no existe. Este relevamiento los reemplaza; el README raíz se actualizó para apuntar acá.

## 9. Sin tests

No hay tests automáticos. Lo mínimo recomendable: tests de las funciones puras de `src/utils/` (planes, comisiones, fechas, slugs) y del cálculo de disponibilidad, que es donde más bugs aparecen.
