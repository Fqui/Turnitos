# Cómo forzar el rebuild del deploy en Vercel

## El problema

El bundle que Vercel está sirviendo NO incluye los cambios recientes:

- ❌ El bundle es `index-C1HgyjP2.js` (versión vieja)
- ❌ No tiene `AnimatePresence`, `motion.svg`, ni "Seleccionar categoría"
- ❌ El bundle local que compilo YO sí tiene todo, pero no se deploya

## Diagnóstico

Confirmé con curl que Vercel sigue sirviendo un bundle viejo.

## Pasos para forzar el redeploy

### Opción A — Desde la UI de Vercel (RECOMENDADO)

1. Andá a https://vercel.com/dashboard
2. Elegí el proyecto `turnitos` (o como se llame)
3. Click en la pestaña **"Deployments"**
4. Vas a ver la lista de deploys. El primero es el más reciente.
5. **Click en los 3 puntitos** (⋮) del último deploy → **"Redeploy"**
6. Confirmá

Esto fuerza a Vercel a tomar el último commit de la branch `main` y rebuildear.

### Opción B — Cancelar el último deploy y dejar que entre el nuevo

Si querés asegurarte de que entre el código nuevo:

1. **Deployments** → click en el último deploy (icono de "Building" o "Error")
2. **Cancel** el deploy actual
3. Vercel va a usar el commit más reciente de `main` (que sí tiene el código nuevo)

### Opción C — Forzar re-deploy tocando algo en el repo

1. Hacer un cambio trivial en `package.json` (ej: agregar un comentario)
2. Commit + push
3. Vercel detecta el push y rebuilda

## Verificar que funcionó

Una vez que hagas el redeploy:

1. **Esperá** a que el deploy diga "Ready" (tarda 1-3 min)
2. **Abrí** una ventana incognito en el browser
3. Andá a https://www.turnitoslr.com/admin/super
4. Login
5. Click "Crear Negocio"
6. Click en el campo "Categoría"

**Deberías ver**: dropdown custom con animación, íconos de colores en cada item, hover state.

**Si seguís viendo el dropdown nativo**:

1. Está cargando desde cache del Service Worker
2. En el browser, abrí DevTools (F12)
3. Application → Service Workers → click "Unregister"
4. O: Application → Storage → "Clear site data"
5. Refrescá
