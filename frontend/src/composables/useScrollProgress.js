import { shallowRef, onMounted, onBeforeUnmount } from 'vue'

// How far a pinned scene has been scrolled through, as a number from 0 to 1.
//
// A scene is a tall <section> with a shorter "stage" inside it that uses
// `position: sticky`. While you scroll through the section the stage stays put
// (it is "pinned"), and this composable reports how far along you are:
//
//   0   the section's top has reached the stage's sticky position (just under the header)
//   1   the section's bottom has reached the stage's bottom (the stage is about to scroll away)
//
//        ┌──────────────┐  ← section top           scrolled = stickyTop - sectionTop
//        │ ┌──────────┐ │
//        │ │  stage   │ │  ← stays pinned          distance = sectionHeight - stageHeight
//        │ └──────────┘ │
//        │              │                          progress = scrolled / distance
//        │   (extra     │                                     (kept between 0 and 1)
//        │    height)   │
//        └──────────────┘  ← section bottom
//
// How it stays cheap:
// - An IntersectionObserver tells us when the section is near the screen. Only then do
//   we listen to scroll events, so scenes that are far away cost nothing.
// - The scroll listener is `passive`, so it never delays the browser's own scrolling.
//   It does no work itself: it only asks for one `requestAnimationFrame` callback.
// - The measuring happens in that callback, at most once per frame, just before the
//   browser paints.
//
// The scroll itself is never changed: the page scrolls exactly as the browser normally would.
//
// Usage:
//   const section = ref(null)
//   const stage = ref(null)
//   const progress = useScrollProgress(section, stage, (p) => { ...set CSS variables... })
//
// `onProgress(progress, raw)` is optional. Scenes use it to write CSS custom properties
// straight onto an element, which updates the picture without asking Vue to re-render.
// `raw` is the same measurement before it is kept between 0 and 1: below 0 while the
// section is still arriving (-0.3 = 30% of a screen before it pins), above 1 as it leaves.
// Scenes use it to start bringing their text in just before pinning.
export function useScrollProgress(sectionRef, stageRef, onProgress) {
  const progress = shallowRef(0)

  let observer = null
  let listening = false
  let frame = 0
  let lastRaw = null

  function measure() {
    frame = 0
    const section = sectionRef.value
    const stage = stageRef.value
    if (!section || !stage) return

    const sectionBox = section.getBoundingClientRect()
    // The stage's CSS `top` is where it pins (the header's height).
    const stickyTop = parseFloat(getComputedStyle(stage).top) || 0
    const distance = sectionBox.height - stage.offsetHeight
    // If the section is no taller than its stage there is nothing to scrub: show the end.
    const raw = distance > 0 ? (stickyTop - sectionBox.top) / distance : 1
    const clamped = Math.min(1, Math.max(0, raw))

    // Only report real changes (a resize can measure the same position again).
    if (raw !== lastRaw) {
      lastRaw = raw
      progress.value = clamped
      if (onProgress) onProgress(clamped, raw)
    }
  }

  // Scroll and resize only *ask* for a measurement; several events in one frame
  // still lead to a single measurement.
  function requestMeasure() {
    if (!frame) frame = requestAnimationFrame(measure)
  }

  function startListening() {
    if (listening) return
    listening = true
    window.addEventListener('scroll', requestMeasure, { passive: true })
    window.addEventListener('resize', requestMeasure, { passive: true })
    requestMeasure()
  }

  function stopListening() {
    if (!listening) return
    listening = false
    window.removeEventListener('scroll', requestMeasure)
    window.removeEventListener('resize', requestMeasure)
    // One last measurement, so a fast scroll past the scene still ends at exactly 0 or 1.
    measure()
  }

  onMounted(() => {
    // "Near the screen" = within one screen height above or below it.
    observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) startListening()
        else stopListening()
      },
      { rootMargin: '100% 0px 100% 0px' },
    )
    observer.observe(sectionRef.value)
    // Set the starting value even before the first scroll.
    measure()
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    window.removeEventListener('scroll', requestMeasure)
    window.removeEventListener('resize', requestMeasure)
    cancelAnimationFrame(frame)
  })

  return progress
}
