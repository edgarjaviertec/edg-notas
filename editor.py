"""Editor de una nota: números de línea, zoom, y autoguardado atómico a disco."""

from __future__ import annotations

import logging
from datetime import date, datetime
from pathlib import Path

from PySide6.QtCore import QRect, QSize, Qt, QTimer, Signal
from PySide6.QtGui import QColor, QIcon, QPainter, QTextCursor
from PySide6.QtWidgets import QPlainTextEdit, QTabBar, QTabWidget, QToolButton, QWidget

from boveda import Boveda, escribir_archivo_atomico, etiqueta_hora_nota
from configuracion import cargar_configuracion, guardar_configuracion
from estilo import obtener_tema_actual
from iconos import cargar_icono

registrador = logging.getLogger("edgnotas")

INTERVALO_DEBOUNCE_MS = 500
INTERVALO_TECHO_MS = 3000
TAMANO_FUENTE_BASE = 13
TAMANO_FUENTE_MINIMO = 6
TAMANO_INDENTACION = 4


class AreaNumerosLinea(QWidget):
    """Columna que dibuja los números de línea al costado del editor."""

    def __init__(self, editor: EditorDeCodigo) -> None:
        super().__init__(editor)
        self.editor = editor

    def sizeHint(self) -> QSize:
        return QSize(self.editor.ancho_area_numeros(), 0)

    def paintEvent(self, evento) -> None:
        self.editor.dibujar_numeros_linea(evento)


class EditorDeCodigo(QPlainTextEdit):
    """Editor de una nota. Sin texto es una pestaña fantasma sin archivo; al escribir se
    crea el archivo real, y si se borra todo el texto vuelve a ser fantasma."""

    guardado_pendiente = Signal()
    guardado_realizado = Signal()
    nota_creada = Signal()
    nota_eliminada = Signal()

    def __init__(self, boveda: Boveda, tamano_fuente: int = TAMANO_FUENTE_BASE) -> None:
        super().__init__()
        self.boveda = boveda
        self.ruta_archivo: Path | None = None
        self.esta_sucio = False
        self.fecha_ultima_modificacion: datetime | None = None
        self.tamano_fuente = tamano_fuente

        self.area_numeros = AreaNumerosLinea(self)

        self.blockCountChanged.connect(self.actualizar_ancho_area_numeros)
        self.updateRequest.connect(self.actualizar_area_numeros)
        self.textChanged.connect(self.manejar_texto_modificado)

        self._temporizador_debounce = QTimer(self)
        self._temporizador_debounce.setSingleShot(True)
        self._temporizador_debounce.setInterval(INTERVALO_DEBOUNCE_MS)
        self._temporizador_debounce.timeout.connect(self.guardar_en_disco)

        self._temporizador_techo = QTimer(self)
        self._temporizador_techo.setSingleShot(True)
        self._temporizador_techo.setInterval(INTERVALO_TECHO_MS)
        self._temporizador_techo.timeout.connect(self.guardar_en_disco)

        self.actualizar_ancho_area_numeros()
        self._aplicar_tamano_fuente()

    # --- Números de línea ---------------------------------------------------

    def ancho_area_numeros(self) -> int:
        digitos = len(str(max(1, self.blockCount())))
        return 12 + self.fontMetrics().horizontalAdvance("9") * digitos

    def actualizar_ancho_area_numeros(self) -> None:
        self.setViewportMargins(self.ancho_area_numeros(), 0, 0, 0)

    def actualizar_area_numeros(self, rectangulo: QRect, dy: int) -> None:
        if dy:
            self.area_numeros.scroll(0, dy)
        else:
            self.area_numeros.update(0, rectangulo.y(), self.area_numeros.width(), rectangulo.height())
        if rectangulo.contains(self.viewport().rect()):
            self.actualizar_ancho_area_numeros()

    def resizeEvent(self, evento) -> None:
        super().resizeEvent(evento)
        rectangulo = self.contentsRect()
        self.area_numeros.setGeometry(
            QRect(rectangulo.left(), rectangulo.top(), self.ancho_area_numeros(), rectangulo.height())
        )

    def dibujar_numeros_linea(self, evento) -> None:
        tema = obtener_tema_actual()
        color_fondo_gutter = QColor(tema["fondo_editor"])
        color_texto_gutter = QColor(tema["texto_tenue"])

        pintor = QPainter(self.area_numeros)
        pintor.fillRect(evento.rect(), color_fondo_gutter)
        pintor.setFont(self.font())

        bloque = self.firstVisibleBlock()
        numero_bloque = bloque.blockNumber()
        parte_superior = int(self.blockBoundingGeometry(bloque).translated(self.contentOffset()).top())
        parte_inferior = parte_superior + int(self.blockBoundingRect(bloque).height())

        while bloque.isValid() and parte_superior <= evento.rect().bottom():
            if bloque.isVisible() and parte_inferior >= evento.rect().top():
                pintor.setPen(color_texto_gutter)
                pintor.drawText(
                    0,
                    parte_superior,
                    self.area_numeros.width() - 6,
                    self.fontMetrics().height(),
                    Qt.AlignmentFlag.AlignRight,
                    str(numero_bloque + 1),
                )

            bloque = bloque.next()
            parte_superior = parte_inferior
            parte_inferior = parte_superior + int(self.blockBoundingRect(bloque).height())
            numero_bloque += 1

    # --- Zoom -----------------------------------------------------------------

    def _aplicar_tamano_fuente(self) -> None:
        fuente = self.font()
        fuente.setFamily("SF Mono")
        fuente.setPointSize(self.tamano_fuente)
        self.setFont(fuente)
        self.actualizar_ancho_area_numeros()

    def establecer_tamano_fuente(self, tamano: int) -> None:
        self.tamano_fuente = tamano
        self._aplicar_tamano_fuente()

    # --- Indentación (Tab/Shift+Tab sobre selección indentan la línea entera) --

    def keyPressEvent(self, evento) -> None:
        if (
            evento.key() == Qt.Key.Key_Tab
            and evento.modifiers() == Qt.KeyboardModifier.NoModifier
            and self.textCursor().hasSelection()
        ):
            self._modificar_indentacion(agregar=True)
            return
        if evento.key() == Qt.Key.Key_Backtab:
            self._modificar_indentacion(agregar=False)
            return
        super().keyPressEvent(evento)

    def _modificar_indentacion(self, agregar: bool) -> None:
        cursor = self.textCursor()
        tenia_seleccion = cursor.hasSelection()
        primer_bloque, ultimo_bloque = self._bloques_afectados(cursor)
        columna_original = cursor.positionInBlock()

        cursor.beginEditBlock()
        cantidad_quitada = 0
        for numero_bloque in range(primer_bloque, ultimo_bloque + 1):
            cursor_linea = QTextCursor(self.document().findBlockByNumber(numero_bloque))
            if agregar:
                cursor_linea.insertText("\t")
            else:
                cantidad_quitada = self._quitar_indentacion_de_linea(cursor_linea)
        cursor.endEditBlock()

        if tenia_seleccion:
            self._seleccionar_bloques(primer_bloque, ultimo_bloque)
        else:
            cursor_final = QTextCursor(self.document().findBlockByNumber(primer_bloque))
            cursor_final.movePosition(
                QTextCursor.MoveOperation.Right,
                QTextCursor.MoveMode.MoveAnchor,
                max(0, columna_original - cantidad_quitada),
            )
            self.setTextCursor(cursor_final)

    def _bloques_afectados(self, cursor: QTextCursor) -> tuple[int, int]:
        """Determina qué líneas toca la selección. Si termina justo al inicio de una línea
        (sin incluir ningún carácter de ella), esa línea queda afuera."""
        cursor_temporal = QTextCursor(self.document())

        cursor_temporal.setPosition(cursor.selectionStart())
        primer_bloque = cursor_temporal.blockNumber()

        cursor_temporal.setPosition(cursor.selectionEnd())
        ultimo_bloque = cursor_temporal.blockNumber()
        if ultimo_bloque > primer_bloque and cursor_temporal.atBlockStart():
            ultimo_bloque -= 1

        return primer_bloque, ultimo_bloque

    def _quitar_indentacion_de_linea(self, cursor_linea: QTextCursor) -> int:
        """Saca hasta TAMANO_INDENTACION espacios (o un solo tab) del inicio de la línea."""
        texto = cursor_linea.block().text()
        cantidad_a_quitar = 0
        for caracter in texto[:TAMANO_INDENTACION]:
            if caracter == "\t":
                cantidad_a_quitar = max(cantidad_a_quitar, 1)
                break
            if caracter == " ":
                cantidad_a_quitar += 1
            else:
                break

        if cantidad_a_quitar == 0:
            return 0

        cursor_linea.movePosition(QTextCursor.MoveOperation.StartOfBlock)
        cursor_linea.movePosition(
            QTextCursor.MoveOperation.Right, QTextCursor.MoveMode.KeepAnchor, cantidad_a_quitar
        )
        cursor_linea.removeSelectedText()
        return cantidad_a_quitar

    def _seleccionar_bloques(self, primer_bloque: int, ultimo_bloque: int) -> None:
        documento = self.document()
        cursor = QTextCursor(documento.findBlockByNumber(primer_bloque))
        cursor.movePosition(QTextCursor.MoveOperation.StartOfBlock)
        cursor_final = QTextCursor(documento.findBlockByNumber(ultimo_bloque))
        cursor_final.movePosition(QTextCursor.MoveOperation.EndOfBlock)
        cursor.setPosition(cursor_final.position(), QTextCursor.MoveMode.KeepAnchor)
        self.setTextCursor(cursor)

    # --- Guardado -----------------------------------------------------------

    def cargar_desde_disco(self, ruta: Path) -> None:
        self.blockSignals(True)
        try:
            self.setPlainText(ruta.read_text(encoding="utf-8"))
        finally:
            self.blockSignals(False)
        self.ruta_archivo = ruta
        self.esta_sucio = False
        self.fecha_ultima_modificacion = datetime.fromtimestamp(ruta.stat().st_mtime)

    def manejar_texto_modificado(self) -> None:
        tiene_texto = bool(self.toPlainText())

        if tiene_texto and self.ruta_archivo is None:
            self._volverse_nota_real()
        elif not tiene_texto and self.ruta_archivo is not None:
            self._volver_a_fantasma()
            return

        self.esta_sucio = True
        self.guardado_pendiente.emit()
        self._temporizador_debounce.start()
        if not self._temporizador_techo.isActive():
            self._temporizador_techo.start()

    def _volverse_nota_real(self) -> None:
        self.ruta_archivo = self.boveda.crear_nota_nueva(date.today())
        self.nota_creada.emit()

    def _volver_a_fantasma(self) -> None:
        self._temporizador_debounce.stop()
        self._temporizador_techo.stop()
        self.boveda.eliminar_nota(self.ruta_archivo)
        self.ruta_archivo = None
        self.esta_sucio = False
        self.fecha_ultima_modificacion = None
        self.nota_eliminada.emit()

    def titulo_pestana(self) -> str:
        if self.ruta_archivo is None:
            return "Sin título"
        return etiqueta_hora_nota(self.ruta_archivo)

    def guardar_en_disco(self) -> None:
        self._temporizador_debounce.stop()
        self._temporizador_techo.stop()
        if self.ruta_archivo is None:
            return
        try:
            escribir_archivo_atomico(self.ruta_archivo, self.toPlainText())
        except OSError:
            registrador.exception("No se pudo guardar %s", self.ruta_archivo)
            return
        self.esta_sucio = False
        self.fecha_ultima_modificacion = datetime.now()
        self.guardado_realizado.emit()


class GestorDePestanas(QTabWidget):
    """Barra de pestañas multiarchivo con indicador de guardado (● / ✕) e historial de cierres."""

    pestanas_cambiaron = Signal()

    def __init__(self, boveda: Boveda) -> None:
        super().__init__()
        self.boveda = boveda
        self.pila_cerradas: list[Path] = []
        self.tamano_fuente_actual = cargar_configuracion().get("tamano_fuente", TAMANO_FUENTE_BASE)
        self.setMovable(True)
        self._abrir_estado_inicial()

    def _abrir_estado_inicial(self) -> None:
        notas_de_hoy = self.boveda.listar_notas_de_dia(date.today())
        if notas_de_hoy:
            self.abrir_nota(notas_de_hoy[0])
        else:
            self.crear_pestana_fantasma()

    def editor_actual(self) -> EditorDeCodigo | None:
        return self.currentWidget()

    def fantasmas_abiertas(self) -> list[EditorDeCodigo]:
        """Pestañas sin archivo real, en el orden en que están abiertas."""
        return [
            self.widget(indice) for indice in range(self.count()) if self.widget(indice).ruta_archivo is None
        ]

    def _indice_de_ruta(self, ruta: Path) -> int | None:
        for indice in range(self.count()):
            if self.widget(indice).ruta_archivo == ruta:
                return indice
        return None

    def abrir_nota(self, ruta: Path) -> None:
        indice_existente = self._indice_de_ruta(ruta)
        if indice_existente is not None:
            self.setCurrentIndex(indice_existente)
            return

        editor = EditorDeCodigo(self.boveda, self.tamano_fuente_actual)
        editor.cargar_desde_disco(ruta)
        indice = self._agregar_pestana(editor)
        self.setCurrentIndex(indice)

    def crear_pestana_fantasma(self) -> None:
        editor = EditorDeCodigo(self.boveda, self.tamano_fuente_actual)
        indice = self._agregar_pestana(editor)
        self.setCurrentIndex(indice)
        editor.setFocus()

    def _agregar_pestana(self, editor: EditorDeCodigo) -> int:
        indice = self.addTab(editor, self._icono_pestana(), editor.titulo_pestana())
        self._instalar_boton_pestana(indice, editor)
        editor.nota_creada.connect(lambda editor=editor: self._manejar_cambio_de_nota(editor))
        editor.nota_eliminada.connect(lambda editor=editor: self._manejar_cambio_de_nota(editor))
        self._actualizar_botones_de_todas_las_pestanas()
        self.pestanas_cambiaron.emit()
        return indice

    def _icono_pestana(self) -> QIcon:
        return cargar_icono("file-text", obtener_tema_actual()["texto_tenue"])

    def actualizar_iconos_tema(self) -> None:
        icono = self._icono_pestana()
        for indice in range(self.count()):
            self.setTabIcon(indice, icono)

    def _manejar_cambio_de_nota(self, editor: EditorDeCodigo) -> None:
        self._actualizar_titulo_pestana(editor)
        self._actualizar_boton_pestana(editor)
        self.pestanas_cambiaron.emit()

    def _actualizar_titulo_pestana(self, editor: EditorDeCodigo) -> None:
        indice = self.indexOf(editor)
        if indice != -1:
            self.setTabText(indice, editor.titulo_pestana())

    def _instalar_boton_pestana(self, indice: int, editor: EditorDeCodigo) -> None:
        boton = QToolButton()
        boton.setAutoRaise(True)
        boton.clicked.connect(lambda: self.cerrar_pestana(self.indexOf(editor)))
        self.tabBar().setTabButton(indice, QTabBar.ButtonPosition.RightSide, boton)

        editor.guardado_pendiente.connect(lambda: self._actualizar_boton_pestana(editor))
        editor.guardado_realizado.connect(lambda: self._actualizar_boton_pestana(editor))
        self._actualizar_boton_pestana(editor)

    def _actualizar_boton_pestana(self, editor: EditorDeCodigo) -> None:
        indice = self.indexOf(editor)
        if indice == -1:
            return
        boton = self.tabBar().tabButton(indice, QTabBar.ButtonPosition.RightSide)
        if boton is None:
            return
        es_unica_pestana_fantasma = self.count() == 1 and editor.ruta_archivo is None
        boton.setVisible(not es_unica_pestana_fantasma)
        boton.setText("●" if editor.esta_sucio else "✕")

    def _actualizar_botones_de_todas_las_pestanas(self) -> None:
        for indice in range(self.count()):
            self._actualizar_boton_pestana(self.widget(indice))

    def cerrar_pestana(self, indice: int) -> None:
        editor = self.widget(indice)
        if editor is None:
            return
        if editor.ruta_archivo is not None:
            self.pila_cerradas.append(editor.ruta_archivo)
        self.removeTab(indice)
        editor.deleteLater()
        if self.count() == 0:
            self.crear_pestana_fantasma()
        else:
            self._actualizar_botones_de_todas_las_pestanas()
            self.pestanas_cambiaron.emit()

    def cerrar_pestana_actual(self) -> None:
        self.cerrar_pestana(self.currentIndex())

    def reabrir_ultima_cerrada(self) -> None:
        while self.pila_cerradas:
            ruta = self.pila_cerradas.pop()
            if ruta.exists():
                self.abrir_nota(ruta)
                return

    def siguiente_pestana(self) -> None:
        if self.count() > 1:
            self.setCurrentIndex((self.currentIndex() + 1) % self.count())

    # --- Zoom compartido entre pestañas -------------------------------------

    def zoom_actual_aumentar(self) -> None:
        self._cambiar_tamano_fuente(self.tamano_fuente_actual + 1)

    def zoom_actual_disminuir(self) -> None:
        self._cambiar_tamano_fuente(max(TAMANO_FUENTE_MINIMO, self.tamano_fuente_actual - 1))

    def zoom_actual_restablecer(self) -> None:
        self._cambiar_tamano_fuente(TAMANO_FUENTE_BASE)

    def _cambiar_tamano_fuente(self, tamano: int) -> None:
        self.tamano_fuente_actual = tamano
        for indice in range(self.count()):
            self.widget(indice).establecer_tamano_fuente(tamano)
        guardar_configuracion({"tamano_fuente": tamano})
