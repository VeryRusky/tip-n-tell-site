import { ref, watch, onBeforeUnmount } from 'vue'

// The live site's free server goes to sleep when nobody visits, and the first request
// can take half a minute while it wakes up. This turns `slow` on when `loading` has been
// true for more than `delay` milliseconds, so a page can add a calm line like
// "Waking up the calendar, one moment". It turns off again as soon as loading ends.
export function useSlowNotice(loading, delay = 4000) {
  const slow = ref(false)
  let timer = null

  watch(
    loading,
    (isLoading) => {
      clearTimeout(timer)
      if (isLoading) {
        timer = setTimeout(() => (slow.value = true), delay)
      } else {
        slow.value = false
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(() => clearTimeout(timer))
  return slow
}
