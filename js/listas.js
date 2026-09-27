// Pinta las listas de Hoy, Esta semana e Historial. Las mismas funciones sirven para
// la barra lateral de escritorio y para las pantallas de móvil: solo cambia el CSS.
// No manejan clics: cada fila lleva data-id-nota y aplicacion.js escucha en un solo lugar.

const TEXTO_NOTA_VACIA = "Nota vacía";

function clonarPlantilla(idPlantilla) {
    return document.getElementById(idPlantilla).content.firstElementChild.cloneNode(true);
}

function crearFilaNota(nota, idNotaAbierta) {
    const fila = clonarPlantilla("plantilla-fila-nota");
    fila.dataset.idNota = nota.id;

    const primeraLinea = obtenerPrimeraLinea(nota.contenido);
    let vistaPrevia = primeraLinea;
    if (primeraLinea === "") {
        vistaPrevia = TEXTO_NOTA_VACIA;
    }

    fila.querySelector(".fila-nota-hora").textContent = horaDeNota(nota.id);
    fila.querySelector(".fila-nota-vista-previa").textContent = vistaPrevia;

    if (nota.id === idNotaAbierta) {
        fila.querySelector(".fila-nota-abrir").setAttribute("aria-current", "true");
    }
    return fila;
}

function crearFilasNotas(notas, idNotaAbierta) {
    const filas = [];
    for (const nota of notas) {
        filas.push(crearFilaNota(nota, idNotaAbierta));
    }
    return filas;
}

function pintarListaHoy(notasDelDia, idNotaAbierta, hoy) {
    document.getElementById("fecha-hoy").textContent = formatearFecha(hoy) + " · " + nombreDiaSemana(hoy);
    document.getElementById("lista-hoy").replaceChildren(...crearFilasNotas(notasDelDia, idNotaAbierta));
    document.getElementById("hoy-vacio").hidden = notasDelDia.length > 0;
}

function pintarListaSemana(diasConNotas, idNotaAbierta) {
    const elementosDias = [];
    for (const dia of diasConNotas) {
        const elementoDia = clonarPlantilla("plantilla-dia");
        let titulo = dia.textoFecha;
        if (dia.etiqueta !== "") {
            titulo = dia.textoFecha + "  [" + dia.etiqueta + "]";
        }
        elementoDia.querySelector(".grupo-dia-titulo").textContent = titulo;
        elementoDia.querySelector(".lista-notas").replaceChildren(...crearFilasNotas(dia.notas, idNotaAbierta));
        elementosDias.push(elementoDia);
    }
    document.getElementById("lista-semana").replaceChildren(...elementosDias);
}

// Cada grupo lleva una clave ("2026", "2026/09", "2026-09-27") para recordar cuáles
// estaban abiertos: al repintar se crean desde cero y se cerrarían todos
function crearGrupoHistorial(clave, titulo, clavesAbiertas) {
    const grupo = clonarPlantilla("plantilla-grupo-historial");
    grupo.dataset.clave = clave;
    grupo.open = clavesAbiertas.has(clave);
    grupo.querySelector(".grupo-historial-titulo").textContent = titulo;
    return grupo;
}

function leerClavesAbiertas(contenedor) {
    const clavesAbiertas = new Set();
    for (const grupo of contenedor.querySelectorAll("details[open]")) {
        clavesAbiertas.add(grupo.dataset.clave);
    }
    return clavesAbiertas;
}

function pintarHistorial(anios, idNotaAbierta) {
    const contenedor = document.getElementById("arbol-historial");
    const clavesAbiertas = leerClavesAbiertas(contenedor);
    const gruposAnios = [];

    for (const anio of anios) {
        const claveAnio = String(anio.anio);
        const grupoAnio = crearGrupoHistorial(claveAnio, claveAnio, clavesAbiertas);

        for (const mes of anio.meses) {
            const claveMes = claveAnio + "/" + rellenarConCero(mes.numeroMes);
            const grupoMes = crearGrupoHistorial(claveMes, mes.nombreCarpeta, clavesAbiertas);

            for (const dia of mes.dias) {
                const grupoDia = crearGrupoHistorial(dia.textoFecha, dia.textoFecha, clavesAbiertas);
                const listaNotas = document.createElement("ul");
                listaNotas.className = "lista-notas";
                listaNotas.replaceChildren(...crearFilasNotas(dia.notas, idNotaAbierta));
                grupoDia.querySelector(".grupo-historial-contenido").append(listaNotas);
                grupoMes.querySelector(".grupo-historial-contenido").append(grupoDia);
            }
            grupoAnio.querySelector(".grupo-historial-contenido").append(grupoMes);
        }
        gruposAnios.push(grupoAnio);
    }
    contenedor.replaceChildren(...gruposAnios);
}
