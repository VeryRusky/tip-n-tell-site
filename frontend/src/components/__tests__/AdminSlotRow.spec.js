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
    expect(button(wrapper, 'Keep it').classes()).toContain('btn-primary')
    expect(button(wrapper, 'Remove 2pm').classes()).toContain('btn-outline-danger')

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

  it('offers "Add details" on a booked time that has none, and not on an open time', async () => {
    const booked = mount(AdminSlotRow, { props: { timeSlot: makeSlot({ status: 'booked' }) } })
    const open = mount(AdminSlotRow, { props: { timeSlot: makeSlot() } })

    expect(open.text()).not.toContain('Add details')
    await button(booked, 'Add details').trigger('click')
    expect(booked.emitted('details')).toHaveLength(1)
  })

  it('shows who is coming and what for, and opens the details when tapped', async () => {
    const catalog = {
      services: [{ id: 'extensions', name: 'Extensions', price: 35 }],
      designs: [{ number: 3, name: 'Cherry bows' }],
    }
    const booking = { customer: 'Mei', service: 'extensions', design: 3, price: 45 }
    const wrapper = mount(AdminSlotRow, {
      props: { timeSlot: makeSlot({ status: 'pending', booking }), catalog },
    })

    const summary = wrapper.find('.details-summary')
    expect(summary.text()).toBe('Mei · Extensions · #3 Cherry bows · $45')
    await summary.trigger('click')
    expect(wrapper.emitted('details')).toHaveLength(1)
  })

  it('has no Remove button on a day that has passed', () => {
    const wrapper = mount(AdminSlotRow, { props: { timeSlot: makeSlot(), canRemove: false } })

    expect(wrapper.find('button[aria-label="Remove 2pm"]').exists()).toBe(false)
  })
})
