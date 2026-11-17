<script setup>
// The picture for one design. Until she supplies her own photos, this draws a
// simple placeholder (five nail shapes in the design's colours).
// When `design.image` is set, the real photo is shown instead.
defineProps({
  design: { type: Object, required: true },
})
</script>

<template>
  <div class="design-art">
    <img
      v-if="design.image"
      :src="design.image"
      :alt="`Design ${design.id}: ${design.name}`"
      loading="lazy"
    />
    <div
      v-else
      class="design-placeholder"
      :style="{ '--base': design.colors[0], '--accent': design.colors[1] }"
      aria-hidden="true"
    >
      <span v-for="n in 5" :key="n" class="nail"></span>
      <span class="placeholder-label">sample</span>
    </div>
  </div>
</template>

<style scoped>
.design-art {
  aspect-ratio: 1 / 1;
  border-radius: var(--tt-radius-small);
  overflow: hidden;
  border: 1px solid var(--tt-line);
  background: var(--tt-blush);
}

.design-art img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.design-placeholder {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6%;
  padding: 0 10%;
  background: radial-gradient(circle at 30% 20%, #fff8 0, transparent 55%), var(--base);
}

/* Each nail: a rounded almond shape in the accent colour. */
.nail {
  width: 13%;
  height: 42%;
  border-radius: 50% 50% 45% 45% / 65% 65% 35% 35%;
  background: var(--accent);
  /* A soft white shine and outline so light colours still show on light backgrounds. */
  background-image: linear-gradient(100deg, transparent 30%, #ffffff66 40%, transparent 55%);
  box-shadow:
    0 0 0 1px #00000014,
    0 2px 4px #0000001a;
}

.nail:nth-child(1),
.nail:nth-child(5) {
  height: 34%;
  margin-top: 10%;
}

.nail:nth-child(3) {
  height: 46%;
  margin-top: -6%;
}

.placeholder-label {
  position: absolute;
  bottom: 6px;
  right: 8px;
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #1a1a1a;
  background: #ffffffcc;
  border-radius: 999px;
  padding: 0 0.4rem;
}
</style>
