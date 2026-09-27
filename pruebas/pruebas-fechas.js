probar("nombreMes devuelve el nombre en español", function () {
    afirmarIgual(nombreMes(1), "Enero");
    afirmarIgual(nombreMes(9), "Septiembre");
    afirmarIgual(nombreMes(12), "Diciembre");
});

probar("nombreDiaSemana devuelve el día en español", function () {
    afirmarIgual(nombreDiaSemana(new Date(2026, 8, 27)), "domingo");
    afirmarIgual(nombreDiaSemana(new Date(2026, 8, 26)), "sábado");
});

probar("formatearFecha rellena mes y día con cero", function () {
    afirmarIgual(formatearFecha(new Date(2026, 0, 5)), "2026-01-05");
});

probar("formatearFecha usa la hora local, no UTC", function () {
    afirmarIgual(formatearFecha(new Date(2026, 8, 27, 23, 30)), "2026-09-27");
    afirmarIgual(formatearFecha(new Date(2026, 8, 27, 0, 15)), "2026-09-27");
});

probar("leerFecha lee una fecha YYYY-MM-DD válida", function () {
    afirmarIgual(formatearFecha(leerFecha("2026-09-19")), "2026-09-19");
    afirmarIgual(formatearFecha(leerFecha("2024-02-29")), "2024-02-29");
});

probar("leerFecha rechaza formatos distintos a YYYY-MM-DD", function () {
    afirmarIgual(leerFecha("2026-9-19"), null);
    afirmarIgual(leerFecha("19-09-2026"), null);
    afirmarIgual(leerFecha(" 2026-09-19"), null);
    afirmarIgual(leerFecha("hola"), null);
    afirmarIgual(leerFecha(""), null);
});

probar("leerFecha rechaza fechas que no existen", function () {
    afirmarIgual(leerFecha("2026-02-30"), null);
    afirmarIgual(leerFecha("2025-02-29"), null);
    afirmarIgual(leerFecha("2026-13-01"), null);
});

probar("calcularUltimosSieteDias empieza por hoy y va descendiendo", function () {
    const dias = calcularUltimosSieteDias(new Date(2026, 8, 19));
    afirmarIgual(dias.length, 7);
    afirmarIgual(formatearFecha(dias[0]), "2026-09-19");
    afirmarIgual(formatearFecha(dias[1]), "2026-09-18");
    afirmarIgual(formatearFecha(dias[6]), "2026-09-13");
});

probar("calcularUltimosSieteDias cruza meses y años", function () {
    const diasOctubre = calcularUltimosSieteDias(new Date(2026, 9, 2));
    afirmarIgual(formatearFecha(diasOctubre[6]), "2026-09-26");

    const diasEnero = calcularUltimosSieteDias(new Date(2027, 0, 3));
    afirmarIgual(formatearFecha(diasEnero[6]), "2026-12-28");
});

// Solo detecta el error en zonas con horario de verano (por ejemplo TZ=America/New_York):
// restando milisegundos, a las 00:30 del 10 de marzo se salta el día 8
probar("calcularUltimosSieteDias no salta días con cambio de horario", function () {
    const dias = calcularUltimosSieteDias(new Date(2026, 2, 10, 0, 30));
    const esperados = ["2026-03-10", "2026-03-09", "2026-03-08", "2026-03-07", "2026-03-06", "2026-03-05", "2026-03-04"];
    for (const [posicion, esperado] of esperados.entries()) {
        afirmarIgual(formatearFecha(dias[posicion]), esperado);
    }
});

probar("etiquetarDia marca hoy y ayer, y nada más", function () {
    const hoy = new Date(2026, 8, 27, 10, 0);
    afirmarIgual(etiquetarDia(new Date(2026, 8, 27, 23, 59), hoy), "Hoy");
    afirmarIgual(etiquetarDia(new Date(2026, 8, 26), hoy), "Ayer");
    afirmarIgual(etiquetarDia(new Date(2026, 8, 25), hoy), "");
});

probar("etiquetarDia reconoce ayer al cruzar de año", function () {
    afirmarIgual(etiquetarDia(new Date(2025, 11, 31), new Date(2026, 0, 1)), "Ayer");
});
