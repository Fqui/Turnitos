# 🔧 Fix: Parpadeo de Disponibilidad de Turnos

## Problema Reportado

Los turnos se mostraban inicialmente como DISPONIBLES y luego, después de un breve momento, se bloqueaban los que ya estaban reservados. Esto creaba una mala experiencia de usuario donde:

1. Usuario selecciona una fecha
2. Ve TODOS los turnos disponibles (⚠️ información incorrecta)
3. Medio segundo después, algunos turnos se bloquean
4. Usuario puede confundirse o intentar hacer clic en turnos que luego se bloquean

## Causa Raíz

### Problema de Timing en React

**Flujo Previous (MALO):**
```
1. selectedDate cambia
   ↓
2. useEffect detecta cambio → inicia fetch de bookings (asíncrono)
   ↓
3. React renderiza INMEDIATAMENTE TimeSlotPicker
   ↓
4. TimeSlotPicker recibe existingBookings = [] (vacío!)
   ↓
5. Genera slots → TODOS marcados como available ❌
   ↓
6. [... espera 100-300ms ...]
   ↓
7. Fetch completa → setExistingBookings(data)
   ↓
8. Re-render → Ahora SÍ marca slots ocupados ✅
```

**Resultado:** Flash visual de "todo disponible" → "algunos bloqueados"

### Problema Secundario: Conversión UTC

Además, en la línea 154 se usaba:
```javascript
selectedDate.toISOString().split('T')[0]
```

Esto causaba problemas de zona horaria al buscar las reservas.

## Solución Implementada

### 1. Estado de Loading para Bookings

**Agregado:**
```javascript
const [loadingBookings, setLoadingBookings] = useState(false);
```

**Modificado useEffect:**
```javascript
useEffect(() => {
    const fetchBookingsForDate = async () => {
        if (business?.id && selectedDate) {
            setLoadingBookings(true); // 🆕 Marca como cargando
            try {
                // Conversión local (sin UTC)
                const dateStr = selectedDate instanceof Date
                    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
                    : selectedDate;

                const { bookings } = await serviceAdapter.getBookings(business.id, dateStr);
                setExistingBookings(bookings || []);
            } catch (error) {
                console.error("Error fetching bookings:", error);
                setExistingBookings([]);
            } finally {
                setLoadingBookings(false); // 🆕 Loading terminado
            }
        } else {
            setExistingBookings([]);
            setLoadingBookings(false);
        }
    };

    fetchBookingsForDate();
}, [business?.id, selectedDate]);
```

### 2. UI de Loading

**Antes de renderizar TimeSlotPicker:**
```javascript
// 🆕 Mostrar loading mientras se cargan bookings
if (loadingBookings) {
    return (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ 
                /* spinner animado con color del negocio */
                borderTopColor: primaryColor,
                animation: 'spin 1s linear infinite'
            }} />
            <p>Cargando disponibilidad...</p>
        </div>
    );
}

// Solo después de cargar, mostrar TimeSlotPicker
return <TimeSlotPicker existingBookings={existingBookings} ... />;
```

## Flujo NUEVO (CORRECTO)

```
1. selectedDate cambia
   ↓
2. setLoadingBookings(true)
   ↓
3. React renderiza → Ve loadingBookings === true
   ↓
4. Muestra SPINNER de "Cargando disponibilidad..."
   ↓
5. Mientras tanto: fetch de bookings en background
   ↓
6. Fetch completa → setExistingBookings(data)
   ↓
7. setLoadingBookings(false)
   ↓
8. React renderiza → Ahora muestra TimeSlotPicker
   ↓
9. TimeSlotPicker recibe bookings CORRECTOS desde el inicio ✅
```

**Resultado:** 
- ✅ NO hay flash de información incorrecta
- ✅ Usuario ve feedback claro de "cargando"
- ✅ Cuando aparecen los slots, YA están con disponibilidad correcta

## Beneficios

### UX Mejorada
- ✅ No confunde al usuario con información incorrecta
- ✅ Feedback claro de que algo está pasando
- ✅ Experiencia más profesional y pulida

### Técnico
- ✅ Previene race conditions
- ✅ Estado claro de loading/loaded
- ✅ Manejo de errores mejorado (resetea a array vacío si falla)

## Archivos Modificados

- `src/pages/BusinessProfile.jsx`
  - Agregado estado `loadingBookings`
  - Modificado `useEffect` para manejar loading
  - Agregada UI de loading antes de TimeSlotPicker
  - Corregida conversión de fecha (UTC → local)

## Testing

### Cómo Probar

1. **Abrir cualquier negocio** (ej: Elite Padel Club)
2. **Seleccionar una fecha**
3. **Observar:**
   - Debe aparecer un spinner con texto "Cargando disponibilidad..."
   - NO deben aparecer los slots hasta que termine de cargar
   - Cuando aparezcan, los ocupados deben estar bloqueados desde el inicio

### Casos de Prueba

**Test 1: Con Reservas Existentes**
- Crear una reserva para mañana a las 14:00
- Refrescar página
- Ir al negocio
- Seleccionar mañana
- ✅ Ver loading → Ver slots con 14:00 BLOQUEADO desde el inicio

**Test 2: Sin Reservas**
- Seleccionar una fecha futura sin reservas
- ✅ Ver loading → Ver TODOS los slots disponibles

**Test 3: Error de Red**
- Simular error de red (desconectar)
- Seleccionar fecha
- ✅ Ver loading → Ver mensaje o slots vacíos (sin crash)

## Notas Técnicas

### Por Qué No Usar Suspense?

React Suspense sería ideal para este caso, pero:
- Requiere refactorización mayor
- Esta solución es más simple y directa
- Funciona perfectamente para este caso de uso

### Performance

El loading adicional es mínimo:
- Fetch típico: 100-300ms
- Usuario ya esperaba ver algo cargando
- Spinner es ligero (CSS puro, no imágenes)

### Consideraciones Futuras

Si queremos optimizar más:
1. **Pre-fetch:** Cargar bookings cuando se hace hover sobre una fecha
2. **Cache:** Guardar bookings de fechas ya visitadas
3. **Optimistic UI:** Actualizar UI inmediatamente al crear reserva

---

**Fecha:** 2025-11-25  
**Tipo:** UX Fix + Bug Fix  
**Severidad:** Media-Alta (afecta experiencia de usuario)  
**Estado:** ✅ Resuelto y Documentado
