import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import AdminBulkBar from '../admin/AdminBulkBar.vue'

// Finds a button by the words she sees on it.
function button(wrapper, words) {
  return wrapper.findAll('button').find((b) => b.text().startsWith(words))
}

describe('AdminBulkBar', () => {
  it('says how many days are selected', () => {
    const wrapper = mount(AdminBulkBar, { props: { count: 8 } })

    expect(wrapper.find('h2').text()).toBe('8 days selected')
  })

  it('cannot remove anything when the days have no times', () => {
    const wrapper = mount(AdminBulkBar, { props: { count: 2, openCount: 0, totalCount: 0 } })

    expect(button(wrapper, 'Open times').attributes('disabled')).toBeUndefined()
    expect(button(wrapper, 'Remove open').attributes('disabled')).toBeDefined()
    expect(button(wrapper, 'Remove all').attributes('disabled')).toBeDefined()
  })

  it('shows how many times each remove button would remove', () => {
    const wrapper = mount(AdminBulkBar, { props: { count: 2, openCount: 5, totalCount: 6 } })

    expect(button(wrapper, 'Remove open').text()).toContain('(5)')
    expect(button(wrapper, 'Remove all').text()).toContain('(6)')
  })

  it('says which action she tapped', async () => {
    const wrapper = mount(AdminBulkBar, { props: { count: 2, openCount: 5, totalCount: 6 } })

    await button(wrapper, 'Open times').trigger('click')
    await button(wrapper, 'Remove open').trigger('click')
    await button(wrapper, 'Remove all').trigger('click')
    await button(wrapper, 'Clear selection').trigger('click')
    await button(wrapper, 'Done').trigger('click')

    for (const event of ['open-times', 'remove-open', 'remove-all', 'clear', 'done']) {
      expect(wrapper.emitted(event)).toHaveLength(1)
    }
  })

  it('shows which action is saving and blocks a second tap', () => {
    const wrapper = mount(AdminBulkBar, {
      props: { count: 2, openCount: 5, totalCount: 6, working: 'bulk-remove-open' },
    })

    expect(button(wrapper, 'Removing…').attributes('aria-busy')).toBe('true')
    expect(button(wrapper, 'Open times').attributes('disabled')).toBeDefined()
  })
})
