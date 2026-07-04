// composables/useCamera.ts
// Capa fina que conecta CameraService al ciclo de vida de componentes Vue.
// No expone el stream de landmarks (eso vive en visionRunner); solo el
// stream de video, estado de carga y errores tipados.

import { computed, onUnmounted, ref, type Ref } from 'vue'
import {
  CameraService,
  type CameraError,
  type CameraStartOptions,
  type CameraStatus,
} from '@/services/camera'

export interface UseCameraReturn {
  videoRef: Ref<HTMLVideoElement | null>
  status: Ref<CameraStatus>
  error: Ref<CameraError | null>
  devices: Ref<MediaDeviceInfo[]>
  currentFacing: Ref<'user' | 'environment'>
  start: (options?: CameraStartOptions) => Promise<void>
  stop: () => void
  switchCamera: () => Promise<void>
}

export function useCamera(): UseCameraReturn {
  const service = new CameraService()

  const videoRef = ref<HTMLVideoElement | null>(null)
  const status = ref<CameraStatus>('idle')
  const error = ref<CameraError | null>(null)
  const devices = ref<MediaDeviceInfo[]>([])
  const currentFacing = computed(() => service.facing)

  async function refreshDevices(): Promise<void> {
    try {
      devices.value = await service.listDevices()
    } catch {
      // Enumerar dispositivos no es crítico; si falla, la UI simplemente
      // no ofrece el switch de cámara.
      devices.value = []
    }
  }

  async function attachStream(stream: MediaStream): Promise<void> {
    const video = videoRef.value
    if (!video) return
    video.srcObject = stream
    try {
      await video.play()
    } catch {
      // El autoplay puede requerir interacción; start() ya se llama tras
      // un click del usuario, así que esto normalmente no dispara.
    }
  }

  async function start(options: CameraStartOptions = {}): Promise<void> {
    if (status.value === 'starting' || status.value === 'running') return

    status.value = 'requesting-permission'
    error.value = null

    try {
      status.value = 'starting'
      const stream = await service.start(options)
      await attachStream(stream)
      await refreshDevices() // labels de dispositivos solo llegan tras permiso concedido
      status.value = 'running'
    } catch (err) {
      error.value = err as CameraError
      status.value = 'error'
    }
  }

  function stop(): void {
    service.stop()
    if (videoRef.value) {
      videoRef.value.srcObject = null
    }
    status.value = 'stopped'
  }

  async function switchCamera(): Promise<void> {
    if (status.value !== 'running') return

    status.value = 'starting'
    try {
      const stream = await service.switchFacing()
      await attachStream(stream)
      await refreshDevices()
      status.value = 'running'
    } catch (err) {
      error.value = err as CameraError
      status.value = 'error'
    }
  }

  // §4.19: liberar recursos al desmontar — tracks detenidos (LED apagado).
  onUnmounted(() => {
    stop()
  })

  return {
    videoRef,
    status,
    error,
    devices,
    currentFacing,
    start,
    stop,
    switchCamera,
  }
}
