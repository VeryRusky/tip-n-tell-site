// The owner's admin pages. They are only added to the router when the site runs with the
// real API (VITE_API_URL is set), so the sample-data demo has no admin pages at all.
//
// Each page is loaded on demand (`() => import(...)`): customers never download them.
// Nothing on the public site links here; she bookmarks /admin on her phone.

export const adminRoutes = [
  {
    path: '/admin/login',
    name: 'admin-login',
    component: () => import('@/views/admin/AdminLoginView.vue'),
    meta: { admin: true, signedOutOk: true, title: 'Admin sign in' },
  },
  {
    path: '/admin',
    name: 'admin-calendar',
    component: () => import('@/views/admin/AdminCalendarView.vue'),
    meta: { admin: true, title: 'Admin calendar' },
  },
  {
    path: '/admin/designs',
    name: 'admin-designs',
    component: () => import('@/views/admin/AdminDesignsView.vue'),
    meta: { admin: true, title: 'Admin designs' },
  },
]

// Route guard: signed-out visitors are sent to the login page, then brought back.
export async function adminGuard(to) {
  if (!to.meta.admin || to.meta.signedOutOk) return true
  const { useAdminStore } = await import('@/stores/admin')
  const admin = useAdminStore()
  if (!admin.checked) {
    try {
      await admin.checkSession()
    } catch {
      // Server unreachable: the login page explains.
    }
  }
  if (admin.signedIn) return true
  return { name: 'admin-login', query: { next: to.fullPath } }
}

// Asks search engines not to list the admin pages (adds or removes <meta name="robots">).
export function updateRobotsTag(to) {
  let tag = document.querySelector('meta[name="robots"]')
  if (to.meta.admin) {
    if (!tag) {
      tag = document.createElement('meta')
      tag.name = 'robots'
      document.head.appendChild(tag)
    }
    tag.content = 'noindex, nofollow'
  } else {
    tag?.remove()
  }
}
