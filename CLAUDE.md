# EdgNotas

App de notas de escritorio para macOS (PySide6). Minimalismo absoluto, guardado
automático en archivos `.md` planos, controlada 100% por teclado, sin menús de
ajustes visibles. Interfaz inspirada en Sublime Text / Obsidian / Logseq.

## Filosofía de código

- **KISS extremo, por encima de DRY.** Ante un conflicto entre simplicidad y no
  repetir código, gana la simplicidad. Está bien duplicar código simple antes
  que introducir una abstracción genérica para evitarlo.
- **Legibilidad por encima de brevedad.** Preferir varias líneas claras a una
  línea compacta difícil de entender. Nada de comprensiones anidadas,
  condicionales encadenados en una línea, ni trucos "ingeniosos" de Python
  salvo que de verdad mejoren la claridad.
- **Sin abstracciones "por si acaso".** No crear clases base genéricas ni
  frameworks internos a menos que ya existan 3+ casos reales con lógica
  idéntica (no solo "se parece").
- Funciones chicas y obvias en su propósito, antes que una función densa que
  hace mucho en poco espacio.
- Nombres de variables completos y descriptivos, nunca abreviaturas crípticas.
- Condiciones complejas se separan en variables intermedias con nombre.

## Idioma del código

**Todo lo que escribimos nosotros va en español:**
- Nombres de archivos y carpetas
- Clases, funciones, métodos, variables, atributos
- Señales (Signals) de Qt que definimos nosotros
- Claves de nuestro config interno (ej. `ruta_boveda`, no `vault_path`)
- Comentarios

**Lo que queda en inglés (no es nuestro, es del lenguaje/librería):**
- Sintaxis de Python (`def`, `class`, `import`, `return`, etc.)
- Clases y métodos de PySide6/Qt que usamos o heredamos (`QMainWindow`,
  `QPlainTextEdit`, `setStyleSheet()`, `textChanged`, etc.)
- Al heredar de una clase de Qt, la base queda en inglés pero la subclase
  propia va en español: `class EditorDeCodigo(QPlainTextEdit):`

## Estructura del proyecto

Plana, sin subcarpetas anidadas. Cada archivo agrupa una responsabilidad
completa, no una clase por archivo:

```
edgnotas/
  principal.py            # punto de entrada, arranca la app
  configuracion.py         # config interno (ruta de la bóveda guardada, etc.)
  boveda.py                 # Boveda: rutas, escaneo de archivos, asegurar nota de hoy
  fechas.py                  # nombres de meses en español, cálculo de "esta semana"
  editor.py                   # EditorDeCodigo (números de línea, zoom) + GestorDePestanas
  barra_lateral.py              # sidebar completo: semana, buscador, árbol historial
  ventana_principal.py           # layout general, status bar, atajos, timer de medianoche
  estilo.py                       # definición de tema oscuro/claro (QSS)
```

## Estilo y herramientas

- **Formateo/linting:** `ruff` (una sola herramienta para ambas cosas).
- **Tipado:** type hints en todas las funciones y clases públicas. Sin
  genéricos complejos — es una app de escritorio simple, no una librería.
- **Comentarios/docstrings:** mínimos. Solo cuando el "por qué" no es obvio
  (una restricción oculta, un workaround puntual). Nunca explicar el "qué"
  cuando el nombre ya lo dice.
- **Manejo de errores:** validar solo en los bordes reales (I/O de archivos:
  no existe, permiso denegado). Nada defensivo de más. Un fallo de guardado
  nunca debe crashear la app ni mostrar un diálogo — se loguea en silencio a
  un archivo de log local.
- **Testing:** `pytest`, solo sobre lógica pura sin UI (`boveda.py`,
  `fechas.py`: construcción de rutas, cálculo de "esta semana", parser de
  búsqueda `YYYY-MM-DD`). No testear los widgets de Qt directamente.
- **Dependencias:** `pyproject.toml` con lista mínima (idealmente solo
  `PySide6`), no `requirements.txt` suelto.
- **Control de versiones:** git desde el día 1. `.gitignore` para `.venv/` y
  `__pycache__/`. El config interno de la app
  (`~/Library/Application Support/EdgNotas/`) vive fuera del repo, nunca
  versionado.

## Decisiones de arquitectura ya tomadas

- Carpeta de notas fija: `~/Documents/Notas/`, auto-creada sin diálogo. Si ya
  existe con contenido ajeno (no tiene estructura `HISTORIAL`... es decir,
  no tiene la estructura de años/meses propia), se prueba `Notas 2`,
  `Notas 3`, etc. Solo se detecta una vez, en el primer arranque; el
  resultado se guarda en el config interno.
- Estructura en disco: `Notas/YYYY/mm - Mes/YYYY-MM-DD.md` (ej.
  `Notas/2026/09 - Septiembre/2026-09-19.md`). Sin carpeta `HISTORIAL`
  física — "ESTA SEMANA" e "HISTORIAL" son secciones 100% virtuales del
  sidebar, calculadas escaneando esta estructura.
- Autoguardado: escritura real y continua a disco (no el modelo de sesión
  oculta de Sublime). Debounce de 500ms de inactividad + techo máximo de
  escritura forzada aunque el usuario no pare de teclear. Escritura atómica
  (archivo temporal + `os.replace`) con `fsync` antes del rename, para
  tolerar cortes de luz sin corromper archivos.
- Tema claro/oscuro: paleta custom (no la nativa de `QPalette` pura, que se
  ve genérica). Se define un tema oscuro a mano y se deriva un tema claro
  con la misma jerarquía visual. Cambia automáticamente según el modo del
  sistema (`QGuiApplication.styleHints().colorScheme()`), sin botón ni menú.
- `Ctrl+T` no existe. `Cmd+Shift+T` reabre la última pestaña cerrada (estilo
  navegador, pila LIFO).
- `Ctrl+W` en la última pestaña abierta siempre reabre la nota de hoy — nunca
  queda la ventana sin pestañas.
- Buscador del sidebar: formato literal `YYYY-MM-DD` únicamente. Si el texto
  no matchea ese patrón exacto, el árbol de HISTORIAL muestra "sin
  resultados" (vacío).
- Transición de medianoche con la app cerrada varios días: sin notas
  retroactivas. Al reabrir, solo se crea el archivo del día actual; los días
  saltados no se generan.
- Sidebar: "ESTA SEMANA" es colapsable. Solo hoy y ayer llevan etiqueta
  (`[Hoy]`, `[Ayer]`); el resto de la semana muestra el nombre de archivo
  pelado. "HISTORIAL" arranca siempre colapsado, el usuario lo expande a
  mano (nunca se auto-expande el año/mes actual).
- Meses en disco mantienen el prefijo numérico (`09 - Septiembre`, no solo
  `Septiembre`) para que el orden cronológico se respete también fuera de la
  app (Finder, `ls`, otros editores).
