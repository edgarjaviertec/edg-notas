// Guarda la nota tras una pausa al teclear, y como máximo cada TECHO_AUTOGUARDADO_MS
// aunque no se deje de escribir. Solo recuerda el último cambio: los anteriores ya no importan.

let guardadoPendiente = null;
let temporizadorEspera = null;
let temporizadorTecho = null;
let funcionGuardarNota = null;

function iniciarAutoguardado(guardarNota) {
    funcionGuardarNota = guardarNota;

    // En móvil el sistema puede cerrar la pestaña sin avisar: se guarda al ocultarla
    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden") {
            guardarAhora();
        }
    });
    window.addEventListener("pagehide", guardarAhora);
}

function programarGuardado(id, contenido) {
    guardadoPendiente = { id: id, contenido: contenido };

    clearTimeout(temporizadorEspera);
    temporizadorEspera = setTimeout(guardarAhora, ESPERA_AUTOGUARDADO_MS);

    if (temporizadorTecho === null) {
        temporizadorTecho = setTimeout(guardarAhora, TECHO_AUTOGUARDADO_MS);
    }
}

function tieneGuardadoPendiente() {
    return guardadoPendiente !== null;
}

// Se llama también antes de abrir otra nota, eliminar o volver, para no perder lo último escrito
async function guardarAhora() {
    clearTimeout(temporizadorEspera);
    clearTimeout(temporizadorTecho);
    temporizadorEspera = null;
    temporizadorTecho = null;

    if (guardadoPendiente === null) {
        return;
    }
    const guardado = guardadoPendiente;
    guardadoPendiente = null;
    await funcionGuardarNota(guardado.id, guardado.contenido);
}
