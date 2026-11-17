<script setup>
import { onMounted } from 'vue'
import { useCatalogStore } from '@/stores/catalog'
import DesignArt from './DesignArt.vue'

// Read-only gallery of design references (home page).
const catalog = useCatalogStore()
onMounted(() => catalog.load())
</script>

<template>
  <p v-if="catalog.loading" role="status">Loading designs…</p>
  <!-- Bootstrap grid: 2 per row on phones, 3 from md, 4 from lg. -->
  <ul v-else class="gallery row row-cols-2 row-cols-md-3 row-cols-lg-4 g-3">
    <li v-for="design in catalog.designs" :key="design.id" class="col">
      <figure class="mb-0">
        <DesignArt :design="design" />
        <figcaption>
          <span class="design-number">#{{ design.id }}</span> {{ design.name }}
        </figcaption>
      </figure>
    </li>
  </ul>
</template>

<style scoped>
.gallery {
  list-style: none;
  padding: 0;
}

figcaption {
  margin-top: 0.35rem;
  font-size: 0.95rem;
}

.design-number {
  font-weight: 700;
  color: var(--tt-deep-rose);
}
</style>
