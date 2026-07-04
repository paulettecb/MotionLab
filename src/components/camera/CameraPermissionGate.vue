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
  gap: var(--space-4);
  padding: var(--space-6);
  text-align: center;
  background: var(--oat);
}

.permission-gate__message {
  color: var(--text-primary);
  max-width: 32ch;
  margin: 0;
  font-family: var(--font-sans);
  font-size: var(--text-md);
}

.permission-gate__message--error {
  color: var(--danger);
}

.permission-gate__action {
  color: var(--text-muted);
  font-family: var(--font-sans);
  font-size: var(--text-sm);
  max-width: 36ch;
  margin: 0;
}

.permission-gate__button {
  font-family: var(--font-sans);
  font-weight: var(--weight-semibold);
  font-size: var(--text-base);
  min-height: 44px;
  padding: var(--space-2) var(--space-5);
  border-radius: var(--radius-pill);
  border: none;
  background: var(--periwinkle-500);
  color: var(--text-on-brand);
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition:
    background var(--dur-fast) var(--ease-out),
    box-shadow var(--dur-fast) var(--ease-out);
}

.permission-gate__button:hover {
  background: var(--periwinkle-600);
  box-shadow: var(--shadow-md);
}
</style>
