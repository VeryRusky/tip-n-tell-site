// Small helpers shared by the animated parts of the site.

// True when the visitor has asked their device for less motion
// (iOS: Settings › Accessibility › Motion › Reduce Motion; Windows: "Animation effects" off).
// Every animated scene checks this and shows its finished picture instead.
export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

// Keeps a number between min and max.
export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

// Turns a scene's overall progress into the progress of one phase of it.
// Example: phase(p, 0.15, 0.4) is 0 until p reaches 0.15, then rises to 1 at p = 0.4.
export function phase(progress, start, end) {
  return clamp((progress - start) / (end - start))
}

// The site's entrance easing, cubic-bezier(0.22, 1, 0.36, 1), is close to this curve.
// Used where a scrubbed value should slow down gently as it arrives.
export function easeOut(t) {
  return 1 - Math.pow(1 - t, 3)
}

// Writes several CSS custom properties onto an element in one go, e.g.
// setVars(stage, { '--draw': 0.5, '--paint': 0 }). Rounded to keep the style attribute short.
export function setVars(element, vars) {
  if (!element) return
  for (const [name, value] of Object.entries(vars)) {
    element.style.setProperty(name, typeof value === 'number' ? value.toFixed(4) : value)
  }
}
