// Qué pantalla se ve en móvil (lista de Hoy, Semana, Historial o el editor encima)
// y el modo escritorio/móvil. En escritorio data-pantalla se ignora por CSS.

const NOMBRES_PANTALLAS = {
    hoy: "Hoy",
    semana: "Semana",
    historial: "Historial"
};

const consultaEscritorio = window.matchMedia("(min-width: " + ANCHO_ESCRITORIO + "px)");

function esEscritorio() {
    return consultaEscritorio.matches;
}

function actualizarModoPantalla() {
    if (esEscritorio()) {
        document.body.dataset.modo = "escritorio";
    } else {
        document.body.dataset.modo = "movil";
    }
}

// pantallaDeLista es la pestaña de abajo que queda marcada, y a la que vuelve "‹"
function pintarNavegacion(pantalla, pantallaDeLista) {
    document.getElementById("aplicacion").dataset.pantalla = pantalla;

    for (const boton of document.querySelectorAll(".barra-inferior-boton")) {
        if (boton.dataset.pantallaDestino === pantallaDeLista) {
            boton.setAttribute("aria-current", "page");
        } else {
            boton.removeAttribute("aria-current");
        }
    }
    document.getElementById("texto-volver").textContent = NOMBRES_PANTALLAS[pantallaDeLista];
}

function pintarTituloNota(idNota) {
    const elementoTitulo = document.getElementById("titulo-nota");
    if (idNota === null) {
        elementoTitulo.textContent = "";
        return;
    }
    if (esIdBorrador(idNota)) {
        elementoTitulo.textContent = TITULO_BORRADOR;
        return;
    }
    elementoTitulo.textContent = fechaDeNota(idNota) + " · " + horaDeNota(idNota);
}

// Con el teclado abierto se oculta la barra inferior (ver .esta-escribiendo en el CSS)
function marcarEscribiendo(estaEscribiendo) {
    document.getElementById("aplicacion").classList.toggle("esta-escribiendo", estaEscribiendo);
}

// Deslizar una fila a la izquierda descubre el botón "Eliminar" (solo móvil).
// El navegador sigue manejando el scroll vertical (touch-action: pan-y en el CSS).

const UMBRAL_INICIO_DESLIZAR = 10;

let deslizamiento = null;
let filaDeslizada = null;
// Al soltar tras deslizar, el navegador dispara un clic que abriría la nota
let ignorarProximoClic = false;

function moverFila(boton, desplazamiento) {
    if (desplazamiento === 0) {
        boton.style.transform = "";
        return;
    }
    boton.style.transform = "translateX(" + desplazamiento + "px)";
}

function cerrarFilaDeslizada() {
    if (filaDeslizada === null) {
        return;
    }
    moverFila(filaDeslizada.querySelector(".fila-nota-abrir"), 0);
    filaDeslizada = null;
}

function alTocarFila(evento) {
    ignorarProximoClic = false;
    if (esEscritorio()) {
        return;
    }
    const boton = evento.target.closest(".fila-nota-abrir");
    if (boton === null) {
        return;
    }

    const fila = boton.closest(".fila-nota");
    const anchoEliminar = fila.querySelector(".fila-nota-eliminar").offsetWidth;
    let desplazamientoInicial = 0;
    if (fila === filaDeslizada) {
        desplazamientoInicial = -anchoEliminar;
    }

    deslizamiento = {
        fila: fila,
        boton: boton,
        inicioX: evento.clientX,
        inicioY: evento.clientY,
        anchoEliminar: anchoEliminar,
        desplazamientoInicial: desplazamientoInicial,
        desplazamiento: desplazamientoInicial,
        esHorizontal: null
    };
}

function alMoverDedo(evento) {
    if (deslizamiento === null) {
        return;
    }
    const distanciaX = evento.clientX - deslizamiento.inicioX;
    const distanciaY = evento.clientY - deslizamiento.inicioY;

    // Hasta superar el umbral no se sabe si es un deslizamiento o un scroll
    if (deslizamiento.esHorizontal === null) {
        const seMovioPoco = Math.abs(distanciaX) < UMBRAL_INICIO_DESLIZAR && Math.abs(distanciaY) < UMBRAL_INICIO_DESLIZAR;
        if (seMovioPoco) {
            return;
        }
        deslizamiento.esHorizontal = Math.abs(distanciaX) > Math.abs(distanciaY);
        if (!deslizamiento.esHorizontal) {
            deslizamiento = null;
            return;
        }
        if (filaDeslizada !== deslizamiento.fila) {
            cerrarFilaDeslizada();
        }
        deslizamiento.boton.classList.add("esta-arrastrando");
        deslizamiento.boton.setPointerCapture(evento.pointerId);
    }

    const desplazamientoDeseado = deslizamiento.desplazamientoInicial + distanciaX;
    const desplazamiento = Math.min(0, Math.max(-deslizamiento.anchoEliminar, desplazamientoDeseado));
    deslizamiento.desplazamiento = desplazamiento;
    moverFila(deslizamiento.boton, desplazamiento);
}

function alSoltarDedo() {
    if (deslizamiento === null) {
        return;
    }
    if (deslizamiento.esHorizontal) {
        ignorarProximoClic = true;
        deslizamiento.boton.classList.remove("esta-arrastrando");

        const quedaAbierta = deslizamiento.desplazamiento < -deslizamiento.anchoEliminar / 2;
        if (quedaAbierta) {
            moverFila(deslizamiento.boton, -deslizamiento.anchoEliminar);
            filaDeslizada = deslizamiento.fila;
        } else {
            moverFila(deslizamiento.boton, 0);
            filaDeslizada = null;
        }
    }
    deslizamiento = null;
}

// Va en fase de captura para frenar el clic antes de que llegue a aplicacion.js
function filtrarClicTrasDeslizar(evento) {
    if (ignorarProximoClic) {
        ignorarProximoClic = false;
        evento.stopPropagation();
        return;
    }

    // Tras eliminar, las filas se repintan y la deslizada ya no está en la página
    if (filaDeslizada !== null && !filaDeslizada.isConnected) {
        filaDeslizada = null;
    }
    const tocoEliminar = evento.target.closest(".fila-nota-eliminar") !== null;
    if (filaDeslizada !== null && !tocoEliminar) {
        // Con una fila abierta, tocar en otro lado solo la cierra
        cerrarFilaDeslizada();
        evento.stopPropagation();
    }
}

function iniciarDeslizarParaEliminar() {
    const panelListas = document.getElementById("panel-listas");
    panelListas.addEventListener("pointerdown", alTocarFila);
    panelListas.addEventListener("pointermove", alMoverDedo);
    panelListas.addEventListener("pointerup", alSoltarDedo);
    panelListas.addEventListener("pointercancel", alSoltarDedo);
    panelListas.addEventListener("click", filtrarClicTrasDeslizar, true);
}
