# Guía de Diseño y Recursos Gráficos 🎨

Esta guía detalla las especificaciones para las imágenes y banners utilizados en la aplicación Turnitos, asegurando que se vean perfectos tanto en móvil como en escritorio.

## 1. Banners de Promociones (Home)

El banner del Home tiene proporción fija: **3:1 en escritorio** y **3:2 en celular**. Hay dos tipos de banner y cada uno lleva una medida distinta.

### 🌐 Campaña General (sin negocio)
La imagen ocupa todo el banner y **se muestra completa, sin recortes**. Si la proporción no coincide (por ejemplo en celular), los costados se rellenan con una copia difuminada de la misma imagen.
*   **Proporción**: **3:1**.
*   **Resolución Recomendada**: `1500 x 500 px`.
*   **Texto**: se puede incluir, pero tiene que leerse bien en celular, donde el banner se ve más chico.

### 🏢 Promoción de un Negocio
La app agrega el título, el descuento y el nombre del negocio. La imagen **se recorta** para llenar su espacio: en escritorio ocupa la parte izquierda (aprox. 9:5) y en celular todo el banner (3:2).
*   **Proporción**: **3:2**.
*   **Resolución Recomendada**: `1200 x 800 px`.
*   **Sin Texto**: no agregues texto en la imagen, porque se puede cortar.
*   **Sujeto Centrado**: mantené lo importante en el centro.

### 📁 Formato
*   **WebP** (recomendado por rendimiento) o **JPG** (calidad alta, compresión 80-90%).
*   El formulario de promociones del SuperAdmin muestra una vista previa de cómo queda en compu y en celular.

---

## 2. Perfil del Negocio

Para que la página de tu negocio luzca profesional, usa estas medidas exactas.

### 🖼️ Imagen de Portada (Banner Superior)
Es la imagen ancha que aparece arriba de todo en el perfil.
*   **Proporción**: **4:1** o **3:1** (Muy panorámica).
*   **Resolución Recomendada**: `1600 x 400 px` o `1200 x 400 px`.
*   **Consejo**: Usa una foto del complejo entero, las canchas o el local desde lejos. **Evita primeros planos** porque se recortará arriba y abajo.
*   **Zona Segura**: Mantén lo importante justo en la franja central horizontal.

### 🆔 Logo del Negocio (Avatar)
Es la imagen circular pequeña.
*   **Proporción**: **1:1** (Cuadrada perfecta).
*   **Resolución Recomendada**: `512 x 512 px`.
*   **Resolución Mínima**: `256 x 256 px`.
*   **Consejo**: Asegúrate de que tu logo esté centrado y tenga un poco de margen ("aire") alrededor, ya que la aplicación lo recortará en forma de círculo automáticamente. Si el logo toca los bordes del cuadrado, al hacerse círculo se cortarán las esquinas.

---

## 3. Iconos de Categorías

Los iconos actuales son emojis o SVGs simples. Si decides usar iconos personalizados PNG/SVG:
*   **Tamaño**: 512x512 px (cuadrado).
*   **Fondo**: Transparente.
*   **Estilo**: Minimalista, líneas gruesas o colores planos.
