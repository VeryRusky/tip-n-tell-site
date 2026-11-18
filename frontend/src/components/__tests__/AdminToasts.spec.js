import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import AdminToasts from '../admin/AdminToasts.vue'
import { useAdminToastStore } from '@/stores/adminToast'

// Shows the store's message. The message is placed at the end of <body> on the real
// page; in these tests it stays in place.
function mountToasts() {
  const pinia = createPinia()
  setActivePinia(pinia)
  const wrapper = mount(AdminToasts, {
    global: { plugins: [pinia], stubs: { teleport: true } },
  })
  return { wrapper, toast: useAdminToastStore() }
}

describe('AdminToasts', () => {
  it('has one region that screen readers watch, even before any message', () => {
    const { wrapper } = mountToasts()

    expect(wrapper.findAll('[aria-live]')).toHaveLength(1)
    expect(wrapper.find('[aria-live]').attributes('role')).toBe('status')
  })

  it('shows what happened with an Undo button that runs the undo', async () => {
    const { wrapper, toast } = mountToasts()
    const undo = vi.fn()

    toast.done('Removed 9 times', undo)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('Removed 9 times')

    await wrapper.find('button').trigger('click')
    expect(undo).toHaveBeenCalledTimes(1)
  })

  it('cannot run the undo twice', async () => {
    const { wrapper, toast } = mountToasts()
    let finish
    const undo = vi.fn(() => new Promise((resolve) => (finish = resolve)))

    toast.done('Opened 12 times', undo)
    await wrapper.vm.$nextTick()
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('button').text()).toBe('Undoing…')
    await wrapper.find('button').trigger('click')

    expect(undo).toHaveBeenCalledTimes(1)
    finish()
  })

  it('lets her close an error message', async () => {
    const { wrapper, toast } = mountToasts()

    toast.failed('Not saved: no connection.')
    await wrapper.vm.$nextTick()
    await wrapper.find('button[aria-label="Close this message"]').trigger('click')

    expect(wrapper.text()).not.toContain('Not saved')
  })
})
