"""Punto de entrada de EdgNotas."""

from __future__ import annotations

import logging
import sys

from PySide6.QtWidgets import QApplication

from configuracion import RUTA_CARPETA_CONFIG
from ventana_principal import VentanaPrincipal


def _configurar_registro() -> None:
    """Los errores de guardado se loguean en silencio a un archivo, nunca a un diálogo."""
    RUTA_CARPETA_CONFIG.mkdir(parents=True, exist_ok=True)
    logging.basicConfig(
        filename=RUTA_CARPETA_CONFIG / "edgnotas.log",
        level=logging.WARNING,
        format="%(asctime)s %(levelname)s %(message)s",
    )


def main() -> None:
    _configurar_registro()
    aplicacion = QApplication(sys.argv)
    ventana = VentanaPrincipal()
    ventana.show()
    sys.exit(aplicacion.exec())


if __name__ == "__main__":
    main()
