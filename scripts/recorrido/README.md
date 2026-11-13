# Recorrido interactivo de un negocio

Arma `public/recorrido/<slug>/`, que queda publicado en `turnitoslr.com/recorrido/<slug>/`: una presentación que se toca paso a paso, con capturas y videos reales de la página del negocio, para mostrarle al dueño lo que TurnitosLR hace por él.

```bash
node scripts/recorrido/generar-recorrido.mjs <slug>
```

Necesita:
- `.env.local` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (lee el negocio de `businesses_public`).
- Playwright con Chromium. Si el proyecto no lo tiene instalado, usa el que haya dejado `npx` en la caché (`npx playwright@latest --version` una vez alcanza).
- `ffmpeg` en el PATH.

Tarda unos 2 minutos. Trabaja sobre la página publicada (`www.turnitoslr.com/<slug>`), así que el negocio tiene que estar cargado y con fotos.

## Qué hace

1. Mira el rubro: `sport` → canchas, `alquiler`/`venue` → alquiler, el resto → servicios.
2. Saca capturas a 390 px de ancho: link in bio, página completa (sin el pie), una destacada o foto de galería a pantalla completa y, si tiene tienda (no en alquileres), la tienda.
3. Ubica los recuadros leyendo los títulos de la página (Galería, Comodidades, Disponibilidad, Elegí una fecha, Nuestros Servicios, Información General, Opiniones…). No hay que medir nada a mano.
4. Graba el video de la reserva según el rubro y, si hay tienda, el de una compra. Graba con el screencast del navegador a 2x (780×1688) y lo arma con ffmpeg. Los toques se ven como un círculo verde.
   - Canchas: día, horario, cancha y duración, adicional, datos, seña.
   - Servicios: servicio, detalle, día, horario, adicional, datos, seña.
   - Alquiler: fecha, invitados, horas, hora de ingreso, adicionales, resumen, datos.
   **Nunca confirma la reserva:** frena en la pantalla de "Confirmar Reserva".
5. Escribe `index.html` sobre `plantilla.html` (la misma del recorrido de Sunny Nails) y copia la música y los logos de `recursos/`.

## Capítulos

1. Lo que ve el cliente (link, página, historias, destacadas o galería, tienda, horarios o calendario, videos, ubicación, comodidades, reseñas).
2. Lo que ganás vos (el aviso al celu y, si hay sesión del SuperAdmin, el video del panel).

## Video del panel

Para grabar cómo le llega la reserva al dueño hace falta, una sola vez por PC, guardar la sesión del SuperAdmin:

```bash
node scripts/recorrido/sesion-superadmin.mjs
```

Abre una ventana: Fernando entra al SuperAdmin y se cierra sola. La sesión queda en `%LOCALAPPDATA%\turnitos-recorrido\perfil-superadmin` (fuera del repo). Nadie escribe contraseñas en los scripts.

Con esa sesión, y **solo en negocios de simulación**, el generador:
- confirma la reserva del video (cliente "Laura Gómez", teléfono 3804123456);
- entra al panel con "Abrir Portal" del SuperAdmin y graba: reservas que esperan confirmación, datos y seña, y el WhatsApp con los mensajes listos;
- cancela la reserva de prueba al terminar.

Si algo falla y queda una reserva de prueba: `node scripts/recorrido/limpiar-reservas.mjs "<Nombre del negocio>"`.
Con `--sin-panel` se salta todo esto y la reserva frena antes de confirmar. En negocios reales siempre frena antes.

## Después

Abrilo con `npx serve public -l 5277` → `http://localhost:5277/recorrido/<slug>/`, revisalo en celu y compu, y subilo a `main` cuando Fernando dé el OK. Para cambiar textos de un paso, editá el bloque `const S=[...]` del `index.html` generado.
