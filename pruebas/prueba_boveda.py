from datetime import date
from pathlib import Path

from boveda import Boveda, etiqueta_hora_nota


def _preparar_boveda_aislada(tmp_path, monkeypatch):
    monkeypatch.setattr("boveda.CARPETA_BASE", tmp_path)
    monkeypatch.setattr("boveda.cargar_configuracion", dict)
    monkeypatch.setattr("boveda.guardar_configuracion", lambda datos: None)


def test_ruta_carpeta_mes_usa_prefijo_numerico_y_nombre_en_espanol(tmp_path, monkeypatch):
    _preparar_boveda_aislada(tmp_path, monkeypatch)

    boveda = Boveda()
    ruta = boveda.ruta_carpeta_mes(date(2026, 9, 19))

    assert ruta.name == "09 - Septiembre"
    assert ruta.parent.name == "2026"


def test_ruta_carpeta_dia_es_yyyy_mm_dd_dentro_del_mes(tmp_path, monkeypatch):
    _preparar_boveda_aislada(tmp_path, monkeypatch)

    boveda = Boveda()
    ruta = boveda.ruta_carpeta_dia(date(2026, 9, 19))

    assert ruta.name == "2026-09-19"
    assert ruta.parent.name == "09 - Septiembre"


def test_crear_nota_nueva_crea_archivo_vacio_con_timestamp(tmp_path, monkeypatch):
    _preparar_boveda_aislada(tmp_path, monkeypatch)

    boveda = Boveda()
    ruta = boveda.crear_nota_nueva(date(2026, 9, 19))

    assert ruta.exists()
    assert ruta.read_text(encoding="utf-8") == ""
    assert ruta.parent.name == "2026-09-19"
    assert ruta.name.startswith("2026-09-19_")


def test_eliminar_nota_borra_el_archivo_y_la_carpeta_del_dia_si_queda_vacia(tmp_path, monkeypatch):
    _preparar_boveda_aislada(tmp_path, monkeypatch)

    boveda = Boveda()
    ruta = boveda.crear_nota_nueva(date(2026, 9, 19))
    carpeta_dia = ruta.parent

    boveda.eliminar_nota(ruta)

    assert not ruta.exists()
    assert not carpeta_dia.exists()


def test_listar_notas_de_dia_ordena_de_mas_nueva_a_mas_vieja(tmp_path, monkeypatch):
    _preparar_boveda_aislada(tmp_path, monkeypatch)

    boveda = Boveda()
    carpeta_dia = boveda.ruta_carpeta_dia(date(2026, 9, 19))
    carpeta_dia.mkdir(parents=True)
    (carpeta_dia / "2026-09-19_09-00-00.md").write_text("")
    (carpeta_dia / "2026-09-19_10-00-00.md").write_text("")

    notas = boveda.listar_notas_de_dia(date(2026, 9, 19))

    assert [nota.name for nota in notas] == [
        "2026-09-19_10-00-00.md",
        "2026-09-19_09-00-00.md",
    ]


def test_etiqueta_hora_nota_extrae_hh_mm_ss():
    ruta = Path("2026-09-19_10-56-07.md")

    assert etiqueta_hora_nota(ruta) == "10:56:07"


def test_elegir_carpeta_libre_evita_carpeta_ajena_no_vacia(tmp_path, monkeypatch):
    _preparar_boveda_aislada(tmp_path, monkeypatch)

    carpeta_ajena = tmp_path / "Notas"
    carpeta_ajena.mkdir()
    (carpeta_ajena / "algo_ajeno.txt").write_text("no es nuestro")

    boveda = Boveda()

    assert boveda.ruta_raiz.name == "Notas 2"


def test_elegir_carpeta_libre_adopta_carpeta_vacia(tmp_path, monkeypatch):
    _preparar_boveda_aislada(tmp_path, monkeypatch)

    carpeta_vacia = tmp_path / "Notas"
    carpeta_vacia.mkdir()

    boveda = Boveda()

    assert boveda.ruta_raiz.name == "Notas"
