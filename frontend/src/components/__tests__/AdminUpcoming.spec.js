import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import AdminUpcoming from '../admin/AdminUpcoming.vue'

const slots = [
  { id: 'a', date: '2026-12-05', time: '10:00', status: 'booked', special: false },
  { id: 'b', date: '2026-12-11', time: '14:00', status: 'pending', special: false },
]

describe('AdminUpcoming', () => {
  it('lists each time with its day and status', () => {
    const wrapper = mount(AdminUpcoming, { props: { slots } })

    const parts = ['.upcoming-date', '.upcoming-time', '.status-label']
    const rows = wrapper.findAll('li').map((li) => parts.map((part) => li.find(part).text()))
    expect(rows).toEqual([
      ['Sat 5 Dec', '10am', 'Booked'],
      ['Fri 11 Dec', '2pm', 'On hold'],
    ])
  })

  it('opens the day she taps', async () => {
    const wrapper = mount(AdminUpcoming, { props: { slots } })

    await wrapper.findAll('button')[1].trigger('click')

    expect(wrapper.emitted('open-day')).toEqual([['2026-12-11']])
  })

  it('says when nothing is booked or on hold', () => {
    const wrapper = mount(AdminUpcoming, { props: { slots: [] } })

    expect(wrapper.text()).toContain('Nothing booked or on hold yet.')
  })
})
