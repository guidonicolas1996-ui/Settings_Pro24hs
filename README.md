# Casino VIP Landing

Esta aplicación funciona como una landing promocional premium para casinos, pensada para convertir visitas en contacto directo por WhatsApp. Combina una experiencia visual dinámica, gestión de branding por plataforma, autenticación administrativa y analytics en tiempo real.

## Qué hace la app

- Muestra una landing pública con hero section, banner promocional, carousel de mascotas/logos y botón de WhatsApp.
- Permite alternar branding entre múltiples casinos activos, cambiando colores, mascota, logo y textos promocionales.
- Ofrece un panel de administración para crear, editar, activar o eliminar plataformas y actualizar el contenido visible.
- Registra visitas y clics de WhatsApp para medir rendimiento por fuente y por campaña.
- Mantiene la configuración remota sincronizada con Firebase, con respaldo local para funcionamiento offline o en entornos simples.

## Flujo principal

1. El visitante entra a la landing pública.
2. La app selecciona el casino o conjunto de casinos activos, aplica el tema visual correspondiente y muestra el branding dinámico.
3. El botón de WhatsApp queda listo para abrir la conversación directa con el equipo comercial.
4. Desde el panel de administración se pueden modificar textos, activar plataformas y gestionar logos/mascotas.
5. Las métricas quedan registradas para revisar tráfico, interacciones y performance en el dashboard de analytics.

## Funcionalidades destacadas

- Landing responsive con diseño premium y contenido adaptable.
- Rotación automática de temas entre casinos activos.
- Carousel de mascotas y logos con transición visual controlada.
- Gestión dinámica de casinos desde una interfaz sencilla.
- Autenticación administrativa con Firebase Auth.
- Analytics con métricas de visitas, clics y detalle por fuente/links.
- Persistencia remota en Firestore y fallback local mediante localStorage.

## Stack tecnológico

- HTML5 para las páginas públicas y administrativas.
- CSS modular para separar estilos por secciones y componentes.
- JavaScript ES modules para la lógica de la app.
- Firebase Auth para acceso administrativo.
- Firebase Firestore para persistir configuración, textos y analytics.
- Cloudinary para subir y servir imágenes de logos y mascotas.
- Vercel para el despliegue estático.

## Estructura del proyecto

- [index.html](index.html): landing pública principal.
- [settings.html](settings.html): panel de administración para branding, textos y plataformas.
- [analytics.html](analytics.html): dashboard de métricas y filtros.
- [login.html](login.html): pantalla de acceso administrativo.
- [css/styles.css](css/styles.css): entrypoint de estilos modularizados.
- [css/style.css](css/style.css): copia del stylesheet original como referencia.
- [css/styles](css/styles): carpeta con los archivos CSS separados por responsabilidad.
- [js/main.js](js/main.js): lógica central de la landing, temas, carousels, analytics, Firebase y configuración dinámica.
- [js/settings.js](js/settings.js): administración de casinos y formularios del panel.
- [js/analytics.js](js/analytics.js): render y lógica del dashboard de analytics.
- [js/auth.js](js/auth.js): manejo de sesión y guardas de autenticación.
- [js/firebase.js](js/firebase.js): inicialización de Firebase.
- [img](img): assets estáticos como logos, mascotas y fondos.
- [vercel.json](vercel.json): configuración de despliegue en Vercel.

## Cómo funciona la configuración dinámica

La app no depende de un solo tema fijo. En su corazón, la lógica carga un conjunto de casinos desde Firestore o desde un fallback local, y luego:

- marca cuáles están activos,
- ordena su presentación,
- aplica su color principal,
- reemplaza logo y mascota en la landing,
- actualiza textos promocionales y CTA.

Todo eso se gestiona desde la sesión de administración y queda disponible para la landing en tiempo real.

## Autenticación y seguridad

El acceso al panel de administración está protegido con Firebase Auth. La sesión se guarda en el almacenamiento del navegador y se valida antes de permitir acceso a las páginas sensibles como configuración y analytics.

## Analytics

La landing registra eventos de:

- visita inicial,
- visitas por fuente o link alternativo,
- clics de WhatsApp,
- métricas agregadas por horario, día o período.

Los datos se almacenan en Firestore para poder visualizar tendencias y analizar la performance de cada campaña o canal.

## Desarrollo local

No requiere build step. Lo ideal es servir la carpeta desde un servidor local para evitar problemas con módulos y fetches de Firebase.

Opciones recomendadas:

1. Usar XAMPP y abrir la carpeta en el servidor web local.
2. O ejecutar un servidor estático simple, por ejemplo:

```bash
npx serve .
```

Luego abrir la URL que entregue el servidor. Para probar la administración, acceder a [login.html](login.html) y usar las credenciales configuradas en Firebase.

## Despliegue

El proyecto está preparado para desplegarse en Vercel. El archivo [vercel.json](vercel.json) define la configuración necesaria para servir el sitio estático correctamente.

## Configuración recomendada

Si vas a usar una instancia propia de Firebase o Cloudinary, revisa los valores de configuración en [js/firebase.js](js/firebase.js) y [js/main.js](js/main.js) y actualízalos con tus propias credenciales.

## Resumen

Esta app es una solución completa para lanzar campañas VIP de casinos con una experiencia visual atractiva, administración simple y métricas útiles, todo desde una base estática con backend remoto en Firebase.
