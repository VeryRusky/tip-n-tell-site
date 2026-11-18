import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import AdminBookingForm from '../admin/AdminBookingForm.vue'
import { buildRequestMessage } from '@/utils/message'

// Her price list and designs, as the calendar page passes them in.
const catalog = {
  services: [
    { id: 'no-extensions', name: 'No extensions', price: 25 },
    { id: 'extensions', name: 'Extensions', price: 35 },
  ],
  addOns: [{ id: 'foreign-removal', name: 'Foreign removal', price: 10 }],
  designs: [
    { number: 3, name: 'Cherry bows', image: null, colors: ['#8e1f2c', '#f7ece4'] },
    { number: 5, name: 'Milky pink', image: null, colors: ['#f4d6d8', '#ffffff'] },
  ],
  specialFee: 10,
}

function makeSlot(changes = {}) {
  return {
    id: 'a',
    date: '2026-12-12',
    time: '14:00',
    status: 'booked',
    special: false,
    ...changes,
  }
}

function mountForm(slot = makeSlot()) {
  return mount(AdminBookingForm, { props: { timeSlot: slot, catalog } })
}

// A request written by the public booking steps for 12 Dec, 2pm.
function requestFor(slot, { service, design, ownDesign = false, addOns = [], estimate }) {
  return buildRequestMessage({ slot, service, design, ownDesign, addOns, estimate })
}

describe('AdminBookingForm', () => {
  it('fills in the choices from her pasted message, but never a name', async () => {
    const wrapper = mountForm()
    const message = requestFor(makeSlot(), {
      service: catalog.services[1],
      design: { id: 3, name: 'Cherry bows' },
      addOns: [catalog.addOns[0]],
      estimate: 45,
    })

    await wrapper.find('textarea').setValue(message)

    expect(wrapper.text()).toContain('Filled in from her message.')
    expect(wrapper.find('input[value="extensions"]').element.checked).toBe(true)
    expect(wrapper.find('input[value="3"]').element.checked).toBe(true)
    expect(wrapper.find('input[value="foreign-removal"]').element.checked).toBe(true)
    expect(wrapper.find('input[type="number"]').element.value).toBe('45')
    expect(wrapper.find('input:not([type])').element.value).toBe('')
  })

  it('says so gently when the message is for another day, and still fills it in', async () => {
    const wrapper = mountForm()
    const message = requestFor(
      { date: '2026-12-13', time: '10:00', special: false },
      { service: catalog.services[0], design: null, ownDesign: true, estimate: 25 },
    )

    await wrapper.find('textarea').setValue(message)

    expect(wrapper.text()).toContain('her message asks for Sun 13 Dec, 10am')
    expect(wrapper.find('input[value="no-extensions"]').element.checked).toBe(true)
    expect(wrapper.find('input[value="own"]').element.checked).toBe(true)
  })

  it('explains when a pasted message cannot be read', async () => {
    const wrapper = mountForm()

    await wrapper.find('textarea').setValue('hi can I come on sat?')

    expect(wrapper.text()).toContain("Couldn't read that message; fill in the fields below.")
  })

  it('works out the price from the choices, with the special fee', async () => {
    const wrapper = mountForm(makeSlot({ special: true }))

    await wrapper.find('input[value="extensions"]').setValue(true)
    await wrapper.find('input[value="foreign-removal"]').setValue(true)

    expect(wrapper.find('input[type="number"]').element.value).toBe('55')
  })

  it('saves only what she filled in, with her own price', async () => {
    const wrapper = mountForm()

    await wrapper.find('input:not([type])').setValue('  Mei ')
    await wrapper.find('input[value="extensions"]').setValue(true)
    await wrapper.find('input[value="5"]').setValue(true)
    await wrapper.find('input[type="number"]').setValue('40')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('save')).toEqual([
      [{ customer: 'Mei', service: 'extensions', design: 5, price: 40 }],
    ])
  })

  it('starts from the details she saved before', () => {
    const wrapper = mountForm(
      makeSlot({ booking: { customer: 'Mei', design: 'own', price: 60, note: 'Gold foil' } }),
    )

    expect(wrapper.find('input:not([type])').element.value).toBe('Mei')
    expect(wrapper.find('input[value="own"]').element.checked).toBe(true)
    expect(wrapper.find('input[type="number"]').element.value).toBe('60')
    expect(wrapper.text()).toContain('Keep allergy or health information in your DMs.')
  })

  it('offers Clear details only when there are details', async () => {
    expect(mountForm().text()).not.toContain('Clear details')

    const wrapper = mountForm(makeSlot({ booking: { customer: 'Mei' } }))
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Clear details')
      .trigger('click')

    expect(wrapper.emitted('clear')).toHaveLength(1)
  })

  it('does not accept a price over 1000', async () => {
    const wrapper = mountForm()

    await wrapper.find('input[type="number"]').setValue('5000')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('The price must be a number from 0 to 1000.')
    expect(wrapper.emitted('save')).toBeUndefined()
  })
})
