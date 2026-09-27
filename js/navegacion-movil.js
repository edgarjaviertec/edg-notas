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
    let titulo = "";
    if (idNota !== null) {
        titulo = fechaDeNota(idNota) + " · " + horaDeNota(idNota);
    }
    document.getElementById("titulo-nota").textContent = titulo;
}

// Con el teclado abierto se oculta la barra inferior (ver .esta-escribiendo en el CSS)
function marcarEscribiendo(estaEscribiendo) {
    document.getElementById("aplicacion").classList.toggle("esta-escribiendo", estaEscribiendo);
}
