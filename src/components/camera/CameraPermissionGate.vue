<script setup lang="ts">
// CameraPermissionGate (Task 05): estados de permiso sobre el stage.
// Nunca dispara getUserMedia por su cuenta (§4.1) — solo emite 'start' tras
// un click explícito del usuario. El precheck de Permissions API únicamente
// cambia la copia del botón (Activar vs Continuar), nunca salta el click.
import { computed, onMounted, ref } from 'vue'
import type { CameraError, CameraStatus } from '@/services/camera'

const { status, error } = defineProps<{
  status: CameraStatus
  error: CameraError | null
}>()

const emit = defineEmits<{ start: [] }>()

const permissionState = ref<PermissionState | 'unsupported'>('unsupported')

onMounted(async () => {
  try {
    const result = await navigator.permissions.query({ name: 'camera' as PermissionName })
    permissionState.value = result.state
  } catch {
    // Safari y algunos navegadores no soportan 'camera' en la Permissions
    // API: nos quedamos con la copia genérica, sin bloquear nada.
    permissionState.value = 'unsupported'
  }
})

const isBusy = computed(
  () => status === 'requesting-permission' || status === 'starting',
)

const ctaLabel = computed(() => {
  if (status === 'error') return 'Reintentar'
  return permissionState.value === 'granted' ? 'Continuar' : 'Activar cámara'
})

const busyMessage = computed(() =>
  status === 'requesting-permission' ? 'Pidiendo permiso a tu cámara…' : 'Abriendo cámara…',
)

function handleClick(): void {
  emit('start')
}
</script>

<template>
  <div class="permission-gate">
    <template v-if="status === 'error' && error">
      <p class="permission-gate__message permission-gate__message--error">{{ error.message }}</p>
      <p class="permission-gate__action">{{ error.action }}</p>
      <button class="permission-gate__button" type="button" @click="handleClick">
        {{ ctaLabel }}
      </button>
    </template>

    <template v-else-if="isBusy">
      <p class="permission-gate__message">{{ busyMessage }}</p>
    </template>

    <template v-else>
      <p class="permission-gate__message">
        Vamos a pedir tu cámara. El video nunca sale de tu dispositivo: todo el
        procesamiento ocurre localmente en el navegador.
      </p>
      <button class="permission-gate__button" type="button" @click="handleClick">
        {{ ctaLabel }}
      </button>
    </template>
  </div>
</template>

<style scoped>
.permission-gate {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-4);
  text-align: center;
  background: var(--color-surface);
}

.permission-gate__message {
  color: var(--color-text);
  max-width: 32ch;
  margin: 0;
  font-family: var(--font-display);
}

.permission-gate__message--error {
  color: var(--color-error);
}

.permission-gate__action {
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 0.85rem;
  max-width: 36ch;
  margin: 0;
}

.permission-gate__button {
  font-family: var(--font-display);
  font-size: 0.95rem;
  min-height: 44px;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  border: none;
  background: var(--color-accent);
  color: var(--color-bg);
  cursor: pointer;
  transition: opacity var(--duration-fast) var(--ease-standard);
}

.permission-gate__button:hover {
  opacity: 0.85;
}
</style>
