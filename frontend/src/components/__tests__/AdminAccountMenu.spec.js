import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import AdminAccountMenu from '../admin/AdminAccountMenu.vue'

function mountMenu() {
  return mount(AdminAccountMenu, {
    props: { email: 'owner@example.com' },
    attachTo: document.body,
  })
}

describe('AdminAccountMenu', () => {
  it('keeps the email and Sign out hidden until she taps the account button', async () => {
    const wrapper = mountMenu()
    const toggle = wrapper.find('button[aria-label="Account"]')

    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('.account-panel').isVisible()).toBe(false)

    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('.account-panel').isVisible()).toBe(true)
    expect(wrapper.find('.account-panel').text()).toContain('Signed in as')
    expect(wrapper.find('.account-panel').text()).toContain('owner@example.com')
    wrapper.unmount()
  })

  it('signs out when she taps Sign out', async () => {
    const wrapper = mountMenu()

    await wrapper.find('button[aria-label="Account"]').trigger('click')
    await wrapper.find('.account-panel button').trigger('click')

    expect(wrapper.emitted('sign-out')).toHaveLength(1)
    wrapper.unmount()
  })

  it('closes with the Esc key', async () => {
    const wrapper = mountMenu()
    const toggle = wrapper.find('button[aria-label="Account"]')

    await toggle.trigger('click')
    await wrapper.find('.account-menu').trigger('keydown', { key: 'Escape' })

    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(wrapper.find('.account-panel').isVisible()).toBe(false)
    wrapper.unmount()
  })
})
