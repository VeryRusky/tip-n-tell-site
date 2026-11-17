import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import AdminAddTimes from '../admin/AdminAddTimes.vue'

// The one-tap buttons for her usual times (10am, 2pm, 4pm).
function chips(wrapper) {
  return wrapper.findAll('button.time-chip')
}

describe('AdminAddTimes', () => {
  it('offers her usual times and marks the ones the day already has', () => {
    const wrapper = mount(AdminAddTimes, { props: { existingTimes: ['14:00'] } })

    expect(chips(wrapper).map((chip) => chip.text())).toEqual(['+ 10am', '2pm added', '+ 4pm'])
    expect(chips(wrapper)[1].attributes('disabled')).toBeDefined()
  })

  it('adds a usual time in one tap', async () => {
    const wrapper = mount(AdminAddTimes)

    await chips(wrapper)[0].trigger('click')

    expect(wrapper.emitted('add')).toEqual([[['10:00']]])
  })

  it('adds another time she types in', async () => {
    const wrapper = mount(AdminAddTimes)

    await wrapper.find('input[type="time"]').setValue('18:30')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Add')
      .trigger('click')

    expect(wrapper.emitted('add')).toEqual([[['18:30']]])
  })

  it('explains when the typed time is already on the day', async () => {
    const wrapper = mount(AdminAddTimes, { props: { existingTimes: ['18:30'] } })

    await wrapper.find('input[type="time"]').setValue('18:30')
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Add')
      .trigger('click')

    expect(wrapper.text()).toContain('6:30pm is already on this day.')
    expect(wrapper.emitted('add')).toBeUndefined()
  })

  it('asks for a time when none was chosen', async () => {
    const wrapper = mount(AdminAddTimes)

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Add')
      .trigger('click')

    expect(wrapper.text()).toContain('Choose a time first.')
    expect(wrapper.emitted('add')).toBeUndefined()
  })
})
