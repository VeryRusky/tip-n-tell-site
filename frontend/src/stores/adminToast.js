import { ref } from 'vue'
import { defineStore } from 'pinia'

// The one short message the admin pages show near the bottom of the screen:
// "Saving…", "Saved", what went wrong, or what just happened with an Undo button
// ("Removed 9 times · Undo"). Only one shows at a time: a new one replaces the old one.
// AdminToasts.vue draws it; the pages call the functions below.
export const useAdminToastStore = defineStore('adminToast', () => {
  const message = ref('')
  const kind = ref('saved') // 'working' | 'saved' | 'error'
  const action = ref(null) // { label: 'Undo', run: async function } or null
  const actionBusy = ref(false)

  let timer = null
  let hideAt = 0 // when the message disappears (milliseconds), 0 = it stays
  let pausedLeft = 0 // time left while paused (her finger or keyboard is on the message)

  function startTimer(milliseconds) {
    clearTimeout(timer)
    hideAt = milliseconds ? Date.now() + milliseconds : 0
    if (milliseconds) timer = setTimeout(clear, milliseconds)
  }

  function show(newKind, text, hideAfter, newAction = null) {
    kind.value = newKind
    message.value = text
    action.value = newAction
    actionBusy.value = false
    pausedLeft = 0
    startTimer(hideAfter)
  }

  function clear() {
    clearTimeout(timer)
    message.value = ''
    action.value = null
    actionBusy.value = false
    hideAt = 0
    pausedLeft = 0
  }

  // While she is about to tap Undo (hover or keyboard focus), the message waits.
  function pause() {
    if (!hideAt || pausedLeft) return
    clearTimeout(timer)
    pausedLeft = Math.max(hideAt - Date.now(), 0)
  }

  function resume() {
    if (!pausedLeft) return
    const left = Math.max(pausedLeft, 3000) // at least 3 more seconds to read it
    pausedLeft = 0
    startTimer(left)
  }

  // Runs the message's button (Undo). It cannot be tapped twice.
  async function runAction() {
    if (!action.value || actionBusy.value) return
    actionBusy.value = true
    clearTimeout(timer)
    const { run } = action.value
    try {
      await run()
    } finally {
      // run() usually shows a new message; only tidy up if it did not.
      if (actionBusy.value) clear()
    }
  }

  return {
    message,
    kind,
    action,
    actionBusy,
    working: (text = 'Saving…') => show('working', text, 0),
    saved: (text = 'Saved') => show('saved', text, 2500),
    failed: (text) => show('error', text, 10000),
    // e.g. done('Removed 9 times', undoFunction): shows an Undo button for 8 seconds.
    done: (text, undo) => show('saved', text, 8000, { label: 'Undo', run: undo }),
    // e.g. savedWith('Saved: 2pm booked', 'Add details', openDetails): a shortcut button.
    savedWith: (text, label, run) => show('saved', text, 8000, { label, run }),
    clear,
    pause,
    resume,
    runAction,
  }
})
