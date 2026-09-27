// Estado único de la app y arranque. Los eventos cambian el estado y llaman a pintar;
// nunca tocan el DOM de otra sección directamente.

const estado = {
    almacen: null,
    notas: [],
    hoy: new Date(),
    pantalla: "hoy",
    pantallaDeLista: "hoy",
    idNotaAbierta: null,
    // Pestañas de escritorio; en móvil solo existe la nota abierta
    pestanas: [],
    pilaPestanasCerradas: [],
    // Lo que se necesita para "Deshacer": eliminarNota vacía el contenido
    notaEliminada: null,
    temporizadorAviso: null
};

const TEXTO_MODO_DEMO = "Modo demo · tus notas viven solo en este navegador y pueden borrarse";

function pintarIconos() {
    for (const elemento of document.querySelectorAll("[data-icono]")) {
        elemento.textContent = ICONOS[elemento.dataset.icono];
    }
}

function pintarEstadoGuardado(texto) {
    document.getElementById("estado-guardado").textContent = texto;
}

function pintarListas() {
    pintarListaHoy(listarNotasDelDia(estado.notas, estado.hoy), estado.idNotaAbierta, estado.hoy);
    pintarListaSemana(agruparNotasSemana(estado.notas, estado.hoy), estado.idNotaAbierta);
    pintarHistorial(agruparHistorial(estado.notas), estado.idNotaAbierta);
}

function pintarTodo() {
    pintarListas();
    pintarPestanas(estado.pestanas, estado.idNotaAbierta);
    pintarNavegacion(estado.pantalla, estado.pantallaDeLista);
    pintarTituloNota(estado.idNotaAbierta);
}

function buscarNotaEnEstado(id) {
    for (const nota of estado.notas) {
        if (nota.id === id) {
            return nota;
        }
    }
    return null;
}

// Copia local de lo que se guardó, para repintar sin volver a leer el almacén
function actualizarNotaEnEstado(id, contenido, eliminada) {
    const nota = buscarNotaEnEstado(id);
    if (nota === null) {
        estado.notas.push({ id: id, contenido: contenido, eliminada: eliminada, actualizadaEn: Date.now() });
        return;
    }
    nota.contenido = contenido;
    nota.eliminada = eliminada;
    nota.actualizadaEn = Date.now();
}

function listarIdsNotas() {
    const ids = [];
    for (const nota of estado.notas) {
        ids.push(nota.id);
    }
    return ids;
}

// Un fallo al guardar nunca rompe la app ni muestra un diálogo: se avisa en la barra de estado
async function guardarNota(id, contenido) {
    pintarEstadoGuardado("Guardando…");
    try {
        await estado.almacen.guardarNota(id, contenido);
        actualizarNotaEnEstado(id, contenido, false);
        pintarEstadoGuardado("Guardado");
        pintarListas();
    } catch (error) {
        console.error(error);
        pintarEstadoGuardado("No se pudo guardar");
    }
}

function alEscribirEnEditor(contenido) {
    const esNotaNueva = buscarNotaEnEstado(estado.idNotaAbierta) === null;
    // Una nota nueva no se guarda hasta que tiene contenido
    if (esNotaNueva && contenido === "") {
        return;
    }
    pintarEstadoGuardado("Sin guardar");
    programarGuardado(estado.idNotaAbierta, contenido);
}

async function abrirNota(id) {
    await guardarAhora();
    const nota = buscarNotaEnEstado(id);
    let contenido = "";
    if (nota !== null) {
        contenido = nota.contenido;
    }

    if (esEscritorio()) {
        estado.pestanas = agregarPestana(estado.pestanas, estado.idNotaAbierta, id);
    } else {
        estado.pestanas = [id];
    }
    estado.idNotaAbierta = id;
    estado.pantalla = "editor";
    cargarContenidoEnEditor(contenido);
    pintarTodo();
}

function esNotaGuardada(id) {
    const nota = buscarNotaEnEstado(id);
    return nota !== null && !nota.eliminada;
}

// guardarEnPila es false al eliminar: una nota eliminada no se puede reabrir
async function cerrarPestana(id, guardarEnPila) {
    await guardarAhora();
    const idVecina = elegirPestanaVecina(estado.pestanas, id);
    estado.pestanas = quitarPestana(estado.pestanas, id);
    // Una nota nueva que nunca se escribió no existe: no hay nada que reabrir
    if (guardarEnPila && esNotaGuardada(id)) {
        estado.pilaPestanasCerradas.push(id);
    }

    if (estado.idNotaAbierta !== id) {
        pintarTodo();
        return;
    }
    if (idVecina !== null) {
        await abrirNota(idVecina);
        return;
    }
    // Era la última pestaña: nunca queda el editor vacío en escritorio
    cerrarNotaAbierta();
    await abrirNotaInicialEnEscritorio();
    pintarTodo();
}

async function cerrarPestanaActiva() {
    if (!esEscritorio()) {
        await volverALista();
        return;
    }
    if (estado.idNotaAbierta === null) {
        return;
    }
    await cerrarPestana(estado.idNotaAbierta, true);
}

async function reabrirPestanaCerrada() {
    if (!esEscritorio()) {
        return;
    }
    const idsReabribles = [];
    for (const nota of prepararNotasVisibles(estado.notas)) {
        idsReabribles.push(nota.id);
    }
    const resultado = tomarUltimaPestanaCerrada(estado.pilaPestanasCerradas, idsReabribles, estado.pestanas);
    estado.pilaPestanasCerradas = resultado.pilaRestante;
    if (resultado.id === null) {
        return;
    }
    await abrirNota(resultado.id);
}

function buscarEnNotas() {
    const patron = leerTextoBusqueda();
    pintarResultadosBusqueda(buscarTexto(estado.notas, patron), patron);
}

async function abrirBuscadorDeNotas() {
    // Lo recién escrito aún no está en estado.notas hasta que se guarda
    await guardarAhora();
    abrirBuscador();
    buscarEnNotas();
}

async function abrirResultadoBusqueda(botonResultado) {
    cerrarBuscador();
    await abrirNota(botonResultado.dataset.idNota);
    irALineaEnEditor(Number(botonResultado.dataset.numeroLinea));
    // En móvil enfocar abriría el teclado encima del resultado
    if (esEscritorio()) {
        enfocarEditor();
    }
}

// En móvil se vuelve a la lista; en escritorio quien llama abre otra nota enseguida
function cerrarNotaAbierta() {
    estado.idNotaAbierta = null;
    estado.pantalla = estado.pantallaDeLista;
    cargarContenidoEnEditor("");
}

async function crearNotaNueva() {
    const id = crearIdNotaLibre(new Date(), listarIdsNotas());
    await abrirNota(id);
    enfocarEditor();
}

async function volverALista() {
    await guardarAhora();
    estado.pantalla = estado.pantallaDeLista;
    pintarTodo();
}

function irAPantalla(pantalla) {
    estado.pantalla = pantalla;
    estado.pantallaDeLista = pantalla;
    pintarNavegacion(estado.pantalla, estado.pantallaDeLista);
}

function mostrarAvisoDeshacer(texto) {
    document.getElementById("aviso-deshacer-texto").textContent = texto;
    document.getElementById("aviso-deshacer").hidden = false;

    clearTimeout(estado.temporizadorAviso);
    estado.temporizadorAviso = setTimeout(ocultarAvisoDeshacer, DURACION_AVISO_DESHACER_MS);
}

function ocultarAvisoDeshacer() {
    document.getElementById("aviso-deshacer").hidden = true;
    estado.notaEliminada = null;
}

async function eliminarNota(id) {
    // Primero lo pendiente: si no, un guardado atrasado "revive" la nota eliminada
    await guardarAhora();
    const nota = buscarNotaEnEstado(id);
    if (nota === null) {
        return;
    }
    const contenido = nota.contenido;

    try {
        await estado.almacen.eliminarNota(id);
    } catch (error) {
        console.error(error);
        pintarEstadoGuardado("No se pudo eliminar");
        return;
    }
    actualizarNotaEnEstado(id, "", true);

    mostrarAvisoDeshacer("Nota " + horaDeNota(id) + " eliminada");
    estado.notaEliminada = { id: id, contenido: contenido };

    if (estado.pestanas.includes(id)) {
        await cerrarPestana(id, false);
        return;
    }
    pintarTodo();
}

async function deshacerEliminacion() {
    const notaEliminada = estado.notaEliminada;
    ocultarAvisoDeshacer();
    if (notaEliminada === null) {
        return;
    }

    try {
        await estado.almacen.restaurarNota(notaEliminada.id, notaEliminada.contenido);
    } catch (error) {
        console.error(error);
        pintarEstadoGuardado("No se pudo restaurar");
        return;
    }
    actualizarNotaEnEstado(notaEliminada.id, notaEliminada.contenido, false);
    pintarListas();
}

// Sin timer de medianoche: los navegadores congelan los timers en segundo plano
function revisarCambioDeDia() {
    const ahora = new Date();
    if (sonElMismoDia(estado.hoy, ahora)) {
        return;
    }
    estado.hoy = ahora;
    pintarListas();
}

function alternarSemana() {
    if (!esEscritorio()) {
        return;
    }
    const boton = document.getElementById("alternar-semana");
    const estaExpandida = boton.getAttribute("aria-expanded") === "true";
    boton.setAttribute("aria-expanded", String(!estaExpandida));
    document.getElementById("lista-semana").hidden = estaExpandida;
}

function alCambiarModoPantalla() {
    actualizarModoPantalla();
    cambiarNumerosLinea(esEscritorio());
}

async function reiniciarDemoDesdeBoton() {
    await guardarAhora();
    await reiniciarDemo(new Date());
    estado.pestanas = [];
    estado.pilaPestanasCerradas = [];
    cerrarNotaAbierta();
    await recargarNotas();
    await abrirNotaInicialEnEscritorio();
}

function manejarClicEnListas(evento) {
    const boton = evento.target.closest("[data-accion]");
    if (boton === null) {
        return;
    }

    const accion = boton.dataset.accion;
    if (accion === "nueva-nota") {
        crearNotaNueva();
        return;
    }
    if (accion === "abrir-buscador") {
        abrirBuscadorDeNotas();
        return;
    }

    const fila = boton.closest("[data-id-nota]");
    if (fila === null) {
        return;
    }
    if (accion === "abrir-nota") {
        abrirNota(fila.dataset.idNota);
    }
    if (accion === "eliminar-nota") {
        eliminarNota(fila.dataset.idNota);
    }
}

async function exportarRespaldo() {
    // Lo recién escrito aún no está en estado.notas hasta que se guarda
    await guardarAhora();
    try {
        descargarRespaldo(estado.notas, new Date());
    } catch (error) {
        console.error(error);
        pintarEstadoGuardado("No se pudo exportar el respaldo");
    }
}

function manejarClicEnPestanas(evento) {
    const boton = evento.target.closest("[data-accion]");
    if (boton === null) {
        return;
    }
    const id = boton.closest("[data-id-nota]").dataset.idNota;
    if (boton.dataset.accion === "abrir-pestana") {
        abrirNota(id);
    }
    if (boton.dataset.accion === "cerrar-pestana") {
        cerrarPestana(id, true);
    }
}

function manejarClicEnResultados(evento) {
    const boton = evento.target.closest(".resultado-busqueda");
    if (boton === null) {
        return;
    }
    abrirResultadoBusqueda(boton);
}

// Enter en el campo abre el primer resultado
function manejarTeclaEnBusqueda(evento) {
    if (evento.key !== "Enter") {
        return;
    }
    evento.preventDefault();
    const primerResultado = document.querySelector("#resultados-busqueda .resultado-busqueda");
    if (primerResultado !== null) {
        abrirResultadoBusqueda(primerResultado);
    }
}

function conectarEventos() {
    document.getElementById("panel-listas").addEventListener("click", manejarClicEnListas);
    document.getElementById("pestanas").addEventListener("click", manejarClicEnPestanas);
    document.getElementById("campo-busqueda").addEventListener("input", buscarEnNotas);
    document.getElementById("campo-busqueda").addEventListener("keydown", manejarTeclaEnBusqueda);
    document.getElementById("resultados-busqueda").addEventListener("click", manejarClicEnResultados);
    document.getElementById("boton-cerrar-buscador").addEventListener("click", cerrarBuscador);
    document.getElementById("alternar-semana").addEventListener("click", alternarSemana);
    document.getElementById("boton-volver").addEventListener("click", volverALista);
    document.getElementById("boton-deshacer").addEventListener("click", deshacerEliminacion);
    document.getElementById("boton-reiniciar-demo").addEventListener("click", reiniciarDemoDesdeBoton);
    document.getElementById("boton-exportar").addEventListener("click", exportarRespaldo);

    for (const boton of document.querySelectorAll(".barra-inferior-boton")) {
        boton.addEventListener("click", function () {
            irAPantalla(boton.dataset.pantallaDestino);
        });
    }

    consultaEscritorio.addEventListener("change", alCambiarModoPantalla);
    window.addEventListener("focus", revisarCambioDeDia);
    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") {
            revisarCambioDeDia();
        }
    });
}

async function recargarNotas() {
    estado.notas = await estado.almacen.listarNotas();
    pintarTodo();
}

// En escritorio nunca queda el editor sin nota, como en la app de Python:
// se abre la más reciente de hoy o, si no hay, una nueva
async function abrirNotaInicialEnEscritorio() {
    if (!esEscritorio()) {
        return;
    }
    const notasDeHoy = listarNotasDelDia(estado.notas, estado.hoy);
    if (notasDeHoy.length > 0) {
        await abrirNota(notasDeHoy[0].id);
        return;
    }
    await crearNotaNueva();
}

// Falla en file:// y en navegadores sin soporte: la app funciona igual, solo que sin modo offline
function registrarTrabajadorServicio() {
    if (!("serviceWorker" in navigator)) {
        return;
    }
    navigator.serviceWorker.register("trabajador-servicio.js").catch(function (error) {
        console.error(error);
    });
}

async function arrancar() {
    registrarTrabajadorServicio();
    pintarIconos();
    actualizarModoPantalla();
    crearEditor(document.getElementById("editor"), {
        alCambiar: alEscribirEnEditor,
        alEnfocar: function () {
            marcarEscribiendo(true);
        },
        alDesenfocar: function () {
            marcarEscribiendo(false);
        }
    });
    cambiarNumerosLinea(esEscritorio());

    // Por ahora solo existe el modo demo; sesion.js elegirá el almacén
    estado.almacen = almacenLocal;
    document.getElementById("estado-modo").textContent = TEXTO_MODO_DEMO;
    document.getElementById("boton-reiniciar-demo").hidden = false;

    iniciarAutoguardado(guardarNota);
    iniciarDeslizarParaEliminar();
    iniciarAtajos({
        nuevaNota: crearNotaNueva,
        cerrarPestana: cerrarPestanaActiva,
        reabrirPestana: reabrirPestanaCerrada,
        buscar: abrirBuscadorDeNotas
    });
    conectarEventos();

    try {
        await sembrarDemoSiHaceFalta(estado.hoy);
        await recargarNotas();
    } catch (error) {
        console.error(error);
        pintarEstadoGuardado("No se pudieron cargar las notas");
        return;
    }
    await abrirNotaInicialEnEscritorio();
}

arrancar();
