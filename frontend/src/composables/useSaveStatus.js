import { ref, onBeforeUnmount } from 'vue'

// The short message the admin pages show after each change: "Saving…", "Saved",
// or what went wrong. Shown by AdminStatus.vue.
export function useSaveStatus() {
  const message = ref('')
  const kind = ref('saved') // 'working' | 'saved' | 'error'
  let timer = null

  // hideAfter: milliseconds before the message disappears (0 = stay).
  function show(newKind, text, hideAfter) {
    clearTimeout(timer)
    kind.value = newKind
    message.value = text
    if (hideAfter) timer = setTimeout(() => (message.value = ''), hideAfter)
  }

  onBeforeUnmount(() => clearTimeout(timer))

  return {
    message,
    kind,
    working: (text = 'Saving…') => show('working', text, 0),
    saved: (text = 'Saved') => show('saved', text, 2500),
    failed: (text) => show('error', text, 8000),
    clear: () => show('saved', '', 0),
  }
}
