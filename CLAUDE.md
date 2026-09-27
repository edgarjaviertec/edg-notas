# EdgNotas (webapp)

App de notas diarias para escritorio y móvil, en HTML, CSS y JS puro, alojada
en Netlify. Minimalista, guardado automático, controlada por teclado en
escritorio y por toques en móvil. Es la migración de la app de escritorio en
Python/PySide6, que vive en `legacy/` solo como referencia (no se mantiene ni
se versiona).

## Filosofía

- **KISS extremo.** El código debe poder leerlo y mantenerlo una sola persona.
- **KISS está por encima de DRY.** Solo se extrae código repetido si la
  función resultante tiene un nombre claro y el resultado se lee mejor. Si
  para reutilizar hay que agregar parámetros o condiciones, mejor dejarlo
  repetido.
- **La legibilidad está por encima de la abstracción.** Ante la duda, la
  opción más obvia.
- Nada de trucos: sin ternarios anidados, sin one-liners ingeniosos, sin
  metaprogramación.

## Idioma y nombres

- Todo el código en **español estricto**: archivos, carpetas, funciones,
  variables, constantes, clases CSS, ids HTML, campos de Firestore y de
  IndexedDB.
- **Sin tildes ni ñ** en código y nombres de archivo (`pestana`, `anio`,
  `contrasena`). El texto visible para el usuario y los comentarios sí las
  llevan.
- **Nunca variables de una letra**, tampoco en bucles. Nada de abreviaturas
  inventadas. Abreviaturas permitidas: `id`, `url`, `zip`, `md`, `uid`.
- Excepciones inevitables: palabras del lenguaje, APIs del navegador, APIs de
  librerías (`CodeMirror.EditorView`, `Firebase.getAuth`), clases `.cm-*` de
  CodeMirror y archivos de nombre fijo (`index.html`, `_redirects`,
  `README.md`, `CLAUDE.md`, `.gitignore`).

| Elemento | Formato | Ejemplo |
|---|---|---|
| Archivos y carpetas | kebab-case | `almacen-local.js` |
| Funciones | camelCase, verbo en infinitivo | `pintarListaHoy()` |
| Variables | camelCase, sustantivo | `notasDelDia` |
| Booleanos | prefijo `es`, `esta`, `tiene` | `estaSincronizado` |
| Constantes | MAYUSCULAS_CON_GUION_BAJO | `ESPERA_AUTOGUARDADO_MS` |
| Clases CSS e ids | kebab-case | `barra-inferior`, `lista-hoy` |
| Valores de texto internos | kebab-case | `"modo-demo"` |

Glosario (usar siempre la misma palabra): `nota`, `dia`, `semana`,
`historial`, `editor`, `pestana`, `lista`, `buscador`, `almacen`,
`sincronizacion`, `autoguardado`, `respaldo`, `modo-demo`, `modo-personal`,
`barra-lateral`, `barra-inferior`, `barra-estado`.

## Estilo de código

- Punto y coma siempre, comillas dobles, indentación de 4 espacios (JS, CSS y
  HTML).
- Sin JSDoc. Solo un comentario `//` breve encima de lo que lo necesite,
  explicando **el porqué**, no el qué.
- Sin números mágicos: constantes con nombre.
- Salir temprano (`if (...) return;`) en vez de anidar condiciones.
- Bucles `for...of` legibles antes que cadenas de `reduce/map/filter`.
- **Emojis:** solo como iconos de interfaz en la v1, todos definidos en la
  constante `ICONOS` de `configuracion.js` (en la v2 se cambian por SVG
  tocando solo ese lugar). Se muestran envueltos en
  `<span aria-hidden="true">` junto a un texto. Nunca emojis en código fuera
  de `ICONOS`, comentarios, pruebas ni commits.

## JavaScript

- Sin frameworks, sin build, sin npm, sin `package.json`.
- **Scripts clásicos**, sin `import`/`export`. Se cargan con `<script>` al
  final del `<body>` en orden de dependencia; `aplicacion.js` siempre al
  final.
- Todo es global: los nombres deben ser únicos y descriptivos.
- Funciones y objetos planos en vez de clases. Sin clases de error propias:
  `throw new Error("mensaje")`.
- El estado de la app vive en un solo objeto dentro de `aplicacion.js`. Los
  eventos cambian el estado y llaman a la función `pintar...()` de la sección
  afectada; nunca tocan el DOM de otra sección directamente.
- Las listas se repintan completas con `replaceChildren()` y `<template>`.
  **El editor nunca se reconstruye**: se crea una vez y solo se cambia su
  contenido al abrir otra nota (si no, se pierden cursor y scroll).
- Fechas: construir `YYYY-MM-DD` con `getFullYear()`, `getMonth()` y
  `getDate()`. **Nunca `toISOString()`**, que da la fecha en UTC.
- Navegadores: Safari iOS 16+ y las dos últimas versiones de Chrome, Edge,
  Firefox y Safari Mac. Sin polyfills. Lo más nuevo (View Transitions) se usa
  solo si existe: `if (document.startViewTransition)`.

## CSS

- Estilos propios, **sin framework CSS**. Fuente del sistema (`system-ui`,
  `ui-monospace`), Flexbox, modo oscuro con `prefers-color-scheme`,
  mobile-first con un solo `@media (min-width: 768px)` para escritorio.
- **ITCSS, sin BEM**, en un solo archivo `css/estilos.css` con seis secciones
  en este orden, cada una con su título en comentario: CONFIGURACION,
  GENERICOS, ELEMENTOS, OBJETOS, COMPONENTES, UTILIDADES.
- Colores y medidas solo como variables en CONFIGURACION.
- Clases sin prefijo de capa y con nombres descriptivos: `.barra-inferior`,
  `.barra-inferior-boton`.
- Estados como clase aparte con `esta-` o `tiene-`:
  `.barra-inferior-boton.esta-activo`. Si existe un atributo nativo
  (`hidden`, `aria-current`, `aria-selected`), se usa ese.
- **Los ids son solo para JS**; el CSS solo usa clases.
- Sin anidamiento CSS, selectores de máximo dos niveles, `!important` solo en
  UTILIDADES.
- **Tema de CodeMirror:** se define en `editor.js` con
  `CodeMirror.EditorView.theme()`, usando solo `var(--...)` de CONFIGURACION.
  No se estilan las clases `.cm-*` desde `estilos.css` (los estilos que
  inyecta CodeMirror ganan en especificidad y obligarían a usar
  `!important`).

## Librerías externas

Viven en `js/externos/`, empaquetadas como scripts clásicos con un global.
**No se editan a mano.** Se generaron una sola vez con npm y esbuild **fuera
del repo** (el proyecto sigue sin npm). Cada archivo lleva en su cabecera las
versiones y la licencia; los avisos de licencia deben conservarse.

| Archivo | Global | Contenido |
|---|---|---|
| `codemirror.js` | `CodeMirror` | `@codemirror/view` 6.43.13, `state` 6.7.6, `commands` 6.11.1 |
| `firebase.js` | `Firebase` | `firebase` 12.19.0, solo Auth (correo y contraseña) y Firestore |
| `fflate.js` | `fflate` | `fflate` 0.8.3, build UMD oficial sin cambios (solo se le agregó el banner), para generar el zip de respaldo |

Ojo: `codemirror@6` en npm apunta por error a la 6.65.7, que en realidad es
CodeMirror 5. El CodeMirror 6 real se instala por paquetes (`@codemirror/*`).

Para regenerar (en una carpeta temporal, nunca dentro del repo):

```sh
npm install @codemirror/view @codemirror/state @codemirror/commands firebase esbuild
npx esbuild entrada.js --bundle --minify --format=iife --global-name=CodeMirror --target=safari16 --outfile=js/externos/codemirror.js
npx esbuild entrada-firebase.js --bundle --minify --format=iife --global-name=Firebase --target=safari16 --legal-comments=eof --outfile=js/externos/firebase.js
```

`entrada.js`:

```js
export { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, placeholder } from "@codemirror/view";
export { EditorState, Compartment } from "@codemirror/state";
export { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
```

`entrada-firebase.js`:

```js
export { initializeApp } from "firebase/app";
export { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
export { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, terminate, clearIndexedDbPersistence, waitForPendingWrites, collection, doc, getDoc, getDocs, getDocFromCache, getDocsFromCache, setDoc, updateDoc, query, where, orderBy, serverTimestamp, Timestamp } from "firebase/firestore";
```

`fflate.js` no se empaqueta: se descarga tal cual de
`https://cdn.jsdelivr.net/npm/fflate@<version>/umd/index.js`.

Al regenerar, conservar el banner con versiones y licencia (`--banner:js=...`).
CodeMirror no trae comentarios de licencia propios: su copyright MIT va en el
banner.

## Arquitectura de datos

### Dos modos, dos almacenes

- **Modo demo** (visitantes sin sesión): `almacenLocal`, sobre IndexedDB. Es
  desechable: al primer ingreso se siembran notas de ejemplo, hay un
  "Reiniciar demo", y la barra de estado avisa que las notas viven solo en
  ese navegador y pueden borrarse. **Nunca toca Firebase** (ni lo descarga) y
  sus notas **nunca se migran** al modo personal.
- **Modo personal** (el dueño, un solo usuario): `almacenRemoto`, sobre
  Firestore con caché offline (`persistentLocalCache` +
  `persistentMultipleTabManager`). `sesion.js` carga `js/externos/firebase.js`
  bajo demanda, insertando su `<script>`, solo en este modo.
- Los dos almacenes son objetos planos con **las mismas funciones**, todas
  asíncronas:
  - `listarNotas()`: todas, incluidas las eliminadas.
  - `leerNota(id)`: la nota o `null`.
  - `guardarNota(id, contenido)`
  - `eliminarNota(id)`
  - `restaurarNota(id, contenido)`

  Cada nota es `{ id, contenido, eliminada, actualizadaEn }`, con
  `actualizadaEn` en milisegundos en los dos almacenes. El almacén se elige en un solo lugar al arrancar; el resto de la app no
  sabe cuál usa. Si una implementación necesita algo que la otra no tiene, es
  señal de que la interfaz se está rompiendo: revisarlo antes de agregar.
- Si no hay red al arrancar, se usa el último modo guardado en `localStorage`
  (no se cae al modo demo por error).

### Login

- Firebase Authentication con **correo y contraseña**, un solo usuario creado
  a mano en la consola. Sin Google Auth, sin variables de entorno, sin Netlify
  Functions.
- `entrar.html` es un formulario que llama a `signInWithEmailAndPassword`.
  `_redirects` hace que `/login` sirva `entrar.html`.
- La seguridad está en las reglas de Firestore (`reglas-firestore.rules`),
  cerradas al UID del dueño y sin permiso de `delete`. La configuración de
  Firebase en el JS es pública por diseño.
- Pasos para crear el proyecto: `configurar-firebase.md`.
- El modo se decide sin descargar Firebase: `localStorage` guarda
  `modo-personal` al entrar. Sin esa marca es demo; con ella se carga
  Firebase y, si la sesión ya no existe, se borra la marca y se va a
  `entrar.html`.
- Cerrar sesión espera a que se suban los cambios pendientes y borra la copia
  local de Firestore (en una computadora ajena no debe quedar nada). Sin
  conexión no se permite cerrar sesión, porque esos cambios se perderían.

### Notas

- Varias notas por día. Cada nota se identifica por su fecha y hora de
  creación: id `YYYY-MM-DD_HH-MM-SS` (el mismo en IndexedDB y en Firestore).
- La ruta estilo archivo (`2026/09 - Septiembre/2026-09-27/2026-09-27_15-13-00.md`)
  **se deriva del id** en `notas.js`; se usa para el historial y el respaldo.
  No se usa como id porque Firestore no admite `/` en los ids de documento.
- Campos: `contenido`, `actualizadaEn` (Firestore: `serverTimestamp()`),
  `eliminada` (booleano).
- **Borrado suave:** eliminar es `eliminada: true` con `contenido` vacío.
  Como el contenido se vacía, la interfaz lo conserva en memoria mientras se
  ve el aviso, y "Deshacer" llama a `restaurarNota(id, contenido)`. Nunca
  `deleteDoc`. Las listas y el buscador filtran las eliminadas.
- Una nota nueva **no se guarda hasta que tiene contenido** (no se acumulan
  notas vacías). Mientras tanto es un borrador: id temporal `borrador-N`,
  título "Sin título", y recibe su id real (con la hora del primer carácter)
  al escribir. Si a una nota guardada se le borra todo el texto, se elimina
  (borrado suave, sin aviso de "Deshacer") y vuelve a ser borrador, como en
  la app de Python.

### Lecturas de Firestore (cuota del plan gratis)

- Nunca escuchar la colección completa.
- Al abrir o volver a la app: pedir solo
  `where("actualizadaEn", ">", ultimaSincronizacion)`; `ultimaSincronizacion`
  se guarda en `localStorage` en cada dispositivo.
- Todo lo demás (listas, abrir notas viejas, búsqueda) sale de la caché local
  con `getDocsFromCache()` / `getDocFromCache()`.

### Guardado

- Autoguardado con espera de 2 s sin teclear y un techo máximo de escritura
  forzada aunque no se deje de teclear.
- Guardar también en `visibilitychange` (al pasar a `hidden`) y en
  `pagehide`: en móvil el sistema cierra pestañas sin avisar.
- En Firestore, `guardarNota` **no espera la confirmación del servidor**: sin
  conexión nunca llegaría y la app se quedaría esperando. La escritura queda
  en la caché local y se sube al volver la conexión; si el servidor la
  rechaza, se avisa en la barra de estado.
- En el modo personal, al volver a la app (`focus`, `visibilitychange`) se
  piden los cambios de otros dispositivos, como mucho una vez por minuto.
- Un fallo de guardado **nunca rompe la app ni muestra un diálogo**: se
  refleja en la barra de estado y se registra con `console.error`.
- Conflictos: si la misma nota se edita offline en dos dispositivos, gana la
  última escritura. Riesgo aceptado para un solo usuario.
- Cambio de día: no hay timer de medianoche (los navegadores congelan timers
  en segundo plano). Se revisa si cambió el día en `visibilitychange` y
  `focus`. Sin notas retroactivas para días saltados.

### Respaldo

Exportar a `.zip` con la estructura de carpetas derivada de las rutas
(`respaldo.js`, con `fflate.zipSync`). Disponible en los dos modos. No existe
"borrar lo exportado".

## Interfaz

Un solo DOM para escritorio y móvil. El layout lo decide CSS con el
`@media`; el comportamiento que cambia lo decide el atributo
`body[data-modo="escritorio" | "movil"]`, que JS actualiza escuchando `change`
de `matchMedia`. El breakpoint vive en dos lugares que deben coincidir: la
constante `ANCHO_ESCRITORIO` (768) en `configuracion.js` y el `@media` de
`estilos.css`.

### Móvil

- Barra inferior con tres pestañas: **Hoy**, **Semana**, **Historial**. La
  app abre en Hoy. Respeta `env(safe-area-inset-bottom)`.
- Las tres usan el mismo patrón: lista, se toca una nota, el editor se abre
  encima, `‹` para volver. Cada fila muestra la hora y la primera línea.
- Hoy: botón `+` que crea una nota y abre el editor. Sin notas: mensaje
  "Todavía no hay notas hoy" y botón "Empezar a escribir".
- Historial: años y meses colapsables, siempre arrancan cerrados.
- Arriba de cada lista, una barra de búsqueda; al tocarla se abre el buscador
  a pantalla completa con `‹` para salir.
- Eliminar: deslizar la fila a la izquierda. Sin confirmación: aviso
  "Nota HH:MM eliminada · Deshacer" durante unos segundos.
- Con el editor enfocado (teclado abierto) se oculta la barra inferior.
- Sin números de línea en el editor (se apagan con un `Compartment` según
  `data-modo`).

### Escritorio

- Barra lateral con "ESTA SEMANA" (colapsable; solo hoy y ayer llevan
  etiqueta `[Hoy]`, `[Ayer]`) e "HISTORIAL" (siempre arranca colapsado). Sin
  buscador en la barra lateral.
- Pestañas de notas abiertas, editor con números de línea, barra de estado.
- Cerrar la última pestaña reabre la nota de hoy: nunca queda sin pestañas.
- Reabrir pestañas cerradas con una pila LIFO.
- Buscador de texto completo en una ventana. No hay búsqueda dentro de la
  nota actual en la v1.

### Atajos (escritorio)

Todos con `Alt` (`Option` en Mac), porque el navegador no deja capturar
`Cmd+W`, `Cmd+T`, `Cmd+N` ni `Cmd+Shift+T`.

| Atajo | Acción |
|---|---|
| `Alt+N` | Nueva nota |
| `Alt+W` | Cerrar pestaña |
| `Alt+Shift+T` | Reabrir la última pestaña cerrada |
| `Alt+Shift+F` | Buscar en el texto de todas las notas |

- Detectar con `event.code` (`"KeyW"`), no con `event.key`: en Mac
  `Option+W` produce `"∑"`. Llamar a `preventDefault()`.
- No usar `Alt+F` ni `Alt+E` sin Shift: en Chrome para Windows abren el menú
  del navegador.
- El zoom lo maneja el navegador.

### Sin parpadeos

- Tema claro/oscuro solo con variables CSS y `prefers-color-scheme`.
- Pintar primero lo que hay en caché y actualizar después.
- Fuentes del sistema (no hay fuentes web).
- Transiciones entre lista y editor con `document.startViewTransition()`
  cuando exista.

## PWA

- `manifiesto.webmanifest` + `trabajador-servicio.js` en la raíz.
- Estrategia "stale-while-revalidate": responde con la caché al instante y
  pide la versión nueva a la red para la siguiente visita. Un cambio
  publicado llega en la segunda carga, sin tocar nada del service worker.
- `ARCHIVOS_APP` se precarga al instalar. **Al agregar o quitar un archivo de
  la app hay que actualizar esa lista**: si incluye uno que no existe, la
  instalación falla entera. `firebase.js` queda fuera a propósito (la demo
  nunca lo descarga); se guarda en caché la primera vez que se pide.
- `VERSION_CACHE` solo se sube para borrar la caché vieja completa (por
  ejemplo, al quitar archivos).
- Iconos: `iconos/icono.svg` es el original; los PNG (180, 192, 512, sin
  transparencia para iOS) se generan a partir de él.
- En iPhone, instalada en la pantalla de inicio, queda exenta del borrado de
  datos a los 7 días de Safari.

## Estructura

```
index.html                  # la app (escritorio y móvil)
entrar.html                 # login con correo y contraseña
pruebas.html                # pruebas de lógica pura en el navegador
manifiesto.webmanifest
trabajador-servicio.js
_redirects                  # /login -> /entrar.html
reglas-firestore.rules      # copia de las reglas publicadas en Firebase
configurar-firebase.md      # pasos para crear el proyecto de Firebase
css/estilos.css
js/
  externos/                 # codemirror.js, firebase.js, fflate.js
  configuracion.js          # ICONOS, ANCHO_ESCRITORIO, tiempos, config de Firebase
  fechas.js                 # meses en español, fecha local, últimos 7 días
  notas.js                  # id, ruta, hora, primera línea, agrupar historial, buscar texto
  almacen-local.js          # IndexedDB (modo demo)
  almacen-remoto.js         # Firestore (modo personal)
  demo.js                   # notas de ejemplo y reinicio
  sesion.js                 # login, carga de Firebase, elección de almacén
  autoguardado.js
  editor.js                 # CodeMirror y su tema
  listas.js                 # Hoy, Semana, Historial (barra lateral o pestañas de abajo)
  pestanas.js               # pestañas de escritorio y pila para reabrir
  navegacion-movil.js       # barra inferior, editor encima, volver
  buscador.js
  atajos.js
  respaldo.js
  aplicacion.js             # estado único y arranque (siempre al final)
iconos/                     # iconos de la PWA
pruebas/                    # pruebas-fechas.js, pruebas-notas.js
legacy/                     # app de Python, ignorada por git
```

## Pruebas

- Solo sobre lógica pura: `fechas.js` y `notas.js` (fecha local, últimos 7
  días, id y ruta de una nota, hora, primera línea, agrupación del historial,
  búsqueda), y las funciones que deciden en `pestanas.js` (agregar, quitar,
  vecina, pila de cerradas) y `atajos.js` (qué tecla es qué acción). No se
  prueba la UI. Si un archivo mezcla lógica y DOM, la lógica va en funciones
  que reciben datos y devuelven datos, para poder probarla.
- `pruebas.html` carga esos scripts y los de `pruebas/`, y muestra en la
  página cuáles pasaron y cuáles fallaron. Sin npm ni librerías de pruebas.

## Desarrollo local

- Servir desde la raíz del repo: `python3 -m http.server 8000` y abrir
  `http://localhost:8000`. No funciona abriendo `index.html` con doble clic
  (`file://` no admite service worker, y Firebase e IndexedDB fallan).
- Por el service worker, un cambio se ve en la segunda recarga. Para verlo
  en la primera: "Update on reload" en las herramientas del navegador
  (Application > Service workers).
- Netlify publica la raíz del repo tal cual, sin comando de build.

## Git

- **Los commits los hace el dueño del proyecto.** Claude nunca ejecuta
  `git commit` ni `git push`; al terminar un cambio, solo propone el mensaje
  de commit.
- Mensajes de commit en español, sin emojis.
- `legacy/` no se versiona; el historial de la app de Python está en
  https://github.com/edgarjaviertec/edg-notas.
