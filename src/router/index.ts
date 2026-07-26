import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'table-demo',
      component: () => import('../components/TableDemo.vue'),
    },
    {
      path: '/benefit-details',
      name: 'benefit-details',
      component: () => import('../views/BenefitDetails.vue'),
    },
    {
      path: '/basic-table',
      name: 'basic-table',
      component: () => import('../views/BasicTableDemo.vue'),
    },
  ],
})

export default router
