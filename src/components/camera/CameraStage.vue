<script setup lang="ts">
// CameraStage (Task 05): video + canvas overlay apilados. El <video> y el
// <canvas> viven SIEMPRE en el DOM (nunca condicionados por el status) para
// que `videoRef` esté disponible desde el montaje — useCamera().start()
// necesita el elemento ya montado para poder attachear el stream. El gate
// de permisos se dibuja encima como overlay (§4.2: el usuario nunca ve un
// frame crudo/congelado mientras no hay stream).
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useCamera } from '@/composables/useCamera'
import CameraPermissionGate from './CameraPermissionGate.vue'
import CameraControls from './CameraControls.vue'

const { videoRef, status, error, devices, currentFacing, start, stop, switchCamera } = useCamera()

const stageRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const mirrorPref = ref(true)

let resizeObserver: ResizeObserver | null = null

const isRunning = computed(() => status.value === 'running')
// Cámara frontal se espeja para que el usuario se vea como en un espejo
// (§4.5); trasera nunca se espeja, sin importar la preferencia.
const isMirrored = computed(() => mirrorPref.value && currentFacing.value === 'user')

/**
 * Redimensiona el canvas overlay al mismo rect en pantalla que el stage
 * (mismo box que el <video> vía CSS), ajustado a devicePixelRatio para que
 * lo que se dibuje encima (landmarks, Fase 3) salga nítido. La conversión
 * de coordenadas normalizadas de un landmark a este rect vive en
 * `utils/coords.ts` (computeCoverFit), no aquí.
 */
function syncOverlaySize(): void {
  const stage = stageRef.value
  const canvas = canvasRef.value
  if (!stage || !canvas) return

  const width = stage.clientWidth
  const height = stage.clientHeight
  if (width === 0 || height === 0) return

  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
}

async function handleStart(): Promise<void> {
  await start()
}

function handleStop(): void {
  stop()
}

async function handleSwitchCamera(): Promise<void> {
  await switchCamera()
}

function toggleMirror(): void {
  mirrorPref.value = !mirrorPref.value
}

onMounted(() => {
  syncOverlaySize()
  if (typeof ResizeObserver !== 'undefined' && stageRef.value) {
    resizeObserver = new ResizeObserver(() => syncOverlaySize())
    resizeObserver.observe(stageRef.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <div ref="stageRef" class="camera-stage">
    <video
      ref="videoRef"
      class="camera-stage__video"
      :class="{ 'camera-stage__video--mirrored': isMirrored }"
      muted
      playsinline
      @loadedmetadata="syncOverlaySize"
    />
    <canvas
      ref="canvasRef"
      class="camera-stage__overlay"
      :class="{ 'camera-stage__overlay--mirrored': isMirrored }"
    />

    <CameraPermissionGate v-if="!isRunning" :status="status" :error="error" @start="handleStart" />

    <CameraControls
      v-else
      class="camera-stage__controls"
      :facing="currentFacing"
      :can-switch="devices.length > 1"
      :mirrored="isMirrored"
      @stop="handleStop"
      @switch-camera="handleSwitchCamera"
      @toggle-mirror="toggleMirror"
    />
  </div>
</template>

<style scoped>
.camera-stage {
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: var(--oat);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}

.camera-stage__video,
.camera-stage__overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.camera-stage__video {
  object-fit: cover;
}

.camera-stage__video--mirrored,
.camera-stage__overlay--mirrored {
  transform: scaleX(-1);
}

.camera-stage__overlay {
  pointer-events: none;
}

.camera-stage__controls {
  position: absolute;
  right: var(--space-3);
  bottom: var(--space-3);
}
</style>
