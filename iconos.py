"""Carga íconos SVG (Lucide) desde la carpeta svg/ y los pinta del color pedido."""

from __future__ import annotations

from pathlib import Path

from PySide6.QtCore import QByteArray, QSize, Qt
from PySide6.QtGui import QIcon, QPainter, QPixmap
from PySide6.QtSvg import QSvgRenderer

CARPETA_ICONOS = Path(__file__).parent / "svg"
TAMANO_ICONO = 16


def cargar_icono(nombre: str, color: str, relleno: bool = False) -> QIcon:
    """Carga svg/<nombre>.svg y lo pinta de `color`. `relleno=True` lo rellena en vez de
    dejarlo como contorno (los SVG de Lucide traen fill="none" por defecto)."""
    contenido_svg = (CARPETA_ICONOS / f"{nombre}.svg").read_text(encoding="utf-8")
    contenido_svg = contenido_svg.replace("currentColor", color)
    if relleno:
        contenido_svg = contenido_svg.replace('fill="none"', f'fill="{color}"')

    renderizador = QSvgRenderer(QByteArray(contenido_svg.encode("utf-8")))
    pixmap = QPixmap(QSize(TAMANO_ICONO, TAMANO_ICONO))
    pixmap.fill(Qt.GlobalColor.transparent)
    pintor = QPainter(pixmap)
    renderizador.render(pintor)
    pintor.end()
    return QIcon(pixmap)
