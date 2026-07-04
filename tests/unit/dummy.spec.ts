import { describe, expect, it } from 'vitest'

// Test dummy (Fase 1) — solo confirma que vitest está cableado y que el
// paso "test" del CI tiene algo real que correr. Los tests de lógica pura
// (landmarkMath, gestureRules, repStateMachine...) llegan con cada módulo.
describe('bootstrap', () => {
  it('el entorno de test corre', () => {
    expect(2 + 2).toBe(4)
  })
})
