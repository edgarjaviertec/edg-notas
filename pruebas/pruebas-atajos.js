probar("buscarAccionDeAtajo reconoce los atajos con Alt", function () {
    afirmarIgual(buscarAccionDeAtajo("KeyN", false), "nuevaNota");
    afirmarIgual(buscarAccionDeAtajo("KeyW", false), "cerrarPestana");
    afirmarIgual(buscarAccionDeAtajo("KeyT", true), "reabrirPestana");
    afirmarIgual(buscarAccionDeAtajo("KeyF", true), "buscar");
    afirmarIgual(buscarAccionDeAtajo("KeyZ", false), "alternarAjusteLinea");
});

probar("buscarAccionDeAtajo distingue con y sin Shift", function () {
    afirmarIgual(buscarAccionDeAtajo("KeyT", false), null);
    afirmarIgual(buscarAccionDeAtajo("KeyF", false), null);
    afirmarIgual(buscarAccionDeAtajo("KeyN", true), null);
    afirmarIgual(buscarAccionDeAtajo("KeyZ", true), null);
    afirmarIgual(buscarAccionDeAtajo("KeyQ", false), null);
});

probar("buscarAccionDeAtajoTamanoFuente reconoce + y = para aumentar", function () {
    afirmarIgual(buscarAccionDeAtajoTamanoFuente("+"), "aumentarFuente");
    afirmarIgual(buscarAccionDeAtajoTamanoFuente("="), "aumentarFuente");
});

probar("buscarAccionDeAtajoTamanoFuente reconoce - y 0", function () {
    afirmarIgual(buscarAccionDeAtajoTamanoFuente("-"), "reducirFuente");
    afirmarIgual(buscarAccionDeAtajoTamanoFuente("0"), "restablecerFuente");
});

probar("buscarAccionDeAtajoTamanoFuente ignora otras teclas", function () {
    afirmarIgual(buscarAccionDeAtajoTamanoFuente("w"), null);
    afirmarIgual(buscarAccionDeAtajoTamanoFuente("1"), null);
});
