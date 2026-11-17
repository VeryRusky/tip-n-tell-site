import { createRouter, createWebHistory } from 'vue-router'
import { useBookingStore } from '@/stores/booking'
import { site } from '@/config/site'
import { bookingSteps } from './steps'

import HomeView from '@/views/HomeView.vue'
import PoliciesView from '@/views/PoliciesView.vue'
import BookSlotView from '@/views/BookSlotView.vue'
import BookServiceView from '@/views/BookServiceView.vue'
import BookDesignView from '@/views/BookDesignView.vue'
import BookSendView from '@/views/BookSendView.vue'
import NotFoundView from '@/views/NotFoundView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView, meta: { title: 'Home' } },
    { path: '/policies', name: 'policies', component: PoliciesView, meta: { title: 'Policies' } },
    { path: '/book', redirect: { name: 'book-slot' } },
    {
      path: '/book/time',
      name: 'book-slot',
      component: BookSlotView,
      meta: { step: 1, title: 'Pick a time' },
    },
    {
      path: '/book/service',
      name: 'book-service',
      component: BookServiceView,
      meta: { step: 2, title: 'Choose a service' },
    },
    {
      path: '/book/design',
      name: 'book-design',
      component: BookDesignView,
      meta: { step: 3, title: 'Choose a design' },
    },
    {
      path: '/book/send',
      name: 'book-send',
      component: BookSendView,
      meta: { step: 4, title: 'Send your request' },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundView,
      meta: { title: 'Not found' },
    },
  ],
  // Start each page at the top (but keep the old position when using the browser Back button).
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    // Links like /#prices (from the footer): scroll to that section, below the sticky header.
    // Wait a moment first so the prices and designs have loaded and the page has its full height.
    if (to.hash) {
      return new Promise((resolve) => {
        setTimeout(() => resolve({ el: to.hash, top: 80 }), 300)
      })
    }
    return { top: 0 }
  },
})

// Stop people skipping ahead, e.g. opening /book/send before choosing a slot.
router.beforeEach((to) => {
  const step = to.meta.step
  if (!step) return true
  const booking = useBookingStore()
  if (step <= booking.furthestStep) return true
  return { name: bookingSteps[booking.furthestStep - 1].name }
})

router.afterEach((to) => {
  document.title =
    to.name === 'home'
      ? `${site.brandName} · nails in ${site.area}`
      : `${to.meta.title} · ${site.brandName}`
})

export default router
