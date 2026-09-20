"""Gestión de la carpeta raíz de notas (la "bóveda") y su estructura en disco."""

from __future__ import annotations

import logging
import os
import tempfile
from datetime import date, datetime
from pathlib import Path
from typing import NamedTuple

from configuracion import cargar_configuracion, guardar_configuracion
from fechas import calcular_ultimos_siete_dias, nombre_mes

registrador = logging.getLogger("edgnotas")

CARPETA_BASE = Path.home() / "Documents"
NOMBRE_CARPETA_POR_DEFECTO = "Notas"
FORMATO_HORA_ARCHIVO = "%H-%M-%S"


class CoincidenciaBusqueda(NamedTuple):
    ruta: Path
    numero_linea: int
    texto_linea: str


def etiqueta_hora_nota(ruta: Path) -> str:
    """Extrae 'HH:MM:SS' de un nombre de archivo con formato YYYY-MM-DD_HH-MM-SS.md."""
    parte_hora = ruta.stem.split("_", 1)[1]
    horas, minutos, segundos = parte_hora.split("-")
    return f"{horas}:{minutos}:{segundos}"


def escribir_archivo_atomico(ruta: Path, contenido: str) -> None:
    """Escribe a disco de forma atómica (temporal + fsync + rename) para tolerar cortes de luz."""
    descriptor, ruta_temporal_texto = tempfile.mkstemp(
        dir=ruta.parent, prefix=f".{ruta.name}.", suffix=".tmp"
    )
    ruta_temporal = Path(ruta_temporal_texto)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as archivo_temporal:
            archivo_temporal.write(contenido)
            archivo_temporal.flush()
            os.fsync(archivo_temporal.fileno())
        os.replace(ruta_temporal, ruta)
    except OSError:
        ruta_temporal.unlink(missing_ok=True)
        raise


class Boveda:
    """Representa la carpeta raíz donde viven todas las notas del usuario."""

    def __init__(self) -> None:
        self.ruta_raiz = self._resolver_ruta_raiz()

    def _resolver_ruta_raiz(self) -> Path:
        configuracion = cargar_configuracion()
        ruta_guardada = configuracion.get("ruta_boveda")
        if ruta_guardada and Path(ruta_guardada).is_dir():
            return Path(ruta_guardada)

        ruta_elegida = self._elegir_carpeta_libre()
        ruta_elegida.mkdir(parents=True, exist_ok=True)
        guardar_configuracion({"ruta_boveda": str(ruta_elegida)})
        return ruta_elegida

    def _elegir_carpeta_libre(self) -> Path:
        """Usa 'Notas' si está libre; si ya existe con contenido ajeno, prueba 'Notas 2', 'Notas 3', etc."""
        candidata = CARPETA_BASE / NOMBRE_CARPETA_POR_DEFECTO
        numero = 2
        while candidata.exists() and not self._parece_boveda(candidata):
            candidata = CARPETA_BASE / f"{NOMBRE_CARPETA_POR_DEFECTO} {numero}"
            numero += 1
        return candidata

    def _parece_boveda(self, ruta: Path) -> bool:
        """Una carpeta vacía o que ya tiene carpetas de año (YYYY) se considera nuestra."""
        contenido = list(ruta.iterdir())
        if not contenido:
            return True
        return any(
            entrada.is_dir() and entrada.name.isdigit() and len(entrada.name) == 4
            for entrada in contenido
        )

    def ruta_carpeta_mes(self, fecha: date) -> Path:
        nombre_carpeta_mes = f"{fecha.month:02d} - {nombre_mes(fecha.month)}"
        return self.ruta_raiz / str(fecha.year) / nombre_carpeta_mes

    def ruta_carpeta_dia(self, fecha: date) -> Path:
        return self.ruta_carpeta_mes(fecha) / fecha.isoformat()

    def crear_nota_nueva(self, fecha: date) -> Path:
        """Crea una nota nueva y vacía, con nombre con timestamp, dentro de la carpeta del día."""
        carpeta_dia = self.ruta_carpeta_dia(fecha)
        carpeta_dia.mkdir(parents=True, exist_ok=True)
        hora_actual = datetime.now().strftime(FORMATO_HORA_ARCHIVO)
        ruta = carpeta_dia / f"{fecha.isoformat()}_{hora_actual}.md"
        ruta.write_text("", encoding="utf-8")
        return ruta

    def eliminar_nota(self, ruta: Path) -> None:
        """Borra una nota del disco. Un fallo se loguea en silencio, nunca crashea la app."""
        try:
            ruta.unlink(missing_ok=True)
            carpeta_dia = ruta.parent
            if carpeta_dia.is_dir() and not any(carpeta_dia.iterdir()):
                carpeta_dia.rmdir()
        except OSError:
            registrador.exception("No se pudo borrar %s", ruta)

    def listar_notas_de_dia(self, fecha: date) -> list[Path]:
        """Notas existentes de un día, de la más nueva a la más vieja."""
        carpeta_dia = self.ruta_carpeta_dia(fecha)
        if not carpeta_dia.is_dir():
            return []
        return sorted(carpeta_dia.glob("*.md"), reverse=True)

    def listar_notas_semana(self) -> list[tuple[date, list[Path]]]:
        """Días con notas de los últimos 7 días naturales, del más nuevo al más viejo."""
        dias_con_notas = []
        for fecha in calcular_ultimos_siete_dias(date.today()):
            notas = self.listar_notas_de_dia(fecha)
            if notas:
                dias_con_notas.append((fecha, notas))
        return dias_con_notas

    def listar_estructura_historial(
        self,
    ) -> list[tuple[int, list[tuple[str, list[tuple[str, list[Path]]]]]]]:
        """Árbol completo Año -> Mes -> Día -> notas, ordenado del más nuevo al más viejo."""
        anios = []
        for carpeta_anio in sorted(self.ruta_raiz.iterdir(), reverse=True):
            if not (carpeta_anio.is_dir() and carpeta_anio.name.isdigit()):
                continue

            meses = []
            for carpeta_mes in sorted(carpeta_anio.iterdir(), reverse=True):
                if not carpeta_mes.is_dir():
                    continue

                dias = []
                for carpeta_dia in sorted(carpeta_mes.iterdir(), reverse=True):
                    if not carpeta_dia.is_dir():
                        continue
                    notas = sorted(carpeta_dia.glob("*.md"), reverse=True)
                    if notas:
                        dias.append((carpeta_dia.name, notas))

                if dias:
                    meses.append((carpeta_mes.name, dias))

            if meses:
                anios.append((int(carpeta_anio.name), meses))

        return anios

    def buscar_texto(self, patron: str, sensible_a_mayusculas: bool = False) -> list[CoincidenciaBusqueda]:
        """Busca `patron` en el contenido de todas las notas, más reciente primero.

        Una entrada por línea con coincidencia, no por archivo: una nota con el
        patrón en varias líneas aparece varias veces.
        """
        if not patron:
            return []

        patron_comparacion = patron if sensible_a_mayusculas else patron.lower()
        coincidencias = []

        for ruta in sorted(self.ruta_raiz.rglob("*.md"), reverse=True):
            try:
                texto_archivo = ruta.read_text(encoding="utf-8")
            except OSError:
                registrador.exception("No se pudo leer %s durante la búsqueda", ruta)
                continue

            for numero_linea, linea in enumerate(texto_archivo.splitlines(), start=1):
                linea_comparacion = linea if sensible_a_mayusculas else linea.lower()
                if patron_comparacion in linea_comparacion:
                    coincidencias.append(CoincidenciaBusqueda(ruta, numero_linea, linea))

        return coincidencias
