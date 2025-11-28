# Implementación del Tipo de Negocio "Venue" (Alquiler de Espacios)

## Resumen
Se implementó exitosamente un nuevo tipo de negocio "Venue" para el alquiler de espacios (quinchos, salones de eventos, etc.) con funcionalidades específicas de reserva por horas y servicios adicionales.

## 🎯 Características Implementadas

### 1. Base de Datos
- **Migración `add_venue_fields.sql`**: Agregó campos a la tabla `businesses`:
  - `price_per_hour` (DECIMAL): Precio por hora del alquiler
  - `rental_duration_options` (JSONB): Opciones de duración (ej: [4, 6, 8, 12, 24] horas)
  - `additional_services` (JSONB): Servicios adicionales opcionales con nombre, precio e ícono
  - `included_amenities` (JSONB): Comodidades incluidas en el precio base
  - `gallery_images` (JSONB): Array de URLs de imágenes para la galería

- **Migración `add_booking_fields.sql`**: Agregó campos a la tabla `bookings`:
  - `duration` (INTEGER): Duración de la reserva en minutos
  - `metadata` (JSONB): Metadatos adicionales (ej: servicios adicionales seleccionados)

### 2. Panel de Administración (`BusinessForm.jsx`)

#### Nueva Opción de Tipo
- Agregado "Alquiler de Espacios" como tipo de negocio en el selector

#### Secciones de Configuración (solo para type='venue'):

**a) Configuración de Alquiler**
- Campo de precio por hora
- Selector de opciones de duración (4, 6, 8, 12, 24 horas)

**b) Galería de Imágenes**
- Subida de múltiples imágenes
- Vista previa en grid
- Almacenamiento en Supabase Storage

**c) Servicios Adicionales**
- Nombre del servicio
- Precio adicional
- Ícono (emoji)
- Lista con opción de eliminar

**d) Comodidades Incluidas**
- Lista de amenidades incluidas en el precio base
- Formato de badges/chips
- Agregar/eliminar fácilmente

#### Estados Agregados
```javascript
const [venueGalleryImages, setVenueGalleryImages] = useState([]);
const [uploadingGalleryImage, setUploadingGalleryImage] = useState(false);
const [additionalServices, setAdditionalServices] = useState([]);
const [newAdditionalService, setNewAdditionalService] = useState({ name: '', price: '', icon: '🎯' });
const [includedAmenities, setIncludedAmenities] = useState([]);
const [rentalDurationOptions, setRentalDurationOptions] = useState([4, 6, 8, 12]);
```

#### Funciones Helper
- `handleGalleryUpload()`: Sube imágenes a Supabase Storage
- `addAdditionalService()`: Agrega servicios adicionales
- `removeAdditionalService()`: Elimina servicios
- `addIncludedAmenity()`: Agrega amenidades
- `removeIncludedAmenity()`: Elimina amenidades
- `toggleDurationOption()`: Toggle opciones de duración

### 3. Vista Pública (`BusinessProfile.jsx`)

#### Galería de Fotos
- Carrusel horizontal scrollable
- Imágenes de 280x180px
- Layout responsivo

#### Flujo de Reserva para Venues:

**Paso 1: Seleccionar Fecha**
- Calendario estándar
- Visible automáticamente para venues (no requiere selección previa)

**Paso 2: Horario y Duración**
- Selector de hora de inicio (8:00 - 21:00)
- Botones de duración basados en `rental_duration_options`
- Cálculo dinámico de precio: `precio_por_hora * duración`
- Actualización en tiempo real del precio

**Paso 3: Servicios Adicionales (Opcional)**
- Cards clickeables para cada servicio
- Checkbox visual personalizado
- Muestra precio adicional
- Emoji/ícono para cada servicio

#### Estados Agregados
```javascript
const [selectedDuration, setSelectedDuration] = useState(null);
const [selectedAdditionalServices, setSelectedAdditionalServices] = useState([]);
```

#### Lógica de Precios
```javascript
// Precio base
const basePrice = business.price_per_hour * selectedDuration;

// Precio con servicios adicionales
const extraServicesPrice = selectedAdditionalServices.reduce((sum, s) => sum + s.price, 0);
const totalPrice = basePrice + extraServicesPrice;
```

### 4. Backend (`supabaseService.js`)

#### `createBusiness()` y `updateBusiness()`
Actualizados para incluir campos de venue:
```javascript
price_per_hour: businessData.price_per_hour,
rental_duration_options: businessData.rental_duration_options || [],
additional_services: businessData.additional_services || [],
included_amenities: businessData.included_amenities || [],
gallery_images: businessData.gallery_images || []
```

#### `createBooking()`
Actualizado para guardar:
```javascript
duration: bookingData.duration,  // Duración en minutos
metadata: bookingData.metadata   // { additionalServices: [...] }
```

### 5. Integración con Sistema de Reservas

#### `handleConfirmBooking()` en BusinessProfile
```javascript
const bookingData = {
    // ... campos estándar
    duration: business.type === 'venue' ? (selectedDuration * 60) : ...,
    metadata: business.type === 'venue' 
        ? { additionalServices: selectedAdditionalServices }
        : null
};
```

#### `BookingSummary`
Actualizado para mostrar:
- Duración del alquiler para venues
- Lista de servicios adicionales seleccionados
- Precio total desglosado

## 🎨 Diseño y UX

### Consistencia Visual
- Mantiene el sistema de diseño de "Turnitos"
- Utiliza variables CSS existentes (`--primary-paddle`, `--bg-card`, etc.)
- Animaciones suaves (`slideUp 0.4s ease`)
- Responsive design

### Paleta de Colores
- Usa el color primario del negocio dinámicamente
- Estados activos/seleccionados con transparencia (`${primaryColor}20`)
- Bordes y estados hover consistentes

### Componentes Reutilizables
- Botones de duración con estado activo/inactivo
- Cards de servicios adicionales con checkbox personalizado
- Galería de imágenes con overlay de eliminación

## 📁 Archivos Modificados/Creados

### Creados:
- `migrations/add_venue_fields.sql`
- `migrations/add_booking_fields.sql`

### Modificados:
- `src/components/BusinessForm.jsx` (+262 líneas)
- `src/pages/BusinessProfile.jsx` (+154 líneas)
- `src/services/supabaseService.js` (+14 líneas)

## 🚀 Próximos Pasos Sugeridos

1. **Ejecutar Migraciones en Supabase**
   - Aplicar `add_venue_fields.sql`
   - Aplicar `add_booking_fields.sql`

2. **Pruebas**
   - Crear un negocio tipo "venue" desde el panel admin
   - Configurar: precio, duración, galería, servicios, amenidades
   - Probar reserva desde la vista pública
   - Verificar que los datos se guarden correctamente

3. **Mejoras Futuras**
   - Validación de disponibilidad (evitar reservas superpuestas)
   - Calendario de disponibilidad para venues
   - Sistema de descuentos por duración (ej: día completo más barato)
   - Confirmación por email/WhatsApp
   - Panel de gestión de reservas de venues en el portal del negocio

4. **Optimizaciones**
   - Lazy loading de imágenes de galería
   - Compresión de imágenes al subir
   - Cache de datos de venue
   - Indicadores de carga mejorados

## 💡 Notas Técnicas

- Los servicios adicionales se guardan en `bookings.metadata` como JSON
- La duración se guarda en minutos para consistencia con servicios
- Las imágenes de galería se almacenan en Supabase Storage bajo `gallery/`
- El tipo "venue" es completamente independiente de "sport" y "service"
- La validación de horarios de negocio aplica también a venues

## ✅ Commits Realizados

1. `feat: Add database migration for venue-type businesses`
2. `feat: Add venue type option and state management for venue-specific fields`
3. `feat: Add UI for venue configuration in BusinessForm`
4. `feat: Add duration and metadata columns to bookings table`
5. `feat: Add venue booking UI in BusinessProfile`
6. `feat: Update supabaseService to save venue fields in create and update`

---

**Estado**: ✅ Implementación completa y lista para testing
**Fecha**: 2025-11-28
