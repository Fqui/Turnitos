# Flujo de Trabajo (Workflow) con Vercel

Este proyecto utiliza un flujo de trabajo basado en **Feature Branches** para asegurar que la versión en producción (`main`) siempre sea estable.

## 1. Regla de Oro
🚫 **NUNCA** hacer commit directo a la rama `main`.
✅ Siempre trabajar en una rama nueva.

## 2. Pasos para una Nueva Funcionalidad

### Paso 1: Crear Rama
Desde la terminal, crea una rama con un nombre descriptivo:
```bash
git checkout -b nombre-de-la-feature
# Ejemplos:
# git checkout -b mejorar-login
# git checkout -b arreglar-colores
```

### Paso 2: Trabajar
Hacemos los cambios en el código normalmente.

### Paso 3: Guardar y Subir
```bash
git add .
git commit -m "descripción de lo que hiciste"
git push origin nombre-de-la-feature
```

### Paso 4: Vercel Preview (Automático)
Vercel detectará la nueva rama y te dará un link único (ej: `turnitos-git-mejorar-login.vercel.app`).
- Usa este link para probar los cambios en el celular o compartirlo.
- La web oficial (`turnitoslr.com`) **NO** cambia todavía.

### Paso 5: Publicar (Merge)
Si todo está perfecto en la Preview:
1. Ir a GitHub.
2. Crear un **Pull Request** (PR) de tu rama hacia `main`.
3. Darle a **Merge**.
4. Vercel actualizará automáticamente `turnitoslr.com`.

### Paso 6: Volver a empezar
Vuelve a tu rama base y actualízala:
```bash
git checkout main
git pull origin main
```
