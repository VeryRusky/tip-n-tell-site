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

// Finds a button by the words she sees on it.
function button(wrapper, words) {
  return wrapper.findAll('button').find((b) => b.text().includes(words))
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

  it('turns Special on when she taps it', async () => {
    const wrapper = mount(AdminSlotRow, { props: { timeSlot: makeSlot() } })

    await button(wrapper, 'Special').trigger('click')

    expect(wrapper.emitted('set-special')).toEqual([[true]])
  })

  it('explains a special slot with the real fee', () => {
    const wrapper = mount(AdminSlotRow, {
      props: { timeSlot: makeSlot({ special: true }), specialFee: 10 },
    })

    expect(button(wrapper, 'Special').attributes('aria-pressed')).toBe('true')
    expect(wrapper.text()).toContain('Specially opened slot: customers see +$10')
  })

  it('removes an open slot straight away', async () => {
    const wrapper = mount(AdminSlotRow, { props: { timeSlot: makeSlot() } })

    await wrapper.find('button[aria-label="Remove 2pm"]').trigger('click')

    expect(wrapper.emitted('remove')).toHaveLength(1)
  })

  it('asks before removing a booked slot', async () => {
    const wrapper = mount(AdminSlotRow, { props: { timeSlot: makeSlot({ status: 'booked' }) } })

    await wrapper.find('button[aria-label="Remove 2pm"]').trigger('click')
    expect(wrapper.text()).toContain('2pm is booked. Remove it anyway?')
    expect(wrapper.emitted('remove')).toBeUndefined()

    await button(wrapper, 'Remove 2pm').trigger('click')
    expect(wrapper.emitted('remove')).toHaveLength(1)
  })

  it('keeps an on-hold slot when she changes her mind', async () => {
    const wrapper = mount(AdminSlotRow, { props: { timeSlot: makeSlot({ status: 'pending' }) } })

    await wrapper.find('button[aria-label="Remove 2pm"]').trigger('click')
    await button(wrapper, 'Keep it').trigger('click')

    expect(wrapper.emitted('remove')).toBeUndefined()
    expect(wrapper.find('button[aria-label="Remove 2pm"]').exists()).toBe(true)
  })

  it('has no Remove button on a day that has passed', () => {
    const wrapper = mount(AdminSlotRow, { props: { timeSlot: makeSlot(), canRemove: false } })

    expect(wrapper.find('button[aria-label="Remove 2pm"]').exists()).toBe(false)
  })
})
