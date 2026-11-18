import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import AdminDesignCard from '../admin/AdminDesignCard.vue'

// A design as the admin API returns it.
function makeDesign(changes = {}) {
  return {
    id: 'd1',
    number: 9,
    name: 'Ruby almond',
    image: '/uploads/abc.webp',
    colors: ['#8e1f2c', '#f7ece4'],
    hidden: false,
    order: 0,
    ...changes,
  }
}

// Finds a button by the words she sees on it.
function button(wrapper, words) {
  return wrapper.findAll('button').find((b) => b.text().startsWith(words))
}

describe('AdminDesignCard', () => {
  it('shows the photo, number and name', () => {
    const wrapper = mount(AdminDesignCard, { props: { design: makeDesign() } })

    expect(wrapper.find('.design-title').text()).toBe('#9 Ruby almond')
    expect(wrapper.find('img').attributes('src')).toBe('/uploads/abc.webp')
    expect(wrapper.find('img').attributes('alt')).toBe('Design 9: Ruby almond')
  })

  it('has just two buttons: Edit and Hide', () => {
    const wrapper = mount(AdminDesignCard, { props: { design: makeDesign() } })

    const words = wrapper.findAll('button').map((b) => b.text().split(' ')[0])
    expect(words).toEqual(['Edit', 'Hide'])
  })

  it('shows a Sample art badge when there is no photo yet', () => {
    const wrapper = mount(AdminDesignCard, { props: { design: makeDesign({ image: null }) } })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('.badge-sample').text()).toBe('Sample art')
  })

  it('shows a Hidden badge and offers to show it again', async () => {
    const wrapper = mount(AdminDesignCard, { props: { design: makeDesign({ hidden: true }) } })

    expect(wrapper.find('.badge-hidden').text()).toBe('Hidden')
    await button(wrapper, 'Show').trigger('click')
    expect(wrapper.emitted('toggle-hidden')).toHaveLength(1)
  })

  it('says when she taps Edit', async () => {
    const wrapper = mount(AdminDesignCard, { props: { design: makeDesign() } })

    await button(wrapper, 'Edit').trigger('click')

    expect(wrapper.emitted('edit')).toHaveLength(1)
  })

  it('shows its place and moves later, but not earlier, when it is first', async () => {
    const wrapper = mount(AdminDesignCard, {
      props: { design: makeDesign(), reordering: true, position: 1, isFirst: true },
    })

    expect(wrapper.find('.position').text()).toBe('1')
    expect(button(wrapper, 'Edit')).toBeUndefined()
    expect(button(wrapper, '← Earlier').attributes('disabled')).toBeDefined()

    await button(wrapper, 'Later').trigger('click')
    expect(wrapper.emitted('move')).toEqual([[1]])
  })
})
