# Landing VIP para casinos

Esta aplicación es una landing page moderna orientada a promocionar un acceso VIP para distintos casinos, con un llamado principal a WhatsApp y una experiencia visual adaptable según el casino activo.

## Funcionalidades

- Landing principal con diseño visual atractivo y contenido promocional.
- Botón de WhatsApp para contactar de forma directa con el soporte.
- Cambio dinámico de branding, incluyendo logo y mascota según el casino seleccionado.
- Página de configuración para activar o desactivar casinos desde una interfaz sencilla.
- Persistencia de la configuración mediante localStorage.
- Sincronización remota de la configuración con Firebase Firestore.
- Diseño responsive para visualizarse correctamente en distintos dispositivos.

## Tecnologías utilizadas

- HTML5 para la estructura de la landing y la página de configuración.
- CSS3 para el diseño, estilos visuales y experiencia de usuario.
- JavaScript moderno con módulos ES para la lógica de la app.
- Firebase App y Firestore para la configuración remota.
- Vercel para el despliegue de la aplicación.

## Estructura del proyecto

- [index.html](index.html): página principal de la landing.
- [settings.html](settings.html): pantalla de configuración de casinos y branding.
- [css/style.css](css/style.css): estilos generales de la interfaz.
- [js/main.js](js/main.js): lógica principal, temas, almacenamiento y acciones de la app.
- [js/firebase.js](js/firebase.js): inicialización de Firebase.
- [vercel.json](vercel.json): configuración de despliegue en Vercel.

## Cómo ejecutar localmente

1. Abre la carpeta del proyecto en tu editor.
2. Levanta un servidor local simple, por ejemplo con Live Server o con el comando:
   ```bash
   npx serve .
   ```
3. Accede a la URL que te proporcione el servidor para ver la landing.

## Notas

La app está pensada para ser usada como una herramienta de captura y promoción, con contenido adaptable según el casino que se active en la configuración.
