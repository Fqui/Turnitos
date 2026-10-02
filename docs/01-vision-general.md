# 1. Visión general

## Qué es TurnitosLR

TurnitosLR es una plataforma web (con instalación como app, PWA) para **reservar turnos y espacios online en La Rioja**. Funciona a la vez como:

1. **Marketplace**: en la home (`turnitoslr.com`) el público busca negocios por categoría, subcategoría, nombre o cercanía, y reserva.
2. **Software de gestión (SaaS) para cada negocio**: cada negocio tiene su panel (`/portal`) con agenda, reservas, clientes, estadísticas y configuración.
3. **Presencia online del negocio**: cada negocio tiene su página propia (`turnitoslr.com/mi-negocio` o `mi-negocio.turnitoslr.com`), un "link in bio" para Instagram y una tienda online simple.

## Tipos de negocio

El código distingue tres grandes familias (columna `businesses.type` + nombre de la categoría):

| Familia | Ejemplos | Qué se reserva | Pantalla pública |
|---|---|---|---|
| **Deportes** (`sport`) | Pádel, fútbol, tenis | Una cancha en un horario | `BusinessProfile` (grilla de canchas × horas) |
| **Servicios** (`service`) | Peluquería, barbería, estética, spa, salud, mascotas | Un servicio con un profesional en un horario | `BusinessProfile` (servicio → profesional → horario) |
| **Alquileres** (`alquiler` / `venue`) | Quinchos, salones, fincas, cabañas | Un espacio por un período (horas o días), con cantidad de invitados y extras | `VenueProfile` (asistente de reserva por fechas) |

La decisión de qué pantalla mostrar está en `src/pages/BusinessProfileRouter.jsx` y se basa en `type`, en palabras clave del nombre de la categoría ("quincho", "salon", "padel"…) y en si el negocio tiene canchas o servicios cargados. Ver [Arquitectura](02-arquitectura.md#cómo-se-decide-el-tipo-de-perfil).

## Quién usa la plataforma (roles)

| Rol | Dónde entra | Qué puede hacer |
|---|---|---|
| **Público / cliente final** | Home, páginas de negocio, link in bio, tienda | Buscar, reservar (sin cuenta, con nombre y teléfono), comprar por WhatsApp, dejar reseñas por link |
| **Dueño de negocio** | `/login` → `/portal` | Ver y gestionar reservas, bloquear horarios, clientes (CRM), estadísticas, suscripción y toda la configuración del perfil |
| **Vendedor / colaborador** | `/login` → `/admin/dashboard` | Dar de alta negocios, ver sus negocios y sus comisiones |
| **Super Admin** (dueño de la plataforma) | `/login` → `/admin/super` | Todo: negocios, vendedores, reservas globales, reseñas, categorías y publicidades de la home |

> Hay un único formulario de login (`/login`) que prueba en orden: super admin → vendedor → dueño de negocio. Ver [Flujos](04-flujos.md#login) y los problemas de seguridad asociados en [Seguridad](06-seguridad-y-riesgos.md).

## Mapa de funcionalidades

### Público
- **Home / marketplace**: carrusel de publicidades ("promociones"), buscador con autocompletado, categorías y subcategorías, "cerca mío" (geolocalización), listado con scroll infinito ordenado por rating con rotación diaria.
- **Perfil del negocio**: banner, datos, horarios, mapa, galería, historias de 24 h e historias destacadas (estilo Instagram), reseñas, comodidades, tarjeta de tienda.
- **Reserva**: según el tipo de negocio (ver [Flujos](04-flujos.md#reservas)). Admite cupones de descuento y muestra políticas de cancelación y medios de pago.
- **Link in bio** (`/:slug/bio` o el subdominio): página de enlaces con redes, WhatsApp, ubicación, historias y botones configurables.
- **Tienda** (`/:slug/tienda`): catálogo de productos con carrito; la compra se cierra enviando el pedido por **WhatsApp** (no hay cobro online).
- **Reseñas** (`/calificar/:token`): formulario para calificar al negocio desde un link único.
- **Páginas institucionales**: `/negocios` (venta a negocios), `/colaboradores` (reclutamiento de vendedores), `/ayuda`, `/terminos`, `/privacidad`.

### Panel del negocio (`/portal`)
Secciones del menú lateral (`BusinessPortalSidebar.jsx`):

- **Calendario**: vista de día / semana / mes por cancha o profesional, alta manual de reservas, bloqueos de horario.
- **Reservas**: listado con filtros y estados.
- **Analytics**: ingresos, ocupación, horas pico, comparación de períodos.
- **Suscripción**: plan actual y límites.
- **Clientes**: CRM generado automáticamente a partir de las reservas (teléfono como identificador), con historial y acceso a WhatsApp.
- **Ajustes** (`BusinessSettings.jsx`), con pestañas: General y ubicación · Apariencia y colores · Profesionales / Canchas · Servicios · Alquiler · Horarios · Políticas y pagos · Días especiales · Historias y galería · Tienda · Link in bio · Cupones y promos · Comodidades.

Además: alerta en vivo de reservas nuevas (Supabase Realtime) y recordatorios de próximos turnos.

### Panel Super Admin (`/admin/super`)
Pestañas (`SuperAdminSidebar.jsx`): Dashboard · Publicidades Home · Negocios · Vendedores · Reservas globales · Reseñas y feedback · Categorías. Permite crear, editar, "impersonar" y borrar negocios, resetear contraseñas y generar links de reseña.

### Panel del vendedor (`/admin/dashboard` y siguientes)
Listado de sus negocios, alta y edición de negocios, y reporte de comisiones.

## Qué NO hace hoy la plataforma

Conviene tenerlo claro para no asumir funcionalidades que no existen:

- **No cobra online**: ni reservas, ni señas, ni tienda, ni suscripciones. Los medios de pago que configura el negocio (efectivo, transferencia, Mercado Pago, tarjeta) son informativos; los datos bancarios (CBU/alias) se muestran al cliente.
- **No hay cuentas de cliente final**: el cliente reserva con nombre y teléfono.
- **No envía WhatsApp automáticos**: los mensajes se arman como links `wa.me` que alguien tiene que tocar.
- **Las notificaciones push con la app cerrada probablemente no llegan** (ver [Flujos](04-flujos.md#notificaciones)).
- **El cobro de suscripciones y comisiones a los negocios no está automatizado**: existen tablas y funciones para registrar pagos y calcular comisiones de vendedores, pero no hay integración de cobro.
