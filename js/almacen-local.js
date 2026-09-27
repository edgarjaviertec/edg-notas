// Almacén del modo demo, sobre IndexedDB. Tiene las mismas funciones que almacenRemoto.
// Cada nota se guarda como { id, contenido, eliminada, actualizadaEn } (actualizadaEn en milisegundos).

let promesaBaseDemo = null;

function abrirBaseDemo() {
    if (promesaBaseDemo !== null) {
        return promesaBaseDemo;
    }

    promesaBaseDemo = new Promise(function (resolver, rechazar) {
        const peticion = indexedDB.open(NOMBRE_BASE_DEMO, VERSION_BASE_DEMO);
        peticion.onupgradeneeded = function () {
            peticion.result.createObjectStore(ALMACEN_NOTAS_DEMO, { keyPath: "id" });
        };
        peticion.onsuccess = function () {
            resolver(peticion.result);
        };
        peticion.onerror = function () {
            // Sin esto, un fallo quedaría guardado y nunca se volvería a intentar abrir
            promesaBaseDemo = null;
            rechazar(new Error("No se pudo abrir la base de la demo: " + peticion.error));
        };
    });
    return promesaBaseDemo;
}

// Resuelve cuando la transacción termina (no solo la petición): así lo escrito ya está en disco
async function ejecutarEnAlmacenDemo(modo, crearPeticion) {
    const base = await abrirBaseDemo();
    return new Promise(function (resolver, rechazar) {
        const transaccion = base.transaction(ALMACEN_NOTAS_DEMO, modo);
        const peticion = crearPeticion(transaccion.objectStore(ALMACEN_NOTAS_DEMO));
        transaccion.oncomplete = function () {
            resolver(peticion.result);
        };
        transaccion.onerror = function () {
            rechazar(new Error("Falló una operación en la base de la demo: " + transaccion.error));
        };
        transaccion.onabort = function () {
            rechazar(new Error("Se canceló una operación en la base de la demo: " + transaccion.error));
        };
    });
}

function escribirNotaDemo(id, contenido, eliminada) {
    const nota = {
        id: id,
        contenido: contenido,
        eliminada: eliminada,
        actualizadaEn: Date.now()
    };
    return ejecutarEnAlmacenDemo("readwrite", function (almacen) {
        return almacen.put(nota);
    });
}

const almacenLocal = {
    // Incluye las eliminadas: filtrarlas es cosa de prepararNotasVisibles()
    listarNotas: function () {
        return ejecutarEnAlmacenDemo("readonly", function (almacen) {
            return almacen.getAll();
        });
    },

    leerNota: async function (id) {
        const nota = await ejecutarEnAlmacenDemo("readonly", function (almacen) {
            return almacen.get(id);
        });
        if (nota === undefined) {
            return null;
        }
        return nota;
    },

    guardarNota: function (id, contenido) {
        return escribirNotaDemo(id, contenido, false);
    },

    // Borrado suave: la nota queda marcada y sin contenido
    eliminarNota: function (id) {
        return escribirNotaDemo(id, "", true);
    },

    // Recibe el contenido porque eliminarNota lo vació; la interfaz lo conserva mientras se ve "Deshacer"
    restaurarNota: function (id, contenido) {
        return escribirNotaDemo(id, contenido, false);
    }
};

// Para "Reiniciar demo". No es parte de la interfaz común de almacenes.
async function borrarBaseDemo() {
    if (promesaBaseDemo !== null) {
        const base = await promesaBaseDemo;
        // Con la conexión abierta, el borrado quedaría bloqueado
        base.close();
        promesaBaseDemo = null;
    }

    return new Promise(function (resolver, rechazar) {
        const peticion = indexedDB.deleteDatabase(NOMBRE_BASE_DEMO);
        peticion.onsuccess = function () {
            resolver();
        };
        peticion.onerror = function () {
            rechazar(new Error("No se pudo borrar la base de la demo: " + peticion.error));
        };
    });
}
