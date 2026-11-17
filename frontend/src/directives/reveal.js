import { prefersReducedMotion } from '@/utils/motion'

// v-reveal: the element rises and fades in the first time it scrolls into view.
//
//   <section v-reveal>…</section>        rises in on its own
//   <section v-reveal="2">…</section>    waits 2 × 60ms first, for a staggered row of cards
//
// The element is visible by default. Only once this script runs does it add the
// `reveal` class (which hides it), and it is shown again as soon as it is on screen.
// So if JavaScript fails, or the visitor prefers less motion, nothing is ever hidden.
// The styles are in main.css.
export const vReveal = {
  mounted(element, binding) {
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) return

    element.classList.add('reveal')
    element.style.setProperty('--reveal-delay', `${(binding.value ?? 0) * 60}ms`)

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return
        element.classList.add('is-revealed')
        observer.disconnect() // once only
      },
      // Start a little before the element's top reaches the bottom of the screen.
      { rootMargin: '0px 0px -8% 0px' },
    )
    observer.observe(element)
    element._revealObserver = observer
  },

  unmounted(element) {
    element._revealObserver?.disconnect()
  },
}
