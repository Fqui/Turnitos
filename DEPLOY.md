# 🚀 Guía de Despliegue en GitHub Pages

Este documento explica cómo desplegar la demo de la aplicación en GitHub Pages.

## 📋 Requisitos Previos

1. Tener una cuenta de GitHub
2. Tener Git instalado
3. Tener el proyecto inicializado con Git

## 🎯 Modo Demo

La aplicación detecta automáticamente si está corriendo en GitHub Pages y activa el **modo demo**, que:

- ✅ Usa datos de prueba del archivo `src/data/demoData.json`
- ✅ No requiere conexión a Supabase
- ✅ Permite hacer reservas (se almacenan en memoria, se borran al recargar)
- ❌ No permite operaciones de administración (crear/editar negocios)

## 📦 Pasos para Desplegar

### 1. Preparar el Repositorio

Primero, crea un repositorio en GitHub y conecta tu proyecto local:

```bash
# Si aún no has inicializado git
git init

# Añade el remote de tu repositorio
git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git

# Haz commit de tu código
git add .
git commit -m "Initial commit with demo mode"
git push -u origin main
```

### 2. Instalar gh-pages

```bash
npm install --save-dev gh-pages
```

### 3. Actualizar package.json

Agrega estos scripts a tu `package.json`:

```json
{
  "scripts": {
    "deploy": "vite build --base=/TU-REPOSITORIO/ && gh-pages -d dist",
    "predeploy": "npm run build"
  },
  "homepage": "https://TU-USUARIO.github.io/TU-REPOSITORIO"
}
```

**⚠️ IMPORTANTE:** Reemplaza `TU-REPOSITORIO` con el nombre exacto de tu repositorio en GitHub, y `TU-USUARIO` con tu usuario de GitHub.

Por ejemplo, si tu repo se llama `court-booking-demo`:
```json
{
  "scripts": {
    "deploy": "vite build --base=/court-booking-demo/ && gh-pages -d dist"
  },
  "homepage": "https://tu-usuario.github.io/court-booking-demo"
}
```

### 4. Desplegar

```bash
npm run deploy
```

Este comando:
1. Crea una build optimizada en la carpeta `dist`
2. Despliega el contenido en la rama `gh-pages` de tu repositorio

### 5. Activar GitHub Pages

1. Ve a tu repositorio en GitHub
2. Click en **Settings** > **Pages**
3. En **Source**, selecciona la rama `gh-pages`
4. En **Folder**, selecciona `/ (root)`
5. Click en **Save**

¡Listo! Tu demo estará disponible en: `https://TU-USUARIO.github.io/TU-REPOSITORIO/`

## 🔄 Actualizaciones

Para actualizar la demo después de hacer cambios:

```bash
git add .
git commit -m "Update demo"
git push origin main
npm run deploy
```

## 🎨 Personalizar Datos de Demo

Para modificar los negocios de muestra, edita el archivo:
```
src/data/demoData.json
```

Puedes agregar, quitar o modificar negocios. Cada negocio debe tener esta estructura:

```json
{
  "id": "unique-id",
  "name": "Nombre del Negocio",
  "category": "Categoría",
  "type": "court" o "service",
  "image": "URL de imagen",
  "location": "Dirección",
  "rating": 4.5,
  // ... más campos
}
```

## 🐛 Solución de Problemas

### La página muestra un 404

- Verifica que el `base` en `vite.config.js` coincida con el nombre de tu repositorio
- Asegúrate de que GitHub Pages esté configurado correctamente

### Las imágenes no cargan

- Usa URLs completas (https://...) para todas las imágenes
- No uses rutas relativas para imágenes en modo demo

### Los estilos se ven rotos

- Verifica que el `base` path sea correcto en la configuración
- Revisa la consola del navegador para errores 404

## 💡 Tips

1. **Usar un dominio personalizado:** Puedes configurar un dominio custom en Settings > Pages
2. **Analytics:** Agrega Google Analytics para ver el tráfico de tu demo
3. **SEO:** Optimiza el `index.html` con meta tags apropiados para mejor posicionamiento

## 🔗 Recursos

- [Documentación de GitHub Pages](https://docs.github.com/en/pages)
- [Documentación de Vite](https://vitejs.dev/guide/static-deploy.html#github-pages)
- [gh-pages package](https://www.npmjs.com/package/gh-pages)
