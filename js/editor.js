// Un solo editor de CodeMirror para toda la app: se crea una vez y al abrir otra nota
// solo se cambia su estado (así no se pierde el DOM, y el deshacer no mezcla notas).

let vistaEditor = null;
let mostrarNumerosLinea = true;
let opcionesEditor = null;
const compartimentoNumerosLinea = new CodeMirror.Compartment();

// Solo variables de estilos.css: el tema claro/oscuro cambia sin tocar JS.
// Va aquí y no en el CSS porque los estilos que inyecta CodeMirror ganan en especificidad.
const TEMA_EDITOR = CodeMirror.EditorView.theme({
    "&": {
        height: "100%",
        color: "var(--color-texto)",
        backgroundColor: "var(--color-fondo)",
        fontSize: "var(--tamano-texto-editor)"
    },
    "&.cm-focused": {
        outline: "none"
    },
    ".cm-scroller": {
        fontFamily: "var(--fuente-mono)",
        lineHeight: "var(--interlineado-editor)"
    },
    ".cm-content": {
        padding: "var(--espacio-4) 0",
        caretColor: "var(--color-acento)"
    },
    ".cm-line": {
        padding: "0 var(--espacio-4)"
    },
    ".cm-gutters": {
        backgroundColor: "var(--color-fondo)",
        color: "var(--color-texto-tenue)",
        border: "none"
    },
    ".cm-activeLine, .cm-activeLineGutter": {
        backgroundColor: "var(--color-linea-activa)"
    },
    ".cm-cursor, .cm-dropCursor": {
        borderLeftColor: "var(--color-acento)"
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
        backgroundColor: "var(--color-seleccion)"
    },
    ".cm-placeholder": {
        color: "var(--color-texto-tenue)"
    }
});

function crearExtensionNumerosLinea(mostrar) {
    if (!mostrar) {
        return [];
    }
    return [CodeMirror.lineNumbers(), CodeMirror.highlightActiveLineGutter()];
}

function crearEstadoEditor(contenido) {
    const atajos = [...CodeMirror.defaultKeymap, ...CodeMirror.historyKeymap, CodeMirror.indentWithTab];

    return CodeMirror.EditorState.create({
        doc: contenido,
        extensions: [
            compartimentoNumerosLinea.of(crearExtensionNumerosLinea(mostrarNumerosLinea)),
            CodeMirror.history(),
            CodeMirror.drawSelection(),
            CodeMirror.highlightActiveLine(),
            CodeMirror.keymap.of(atajos),
            CodeMirror.EditorView.lineWrapping,
            CodeMirror.placeholder("Escribe aquí…"),
            TEMA_EDITOR,
            // setState() no dispara este aviso: solo lo hace lo que escribe el usuario
            CodeMirror.EditorView.updateListener.of(function (actualizacion) {
                if (actualizacion.docChanged) {
                    opcionesEditor.alCambiar(actualizacion.state.doc.toString());
                }
            }),
            CodeMirror.EditorView.domEventHandlers({
                focus: function () {
                    opcionesEditor.alEnfocar();
                },
                blur: function () {
                    opcionesEditor.alDesenfocar();
                }
            })
        ]
    });
}

// opciones: { alCambiar(contenido), alEnfocar(), alDesenfocar() }
function crearEditor(contenedor, opciones) {
    opcionesEditor = opciones;
    vistaEditor = new CodeMirror.EditorView({
        parent: contenedor,
        state: crearEstadoEditor("")
    });
}

function cargarContenidoEnEditor(contenido) {
    vistaEditor.setState(crearEstadoEditor(contenido));
}

function enfocarEditor() {
    vistaEditor.focus();
}

// Selecciona la línea y la deja al centro de la vista (al abrir un resultado de búsqueda).
// Si la nota cambió y ya no tiene tantas líneas, va a la última.
function irALineaEnEditor(numeroLinea) {
    const documento = vistaEditor.state.doc;
    const linea = documento.line(Math.min(numeroLinea, documento.lines));
    vistaEditor.dispatch({
        selection: { anchor: linea.from, head: linea.to },
        effects: CodeMirror.EditorView.scrollIntoView(linea.from, { y: "center" })
    });
}

function cambiarNumerosLinea(mostrar) {
    mostrarNumerosLinea = mostrar;
    vistaEditor.dispatch({
        effects: compartimentoNumerosLinea.reconfigure(crearExtensionNumerosLinea(mostrar))
    });
}
