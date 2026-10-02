# Tabla de Análisis de Datos - Bookings Analytics

## Descripción General

La tabla `bookings_analytics` es una tabla centralizada que almacena información de **todas las reservas de todos los negocios** para facilitar el análisis de datos en el portal de administración.

## Características Principales

### 1. **Sincronización Automática**
- Cada vez que se crea o actualiza una reserva en la tabla `bookings`, automáticamente se sincroniza con `bookings_analytics`
- Utiliza un trigger de PostgreSQL para mantener los datos actualizados en tiempo real
- No requiere código adicional en la aplicación

### 2. **Campos Calculados Automáticamente**
- `day_of_week`: Día de la semana (0=Domingo, 6=Sábado)
- `hour_of_day`: Hora del día (0-23)
- `week_of_year`: Semana del año
- `month`: Mes (1-12)
- `year`: Año
- `is_weekend`: Booleano que indica si es fin de semana
- `booking_datetime`: Timestamp combinado de fecha y hora

### 3. **Privacidad del Cliente**
- `customer_id`: Hash MD5 del teléfono del cliente para tracking anónimo
- Permite identificar clientes recurrentes sin exponer datos sensibles

## Estructura de Datos

```sql
bookings_analytics
├── id (UUID)
├── booking_id (referencia a bookings)
├── business_id, business_name, business_category, business_type
├── booking_date, booking_time, booking_datetime
├── customer_name, customer_phone, customer_id (hash)
├── service_id, service_name, service_category
├── court_id, court_name, court_sport
├── price, deposit_amount
├── status (confirmed, cancelled, deposit_paid, blocked)
├── duration, metadata
├── created_at, updated_at, cancelled_at, confirmed_at
└── Campos calculados: day_of_week, hour_of_day, etc.
```

## Consultas de Ejemplo

### 1. Ingresos Totales por Negocio (Último Mes)
```sql
SELECT 
    business_name,
    COUNT(*) as total_bookings,
    SUM(price) as total_revenue,
    AVG(price) as avg_booking_value
FROM bookings_analytics
WHERE booking_date >= CURRENT_DATE - INTERVAL '30 days'
    AND status IN ('confirmed', 'deposit_paid')
GROUP BY business_id, business_name
ORDER BY total_revenue DESC;
```

### 2. Horas Pico por Día de la Semana
```sql
SELECT 
    day_of_week,
    hour_of_day,
    COUNT(*) as booking_count
FROM bookings_analytics
WHERE status = 'confirmed'
    AND booking_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY day_of_week, hour_of_day
ORDER BY booking_count DESC
LIMIT 20;
```

### 3. Tasa de Cancelación por Negocio
```sql
SELECT 
    business_name,
    COUNT(*) as total_bookings,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'cancelled')::numeric / 
        COUNT(*)::numeric * 100, 
        2
    ) as cancellation_rate_percent
FROM bookings_analytics
WHERE booking_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY business_id, business_name
HAVING COUNT(*) > 10
ORDER BY cancellation_rate_percent DESC;
```

### 4. Clientes Recurrentes
```sql
SELECT 
    customer_id,
    customer_name,
    COUNT(*) as total_bookings,
    SUM(price) as total_spent,
    MIN(booking_date) as first_booking,
    MAX(booking_date) as last_booking
FROM bookings_analytics
WHERE status IN ('confirmed', 'deposit_paid')
GROUP BY customer_id, customer_name
HAVING COUNT(*) > 1
ORDER BY total_bookings DESC;
```

### 5. Comparación Fin de Semana vs Entre Semana
```sql
SELECT 
    business_name,
    is_weekend,
    COUNT(*) as bookings,
    SUM(price) as revenue,
    AVG(price) as avg_price
FROM bookings_analytics
WHERE status = 'confirmed'
    AND booking_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY business_id, business_name, is_weekend
ORDER BY business_name, is_weekend;
```

### 6. Tendencias Mensuales (Vista Predefinida)
```sql
SELECT * FROM v_bookings_analytics_summary
WHERE month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '6 months')
ORDER BY business_name, month;
```

## Uso en el Portal Admin

Esta tabla está diseñada para ser consultada desde el **Portal de Administración** para:

1. **Dashboards de Análisis**: Visualizar métricas globales de todos los negocios
2. **Reportes Comparativos**: Comparar rendimiento entre diferentes negocios
3. **Identificación de Tendencias**: Detectar patrones de reservas por hora, día, mes
4. **Análisis de Clientes**: Identificar clientes VIP y patrones de comportamiento
5. **Optimización de Precios**: Analizar demanda por horario para ajustar precios

## Mantenimiento

### Repoblar Datos Históricos
Si necesitas sincronizar reservas existentes:

```sql
-- Ejecutar la función de sync para todas las reservas existentes
INSERT INTO bookings_analytics (
    booking_id, business_id, business_name, business_category, business_type,
    booking_date, booking_time, customer_name, customer_phone, customer_id,
    service_id, service_name, service_category, court_id, court_name, court_sport,
    price, status, duration, metadata
)
SELECT
    b.id,
    b.business_id,
    bus.name,
    bus.category,
    bus.type,
    b.date,
    b.time,
    b.customer_name,
    b.customer_phone,
    MD5(b.customer_phone),
    b.service_id,
    s.name,
    s.category,
    b.court_id,
    c.name,
    c.sport,
    b.price,
    b.status,
    b.duration,
    b.metadata
FROM bookings b
JOIN businesses bus ON bus.id = b.business_id
LEFT JOIN services s ON s.id = b.service_id
LEFT JOIN courts c ON c.id = b.court_id
ON CONFLICT (booking_id) DO NOTHING;
```

## Índices

La tabla incluye índices optimizados para:
- Búsquedas por negocio
- Filtros por fecha
- Filtros por estado
- Búsquedas por cliente
- Ordenamiento temporal

## Próximos Pasos

1. Ejecutar la migración en Supabase
2. Verificar que el trigger funciona correctamente
3. Crear visualizaciones en el Portal Admin
4. Configurar políticas RLS si es necesario
