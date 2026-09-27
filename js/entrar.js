// Formulario de entrar.html. Firebase se carga al enviar, no al abrir la página.

const MENSAJES_ERROR_ENTRAR = {
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/invalid-email": "Ese correo no es válido.",
    "auth/user-disabled": "Esta cuenta está desactivada.",
    "auth/too-many-requests": "Demasiados intentos. Espera unos minutos y vuelve a probar.",
    "auth/network-request-failed": "Sin conexión. Revisa tu internet y vuelve a probar."
};
const MENSAJE_ERROR_ENTRAR_GENERICO = "No se pudo entrar. Vuelve a probar.";

function mostrarErrorEntrar(texto) {
    const mensaje = document.getElementById("mensaje-error");
    mensaje.textContent = texto;
    mensaje.hidden = texto === "";
}

function marcarEntrando(estaEntrando) {
    const boton = document.getElementById("boton-entrar");
    boton.disabled = estaEntrando;
    if (estaEntrando) {
        boton.textContent = "Entrando…";
    } else {
        boton.textContent = "Entrar";
    }
}

async function alEnviarFormularioEntrar(evento) {
    evento.preventDefault();
    mostrarErrorEntrar("");
    marcarEntrando(true);

    const correo = document.getElementById("campo-correo").value.trim();
    const contrasena = document.getElementById("campo-contrasena").value;
    try {
        await iniciarSesion(correo, contrasena);
    } catch (error) {
        let mensaje = MENSAJES_ERROR_ENTRAR[error.code];
        if (mensaje === undefined) {
            console.error(error);
            mensaje = MENSAJE_ERROR_ENTRAR_GENERICO;
        }
        mostrarErrorEntrar(mensaje);
        marcarEntrando(false);
        return;
    }
    // replace: que "atrás" no regrese al formulario
    location.replace("./");
}

// Si en este navegador ya hay sesión, no hay nada que hacer aquí
if (localStorage.getItem(CLAVE_ULTIMO_MODO) === MODO_PERSONAL) {
    location.replace("./");
}
document.getElementById("formulario-entrar").addEventListener("submit", alEnviarFormularioEntrar);
