// Atajos de teclado, todos con Alt (Option en Mac): el navegador no deja capturar
// Cmd+W, Cmd+T, Cmd+N ni Cmd+Shift+T.
// Se compara event.code y no event.key: en Mac Option+W produce "∑" en event.key.
// No usar Alt+F ni Alt+E sin Shift: en Chrome para Windows abren el menú del navegador.

const ATAJOS = [
    { codigo: "KeyN", conShift: false, accion: "nuevaNota" },
    { codigo: "KeyW", conShift: false, accion: "cerrarPestana" },
    { codigo: "KeyT", conShift: true, accion: "reabrirPestana" },
    { codigo: "KeyF", conShift: true, accion: "buscar" }
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

// acciones: un objeto con una función por cada acción de ATAJOS
function iniciarAtajos(acciones) {
    // En fase de captura, para ganarle a CodeMirror y que Option+N no escriba "˜"
    document.addEventListener("keydown", function (evento) {
        const esSoloAlt = evento.altKey && !evento.ctrlKey && !evento.metaKey;
        if (!esSoloAlt) {
            return;
        }
        const accion = buscarAccionDeAtajo(evento.code, evento.shiftKey);
        if (accion === null) {
            return;
        }
        evento.preventDefault();
        evento.stopPropagation();
        acciones[accion]();
    }, true);
}
