import { describe, expect, it } from 'vitest'
import {
  computeCoverFit,
  mirroredHandedness,
  mirrorX,
  normalizedToCoverPx,
  normalizedToPx,
  pxToNormalized,
} from '@/utils/coords'

// coords.ts es el único punto por el que pasa toda conversión de
// coordenadas (regla dura de CLAUDE.md). Estos tests cubren los dos bugs
// clásicos que el plan anticipa (§7 Fase 2, riesgo de Task 05):
// mismatch de aspect ratio entre video/canvas, y mirror vs handedness.

describe('computeCoverFit', () => {
  it('no escala ni recorta cuando content y container ya coinciden', () => {
    const fit = computeCoverFit({ width: 640, height: 480 }, { width: 640, height: 480 })
    expect(fit.scale).toBe(1)
    expect(fit.offsetX).toBe(0)
    expect(fit.offsetY).toBe(0)
  })

  it('recorta en X cuando el container es más ancho que el content (video vertical en stage horizontal)', () => {
    // content 4:3 dentro de un container 16:9 más ancho → escala por altura, recorta X
    const fit = computeCoverFit({ width: 640, height: 480 }, { width: 1280, height: 480 })
    expect(fit.scale).toBeCloseTo(1280 / 640, 5)
    expect(fit.offsetY).toBe(0)
    expect(fit.offsetX).toBeGreaterThan(0)
  })

  it('recorta en Y cuando el container es más alto que el content', () => {
    const fit = computeCoverFit({ width: 640, height: 480 }, { width: 480, height: 640 })
    expect(fit.scale).toBeCloseTo(640 / 480, 5)
    expect(fit.offsetX).toBe(0)
    expect(fit.offsetY).toBeGreaterThan(0)
  })

  it('degrada a identidad con tamaños en 0 en vez de producir NaN/Infinity', () => {
    const fit = computeCoverFit({ width: 0, height: 0 }, { width: 640, height: 480 })
    expect(fit).toEqual({ scale: 1, offsetX: 0, offsetY: 0 })
  })
})

describe('normalizedToPx / pxToNormalized', () => {
  it('son inversas entre sí', () => {
    const size = { width: 640, height: 480 }
    const original = { x: 0.25, y: 0.75 }
    const px = normalizedToPx(original, size)
    const back = pxToNormalized(px, size)
    expect(back.x).toBeCloseTo(original.x, 10)
    expect(back.y).toBeCloseTo(original.y, 10)
  })

  it('normalizedToPx ubica el centro (0.5, 0.5) en el centro del tamaño', () => {
    const px = normalizedToPx({ x: 0.5, y: 0.5 }, { width: 640, height: 480 })
    expect(px).toEqual({ x: 320, y: 240 })
  })

  it('pxToNormalized no explota con tamaño 0', () => {
    expect(pxToNormalized({ x: 10, y: 10 }, { width: 0, height: 0 })).toEqual({ x: 0, y: 0 })
  })
})

describe('normalizedToCoverPx', () => {
  it('un landmark centrado (0.5, 0.5) siempre cae en el centro del container, sin importar el recorte', () => {
    const content = { width: 640, height: 480 }
    const container = { width: 1280, height: 480 } // recorta en X
    const px = normalizedToCoverPx({ x: 0.5, y: 0.5 }, content, container)
    expect(px.x).toBeCloseTo(container.width / 2, 5)
    expect(px.y).toBeCloseTo(container.height / 2, 5)
  })

  it('mapea la esquina superior izquierda del contenido visible (tras recorte) al origen del container', () => {
    const content = { width: 640, height: 480 }
    const container = { width: 1280, height: 480 }
    const fit = computeCoverFit(content, container)
    // El punto normalizado que corresponde al borde izquierdo visible es
    // offsetX / (content.width * scale).
    const leftEdgeNormX = fit.offsetX / (content.width * fit.scale)
    const px = normalizedToCoverPx({ x: leftEdgeNormX, y: 0 }, content, container)
    expect(px.x).toBeCloseTo(0, 5)
    expect(px.y).toBeCloseTo(0, 5)
  })
})

describe('mirrorX', () => {
  it('invierte el eje X y conserva Y', () => {
    expect(mirrorX({ x: 0.2, y: 0.6 })).toEqual({ x: 0.8, y: 0.6 })
  })

  it('es su propia inversa', () => {
    const p = { x: 0.37, y: 0.81 }
    expect(mirrorX(mirrorX(p))).toEqual(p)
  })

  it('el centro (0.5) es un punto fijo', () => {
    expect(mirrorX({ x: 0.5, y: 0.5 })).toEqual({ x: 0.5, y: 0.5 })
  })
})

describe('mirroredHandedness', () => {
  it('sin mirror, devuelve el handedness crudo sin tocar', () => {
    expect(mirroredHandedness('Left', false)).toBe('Left')
    expect(mirroredHandedness('Right', false)).toBe('Right')
  })

  it('con mirror, invierte Left↔Right (cámara frontal espejada, §4.5)', () => {
    expect(mirroredHandedness('Left', true)).toBe('Right')
    expect(mirroredHandedness('Right', true)).toBe('Left')
  })
})
