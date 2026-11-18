import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import AdminMonthGrid from '../admin/AdminMonthGrid.vue'

// December 2026 starts on a Tuesday. "Today" is Thursday 10 December in these tests.
function slot(date, time, status = 'open') {
  return { id: `${date}T${time}`, date, time, status, special: false }
}

const slotsByDate = {
  '2026-12-11': [slot('2026-12-11', '10:00'), slot('2026-12-11', '14:00', 'pending')],
  '2026-12-12': [slot('2026-12-12', '10:00', 'booked'), slot('2026-12-12', '14:00', 'booked')],
}

function mountGrid(props = {}) {
  return mount(AdminMonthGrid, {
    props: { month: '2026-12', slotsByDate, today: '2026-12-10', ...props },
  })
}

// The button for one day.
function day(wrapper, date) {
  return wrapper.find(`button[data-date="${date}"]`)
}

describe('AdminMonthGrid', () => {
  it('reads out each day with its times', () => {
    const wrapper = mountGrid()

    expect(day(wrapper, '2026-12-11').attributes('aria-label')).toBe(
      'Friday 11 December: 10am open, 2pm on hold',
    )
    expect(day(wrapper, '2026-12-10').attributes('aria-label')).toBe(
      'Thursday 10 December, today: no times',
    )
  })

  it('shows one mark per time, with a different shape class for each status', () => {
    const wrapper = mountGrid()

    const marks = day(wrapper, '2026-12-11').findAll('.status-mark')
    expect(marks.map((mark) => mark.classes()[1])).toEqual(['is-open', 'is-pending'])
  })

  it('makes a fully booked day stand out', () => {
    const wrapper = mountGrid()

    expect(day(wrapper, '2026-12-12').classes()).toContain('full')
    expect(day(wrapper, '2026-12-12').attributes('aria-label')).toContain('Fully booked')
    expect(day(wrapper, '2026-12-11').classes()).not.toContain('full')
  })

  it('says which day she tapped', async () => {
    const wrapper = mountGrid()

    await day(wrapper, '2026-12-11').trigger('click')

    expect(wrapper.emitted('tap-day')).toEqual([['2026-12-11']])
  })

  it('turns the weekday names into buttons when selecting days', async () => {
    const wrapper = mountGrid({ selecting: true })

    const thursday = wrapper.find('button[aria-label="Every Thursday in December"]')
    await thursday.trigger('click')

    expect(wrapper.emitted('toggle-weekday')).toEqual([[3]])
  })

  it('shows a weekday as pressed when all its future days are picked', () => {
    const wrapper = mountGrid({
      selecting: true,
      pickedDates: ['2026-12-10', '2026-12-17', '2026-12-24', '2026-12-31'],
    })

    const thursday = wrapper.find('button[aria-label="Every Thursday in December"]')
    expect(thursday.attributes('aria-pressed')).toBe('true')
    expect(day(wrapper, '2026-12-17').attributes('aria-pressed')).toBe('true')
  })

  it('does not let past days be picked', () => {
    const wrapper = mountGrid({ selecting: true })

    expect(day(wrapper, '2026-12-09').attributes('disabled')).toBeDefined()
    expect(day(wrapper, '2026-12-10').attributes('disabled')).toBeUndefined()
  })
})
