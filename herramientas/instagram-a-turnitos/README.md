# Instagram → TurnitosLR (extensión de Chrome)

Con un perfil de Instagram abierto, junta en un clic los datos y las fotos del negocio y los descarga en un `.zip` para armar la demo en TurnitosLR. Todo pasa en tu navegador: no usa servidores ni APIs de terceros.

## Cargarla en Chrome

1. Bajala desde el panel de promotor (**Demo desde Instagram → Bajar extensión**) y descomprimí el .zip, o copiá la carpeta `herramientas/instagram-a-turnitos` del repo.
2. En Chrome abrí `chrome://extensions`.
3. Arriba a la derecha prendé **Modo de desarrollador**.
4. Tocá **Cargar sin empaquetar** y elegí la carpeta `herramientas/instagram-a-turnitos` (la que tiene `manifest.json`).
5. Fijala con el ícono del rompecabezas para tenerla a mano.

Si cambiás algún archivo, tocá el botón de recargar ↻ de la extensión en `chrome://extensions`.

## Usarla

1. Entrá a Instagram con tu sesión iniciada y abrí el perfil (`instagram.com/usuario`).
2. Bajá un poco para que carguen los posts que quieras incluir.
3. Abrí la extensión y tocá **Juntar y descargar .zip**. Con "Incluir fotos de destacadas" baja también las fotos de cada destacada (si no, solo la portada).
4. Se descarga `instagram-<usuario>.zip`. Subilo en **Demo desde Instagram** del panel de promotor para crear la demo.

## Qué trae el .zip

- `perfil.json`: nombre, usuario, bio, categoría, links, teléfonos, WhatsApp, email, nombres de archivo y `avisos` (lo que no se pudo leer o bajar). Incluye un bloque `negocio` con el formato de `scripts/negocios` para cargar la demo: le falta completar `rubro` y los servicios o canchas.
- `perfil.jpg`: foto de perfil en la mayor resolución disponible.
- `foto1.jpg`, `foto2.jpg`…: los posts, en el orden del perfil.
- `destacada1-<titulo>-1.jpg`…: las fotos de cada destacada.

## Cómo funciona y límites

- Lee el perfil con los mismos pedidos internos que usa la web de Instagram, desde tu pestaña y con tu sesión. Si fallan, usa lo que se ve en la página (la foto de perfil queda más chica, la bio puede venir incompleta en `texto_encabezado` y las destacadas solo traen la portada).
- Instagram cambia seguido su web: si algo deja de andar, revisá `avisos` en `perfil.json`.
- Usala de a un perfil por vez, para demos. Muchos perfiles seguidos pueden hacer que Instagram limite tu cuenta.
- Los videos se guardan como su imagen de portada.
