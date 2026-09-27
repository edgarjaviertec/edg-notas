// Notas de ejemplo para quien entra sin sesión. Se calculan a partir de hoy
// para que siempre haya algo en Hoy, en Esta semana y en el Historial.

const DIAS_ATRAS_NOTA_SEMANA = 3;
const DIAS_ATRAS_NOTA_VIEJA = 30;

function fechaConHora(fecha, horas, minutos) {
    return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), horas, minutos, 0);
}

function crearNotasEjemplo(hoy) {
    const ayer = restarDias(hoy, 1);
    const haceUnosDias = restarDias(hoy, DIAS_ATRAS_NOTA_SEMANA);
    const haceUnMes = restarDias(hoy, DIAS_ATRAS_NOTA_VIEJA);

    return [
        {
            id: crearIdNota(fechaConHora(hoy, 9, 15)),
            contenido: "Bienvenida a EdgNotas\n\n" +
                "Esto es una demo: tus notas viven solo en este navegador y pueden borrarse.\n\n" +
                "Cada día tiene sus propias notas. Con + creas otra.\n" +
                "Se guardan solas mientras escribes."
        },
        {
            id: crearIdNota(fechaConHora(hoy, 8, 0)),
            contenido: "Atajos en escritorio\n\n" +
                "Alt+N        nueva nota\n" +
                "Alt+W        cerrar pestaña\n" +
                "Alt+Shift+T  reabrir la última pestaña cerrada\n" +
                "Alt+Shift+F  buscar en todas las notas"
        },
        {
            id: crearIdNota(fechaConHora(ayer, 18, 30)),
            contenido: "Pendientes\n\n- Revisar la propuesta\n- Llamar al proveedor\n- Comprar café"
        },
        {
            id: crearIdNota(fechaConHora(haceUnosDias, 10, 0)),
            contenido: "Cómo se organizan las notas\n\n" +
                "Esta semana muestra los últimos siete días que tienen notas.\n" +
                "Historial guarda todo, por año, mes y día."
        },
        {
            id: crearIdNota(fechaConHora(haceUnMes, 11, 45)),
            contenido: "Una nota de hace un mes\n\n" +
                "Las notas viejas se encuentran en Historial o buscando su texto."
        }
    ];
}

// Solo cuando la base se acaba de crear: si el visitante borra todas sus notas no reaparecen,
// pero si el navegador borró la base, la demo vuelve a tener ejemplos
async function sembrarDemoSiHaceFalta(hoy) {
    if (!(await laBaseDemoEsNueva())) {
        return;
    }
    for (const nota of crearNotasEjemplo(hoy)) {
        await almacenLocal.guardarNota(nota.id, nota.contenido);
    }
}

async function reiniciarDemo(hoy) {
    await borrarBaseDemo();
    await sembrarDemoSiHaceFalta(hoy);
}
