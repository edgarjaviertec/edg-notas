"""Utilidades de fechas en español: nombres de meses y cálculo de "esta semana"."""

from __future__ import annotations

from datetime import date, timedelta

NOMBRES_MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]


def nombre_mes(mes: int) -> str:
    return NOMBRES_MESES[mes - 1]


def calcular_ultimos_siete_dias(hoy: date) -> list[date]:
    """Devuelve los últimos 7 días naturales, empezando por hoy (el más nuevo primero)."""
    return [hoy - timedelta(days=indice) for indice in range(7)]
