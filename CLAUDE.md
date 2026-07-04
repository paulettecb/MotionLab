# CLAUDE.md — Motion Lab

Reglas para trabajar en este repo. Léelas antes de cualquier tarea.

## Fuente de verdad
- El plan completo vive en `PLAN-MOTION-LAB.md`. Síguelo. No improvises arquitectura.
- Ejecuta **solo la task del backlog (§8) que el usuario pida**, nada más. Si detectas trabajo extra necesario, propónlo como task nueva y detente.

## Disciplina de alcance (ahorro de tokens)
- Una task por sesión. Al terminar: resumen de 3 líneas + qué task sigue. No re-expliques el plan.
- No leas archivos que la task no toca. No refactorices código ajeno a la task.
- No agregues features, dependencias ni "mejoras" no pedidas.
- Antes de escribir código, lista los archivos que vas a crear/tocar (deben coincidir con los de la task) y espera confirmación solo si difieren del plan.

## Modelo recomendado por task
⚠️ Claude no puede cambiarse de modelo solo — Paulette lo cambia a mano con `/model` antes de la sesión.
Si te invocan con un modelo distinto al recomendado para la task, adviértelo en tu primera respuesta y continúa.

| Tasks | Modelo |
|---|---|
| 01–06, 10, 12–15, 17–23 (UI, módulos, infra) | **Sonnet** |
| 07, 08, 09, 11, 16 (visionRunner, coords/math, detectores de señas, spike perf) | **Opus/Fable** |
| Debugging con error pegado literal | **Sonnet** |

## Definición de "terminado"
Una task está lista solo si: criterios de aceptación de §8 cumplidos + `vue-tsc` y `vitest run` verdes + commit con Conventional Commits (`feat: task 04 — useCamera`). Nunca marques terminado con tests fallando.

## Reglas técnicas duras (de §2)
- Estado de 30–60 Hz (landmarks) NUNCA en Pinia ni refs reactivas; solo callbacks.
- `visionRunner` es el único dueño de timestamps y del loop.
- Toda conversión de coordenadas pasa por `utils/coords.ts` (con tests).
- Lógica de detección = funciones puras en `logic/`, testeadas con fixtures de `tests/fixtures/`.
- Modelos `.task`/`.wasm` self-hosted en `public/`. Sin CDN en runtime.
- Ninguna seña LSM sin fuente citada en `data/signs/`.
- Al desmontar: tracks detenidos (LED apagado), landmarkers cerrados, rAF cancelado.

## Protocolo de bugs
1. Reproduce y aísla antes de tocar código.
2. Arregla solo el bug; no aproveches para refactorizar.
3. Si el bug es de coords/mirror/aspect, sospecha primero de `coords.ts` y agrega un test que lo capture.
