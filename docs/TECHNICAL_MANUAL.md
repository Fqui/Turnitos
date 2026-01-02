# 📘 Technical Manual - CourtBooking App

Este documento proporciona una visión profunda y técnica de la arquitectura, modelos de datos y lógica de negocio de la aplicación.

---

## 🏗️ Arquitectura del Sistema

La aplicacion sigue una arquitectura moderna **Serverless** basada en React (Frontend) y Supabase (Backend as a Service).

### 1. Frontend (React + Vite)
- **Framework**: React 19.
- **Build Tool**: Vite 7.
- **Routing**: React Router DOM (v7). Se utiliza una estructura de rutas hash (`HashRouter`) para compatibilidad total con GitHub Pages.
- **State Management**: `useState` y `useEffect` local con propagación de props. Para estados globales críticos (como el usuario autenticado), se utiliza persistencia en `localStorage`.

### 2. Capa de Servicios (Service Layer)
La aplicación implementa el patrón **Adapter** para desacoplar la lógica de negocio de la fuente de datos.

- **`serviceAdapter.js`**: Actúa como proxy único. Detecta el entorno (Prod vs Demo) y redirige las llamadas.
    - *Prod*: Usa `supabaseService.js`.
    - *Demo*: Usa `mockService.js` (datos en memoria).
- **`supabaseService.js`**: Maneja la comunicación directa con Supabase via `supabase-js`.

### 3. Backend (Supabase)
- **PostgreSQL**: Base de datos relacional principal.
- **Auth**: Gestión de sesiones (aunque implementamos un login custom por Email/Password contra la tabla `businesses`).
- **Storage**: Alojamiento de imágenes (logos, banners).
- **Edge Functions**: (Planificado) para lógica de servidor compleja.

---

## 🗄️ Modelos de Base de Datos (Schema)

A continuación se detalla la estructura de las tablas principales en PostgreSQL.

### 1. `businesses` (Negocios)
Almacena el perfil y configuración de cada complejo.

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | `text` | ID único (timestamp-based en legacy, UUID recomendado). |
| `name` | `text` | Nombre comercial del complejo. |
| `email` | `text` | **(Nuevo)** Email único para login. |
| `password` | `text` | **(Nuevo)** Contraseña de acceso. |
| `hours` | `jsonb` | Configuración compleja de horarios (ver detalle abajo). |
| `logo` | `text` | URL de la imagen del logo. |
| `banner_image` | `text` | URL del banner de portada. |
| `type` | `text` | Categoría: `sport` (canchas) o `service` (turnos). |
| `mp_access_token`| `text` | (Futuro) Token de Mercado Pago. |

** Estructura JSON de `hours`:**
```json
{
  "monday": { 
    "open": "09:00", 
    "close": "23:00", 
    "isOpen": true,
    "isSplit": true,       // Nuevo: Horario cortado
    "breakStart": "13:00", // Inicio siesta
    "breakEnd": "16:00"    // Fin siesta
  },
  ...
}
```

### 2. `bookings` (Reservas)
Registro transaccional de cada turno.

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | `uuid` | Identificador único. |
| `business_id` | `text` | FK a `businesses`. |
| `date` | `text` | Fecha en formato `YYYY-MM-DD` (o `DD/MM/YYYY` legacy). |
| `time` | `text` | Hora de inicio (ej. `14:00`). |
| `court_id` | `text` | Recurso reservado (Cancha o Servicio). |
| `customer_name` | `text` | Nombre del cliente. |
| `customer_phone`| `text` | Teléfono de contacto. |
| `status` | `text` | `pending`, `confirmed`, `cancelled`, `deposit_paid`. |
| `payment_status`| `text` | `paid` (total), `deposit` (seña), `pending`. |

### 3. `customers` (CRM)
Tabla derivada para gestión de clientes, sincronizada automáticamente.

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | `uuid` | ID único del cliente. |
| `business_id` | `text` | FK a `businesses`. |
| `name` | `text` | Nombre. |
| `phone` | `text` | Teléfono (Clave única compuesta junto a `business_id`). |
| `tags` | `jsonb` | Etiquetas (ej. `["vip", "conflictivo"]`). |

---

## ⚙️ Funcionalidades Core

### 1. Calendario Dinámico (`DashboardCalendar.jsx`)
- **Lógica de Rango**: Al cargar, escanea el JSON de `hours` del negocio. Calcula la hora de apertura más temprana (`minStart`) y de cierre más tardía (`maxEnd`) de la semana para renderizar solo las filas necesarias.
- **Horario Cortado**: Al renderizar cada celda, verifica si cae dentro del rango `breakStart` - `breakEnd` del día correspondiente. Si es así, aplica un estilo visual de "bloqueado" (trama diagonal).

### 2. Persistencia de Configuración (`BusinessSettings.jsx`)
- **Estrategia "Blind Update"**: Para evitar timeouts por lecturas pesadas (ej. base64 legacy), el sistema de guardado envía un `UPDATE` a Supabase pero **no solicita** el retorno de la fila actualizada (`.select()` removido).
- **Actualización Optimista**: La UI asume el éxito y actualiza el estado local manualmente.
- **Granularidad**: Cada pestaña (Horarios, General, etc.) tiene su propio `handleSubmit` que envía **solo** los campos modificados (ej. `{ hours: ... }`), previniendo la sobreescritura accidental de otros datos.

### 3. Sincronización CRM (Triggers SQL)
Un trigger de base de datos (`trigger_sync_booking_to_customers`) escucha `INSERT` o `UPDATE` en la tabla `bookings`.
- Si entra una reserva con un teléfono nuevo, crea automáticamente el registro en `customers`.
- Si el cliente ya existe, actualiza su nombre y fecha de última actividad (`updated_at`).
- Esto garantiza que el módulo CRM siempre esté al día sin código extra en el Frontend.

### 4. Analíticas Centralizadas
Un sistema similar sincroniza datos a `bookings_analytics` para nutrir los gráficos de rendimiento sin impactar la tabla transaccional principal.

---

## 🔒 Seguridad
- **RLS (Row Level Security)**: Las tablas están protegidas a nivel fila. Un negocio solo puede leer/escribir sus:
    - Propias Reservas (`business_id = current_user_id`).
    - Propio Perfil.
    - Propios Clientes.
- **Secrets**: Las Keys de Supabase se inyectan via variables de entorno (`.env`).
