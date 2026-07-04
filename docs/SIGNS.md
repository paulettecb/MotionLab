# SIGNS.md — Documentación de señas LSM

Cómo se documenta y agrega una seña al proyecto. **Regla dura (CLAUDE.md / plan §3.2):
ninguna seña entra al repo sin fuente citada.** LSM es una lengua real de una comunidad
real; no se inventan señas de memoria.

## Fuentes del proyecto

| Clave | Fuente | Tipo | Acceso |
|---|---|---|---|
| `MCV` | *Manos con Voz. Diccionario de Lengua de Señas Mexicana* — M. E. Serafín de Fleischmann y R. González Pérez, CONAPRED, 2011 | Diccionario (foto + descripción paso a paso). **Fuente primaria.** | [CONAPRED](https://www.conapred.org.mx/publicaciones/manos-con-voz-diccionario-de-lengua-de-senas-mexicana/) · [texto completo en Internet Archive](https://archive.org/details/diccionario-de-lengua-de-senas-mexicana) |
| `DIELSEME` | *DIELSEME. Diccionario Español–Lengua de Señas Mexicana. Estudio introductorio al léxico de la LSM* — M. T. Calvo Hernández, Dirección de Educación Especial, SEP | Estudio lingüístico (marco de componentes, rasgos no manuales) | [PDF público](http://libreacceso.org/wp-content/uploads/2020/12/DIELSEME.pdf) |
| `WS` | Wikisigns — LS Mexicana (videos de señantes, CC BY-SA 4.0) | Video | [wikisigns.org/list/es/lsm](https://www.wikisigns.org/list/es/lsm) |
| `CDMX` | Diccionario LSM Ciudad de México | Diccionario | [PDF](https://pdh.cdmx.gob.mx/storage/app/media/banner/Dic_LSM%202.pdf) |

Notas de verificación (2026-07-03):

- Las descripciones `MCV` citadas abajo provienen del OCR del texto completo en
  Internet Archive (secciones *Antónimos*, pp. 82 y 86 del PDF). Cotejar contra las
  fotos del PDF al calibrar (Task 16).
- **"Hola" NO aparece en Manos con Voz** (verificado con búsqueda de texto completo
  del libro). Sus fuentes son videos; ver su ficha.
- El PDF público de DIELSEME es el estudio introductorio, no las fichas por seña
  (eso vivía en un CD interactivo). Sirve como fuente del marco de 5 componentes y
  del rasgo no manual de negación.

## Plantilla (plan §5.2)

Toda seña se documenta con estos campos, en este archivo Y en `data/signs/<id>.ts`:

- **id** — slug sin acentos (`si`, `no`, `hola`).
- **glosa** — la glosa en mayúsculas (SÍ).
- **fuentes (≥2)** — con URL y detalle (página/video).
- **tipo** — estática / dinámica; 1 o 2 manos.
- **variante** — qué variante regional/de diccionario se implementa (hay variación real en LSM; la UI dice "según [fuente]").
- **5 componentes** (descritos en texto):
  1. configuración de dedos
  2. orientación de la palma
  3. ubicación respecto al cuerpo
  4. movimiento
  5. componente no manual
- **referencias visuales** — fotos/videos.
- **predicados geométricos derivados** — cómo se traduce cada componente a funciones sobre landmarks (§3.2).
- **umbrales propuestos** — con histéresis (entrada alta, salida baja, N frames).
- **fixtures** — grabaciones positivas/negativas (se llenan en Task 16).
- **estado** — `borrador` → `calibrada` → `validada` (validada = revisada por persona señante o intérprete; hito post-MVP).

## Método para agregar una seña (resumen de §3.2)

1. **Documentar** desde ≥2 fuentes y descomponer en los 5 componentes.
2. **Traducir a predicados**: configuración → `fingerExtension()`; orientación → `palmNormal()`; ubicación → muñeca vs. pose/zonas; movimiento → `velocity()` + ventana de 15–30 frames (`signSequencer`); secuencia → máquina de estados.
3. **Umbrales con histéresis** + debounce de N frames.
4. **Calibrar** con debug panel y fixtures propios (bien y mal hechas).
5. **Registrar** en `data/signs/` con fuente. Sin fuente no hay merge.

---

## SÍ

- **id:** `si` · **glosa:** SÍ · **estado:** borrador
- **tipo:** dinámica (movimiento repetitivo corto), 1 mano
- **variante implementada:** Manos con Voz (letra *i* con flexión de meñique)
- **fuentes:**
  1. `MCV` p. 86 (*Antónimos*, SÍ/NO): «Se hace una letra i, y se encoge y estira el dedo meñique.»
  2. `WS` videos: [sí](https://www.youtube.com/watch?v=1swdAmdsorE) · [sí / cierto / exactamente](https://www.youtube.com/watch?v=qanUoYgNKdA)

> ⚠️ El plan (§3.2) suponía "puño + oscilación vertical" (estilo asentir). La fuente
> primaria describe otra cosa: **letra i (puño con meñique extendido) flexionando el
> meñique**. Se implementa lo que dice la fuente. La variante "puño que asiente"
> queda como variante futura si se documenta.

| Componente | Descripción |
|---|---|
| 1. Configuración | Letra **i** del alfabeto LSM: puño cerrado (índice, medio y anular flexionados; pulgar recogido) con **meñique extendido**. |
| 2. Orientación | Palma hacia el interlocutor/cámara (tolerante: frontal a lateral). |
| 3. Ubicación | Frente al cuerpo, zona pecho–hombro. No es distintiva; ser tolerante. |
| 4. Movimiento | El **meñique se encoge y estira** repetidamente (≥2 ciclos). La mano casi no se traslada. |
| 5. No manual | Habitual asentimiento de cabeza acompañando. No exigido en MVP (sin FaceLandmarker). |

**Predicados propuestos** (`logic/`, funciones puras):

- `fingerExtension(indice|medio|anular) < 0.3` sostenido toda la ventana.
- `fingerExtension(meñique)` **oscila**: cruza `< 0.4` y `> 0.7` alternadamente, ≥2 ciclos en ventana de 30 frames.
- Traslación de muñeca `< 0.03·altoFrame` (la mano quieta distingue de NO y HOLA).

**Umbrales propuestos (calibrar en Task 16):** entrada: 2 ciclos completos + config sostenida 10 frames · salida: extensión de índice/medio/anular > 0.5 o 15 frames sin ciclo · debounce: 5 frames.

---

## NO

- **id:** `no` · **glosa:** NO · **estado:** borrador
- **tipo:** dinámica (cierre repetido), 1 mano
- **variante implementada:** Manos con Voz (pinza de tres dedos)
- **fuentes:**
  1. `MCV` p. 82 (*Antónimos*, NO/SÍ): «Los dedos índice, medio y pulgar estirados, realizan un movimiento de unirse por las yemas.»
  2. `DIELSEME` (estudio introductorio): la negación lleva **movimiento de cabeza** como rasgo no manual que acompaña la seña manual.

> ⚠️ El plan (§3.2) suponía "índice y medio extendidos + oscilación lateral". La fuente
> describe una **pinza**: pulgar+índice+medio estirados que se unen por las yemas.
> El índice oscilante lateral es el gesto cultural mexicano, no la entrada de MCV.

| Componente | Descripción |
|---|---|
| 1. Configuración | Pulgar, índice y medio **extendidos**; anular y meñique flexionados. |
| 2. Orientación | Palma hacia el interlocutor/frente (tolerante). |
| 3. Ubicación | Frente al cuerpo, altura pecho–hombro. No distintiva. |
| 4. Movimiento | Los tres dedos **se unen por las yemas** (cierre de pinza) y reabren; típicamente repetido. |
| 5. No manual | Movimiento lateral de cabeza (negación) según DIELSEME. No exigido en MVP. |

**Predicados propuestos:**

- Postura A (abierta): `fingerExtension(pulgar|indice|medio) > 0.7` y `fingerExtension(anular|meñique) < 0.3`.
- Postura B (cerrada): distancias entre yemas 4–8 y 4–12 `< 0.25·longitudPalma`, anular/meñique siguen flexionados.
- Secuencia `A → B` (y de preferencia `A → B → A`) dentro de 20 frames → máquina de estados del `signSequencer`.

**Umbrales propuestos (calibrar):** entrada: 1 ciclo A→B→A completo · salida: anular o meñique extendidos > 0.5, o 20 frames sin transición · debounce: 5 frames.

---

## HOLA

- **id:** `hola` · **glosa:** HOLA · **estado:** borrador ⚠️ (ver nota de fuentes)
- **tipo:** dinámica (oscilación), 1 mano
- **variante implementada:** saludo de mano abierta (variante más extendida en video)
- **fuentes:**
  1. `WS` [hola (A)](https://www.youtube.com/watch?v=q51NPnFAmgA) — video CC BY-SA
  2. `WS` [hola (B)](https://www.youtube.com/watch?v=yxuffGl5ajM) y [hola](https://www.youtube.com/watch?v=bjYNbxE9nRw) — variantes en video

> ⚠️ **Riesgo documentado:** "hola" no existe en Manos con Voz (verificado en el texto
> completo) y el PDF público de DIELSEME no trae fichas por seña. Las tres referencias
> son videos de un mismo sitio (Wikisigns). **Pendiente antes de calibrar (Task 16):**
> Paulette ve los 3 videos (~2 min) y confirma o corrige la descripción de abajo; idealmente
> cruzar con un video de asociación de sordos mexicana. Hay variación regional reconocida
> (algunas variantes usan el pulgar u origen en la frente, tipo saludo).

| Componente | Descripción (provisional, confirmar contra videos) |
|---|---|
| 1. Configuración | Mano **abierta**, cinco dedos extendidos (juntos o levemente separados). |
| 2. Orientación | **Palma al frente** (hacia el interlocutor/cámara). |
| 3. Ubicación | Mano elevada: muñeca a la altura del hombro o más arriba, a un costado. |
| 4. Movimiento | **Oscilación lateral** corta y repetida de la mano/muñeca (saludo), ≥2 ciclos. |
| 5. No manual | Expresión amable/contacto visual; no exigido en MVP. |

**Predicados propuestos:**

- `fingerExtension(los 5) > 0.7` sostenido toda la ventana.
- `palmNormal()` con componente z dominante hacia cámara (`|nz| > 0.6`, calibrar con mirror).
- Muñeca por encima del hombro (landmark de pose si está activo; si no, tercio superior del frame calibrado).
- Oscilación en x de la muñeca: ≥2 cambios de signo de la velocidad en 30–45 frames, amplitud > 0.04·anchoFrame.

**Umbrales propuestos (calibrar):** entrada: config + orientación sostenidas 10 frames y 2 ciclos de oscilación · salida: <3 dedos extendidos o 20 frames sin oscilación · debounce: 5 frames.

---

## Checklist para una seña nueva

- [ ] ≥2 fuentes citadas (al menos una institucional o de señante; anotar página/video exacto)
- [ ] 5 componentes descritos en texto
- [ ] Variante elegida y anotada (si hay variación regional)
- [ ] Predicados y umbrales propuestos
- [ ] `data/signs/<id>.ts` creado
- [ ] Fixtures bien/mal grabados (al calibrar)
- [ ] Estado actualizado (`borrador` → `calibrada` → `validada`)
