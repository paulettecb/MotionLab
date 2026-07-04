# PROMPTS.md — Sesiones de Claude Code para Motion Lab

Ritual por sesión: abre terminal en el repo → `claude` → `/model` (según columna) → pega el prompt → revisa → commit → `/clear`.
Regla: si la sesión se alarga o se enreda, corta, haz commit de lo que sirva y arranca sesión nueva.

## Antes de empezar (fuera de Code, gratis en cuota de agente)
Hazlo en la app de chat de Claude, hoy mismo si quieres:
- **Fase 0**: decidir nombre final, crear repo vacío en GitHub, pegar plan + CLAUDE.md.
- **Task 15**: "Ayúdame a documentar las señas SÍ, NO y HOLA de LSM usando Manos con Voz y DIELSEME, con la plantilla de 5 componentes de PLAN-MOTION-LAB.md §5.2. Salida: contenido para docs/SIGNS.md y data/signs/{si,no,hola}.ts". Guarda el resultado; lo pegarás en la sesión 15.

---

## Sesiones en orden

| # | Modelo | Prompt (copia/pega) |
|---|--------|---------------------|
| 1 | Sonnet | Lee CLAUDE.md y PLAN-MOTION-LAB.md §8. Ejecuta Task 01 (bootstrap Vite vue-ts, lint, HTTPS local). Solo esa task. |
| 2 | Sonnet | Ejecuta Task 02 del plan (rutas lazy + AppShell + placeholders). Solo esa task. |
| 3 | Sonnet | Ejecuta Task 03 del plan (deploy GH Pages + CI + 404 fallback). Al final dame los pasos manuales que yo deba hacer en GitHub (settings de Pages). |
| 4 | Sonnet | Ejecuta Task 04 del plan (services/camera.ts + useCamera, errores tipados, cleanup). |
| 5 | Sonnet | Ejecuta Task 05 del plan (CameraStage + PermissionGate + Controls + coords.ts con tests). |
| 6 | Sonnet | Ejecuta Task 06 del plan (useFps + DebugPanel v1 + useVisibility + route guards). |
| 7 | **Opus/Fable** | Ejecuta Task 07 del plan (spike performance tasks-vision). Genera la página dev y el guion de medición; yo correré las pruebas en mis dispositivos y te pego los fps para que escribas DECISIONS.md. |
| 8 | **Opus/Fable** | Ejecuta Task 08 del plan (modelRegistry + self-hosting wasm/.task + carga con progreso + refcount). |
| 9 | **Opus/Fable** | Ejecuta Task 09 del plan (visionRunner: loop único, timestamps monotónicos, suscriptores, throttle, pausa). |
| 10 | Sonnet | Ejecuta Task 10 del plan (useHandLandmarker + LandmarkOverlay + connections + drawing). |
| 11 | **Opus/Fable** | Ejecuta Task 11 del plan (landmarkMath + gestureRules + grabador de fixtures + tests contra fixture real). |
| 12 | Sonnet | Ejecuta Task 12 del plan (usePoseLandmarker + esqueleto + useSmoothing One Euro). |
| 13 | Sonnet | Ejecuta Task 13 del plan (actions.ts: brazos/sentadilla/salto + calibración + tests con fixtures). |
| 14 | Sonnet | Ejecuta Task 14 del plan (LSM explorador + HandDataPanel de baja frecuencia). |
| 15 | Sonnet | Ejecuta Task 15: te pego abajo la documentación de señas que ya preparé; intégrala en docs/SIGNS.md y data/signs/. [PEGA AQUÍ TU INVESTIGACIÓN] |
| 16 | **Opus/Fable** | Ejecuta Task 16 del plan (detectores SÍ/NO/HOLA + signSequencer, histéresis y debounce, fixtures positivo/negativo). |
| 17 | Sonnet | Ejecuta Task 17 del plan (modo práctica LSM con feedback por componente). |
| 18 | Sonnet | Ejecuta Task 18 del plan (Agility: Toca el círculo completo con calibración y resultados). |
| 19 | Sonnet | Ejecuta Task 19 del plan (Exercise: repStateMachine + squat.ts + aviso de seguridad + feedback visual). |
| 20 | Sonnet | Ejecuta Task 20 del plan (Experiments: registry + Finger Paint). |
| 21 | Sonnet | Ejecuta Task 21 del plan (Home real: hero, cards, privacidad, demo sutil). |
| 22 | Sonnet | Ejecuta Task 22 del plan (pulido: mobile QA, modo eco, Lighthouse ≥90, a11y). Dame checklist de QA manual para mis teléfonos. |
| 23 | Sonnet | Ejecuta Task 23 del plan (README + docs finales + tag v0.1.0). |

---

## Plantillas para la merma (~7 sesiones de reserva)

**Bug (Sonnet):**
> Bug en [módulo/archivo]. Qué esperaba: […]. Qué pasa: […]. Error literal: ```[pega consola completa]```. Reproduce, aísla y arregla SOLO este bug. Si es de coordenadas/mirror, revisa coords.ts primero y agrega un test que lo capture.

**Bug difícil que Sonnet no resolvió en 2 intentos (Opus/Fable):**
> Bug persistente, 2 intentos fallidos. Contexto: [qué se intentó]. Error: ```[…]```. Diagnostica desde cero sin asumir que los intentos previos iban bien encaminados.

**Retomar una task que quedó a medias:**
> La Task NN quedó incompleta. Estado: [qué funciona / qué falta / último error]. Revisa el diff sin commit con `git diff` y termina SOLO lo que falta de los criterios de aceptación.

**Ajuste chico (Sonnet):**
> Cambio puntual, no es una task del plan: [describe]. Archivos: [lista]. No toques nada más.

---

## Reglas de oro
1. `/clear` después de CADA sesión — sin excepción.
2. Commit antes de `/clear` (aunque esté a medias: `wip: task NN`).
3. Nunca dos tasks en un prompt.
4. Si Claude propone trabajo extra, respóndele: "al backlog, solo la task actual".
5. Error de consola siempre pegado literal y completo — ahorra 2-3 rondas.
