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

  it('shows a drawing and a note when there is no photo yet', () => {
    const wrapper = mount(AdminDesignCard, { props: { design: makeDesign({ image: null }) } })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain('No photo yet')
    expect(button(wrapper, 'Add photo').exists()).toBe(true)
  })

  it('says when a design is hidden and offers to show it', async () => {
    const wrapper = mount(AdminDesignCard, { props: { design: makeDesign({ hidden: true }) } })

    expect(wrapper.text()).toContain('Hidden from customers')
    await button(wrapper, 'Show').trigger('click')
    expect(wrapper.emitted('toggle-hidden')).toHaveLength(1)
  })

  it('moves later, and cannot move earlier when it is first', async () => {
    const wrapper = mount(AdminDesignCard, { props: { design: makeDesign(), isFirst: true } })

    const earlier = wrapper.find('button[aria-label="Move #9 Ruby almond earlier"]')
    const later = wrapper.find('button[aria-label="Move #9 Ruby almond later"]')
    expect(earlier.attributes('disabled')).toBeDefined()

    await later.trigger('click')
    expect(wrapper.emitted('move')).toEqual([[1]])
  })

  it('renames with the tidied new name', async () => {
    const wrapper = mount(AdminDesignCard, { props: { design: makeDesign() } })

    await button(wrapper, 'Rename').trigger('click')
    await wrapper.find('form.rename input').setValue('  Ruby chrome ')
    await wrapper.find('form.rename').trigger('submit')

    expect(wrapper.emitted('rename')).toEqual([['Ruby chrome']])
  })

  it('does not accept an empty name', async () => {
    const wrapper = mount(AdminDesignCard, { props: { design: makeDesign() } })

    await button(wrapper, 'Rename').trigger('click')
    await wrapper.find('form.rename input').setValue('   ')
    await wrapper.find('form.rename').trigger('submit')

    expect(wrapper.text()).toContain('Use 1 to 60 characters.')
    expect(wrapper.emitted('rename')).toBeUndefined()
  })

  it('asks before deleting', async () => {
    const wrapper = mount(AdminDesignCard, { props: { design: makeDesign() } })

    await button(wrapper, 'Delete').trigger('click')
    expect(wrapper.text()).toContain('Delete #9 Ruby almond and its photo? This cannot be undone.')
    expect(wrapper.emitted('remove')).toBeUndefined()

    await button(wrapper, 'Yes, delete').trigger('click')
    expect(wrapper.emitted('remove')).toHaveLength(1)
  })
})
