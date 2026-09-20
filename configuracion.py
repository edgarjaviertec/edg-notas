"""Config interno de la app. No son notas del usuario: vive fuera de la bóveda."""

from __future__ import annotations

import json
from pathlib import Path

RUTA_CARPETA_CONFIG = Path.home() / "Library" / "Application Support" / "EdgNotas"
RUTA_ARCHIVO_CONFIG = RUTA_CARPETA_CONFIG / "configuracion.json"


def cargar_configuracion() -> dict:
    if not RUTA_ARCHIVO_CONFIG.exists():
        return {}
    try:
        return json.loads(RUTA_ARCHIVO_CONFIG.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def guardar_configuracion(datos: dict) -> None:
    """Combina `datos` con la configuración ya guardada, sin pisar otras claves existentes."""
    configuracion_completa = cargar_configuracion()
    configuracion_completa.update(datos)
    RUTA_CARPETA_CONFIG.mkdir(parents=True, exist_ok=True)
    RUTA_ARCHIVO_CONFIG.write_text(json.dumps(configuracion_completa, indent=2), encoding="utf-8")
