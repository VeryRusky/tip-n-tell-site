import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import AdminCalendarView from '@/views/admin/AdminCalendarView.vue'
import { createPinia } from 'pinia'
import * as adminApi from '@/services/adminApi'

// The calendar page with a pretend API, to check Undo and what happens when saving fails.
vi.mock('@/services/adminApi', () => ({
  getMonthSlots: vi.fn(),
  openSlots: vi.fn(),
  updateSlot: vi.fn(),
  removeSlot: vi.fn(),
  removeSlots: vi.fn(),
  restoreSlots: vi.fn(),
  getAdminDesigns: vi.fn(async () => []),
  getSession: vi.fn(),
  signOut: vi.fn(),
  errorMessage: () => 'No connection to the site.',
}))

function slot(id, time, status = 'open') {
  return { id, date: '2026-12-03', time, status, special: false }
}

// The pretend API has these slots in December and nothing in other months.
function monthHas(slots) {
  adminApi.getMonthSlots.mockImplementation(async (month) =>
    month === '2026-12' ? slots.map((s) => ({ ...s })) : [],
  )
}

function mountPage() {
  return mount(AdminCalendarView, {
    attachTo: document.body,
    global: {
      plugins: [createPinia()],
      stubs: { teleport: true, RouterLink: true },
    },
  })
}

// Finds a button by the words she sees on it.
function button(wrapper, words) {
  return wrapper.findAll('button').find((b) => b.text().startsWith(words))
}

// The marks shown on 3 December in the month grid.
function marksOnDay(wrapper) {
  return wrapper.findAll('button[data-date="2026-12-03"] .status-mark')
}

describe('AdminCalendarView', () => {
  beforeEach(() => {
    // "Today" is 1 December 2026; only the date is pretend, timers are real.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 11, 1, 10, 0))
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
  })

  it('opens her usual times on a day, and Undo takes them away again', async () => {
    monthHas([])
    const created = [slot('a', '10:00'), slot('b', '14:00'), slot('c', '16:00')]
    adminApi.openSlots.mockResolvedValue({ created, skipped: 0 })
    adminApi.removeSlots.mockResolvedValue(created)
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('button[data-date="2026-12-03"]').trigger('click')
    await button(wrapper, 'Open usual times').trigger('click')
    await flushPromises()

    expect(adminApi.openSlots).toHaveBeenCalledWith(
      ['2026-12-03'],
      ['10:00', '14:00', '16:00'],
      false,
    )
    expect(wrapper.text()).toContain('Opened 3 times')
    expect(marksOnDay(wrapper)).toHaveLength(3)

    await button(wrapper, 'Undo').trigger('click')
    await flushPromises()

    expect(adminApi.removeSlots).toHaveBeenCalledWith(['a', 'b', 'c'])
    expect(marksOnDay(wrapper)).toHaveLength(0)
    expect(wrapper.text()).toContain('Undone: 3 new times removed')
    wrapper.unmount()
  })

  it('removes a time at once, and Undo puts it back as it was', async () => {
    const booked = slot('a', '10:00', 'booked')
    monthHas([booked, slot('b', '14:00')])
    adminApi.removeSlot.mockResolvedValue()
    adminApi.restoreSlots.mockResolvedValue({ created: [slot('new-b', '14:00')], skipped: 0 })
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('button[data-date="2026-12-03"]').trigger('click')
    await wrapper.find('button[aria-label="Remove 2pm"]').trigger('click')
    await flushPromises()

    expect(adminApi.removeSlot).toHaveBeenCalledWith('b')
    expect(marksOnDay(wrapper)).toHaveLength(1)
    expect(wrapper.text()).toContain('Removed 2pm on Thu 3 Dec')

    await button(wrapper, 'Undo').trigger('click')
    await flushPromises()

    expect(adminApi.restoreSlots).toHaveBeenCalledWith([slot('b', '14:00')])
    expect(marksOnDay(wrapper)).toHaveLength(2)
    wrapper.unmount()
  })

  it('puts a status back and says so when saving fails', async () => {
    monthHas([slot('a', '10:00')])
    adminApi.updateSlot.mockRejectedValue(new Error('offline'))
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('button[data-date="2026-12-03"]').trigger('click')
    await wrapper.find('input[value="booked"]').setValue(true)
    await flushPromises()

    expect(wrapper.text()).toContain('Not saved: No connection to the site. 10am is back to open.')
    expect(wrapper.find('input[value="open"]').element.checked).toBe(true)
    wrapper.unmount()
  })

  it('offers "Add details" after she marks a time booked, without opening it', async () => {
    monthHas([slot('a', '10:00')])
    adminApi.updateSlot.mockResolvedValue({ ...slot('a', '10:00'), status: 'booked' })
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('button[data-date="2026-12-03"]').trigger('click')
    await wrapper.find('input[value="booked"]').setValue(true)
    await flushPromises()

    expect(wrapper.text()).toContain('Saved: 10am booked')
    expect(wrapper.text()).not.toContain('Name or Instagram name')
    await button(wrapper, 'Add details').trigger('click')
    expect(wrapper.text()).toContain('Name or Instagram name')
    wrapper.unmount()
  })

  it('clears the details when a time is re-opened, and Undo brings them back', async () => {
    const details = { customer: 'Mei', service: 'extensions', price: 35 }
    monthHas([{ ...slot('a', '10:00', 'booked'), booking: details }])
    adminApi.updateSlot
      .mockResolvedValueOnce({ ...slot('a', '10:00', 'open') })
      .mockResolvedValueOnce({ ...slot('a', '10:00', 'booked'), booking: details })
    const wrapper = mountPage()
    await flushPromises()

    await wrapper.find('button[data-date="2026-12-03"]').trigger('click')
    expect(wrapper.find('.details-summary').text()).toContain('Mei')
    await wrapper.find('input[value="open"]').setValue(true)
    await flushPromises()

    expect(wrapper.text()).toContain('Re-opened 10am, details cleared')
    expect(wrapper.find('.details-summary').exists()).toBe(false)

    await button(wrapper, 'Undo').trigger('click')
    await flushPromises()

    expect(adminApi.updateSlot).toHaveBeenLastCalledWith('a', {
      status: 'booked',
      booking: details,
    })
    expect(wrapper.find('.details-summary').text()).toContain('Mei')
    wrapper.unmount()
  })
})
