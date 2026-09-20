"""Ventana modal de búsqueda de texto en todas las notas, estilo "Find in Path"."""

from __future__ import annotations

from PySide6.QtCore import QEvent, Qt, QTimer
from PySide6.QtGui import QColor, QTextCursor, QTextDocument
from PySide6.QtWidgets import (
    QCheckBox,
    QDialog,
    QHBoxLayout,
    QLineEdit,
    QListWidget,
    QListWidgetItem,
    QPlainTextEdit,
    QSplitter,
    QTextEdit,
    QVBoxLayout,
)

from boveda import Boveda, CoincidenciaBusqueda
from editor import EditorDeCodigo, GestorDePestanas
from estilo import obtener_tema_actual

INTERVALO_DEBOUNCE_BUSQUEDA_MS = 500
ROL_COINCIDENCIA = Qt.ItemDataRole.UserRole


class VentanaBusqueda(QDialog):
    def __init__(self, boveda: Boveda, gestor_pestanas: GestorDePestanas) -> None:
        super().__init__()
        self.boveda = boveda
        self.gestor_pestanas = gestor_pestanas

        self.setWindowTitle("Buscar en notas")
        self.resize(700, 500)

        self.campo_busqueda = QLineEdit()
        self.campo_busqueda.setPlaceholderText("Buscar texto en las notas…")
        self.campo_busqueda.installEventFilter(self)

        self.casilla_sensible_mayusculas = QCheckBox("Coincidir mayúsculas y minúsculas")

        self.lista_coincidencias = QListWidget()
        self.lista_coincidencias.currentItemChanged.connect(self._actualizar_preview)
        self.lista_coincidencias.itemDoubleClicked.connect(self._abrir_nota_seleccionada)

        self.preview = EditorDeCodigo(boveda)
        self.preview.setReadOnly(True)
        # El Tab con selección de EditorDeCodigo modifica el documento vía QTextCursor
        # incluso en modo solo lectura (setReadOnly no lo bloquea). Desconectamos el
        # autoguardado para que un preview nunca pueda terminar escribiendo a disco.
        self.preview.textChanged.disconnect(self.preview.manejar_texto_modificado)

        divisor = QSplitter(Qt.Orientation.Vertical)
        divisor.addWidget(self.lista_coincidencias)
        divisor.addWidget(self.preview)
        divisor.setStretchFactor(0, 1)
        divisor.setStretchFactor(1, 1)

        fila_busqueda = QHBoxLayout()
        fila_busqueda.addWidget(self.campo_busqueda, stretch=1)
        fila_busqueda.addWidget(self.casilla_sensible_mayusculas)

        disposicion = QVBoxLayout(self)
        disposicion.addLayout(fila_busqueda)
        disposicion.addWidget(divisor, stretch=1)

        self._temporizador_debounce = QTimer(self)
        self._temporizador_debounce.setSingleShot(True)
        self._temporizador_debounce.setInterval(INTERVALO_DEBOUNCE_BUSQUEDA_MS)
        self._temporizador_debounce.timeout.connect(self._ejecutar_busqueda)

        self.campo_busqueda.textChanged.connect(lambda _texto: self._temporizador_debounce.start())
        self.casilla_sensible_mayusculas.toggled.connect(self._ejecutar_busqueda)

        self.campo_busqueda.setFocus()

    def eventFilter(self, objeto, evento) -> bool:
        if objeto is self.campo_busqueda and evento.type() == QEvent.Type.KeyPress:
            tecla = evento.key()
            if tecla in (Qt.Key.Key_Down, Qt.Key.Key_Up):
                self._mover_seleccion(1 if tecla == Qt.Key.Key_Down else -1)
                return True
        return super().eventFilter(objeto, evento)

    def _mover_seleccion(self, direccion: int) -> None:
        cantidad = self.lista_coincidencias.count()
        if cantidad == 0:
            return
        fila_actual = self.lista_coincidencias.currentRow()
        if fila_actual == -1:
            self.lista_coincidencias.setCurrentRow(0)
            return
        fila_nueva = max(0, min(cantidad - 1, fila_actual + direccion))
        self.lista_coincidencias.setCurrentRow(fila_nueva)

    def _ejecutar_busqueda(self) -> None:
        patron = self.campo_busqueda.text()
        coincidencias = self.boveda.buscar_texto(patron, self.casilla_sensible_mayusculas.isChecked())
        self._poblar_lista(coincidencias)

    def _poblar_lista(self, coincidencias: list[CoincidenciaBusqueda]) -> None:
        self.lista_coincidencias.clear()
        for coincidencia in coincidencias:
            item = QListWidgetItem(
                f"{coincidencia.texto_linea.strip()}\n"
                f"{coincidencia.ruta.stem} · línea {coincidencia.numero_linea}"
            )
            item.setData(ROL_COINCIDENCIA, coincidencia)
            self.lista_coincidencias.addItem(item)

        if self.lista_coincidencias.count() > 0:
            self.lista_coincidencias.setCurrentRow(0)

    def _actualizar_preview(self, item_actual: QListWidgetItem | None, _item_anterior) -> None:
        if item_actual is None:
            self.preview.clear()
            self.preview.setExtraSelections([])
            return
        coincidencia = item_actual.data(ROL_COINCIDENCIA)
        self.preview.cargar_desde_disco(coincidencia.ruta)
        self._resaltar_y_centrar(self.preview, coincidencia)

    def _resaltar_y_centrar(self, editor: QPlainTextEdit, coincidencia: CoincidenciaBusqueda) -> None:
        patron = self.campo_busqueda.text()
        sensible_a_mayusculas = self.casilla_sensible_mayusculas.isChecked()
        color = obtener_tema_actual()["resaltado_busqueda"]

        resaltados = self._construir_resaltados(editor.document(), patron, sensible_a_mayusculas, color)
        editor.setExtraSelections(resaltados)

        bloque = editor.document().findBlockByNumber(coincidencia.numero_linea - 1)
        editor.setTextCursor(QTextCursor(bloque))
        editor.ensureCursorVisible()

    def _construir_resaltados(
        self, documento: QTextDocument, patron: str, sensible_a_mayusculas: bool, color: str
    ) -> list[QTextEdit.ExtraSelection]:
        if not patron:
            return []

        # QTextDocument.FindFlags() sin argumentos rompe en el binario compilado con
        # Nuitka (le llega None en vez de 0 como valor por defecto y explota con
        # "None is not a valid QTextDocument.FindFlag"). Pasar 0 explícito lo evita.
        opciones = QTextDocument.FindFlags(0)
        if sensible_a_mayusculas:
            opciones |= QTextDocument.FindFlag.FindCaseSensitively

        resaltados = []
        cursor = documento.find(patron, 0, opciones)
        while not cursor.isNull():
            seleccion = QTextEdit.ExtraSelection()
            seleccion.cursor = cursor
            seleccion.format.setBackground(QColor(color))
            resaltados.append(seleccion)
            cursor = documento.find(patron, cursor, opciones)
        return resaltados

    def _abrir_nota_seleccionada(self, item: QListWidgetItem) -> None:
        coincidencia = item.data(ROL_COINCIDENCIA)
        self.gestor_pestanas.abrir_nota(coincidencia.ruta)
        editor_actual = self.gestor_pestanas.editor_actual()
        if editor_actual is not None:
            self._resaltar_y_centrar(editor_actual, coincidencia)
            self._limpiar_resaltado_en_proximo_cambio(editor_actual)
        self.accept()

    def _limpiar_resaltado_en_proximo_cambio(self, editor: QPlainTextEdit) -> None:
        """El resaltado de búsqueda es una capa visual independiente del texto (ExtraSelections):
        no se borra sola cuando el usuario edita la nota, así que la limpiamos apenas escribe algo."""

        def limpiar() -> None:
            editor.setExtraSelections([])
            editor.textChanged.disconnect(limpiar)

        editor.textChanged.connect(limpiar)
