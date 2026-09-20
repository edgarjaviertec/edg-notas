from datetime import date

from fechas import calcular_ultimos_siete_dias, nombre_mes


def test_nombre_mes_devuelve_nombre_en_espanol():
    assert nombre_mes(9) == "Septiembre"
    assert nombre_mes(1) == "Enero"


def test_calcular_ultimos_siete_dias_incluye_hoy_y_va_descendiendo():
    hoy = date(2026, 9, 19)
    dias = calcular_ultimos_siete_dias(hoy)
    assert len(dias) == 7
    assert dias[0] == hoy
    assert dias[-1] == date(2026, 9, 13)
