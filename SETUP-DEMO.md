# 📝 Resumen: Implementación del Modo Demo para GitHub Pages

## ✅ Cambios Realizados

### 1. **Datos de Prueba**
- ✅ Creado `src/data/demoData.json` con 6 negocios de muestra variados
- Incluye: Pádel, Spa, Tenis, Barbería, Fútbol y Yoga
- Cada negocio tiene imágenes, servicios, horarios, ubicación, etc.

### 2. **Servicios Mock**
- ✅ Creado `src/services/mockService.js` - Simula Supabase con datos JSON
- ✅ Creado `src/services/serviceAdapter.js` - Cambia automáticamente entre Supabase y Mock
- Detección automática de GitHub Pages

### 3. **Actualización de Componentes**
- ✅ Actualizado `src/pages/Home.jsx` para usar serviceAdapter
- ✅ Actualizado `src/pages/BusinessProfile.jsx` para usar serviceAdapter
- Ahora funcionan en modo local CON Supabase y en GitHub Pages SIN Supabase

### 4. **Configuración de Vite**
- ✅ Actualizado `vite.config.js` con:
  - Base path configurable para GitHub Pages
  - Optimizaciones de build
  - Code splitting para mejor rendimiento

### 5. **Scripts y Documentación**
- ✅ Actualizado `package.json` con scripts de deploy
- ✅ Creado `DEPLOY.md` - Guía completa de despliegue
- ✅ Creado `README.demo.md` - README para visitantes de la demo
- ✅ Creado `deploy.ps1` - Script automatizado de deploy

## 🚀 Próximos Pasos para Desplegar

### Paso 1: Instalar gh-pages
```bash
npm install
```

### Paso 2: Configurar tu Repositorio en GitHub

1. **Crea un repositorio en GitHub** (ej: `court-booking-demo`)
2. **Conecta tu proyecto local:**
```bash
git init  # Si no está inicializado
git add .
git commit -m "Add demo mode for GitHub Pages"
git remote add origin https://github.com/TU-USUARIO/court-booking-demo.git
git push -u origin main
```

### Paso 3: Actualizar el Base Path

Edita `package.json` y reemplaza el script de deploy:

```json
"deploy": "vite build --base=/court-booking-demo/ && gh-pages -d dist"
```

**⚠️ Reemplaza `court-booking-demo` con el nombre EXACTO de tu repositorio**

### Paso 4: Desplegar

```bash
npm run deploy
```

### Paso 5: Activar GitHub Pages

1. Ve a tu repositorio en GitHub
2. **Settings** → **Pages**
3. **Source**: Selecciona rama `gh-pages`
4. **Folder**: `/ (root)`
5. Click **Save**

¡Tu demo estará en: `https://TU-USUARIO.github.io/TU-REPOSITORIO/`!

## 🎨 Personalizar la Demo

### Agregar/Modificar Negocios de Prueba

Edita `src/data/demoData.json` y agrega/modifica negocios siguiendo la estructura existente.

### Cambiar Imágenes

Usa URLs completas de servicios gratuitos:
- **Unsplash**: https://unsplash.com/
- **Pravatar**: https://i.pravatar.cc/ (avatares)
- **Cualquier CDN público**

### Modificar Branding

1. Actualiza `README.demo.md` con tu información
2. Cambia el título en `index.html`
3. Agrega tu logo/favicon

## 🧪 Probar Localmente en Modo Demo

Para probar el modo demo localmente sin subir a GitHub:

```bash
# Opción 1: Variable de entorno
$env:VITE_DEMO_MODE="true"
npm run dev

# Opción 2: Build de producción
npm run build
npm run preview
```

## 🔍 Verificar que Funciona

### Señales de que está en Modo Demo:
- ✅ En la consola del navegador verás: "🎭 Running in DEMO MODE"
- ✅ Cargan los 6 negocios de prueba
- ✅ Puedes hacer reservas pero se borran al recargar
- ✅ No aparecen errores de Supabase

### Señales de Modo Producción (Local):
- ✅ En la consola verás: "🔌 Running in PRODUCTION MODE"  
- ✅ Conecta a Supabase
- ✅ Carga negocios reales de la base de datos

## 🐛 Solución de Problemas Comunes

### Error 404 al abrir la demo
**Causa:** El base path no coincide con el nombre del repositorio  
**Solución:** Verifica que `--base=/TU-REPO/` sea exacto

### Las imágenes no cargan
**Causa:** Rutas relativas o imágenes locales  
**Solución:** Usa solo URLs completas (https://...) en demoData.json

### Los estilos se ven mal
**Causa:** Base path incorrecto  
**Solución:** Asegúrate que el build use el base correcto

### No detecta modo demo
**Causa:** El hostname no incluye "github.io"  
**Solución:** El modo demo se activa automáticamente en GitHub Pages

## 📊 Comparación: Demo vs Producción

| Característica | Demo (GitHub Pages) | Producción (Local/Server) |
|----------------|---------------------|---------------------------|
| Base de datos | ❌ JSON local | ✅ Supabase |
| Persistencia | ❌ Memoria | ✅ PostgreSQL |
| Crear negocios | ❌ | ✅ |
| Panel admin | ❌ | ✅ |
| Subir imágenes | ❌ | ✅ |
| Reservas | ✅ (temporal) | ✅ (persistente) |
| Ver negocios | ✅ | ✅ |
| Hacer reservas | ✅ | ✅ |
| Mapas | ✅ | ✅ |

## 💡 Tips Finales

1. **URL corta**: Usa un nombre de repo corto y descriptivo
2. **Custom domain**: Puedes configurar un dominio personalizado en Settings > Pages
3. **Analytics**: Agrega Google Analytics para ver visitantes
4. **SEO**: Optimiza meta tags en `index.html` para mejor posicionamiento
5. **README**: Usa `README.demo.md` como README principal en la rama gh-pages

## 📚 Recursos Adicionales

- [Guía completa de deploy](./DEPLOY.md)
- [Documentación Vite - Deploy](https://vitejs.dev/guide/static-deploy.html)
- [GitHub Pages Docs](https://docs.github.com/en/pages)

---

**¿Listo para desplegar? Ejecuta:**
```bash
npm run deploy
```
