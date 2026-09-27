// Una nota es un objeto plano: { id, contenido, eliminada }.
// El id es la fecha y hora de creación, "YYYY-MM-DD_HH-MM-SS"; ordenado como texto
// queda ordenado por fecha, así que no hace falta leer fechas para ordenar.

const PATRON_ID_NOTA = /^(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})$/;
const EXTENSION_NOTA = ".md";
const MILISEGUNDOS_POR_SEGUNDO = 1000;
const HORAS_POR_DIA = 24;
const MINUTOS_POR_HORA = 60;
const SEGUNDOS_POR_MINUTO = 60;

function crearIdNota(fechaHora) {
    const horas = rellenarConCero(fechaHora.getHours());
    const minutos = rellenarConCero(fechaHora.getMinutes());
    const segundos = rellenarConCero(fechaHora.getSeconds());
    return formatearFecha(fechaHora) + "_" + horas + "-" + minutos + "-" + segundos;
}

// Si ya existe una nota creada en ese mismo segundo, se prueba con el segundo siguiente
function crearIdNotaLibre(fechaHora, idsExistentes) {
    let fechaCandidata = fechaHora;
    let idCandidato = crearIdNota(fechaCandidata);
    while (idsExistentes.includes(idCandidato)) {
        fechaCandidata = new Date(fechaCandidata.getTime() + MILISEGUNDOS_POR_SEGUNDO);
        idCandidato = crearIdNota(fechaCandidata);
    }
    return idCandidato;
}

function esIdNotaValido(id) {
    const partes = PATRON_ID_NOTA.exec(id);
    if (partes === null) {
        return false;
    }

    const horas = Number(partes[2]);
    const minutos = Number(partes[3]);
    const segundos = Number(partes[4]);
    const esHoraValida = horas < HORAS_POR_DIA && minutos < MINUTOS_POR_HORA && segundos < SEGUNDOS_POR_MINUTO;
    return esHoraValida && leerFecha(partes[1]) !== null;
}

// "2026-09-27_15-13-00" -> "2026-09-27"
function fechaDeNota(id) {
    return id.split("_")[0];
}

// "2026-09-27_15-13-00" -> "15:13:00"
function horaDeNota(id) {
    return id.split("_")[1].replaceAll("-", ":");
}

// "2026-09-27_15-13-00" -> "2026/09 - Septiembre/2026-09-27/2026-09-27_15-13-00.md"
function construirRutaNota(id) {
    const textoFecha = fechaDeNota(id);
    const fecha = leerFecha(textoFecha);
    const anio = String(fecha.getFullYear());
    const numeroMes = fecha.getMonth() + 1;
    const carpetaMes = rellenarConCero(numeroMes) + " - " + nombreMes(numeroMes);
    return anio + "/" + carpetaMes + "/" + textoFecha + "/" + id + EXTENSION_NOTA;
}

// Primera línea con texto, sin espacios sobrantes; "" si la nota está vacía
function obtenerPrimeraLinea(contenido) {
    for (const linea of contenido.split("\n")) {
        const lineaLimpia = linea.trim();
        if (lineaLimpia !== "") {
            return lineaLimpia;
        }
    }
    return "";
}

// Quita las eliminadas y ordena de la más nueva a la más vieja, sin tocar la lista original
function prepararNotasVisibles(notas) {
    const notasVisibles = [];
    for (const nota of notas) {
        if (!nota.eliminada) {
            notasVisibles.push(nota);
        }
    }
    notasVisibles.sort(function (primeraNota, segundaNota) {
        return segundaNota.id.localeCompare(primeraNota.id);
    });
    return notasVisibles;
}

function listarNotasDelDia(notas, fecha) {
    const textoFecha = formatearFecha(fecha);
    const notasDelDia = [];
    for (const nota of prepararNotasVisibles(notas)) {
        if (fechaDeNota(nota.id) === textoFecha) {
            notasDelDia.push(nota);
        }
    }
    return notasDelDia;
}

// Solo los días de los últimos 7 que tienen notas, del más nuevo al más viejo
function agruparNotasSemana(notas, hoy) {
    const diasConNotas = [];
    for (const fecha of calcularUltimosSieteDias(hoy)) {
        const notasDelDia = listarNotasDelDia(notas, fecha);
        if (notasDelDia.length === 0) {
            continue;
        }
        diasConNotas.push({
            textoFecha: formatearFecha(fecha),
            etiqueta: etiquetarDia(fecha, hoy),
            notas: notasDelDia
        });
    }
    return diasConNotas;
}

// Árbol año > mes > día > notas, todo del más nuevo al más viejo.
// Como las notas llegan ordenadas, basta con abrir un grupo nuevo cada vez que cambia el año, el mes o el día.
function agruparHistorial(notas) {
    const anios = [];
    let anioActual = null;
    let mesActual = null;
    let diaActual = null;

    for (const nota of prepararNotasVisibles(notas)) {
        const textoFecha = fechaDeNota(nota.id);
        const fecha = leerFecha(textoFecha);
        const anio = fecha.getFullYear();
        const numeroMes = fecha.getMonth() + 1;

        if (anioActual === null || anioActual.anio !== anio) {
            anioActual = { anio: anio, meses: [] };
            anios.push(anioActual);
            mesActual = null;
        }

        if (mesActual === null || mesActual.numeroMes !== numeroMes) {
            mesActual = {
                numeroMes: numeroMes,
                nombreCarpeta: rellenarConCero(numeroMes) + " - " + nombreMes(numeroMes),
                dias: []
            };
            anioActual.meses.push(mesActual);
            diaActual = null;
        }

        if (diaActual === null || diaActual.textoFecha !== textoFecha) {
            diaActual = { textoFecha: textoFecha, notas: [] };
            mesActual.dias.push(diaActual);
        }

        diaActual.notas.push(nota);
    }
    return anios;
}

// Una coincidencia por línea, no por nota, igual que en la app de escritorio.
// No distingue mayúsculas de minúsculas.
function buscarTexto(notas, patron) {
    if (patron === "") {
        return [];
    }

    const patronComparacion = patron.toLocaleLowerCase("es");
    const coincidencias = [];
    for (const nota of prepararNotasVisibles(notas)) {
        const lineas = nota.contenido.split("\n");
        for (const [posicion, linea] of lineas.entries()) {
            if (linea.toLocaleLowerCase("es").includes(patronComparacion)) {
                coincidencias.push({
                    nota: nota,
                    numeroLinea: posicion + 1,
                    textoLinea: linea
                });
            }
        }
    }
    return coincidencias;
}
