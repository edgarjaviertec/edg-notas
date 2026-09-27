// Service worker: la app funciona sin conexión.
// Estrategia "stale-while-revalidate": responde al instante con lo que hay en caché y, en paralelo,
// pide la versión nueva a la red para la próxima vez. Así un cambio publicado llega en la
// siguiente visita sin tener que acordarse de subir VERSION_CACHE.
// VERSION_CACHE solo se sube si se quiere borrar la caché vieja completa (por ejemplo al quitar archivos).

const VERSION_CACHE = "edg-notas-v1";

// Se guardan al instalar, para que la primera visita ya deje la app lista sin conexión.
// firebase.js no está a propósito: la demo nunca lo descarga; en el modo personal se guarda
// en caché la primera vez que se pide.
// Si un archivo de esta lista no existe, la instalación falla entera: mantenerla al día.
const ARCHIVOS_APP = [
    "/",
    "/index.html",
    "/manifiesto.webmanifest",
    "/css/estilos.css",
    "/iconos/icono.svg",
    "/iconos/icono-180.png",
    "/iconos/icono-192.png",
    "/iconos/icono-512.png",
    "/js/externos/codemirror.js",
    "/js/externos/fflate.js",
    "/js/configuracion.js",
    "/js/fechas.js",
    "/js/notas.js",
    "/js/almacen-local.js",
    "/js/demo.js",
    "/js/autoguardado.js",
    "/js/editor.js",
    "/js/listas.js",
    "/js/navegacion-movil.js",
    "/js/buscador.js",
    "/js/pestanas.js",
    "/js/atajos.js",
    "/js/respaldo.js",
    "/js/aplicacion.js"
];

self.addEventListener("install", function (evento) {
    evento.waitUntil(
        caches.open(VERSION_CACHE).then(function (cache) {
            return cache.addAll(ARCHIVOS_APP);
        })
    );
    // Sin esperar a que se cierren las pestañas abiertas con la versión anterior
    self.skipWaiting();
});

self.addEventListener("activate", function (evento) {
    evento.waitUntil(borrarCachesViejas().then(function () {
        return self.clients.claim();
    }));
});

async function borrarCachesViejas() {
    for (const nombre of await caches.keys()) {
        if (nombre !== VERSION_CACHE) {
            await caches.delete(nombre);
        }
    }
}

self.addEventListener("fetch", function (evento) {
    const peticion = evento.request;
    // Firebase y cualquier otro dominio van directo a la red: su caché la maneja su propio SDK
    const esDeEsteSitio = new URL(peticion.url).origin === self.location.origin;
    if (peticion.method !== "GET" || !esDeEsteSitio) {
        return;
    }
    evento.respondWith(responderDesdeCacheYActualizar(evento));
});

async function responderDesdeCacheYActualizar(evento) {
    const cache = await caches.open(VERSION_CACHE);
    const respuestaGuardada = await cache.match(evento.request, { ignoreSearch: true });

    const respuestaDeRed = fetch(evento.request).then(function (respuesta) {
        if (respuesta.ok) {
            cache.put(evento.request, respuesta.clone());
        }
        return respuesta;
    });

    if (respuestaGuardada !== undefined) {
        // Sin conexión la petición falla; no importa, ya se respondió con la caché
        evento.waitUntil(respuestaDeRed.catch(function () {}));
        return respuestaGuardada;
    }
    return respuestaDeRed;
}
