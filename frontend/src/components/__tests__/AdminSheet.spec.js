import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import AdminSheet from '../admin/AdminSheet.vue'

// The sheet is normally placed at the end of <body>; in these tests it stays in place.
function mountSheet(props = {}) {
  return mount(AdminSheet, {
    props: { open: true, title: 'Thursday 3 December', ...props },
    slots: { default: '<button type="button">Inside</button>' },
    global: { stubs: { teleport: true } },
  })
}

describe('AdminSheet', () => {
  it('shows its title and content when open, and is named by its title', () => {
    const wrapper = mountSheet()

    const dialog = wrapper.find('[role="dialog"]')
    expect(dialog.attributes('aria-modal')).toBe('true')
    const title = wrapper.find(`#${dialog.attributes('aria-labelledby')}`)
    expect(title.text()).toBe('Thursday 3 December')
    expect(wrapper.text()).toContain('Inside')
  })

  it('shows nothing when closed', () => {
    const wrapper = mountSheet({ open: false })

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('closes with the Close button', async () => {
    const wrapper = mountSheet()

    await wrapper.find('.sheet-close').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('closes with the Esc key', async () => {
    const wrapper = mountSheet()

    await wrapper.find('[role="dialog"]').trigger('keydown', { key: 'Escape' })

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('closes when she taps the dimmed background', async () => {
    const wrapper = mountSheet()

    await wrapper.find('.sheet-backdrop').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
