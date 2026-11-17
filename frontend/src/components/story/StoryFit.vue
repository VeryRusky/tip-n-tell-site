<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

// Shrinks its content to fit the space it is given, like a picture set to "fit".
// Used for the calendar and chat pictures in the pinned scenes: on a short phone screen
// the pinned stage may be shorter than the picture, so the picture is scaled down
// (with a CSS transform, which does not change the page layout) instead of being cut off.
// When `active` is false the content is shown at its normal size.
const props = defineProps({
  active: { type: Boolean, default: false },
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
    scale = Math.min(1, box.clientHeight / content.offsetHeight)
  }
  content.style.transform = scale < 1 ? `scale(${scale.toFixed(3)})` : ''
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
