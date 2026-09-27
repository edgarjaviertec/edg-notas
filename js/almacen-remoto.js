// Almacén del modo personal, sobre Firestore con caché local. Tiene las mismas funciones que almacenLocal.
// En Firestore cada nota es un documento de la colección "notas" con id "YYYY-MM-DD_HH-MM-SS"
// y campos { contenido, eliminada, actualizadaEn } (actualizadaEn es un Timestamp del servidor).
// Solo se usa si sesion.js ya cargó js/externos/firebase.js (global Firebase).

let baseRemota = null;
let alFallarEscrituraRemota = function () {};

function iniciarAlmacenRemoto(appFirebase) {
    baseRemota = Firebase.initializeFirestore(appFirebase, {
        localCache: Firebase.persistentLocalCache({
            tabManager: Firebase.persistentMultipleTabManager()
        })
    });
}

// Las escrituras no se esperan (ver escribirNotaRemota): los errores llegan después por aquí
function avisarFallosDeEscrituraRemota(funcionAviso) {
    alFallarEscrituraRemota = funcionAviso;
}

// Una escritura pendiente (sin conexión) aún no tiene la hora del servidor: se usa la estimada
function convertirDocumentoEnNota(documento) {
    const datos = documento.data({ serverTimestamps: "estimate" });
    return {
        id: documento.id,
        contenido: datos.contenido,
        eliminada: datos.eliminada,
        actualizadaEn: datos.actualizadaEn.toMillis()
    };
}

function leerUltimaSincronizacion() {
    const textoGuardado = localStorage.getItem(CLAVE_ULTIMA_SINCRONIZACION);
    if (textoGuardado === null) {
        return 0;
    }
    return Number(textoGuardado);
}

// Pide al servidor solo lo que cambió desde la última vez: así cada apertura cuesta
// unas pocas lecturas de la cuota gratis, no una por cada nota. Lo que llega queda en la caché.
async function traerCambiosDelServidor(coleccion, desde) {
    const consulta = Firebase.query(coleccion, Firebase.where("actualizadaEn", ">", Firebase.Timestamp.fromMillis(desde)));

    let instantanea;
    try {
        instantanea = await Firebase.getDocs(consulta);
    } catch (error) {
        // Sin conexión no es un error: se trabaja con lo que ya hay en la caché
        return;
    }

    let masReciente = desde;
    for (const documento of instantanea.docs) {
        // Las escrituras propias aún sin confirmar no cuentan: su hora es solo una estimación
        if (documento.metadata.hasPendingWrites) {
            continue;
        }
        const actualizadaEn = documento.get("actualizadaEn").toMillis();
        if (actualizadaEn > masReciente) {
            masReciente = actualizadaEn;
        }
    }
    localStorage.setItem(CLAVE_ULTIMA_SINCRONIZACION, String(masReciente));
}

// No se espera la confirmación del servidor: sin conexión nunca llegaría y la app se quedaría
// esperando. Firestore guarda la escritura en su caché local y la sube al volver la conexión.
function escribirNotaRemota(id, contenido, eliminada) {
    const referencia = Firebase.doc(baseRemota, COLECCION_NOTAS, id);
    const escritura = Firebase.setDoc(referencia, {
        contenido: contenido,
        eliminada: eliminada,
        actualizadaEn: Firebase.serverTimestamp()
    });
    escritura.catch(function (error) {
        console.error(error);
        alFallarEscrituraRemota(error);
    });
    return Promise.resolve();
}

const almacenRemoto = {
    // Incluye las eliminadas: filtrarlas es cosa de prepararNotasVisibles()
    listarNotas: async function () {
        const coleccion = Firebase.collection(baseRemota, COLECCION_NOTAS);
        let desde = leerUltimaSincronizacion();

        // Si el navegador borró la caché pero quedó la marca de sincronización,
        // pedir "solo lo nuevo" dejaría fuera las notas viejas: se pide todo
        const cacheAntes = await Firebase.getDocsFromCache(coleccion);
        if (cacheAntes.empty) {
            desde = 0;
        }

        await traerCambiosDelServidor(coleccion, desde);
        const instantanea = await Firebase.getDocsFromCache(coleccion);
        const notas = [];
        for (const documento of instantanea.docs) {
            notas.push(convertirDocumentoEnNota(documento));
        }
        return notas;
    },

    leerNota: async function (id) {
        const referencia = Firebase.doc(baseRemota, COLECCION_NOTAS, id);
        try {
            const documentoEnCache = await Firebase.getDocFromCache(referencia);
            if (documentoEnCache.exists()) {
                return convertirDocumentoEnNota(documentoEnCache);
            }
        } catch (error) {
            // No estaba en la caché: se pide al servidor
        }
        const documento = await Firebase.getDoc(referencia);
        if (!documento.exists()) {
            return null;
        }
        return convertirDocumentoEnNota(documento);
    },

    guardarNota: function (id, contenido) {
        return escribirNotaRemota(id, contenido, false);
    },

    // Borrado suave: la nota queda marcada y sin contenido. Las reglas no permiten borrar documentos.
    eliminarNota: function (id) {
        return escribirNotaRemota(id, "", true);
    },

    // Recibe el contenido porque eliminarNota lo vació; la interfaz lo conserva mientras se ve "Deshacer"
    restaurarNota: function (id, contenido) {
        return escribirNotaRemota(id, contenido, false);
    }
};

// Al cerrar sesión. No es parte de la interfaz común de almacenes.
// Espera a que se suban los cambios pendientes: borrar la caché antes los perdería.
async function borrarCopiaLocalRemota() {
    await Firebase.waitForPendingWrites(baseRemota);
    await Firebase.terminate(baseRemota);
    await Firebase.clearIndexedDbPersistence(baseRemota);
    localStorage.removeItem(CLAVE_ULTIMA_SINCRONIZACION);
    baseRemota = null;
}
