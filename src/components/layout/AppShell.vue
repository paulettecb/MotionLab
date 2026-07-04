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
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-display);
}

.app-shell__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-surface);
}

.app-shell__brand {
  color: var(--color-text);
  text-decoration: none;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.app-shell__nav {
  display: flex;
  gap: var(--space-3);
}

.app-shell__link {
  color: var(--color-text-muted);
  text-decoration: none;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  transition: color var(--duration-fast) var(--ease-standard);
}

.app-shell__link:hover {
  color: var(--color-text);
}

.app-shell__link--active {
  color: var(--color-accent);
}

.app-shell__main {
  flex: 1;
  padding: var(--space-5) var(--space-4);
}
</style>
