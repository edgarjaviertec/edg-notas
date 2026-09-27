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

Esos valores son públicos por diseño; no son secretos. Lo que protege los
datos son las reglas del paso 5.

## 3. Activar Authentication con correo y contraseña

1. **Authentication > Sign-in method:** activar **Email/Password**
   (solo la primera opción, sin "Email link").
2. **Authentication > Users > Add user:** crear el único usuario, con el
   correo personal y una contraseña larga (varias palabras al azar).
3. Copiar el **UID** del usuario creado; se usa en el paso 5.
4. Opcional: **Authentication > Settings > User actions:** desactivar la
   creación de cuentas nuevas, para que nadie pueda registrarse.

## 4. Crear la base de Firestore

1. **Firestore Database > Create database**.
2. Elegir la región con cuidado: **no se puede cambiar después**. Para
   México conviene una de Estados Unidos (por ejemplo `nam5` o
   `us-central1`).
3. Arrancar en **modo producción**, nunca en "modo de prueba" (deja la base
   abierta a cualquiera).

## 5. Pegar las reglas de seguridad

1. Abrir `reglas-firestore.rules` de este repo.
2. Reemplazar `UID_DEL_DUENO` por el UID del paso 3.
3. Pegar el contenido en **Firestore Database > Rules** y publicar.

No se permite `delete` a propósito: la app nunca borra documentos, usa
borrado suave (`eliminada: true`).

## 6. Comprobar

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
