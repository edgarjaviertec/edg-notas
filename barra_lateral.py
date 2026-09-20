"""Sidebar: esta semana e historial. Ninguna es una carpeta real."""

from __future__ import annotations

from datetime import date, timedelta
from pathlib import Path

from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import QTreeWidget, QTreeWidgetItem, QVBoxLayout, QWidget

from boveda import Boveda, etiqueta_hora_nota
from editor import GestorDePestanas
from estilo import obtener_tema_actual
from fechas import calcular_ultimos_siete_dias
from iconos import cargar_icono

ROL_RUTA_ARCHIVO = Qt.ItemDataRole.UserRole
ROL_PESTANA_FANTASMA = Qt.ItemDataRole.UserRole + 1
COLOR_ACENTO_HOY = "#30d158"


class BarraLateral(QWidget):
    nota_seleccionada = Signal(Path)
    pestana_fantasma_seleccionada = Signal(object)

    def __init__(self, boveda: Boveda, gestor_pestanas: GestorDePestanas) -> None:
        super().__init__()
        self.boveda = boveda
        self.gestor_pestanas = gestor_pestanas
        self.setObjectName("barraLateral")

        self.arbol_semana = QTreeWidget()
        self.arbol_semana.setHeaderHidden(True)
        self.arbol_semana.itemClicked.connect(self._manejar_click_item)

        self.arbol_historial = QTreeWidget()
        self.arbol_historial.setHeaderHidden(True)
        self.arbol_historial.itemClicked.connect(self._manejar_click_item)

        disposicion = QVBoxLayout(self)
        disposicion.setContentsMargins(0, 0, 0, 0)
        disposicion.setSpacing(0)
        disposicion.addWidget(self.arbol_semana)
        disposicion.addWidget(self.arbol_historial, stretch=1)

        self.actualizar_semana()
        self.actualizar_historial()

    def _capturar_expandidos(self, arbol: QTreeWidget) -> set[tuple[str, ...]]:
        """Guarda qué carpetas están expandidas antes de reconstruir el árbol, identificándolas
        por su ruta de etiquetas (texto de cada nivel), ya que los QTreeWidgetItem se recrean
        desde cero en cada actualización y pierden su estado."""
        expandidos: set[tuple[str, ...]] = set()
        item_raiz = arbol.topLevelItem(0)
        if item_raiz is None:
            return expandidos
        self._recorrer_para_capturar(item_raiz, (), expandidos)
        return expandidos

    def _recorrer_para_capturar(
        self, item: QTreeWidgetItem, ruta: tuple[str, ...], expandidos: set[tuple[str, ...]]
    ) -> None:
        if item.isExpanded():
            expandidos.add(ruta)
        for indice in range(item.childCount()):
            hijo = item.child(indice)
            self._recorrer_para_capturar(hijo, (*ruta, hijo.text(0)), expandidos)

    def _restaurar_expandidos(self, arbol: QTreeWidget, expandidos: set[tuple[str, ...]]) -> None:
        item_raiz = arbol.topLevelItem(0)
        if item_raiz is None:
            return
        self._recorrer_para_restaurar(item_raiz, (), expandidos)

    def _recorrer_para_restaurar(
        self, item: QTreeWidgetItem, ruta: tuple[str, ...], expandidos: set[tuple[str, ...]]
    ) -> None:
        if ruta in expandidos:
            item.setExpanded(True)
        for indice in range(item.childCount()):
            hijo = item.child(indice)
            self._recorrer_para_restaurar(hijo, (*ruta, hijo.text(0)), expandidos)

    def _manejar_click_item(self, item: QTreeWidgetItem, columna: int) -> None:
        ruta = item.data(0, ROL_RUTA_ARCHIVO)
        if ruta is not None:
            self.nota_seleccionada.emit(Path(ruta))
            self.actualizar_seleccion_activa()
            return

        editor_fantasma = item.data(0, ROL_PESTANA_FANTASMA)
        if editor_fantasma is not None:
            self.pestana_fantasma_seleccionada.emit(editor_fantasma)
            self.actualizar_seleccion_activa()

    def actualizar_seleccion_activa(self, *_argumentos) -> None:
        """Resalta en ambos árboles la nota (o fantasma) de la pestaña activa, y limpia
        cualquier resaltado viejo que haya quedado de un click anterior."""
        editor = self.gestor_pestanas.editor_actual()
        self.arbol_semana.clearSelection()
        self.arbol_historial.clearSelection()
        if editor is None:
            return

        if editor.ruta_archivo is not None:
            self._seleccionar_item(self.arbol_semana, ROL_RUTA_ARCHIVO, str(editor.ruta_archivo))
            self._seleccionar_item(self.arbol_historial, ROL_RUTA_ARCHIVO, str(editor.ruta_archivo))
        else:
            self._seleccionar_item(self.arbol_semana, ROL_PESTANA_FANTASMA, editor, comparar_identidad=True)

    def _seleccionar_item(
        self, arbol: QTreeWidget, rol: int, valor: object, comparar_identidad: bool = False
    ) -> None:
        item_raiz = arbol.topLevelItem(0)
        if item_raiz is None:
            return
        item = self._buscar_item(item_raiz, rol, valor, comparar_identidad)
        if item is not None:
            item.setSelected(True)

    def _buscar_item(
        self, item: QTreeWidgetItem, rol: int, valor: object, comparar_identidad: bool
    ) -> QTreeWidgetItem | None:
        dato = item.data(0, rol)
        coincide = dato is valor if comparar_identidad else dato == valor
        if coincide:
            return item
        for indice in range(item.childCount()):
            encontrado = self._buscar_item(item.child(indice), rol, valor, comparar_identidad)
            if encontrado is not None:
                return encontrado
        return None

    def actualizar_semana(self) -> None:
        color_icono = obtener_tema_actual()["texto_tenue"]
        icono_carpeta_abierta = cargar_icono("folder-open", color_icono)
        icono_carpeta = cargar_icono("folder", color_icono)
        icono_nota = cargar_icono("file-text", color_icono)
        icono_hoy = cargar_icono("circle", COLOR_ACENTO_HOY, relleno=True)

        expandidos = self._capturar_expandidos(self.arbol_semana)
        self.arbol_semana.clear()
        item_raiz = QTreeWidgetItem(["ESTA SEMANA (Acceso Rápido)"])
        item_raiz.setIcon(0, icono_carpeta_abierta)
        self.arbol_semana.addTopLevelItem(item_raiz)
        item_raiz.setExpanded(True)

        hoy = date.today()
        ayer = hoy - timedelta(days=1)
        notas_por_dia = dict(self.boveda.listar_notas_semana())
        fantasmas_de_hoy = self.gestor_pestanas.fantasmas_abiertas()

        for fecha in calcular_ultimos_siete_dias(hoy):
            es_hoy = fecha == hoy
            notas = notas_por_dia.get(fecha, [])
            if not notas and not (es_hoy and fantasmas_de_hoy):
                continue

            if es_hoy:
                etiqueta_dia = f"{fecha.isoformat()}  [Hoy]"
            elif fecha == ayer:
                etiqueta_dia = f"{fecha.isoformat()}  [Ayer]"
            else:
                etiqueta_dia = fecha.isoformat()

            item_dia = QTreeWidgetItem([etiqueta_dia])
            item_dia.setIcon(0, icono_hoy if es_hoy else icono_carpeta)
            item_raiz.addChild(item_dia)
            item_dia.setExpanded(es_hoy)

            if es_hoy:
                for editor_fantasma in fantasmas_de_hoy:
                    item_fantasma = QTreeWidgetItem(["Sin título"])
                    item_fantasma.setIcon(0, icono_nota)
                    item_fantasma.setData(0, ROL_PESTANA_FANTASMA, editor_fantasma)
                    item_dia.addChild(item_fantasma)

            for nota in notas:
                item_nota = QTreeWidgetItem([etiqueta_hora_nota(nota)])
                item_nota.setIcon(0, icono_nota)
                item_nota.setData(0, ROL_RUTA_ARCHIVO, str(nota))
                item_dia.addChild(item_nota)

        self._restaurar_expandidos(self.arbol_semana, expandidos)
        self.actualizar_seleccion_activa()

    def actualizar_historial(self) -> None:
        color_icono = obtener_tema_actual()["texto_tenue"]
        icono_archivo_historial = cargar_icono("archive", color_icono)
        icono_carpeta = cargar_icono("folder", color_icono)
        icono_nota = cargar_icono("file-text", color_icono)

        expandidos = self._capturar_expandidos(self.arbol_historial)
        self.arbol_historial.clear()
        item_raiz = QTreeWidgetItem(["HISTORIAL (Archivo Completo)"])
        item_raiz.setIcon(0, icono_archivo_historial)
        self.arbol_historial.addTopLevelItem(item_raiz)

        for anio, meses in self.boveda.listar_estructura_historial():
            item_anio = QTreeWidgetItem([str(anio)])
            item_anio.setIcon(0, icono_carpeta)
            item_raiz.addChild(item_anio)
            for nombre_carpeta_mes, dias in meses:
                item_mes = QTreeWidgetItem([nombre_carpeta_mes])
                item_mes.setIcon(0, icono_carpeta)
                item_anio.addChild(item_mes)
                for nombre_carpeta_dia, notas in dias:
                    item_dia = QTreeWidgetItem([nombre_carpeta_dia])
                    item_dia.setIcon(0, icono_carpeta)
                    item_mes.addChild(item_dia)
                    for nota in notas:
                        item_nota = QTreeWidgetItem([etiqueta_hora_nota(nota)])
                        item_nota.setIcon(0, icono_nota)
                        item_nota.setData(0, ROL_RUTA_ARCHIVO, str(nota))
                        item_dia.addChild(item_nota)

        self._restaurar_expandidos(self.arbol_historial, expandidos)
        self.actualizar_seleccion_activa()
