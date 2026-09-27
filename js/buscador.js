// Búsqueda de texto en todas las notas. Es un <dialog>: pantalla completa en móvil,
// ventana en escritorio (ver CSS). Solo pinta; buscar y abrir lo decide aplicacion.js.

// Con muchas coincidencias, pintarlas todas haría lento cada tecleo
const LIMITE_RESULTADOS_BUSQUEDA = 200;

function abrirBuscador() {
    const dialogo = document.getElementById("buscador");
    const campo = document.getElementById("campo-busqueda");
    if (!dialogo.open) {
        dialogo.showModal();
    }
    campo.focus();
    campo.select();
}

function cerrarBuscador() {
    document.getElementById("buscador").close();
}

function leerTextoBusqueda() {
    return document.getElementById("campo-busqueda").value;
}

function pluralizar(cantidad, singular, plural) {
    if (cantidad === 1) {
        return cantidad + " " + singular;
    }
    return cantidad + " " + plural;
}

function crearResumenBusqueda(coincidencias, patron) {
    if (patron === "") {
        return "";
    }
    if (coincidencias.length === 0) {
        return "Sin resultados";
    }

    const idsNotas = new Set();
    for (const coincidencia of coincidencias) {
        idsNotas.add(coincidencia.nota.id);
    }
    let resumen = pluralizar(coincidencias.length, "coincidencia", "coincidencias") +
        " en " + pluralizar(idsNotas.size, "nota", "notas");
    if (coincidencias.length > LIMITE_RESULTADOS_BUSQUEDA) {
        resumen = resumen + " (se muestran las primeras " + LIMITE_RESULTADOS_BUSQUEDA + ")";
    }
    return resumen;
}

function crearResultadoBusqueda(coincidencia) {
    const elementoResultado = clonarPlantilla("plantilla-resultado-busqueda");
    const boton = elementoResultado.querySelector(".resultado-busqueda");
    const id = coincidencia.nota.id;

    boton.dataset.idNota = id;
    boton.dataset.numeroLinea = String(coincidencia.numeroLinea);
    elementoResultado.querySelector(".resultado-busqueda-nota").textContent =
        fechaDeNota(id) + " · " + horaDeNota(id) + " · línea " + coincidencia.numeroLinea;
    elementoResultado.querySelector(".resultado-busqueda-linea").textContent = coincidencia.textoLinea.trim();
    return elementoResultado;
}

function pintarResultadosBusqueda(coincidencias, patron) {
    document.getElementById("resumen-busqueda").textContent = crearResumenBusqueda(coincidencias, patron);

    const resultados = [];
    for (const coincidencia of coincidencias.slice(0, LIMITE_RESULTADOS_BUSQUEDA)) {
        resultados.push(crearResultadoBusqueda(coincidencia));
    }
    document.getElementById("resultados-busqueda").replaceChildren(...resultados);
}
