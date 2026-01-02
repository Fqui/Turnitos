# 🎾 CourtBooking App

Plataforma integral SaaS para la gestión de turnos y reservas de complejos deportivos (Pádel, Tenis, Fútbol). Diseñada para ofrecer una experiencia de usuario fluida y una administración potente para los dueños de negocios.

![React](https://img.shields.io/badge/React-19-blue) ![Vite](https://img.shields.io/badge/Vite-5-purple) ![Supabase](https://img.shields.io/badge/Supabase-Database-green) ![Recharts](https://img.shields.io/badge/Recharts-Analytics-orange)

> 📘 **Documentación Completa**: Para ver detalles de arquitectura, base de datos y lógica interna, consulta el [Manual Técnico](docs/TECHNICAL_MANUAL.md).

## ✨ Características Principales

### 📅 Gestión de Reservas (Business Portal)
- **Calendario Dinámico**: Visualización semanal/diaria que se ajusta automáticamente a los horarios de apertura y cierre del negocio.
- **Gestión Visual**: Estados de reserva por colores (Pendiente, Confirmado, Señado, Finalizado).
- **Drag & Drop (Deprecado)**: Reemplazado por un sistema de **Reprogramación Asistida** más robusto para móviles.
- **Horario Cortado**: Soporte para horarios de descanso (siesta) configurables por día.

### 👥 CRM & Clientes
- **Base de Datos de Clientes**: Registro automático de clientes al crear reservas.
- **Historial Completo**: Visualización de todas las reservas pasadas y futuras por cliente.
- **Accesos Rápidos**: Contacto directo vía WhatsApp desde la ficha del cliente.

### 📊 Dashboard & Analíticas
- **Métricas en Tiempo Real**: Ingresos mensuales, tasa de ocupación y reservas totales.
- **Gráficos Interactivos**: Evolución de ingresos y ocupación visualizada con Recharts.

### ⚙️ Configuración del Negocio
- **Perfil Autogestionable**: Carga de logo, banner y fotos del complejo.
- **Horarios Flexibles**: Configuración granular de horarios por día de la semana, incluyendo cierres temporales.
- **Reglas de Negocio**: Definición de precios, señas y políticas de cancelación.

## 🛠️ Stack Tecnológico

- **Frontend**: React 19 + Vite 7
- **Base de Datos / Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Estilos**: CSS Modules + Framer Motion (Animaciones)
- **Mapas**: Leaflet / React-Leaflet
- **Despliegue**: GitHub Pages

## 🚀 Instalación y Uso

### Prerrequisitos
- Node.js (v18 o superior)
- Cuenta en Supabase

### Pasos
1.  **Clonar el repositorio**:
    ```bash
    git clone https://github.com/tu-usuario/court-booking-app.git
    cd court-booking-app
    ```

2.  **Instalar dependencias**:
    ```bash
    npm install
    ```

3.  **Configurar Variables de Entorno**:
    Crear un archivo `.env` en la raíz con las credenciales de Supabase:
    ```env
    VITE_SUPABASE_URL=tu_url_de_supabase
    VITE_SUPABASE_ANON_KEY=tu_clave_anonima
    ```

4.  **Iniciar Servidor de Desarrollo**:
    ```bash
    npm run dev
    ```

## 📂 Estructura del Proyecto

```
src/
├── components/      # Componentes UI reutilizables (Calendar, Stats, CRM)
├── pages/           # Vistas principales (BusinessPortal, Login, Home)
├── services/        # Lógica de conexión a Supabase y adaptadores
├── utils/           # Funciones de ayuda y formateo
└── App.jsx          # Componente raíz y Rutas
```

## 📦 Despliegue

El proyecto está configurado para desplegarse automáticamente en GitHub Pages usando `gh-pages`.

```bash
npm run deploy
```

---
Desarrollado con ❤️ para optimizar la gestión deportiva.
