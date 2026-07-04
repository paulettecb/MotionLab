import { createRouter, createWebHistory } from 'vue-router'

// Cada vista es un import dinámico: Vite genera un chunk separado por ruta
// (requisito de Task 02) y deja la puerta abierta a code-splitting pesado
// (p.ej. Three.js en experiments) sin tocar el router.
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/modules/home/HomeView.vue'),
    },
    {
      path: '/lsm',
      name: 'lsm',
      component: () => import('@/modules/lsm/LsmView.vue'),
    },
    {
      path: '/agility',
      name: 'agility',
      component: () => import('@/modules/agility/AgilityView.vue'),
    },
    {
      path: '/exercise',
      name: 'exercise',
      component: () => import('@/modules/exercise/ExerciseView.vue'),
    },
    {
      path: '/experiments',
      name: 'experiments',
      component: () => import('@/modules/experiments/ExperimentsView.vue'),
    },
  ],
})

export default router
