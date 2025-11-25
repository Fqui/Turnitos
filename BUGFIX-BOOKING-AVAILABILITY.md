# 🐛 Bugfix: Turnos Reservados Aparecían Como Disponibles

## Problema Identificado

Cuando se hacía una reserva, al volver a entrar a la página del negocio, el turno reservado **seguía apareciendo como disponible** y si se intentaba reservar en la misma fecha, la fecha se guardaba con un día adicional.

## Causas Raíz

### 1. **Falta de comparación de fecha en TimeSlotPicker**
La lógica `isBooked` en `TimeSlotPicker.jsx` solo comparaba:
- `resource_id` (cancha o servicio)
- `time` (hora)

**NO comparaba la fecha**, por lo que marcaba como ocupado un horario sin importar qué día fuera.

### 2. **Conversión incorrecta de fechas por zona horaria**
Al guardar una reserva, se usaba `date.toISOString().split('T')[0]` que convierte a UTC. Esto causaba:
- Si seleccionas **25 de noviembre** a las **21:00 hora local (UTC-3)**
- `toISOString()` lo convertía a **26 de noviembre 00:00 UTC**
- Se guardaba con fecha **26 de noviembre** ❌

## Solución Implementada

### ✅ Cambio 1: Agregado comparación de fecha en TimeSlotPicker.jsx

**Antes:**
```javascript
const isBooked = existingBookings?.some(booking => {
    const bookingMatches = booking.resource_id === resourceId && booking.time === formattedTime;
    return bookingMatches && booking.status !== 'cancelled';
}) || false;
```

**Después:**
```javascript
// Convertir selectedDate a formato YYYY-MM-DD (hora local, no UTC)
const selectedDateStr = selectedDate 
    ? (selectedDate instanceof Date
        ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
        : selectedDate)
    : null;

const isBooked = existingBookings?.some(booking => {
    // Convertir fecha de booking a string
    const bookingDateStr = booking.date instanceof Date
        ? `${booking.date.getFullYear()}-${String(booking.date.getMonth() + 1).padStart(2, '0')}-${String(booking.date.getDate()).padStart(2, '0')}`
        : booking.date;
    
    // Debe coincidir: resource_id, time Y date
    const bookingMatches = booking.resource_id === resourceId 
        && booking.time === formattedTime
        && bookingDateStr === selectedDateStr
        && booking.status !== 'cancelled';
    
    return bookingMatches;
}) || false;
```

**Archivos modificados:**
- `src/components/TimeSlotPicker.jsx` - Agregado parámetro `selectedDate`
- `src/pages/BusinessProfile.jsx` - Pasado `selectedDate` al componente

### ✅ Cambio 2: Conversión de fechas usando hora local

**Antes (supabaseService.js):**
```javascript
date: bookingData.date instanceof Date
    ? bookingData.date.toISOString().split('T')[0]  // ❌ Convierte a UTC
    : bookingData.date,
```

**Después (supabaseService.js):**
```javascript
// Helper function para convertir Date a YYYY-MM-DD en zona horaria local
const formatDateLocal = (date) => {
    if (!date) return null;
    if (typeof date === 'string') return date;
    // Usar componentes locales de la fecha para evitar conversión de zona horaria
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

date: formatDateLocal(bookingData.date),
```

**Archivos modificados:**
- `src/services/supabaseService.js` - Función `createBooking`
- `src/services/mockService.js` - Funciones `createBooking` y `getBookings`

## Archivos Afectados

1. ✅ `src/components/TimeSlotPicker.jsx`
2. ✅ `src/pages/BusinessProfile.jsx`
3. ✅ `src/services/supabaseService.js`
4. ✅ `src/services/mockService.js`

## Resultado

Ahora el sistema:
- ✅ Solo marca como ocupado un turno si **coinciden fecha, hora Y recurso**
- ✅ Guarda la fecha correctamente sin conversión de zona horaria
- ✅ Al volver a la página, los turnos reservados aparecen como NO DISPONIBLES
- ✅ No hay salto de días al guardar reservas

## Pruebas Recomendadas

1. **Crear una reserva** para hoy a las 14:00 en Cancha 1
2. **Refrescar la página** y volver al negocio
3. **Verificar** que:
   - El slot 14:00 en Cancha 1 aparece como NO DISPONIBLE para hoy
   - El slot 14:00 en Cancha 2 SÍ está disponible (diferente recurso)
   - El slot 14:00 en Cancha 1 para MAÑANA SÍ está disponible (diferente fecha)
   - El slot 15:00 en Cancha 1 SÍ está disponible (diferente hora)
4. **Verificar en la base de datos** que la fecha guardada sea la correcta

## Notas Técnicas

### Por qué `toISOString()` causaba problemas

JavaScript `Date.toISOString()` siempre retorna la fecha en **UTC (Coordinated Universal Time)**. 

**Ejemplo:**
- Fecha local: `2025-11-25 21:00:00 GMT-3` (Buenos Aires)
- `toISOString()`: `2025-11-26T00:00:00.000Z` (UTC)
- Split por 'T': `2025-11-26` ❌ (un día adelante!)

**Solución:**
Usar los métodos locales:
- `getFullYear()` - Año local
- `getMonth()` - Mes local (0-indexed)
- `getDate()` - Día local

Esto garantiza que la fecha guardada sea la que el usuario ve en su pantalla.

---

**Fecha de implementación**: 2025-11-24  
**Severidad del bug**: Alta (afectaba funcionalidad core de reservas)  
**Estado**: ✅ Resuelto
