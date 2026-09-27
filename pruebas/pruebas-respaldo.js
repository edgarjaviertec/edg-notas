probar("construirArchivosRespaldo usa la ruta de carpetas de cada nota", function () {
    const notas = [
        { id: "2026-09-27_15-13-00", contenido: "Llamar al proveedor", eliminada: false, actualizadaEn: 1000 }
    ];
    const archivos = construirArchivosRespaldo(notas);
    const ruta = "2026/09 - Septiembre/2026-09-27/2026-09-27_15-13-00.md";

    afirmarIgualComoJson(Object.keys(archivos), [ruta]);
    afirmarIgual(archivos[ruta].contenido, "Llamar al proveedor");
    afirmarIgual(archivos[ruta].actualizadaEn, 1000);
});

probar("construirArchivosRespaldo deja fuera las notas eliminadas", function () {
    const notas = [
        { id: "2026-09-27_15-13-00", contenido: "queda", eliminada: false, actualizadaEn: 1 },
        { id: "2026-09-27_16-00-00", contenido: "", eliminada: true, actualizadaEn: 2 }
    ];
    afirmarIgual(Object.keys(construirArchivosRespaldo(notas)).length, 1);
});

probar("construirArchivosRespaldo sin notas no genera archivos", function () {
    afirmarIgualComoJson(construirArchivosRespaldo([]), {});
});

probar("crearNombreRespaldo lleva la fecha local", function () {
    afirmarIgual(crearNombreRespaldo(new Date(2026, 8, 27, 23, 30)), "edgnotas-respaldo-2026-09-27.zip");
});
