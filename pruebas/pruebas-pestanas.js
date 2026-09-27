probar("agregarPestana pone la nueva a la derecha de la activa", function () {
    afirmarIgualComoJson(agregarPestana(["a", "b", "c"], "a", "x"), ["a", "x", "b", "c"]);
    afirmarIgualComoJson(agregarPestana(["a", "b", "c"], "c", "x"), ["a", "b", "c", "x"]);
});

probar("agregarPestana va al final si no hay activa", function () {
    afirmarIgualComoJson(agregarPestana([], null, "x"), ["x"]);
    afirmarIgualComoJson(agregarPestana(["a"], null, "x"), ["a", "x"]);
});

probar("agregarPestana no duplica una pestaña ya abierta", function () {
    afirmarIgualComoJson(agregarPestana(["a", "b"], "a", "b"), ["a", "b"]);
});

probar("agregarPestana no cambia la lista original", function () {
    const pestanas = ["a", "b"];
    agregarPestana(pestanas, "a", "x");
    afirmarIgualComoJson(pestanas, ["a", "b"]);
});

probar("quitarPestana quita solo esa", function () {
    afirmarIgualComoJson(quitarPestana(["a", "b", "c"], "b"), ["a", "c"]);
    afirmarIgualComoJson(quitarPestana(["a"], "z"), ["a"]);
});

probar("elegirPestanaVecina prefiere la de la derecha", function () {
    afirmarIgual(elegirPestanaVecina(["a", "b", "c"], "b"), "c");
    afirmarIgual(elegirPestanaVecina(["a", "b", "c"], "a"), "b");
});

probar("elegirPestanaVecina usa la izquierda si se cierra la última", function () {
    afirmarIgual(elegirPestanaVecina(["a", "b", "c"], "c"), "b");
});

probar("elegirPestanaVecina devuelve null si no queda ninguna", function () {
    afirmarIgual(elegirPestanaVecina(["a"], "a"), null);
    afirmarIgual(elegirPestanaVecina(["a"], "z"), null);
});

probar("tomarUltimaPestanaCerrada saca la última cerrada (LIFO)", function () {
    const resultado = tomarUltimaPestanaCerrada(["a", "b", "c"], ["a", "b", "c"], []);
    afirmarIgual(resultado.id, "c");
    afirmarIgualComoJson(resultado.pilaRestante, ["a", "b"]);
});

probar("tomarUltimaPestanaCerrada salta eliminadas y ya abiertas", function () {
    const resultado = tomarUltimaPestanaCerrada(["a", "b", "c", "d"], ["a", "b", "d"], ["d"]);
    afirmarIgual(resultado.id, "b");
    afirmarIgualComoJson(resultado.pilaRestante, ["a"]);
});

probar("tomarUltimaPestanaCerrada devuelve null con la pila vacía o sin opciones", function () {
    afirmarIgual(tomarUltimaPestanaCerrada([], [], []).id, null);
    const resultado = tomarUltimaPestanaCerrada(["a"], [], []);
    afirmarIgual(resultado.id, null);
    afirmarIgualComoJson(resultado.pilaRestante, []);
});
