<script setup lang="ts">
const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/lsm', label: 'LSM' },
  { to: '/agility', label: 'Agility' },
  { to: '/exercise', label: 'Exercise' },
  { to: '/experiments', label: 'Experiments' },
]
</script>

<template>
  <div class="app-shell">
    <header class="app-shell__header">
      <RouterLink to="/" class="app-shell__brand">Motion Lab</RouterLink>
      <nav class="app-shell__nav">
        <RouterLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="app-shell__link"
          active-class="app-shell__link--active"
        >
          {{ link.label }}
        </RouterLink>
      </nav>
    </header>
    <main class="app-shell__main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--surface-page);
  color: var(--text-primary);
  font-family: var(--font-sans);
}

.app-shell__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-5);
  background: var(--surface-card);
  border-bottom: var(--border-width) solid var(--border-subtle);
}

.app-shell__brand {
  /* El wordmark es el "spark" de whimsy de la marca (§2.8): único lugar
     donde se usa Friendship en toda la UI. */
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--text-primary);
  text-decoration: none;
}

.app-shell__nav {
  display: flex;
  gap: var(--space-3);
}

.app-shell__link {
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: var(--weight-medium);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-pill);
  transition: color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out);
}

.app-shell__link:hover {
  color: var(--text-primary);
  background: var(--surface-brand-soft);
}

.app-shell__link--active {
  color: var(--periwinkle-700);
  background: var(--surface-brand-soft);
}

.app-shell__main {
  flex: 1;
  width: 100%;
  max-width: var(--container-max);
  margin: 0 auto;
  padding: var(--space-8) var(--space-5);
}
</style>
