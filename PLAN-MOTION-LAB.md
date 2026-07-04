# Plan maestro — Motion Lab (proyecto MediaPipe / Vue / Computer Vision)

> Documento de planeación. No contiene código de producción; contiene decisiones, arquitectura, fases, investigación y backlog para construir el proyecto desde cero.
> Fecha: julio 2026.

---

## 0. Resumen ejecutivo y decisiones clave

| Decisión | Recomendación | Por qué |
|---|---|---|
| **Nombre** | `Motion Lab` (repo: `motion-lab`) | Corto, cubre manos+cuerpo+gestos+experimentos sin casarse con una sola tecnología. Alternativas: `Vision Lab` (genérico, hay mil), `Gesture Lab` (excluye pose/fitness), `KYN Motion Lab` (solo si quieres ligarlo a la marca KYN; para un lab experimental independiente, no). |
| **Framework** | **Vue 3 + Vite — sí es la elección correcta** | No estás en un error. Vite tiene el mejor DX para este tipo de proyecto, HMR instantáneo, y Vue 3 con Composition API mapea perfecto al patrón "composables que envuelven recursos con ciclo de vida" (cámara, modelos ML). React o Svelte servirían igual; no hay ganancia que justifique cambiar. Lo único que NO conviene es Nuxt/SSR: todo aquí es client-side puro. |
| **Lenguaje** | **TypeScript** | Landmarks son arrays de 21/33 puntos con estructuras que se pasan entre capas. Sin tipos, los bugs de "índice 8 vs índice 12" son invisibles. TS los vuelve errores de compilación. Costo de entrada bajo con Vue 3 + Volar. |
| **Visión** | **MediaPipe Tasks Vision** (`@mediapipe/tasks-vision`) | Sigue siendo la opción moderna correcta en 2026: HandLandmarker, PoseLandmarker, FaceLandmarker y GestureRecognizer en un solo paquete, corre en WASM+GPU en navegador, sin servidor. Detalle en §5.1. |
| **Estado** | **Pinia** (mínimo) + estado local en composables | Pinia solo para preferencias globales y estado de sesión. El estado de detección (landmarks por frame) NO va a un store: es de alta frecuencia (30–60 Hz) y debe vivir en refs locales / callbacks para no destruir performance con reactividad. |
| **Render de overlays** | **Canvas 2D** como base; Three.js/WebGL solo en Experiments | Canvas 2D pinta 21–33 puntos + conexiones a 60fps sin despeinarse. WebGL es para partículas/3D, no para el overlay básico. |
| **Deploy** | **GitHub Pages primero** (requisito), con config portable a Vercel/Netlify | GH Pages funciona: la app es 100% estática. Peculiaridades (base path, SPA fallback, headers) resueltas en §2.15. Recomendación a futuro: Vercel, por headers COOP/COEP configurables si algún día quieres SIMD/threads en WASM. |
| **Estilo** | KYN Design Skill | El lab pide identidad visual fuerte, y variables CSS además se vuelven un *target* de los experimentos (controlar UI con la mano = escribir variables CSS). |

**Qué NO usar y por qué (respuesta directa a tu lista):**

- **TensorFlow.js / ml5.js** como detector principal: no. MoveNet/BlazePose vía TFJS es válido, pero MediaPipe Tasks es más rápido (WASM+GPU dedicado), más simple de cargar y trae GestureRecognizer listo. TFJS entra solo si en el futuro entrenas un clasificador propio de señas (KNN/MLP sobre landmarks) — y ahí sí es la herramienta correcta (§5.2.4).
- **p5.js**: no como base. Su modo global pelea con Vue. Para Experiments, Canvas 2D nativo + utilidades propias da lo mismo con menos peso. Si un experimento concreto lo amerita, p5 en modo *instance* dentro de un componente aislado.
- **Three.js**: sí, pero solo dentro de `modules/experiments`, lazy-loaded. No en el core.
- **TouchDesigner**: es una herramienta de escritorio, no web. Irrelevante para este repo. Útil como referencia estética/de patrones de interacción, nada más.
- **SVG para overlays de landmarks**: no para el dibujo por frame (crear/mover 21 nodos DOM a 60fps es caro). SVG sí para iconografía, ilustración de señas y UI estática.

---

## 1. Concepto y alcance

Aplicación web estática, client-side, que usa la cámara para detectar manos, pose y (opcional) rostro, y ofrece 5 secciones:

1. **Home** — landing del laboratorio, acceso a módulos.
2. **LSM** — exploración de Lengua de Señas Mexicana: landmarks de manos, panel técnico, reconocimiento de señas básicas por reglas geométricas.
3. **Agility** — juegos de reacción/coordinación con pose de cuerpo completo.
4. **Exercise** — ejercicios guiados con conteo de repeticiones y feedback (sin promesas médicas).
5. **Experiments** — arte interactivo y control creativo de UI con cámara.

Principio rector: **un solo pipeline de cámara + detección, compartido; los módulos son consumidores.** Nada de que cada módulo abra su propia cámara o cargue su propio modelo por su cuenta.

Privacidad como feature: todo el procesamiento es local (WASM en el navegador), ningún frame sale del dispositivo. Esto se comunica explícitamente en la UI (§5.5).

---

## 2. Arquitectura técnica

### 2.1 Estructura de carpetas

```
motion-lab/
├── public/
│   ├── models/                  # .task descargados (ver 2.13)
│   │   ├── hand_landmarker.task
│   │   ├── pose_landmarker_lite.task
│   │   └── gesture_recognizer.task
│   └── wasm/                    # binarios wasm de tasks-vision (self-hosted)
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── router/
│   │   └── index.ts
│   ├── stores/
│   │   ├── preferences.ts       # Pinia: cámara elegida, mirror, overlays, calibración
│   │   └── session.ts           # Pinia: módulo activo, estado global de cámara
│   ├── services/
│   │   ├── camera.ts            # getUserMedia, enumerateDevices, start/stop, torch/facing
│   │   ├── visionRunner.ts      # ciclo rAF: video → landmarkers → callbacks
│   │   └── modelRegistry.ts     # carga perezosa y caché de FilesetResolver + landmarkers
│   ├── composables/
│   │   ├── useCamera.ts
│   │   ├── useHandLandmarker.ts
│   │   ├── usePoseLandmarker.ts
│   │   ├── useGestureRecognizer.ts   # (fase post-MVP, ver 5.2)
│   │   ├── useFaceLandmarker.ts      # (opcional, post-MVP)
│   │   ├── useFps.ts
│   │   ├── useSmoothing.ts           # filtros (One Euro / EMA)
│   │   └── useVisibility.ts          # pausa por visibilitychange / route leave
│   ├── components/
│   │   ├── camera/
│   │   │   ├── CameraStage.vue       # video + canvas overlay apilados, aspect handling
│   │   │   ├── CameraPermissionGate.vue  # estados: idle/pidiendo/denegado/sin-cámara
│   │   │   ├── CameraControls.vue    # start/stop, switch frontal/trasera, mirror
│   │   │   └── LandmarkOverlay.vue   # canvas que dibuja puntos/conexiones
│   │   ├── debug/
│   │   │   ├── DebugPanel.vue        # FPS, modelo activo, confianzas, coords crudas
│   │   │   └── FpsMeter.vue
│   │   ├── ui/                       # sistema de diseño: BaseButton, BaseCard, etc.
│   │   └── layout/
│   │       ├── AppShell.vue
│   │       └── ModuleHeader.vue
│   ├── modules/
│   │   ├── home/
│   │   │   └── HomeView.vue
│   │   ├── lsm/
│   │   │   ├── LsmView.vue
│   │   │   ├── components/           # SignCard, HandDataPanel, SignPractice
│   │   │   ├── logic/
│   │   │   │   ├── signDetectors.ts  # una función por seña
│   │   │   │   └── signSequencer.ts  # señas con movimiento (ventana temporal)
│   │   │   └── README.md             # documentación del módulo
│   │   ├── agility/
│   │   │   ├── AgilityView.vue
│   │   │   ├── components/           # GameCanvas, ScoreBoard, TargetZone
│   │   │   ├── games/
│   │   │   │   ├── touchTheCircle.ts
│   │   │   │   └── followTheDot.ts
│   │   │   └── logic/actions.ts      # levantar brazo, sentadilla, salto...
│   │   ├── exercise/
│   │   │   ├── ExerciseView.vue
│   │   │   ├── components/           # RepCounter, FormFeedback, ExercisePicker
│   │   │   └── logic/
│   │   │       ├── repStateMachine.ts
│   │   │       └── angles.ts         # definiciones por ejercicio
│   │   └── experiments/
│   │       ├── ExperimentsView.vue
│   │       ├── registry.ts           # lista de experimentos, lazy import
│   │       └── experiments/
│   │           ├── fingerPaint/
│   │           ├── particleBody/
│   │           └── cssPuppet/
│   ├── utils/
│   │   ├── landmarkMath.ts           # distancias, ángulos, normalización
│   │   ├── gestureRules.ts           # primitivas: dedoExtendido, palmaHacia, pinch...
│   │   ├── coords.ts                 # normalizado↔px, mirror, aspect fit
│   │   └── drawing.ts                # helpers de canvas (puntos, huesos, trails)
│   ├── data/
│   │   ├── signs/                    # 1 archivo por seña: metadata + fuente + reglas
│   │   │   ├── index.ts
│   │   │   └── hola.ts, si.ts, no.ts ...
│   │   ├── exercises/
│   │   │   └── squat.ts, jumpingJacks.ts ...
│   │   └── connections.ts            # pares de índices mano/pose para dibujar huesos
│   ├── types/
│   │   ├── landmarks.ts              # Landmark, HandFrame, PoseFrame, Handedness
│   │   ├── signs.ts                  # SignDefinition, SignDetectionResult
│   │   └── games.ts
│   └── styles/
│       ├── tokens.css                # variables: color, tipografía, espaciado, motion
│       ├── base.css
│       └── components.css
├── docs/
│   ├── ARCHITECTURE.md
│   ├── SIGNS.md                      # cómo documentar/agregar una seña
│   └── DECISIONS.md                  # ADRs cortos
├── tests/
│   └── unit/                         # vitest: landmarkMath, gestureRules, repStateMachine
├── .github/workflows/deploy.yml
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

**Justificación de lo no obvio:**

- `services/` vs `composables/`: los services son clases/funciones sin Vue (testeables en aislamiento, sin ciclo de vida); los composables son la capa fina que los conecta al ciclo de vida de componentes (`onMounted`/`onUnmounted`). Esto permite testear toda la lógica de visión sin montar componentes.
- `modules/*/logic/` en TS puro, sin Vue: los detectores de señas, máquinas de estados de reps y juegos son funciones puras `(frames) => resultado`. Se testean con fixtures de landmarks grabados.
- `data/signs/` separa el **conocimiento** (cómo es la seña, fuente, descripción) de la **detección** (la función que la reconoce). Crítico para LSM: la documentación de la seña es un entregable en sí mismo.

### 2.2 El corazón: `visionRunner`

Un único loop `requestAnimationFrame` (o `video.requestVideoFrameCallback` donde exista, mejor):

```
video frame → [handLandmarker?.detectForVideo] → HandFrame
            → [poseLandmarker?.detectForVideo] → PoseFrame
            → notifica suscriptores (overlay, módulo activo, debug panel)
```

Reglas:
- Cada módulo declara qué detectores necesita (`hands`, `pose`, `face`, `gestures`); el runner activa solo esos. LSM no paga el costo de pose; Agility no paga el de manos.
- Los resultados se entregan por callback/evento, **no** por ref reactiva de Vue (evitar triggering de reactividad 60 veces/segundo). Solo métricas de baja frecuencia (FPS, confianza promedio, gesto estable detectado) se exponen como refs para la UI.
- `detectForVideo` exige timestamps monotónicos crecientes; el runner es el único dueño del timestamp (bug clásico si dos consumidores llaman detect con el mismo video).
- Modo `throttle`: en móvil se puede correr detección a 24–30 Hz aunque el render vaya a 60 (ver performance, §4.9).

### 2.3 Composables principales

| Composable | Responsabilidad | API (bosquejo) |
|---|---|---|
| `useCamera` | permisos, stream, lista de dispositivos, facingMode, errores tipados, cleanup | `{ videoRef, status, error, devices, start(), stop(), switchCamera(), currentFacing }` |
| `useHandLandmarker` | carga modelo, suscripción al runner, resultados | `{ ready, onHands(cb), lastConfidence, numHands }` |
| `usePoseLandmarker` | ídem para pose | `{ ready, onPose(cb), lastConfidence }` |
| `useFps` | FPS de render y de inferencia por separado | `{ renderFps, inferFps }` |
| `useSmoothing` | filtro One Euro/EMA aplicable a cualquier stream de landmarks | `smooth(frame) => frame` |
| `useVisibility` | pausa cámara+runner en `visibilitychange`, blur y `onBeforeRouteLeave` | automático |

Errores de cámara tipados (mínimo): `permission-denied`, `no-camera`, `in-use` (NotReadableError), `insecure-context`, `unknown`. Cada uno con mensaje y acción sugerida en la UI.

### 2.4 Tipos base (TypeScript)

```ts
interface Landmark { x: number; y: number; z: number; visibility?: number }
interface HandFrame {
  timestamp: number
  hands: { landmarks: Landmark[]; worldLandmarks: Landmark[];
           handedness: 'Left' | 'Right'; score: number }[]
}
interface PoseFrame {
  timestamp: number
  landmarks: Landmark[]        // 33 puntos
  worldLandmarks: Landmark[]   // metros, origen en cadera
  score: number
}
type SignId = 'hola' | 'si' | 'no' | /* ... */ string
interface SignDefinition {
  id: SignId; label: string; description: string
  source: { name: string; url?: string }   // diccionario/fuente de la seña
  kind: 'static' | 'dynamic'               // ¿requiere movimiento?
  detector: (window: HandFrame[]) => SignDetectionResult
}
interface SignDetectionResult { detected: boolean; confidence: number; feedback?: string }
```

Nota: `worldLandmarks` (coordenadas en metros relativas al cuerpo) son las correctas para **ángulos y reglas geométricas** (invariantes a distancia de cámara); las normalizadas (0–1) son las correctas para **dibujar** y para zonas de pantalla. Esta distinción atraviesa todo el proyecto.

### 2.5 Utilidades matemáticas (`landmarkMath.ts`)

Funciones puras, todas con tests:
- `dist(a, b)` 2D/3D; `distNorm` relativa al tamaño de mano/torso (invariante a escala).
- `angleAt(a, b, c)`: ángulo en `b` formado por a-b-c (rodilla = cadera-rodilla-tobillo).
- `palmNormal(handLms)`: normal de la palma (producto cruz muñeca→índiceMCP × muñeca→meñiqueMCP) → orientación de palma.
- `fingerExtension(handLms, finger)`: 0–1 por dedo (comparando distancias punta-muñeca vs nudillo-muñeca, más robusto que ángulos crudos).
- `isPinch(handLms, umbral)`.
- `velocity(frames, index)`: velocidad de un landmark en ventana temporal.
- `ema(prev, next, alpha)` y filtro One Euro para suavizado.
- `bbox`, `center`, `normalizeByTorso(poseLms)`.

### 2.6 Rutas

Vue Router, history mode con base `import.meta.env.BASE_URL`:
`/` (home) · `/lsm` · `/agility` · `/exercise` · `/experiments` · `/experiments/:id`.
Todos los módulos con `defineAsyncComponent`/import dinámico (code-splitting real: Three.js solo se descarga si entras a un experimento que lo usa). Guard global: al salir de una ruta con cámara activa → `visionRunner.pause()`.

### 2.7 Estado

- `preferences` (Pinia + persistencia en `localStorage` vía plugin propio de 20 líneas): deviceId preferido, mirror on/off, overlays visibles, panel debug, calibración por módulo, flag "ya vi el aviso de privacidad".
- `session` (Pinia, no persistido): estado de cámara (idle/starting/running/error), módulo activo, detectores activos.
- Todo lo de 30–60 Hz: fuera de Pinia (ver 2.2).

### 2.8 Sistema de diseño

> Actualizado: §0 ya decía "KYN Design Skill" pero esta sección describía un sistema distinto ("instrumento científico elegante") que se implementó en Tasks 01-02. Contradicción detectada al ejecutar Task 05 y resuelta con Paulette: **KYN Design aplica a todos sus proyectos, Motion Lab incluido, sin tema aparte por módulo.**

- `tokens.css` consolida los tokens de KYN (colors/typography/spacing/effects) en un solo archivo, siguiendo la convención de este repo: paleta periwinkle (`--periwinkle-500` = acento/acción) sobre neutros cálidos (`--paper`, `--oat`, `--ink-900`); pastels y el magenta pop (`--pop-magenta`) como whimsy — un acento por vista, nunca dominante.
- Tipografía: **Hanken Grotesk** (`--font-sans`/`--font-heading`) para todo lo estructural — títulos, UI, copy, datos de producto; **Friendship** (`--font-display`) reservada a un único "spark" por vista (el wordmark "Motion Lab" en el header, nada más); **Farmhouse** (`--font-accent`) para flourishes puntuales, prácticamente sin uso en este proyecto.
- Excepción de proyecto: KYN no define una fuente monoespaciada. Los paneles técnicos (DebugPanel, lecturas de landmarks/ángulos/FPS) usan `--font-mono` (system monospace) solo para esas cifras — nunca para títulos, UI general o copy.
- Radios generosos (`--radius-md/lg/pill`), sombras suaves periwinkle-tinted (`--shadow-sm/md/lg`), motion gentle (`--ease-out`, `--dur-fast/base/slow`, 140–360ms).
- Fuentes: Hanken Grotesk vía Google Fonts (igual que el resto de proyectos KYN); Friendship/Farmhouse (`.otf`) self-hosteados en `public/fonts/` — excepción puntual a la regla de self-host de §2.10, que es específica de modelos `.task`/`.wasm`.
- Componentes base: se adoptan los primitivos de KYN (`Button`, `IconButton`, `Input`, `Checkbox`, `Badge`, `Card`) donde apliquen; lo específico de visión (`CameraStage`, `LandmarkOverlay`, `DebugPanel`) hereda los tokens pero no es parte del kit KYN.
- `prefers-reduced-motion` respetado desde el día 1 (ya en `tokens.css`).

### 2.9 Convenciones

- Componentes: PascalCase multi-palabra (`CameraStage.vue`). Composables: `useX.ts`. Lógica pura: camelCase descriptivo (`repStateMachine.ts`).
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`) — habilita changelog automático después.
- Un módulo nunca importa de otro módulo; solo de `components/`, `composables/`, `utils/`, `data/`, `types/`.
- ESLint + Prettier + `vue-tsc --noEmit` en CI.

### 2.10 Assets y modelos (`.task`, `.wasm`)

**Decisión: self-host en `public/`, no CDN.**
- Los `.task` se descargan una vez desde Google Storage y se versionan en el repo (hand ~7–10 MB, pose lite ~5 MB, gesture ~8 MB). GH Pages los sirve con cache correcto.
- El paquete `@mediapipe/tasks-vision` trae los `.wasm` en `node_modules/.../wasm`; se copian a `public/wasm/` (script npm `copy-wasm` o plugin de Vite) y `FilesetResolver.forVisionTasks('/wasm')` apunta ahí.
- Por qué no CDN (jsdelivr): funciona, pero (a) versión clavada = reproducibilidad, (b) offline/dev sin red, (c) sin dependencia de terceros en runtime, (d) evita sorpresas de CORS.
- Carga perezosa: `modelRegistry` descarga cada `.task` solo cuando un módulo lo pide por primera vez, con UI de progreso (los .task se pueden fetch con progreso vía ReadableStream y pasar como `modelAssetBuffer`).

### 2.11 Configuración de Vite

- `base: '/motion-lab/'` en build para GH Pages (condicional por env `DEPLOY_TARGET`, para que Vercel/Netlify usen `/`).
- `assetsInclude` no hace falta para `.task` si viven en `public/`.
- Alias `@ → src/`.
- `build.target: 'es2022'`.
- Dev en móvil real: `server.host: true` + HTTPS local (`@vitejs/plugin-basic-ssl`) — **getUserMedia requiere secure context**; sin esto no puedes probar en el teléfono contra tu laptop. Esto es de las primeras cosas a configurar.

### 2.12 Deploy

**GitHub Pages (primera fase):**
- Workflow `deploy.yml`: on push a `main` → `npm ci` → `vue-tsc` → `vitest run` → `vite build` → `actions/deploy-pages`.
- SPA fallback: copiar `dist/index.html` → `dist/404.html` en el build (truco estándar para rutas profundas en GH Pages).
- GH Pages ya es HTTPS → cámara funciona.
- Limitación conocida: no puedes setear headers (COOP/COEP). Hoy tasks-vision no los necesita; si algún día quieres multithread WASM, ese es el trigger para migrar a Vercel/Netlify (un `vercel.json` de 10 líneas).

**CI básico:** mismo workflow, job `check` (lint + types + unit tests) como required check en PRs.

### 2.13 Testing

- **Vitest** para todo lo puro: `landmarkMath`, `gestureRules`, `signDetectors`, `repStateMachine`, juegos. Estrategia clave: **fixtures de landmarks grabados** — el debug panel tendrá un botón "grabar 3 s de frames → JSON"; esos JSON van a `tests/fixtures/` y los tests corren detectores contra grabaciones reales. Así pruebas "¿detecta la seña SÍ?" sin cámara y sin flakiness.
- No inviertas en E2E con cámara (Playwright puede inyectar video fake, pero el costo/beneficio en un lab personal es malo). Smoke test manual documentado por módulo (checklists en cada fase, §7).

### 2.14 Debug tools

`DebugPanel.vue` (toggle con tecla `d`): FPS render/inferencia, modelo activo + delegate (GPU/CPU), nº manos y handedness + score, coords del landmark seleccionado, latencia de inferencia (ms), botón grabar fixtures, toggles de overlays, slider de umbrales de confianza en vivo. Este panel es una herramienta de desarrollo de señas, no un extra: calibrar umbrales viendo números en vivo es como se afinan los detectores.

### 2.15 Documentación interna

- `README.md`: qué es, cómo correr, cómo deployar.
- `docs/ARCHITECTURE.md`: diagrama del pipeline (video→runner→consumidores), reglas (qué va en store vs callback).
- `docs/SIGNS.md`: **plantilla para documentar una seña** (ver §5.2.3) — el documento más importante del módulo LSM.
- `docs/DECISIONS.md`: ADRs de 5 líneas (por qué self-host de modelos, por qué no p5, etc.).

---

## 3. Los cinco módulos, en detalle

### 3.1 Home / Landing

- Hero con una **demo viva sutil** (si el usuario ya dio permiso alguna vez): p. ej. una malla de puntos que reacciona al mouse, y CTA "activa tu cámara" que la vuelve reactiva a la mano. Si no hay permiso, la demo corre con mouse — nunca pidas cámara en el landing sin acción explícita del usuario.
- Cards de los 4 módulos con: nombre, descripción de una línea, qué detecta (chips: `manos`, `pose`), y un preview animado (video corto o canvas generativo, no GIF pesado).
- Sección de privacidad visible: "Todo se procesa en tu dispositivo. Ningún video sale de tu navegador."
- Footer técnico: versión, link al repo, créditos de MediaPipe y de las fuentes LSM.

### 3.2 LSM / Señas

**Postura honesta del módulo (importante):** reconocer LSM de verdad es un problema de investigación (señas = configuración manual + orientación + ubicación + movimiento + componente no manual/facial). Este módulo es un **explorador y tutor de práctica de señas aisladas**, no un traductor. La UI debe decirlo.

**Pantallas:**
1. *Explorador*: cámara + landmarks de manos + panel técnico (coords, handedness, score, extensión por dedo, orientación de palma, gesto del GestureRecognizer si está activo).
2. *Diccionario*: cards de señas documentadas (ilustración/video de referencia, descripción textual, fuente citada).
3. *Práctica*: eliges una seña → la app te muestra la referencia → detecta si la haces → feedback ("palma hacia la cámara ✓, extiende más el índice ✗") → estado logrado con celebración visual.

**Cómo convertir una seña en lógica programable — el método (esto va en `docs/SIGNS.md`):**

1. **Documentar** la seña desde ≥2 fuentes (ver §5.2): foto/video, descripción escrita, y descomponerla en 5 componentes: configuración de dedos, orientación de palma, ubicación respecto al cuerpo, movimiento, componente no manual.
2. **Traducir cada componente a predicados** sobre landmarks:
   - Configuración → `fingerExtension()` por dedo (ej. "SÍ" en LSM = puño ≈ todas las extensiones < 0.3... verificar contra fuente).
   - Orientación → `palmNormal()` vs vectores de referencia (hacia cámara = componente z dominante).
   - Ubicación → posición de la muñeca relativa a landmarks de pose/cara si están activos, o a zonas de pantalla calibradas si no.
   - Movimiento → `velocity()` y trayectoria sobre una ventana de 15–30 frames (`signSequencer`): "NO" = índice y medio extendidos + oscilación lateral de muñeca; "SÍ" = puño + oscilación vertical.
   - Secuencia → máquina de estados: `postura_inicial → transición → postura_final` con timeouts.
3. **Umbrales con histéresis**: entrar a "detectado" con umbral alto, salir con umbral bajo, y exigir N frames consecutivos (debounce). Evita parpadeo.
4. **Calibrar** con el debug panel + fixtures grabados de ti mismo haciendo la seña bien y mal.
5. **Registrar** la seña en `data/signs/` con su fuente. Regla: **ninguna seña entra al repo sin fuente citada** — no inventar señas de memoria; LSM es una lengua real de una comunidad real.

**¿Tus 10 señas candidatas son buenas?** Evaluación técnica (verificar cada una contra diccionario antes de implementar):

| Seña | Viabilidad | Nota |
|---|---|---|
| SÍ | ★★★ empieza aquí | Puño + movimiento vertical corto. Estática+movimiento simple. |
| NO | ★★★ empieza aquí | Índice+medio extendidos, oscilación. Muy distinguible. |
| YO / TÚ | ★★★ | Señalar a sí mismo / al frente. Fácil, pero "señalar" genera falsos positivos — buen caso para aprender histéresis. |
| HOLA | ★★☆ | Mano abierta + saludo. Fácil de configuración, el movimiento de saludo requiere sequencer. |
| GRACIAS | ★★☆ | Involucra contacto cerca de la barbilla → necesita referencia facial o calibración de zona. Segunda tanda. |
| AGUA / CASA / AMOR / AYUDA | ★☆☆ | Configuraciones más finas, dos manos (casa, ayuda, amor) o contacto con el cuerpo. Tercera tanda; "casa" (dos palmas en techo) es la más viable de estas. |

Recomendación MVP: **SÍ, NO, HOLA** (cubren: estática, dinámica lateral, dinámica con mano abierta). YO/TÚ como cuarta y quinta. Además, considera arrancar aún antes con 2–3 **letras del alfabeto dactilológico LSM** (A, B, L u otras estáticas): están perfectamente documentadas en todos los diccionarios y son configuraciones puras sin movimiento — el mejor "hola mundo" del detector.

**Camino de evolución del reconocimiento** (no para el MVP, pero el plan lo deja pavimentado):
reglas geométricas → GestureRecognizer custom (MediaPipe Model Maker, entrenas con fotos propias) → clasificador temporal propio (KNN/MLP/LSTM sobre secuencias de landmarks con TFJS). La estructura `SignDefinition.detector` admite las tres estrategias sin refactor.

### 3.3 Agility

**Base técnica:** PoseLandmarker (33 puntos) + esqueleto dibujado + zonas virtuales en pantalla.

**Detección de acciones (en `logic/actions.ts`, todas funciones puras y testeadas):**
- *Brazo levantado*: `muñeca.y < hombro.y` (coords normalizadas, recordar que y crece hacia abajo) sostenido N frames; izquierda/derecha por índice.
- *Sentadilla*: ángulo `cadera-rodilla-tobillo` (worldLandmarks) < ~100° + cadera baja respecto a calibración de pie.
- *Salto*: ambos tobillos suben > umbral respecto a línea base con velocidad positiva, y vuelven. Línea base = calibración.
- *Desplazamiento lateral*: x del centro de cadera cruza umbrales izquierdo/derecho de la pantalla.
- *Tocar zona virtual*: `dist(muñeca, centroZona) < radio` — las zonas viven en coords normalizadas de pantalla, los landmarks también → trivial.

**Calibración (paso previo a todo juego):** 3 segundos parado en T-pose o neutral → guardar altura de hombros/cadera/tobillos y envergadura → todos los umbrales se vuelven relativos a ese usuario. Sin esto, los umbrales absolutos fallan con niños/adultos/distancias distintas.

**Juegos, de menor a mayor esfuerzo:**
1. **Toca el círculo** (MVP): aparece círculo en posición aleatoria alcanzable → tócalo con la mano → mide tiempo de reacción → 10 rondas → score. Métricas: tiempo medio de reacción, mejor tiempo, precisión (distancia al centro).
2. **Sigue el punto**: un punto se mueve; mantén la mano dentro. Métrica: % de tiempo dentro (consistencia).
3. **Reacción por color**: verde = tócalo, rojo = no lo toques (inhibición). Métricas: reacción + errores de comisión.
4. **Simón dice corporal**: secuencia de acciones (brazo izq, sentadilla, salto...) a repetir. Usa todo `actions.ts`.
5. **Agility grid**: cuadrícula 3×3, desplázate a la celda iluminada. Métrica: tiempo de desplazamiento.
6. **Balance**: mantén una postura (pierna levantada) — métrica: varianza del centro de masa.

**Cómo se calcula cada métrica:** reacción = t(acción detectada) − t(estímulo pintado); precisión = distancia normalizada al objetivo; rango de movimiento = min/max de ángulo en la ventana; repeticiones = conteo de la máquina de estados; consistencia = desviación estándar de las anteriores; score = fórmula ponderada por juego, definida en el archivo del juego.

### 3.4 Exercise / Fitness

**Aviso de seguridad (bloqueante, primera visita):** "Esto es una herramienta experimental de conteo y feedback visual. No es asesoría médica ni de entrenamiento. Detente si sientes dolor. Requiere espacio libre." + límites visibles en la UI. Nada de lenguaje de "corrige tu técnica perfecta" — el feedback es geométrico, no clínico.

**Ángulos clave (worldLandmarks, `angleAt`):** rodilla (cadera-rodilla-tobillo), cadera (hombro-cadera-rodilla), hombro (cadera-hombro-codo), codo (hombro-codo-muñeca). Promediar lados o trackear ambos.

**Máquina de estados de repetición (`repStateMachine.ts`) — patrón genérico:**
```
idle → descending (ángulo cruza umbralAlto bajando)
     → bottom (ángulo < umbralBajo sostenido ≥ k frames)
     → ascending → top (ángulo > umbralAlto) → rep++ → descending...
```
Parametrizada por ejercicio en `data/exercises/*.ts`: qué ángulo, umbrales, tiempos mínimos por fase, condiciones de invalidez.

**Anti falsos positivos:** exigir duración mínima por fase (una rep en <400 ms es ruido), visibilidad mínima de los landmarks implicados (`visibility > 0.5`, si no: estado "no te veo completo"), suavizado One Euro antes de calcular ángulos, histéresis en umbrales, y congelar el contador si el score global de pose cae.

**Ejercicios iniciales y su ángulo rector:** squats (rodilla), lunges (ambas rodillas + detección de pierna adelantada), jumping jacks (separación tobillos + muñecas sobre cabeza, es el más fácil y perdonador — candidato a MVP junto con squat), arm raises (hombro), shoulder mobility (rango de hombro, solo medición), plank (alineación hombro-cadera-tobillo ≈ 180°, solo feedback de línea, sin conteo).

**Feedback visual:** color del esqueleto por fase (neutro/abajo/arriba), arco del ángulo dibujado en la articulación rectora con el número en vivo, barra de progreso de la rep, contador grande, y mensajes cortos ("baja un poco más" solo si `bottom` no se alcanza sistemáticamente). Audio opcional (beep por rep) — útil porque el usuario no siempre mira la pantalla.

### 3.5 Experiments / Lab

Registro de experimentos (`registry.ts`): cada experimento declara `{ id, título, descripción, detectores: ['hands'|'pose'], render: 'canvas2d'|'webgl'|'css', component: lazy }`. La vista lista cards y monta el elegido. Añadir un experimento = añadir una carpeta + una entrada.

**Progresión concreta (de menor a mayor dificultad, con tecnología):**

| # | Experimento | Detección | Render | Idea |
|---|---|---|---|---|
| 1 | **CSS Puppet** | 1 mano | CSS variables | La posición de la mano escribe `--hand-x/--hand-y`; pinch escribe `--pinch`. La UI (tipografía variable, blur, hue-rotate, escala de cards) responde. Barato y sorprendentemente vistoso. |
| 2 | **Finger Paint** (MVP) | 1 mano | Canvas 2D | Dibuja con la punta del índice; pinch = trazo activo (pluma arriba/abajo); palma abierta 1s = borrar. Trails con alpha decay. |
| 3 | **Theremin visual** | 2 manos | Canvas 2D + WebAudio | Mano izq = frecuencia/color, der = amplitud/tamaño. Introduce audio reactivo. |
| 4 | **Particle Body** | pose | Canvas 2D (o WebGL si >5k partículas) | Campo de partículas que fluye alrededor del esqueleto; repulsión desde las muñecas. |
| 5 | **Tipografía elástica** | pose/manos | SVG filters + CSS | La envergadura de brazos estira una variable font; letras que huyen de la mano. |
| 6 | **Cursor corporal** | 1 mano | DOM | La mano es el cursor: hover real sobre elementos, pinch = click, con dwell-time como alternativa. Este es el experimento "manejar la computadora con la cámara" — y enseña por qué es difícil (precisión, fatiga, Midas touch). |
| 7 | **Constelación 3D** | pose | Three.js | Los worldLandmarks (¡son 3D!) posicionan una figura de puntos/líneas en una escena con cámara orbital y postprocesado (bloom). Primer contacto Three. |
| 8 | **Shader reactivo** | pose | Three.js + GLSL | Uniforms del shader alimentados por velocidad/expansión corporal. Techo alto. |

Regla de calidad anti-"demo genérica": cada experimento debe tener dirección de arte propia (paleta, easing, sonido si aplica) usando los tokens del sistema de diseño, estado vacío elegante ("levanta la mano para empezar"), y salida limpia (nada de canvas congelado al salir).

---

## 4. Cámara y experiencia — cómo se resuelve cada requisito

1. **Permisos**: nunca `getUserMedia` al cargar página; siempre tras click en CTA. `CameraPermissionGate` muestra explicación previa ("vamos a pedir tu cámara; el video no sale de tu dispositivo"). Si `navigator.permissions.query({name:'camera'})` está disponible, precheck para saltar la explicación cuando ya está concedido.
2. **Carga**: estados explícitos y visibles — `pidiendo permiso → abriendo cámara → cargando modelo (con % real del fetch del .task) → calentando (primera inferencia tarda) → listo`. La primera inferencia se hace con el video oculto tras un overlay de "calibrando" para que el usuario nunca vea un frame congelado.
3. **Errores**: mapa de `error.name` de getUserMedia → mensaje accionable: NotAllowedError → instrucciones por navegador para reactivar; NotFoundError → "no encontramos cámara"; NotReadableError → "otra app la está usando"; contexto no seguro → "abre por HTTPS".
4. **Frontal/trasera**: `enumerateDevices` + `facingMode: { ideal: 'user' | 'environment' }`; botón visible solo si hay >1 videoinput. Al cambiar: stop tracks → nuevo stream → re-vincular al runner (los timestamps siguen siendo monotónicos, el runner no se reinicia).
5. **Mirror**: video con `transform: scaleX(-1)` (frontal). **Regla crítica**: el canvas overlay se espeja con la misma transform y las coordenadas se dibujan sin tocar; pero las coordenadas *lógicas* que consumen los juegos usan `mirrorX()` de `coords.ts` para que "derecha del usuario" sea coherente. Cámara trasera: sin mirror. Handedness de MediaPipe asume imagen no espejada — documentar en `coords.ts` la conversión (fuente clásica de bugs).
6. **Landmarks sobre video**: `LandmarkOverlay` = canvas absoluto sobre el video, redimensionado a `videoWidth/videoHeight` con `object-fit: cover` calculado en `coords.ts` (aspect fit/fill correcto entre video y canvas — segundo bug clásico).
7. **Conexiones**: pares de índices en `data/connections.ts` (21-mano y 33-pose), `drawing.ts` pinta líneas con grosor/glow según tokens.
8. **Toggle overlays**: prefs en Pinia → el overlay lee flags (`puntos`, `huesos`, `etiquetas`, `ángulos`).
9. **Panel técnico**: §2.14.
10. **FPS**: `useFps` — contador de frames renderizados y de inferencias por separado (divergen en móvil, y esa divergencia es información).
11. **Confianza**: score de handedness / pose visible en debug; promedio suavizado como StatChip en UI normal.
12. **Modelo activo**: `modelRegistry` expone qué .task y delegate (GPU/CPU) están corriendo; visible en debug.
13. **Calibración**: §3.3; persistida por módulo en prefs.
14. **Preferencias locales**: §2.7. Nada de video ni landmarks se persiste, salvo fixtures que el usuario graba explícitamente para desarrollo.
15. **Desktop y móvil**: layout responsive (video protagonista en ambos), touch targets ≥44px, probar en iOS Safari desde la fase 2 (peculiaridades: requiere `playsinline`, autoplay solo muted, y GPU delegate a veces cae a CPU — detectar y avisar).
16. **Performance**: resolución de captura 640×480 para inferencia es suficiente (el video se puede *mostrar* a más resolución que la que se infiere); pose `lite` en móvil, `full` opcional en desktop; throttle de inferencia a 24–30 Hz en móvil; un solo canvas de overlay; cero allocaciones nuevas por frame en el loop (reusar arrays); `numHands: 2` máximo; no correr hands+pose simultáneo salvo que el módulo lo exija.
17. **Calentamiento del dispositivo**: modo eco automático (si `inferFps` cae sostenidamente o `navigator.getBattery()` reporta descarga rápida → bajar Hz de inferencia y avisar); pausa agresiva al perder foco; botón de pausa siempre visible.
18. **Pausa al navegar**: `useVisibility` + route guard: `visibilitychange` → pausa runner (cámara puede seguir para reanudar rápido); salir de ruta → stop total de tracks (LED de cámara APAGADO — es la señal de confianza).
19. **Liberar recursos**: `onUnmounted`: unsubscribe del runner → `landmarker.close()` si nadie más lo usa (refcount en `modelRegistry`) → `track.stop()` de todos los tracks → cancelar rAF. Checklist de fuga: LED apagado, memoria estable tras 5 entradas/salidas del módulo.

---

## 5. Fase de investigación

### 5.1 MediaPipe moderno

**Qué usar:** `@mediapipe/tasks-vision` (Google AI Edge / MediaPipe Tasks). Las "MediaPipe Solutions" legacy (`@mediapipe/hands`, `@mediapipe/pose`) están deprecadas — no usarlas aunque abunden tutoriales viejos.

**Modelos disponibles relevantes:**
- `HandLandmarker` — 21 landmarks por mano (imagen + world), handedness, hasta N manos.
- `PoseLandmarker` — 33 landmarks (imagen + world), variantes lite/full/heavy.
- `FaceLandmarker` — 478 landmarks + blendshapes (útil a futuro para componente no manual de LSM; NO en MVP).
- `GestureRecognizer` — landmarks de mano + clasificador de 7 gestos enlatados (Closed_Fist, Open_Palm, Pointing_Up, Thumb_Down, Thumb_Up, Victory, ILoveYou) + **soporte de modelo custom vía MediaPipe Model Maker** (entrenas en Colab con fotos etiquetadas; el embedding de mano ya viene pre-entrenado, solo se entrena la cabeza). Ruta natural para señas estáticas cuando las reglas se queden cortas.

**Patrón de carga:** `FilesetResolver.forVisionTasks(wasmPath)` → `HandLandmarker.createFromOptions(fileset, { baseOptions: { modelAssetPath | modelAssetBuffer, delegate: 'GPU' }, runningMode: 'VIDEO', numHands: 2 })` → `detectForVideo(video, timestamp)` en el loop.

**Limitaciones a verificar en spike (fase 3, primera tarea):**
- Rendimiento móvil real: iPhone medio y Android medio, hands y pose por separado y juntos. Presupuesto: ≥20 fps de inferencia en móvil medio con un modelo activo.
- iOS Safari: GPU delegate puede fallar → fallback CPU automático, medir su fps.
- Precisión de `z` en landmarks de imagen es débil; para profundidad usar worldLandmarks o no depender de z.
- Manos se pierden con oclusión/rotaciones extremas; pose sufre con encuadre parcial (avisar "aléjate para que te vea completo" usando `visibility`).

**Alternativas evaluadas:** TFJS MoveNet (pose muy rápida, pero sin manos ni gestos integrados — solo si MediaPipe pose decepcionara en móvil); TFJS HandPose = mismo modelo, peor empaque. Veredicto: MediaPipe Tasks para todo; TFJS reservado para clasificadores propios futuros.

**Fuentes:** [Gesture recognizer web guide](https://ai.google.dev/edge/mediapipe/solutions/vision/gesture_recognizer/web_js) · [Model customization guide](https://ai.google.dev/edge/mediapipe/solutions/customization/gesture_recognizer) · [@mediapipe/tasks-vision en npm](https://www.npmjs.com/package/@mediapipe/tasks-vision). Al iniciar fase 3, releer la doc oficial y clavar la versión exacta del paquete en `DECISIONS.md`.

### 5.2 LSM — fuentes y método

**Diccionarios y fuentes confiables (verificadas, existen):**
- **"Manos con Voz. Diccionario de Lengua de Señas Mexicana"** (María Esther Serafín / CONAPRED) — 1,113 palabras en 15 temas, con fotos y descripción paso a paso. PDF público vía [CONAPRED](https://www.conapred.org.mx/publicaciones/manos-con-voz-diccionario-de-lengua-de-senas-mexicana/) y [Libre Acceso A.C.](https://libreacceso.org/bibliografia/bibliografias-discapacidad-auditiva/manos-con-voz-diccionario-de-lengua-de-senas-mexicana/). **Fuente primaria del proyecto.**
- **DIELSEME** (Diccionario Español–LSM, Dirección de Educación Especial, SEP) — enfoque didáctico, [PDF público](http://libreacceso.org/wp-content/uploads/2020/12/DIELSEME.pdf).
- **Diccionario LSM Ciudad de México** — [PDF del gobierno de CDMX](https://pdh.cdmx.gob.mx/storage/app/media/banner/Dic_LSM%202.pdf).
- **SEP Educación Especial** publica material LSM ([diccionario en PDF](https://educacionespecial.sep.gob.mx/storage/recursos/2023/05/xzrfl019nV-4Diccionario_lengua_%20Senas.pdf)).
- Video: buscar canales de asociaciones de sordos mexicanas e intérpretes certificados en YouTube (verificar que sean LSM, no ASL ni LSE — error común). Cruzar siempre ≥2 fuentes: **hay variación regional real en LSM**; documentar qué variante se implementa.

**Qué tan estandarizada está:** parcialmente. LSM es lengua nacional reconocida (Ley General de Inclusión), con diccionarios institucionales, pero con variantes regionales y sin un estándar único tipo RAE. Implicación de diseño: cada `SignDefinition` cita su fuente y admite variantes; la UI dice "según [fuente]".

**Plantilla de documentación de seña (`docs/SIGNS.md`):** id, glosa, fuentes (≥2), tipo (estática/dinámica, 1/2 manos), los 5 componentes descritos en texto, referencias visuales, predicados geométricos derivados, umbrales, fixtures grabados, estado (borrador/calibrada/validada). Meta a futuro: validación por una persona señante o intérprete — el plan lo deja como hito explícito post-MVP, y es también la respuesta ética: construir *sobre* la lengua de una comunidad invita a involucrarla.

**Traducción video→reglas:** método completo en §3.2. Señas más fáciles primero: alfabeto estático → SÍ/NO/HOLA → YO/TÚ → resto.

### 5.3 Detección corporal

Los 33 landmarks de pose (0 nariz … 31/32 pies) están documentados en la guía de PoseLandmarker; `data/connections.ts` los codifica. Ángulos: `angleAt` con worldLandmarks (§2.5). Movimiento: velocidad por landmark en ventana (§2.5). Repeticiones: máquina de estados (§3.4). Postura: ángulos + alineaciones (§3.4 plank). Ruido: One Euro filter (estándar de la industria para punteros/landmarks; parámetros `minCutoff`/`beta` ajustables en debug panel) + gating por `visibility`.

### 5.4 Diseño interactivo con cámara — patrones

- **Patrones útiles:** zonas calientes (hover corporal), cursor de mano con dwell o pinch, control continuo (mapear distancia/ángulo a un parámetro), posturas como comandos discretos, trails como feedback de que "te veo".
- **Referencias a estudiar** (para criterio, no para copiar): experimentos de cámara de Google Creative Lab, trabajo de estudios de interactive installations, la escena creative coding (p5/Three) de tracking corporal. Tarea de investigación: armar un moodboard de 10 referencias con notas de qué patrón usa cada una.
- **Cómo evitar frustración (reglas de oro):** feedback inmediato de detección (si la app te ve, algo se mueve *siempre*); tolerancias generosas (objetivos grandes, dwell de 300–500 ms); nunca exigir precisión de píxel; estados de "no te veo" explícitos y amables; siempre alternativa de mouse/teclado para navegar (la cámara controla la experiencia, no la navegación); sesiones cortas — los brazos se cansan (*gorilla arm*), diseñar rondas de 30–90 s.

### 5.5 Privacidad

- Procesamiento 100% local (WASM en el navegador): decirlo en Home, en el permission gate y en README. Formulación honesta: "el video nunca sale de tu dispositivo; no lo grabamos ni lo enviamos a ningún servidor".
- No guardar video jamás. Landmarks solo se persisten si el usuario pulsa "grabar fixture" (herramienta dev) y se descargan como archivo local — no localStorage silencioso.
- LED de cámara apagado siempre que se sale de un módulo (§4.18–19) — la señal de confianza más importante.
- GH Pages no mete analytics; si algún día se añade analytics, nunca eventos con datos de landmarks.
- Menores: sin cuentas ni datos personales; los avisos de Exercise aplican.

---

## 6. MVP

**Definición:** Landing + cámara robusta + hands y pose funcionando con overlays + LSM con 3 señas (SÍ, NO, HOLA) + Agility con "Toca el círculo" + Exercise con squat counter (o jumping jacks si squat da guerra) + Experiments con Finger Paint + deploy en GH Pages verde.

**Fuera del MVP (explícitamente):** FaceLandmarker, GestureRecognizer custom, más de 3 señas, más de 1 juego/ejercicio/experimento, audio, Three.js, i18n, PWA/offline, cuentas.

---

## 7. Fases

### Fase 0 — Decisiones (½ día)
- **Objetivo:** cerrar decisiones para no reabrirlas.
- **Entregables:** nombre elegido; repo `motion-lab` creado (público, MIT); `docs/DECISIONS.md` con ADRs: Vue3+Vite+TS, tasks-vision self-hosted, Pinia mínimo, Canvas 2D base, GH Pages; alcance MVP (§6) pegado en el README; moodboard/tokens borrador (paleta, 2 fuentes tipográficas).
- **Riesgos:** parálisis por análisis. Timebox: medio día.
- **Criterio de aceptación:** otra persona puede leer README+DECISIONS y entender qué se va a construir y con qué.
- **NO hacer todavía:** ninguna línea de código de visión, ningún diseño de alta fidelidad.

### Fase 1 — Infraestructura (1 día)
- **Objetivo:** esqueleto desplegado. "Hello lab" en producción el día 1.
- **Entregables:** `npm create vite@latest` (vue-ts); ESLint+Prettier+vue-tsc; Vue Router con las 5 rutas y vistas placeholder lazy; `AppShell` + navegación; Pinia instalado; `tokens.css` inicial; Vitest con 1 test dummy; workflow deploy a GH Pages con 404.html fallback y base path; HTTPS local para dev móvil.
- **Archivos:** `vite.config.ts`, `src/main.ts`, `App.vue`, `router/index.ts`, `stores/*`, `styles/*`, `.github/workflows/deploy.yml`.
- **Riesgos:** base path de GH Pages rompe assets/rutas (probar deep-link `https://…/motion-lab/lsm` recargando).
- **Criterio de aceptación:** URL pública sirve las 5 rutas, recarga en ruta profunda funciona, CI verde, se abre desde el teléfono.
- **NO hacer:** cámara, MediaPipe, diseño final.

### Fase 2 — Cámara y overlays (2–3 días)
- **Objetivo:** pipeline de cámara sólido ANTES de tocar ML. La mitad de los bugs del proyecto viven aquí.
- **Entregables:** `services/camera.ts` + `useCamera` (estados, errores tipados, switch, mirror); `CameraStage` (video+canvas apilados, aspect correcto); `CameraPermissionGate`; `useFps`; `DebugPanel` v1; `useVisibility` + route guards; página de prueba temporal `/dev/camera` que pinta un punto siguiendo el mouse sobre el canvas (valida el sistema de coords sin ML).
- **Archivos:** `services/camera.ts`, `composables/useCamera.ts`, `useFps.ts`, `useVisibility.ts`, `components/camera/*`, `components/debug/*`, `utils/coords.ts`, `utils/drawing.ts`.
- **Riesgos:** iOS Safari (playsinline, autoplay); mismatch video/canvas con object-fit (resolver en `coords.ts` con tests).
- **Criterio de aceptación (manual):** iniciar/detener 10 veces sin fuga (LED apagado, memoria estable); permiso denegado muestra recuperación; switch de cámara en móvil; FPS visible; cambiar de ruta apaga el LED; funciona en Chrome/Firefox/Safari desktop + iOS + Android.
- **NO hacer:** MediaPipe todavía.

### Fase 3 — Hands (2–3 días)
- **Objetivo:** manos detectadas y dibujadas, datos en el panel, primeras reglas.
- **Entregables:** **spike de 2 h primero**: tasks-vision en la página dev, medir fps desktop/móvil, GPU vs CPU (esto valida el presupuesto de performance del proyecto entero); `modelRegistry` + copia de wasm + `.task` self-hosted con progreso de descarga; `visionRunner` con timestamps monotónicos; `useHandLandmarker`; overlay de 21 puntos + conexiones + handedness; DebugPanel v2 (scores, extensión por dedo, coords en vivo, latencia); `landmarkMath.ts` + `gestureRules.ts` con tests; primeras primitivas: `fingerExtension`, `palmNormal`, `isPinch`, puño/mano abierta; grabador de fixtures.
- **Archivos:** `services/modelRegistry.ts`, `services/visionRunner.ts`, `composables/useHandLandmarker.ts`, `utils/landmarkMath.ts`, `utils/gestureRules.ts`, `data/connections.ts`, `tests/unit/*`.
- **Riesgos:** performance móvil por debajo del presupuesto → decisiones de mitigación (lite settings, throttle) ANTES de construir módulos encima; mirror + handedness confundidos (tests con fixtures).
- **Criterio de aceptación:** 2 manos con esqueleto estable a ≥30 fps desktop / ≥20 móvil; pinch y puño detectados de forma fiable con ambas manos; fixtures grabables y test corriendo contra un fixture real en CI.
- **NO hacer:** señas completas, GestureRecognizer.

### Fase 4 — Pose (2 días)
- **Objetivo:** cuerpo completo con esqueleto, ángulos y acciones básicas.
- **Entregables:** `usePoseLandmarker` (lite); esqueleto 33 puntos; `angleAt` aplicado (rodilla/codo en vivo en debug); `useSmoothing` (One Euro) medible con toggle; `logic/actions.ts` v1: brazo izq/der levantado, sentadilla, con tests sobre fixtures; calibración v1 (guardar pose neutral).
- **Archivos:** `composables/usePoseLandmarker.ts`, `useSmoothing.ts`, `modules/agility/logic/actions.ts`, `data/exercises/` (esqueleto), fixtures de pose.
- **Riesgos:** hands+pose simultáneo demasiado caro → confirmar que ningún módulo del MVP lo necesita (ninguno lo necesita) y dejarlo documentado como restricción.
- **Criterio de aceptación:** esqueleto estable de cuerpo completo a distancia de sala; ángulo de rodilla visible y creíble (validar contra goniómetro mental: sentadilla ≈ 80–100°); "levantar brazo" y "sentadilla" detectadas sin falsos positivos al caminar por el frame.
- **NO hacer:** juegos ni contador de reps pulidos.

### Fase 5 — Módulos (5–8 días)
- **Objetivo:** los 4 módulos del MVP, funcionales de punta a punta.
- **Entregables:** LSM (explorador + diccionario con 3 señas documentadas con fuentes + práctica con feedback + `signSequencer` para NO/SÍ/HOLA); Agility ("Toca el círculo" con calibración, 10 rondas, tiempos y score, pantalla de resultados); Exercise (squat counter con máquina de estados, feedback de fase por color, aviso de seguridad bloqueante); Experiments (registry + Finger Paint completo); Home real (cards, privacidad, demo sutil).
- **Archivos:** todo `src/modules/*`, `data/signs/*`, `data/exercises/squat.ts`, `docs/SIGNS.md`.
- **Riesgos:** el detector de HOLA (movimiento) se atasca → degradar a versión estática ("mano abierta levantada") y documentarlo como variante simplificada, no bloquear el MVP; scope creep de juegos/experimentos extra → van al backlog.
- **Criterio de aceptación por módulo:** LSM: una persona ajena logra que le detecte SÍ y NO en <2 min sin instrucciones verbales; Agility: partida completa con score coherente y sin toques fantasma; Exercise: 10 squats reales = 10 ±0 contadas, agacharse a recoger algo NO cuenta; Experiments: dibujar tu nombre con el dedo es posible y satisfactorio.
- **NO hacer:** pulir animaciones finas, más contenido.

### Fase 6 — Pulido (3–5 días)
- **Objetivo:** que se sienta producto, no prototipo.
- **Entregables:** pasada de UI con el sistema de diseño en todo; mobile QA (iOS Safari + Android Chrome, matriz de los 4 módulos); performance (Lighthouse, code-splitting verificado, modo eco); accesibilidad (§ mínimo: navegación 100% por teclado/mouse como alternativa a cámara, contraste AA, `prefers-reduced-motion`, textos alt, focus visible, anuncios `aria-live` para conteos); README + ARCHITECTURE + SIGNS completos; deploy final + tag `v0.1.0`.
- **Criterio de aceptación:** Lighthouse ≥90 en Performance/A11y/Best Practices en Home; los 4 módulos usables en un teléfono de gama media; documentación permite a un tercero añadir una seña nueva sin preguntarte nada.
- **NO hacer:** features nuevas.

**Total estimado MVP: ~3–4 semanas** a ritmo de proyecto personal serio.

---

## 8. Backlog detallado

Prioridades: **P0** = bloquea el MVP · **P1** = MVP · **P2** = post-MVP. Orden ≈ orden de ejecución.

### Task 01: Bootstrap del proyecto
Prioridad: P0 · Dependencias: —
Archivos: `package.json`, `vite.config.ts`, `tsconfig.json`, `src/main.ts`, `App.vue`
Descripción: Crear proyecto Vite vue-ts, ESLint/Prettier/vue-tsc, alias `@`, HTTPS local para dev móvil.
Aceptación: `npm run dev` sirve por HTTPS accesible desde el teléfono; `npm run build` y `vue-tsc` pasan.
Riesgos: certificado local molesto en iOS (aceptar manualmente).

### Task 02: Rutas y shell
Prioridad: P0 · Dependencias: 01
Archivos: `router/index.ts`, `components/layout/AppShell.vue`, `modules/*/…View.vue` (placeholders)
Descripción: 5 rutas lazy + navegación + layout base con tokens iniciales.
Aceptación: navegación fluida; cada vista es un chunk separado en el build.

### Task 03: Deploy GH Pages + CI
Prioridad: P0 · Dependencias: 02
Archivos: `.github/workflows/deploy.yml`, `vite.config.ts`
Descripción: Workflow lint+types+test+build+deploy; base path condicional; 404.html fallback.
Aceptación: URL pública funcionando; recarga en `/lsm` no da 404; CI required check en PRs.
Riesgos: base path — probar assets, router y modelos con la URL real.

### Task 04: `services/camera.ts` + `useCamera`
Prioridad: P0 · Dependencias: 01
Archivos: `services/camera.ts`, `composables/useCamera.ts`
Descripción: getUserMedia con constraints, enumerateDevices, start/stop idempotentes, switch facing, errores tipados, cleanup total de tracks.
Aceptación: 10 ciclos start/stop sin fuga; cada error tipado tiene mensaje; switch funciona en móvil.
Notas: pedir 640×480 para inferencia; separar resolución de captura de la de display.

### Task 05: `CameraStage` + `CameraPermissionGate` + `CameraControls`
Prioridad: P0 · Dependencias: 04
Archivos: `components/camera/*`
Descripción: Video+canvas apilados con aspect handling (`coords.ts`), gate de permisos con estados, controles start/stop/switch/mirror.
Aceptación: overlay alineado al píxel con el video en todos los aspect ratios; mirror consistente video/canvas; estados de permiso correctos en Chrome/Safari/Firefox.
Riesgos: `object-fit: cover` vs coords — resolver con tests en `coords.ts`.

### Task 06: `useFps` + `DebugPanel` v1 + `useVisibility`
Prioridad: P0 · Dependencias: 05
Archivos: `composables/useFps.ts`, `useVisibility.ts`, `components/debug/*`
Descripción: FPS render, panel colapsable (tecla `d`), pausa por visibilidad y route-leave.
Aceptación: cambiar de pestaña pausa; volver reanuda; salir de la ruta apaga el LED.

### Task 07: Spike de performance tasks-vision
Prioridad: P0 · Dependencias: 05
Archivos: página dev temporal
Descripción: Medir hands y pose (lite) en desktop + 2 móviles reales, GPU vs CPU, solos y juntos. Documentar en `DECISIONS.md`.
Aceptación: tabla de fps por dispositivo/modelo/delegate; decisión de presupuestos escrita.
Riesgos: si móvil <15 fps con un modelo → replantear (resolución, throttle) antes de seguir.

### Task 08: `modelRegistry` + self-hosting wasm/.task
Prioridad: P0 · Dependencias: 07
Archivos: `services/modelRegistry.ts`, `public/wasm/`, `public/models/`, script `copy-wasm`
Descripción: Carga perezosa con caché y refcount, fetch de .task con progreso, delegate GPU con fallback CPU.
Aceptación: modelo se descarga solo al entrar al primer módulo que lo usa, con % visible; segunda entrada instantánea; `close()` cuando refcount llega a 0.

### Task 09: `visionRunner`
Prioridad: P0 · Dependencias: 08
Archivos: `services/visionRunner.ts`
Descripción: Loop único (rVFC con fallback rAF), timestamps monotónicos, suscriptores por tipo de detector, throttle configurable, pausa/reanuda.
Aceptación: dos suscriptores reciben el mismo frame sin doble inferencia; ninguna excepción de timestamps; throttle a 24 Hz medible.

### Task 10: `useHandLandmarker` + overlay de manos
Prioridad: P0 · Dependencias: 09
Archivos: `composables/useHandLandmarker.ts`, `components/camera/LandmarkOverlay.vue`, `data/connections.ts`, `utils/drawing.ts`
Descripción: 21 puntos + conexiones + etiqueta handedness, toggles de overlay.
Aceptación: 2 manos estables a los fps del presupuesto; handedness correcta con mirror activo.

### Task 11: `landmarkMath` + `gestureRules` + fixtures
Prioridad: P0 · Dependencias: 10
Archivos: `utils/landmarkMath.ts`, `utils/gestureRules.ts`, grabador en DebugPanel, `tests/unit/*`, `tests/fixtures/*`
Descripción: Primitivas matemáticas y de gesto (extensión por dedo, palma, pinch, puño, mano abierta) con tests contra fixtures grabados.
Aceptación: cobertura de las primitivas; test "detecta puño en fixture real" verde en CI.

### Task 12: `usePoseLandmarker` + esqueleto + suavizado
Prioridad: P0 · Dependencias: 09
Archivos: `composables/usePoseLandmarker.ts`, `useSmoothing.ts`, conexiones pose
Descripción: Pose lite, 33 puntos, One Euro con toggle en debug, ángulos en vivo.
Aceptación: esqueleto de cuerpo completo estable; jitter visiblemente menor con filtro on.

### Task 13: Acciones corporales + calibración
Prioridad: P1 · Dependencias: 12
Archivos: `modules/agility/logic/actions.ts`, calibración en prefs
Descripción: brazo izq/der, sentadilla, salto; calibración neutral de 3 s; tests con fixtures.
Aceptación: sin falsos positivos al caminar por el frame; funciona para dos personas de estaturas distintas tras calibrar.

### Task 14: Módulo LSM — explorador + panel de datos
Prioridad: P1 · Dependencias: 11
Archivos: `modules/lsm/LsmView.vue`, `components/HandDataPanel.vue`
Descripción: Cámara + landmarks + datos técnicos en vivo (coords, handedness, score, extensiones, orientación de palma).
Aceptación: panel legible y en vivo; sin caída de fps por el panel (refs de baja frecuencia).

### Task 15: Documentar 3 señas (SÍ, NO, HOLA) con fuentes
Prioridad: P1 · Dependencias: —  (puede empezar en paralelo desde fase 0)
Archivos: `docs/SIGNS.md`, `data/signs/{si,no,hola}.ts`
Descripción: Investigar en Manos con Voz + DIELSEME, llenar plantilla de 5 componentes, definir predicados y umbrales propuestos.
Aceptación: cada seña con ≥2 fuentes citadas y descomposición completa antes de escribir su detector.
Riesgos: variantes regionales — elegir una y documentarla.

### Task 16: Detectores de señas + `signSequencer`
Prioridad: P1 · Dependencias: 11, 15
Archivos: `modules/lsm/logic/*`, fixtures por seña
Descripción: Detectores estáticos (config+orientación) y dinámicos (ventana temporal, oscilación), con histéresis y debounce.
Aceptación: cada seña con fixtures positivo/negativo en tests; en vivo, persona ajena logra SÍ y NO en <2 min.

### Task 17: LSM — modo práctica con feedback
Prioridad: P1 · Dependencias: 16
Archivos: `modules/lsm/components/SignPractice.vue`, `SignCard.vue`
Descripción: Referencia visual + detección en vivo + feedback por componente + celebración.
Aceptación: el feedback dice QUÉ falta (no solo "no detectado").

### Task 18: Agility — "Toca el círculo"
Prioridad: P1 · Dependencias: 13
Archivos: `modules/agility/games/touchTheCircle.ts`, `AgilityView.vue`, `GameCanvas.vue`, `ScoreBoard.vue`
Descripción: Calibración → 10 rondas → círculos en zona alcanzable → tiempo de reacción por ronda → resultados.
Aceptación: sin toques fantasma; tiempos plausibles (300–900 ms humanos); pantalla de resultados con media/mejor/precisión.

### Task 19: Exercise — squat counter
Prioridad: P1 · Dependencias: 12, 13
Archivos: `modules/exercise/logic/repStateMachine.ts`, `data/exercises/squat.ts`, `ExerciseView.vue`, `RepCounter.vue`
Descripción: Máquina de estados genérica parametrizada; feedback de fase por color + arco de ángulo; aviso de seguridad bloqueante.
Aceptación: 10 squats = 10 ±0; recoger algo del suelo no cuenta; media rep no cuenta; máquina de estados 100% testeada con fixtures.

### Task 20: Experiments — registry + Finger Paint
Prioridad: P1 · Dependencias: 11
Archivos: `modules/experiments/registry.ts`, `experiments/fingerPaint/*`
Descripción: Registro lazy + dibujo con índice, pinch = pluma, palma sostenida = borrar, trails con decay.
Aceptación: escribir tu nombre es posible; sin lag perceptible; salir limpia el canvas y los recursos.

### Task 21: Home real
Prioridad: P1 · Dependencias: 14, 18, 19, 20
Archivos: `modules/home/HomeView.vue`
Descripción: Hero + cards de módulos + sección privacidad + demo sutil.
Aceptación: comunica qué es el lab en <10 segundos; CLS/LCP sanos.

### Task 22: Pulido mobile + performance + a11y
Prioridad: P1 · Dependencias: 21
Descripción: Matriz QA iOS/Android × 4 módulos; modo eco; Lighthouse ≥90; teclado/contraste/reduced-motion/aria-live.
Aceptación: criterios de fase 6.

### Task 23: Documentación final + v0.1.0
Prioridad: P1 · Dependencias: 22
Archivos: `README.md`, `docs/*`
Aceptación: un tercero añade una seña nueva siguiendo SIGNS.md sin ayuda.

### Post-MVP (P2, sin orden estricto)
- **GestureRecognizer integrado** (7 gestos enlatados en el explorador LSM) y luego **modelo custom con Model Maker** para señas estáticas (alfabeto).
- **FaceLandmarker** para componente no manual de señas y experimentos faciales.
- **Más señas** (tanda 2: YO, TÚ, GRACIAS; tanda 3: CASA, AGUA, AMOR, AYUDA) + **validación con persona señante**.
- Más juegos Agility (reacción por color, Simón dice, grid) y ejercicios (jumping jacks, lunges, plank).
- Experiments 3–8 (§3.5), Three.js entra aquí.
- Clasificador temporal propio (TFJS) para señas dinámicas; recolección de dataset propio con el grabador de fixtures.
- PWA/offline (los modelos ya están self-hosted, es viable), i18n ES/EN, migración a Vercel si se necesitan headers.

---

## 9. Riesgos globales del proyecto

1. **Performance móvil** — el riesgo nº1; por eso el spike (Task 07) va antes que cualquier módulo. Mitigación: lite models, 640×480, throttle, un detector a la vez.
2. **Precisión de detectores de señas** — reglas geométricas tienen techo. Mitigación: pocas señas bien calibradas + camino trazado a Model Maker; expectativas honestas en la UI.
3. **Scope creep** — 4 módulos invitan a infinito. Mitigación: §6 "fuera del MVP" + backlog P2.
4. **Sistema de coordenadas** — mirror/aspect/normalizado-vs-mundo causan los bugs más desquiciantes. Mitigación: `coords.ts` centralizado, con tests, escrito ANTES de los módulos.
5. **Responsabilidad cultural (LSM)** — implementar mal una lengua real es peor que no implementarla. Mitigación: fuentes citadas siempre, tono de "herramienta de práctica" no de "traductor", hito de validación con señantes.
6. **Seguridad física (Exercise/Agility)** — avisos claros, no gamificar hasta el agotamiento, no prometer corrección de técnica.

---

*Fin del plan. Siguiente paso sugerido: ejecutar Fase 0 (medio día) y Task 01–03 para tener el esqueleto en producción, y en paralelo empezar Task 15 (documentar SÍ/NO/HOLA desde Manos con Voz), que no requiere código.*



