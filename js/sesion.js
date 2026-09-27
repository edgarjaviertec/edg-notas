// Sesión del dueño con Firebase Auth (correo y contraseña).
// Firebase solo se descarga si en este navegador ya se inició sesión alguna vez:
// los visitantes de la demo nunca lo bajan.

const MODO_DEMO = "modo-demo";
const MODO_PERSONAL = "modo-personal";
// El navegador recordaba la sesión, pero Firebase ya no la reconoce (se cerró desde otro lado)
const SESION_VENCIDA = "sesion-vencida";

let appFirebase = null;
let autenticacionFirebase = null;

function cargarScriptFirebase() {
    return new Promise(function (resolver, rechazar) {
        const script = document.createElement("script");
        script.src = RUTA_SCRIPT_FIREBASE;
        script.onload = resolver;
        script.onerror = function () {
            rechazar(new Error("No se pudo cargar " + RUTA_SCRIPT_FIREBASE));
        };
        document.head.append(script);
    });
}

async function iniciarFirebase() {
    if (appFirebase !== null) {
        return;
    }
    await cargarScriptFirebase();
    appFirebase = Firebase.initializeApp(CONFIGURACION_FIREBASE);
    autenticacionFirebase = Firebase.getAuth(appFirebase);
}

// Firebase avisa el estado de la sesión una vez que lee lo que guardó; sin conexión también funciona
function esperarUsuarioFirebase() {
    return new Promise(function (resolver) {
        const dejarDeEscuchar = Firebase.onAuthStateChanged(autenticacionFirebase, function (usuario) {
            dejarDeEscuchar();
            resolver(usuario);
        });
    });
}

// Devuelve MODO_DEMO, MODO_PERSONAL o SESION_VENCIDA. Sin conexión se respeta el último modo:
// nunca se cae a la demo por error.
async function elegirModo() {
    if (localStorage.getItem(CLAVE_ULTIMO_MODO) !== MODO_PERSONAL) {
        return MODO_DEMO;
    }

    await iniciarFirebase();
    const usuario = await esperarUsuarioFirebase();
    if (usuario === null) {
        localStorage.removeItem(CLAVE_ULTIMO_MODO);
        return SESION_VENCIDA;
    }

    iniciarAlmacenRemoto(appFirebase);
    // Pide que el navegador no borre los datos de la app para liberar espacio. Puede negarse; no pasa nada.
    if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist();
    }
    return MODO_PERSONAL;
}

async function iniciarSesion(correo, contrasena) {
    await iniciarFirebase();
    await Firebase.signInWithEmailAndPassword(autenticacionFirebase, correo, contrasena);
    localStorage.setItem(CLAVE_ULTIMO_MODO, MODO_PERSONAL);
}

// Borra también la copia local de las notas: en una computadora ajena no debe quedar nada
async function cerrarSesion() {
    await borrarCopiaLocalRemota();
    await Firebase.signOut(autenticacionFirebase);
    localStorage.removeItem(CLAVE_ULTIMO_MODO);
}
