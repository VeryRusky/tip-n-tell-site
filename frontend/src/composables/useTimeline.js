import { ref, onBeforeUnmount } from 'vue'

// A tiny "play head" for animations that run on their own: a number that goes from 0 to 1
// over `duration` milliseconds, like the progress of a video.
//
//   const timeline = useTimeline({
//     duration: 4200,            // or a function, if each run can have its own length
//     onUpdate: (t) => { ...draw the picture at t (0 to 1)... },
//     onEnd: () => { ...what to do when it reaches 1... },
//   })
//   timeline.play()   timeline.pause()   timeline.seek(0.5)
//
// How it works: while playing, `requestAnimationFrame` calls `tick` once before each frame
// the browser draws (about 60 times a second). `tick` looks at how much real time has passed
// since the last frame and moves the play head on by that share of the duration. Using real
// time (not "one step per frame") means it takes the same 4.2 seconds on a slow phone as on a
// fast laptop; a slow device just draws fewer in-between pictures.
export function useTimeline({ duration, onUpdate, onEnd }) {
  const playing = ref(false)
  let position = 0 // 0 to 1
  let frame = 0
  let lastTime = 0

  function tick(now) {
    // How long since the last frame, capped so a long pause (e.g. a background tab) can't jump ahead.
    const elapsed = Math.min(Math.max(now - lastTime, 0), 100)
    lastTime = now
    const length = typeof duration === 'function' ? duration() : duration
    position = Math.min(1, position + elapsed / length)
    onUpdate(position)
    if (position >= 1) {
      stop()
      onEnd?.()
    } else {
      frame = requestAnimationFrame(tick)
    }
  }

  function play() {
    if (playing.value) return
    if (position >= 1) position = 0 // playing a finished timeline starts it again
    playing.value = true
    lastTime = performance.now()
    frame = requestAnimationFrame(tick)
  }

  function stop() {
    playing.value = false
    cancelAnimationFrame(frame)
    frame = 0
  }

  function pause() {
    stop()
  }

  // Jump to a point (0 to 1) and draw it straight away.
  function seek(to) {
    position = Math.min(1, Math.max(0, to))
    lastTime = performance.now()
    onUpdate(position)
  }

  onBeforeUnmount(stop)

  return { playing, play, pause, seek }
}
