// Exporta todas las notas a un .zip con la misma estructura de carpetas que la app
// de escritorio: 2026/09 - Septiembre/2026-09-27/2026-09-27_15-13-00.md

// { ruta: { contenido, actualizadaEn } } solo con las notas visibles (sin eliminadas)
function construirArchivosRespaldo(notas) {
    const archivos = {};
    for (const nota of prepararNotasVisibles(notas)) {
        archivos[construirRutaNota(nota.id)] = {
            contenido: nota.contenido,
            actualizadaEn: nota.actualizadaEn
        };
    }
    return archivos;
}

function crearNombreRespaldo(fecha) {
    return "edgnotas-respaldo-" + formatearFecha(fecha) + ".zip";
}

// La fecha de modificación de cada archivo es la de la nota: así Finder las ordena bien
function crearZipRespaldo(notas) {
    const archivosZip = {};
    const archivos = construirArchivosRespaldo(notas);
    for (const [ruta, archivo] of Object.entries(archivos)) {
        const opciones = { mtime: new Date(archivo.actualizadaEn) };
        archivosZip[ruta] = [fflate.strToU8(archivo.contenido), opciones];
    }
    return fflate.zipSync(archivosZip);
}

function descargarRespaldo(notas, fecha) {
    const blob = new Blob([crearZipRespaldo(notas)], { type: "application/zip" });
    const direccion = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = direccion;
    enlace.download = crearNombreRespaldo(fecha);
    enlace.click();
    // Se libera después: si se libera en el acto, algunos navegadores cancelan la descarga
    setTimeout(function () {
        URL.revokeObjectURL(direccion);
    }, 1000);
}
