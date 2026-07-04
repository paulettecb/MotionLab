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
  background: rgb(255 255 255 / 85%);
  backdrop-filter: blur(6px);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.camera-controls__button {
  min-height: 44px; /* touch target ≥44px, §4.15 */
  padding: var(--space-2) var(--space-3);
  font-family: var(--font-sans);
  font-weight: var(--weight-medium);
  font-size: var(--text-sm);
  color: var(--text-secondary);
  background: var(--surface-card);
  border: var(--border-width) solid var(--border-subtle);
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition:
    background var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out),
    color var(--dur-fast) var(--ease-out);
}

.camera-controls__button:hover {
  background: var(--surface-brand-soft);
  color: var(--text-primary);
}

.camera-controls__button--active {
  border-color: var(--periwinkle-500);
  color: var(--periwinkle-700);
  background: var(--surface-brand-soft);
}
</style>
