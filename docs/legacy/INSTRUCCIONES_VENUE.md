# 🚀 Instrucciones para Configurar el Venue de Prueba

## Problema Identificado

El sistema estaba redirigiendo a la página principal porque:
1. La tabla `businesses` no tenía una columna `slug`
2. El código intentaba buscar negocios por slug pero fallaba
3. No existía ningún negocio de tipo "alquiler" en la base de datos

## Solución Implementada

He creado un script SQL completo que:
1. ✅ Agrega la columna `slug` a la tabla `businesses`
2. ✅ Genera slugs automáticamente para todos los negocios existentes
3. ✅ Crea un negocio de prueba tipo "alquiler" completamente configurado

## 📋 Pasos para Ejecutar

### 1. Abrir Supabase SQL Editor

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
2. Haz clic en "SQL Editor" en el menú lateral
3. Crea una nueva query

### 2. Ejecutar el Script

1. Abre el archivo: `d:\court-booking-app\RUN_IN_SUPABASE.sql`
2. Copia TODO el contenido del archivo
3. Pégalo en el SQL Editor de Supabase
4. Haz clic en "Run" (o presiona Ctrl+Enter)

### 3. Verificar el Resultado

Deberías ver mensajes como:
```
✅ Venue created/updated successfully!
📍 Access URL: http://localhost:5175/quincho-el-paraiso/turnos
📧 Email: quincho.paraiso@turnitoslr.com
🔑 Password: Quincho2024!
🆔 Business ID: [un UUID]
```

### 4. Probar el Venue

1. Asegúrate de que el servidor esté corriendo: `npm run dev`
2. Abre tu navegador en: `http://localhost:5175/quincho-el-paraiso/turnos`
3. Deberías ver la nueva vista de venue con:
   - Hero con imagen
   - Galería de fotos
   - Amenidades
   - Servicios adicionales
   - Calendario
   - Panel de reserva

## 📊 Datos del Venue de Prueba

**Nombre:** Quincho El Paraíso  
**Tipo:** alquiler  
**Ubicación:** Av. Circunvalación 1234, La Rioja  
**Capacidad:** 80 personas  
**Precio base:** $5,000/hora  

**Pricing Tiers:**
- 1-30 personas: $5,000/hora
- 31-50 personas: $7,000/hora
- 51-80 personas: $9,000/hora

**Duraciones disponibles:** 4, 6, 8, 12, 24 horas

**Servicios Adicionales:**
- DJ Profesional: $15,000
- Servicio de Catering: $25,000
- Decoración Temática: $10,000
- Fotografía Profesional: $20,000

**Amenidades:**
- Piscina
- Parrilla
- WiFi
- Aire Acondicionado
- Parking
- Sonido
- Cocina Equipada
- Baños Completos
- Jardín
- Quincho Cubierto
- Zona de Juegos
- Iluminación LED

**Fechas Bloqueadas:**
- 15 de febrero de 2026
- 22 de febrero de 2026
- 1 de marzo de 2026

## 🔧 Acceso al Portal de Negocios

Para configurar el venue desde el portal:
1. Ve a: `http://localhost:5175/portal`
2. Inicia sesión con:
   - Email: `quincho.paraiso@turnitoslr.com`
   - Password: `Quincho2024!`
3. Verás el componente `VenueSettings` con todas las opciones de configuración

## ⚠️ Notas Importantes

- El script usa `ON CONFLICT (email) DO UPDATE` para que puedas ejecutarlo múltiples veces sin problemas
- Si ya tienes negocios en la base de datos, se les generará un slug automáticamente
- Los slugs duplicados se manejan agregando un número al final
- Las imágenes usan URLs de Unsplash como placeholder

## 🐛 Si Algo Sale Mal

Si después de ejecutar el script sigues teniendo problemas:

1. **Verifica que el slug se creó:**
   ```sql
   SELECT id, name, slug, type FROM businesses WHERE email = 'quincho.paraiso@turnitoslr.com';
   ```

2. **Verifica que todos los negocios tienen slug:**
   ```sql
   SELECT COUNT(*) FROM businesses WHERE slug IS NULL;
   ```
   (Debería devolver 0)

3. **Verifica la estructura de la tabla:**
   ```sql
   SELECT column_name, data_type FROM information_schema.columns 
   WHERE table_name = 'businesses' AND column_name = 'slug';
   ```

## 📝 Próximos Pasos

Una vez que el venue esté funcionando:
1. Prueba la selección de fechas en el calendario
2. Prueba cambiar la cantidad de invitados (debería cambiar el precio)
3. Prueba seleccionar diferentes duraciones
4. Prueba agregar servicios adicionales
5. Prueba el flujo completo de reserva

¿Necesitas ayuda con algo más? 🚀
