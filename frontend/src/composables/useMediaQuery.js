import { ref, onMounted, onBeforeUnmount } from 'vue'

// True while a CSS media query matches, and updates when it changes
// (for example when the window is resized or Reduce Motion is switched on).
// The first value is read straight away, so the very first render is already right.
export function useMediaQuery(query) {
  const list = window.matchMedia ? window.matchMedia(query) : null
  const matches = ref(list ? list.matches : false)

  function update(event) {
    matches.value = event.matches
  }

  onMounted(() => list?.addEventListener('change', update))
  onBeforeUnmount(() => list?.removeEventListener('change', update))

  return matches
}

// The home page story only animates when the visitor has not asked for less motion
// and the screen is tall enough for a pinned scene to fit (not a phone held sideways).
export const STORY_MOTION_QUERY = '(prefers-reduced-motion: no-preference) and (min-height: 540px)'
