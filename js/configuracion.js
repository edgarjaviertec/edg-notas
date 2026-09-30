// Emojis como iconos en la v1. En la v2 se cambian por SVG tocando solo este objeto.
// Las claves coinciden con los atributos data-icono de index.html.
const ICONOS = {
    hoy: "☀️",
    semana: "📅",
    historial: "🗂️",
    nuevaNota: "➕",
    buscar: "🔍",
    volver: "‹",
    eliminar: "🗑️",
    sincronizado: "✓",
    sinConexion: "⚠️"
};

// Debe coincidir con el @media (min-width: 768px) de css/estilos.css
const ANCHO_ESCRITORIO = 768;

// Tamaño de letra del editor, en px. La base debe coincidir con --tamano-texto-editor de css/estilos.css
const TAMANO_FUENTE_EDITOR_BASE = 16;
const TAMANO_FUENTE_EDITOR_MINIMO = 10;
const TAMANO_FUENTE_EDITOR_MAXIMO = 32;
const PASO_TAMANO_FUENTE_EDITOR = 1;

const ESPERA_AUTOGUARDADO_MS = 2000;
// Aunque no se deje de teclear, se fuerza una escritura cada este tiempo
const TECHO_AUTOGUARDADO_MS = 10000;
const DURACION_AVISO_DESHACER_MS = 5000;
// Al volver a la app se piden cambios de otros dispositivos, pero no más seguido que esto
const ESPERA_MINIMA_ENTRE_SINCRONIZACIONES_MS = 60000;

const NOMBRE_BASE_DEMO = "edg-notas-demo";
const VERSION_BASE_DEMO = 1;
const ALMACEN_NOTAS_DEMO = "notas";

const COLECCION_NOTAS = "notas";
const RUTA_SCRIPT_FIREBASE = "js/externos/firebase.js";

const CLAVE_ULTIMA_SINCRONIZACION = "edg-notas:ultima-sincronizacion";
const CLAVE_ULTIMO_MODO = "edg-notas:ultimo-modo";
const CLAVE_TAMANO_FUENTE_EDITOR = "edg-notas:tamano-fuente-editor";

// Valores públicos por diseño: la seguridad está en reglas-firestore.rules.
// Se llenan al crear el proyecto (ver configurar-firebase.md). Las claves las define Firebase.
const CONFIGURACION_FIREBASE = {
    apiKey: "AIzaSyCPa67GwxSIMVQzA4yScqJSvL1NsvBMEXE",
    authDomain: "edg-notas.firebaseapp.com",
    projectId: "edg-notas",
    storageBucket: "edg-notas.firebasestorage.app",
    messagingSenderId: "90350547720",
    appId: "1:90350547720:web:68528622616d7e8b7c32bd"
};
