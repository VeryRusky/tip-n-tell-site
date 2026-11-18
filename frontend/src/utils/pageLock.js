// Locks the page behind the admin sheets (AdminSheet.vue): it cannot be tapped, tabbed to or
// scrolled, and messages move to the top of the screen.
// A sheet can open over another one (a slot's details over the day's times), so this counts
// the open sheets and only unlocks when the last one closes. The count lives here, in one
// shared module, so every sheet sees the same number.
let openSheets = 0

function apply() {
  const locked = openSheets > 0
  const page = document.getElementById('app')
  if (page) page.inert = locked
  document.body.style.overflow = locked ? 'hidden' : ''
  document.body.classList.toggle('admin-sheet-open', locked)
}

export function lockPage() {
  openSheets += 1
  apply()
}

export function unlockPage() {
  openSheets = Math.max(0, openSheets - 1)
  apply()
}
