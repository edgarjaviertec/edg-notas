function crearNotaDePrueba(id, contenido, eliminada) {
    return { id: id, contenido: contenido, eliminada: eliminada === true };
}

function extraerIds(notas) {
    const ids = [];
    for (const nota of notas) {
        ids.push(nota.id);
    }
    return ids;
}

probar("crearIdNota arma YYYY-MM-DD_HH-MM-SS con hora local", function () {
    afirmarIgual(crearIdNota(new Date(2026, 8, 27, 15, 13, 5)), "2026-09-27_15-13-05");
    afirmarIgual(crearIdNota(new Date(2026, 8, 27, 23, 30, 0)), "2026-09-27_23-30-00");
});

probar("crearIdNotaLibre usa el id directo si está libre", function () {
    const fechaHora = new Date(2026, 8, 27, 15, 13, 5);
    afirmarIgual(crearIdNotaLibre(fechaHora, ["2026-09-27_09-00-00"]), "2026-09-27_15-13-05");
});

probar("crearIdNotaLibre salta al siguiente segundo si el id ya existe", function () {
    const fechaHora = new Date(2026, 8, 27, 15, 13, 5);
    const idsExistentes = ["2026-09-27_15-13-05", "2026-09-27_15-13-06"];
    afirmarIgual(crearIdNotaLibre(fechaHora, idsExistentes), "2026-09-27_15-13-07");
});

probar("crearIdNotaLibre cruza el minuto si hace falta", function () {
    const fechaHora = new Date(2026, 8, 27, 15, 13, 59);
    afirmarIgual(crearIdNotaLibre(fechaHora, ["2026-09-27_15-13-59"]), "2026-09-27_15-14-00");
});

probar("esIdNotaValido acepta ids bien formados", function () {
    afirmarIgual(esIdNotaValido("2026-09-27_15-13-00"), true);
    afirmarIgual(esIdNotaValido("2024-02-29_23-59-59"), true);
});

probar("esIdNotaValido rechaza formatos, fechas y horas inválidas", function () {
    afirmarIgual(esIdNotaValido("2026-09-27"), false);
    afirmarIgual(esIdNotaValido("2026-09-27_15-13"), false);
    afirmarIgual(esIdNotaValido("2026-09-27_15-13-00.md"), false);
    afirmarIgual(esIdNotaValido("2026-02-30_10-00-00"), false);
    afirmarIgual(esIdNotaValido("2026-09-27_24-00-00"), false);
    afirmarIgual(esIdNotaValido("2026-09-27_10-60-00"), false);
    afirmarIgual(esIdNotaValido("hola"), false);
});

probar("fechaDeNota y horaDeNota separan el id", function () {
    afirmarIgual(fechaDeNota("2026-09-27_15-13-00"), "2026-09-27");
    afirmarIgual(horaDeNota("2026-09-27_15-13-00"), "15:13:00");
});

probar("construirRutaNota arma la ruta de carpetas con el mes en español", function () {
    afirmarIgual(
        construirRutaNota("2026-09-27_15-13-00"),
        "2026/09 - Septiembre/2026-09-27/2026-09-27_15-13-00.md"
    );
    afirmarIgual(
        construirRutaNota("2027-01-02_08-00-00"),
        "2027/01 - Enero/2027-01-02/2027-01-02_08-00-00.md"
    );
});

probar("obtenerPrimeraLinea salta líneas vacías y quita espacios", function () {
    afirmarIgual(obtenerPrimeraLinea("Pendientes\n- café"), "Pendientes");
    afirmarIgual(obtenerPrimeraLinea("\n\n   Hola   \nmundo"), "Hola");
});

probar("obtenerPrimeraLinea devuelve texto vacío si no hay contenido", function () {
    afirmarIgual(obtenerPrimeraLinea(""), "");
    afirmarIgual(obtenerPrimeraLinea("   \n\t\n  "), "");
});

probar("prepararNotasVisibles quita eliminadas y ordena de la más nueva a la más vieja", function () {
    const notas = [
        crearNotaDePrueba("2026-09-26_10-00-00", "a"),
        crearNotaDePrueba("2026-09-27_09-00-00", "b"),
        crearNotaDePrueba("2026-09-27_15-00-00", "c", true),
        crearNotaDePrueba("2026-09-27_12-00-00", "d")
    ];
    afirmarIgualComoJson(
        extraerIds(prepararNotasVisibles(notas)),
        ["2026-09-27_12-00-00", "2026-09-27_09-00-00", "2026-09-26_10-00-00"]
    );
});

probar("prepararNotasVisibles no cambia el orden de la lista original", function () {
    const notas = [
        crearNotaDePrueba("2026-09-26_10-00-00", "a"),
        crearNotaDePrueba("2026-09-27_09-00-00", "b")
    ];
    prepararNotasVisibles(notas);
    afirmarIgualComoJson(extraerIds(notas), ["2026-09-26_10-00-00", "2026-09-27_09-00-00"]);
});

probar("listarNotasDelDia devuelve solo las de ese día, la más nueva primero", function () {
    const notas = [
        crearNotaDePrueba("2026-09-27_09-15-00", "a"),
        crearNotaDePrueba("2026-09-26_20-00-00", "b"),
        crearNotaDePrueba("2026-09-27_15-13-00", "c"),
        crearNotaDePrueba("2026-09-27_18-00-00", "d", true)
    ];
    afirmarIgualComoJson(
        extraerIds(listarNotasDelDia(notas, new Date(2026, 8, 27))),
        ["2026-09-27_15-13-00", "2026-09-27_09-15-00"]
    );
});

probar("agruparNotasSemana incluye solo días con notas, con etiquetas de hoy y ayer", function () {
    const notas = [
        crearNotaDePrueba("2026-09-27_09-00-00", "hoy"),
        crearNotaDePrueba("2026-09-26_09-00-00", "ayer"),
        crearNotaDePrueba("2026-09-23_09-00-00", "hace cuatro días"),
        crearNotaDePrueba("2026-09-20_09-00-00", "hace siete días, ya fuera")
    ];
    const dias = agruparNotasSemana(notas, new Date(2026, 8, 27, 10, 0), []);

    afirmarIgual(dias.length, 3);
    afirmarIgualComoJson(
        [dias[0].textoFecha, dias[0].etiqueta],
        ["2026-09-27", "Hoy"]
    );
    afirmarIgualComoJson(
        [dias[1].textoFecha, dias[1].etiqueta],
        ["2026-09-26", "Ayer"]
    );
    afirmarIgualComoJson(
        [dias[2].textoFecha, dias[2].etiqueta],
        ["2026-09-23", ""]
    );
});

probar("agruparNotasSemana ignora días que solo tienen notas eliminadas", function () {
    const notas = [crearNotaDePrueba("2026-09-27_09-00-00", "borrada", true)];
    afirmarIgual(agruparNotasSemana(notas, new Date(2026, 8, 27), []).length, 0);
});

probar("agruparNotasSemana pone los borradores en hoy, aunque hoy no tenga notas", function () {
    const notas = [crearNotaDePrueba("2026-09-26_09-00-00", "ayer")];
    const dias = agruparNotasSemana(notas, new Date(2026, 8, 27, 10, 0), ["borrador-1"]);

    afirmarIgual(dias.length, 2);
    afirmarIgual(dias[0].textoFecha, "2026-09-27");
    afirmarIgualComoJson(dias[0].idsBorradores, ["borrador-1"]);
    afirmarIgual(dias[0].notas.length, 0);
    afirmarIgualComoJson(dias[1].idsBorradores, []);
});

probar("esIdBorrador distingue borradores de notas", function () {
    afirmarIgual(esIdBorrador("borrador-3"), true);
    afirmarIgual(esIdBorrador("2026-09-27_15-13-00"), false);
});

probar("agruparHistorial arma año > mes > día, del más nuevo al más viejo", function () {
    const notas = [
        crearNotaDePrueba("2025-12-31_22-00-00", "a"),
        crearNotaDePrueba("2026-09-27_09-00-00", "b"),
        crearNotaDePrueba("2026-09-27_15-00-00", "c"),
        crearNotaDePrueba("2026-09-19_10-00-00", "d"),
        crearNotaDePrueba("2026-08-01_10-00-00", "e"),
        crearNotaDePrueba("2026-07-01_10-00-00", "eliminada", true)
    ];
    const anios = agruparHistorial(notas);

    afirmarIgual(anios.length, 2);
    afirmarIgual(anios[0].anio, 2026);
    afirmarIgual(anios[1].anio, 2025);

    const mesesDe2026 = anios[0].meses;
    afirmarIgual(mesesDe2026.length, 2);
    afirmarIgual(mesesDe2026[0].nombreCarpeta, "09 - Septiembre");
    afirmarIgual(mesesDe2026[1].nombreCarpeta, "08 - Agosto");

    const diasDeSeptiembre = mesesDe2026[0].dias;
    afirmarIgual(diasDeSeptiembre.length, 2);
    afirmarIgual(diasDeSeptiembre[0].textoFecha, "2026-09-27");
    afirmarIgualComoJson(
        extraerIds(diasDeSeptiembre[0].notas),
        ["2026-09-27_15-00-00", "2026-09-27_09-00-00"]
    );
    afirmarIgual(diasDeSeptiembre[1].textoFecha, "2026-09-19");

    afirmarIgual(anios[1].meses[0].nombreCarpeta, "12 - Diciembre");
});

probar("agruparHistorial devuelve una lista vacía sin notas", function () {
    afirmarIgualComoJson(agruparHistorial([]), []);
});

probar("buscarTexto devuelve una coincidencia por línea con su número", function () {
    const notas = [crearNotaDePrueba("2026-09-27_09-00-00", "Pendientes\n- llamar al proveedor\n- pagar al proveedor")];
    const coincidencias = buscarTexto(notas, "proveedor");

    afirmarIgual(coincidencias.length, 2);
    afirmarIgual(coincidencias[0].numeroLinea, 2);
    afirmarIgual(coincidencias[0].textoLinea, "- llamar al proveedor");
    afirmarIgual(coincidencias[1].numeroLinea, 3);
});

probar("buscarTexto no distingue mayúsculas, también con acentos y ñ", function () {
    const notas = [crearNotaDePrueba("2026-09-27_09-00-00", "Reunión con el AÑO nuevo")];
    afirmarIgual(buscarTexto(notas, "REUNIÓN").length, 1);
    afirmarIgual(buscarTexto(notas, "año").length, 1);
});

probar("buscarTexto ordena de la nota más nueva a la más vieja e ignora eliminadas", function () {
    const notas = [
        crearNotaDePrueba("2026-09-20_09-00-00", "café viejo"),
        crearNotaDePrueba("2026-09-27_09-00-00", "café nuevo"),
        crearNotaDePrueba("2026-09-25_09-00-00", "café borrado", true)
    ];
    const coincidencias = buscarTexto(notas, "café");

    afirmarIgual(coincidencias.length, 2);
    afirmarIgual(coincidencias[0].nota.id, "2026-09-27_09-00-00");
    afirmarIgual(coincidencias[1].nota.id, "2026-09-20_09-00-00");
});

probar("buscarTexto sin patrón no devuelve nada", function () {
    const notas = [crearNotaDePrueba("2026-09-27_09-00-00", "algo")];
    afirmarIgualComoJson(buscarTexto(notas, ""), []);
});
