# Configurar Firebase

Pasos para crear el backend del modo personal. Solo se hacen una vez.

## 1. Crear el proyecto

1. Entrar a https://console.firebase.google.com y crear un proyecto nuevo.
2. Google Analytics: desactivado (no hace falta).
3. El proyecto queda en el plan **Spark** (gratis). No agregar tarjeta.
   Si en algún paso aparece "Actualizar a Blaze" o "Agregar facturación",
   se está activando algo que no necesitamos: cancelar.

## 2. Registrar la app web

1. En la página del proyecto: agregar app, tipo **Web**.
2. No activar Firebase Hosting (la app vive en Netlify).
3. Copiar el objeto de configuración (`apiKey`, `authDomain`, `projectId`,
   `appId`, etc.) a `js/configuracion.js`.

Esos valores son públicos por diseño; no son secretos. Cualquiera puede
copiarlos del código de la página, y eso está bien: lo que protege los datos
son las reglas del paso 5. El paso 6 limita el único abuso posible (gastar
la cuota con peticiones falsas).

## 3. Activar Authentication con correo y contraseña

1. **Authentication > Sign-in method:** activar **Email/Password**
   (solo la primera opción, sin "Email link").
2. **Authentication > Users > Add user:** crear el único usuario, con el
   correo personal y una contraseña larga (varias palabras al azar).
3. Copiar el **UID** del usuario creado; se usa en el paso 5.
4. **Authentication > Settings > User actions:** desactivar la creación de
   cuentas nuevas. Sin esto, cualquiera con la `apiKey` puede registrarse;
   no vería ninguna nota (las reglas lo rechazan), pero no hay razón para
   permitirlo.

## 4. Crear la base de Firestore

1. **Firestore Database > Create database**.
2. Elegir la región con cuidado: **no se puede cambiar después**. Para
   México conviene una de Estados Unidos (por ejemplo `nam5` o
   `us-central1`).
3. Arrancar en **modo producción**, nunca en "modo de prueba" (deja la base
   abierta a cualquiera).

## 5. Pegar las reglas de seguridad

1. Abrir `reglas-firestore.rules` de este repo. Ya tiene el UID del usuario
   del paso 3; si alguna vez se borra y se vuelve a crear ese usuario, el UID
   cambia y hay que actualizarlo aquí.
2. Pegar el contenido en **Firestore Database > Rules** y publicar.

No se permite `delete` a propósito: la app nunca borra documentos, usa
borrado suave (`eliminada: true`).

## 6. Restringir la apiKey

En https://console.cloud.google.com, con el mismo proyecto seleccionado:
**APIs y servicios > Credenciales**, abrir la clave del navegador que creó
Firebase ("Browser key").

1. **Restricciones de aplicación:** "Sitios web", y agregar solo:
   - el dominio de Netlify (por ejemplo `https://edg-notas.netlify.app/*`)
   - `http://localhost:8000/*` para desarrollo local
2. **Restricciones de API:** "Restringir clave", y marcar solo:
   - Identity Toolkit API (el login)
   - Token Service API (mantener la sesión)
   - Cloud Firestore API
3. Guardar. Los cambios tardan unos minutos en aplicarse.

La restricción por sitio web se puede falsificar desde fuera de un
navegador: frena el abuso casual, pero la seguridad real siguen siendo las
reglas del paso 5.

**No activar otras APIs de Google en este proyecto** (Gemini, Maps, etc.).
Si algún día se necesitan, crearlas en un proyecto aparte: esas sí pueden
tener costo y no deben compartir clave con una app pública.

## 7. Comprobar

- Abrir la app en Netlify, entrar por `entrar.html` con el correo y la
  contraseña, escribir una nota y verla aparecer en
  **Firestore Database > Data**, colección `notas`.
- Abrir la app en una ventana privada sin iniciar sesión: debe entrar en
  modo demo y no ver ninguna nota personal.

## Límites del plan gratis a vigilar

Revisar en **Usage** de vez en cuando. Los que importan son las lecturas
diarias de Firestore; la app las mantiene bajas pidiendo solo lo que cambió
desde la última sincronización y leyendo el resto de la caché local. Si se
pasa el límite, Firestore deja de responder hasta el día siguiente, pero
nunca cobra (no hay tarjeta).
