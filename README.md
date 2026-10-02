# TurnitosLR

Plataforma de **turnos y reservas online para negocios de La Rioja** — canchas, peluquerías, barberías, estética, salud, mascotas, quinchos y salones.

🌐 **[www.turnitoslr.com](https://www.turnitoslr.com)**

- **Marketplace** público para buscar y reservar por rubro, nombre o cercanía.
- **Panel de gestión** para cada negocio: agenda, reservas, clientes, estadísticas y configuración completa del perfil.
- **Presencia online** del negocio: página propia (o subdominio `negocio.turnitoslr.com`), link in bio y tienda por WhatsApp.
- **Paneles de vendedores y super admin** para dar de alta negocios, gestionar publicidades, reseñas y comisiones.

## Documentación

Toda la documentación está en **[`docs/`](docs/README.md)**:

1. [Visión general](docs/01-vision-general.md)
2. [Arquitectura](docs/02-arquitectura.md)
3. [Base de datos](docs/03-base-de-datos.md)
4. [Flujos principales](docs/04-flujos.md)
5. [Planes y comisiones](docs/05-planes-y-comisiones.md)
6. [Seguridad y riesgos](docs/06-seguridad-y-riesgos.md) ⚠️ leer primero
7. [Deuda técnica](docs/07-deuda-tecnica.md)
8. [Desarrollo y deploy](docs/08-desarrollo-y-deploy.md)

Guías vigentes en la raíz: [`WORKFLOW.md`](WORKFLOW.md) (ramas y previews) y [`DESIGN_GUIDELINES.md`](DESIGN_GUIDELINES.md) (medidas de imágenes). Contexto para asistentes de IA: [`CLAUDE.md`](CLAUDE.md).

## Stack

React 19 · Vite 7 · React Router 7 · Zustand · Framer Motion · Leaflet · Recharts · Supabase (Postgres, Auth, Storage, Realtime) · Firebase Cloud Messaging · Vercel

## Inicio rápido

```bash
npm install
# crear .env con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev    # http://localhost:5174
```

Más detalle en [Desarrollo y deploy](docs/08-desarrollo-y-deploy.md).
