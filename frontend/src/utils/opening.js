import { prefersReducedMotion } from './motion'

// Should the home page's opening animation play now? Only on the first visit in a browser
// session (sessionStorage is cleared when the tab closes), only once per page load, and
// never with Reduce Motion. sessionStorage only holds "played": nothing personal.
const PLAYED_KEY = 'tipntell-opening-played'
let alreadyAsked = false

export function claimOpening() {
  if (alreadyAsked) return false
  alreadyAsked = true
  if (prefersReducedMotion()) return false
  try {
    if (sessionStorage.getItem(PLAYED_KEY) === '1') return false
    sessionStorage.setItem(PLAYED_KEY, '1')
    return true
  } catch {
    return false // storage blocked: don't risk replaying it on every visit
  }
}
