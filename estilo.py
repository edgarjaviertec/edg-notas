"""Temas oscuro y claro, y generación de la hoja de estilo (QSS). Inspirados en Sublime Text."""

from __future__ import annotations

from PySide6.QtCore import Qt
from PySide6.QtGui import QGuiApplication

TEMA_OSCURO = {
    "fondo_sidebar": "#252526",
    "fondo_editor": "#2b2f33",
    "texto": "#d4d4d4",
    "texto_tenue": "#6e6e6e",
    "borde": "#1a1a1a",
    "resaltado_fila": "#3a3d41",
    "seleccion_texto": "#3a4b5c",
}

TEMA_CLARO = {
    "fondo_sidebar": "#eeeeee",
    "fondo_editor": "#ffffff",
    "texto": "#1e1e1e",
    "texto_tenue": "#9a9a9a",
    "borde": "#d0d0d0",
    "resaltado_fila": "#dcdcdc",
    "seleccion_texto": "#cce4ff",
}


def generar_hoja_estilo(tema: dict) -> str:
    return f"""
    QMainWindow, QWidget {{
        background-color: {tema["fondo_sidebar"]};
        color: {tema["texto"]};
        font-family: "SF Pro Text", -apple-system, sans-serif;
    }}

    QWidget#barraLateral {{
        background-color: {tema["fondo_sidebar"]};
    }}

    QSplitter::handle {{
        background-color: {tema["borde"]};
    }}

    QTreeWidget {{
        background-color: {tema["fondo_sidebar"]};
        border: none;
        outline: none;
    }}

    QTreeWidget::item {{
        padding: 3px 0;
    }}

    QTreeWidget::item:selected {{
        background-color: {tema["resaltado_fila"]};
        color: {tema["texto"]};
    }}

    QPlainTextEdit {{
        background-color: {tema["fondo_editor"]};
        color: {tema["texto"]};
        border-top: none;
        font-family: "SF Mono", Menlo, monospace;
        selection-background-color: {tema["seleccion_texto"]};
    }}

    QTabWidget::pane {{
        border: none;
        background-color: {tema["fondo_editor"]};
    }}

    QTabWidget::tab-bar {{
        alignment: left;
    }}

    QTabBar {{
        background-color: {tema["fondo_sidebar"]};
        border-bottom: 1px solid {tema["borde"]};
    }}

    QTabBar::tab {{
        background-color: {tema["fondo_sidebar"]};
        color: {tema["texto_tenue"]};
        padding: 6px 14px;
        border: none;
    }}

    QTabBar::tab:selected {{
        background-color: {tema["fondo_editor"]};
        color: {tema["texto"]};
        font-weight: 600;
    }}

    QTabBar QToolButton {{
        background-color: transparent;
        border: none;
    }}

    QStatusBar {{
        background-color: {tema["fondo_sidebar"]};
        border-top: 1px solid {tema["borde"]};
        color: {tema["texto_tenue"]};
    }}

    QScrollBar:vertical {{
        background: transparent;
        width: 14px;
        margin: 2px 4px 2px 2px;
    }}

    QScrollBar::handle:vertical {{
        background: rgba(128, 128, 128, 110);
        border-radius: 4px;
        min-height: 24px;
    }}

    QScrollBar::handle:vertical:hover {{
        background: rgba(128, 128, 128, 170);
    }}

    QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{
        height: 0px;
        border: none;
        background: none;
    }}

    QScrollBar::add-page:vertical, QScrollBar::sub-page:vertical {{
        background: none;
    }}
    """


def esta_en_modo_oscuro() -> bool:
    esquema = QGuiApplication.styleHints().colorScheme()
    return esquema == Qt.ColorScheme.Dark


def obtener_tema_actual() -> dict:
    return TEMA_OSCURO if esta_en_modo_oscuro() else TEMA_CLARO


def obtener_hoja_estilo_actual() -> str:
    return generar_hoja_estilo(obtener_tema_actual())
