const NOMBRES_MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// En el orden de Date.getDay(): 0 es domingo
const NOMBRES_DIAS_SEMANA = [
    "domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"
];

const DIAS_EN_SEMANA = 7;
const PATRON_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;

function nombreMes(numeroMes) {
    return NOMBRES_MESES[numeroMes - 1];
}

function nombreDiaSemana(fecha) {
    return NOMBRES_DIAS_SEMANA[fecha.getDay()];
}

function rellenarConCero(numero) {
    return String(numero).padStart(2, "0");
}

// Nunca toISOString(): da la fecha en UTC y en México, después de las 18:00, ya sería mañana
function formatearFecha(fecha) {
    const anio = fecha.getFullYear();
    const mes = rellenarConCero(fecha.getMonth() + 1);
    const dia = rellenarConCero(fecha.getDate());
    return anio + "-" + mes + "-" + dia;
}

// Devuelve null si el texto no es una fecha YYYY-MM-DD real (por ejemplo 2026-02-30)
function leerFecha(texto) {
    const partes = PATRON_FECHA.exec(texto);
    if (partes === null) {
        return null;
    }

    const anio = Number(partes[1]);
    const mes = Number(partes[2]);
    const dia = Number(partes[3]);
    const fecha = new Date(anio, mes - 1, dia);

    const esFechaReal = fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;
    if (!esFechaReal) {
        return null;
    }
    return fecha;
}

// Se resta con el constructor y no con milisegundos: así un cambio de horario nunca salta o repite un día
function restarDias(fecha, cantidadDias) {
    return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() - cantidadDias);
}

function sonElMismoDia(primeraFecha, segundaFecha) {
    return formatearFecha(primeraFecha) === formatearFecha(segundaFecha);
}

// Los últimos 7 días naturales, empezando por hoy (el más nuevo primero)
function calcularUltimosSieteDias(hoy) {
    const dias = [];
    for (let indice = 0; indice < DIAS_EN_SEMANA; indice += 1) {
        dias.push(restarDias(hoy, indice));
    }
    return dias;
}

// Solo hoy y ayer llevan etiqueta; el resto de la semana va sin ella
function etiquetarDia(fecha, hoy) {
    if (sonElMismoDia(fecha, hoy)) {
        return "Hoy";
    }
    if (sonElMismoDia(fecha, restarDias(hoy, 1))) {
        return "Ayer";
    }
    return "";
}
