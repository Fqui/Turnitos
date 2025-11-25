# 🎨 Feature: Selector de Tema y Color de Botones

## 🎯 Objetivo

Permitir a los administradores personalizar la apariencia visual de cada negocio, incluyendo:
- Selección de tema (claro u oscuro)
- Selección de color de botones y acentos

Esta característica permite que cada negocio tenga su propia identidad visual personalizada.

## ✨ Características Implementadas

### 1. Selector de Tema

**Opciones disponibles:**
- ☀️ **Tema Claro** - Fondo blanco con texto oscuro
- 🌙 **Tema Oscuro** - Fondo oscuro con texto claro (default para deportes)

**UI:**
- Botones visuales tipo toggle con iconos
- Indicador visual del tema seleccionado (borde verde)
- Feedback visual al cambiar (background resaltado)

### 2. Selector de Color

**Componentes:**
- **Color Picker nativo** - Permite seleccionar cualquier color
- **Input de texto** - Para ingresar códigos hex manualmente (ej: `#00E676`)
- **Colores Preset** - 6 colores sugeridos para selección rápida:
  - 🟢 Verde (`#00E676`) - Default
  - 🔵 Azul (`#2196F3`)
  - 🟣 Púrpura (`#9C27B0`)
  - 🟠 Naranja (`#FF9800`)
  - 🌸 Rosa (`#E91E63`)
  - 🔷 Cian (`#00BCD4`)

**Validaciones:**
- Solo acepta códigos hex válidos en el input de texto
- Formato: `#RRGGBB` (6 dígitos hexadecimales)

### 3. Vista Previa en Tiempo Real

**Elementos preview:**
- Botón de acción con el color seleccionado
- Etiqueta de categoría con background alpha del color seleccionado
-  Fondo del preview cambia según el tema (claro/oscuro)

**Funcionalidad:**
- Se actualiza inmediatamente al cambiar tema o color
- Muestra cómo se verán los elementos en el perfil público

## 📝 Campos en la Base de Datos

### `theme` (string)
- **Valores:** `'light'` | `'dark'`
- **Default:** `'dark'` para nuevos negocios deportivos
- **Uso:** Determina el esquema de colores del perfil

### `primaryColor` (string)
- **Valor:** Código hex (ej: `#00E676`)
- **Default:** `'#00E676'` (verde)
- **Uso:** Color de botones, enlaces, y elementos de acento

## 🎨 Dónde Aparece en la UI

### BusinessForm.jsx
**Ubicación:** Después de la sección de imágenes, antes del mapa

**Sección:** "🎨 Tema y Apariencia"

**Layout:**
- Grid responsivo de 2 columnas (1 en móvil)
- Columna 1: Selector de tema
- Columna 2: Selector de color
- Vista previa full-width debajo

## 💻 Implementación Técnica

### Estado en formData
```javascript
const [formData, setFormData] = useState(() => {
    // ...
    return {
        // ...
        theme: 'dark', // 'light' | 'dark'
        primaryColor: '#00E676' // hex color
    };
});
```

### Selector de Tema
```jsx
<button
    type="button"
    onClick={() => setFormData({ ...formData, theme: 'light' })}
    style={{
        border: formData.theme === 'light' ? '2px solid var(--primary-paddle)' : '2px solid var(--border)',
        backgroundColor: formData.theme === 'light' ? 'var(--primary-paddle)10' : 'var(--bg-main)',
        // ...
    }}
>
    ☀️ Claro
</button>
```

### Selector de Color
```jsx
<input
    type="color"
    value={formData.primaryColor || '#00E676'}
    onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
/>

<input
    type="text"
    value={formData.primaryColor || '#00E676'}
    onChange={(e) => {
        const value = e.target.value;
        // Validación de hex color
        if (/^#[0-9A-Fa-f]{0,6}$/.test(value) || value === '') {
            setFormData({ ...formData, primaryColor: value });
        }
    }}
/>
```

### Vista Previa
```jsx
<div style={{
    backgroundColor: formData.theme === 'dark' ? '#0a0a0a' : '#ffffff',
    color: formData.theme === 'dark' ? '#ffffff' : '#000000'
}}>
    <button style={{
        backgroundColor: formData.primaryColor || '#00E676',
        boxShadow: `0 4px 12px ${formData.primaryColor}40`
    }}>
        Botón de Acción
    </button>
</div>
```

## 🔄 Cómo se Aplica en el Perfil Público

Al visitar un perfil de negocio (`/negocio/:slug`):

1. **BusinessProfile.jsx** lee `business.theme` y `business.primaryColor`
2. Aplica CSS variables dinámicamente:
   ```javascript
   const primaryColor = business.primaryColor || '#00E676';
   const theme = business.theme || 'dark';
   ```
3. Los botones y acentos usan `primaryColor`
4. El esquema de colores cambia según `theme`

## 📱 Experiencia de Usuario

### Al Crear un Negocio
1. Admin completa información básica
2. Sube imágenes
3. **Ve la sección "🎨 Tema y Apariencia"**
4. Selecciona tema (default: oscuro)
5. Selecciona color de botones (default: verde)
6. Ve preview en tiempo real
7. Guarda el negocio

### Al Editar un Negocio
1. Admin hace clic en "✏️ Editar" en el listado
2. Se abre formulario con valores guardados
3. Sección de tema muestra selección actual
4. Puede cambiar tema y color
5. Ve cambios en preview
6. Guarda cambios

## 🎯 Casos de Uso

### Ejemplo 1: Club Deportivo
- **Tema:** Oscuro 🌙
- **Color:** Verde vibrante `#00E676`
- **Resultado:** Look moderno, energético

### Ejemplo 2: Spa/Belleza
- **Tema:** Claro ☀️
- **Color:** Rosa suave `#E91E63`
- **Resultado:** Look relajante, elegante

### Ejemplo 3: Academia
- **Tema:** Claro ☀️
- **Color:** Azul profesional `#2196F3`
- **Resultado:** Look serio, confiable

## 🧪 Testing

### Casos de Prueba

**Test 1: Selección de Tema**
- Crear nuevo negocio
- Cambiar entre claro/oscuro
- Verificar que preview actualiza
- Guardar y verificar en perfil público

**Test 2: Selección de Color**
- Abrir formulario
- Probar cada color preset
- Probar color picker nativo
- Ingresar hex manual
- Verificar preview se actualiza

**Test 3: Validación**
- Intentar ingresar hex inválido (ej: `#GGGGGG`)
- Verificar que no se acepta
- Intentar hex con menos de 6 dígitos
- Verificar que acepta mientras escribe

**Test 4: Persistencia**
- Crear negocio con tema claro y color púrpura
- Guardar
- Editar nuevamente
- Verificar que mantiene configuración
- Visitar perfil público
- Verificar que aplica tema y color

## 🐛 Troubleshooting

### El color no se aplica en el perfil
**Causa:** campo `primaryColor` no guardado en BD  
**Solución:** Verificar que `handleSubmit` incluye `primaryColor`

### El tema no cambia visualmente
**Causa:** CSS no lee la variable del negocio  
**Solución:** Verificar que BusinessProfile aplica theme como CSS variable

### Preview no se actualiza
**Causa:** Estado no propagando  
**Solución:** Verificar que `setFormData` se llama correctamente

## 📊 Analytics/Métricas Sugeridas

Para futuro, podríamos trackear:
- Distribución de temas (% claro vs oscuro)
- Colores más usados
- Correlación entre categoría y color elegido
- Tasa de cambio de tema/color post-creación

## 🚀 Mejoras Futuras

1. **Más opciones de tema** - Tema automático según hora del día
2. **Gradientes** - Permitir gradientes en lugar de colores sólidos
3. **Paletas predefinidas** - Sets de colores coordinados por industria
4. **Preview más completo** - Mostrar mockup del perfil completo
5. **Control de  contraste** - Advertir si el color tiene bajo contraste con texto
6. **Color secundario** - Agregar segundo color de acento

---

**Fecha de implementación:** 2025-11-25  
**Tipo de feature:** UI Customization  
**Prioridad:** Media-Alta (mejora experiencia de marca)  
**Estado:** ✅ Implementado y Funcional
