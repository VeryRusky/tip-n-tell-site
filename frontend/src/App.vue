<script setup>
import { ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import SiteHeader from '@/components/SiteHeader.vue'
import SiteFooter from '@/components/SiteFooter.vue'

// Which page transition to use (the styles are in main.css):
//   between booking steps: 'step-forward' slides the new step in from the right,
//                          'step-back' from the left
//   anything else:         'page', a short fade
const route = useRoute()
const transitionName = ref('page')
watch(
  () => route.meta.step,
  (toStep, fromStep) => {
    if (toStep && fromStep) transitionName.value = toStep > fromStep ? 'step-forward' : 'step-back'
    else transitionName.value = 'page'
  },
)
</script>

<template>
  <a href="#main" class="skip-link">Skip to content</a>
  <SiteHeader />
  <!--
    The old page disappears at once and the new one eases in, so a page is never shown twice.
    `duration` tells Vue how long to keep the transition classes: the moving part is inside
    the page, so Vue cannot measure it by itself.
  -->
  <RouterView v-slot="{ Component, route: current }">
    <Transition :name="transitionName" :duration="{ enter: 450, leave: 0 }">
      <component :is="Component" :key="current.path" />
    </Transition>
  </RouterView>
  <SiteFooter />
</template>

<style scoped>
/* Hidden until a keyboard user tabs to it. */
.skip-link {
  position: absolute;
  left: 1rem;
  top: -100px;
  z-index: 1100;
  background: var(--tt-deep-rose);
  color: #fff;
  padding: 0.75rem 1rem;
  border-radius: 999px;
  font-weight: 700;
}

.skip-link:focus {
  top: 0.5rem;
}
</style>
