"""Ventana principal: layout general, atajos de teclado, barra de estado, timer de medianoche."""

from __future__ import annotations

from datetime import date

from PySide6.QtCore import QTimer
from PySide6.QtGui import QGuiApplication, QKeySequence, QShortcut
from PySide6.QtWidgets import QHBoxLayout, QLabel, QMainWindow, QSplitter, QWidget

from barra_lateral import BarraLateral
from boveda import Boveda
from editor import GestorDePestanas
from estilo import obtener_hoja_estilo_actual, obtener_tema_actual
from iconos import cargar_icono

INTERVALO_CHEQUEO_MEDIANOCHE_MS = 30_000
TAMANO_ICONO_BARRA_ESTADO = 14

SECUENCIAS_ATAJOS = [
    ("Ctrl+N", "_crear_nota_nueva"),
    ("Ctrl+W", "_cerrar_pestana_actual"),
    ("Ctrl+Shift+T", "_reabrir_ultima_cerrada"),
    ("Ctrl+Tab", "_siguiente_pestana"),
    ("Ctrl+=", "_zoom_actual_aumentar"),
    ("Ctrl++", "_zoom_actual_aumentar"),
    ("Ctrl+-", "_zoom_actual_disminuir"),
    ("Ctrl+0", "_zoom_actual_restablecer"),
]


class EtiquetaConIcono(QWidget):
    """Un ícono seguido de texto, para usar en la barra de estado."""

    def __init__(self, nombre_icono: str) -> None:
        super().__init__()
        self.nombre_icono = nombre_icono

        self.etiqueta_icono = QLabel()
        self.etiqueta_texto = QLabel()

        disposicion = QHBoxLayout(self)
        disposicion.setContentsMargins(0, 0, 0, 0)
        disposicion.setSpacing(4)
        disposicion.addWidget(self.etiqueta_icono)
        disposicion.addWidget(self.etiqueta_texto)

    def establecer_texto(self, texto: str) -> None:
        self.etiqueta_texto.setText(texto)

    def actualizar_icono(self, color: str) -> None:
        icono = cargar_icono(self.nombre_icono, color)
        self.etiqueta_icono.setPixmap(icono.pixmap(TAMANO_ICONO_BARRA_ESTADO, TAMANO_ICONO_BARRA_ESTADO))


class VentanaPrincipal(QMainWindow):
    def __init__(self) -> None:
        super().__init__()
        self.setWindowTitle("EdgNotas")
        self.resize(1100, 700)

        self.boveda = Boveda()
        self.gestor_pestanas = GestorDePestanas(self.boveda)
        self.barra_lateral = BarraLateral(self.boveda, self.gestor_pestanas)
        self._editor_conectado = None

        divisor = QSplitter()
        divisor.addWidget(self.barra_lateral)
        divisor.addWidget(self.gestor_pestanas)
        divisor.setStretchFactor(1, 1)
        divisor.setSizes([260, 840])
        divisor.setHandleWidth(1)
        self.setCentralWidget(divisor)

        self.etiqueta_posicion_cursor = QLabel("Línea 1, Columna 1")
        self.etiqueta_modificacion = EtiquetaConIcono("clock")
        self.etiqueta_conteo = EtiquetaConIcono("square-pen")
        self.etiqueta_conteo.establecer_texto("0 palabras | 0 caracteres")
        self.etiqueta_modificacion.setVisible(False)
        self.statusBar().addWidget(self.etiqueta_posicion_cursor)
        self.statusBar().addPermanentWidget(self.etiqueta_modificacion)
        self.statusBar().addPermanentWidget(self.etiqueta_conteo)

        self.barra_lateral.nota_seleccionada.connect(self.gestor_pestanas.abrir_nota)
        self.barra_lateral.pestana_fantasma_seleccionada.connect(self.gestor_pestanas.setCurrentWidget)
        self.gestor_pestanas.currentChanged.connect(self._conectar_editor_actual)
        self.gestor_pestanas.currentChanged.connect(self.barra_lateral.actualizar_seleccion_activa)
        self.gestor_pestanas.pestanas_cambiaron.connect(self._refrescar_sidebar)
        self._conectar_editor_actual()

        self._dia_actual = date.today()
        self.temporizador_medianoche = QTimer(self)
        self.temporizador_medianoche.setInterval(INTERVALO_CHEQUEO_MEDIANOCHE_MS)
        self.temporizador_medianoche.timeout.connect(self._revisar_cambio_de_dia)
        self.temporizador_medianoche.start()

        self._atajos = self._crear_atajos()

        self._aplicar_tema()
        QGuiApplication.styleHints().colorSchemeChanged.connect(self._aplicar_tema)

    def _crear_atajos(self) -> list[QShortcut]:
        atajos = []
        for secuencia, nombre_metodo in SECUENCIAS_ATAJOS:
            atajo = QShortcut(QKeySequence(secuencia), self)
            atajo.activated.connect(getattr(self, nombre_metodo))
            atajos.append(atajo)
        return atajos

    def _crear_nota_nueva(self) -> None:
        self.gestor_pestanas.crear_pestana_fantasma()

    def _cerrar_pestana_actual(self) -> None:
        self.gestor_pestanas.cerrar_pestana_actual()

    def _reabrir_ultima_cerrada(self) -> None:
        self.gestor_pestanas.reabrir_ultima_cerrada()

    def _siguiente_pestana(self) -> None:
        self.gestor_pestanas.siguiente_pestana()

    def _zoom_actual_aumentar(self) -> None:
        self.gestor_pestanas.zoom_actual_aumentar()

    def _zoom_actual_disminuir(self) -> None:
        self.gestor_pestanas.zoom_actual_disminuir()

    def _zoom_actual_restablecer(self) -> None:
        self.gestor_pestanas.zoom_actual_restablecer()

    def _conectar_editor_actual(self, *_argumentos) -> None:
        editor = self.gestor_pestanas.editor_actual()
        if editor is self._editor_conectado:
            return
        if self._editor_conectado is not None:
            self._editor_conectado.cursorPositionChanged.disconnect(self._actualizar_barra_estado)
            self._editor_conectado.textChanged.disconnect(self._actualizar_barra_estado)
            self._editor_conectado.guardado_realizado.disconnect(self._actualizar_barra_estado)
        if editor is not None:
            editor.cursorPositionChanged.connect(self._actualizar_barra_estado)
            editor.textChanged.connect(self._actualizar_barra_estado)
            editor.guardado_realizado.connect(self._actualizar_barra_estado)
        self._editor_conectado = editor
        self._actualizar_barra_estado()

    def _actualizar_barra_estado(self) -> None:
        editor = self.gestor_pestanas.editor_actual()
        if editor is None:
            return
        cursor = editor.textCursor()
        linea = cursor.blockNumber() + 1
        columna = cursor.columnNumber() + 1
        self.etiqueta_posicion_cursor.setText(f"Línea {linea}, Columna {columna}")

        texto = editor.toPlainText()
        cantidad_palabras = len(texto.split())
        cantidad_caracteres = len(texto)
        self.etiqueta_conteo.establecer_texto(
            f"{cantidad_palabras} palabras | {cantidad_caracteres} caracteres"
        )

        if editor.fecha_ultima_modificacion is not None:
            fecha_hora = editor.fecha_ultima_modificacion.strftime("%Y-%m-%d %H:%M:%S")
            self.etiqueta_modificacion.establecer_texto(f"Modificado {fecha_hora}")
            self.etiqueta_modificacion.setVisible(True)
        else:
            self.etiqueta_modificacion.setVisible(False)

    def _revisar_cambio_de_dia(self) -> None:
        if date.today() != self._dia_actual:
            self._dia_actual = date.today()
            self.barra_lateral.actualizar_semana()
            self.barra_lateral.actualizar_historial()

    def _refrescar_sidebar(self, *_argumentos) -> None:
        self.barra_lateral.actualizar_semana()
        self.barra_lateral.actualizar_historial()

    def _aplicar_tema(self, *_argumentos) -> None:
        self.setStyleSheet(obtener_hoja_estilo_actual())
        color_icono = obtener_tema_actual()["texto_tenue"]
        self.etiqueta_modificacion.actualizar_icono(color_icono)
        self.etiqueta_conteo.actualizar_icono(color_icono)
        self.gestor_pestanas.actualizar_iconos_tema()
        self.barra_lateral.actualizar_semana()
        self.barra_lateral.actualizar_historial()
