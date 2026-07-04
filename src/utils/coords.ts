// utils/coords.ts
// Sistema de coordenadas centralizado (§2.5, §4.5, §4.6 del plan).
// Toda conversión normalizado↔px, mirror y aspect-fit entre video y canvas
// pasa por aquí — es la fuente clásica de bugs (mirror/aspect/handedness)
// si se reimplementa suelta en un componente. Funciones puras, con tests.

export interface Point2D {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

/**
 * Resultado de ajustar `content` (p.ej. el frame real del video,
 * `videoWidth`/`videoHeight`) dentro de `container` (p.ej. el rect en
 * pantalla del stage) replicando `object-fit: cover`: se escala
 * uniformemente hasta cubrir el contenedor y se recorta el sobrante,
 * centrado en ambos ejes.
 */
export interface CoverFit {
  /** Factor de escala aplicado a `content` para cubrir `container`. */
  scale: number
  /** Píxeles recortados de cada lado en X (mitad del sobrante), en espacio ya escalado. */
  offsetX: number
  /** Píxeles recortados de cada lado en Y (mitad del sobrante), en espacio ya escalado. */
  offsetY: number
}

/** object-fit: cover entre `content` y `container`. Tolera tamaños en 0 (evita NaN/Infinity). */
export function computeCoverFit(content: Size, container: Size): CoverFit {
  if (content.width <= 0 || content.height <= 0 || container.width <= 0 || container.height <= 0) {
    return { scale: 1, offsetX: 0, offsetY: 0 }
  }

  const scale = Math.max(container.width / content.width, container.height / content.height)
  const scaledWidth = content.width * scale
  const scaledHeight = content.height * scale

  return {
    scale,
    offsetX: (scaledWidth - container.width) / 2,
    offsetY: (scaledHeight - container.height) / 2,
  }
}

/** Normalizado (0–1, origen arriba-izquierda) → píxeles de `size`, sin cover fit. */
export function normalizedToPx(point: Point2D, size: Size): Point2D {
  return { x: point.x * size.width, y: point.y * size.height }
}

/** Píxeles de `size` → normalizado (0–1). Inverso de `normalizedToPx`. */
export function pxToNormalized(point: Point2D, size: Size): Point2D {
  if (size.width <= 0 || size.height <= 0) return { x: 0, y: 0 }
  return { x: point.x / size.width, y: point.y / size.height }
}

/**
 * Convierte un punto normalizado del frame de video (`content`) a píxeles
 * del contenedor en pantalla (`container`) que lo muestra con
 * `object-fit: cover`. Así se dibuja un landmark alineado al píxel sobre
 * un canvas que cubre el mismo rect que el `<video>` (LandmarkOverlay,
 * Fase 3).
 */
export function normalizedToCoverPx(point: Point2D, content: Size, container: Size): Point2D {
  const fit = computeCoverFit(content, container)
  return {
    x: point.x * content.width * fit.scale - fit.offsetX,
    y: point.y * content.height * fit.scale - fit.offsetY,
  }
}

/** Invierte el eje X en coordenadas normalizadas (0–1). Útil para lógica que debe ser "espejo-consciente". */
export function mirrorX(point: Point2D): Point2D {
  return { x: 1 - point.x, y: point.y }
}

/**
 * Handedness de MediaPipe se calcula sobre la imagen SIN espejar. Cuando la
 * app espeja visualmente el video (cámara frontal, `transform: scaleX(-1)`,
 * §4.5), la mano que MediaPipe reporta como "Right" es, para el usuario que
 * se ve como en un espejo, su mano IZQUIERDA. Esta función traduce el
 * handedness crudo al handedness que el usuario percibe cuando el video
 * está espejado. Con cámara trasera (`isMirrored = false`) no hay
 * corrección: el valor crudo ya es el correcto.
 */
export function mirroredHandedness(
  handedness: 'Left' | 'Right',
  isMirrored: boolean,
): 'Left' | 'Right' {
  if (!isMirrored) return handedness
  return handedness === 'Left' ? 'Right' : 'Left'
}
