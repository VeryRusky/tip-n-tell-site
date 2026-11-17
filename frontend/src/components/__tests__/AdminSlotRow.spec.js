import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import AdminSlotRow from '../admin/AdminSlotRow.vue'

// A slot as the admin API returns it.
function makeSlot(changes = {}) {
  return {
    id: 'abc',
    date: '2026-12-12',
    time: '14:00',
    status: 'open',
    special: false,
    ...changes,
  }
}

describe('AdminSlotRow', () => {
  it('shows the time and which status is chosen', () => {
    const wrapper = mount(AdminSlotRow, { props: { timeSlot: makeSlot({ status: 'pending' }) } })

    expect(wrapper.find('h3').text()).toBe('2pm')
    const checked = wrapper.find('input[type="radio"]:checked')
    expect(wrapper.find(`label[for="${checked.attributes('id')}"]`).text()).toBe('On hold')
  })

  it('says which status she tapped', async () => {
    const wrapper = mount(AdminSlotRow, { props: { timeSlot: makeSlot() } })

    await wrapper.find('input[value="booked"]').setValue(true)

    expect(wrapper.emitted('set-status')).toEqual([['booked']])
  })

  it('says when the special switch is turned on', async () => {
    const wrapper = mount(AdminSlotRow, { props: { timeSlot: makeSlot() } })

    await wrapper.find('input[role="switch"]').setValue(true)

    expect(wrapper.emitted('set-special')).toEqual([[true]])
  })

  it('removes an open slot straight away', async () => {
    const wrapper = mount(AdminSlotRow, { props: { timeSlot: makeSlot() } })

    await wrapper.find('button.remove-link').trigger('click')

    expect(wrapper.emitted('remove')).toHaveLength(1)
  })

  it('asks before removing a booked slot', async () => {
    const wrapper = mount(AdminSlotRow, { props: { timeSlot: makeSlot({ status: 'booked' }) } })

    await wrapper.find('button.remove-link').trigger('click')
    expect(wrapper.text()).toContain('Remove 2pm? It is booked for someone.')
    expect(wrapper.emitted('remove')).toBeUndefined()

    const yes = wrapper.findAll('button').find((button) => button.text() === 'Yes, remove')
    await yes.trigger('click')
    expect(wrapper.emitted('remove')).toHaveLength(1)
  })

  it('keeps an on-hold slot when she changes her mind', async () => {
    const wrapper = mount(AdminSlotRow, { props: { timeSlot: makeSlot({ status: 'pending' }) } })

    await wrapper.find('button.remove-link').trigger('click')
    const keep = wrapper.findAll('button').find((button) => button.text() === 'Keep it')
    await keep.trigger('click')

    expect(wrapper.emitted('remove')).toBeUndefined()
    expect(wrapper.find('button.remove-link').text()).toBe('Remove 2pm')
  })
})
