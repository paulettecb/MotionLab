<script setup lang="ts">
// CameraControls (Task 05): detener, cambiar de cámara (solo si hay >1
// videoinput, §4.4) y mirror. Presentacional puro: no toca useCamera.
const { facing, canSwitch, mirrored } = defineProps<{
  facing: 'user' | 'environment'
  canSwitch: boolean
  mirrored: boolean
}>()

const emit = defineEmits<{
  stop: []
  'switch-camera': []
  'toggle-mirror': []
}>()
</script>

<template>
  <div class="camera-controls">
    <button
      class="camera-controls__button"
      type="button"
      title="Detener cámara"
      @click="emit('stop')"
    >
      Detener
    </button>

    <button
      v-if="canSwitch"
      class="camera-controls__button"
      type="button"
      :title="facing === 'user' ? 'Cambiar a cámara trasera' : 'Cambiar a cámara frontal'"
      @click="emit('switch-camera')"
    >
      Cambiar cámara
    </button>

    <button
      class="camera-controls__button"
      :class="{ 'camera-controls__button--active': mirrored }"
      type="button"
      title="Espejo"
      @click="emit('toggle-mirror')"
    >
      Espejo {{ mirrored ? 'on' : 'off' }}
    </button>
  </div>
</template>

<style scoped>
.camera-controls {
  display: flex;
  gap: var(--space-2);
  padding: var(--space-2);
  background: rgb(10 10 10 / 55%);
  backdrop-filter: blur(6px);
  border-radius: var(--radius-md);
}

.camera-controls__button {
  min-height: 44px; /* touch target ≥44px, §4.15 */
  padding: var(--space-1) var(--space-2);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition:
    background var(--duration-fast) var(--ease-standard),
    border-color var(--duration-fast) var(--ease-standard);
}

.camera-controls__button:hover {
  background: #202020;
}

.camera-controls__button--active {
  border-color: var(--color-accent);
  color: var(--color-accent);
}
</style>
