const resultadosPruebas = {
    pasaron: 0,
    fallaron: 0
};

function probar(nombre, funcionPrueba) {
    try {
        funcionPrueba();
        registrarResultado(nombre, true, "");
    } catch (error) {
        registrarResultado(nombre, false, error.message);
    }
}

function afirmarIgual(obtenido, esperado) {
    if (obtenido === esperado) {
        return;
    }
    throw new Error("se esperaba " + JSON.stringify(esperado) + " pero se obtuvo " + JSON.stringify(obtenido));
}

// Para listas y objetos: === compara referencias, no contenido
function afirmarIgualComoJson(obtenido, esperado) {
    afirmarIgual(JSON.stringify(obtenido), JSON.stringify(esperado));
}

function registrarResultado(nombre, paso, detalle) {
    const elementoResultado = document.createElement("li");
    if (paso) {
        resultadosPruebas.pasaron += 1;
        elementoResultado.textContent = "PASA  " + nombre;
    } else {
        resultadosPruebas.fallaron += 1;
        elementoResultado.textContent = "FALLA " + nombre + ": " + detalle;
    }
    document.getElementById("lista-resultados").append(elementoResultado);

    const resumen = resultadosPruebas.pasaron + " pasaron, " + resultadosPruebas.fallaron + " fallaron";
    document.getElementById("resumen-pruebas").textContent = resumen;
    // También en consola, para revisar las pruebas desde un navegador sin interfaz
    console.log(elementoResultado.textContent);
}
