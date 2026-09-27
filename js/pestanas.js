// Pestañas de escritorio. Las pestañas son una lista de ids de notas.
// Las funciones que deciden (agregar, quitar, cuál sigue) no tocan el DOM: se prueban en pruebas.html.

// La nueva va justo a la derecha de la activa, como en un navegador
function agregarPestana(pestanas, idActiva, idNueva) {
    const nuevasPestanas = pestanas.slice();
    if (nuevasPestanas.includes(idNueva)) {
        return nuevasPestanas;
    }
    const posicionActiva = nuevasPestanas.indexOf(idActiva);
    if (posicionActiva === -1) {
        nuevasPestanas.push(idNueva);
        return nuevasPestanas;
    }
    nuevasPestanas.splice(posicionActiva + 1, 0, idNueva);
    return nuevasPestanas;
}

function quitarPestana(pestanas, idQuitada) {
    const nuevasPestanas = [];
    for (const id of pestanas) {
        if (id !== idQuitada) {
            nuevasPestanas.push(id);
        }
    }
    return nuevasPestanas;
}

// Al cerrar una pestaña se activa la de su derecha; si era la última, la de su izquierda.
// null si no queda ninguna.
function elegirPestanaVecina(pestanas, idCerrada) {
    const posicion = pestanas.indexOf(idCerrada);
    if (posicion === -1) {
        return null;
    }
    if (posicion + 1 < pestanas.length) {
        return pestanas[posicion + 1];
    }
    if (posicion > 0) {
        return pestanas[posicion - 1];
    }
    return null;
}

// Pila LIFO de pestañas cerradas. Se saltan las que ya no se pueden reabrir
// (notas eliminadas o que ya están abiertas). Devuelve el id y la pila que queda.
function tomarUltimaPestanaCerrada(pilaCerradas, idsReabribles, pestanasAbiertas) {
    const pilaRestante = pilaCerradas.slice();
    while (pilaRestante.length > 0) {
        const id = pilaRestante.pop();
        const sePuedeReabrir = idsReabribles.includes(id) && !pestanasAbiertas.includes(id);
        if (sePuedeReabrir) {
            return { id: id, pilaRestante: pilaRestante };
        }
    }
    return { id: null, pilaRestante: pilaRestante };
}

function pintarPestanas(pestanas, idActiva) {
    const elementosPestanas = [];
    for (const id of pestanas) {
        const pestana = clonarPlantilla("plantilla-pestana");
        const esActiva = id === idActiva;
        pestana.dataset.idNota = id;
        pestana.classList.toggle("esta-activa", esActiva);

        const titulo = pestana.querySelector(".pestana-titulo");
        titulo.textContent = fechaDeNota(id) + " " + horaDeNota(id);
        titulo.setAttribute("aria-selected", String(esActiva));
        elementosPestanas.push(pestana);
    }
    document.getElementById("pestanas").replaceChildren(...elementosPestanas);
}
