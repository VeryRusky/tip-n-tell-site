import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import AdminDesignEditor from '../admin/AdminDesignEditor.vue'

const design = {
  id: 'd1',
  number: 3,
  name: 'Cherry bows',
  image: null,
  colors: ['#8e1f2c', '#f7ece4'],
  hidden: false,
}

// Finds a button by the words she sees on it.
function button(wrapper, words) {
  return wrapper.findAll('button').find((b) => b.text().startsWith(words))
}

describe('AdminDesignEditor', () => {
  it('saves a new name and hides the design', async () => {
    const wrapper = mount(AdminDesignEditor, { props: { design } })

    await wrapper.find('input:not([type])').setValue('  Cherry   ribbons ')
    await wrapper.find('input[role="switch"]').setValue(false)
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('save')).toEqual([
      [{ name: 'Cherry ribbons', hidden: true, file: null }],
    ])
  })

  it('does not accept an empty name', async () => {
    const wrapper = mount(AdminDesignEditor, { props: { design } })

    await wrapper.find('input:not([type])').setValue('   ')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.text()).toContain('Use 1 to 60 characters.')
    expect(wrapper.emitted('save')).toBeUndefined()
  })

  it('just closes when nothing changed', async () => {
    const wrapper = mount(AdminDesignEditor, { props: { design } })

    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('save')).toBeUndefined()
    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })

  it('asks before deleting, naming the design and saying the photo goes too', async () => {
    const wrapper = mount(AdminDesignEditor, { props: { design } })

    await button(wrapper, 'Delete design').trigger('click')
    expect(wrapper.text()).toContain('Delete #3 Cherry bows?')
    expect(wrapper.text()).toContain('Its photo is deleted too')
    expect(wrapper.emitted('delete')).toBeUndefined()

    await button(wrapper, 'Delete #3 Cherry bows').trigger('click')
    expect(wrapper.emitted('delete')).toHaveLength(1)
  })

  it('keeps the design when she changes her mind', async () => {
    const wrapper = mount(AdminDesignEditor, { props: { design } })

    await button(wrapper, 'Delete design').trigger('click')
    await button(wrapper, 'Keep it').trigger('click')

    expect(wrapper.emitted('delete')).toBeUndefined()
    expect(button(wrapper, 'Save changes').exists()).toBe(true)
  })
})
