import { describe, it, expect } from 'vitest'
import { buildRequestMessage, parseRequestMessage } from '@/utils/message'
import { sampleServices, sampleAddOns, sampleSpecialSlotFee } from '@/data/prices'

// The message the site writes (buildRequestMessage) and the admin's "Paste her message"
// (parseRequestMessage) must stay in step: build a message, read it back, get the same choices.

// The real price list, plus a second add-on so lists of two are tested too.
const services = sampleServices
const addOns = [...sampleAddOns, { id: 'nail-art-extra', name: 'Nail art extra', price: 5 }]
const design = { id: 3, name: 'Cherry bows' }

function estimateFor(service, chosenAddOns, special) {
  let total = service ? service.price : 0
  for (const addOn of chosenAddOns) total += addOn.price
  return special ? total + sampleSpecialSlotFee : total
}

// Every combination the booking steps can produce.
const combinations = []
for (const special of [false, true]) {
  for (const service of [null, ...services]) {
    for (const designChoice of [null, design, 'own']) {
      for (const chosenAddOns of [[], [addOns[0]], [addOns[1]], addOns]) {
        combinations.push({ special, service, designChoice, chosenAddOns })
      }
    }
  }
}

describe('request message', () => {
  it.each(combinations.map((c) => [c]))('reads back the same choices: %o', (choice) => {
    const { special, service, designChoice, chosenAddOns } = choice
    const estimate = estimateFor(service, chosenAddOns, special)
    const message = buildRequestMessage({
      slot: { date: '2026-12-12', time: '14:00', special },
      service,
      design: designChoice === 'own' ? null : designChoice,
      ownDesign: designChoice === 'own',
      addOns: chosenAddOns,
      estimate,
    })

    expect(parseRequestMessage(message, { services, addOns })).toEqual({
      dateText: 'Sat 12 Dec',
      time: '14:00',
      special,
      serviceId: service ? service.id : null,
      design: designChoice === 'own' ? 'own' : (designChoice?.id ?? null),
      addOnIds: chosenAddOns.map((a) => a.id),
      estimate: service ? estimate : null,
    })
  })

  it('reads times with minutes and the morning', () => {
    const message = buildRequestMessage({
      slot: { date: '2026-12-03', time: '10:30', special: false },
      service: null,
      design: null,
      ownDesign: false,
      addOns: [],
      estimate: 0,
    })

    expect(parseRequestMessage(message).time).toBe('10:30')
  })

  it('still reads a message after Instagram changes the apostrophe and line breaks', () => {
    const text =
      'Hi! I’d like to book Sat 12 Dec, 2pm.\nService: extensions.\nDesign: #3 Cherry bows.\nEstimated $35.'

    expect(parseRequestMessage(text, { services, addOns })).toMatchObject({
      serviceId: 'extensions',
      design: 3,
      estimate: 35,
    })
  })

  it('gives up on text that is not a request from the site', () => {
    expect(parseRequestMessage('hi can i book saturday?', { services, addOns })).toBeNull()
    expect(parseRequestMessage('', { services, addOns })).toBeNull()
  })
})
