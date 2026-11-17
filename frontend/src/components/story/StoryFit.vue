<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

// Scales its content to fit the space it is given, like a picture set to "fit", using a
// CSS transform (which does not change the page layout). Used for the calendar and chat
// pictures in the story card: in a small card the picture shrinks instead of being cut off,
// and in a big card it grows (up to `maxScale`) instead of floating in empty space.
// When `active` is false the content is shown at its normal size.
const props = defineProps({
  active: { type: Boolean, default: false },
  maxScale: { type: Number, default: 1 }, // how far it may grow (1 = never larger)
})

const outer = ref(null)
const inner = ref(null)
let observer = null

function fit() {
  const box = outer.value
  const content = inner.value
  if (!box || !content) return
  let scale = 1
  if (props.active && content.offsetHeight > 0) {
    // The picture itself may be narrower than the box (it has a max-width), so measure it.
    const picture = content.firstElementChild ?? content
    const byHeight = box.clientHeight / content.offsetHeight
    const byWidth = box.clientWidth / picture.offsetWidth
    scale = Math.min(props.maxScale, byHeight, byWidth)
  }
  content.style.transform = scale !== 1 ? `scale(${scale.toFixed(3)})` : ''
}

onMounted(() => {
  // Re-fit whenever the space or the content changes size.
  observer = new ResizeObserver(fit)
  observer.observe(outer.value)
  observer.observe(inner.value)
  fit()
})

onBeforeUnmount(() => observer?.disconnect())

watch(() => props.active, fit, { flush: 'post' })
</script>

<template>
  <div ref="outer" class="fit" :class="{ 'is-active': active }">
    <div ref="inner" class="fit-inner">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.fit-inner {
  width: 100%;
}

.fit.is-active {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fit.is-active .fit-inner {
  flex: 0 0 auto;
  transform-origin: center center;
}
</style>
