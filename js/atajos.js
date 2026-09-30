// Atajos de teclado con Alt (Option en Mac): el navegador no deja capturar
// Cmd+W, Cmd+T, Cmd+N ni Cmd+Shift+T.
// Se compara event.code y no event.key: en Mac Option+W produce "∑" en event.key.
// No usar Alt+F ni Alt+E sin Shift: en Chrome para Windows abren el menú del navegador.

const ATAJOS = [
    { codigo: "KeyN", conShift: false, accion: "nuevaNota" },
    { codigo: "KeyW", conShift: false, accion: "cerrarPestana" },
    { codigo: "KeyT", conShift: true, accion: "reabrirPestana" },
    { codigo: "KeyF", conShift: true, accion: "buscar" }
];

// Tamaño de letra del editor, con Cmd (Mac) o Ctrl (Windows), como el zoom del navegador.
// Aquí sí se compara event.key: en el teclado latinoamericano la tecla "+" no es "Equal".
// "=" es la tecla "+" sin Shift en el teclado de EE. UU.
const ATAJOS_TAMANO_FUENTE = [
    { tecla: "+", accion: "aumentarFuente" },
    { tecla: "=", accion: "aumentarFuente" },
    { tecla: "-", accion: "reducirFuente" },
    { tecla: "0", accion: "restablecerFuente" }
];

// null si la combinación no es un atajo nuestro
function buscarAccionDeAtajo(codigo, conShift) {
    for (const atajo of ATAJOS) {
        if (atajo.codigo === codigo && atajo.conShift === conShift) {
            return atajo.accion;
        }
    }
    return null;
}

// null si la tecla no es un atajo de tamaño de letra
function buscarAccionDeAtajoTamanoFuente(tecla) {
    for (const atajo of ATAJOS_TAMANO_FUENTE) {
        if (atajo.tecla === tecla) {
            return atajo.accion;
        }
    }
    return null;
}

// null si el evento no es un atajo nuestro
function buscarAccionDeEvento(evento) {
    const esSoloAlt = evento.altKey && !evento.ctrlKey && !evento.metaKey;
    if (esSoloAlt) {
        return buscarAccionDeAtajo(evento.code, evento.shiftKey);
    }
    const esCmdOCtrl = (evento.metaKey || evento.ctrlKey) && !evento.altKey;
    if (esCmdOCtrl) {
        return buscarAccionDeAtajoTamanoFuente(evento.key);
    }
    return null;
}

// acciones: un objeto con una función por cada acción de ATAJOS y ATAJOS_TAMANO_FUENTE
function iniciarAtajos(acciones) {
    // En fase de captura, para ganarle a CodeMirror y que Option+N no escriba "˜"
    document.addEventListener("keydown", function (evento) {
        const accion = buscarAccionDeEvento(evento);
        if (accion === null) {
            return;
        }
        evento.preventDefault();
        evento.stopPropagation();
        acciones[accion]();
    }, true);
}
