import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import AdminDayPanel from '../admin/AdminDayPanel.vue'

function slot(time, status = 'open') {
  return { id: `id-${time}`, date: '2026-12-12', time, status, special: false }
}

function mountPanel(props = {}) {
  return mount(AdminDayPanel, {
    props: { date: '2026-12-12', slots: [], today: '2026-12-01', specialFee: 10, ...props },
  })
}

// Finds a button by the words she sees on it.
function button(wrapper, words) {
  return wrapper.findAll('button').find((b) => b.text().startsWith(words))
}

describe('AdminDayPanel', () => {
  it('opens the missing usual times in one tap', async () => {
    const wrapper = mountPanel({ slots: [slot('14:00')] })

    expect(button(wrapper, 'Open usual times').text()).toContain('10am, 4pm')
    await button(wrapper, 'Open usual times').trigger('click')

    expect(wrapper.emitted('add-times')).toEqual([[['10:00', '16:00']]])
  })

  it('says what the day has, and hides "Open usual times" when they are all there', () => {
    const wrapper = mountPanel({
      slots: [slot('10:00'), slot('14:00', 'pending'), slot('16:00', 'booked')],
    })

    expect(wrapper.find('.day-summary').text()).toBe('3 times: 1 open, 1 on hold, 1 booked')
    expect(button(wrapper, 'Open usual times')).toBeUndefined()
  })

  it('closes a day with only open times straight away', async () => {
    const wrapper = mountPanel({ slots: [slot('10:00'), slot('14:00')] })

    await button(wrapper, 'Close this day').trigger('click')

    expect(wrapper.emitted('close-day')).toEqual([[{ includeTaken: false }]])
  })

  it('asks before closing a day with booked and on-hold times, and says how many', async () => {
    const wrapper = mountPanel({
      slots: [slot('10:00'), slot('14:00', 'booked'), slot('16:00', 'pending')],
    })

    await button(wrapper, 'Close this day').trigger('click')
    expect(wrapper.text()).toContain('This day has 1 booked and 1 on hold.')
    expect(wrapper.emitted('close-day')).toBeUndefined()

    await button(wrapper, 'Only the 1 open time').trigger('click')
    expect(wrapper.emitted('close-day')).toEqual([[{ includeTaken: false }]])
  })

  it('removes booked times too when she says so', async () => {
    const wrapper = mountPanel({ slots: [slot('10:00', 'booked')] })

    await button(wrapper, 'Close this day').trigger('click')
    await button(wrapper, 'Remove all 1 time').trigger('click')

    expect(wrapper.emitted('close-day')).toEqual([[{ includeTaken: true }]])
  })

  it('explains what Special means, with the fee', () => {
    const wrapper = mountPanel({ slots: [slot('10:00')] })

    expect(wrapper.text()).toContain('Special: a specially opened slot. Customers see +$10.')
  })

  it('offers no adding or removing on a day that has passed', () => {
    const wrapper = mountPanel({ slots: [slot('10:00')], today: '2026-12-20' })

    expect(button(wrapper, 'Open usual times')).toBeUndefined()
    expect(button(wrapper, 'Close this day')).toBeUndefined()
    expect(wrapper.find('button[aria-label="Remove 10am"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('This day has passed.')
  })
})
