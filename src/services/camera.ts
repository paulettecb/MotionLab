// services/camera.ts
// Capa sin Vue: encapsula getUserMedia, enumeración de dispositivos y el
// ciclo de vida (idempotente) de un stream de cámara. Testeable en
// aislamiento; `composables/useCamera.ts` es la capa fina que la conecta
// al ciclo de vida de componentes.

export type CameraStatus =
  | 'idle'
  | 'requesting-permission'
  | 'starting'
  | 'running'
  | 'stopped'
  | 'error'

export type CameraErrorCode =
  | 'permission-denied'
  | 'no-camera'
  | 'in-use'
  | 'insecure-context'
  | 'unknown'

export interface CameraError {
  code: CameraErrorCode
  message: string
  action: string
  cause?: unknown
}

export interface CameraStartOptions {
  deviceId?: string
  facingMode?: 'user' | 'environment'
  width?: number
  height?: number
}

// §4.16: 640×480 alcanza para inferencia; el <video> puede *mostrarse* más
// grande que la resolución capturada.
const DEFAULT_CAPTURE_WIDTH = 640
const DEFAULT_CAPTURE_HEIGHT = 480

export function isSecureContext(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext === true
}

/** Traduce cualquier error de getUserMedia/entorno a un CameraError tipado con acción sugerida. */
export function toCameraError(err: unknown): CameraError {
  if (!isSecureContext()) {
    return {
      code: 'insecure-context',
      message: 'La cámara requiere una conexión segura.',
      action: 'Abre la app usando https:// (o localhost) e inténtalo de nuevo.',
      cause: err,
    }
  }

  const name = err instanceof DOMException ? err.name : undefined

  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return {
        code: 'permission-denied',
        message: 'Permiso de cámara denegado.',
        action: 'Habilita el acceso a la cámara para este sitio en los ajustes del navegador y recarga la página.',
        cause: err,
      }
    case 'NotFoundError':
    case 'OverconstrainedError':
      return {
        code: 'no-camera',
        message: 'No encontramos una cámara disponible.',
        action: 'Conecta una cámara o revisa que no esté deshabilitada en el sistema.',
        cause: err,
      }
    case 'NotReadableError':
    case 'TrackStartError':
      return {
        code: 'in-use',
        message: 'La cámara está siendo usada por otra aplicación.',
        action: 'Cierra otras apps o pestañas que puedan estar usándola e inténtalo de nuevo.',
        cause: err,
      }
    default:
      return {
        code: 'unknown',
        message: 'Ocurrió un error inesperado al acceder a la cámara.',
        action: 'Intenta de nuevo; si persiste, recarga la página.',
        cause: err,
      }
  }
}

export async function listVideoInputDevices(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return []
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices.filter((d) => d.kind === 'videoinput')
}

export async function requestCameraStream(
  options: CameraStartOptions = {},
): Promise<MediaStream> {
  if (!isSecureContext()) {
    throw toCameraError(new Error('insecure-context'))
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    throw toCameraError(new Error('getUserMedia unsupported'))
  }

  const video: MediaTrackConstraints = {
    width: { ideal: options.width ?? DEFAULT_CAPTURE_WIDTH },
    height: { ideal: options.height ?? DEFAULT_CAPTURE_HEIGHT },
  }

  if (options.deviceId) {
    video.deviceId = { exact: options.deviceId }
  } else {
    video.facingMode = { ideal: options.facingMode ?? 'user' }
  }

  try {
    return await navigator.mediaDevices.getUserMedia({ video, audio: false })
  } catch (err) {
    throw toCameraError(err)
  }
}

export function stopStream(stream: MediaStream | null | undefined): void {
  stream?.getTracks().forEach((track) => track.stop())
}

/**
 * Dueño único del stream de cámara activo. start()/stop() son idempotentes:
 * llamadas repetidas o concurrentes no abren streams duplicados ni dejan
 * tracks huérfanos (LED de cámara como señal de confianza, §4.19).
 */
export class CameraService {
  private stream: MediaStream | null = null
  private pendingStart: Promise<MediaStream> | null = null
  private currentFacing: 'user' | 'environment' = 'user'
  private currentDeviceId: string | undefined

  get activeStream(): MediaStream | null {
    return this.stream
  }

  get facing(): 'user' | 'environment' {
    return this.currentFacing
  }

  async start(options: CameraStartOptions = {}): Promise<MediaStream> {
    if (this.stream) return this.stream
    if (this.pendingStart) return this.pendingStart

    this.currentFacing = options.facingMode ?? this.currentFacing
    this.currentDeviceId = options.deviceId ?? this.currentDeviceId

    this.pendingStart = requestCameraStream({
      ...options,
      facingMode: this.currentFacing,
      deviceId: this.currentDeviceId,
    })

    try {
      this.stream = await this.pendingStart
      return this.stream
    } finally {
      this.pendingStart = null
    }
  }

  stop(): void {
    if (!this.stream) return
    stopStream(this.stream)
    this.stream = null
  }

  /** Detiene el stream actual y abre uno nuevo con la cámara opuesta. */
  async switchFacing(): Promise<MediaStream> {
    const nextFacing = this.currentFacing === 'user' ? 'environment' : 'user'
    this.stop()
    this.currentDeviceId = undefined
    return this.start({ facingMode: nextFacing })
  }

  /** Detiene el stream actual y abre uno nuevo apuntando a un deviceId específico. */
  async switchDevice(deviceId: string): Promise<MediaStream> {
    this.stop()
    return this.start({ deviceId })
  }

  async listDevices(): Promise<MediaDeviceInfo[]> {
    return listVideoInputDevices()
  }
}
