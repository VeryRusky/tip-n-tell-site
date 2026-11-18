import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import AdminOpenTimesForm from '../admin/AdminOpenTimesForm.vue'

describe('AdminOpenTimesForm', () => {
  it('starts with all her usual times ticked and says what it will do', () => {
    const wrapper = mount(AdminOpenTimesForm, { props: { dayCount: 4, specialFee: 10 } })

    expect(
      wrapper.findAll('input[type="checkbox"]:not([role])').map((box) => box.element.checked),
    ).toEqual([true, true, true])
    expect(wrapper.find('button[type="submit"]').text()).toBe('Open 3 times on 4 days')
    expect(wrapper.text()).toContain('Customers see +$10 on these times.')
  })

  it('opens the chosen times as special slots', async () => {
    const wrapper = mount(AdminOpenTimesForm, { props: { dayCount: 4 } })

    await wrapper.find('input[value="14:00"]').setValue(false)
    await wrapper.find('input[role="switch"]').setValue(true)
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('open')).toEqual([[{ times: ['10:00', '16:00'], special: true }]])
  })

  it('cannot open nothing', async () => {
    const wrapper = mount(AdminOpenTimesForm, { props: { dayCount: 1 } })

    for (const time of ['10:00', '14:00', '16:00']) {
      await wrapper.find(`input[value="${time}"]`).setValue(false)
    }

    expect(wrapper.find('button[type="submit"]').text()).toBe('Choose at least one time')
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })
})
