<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import {
  getAdminDesigns,
  addDesign,
  updateDesign,
  replaceDesignPhoto,
  saveDesignOrder,
  removeDesign,
  errorMessage,
} from '@/services/adminApi'
import { useAdminToastStore } from '@/stores/adminToast'
import { shrinkPhoto } from '@/utils/shrinkPhoto'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import AdminDesignCard from '@/components/admin/AdminDesignCard.vue'
import AdminDesignForm from '@/components/admin/AdminDesignForm.vue'
import AdminDesignEditor from '@/components/admin/AdminDesignEditor.vue'
import AdminSheet from '@/components/admin/AdminSheet.vue'

// The owner's design gallery (/admin/designs).
//   - "Add a design": photo + name, in a sheet.
//   - Each card: Edit (name, photo, show/hide, delete) and a quick Hide / Show.
//   - "Reorder": move designs earlier or later, then save the new order in one go.
// Customers see the designs in this order, without the hidden ones.

const toast = useAdminToastStore()

const designs = ref([])
const loading = ref(true)
const loadError = ref('')

const addOpen = ref(false) // the "Add a design" sheet
const adding = ref(false) // a new design is uploading
const addProgress = ref(null)
const addKey = ref(0) // a new number gives the add form a fresh, empty start

const editing = ref(null) // the design open in the Edit sheet
const editBusy = ref(false)
const editProgress = ref(null)

const reordering = ref(false)
const draft = ref([]) // the order being arranged, saved only on "Save order"
const savingOrder = ref(false)

const busyId = ref('') // a design whose Hide / Show is saving
const highlightId = ref('') // a design just added, glowing for a moment
let highlightTimer = null

const shownList = computed(() => (reordering.value ? draft.value : designs.value))
const orderChanged = computed(() =>
  draft.value.some((design, index) => design.id !== designs.value[index]?.id),
)

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    designs.value = await getAdminDesigns()
  } catch (error) {
    loadError.value = errorMessage(error, 'Your designs could not load.')
  } finally {
    loading.value = false
  }
}

// ---- Add ----

function startAdding() {
  addKey.value += 1
  addOpen.value = true
}

async function saveNewDesign({ name, file }) {
  if (adding.value) return
  adding.value = true
  addProgress.value = 0
  try {
    const photo = await shrinkPhoto(file) // smaller upload; the server cleans it again
    const design = await addDesign(name, photo, (percent) => (addProgress.value = percent))
    designs.value.unshift(design) // new designs go first
    addOpen.value = false
    toast.saved(`Added as #${design.number}`)
    showNewCard(design)
  } catch (error) {
    toast.failed(`Not added: ${errorMessage(error)}`)
  } finally {
    adding.value = false
    addProgress.value = null
  }
}

// Scrolls the new card into view, makes it glow briefly, and puts the focus on it.
async function showNewCard(design) {
  await nextTick()
  const card = document.getElementById(`design-${design.id}`)
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  card?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' })
  card?.querySelector('button')?.focus({ preventScroll: true })
  highlightId.value = design.id
  clearTimeout(highlightTimer)
  highlightTimer = setTimeout(() => (highlightId.value = ''), 2500)
}

// ---- Edit ----

async function saveEdit({ name, hidden, file }) {
  const design = editing.value
  if (!design || editBusy.value) return
  editBusy.value = true
  try {
    const changes = {}
    if (name !== design.name) changes.name = name
    if (hidden !== design.hidden) changes.hidden = hidden
    if (Object.keys(changes).length > 0) {
      const updated = await updateDesign(design.id, changes)
      design.name = updated.name
      design.hidden = updated.hidden
    }
    if (file) {
      editProgress.value = 0
      const photo = await shrinkPhoto(file)
      const updated = await replaceDesignPhoto(design.id, photo, (p) => (editProgress.value = p))
      design.image = updated.image
    }
    editing.value = null
    toast.saved(`Saved #${design.number} ${design.name}`)
  } catch (error) {
    toast.failed(`Not saved: ${errorMessage(error)}`)
  } finally {
    editBusy.value = false
    editProgress.value = null
  }
}

async function deleteDesign() {
  const design = editing.value
  if (!design || editBusy.value) return
  editBusy.value = true
  try {
    await removeDesign(design.id)
  } catch (error) {
    if (error.response?.status !== 404) {
      toast.failed(`Not deleted: ${errorMessage(error)}`)
      editBusy.value = false
      return
    }
  }
  designs.value = designs.value.filter((d) => d.id !== design.id)
  editBusy.value = false
  editing.value = null
  toast.saved(`Deleted #${design.number} ${design.name}`)
  // Its card is gone, so put the focus somewhere sensible: the page title.
  await nextTick()
  document.getElementById('admin-title')?.focus()
}

// ---- Quick Hide / Show (shown at once, put back if saving fails) ----

async function toggleHidden(design) {
  if (busyId.value) return
  busyId.value = design.id
  design.hidden = !design.hidden
  toast.working()
  try {
    await updateDesign(design.id, { hidden: design.hidden })
    toast.saved(
      `#${design.number} ${design.hidden ? 'hidden from customers' : 'shown to customers'}`,
    )
  } catch (error) {
    design.hidden = !design.hidden
    toast.failed(`Not saved: ${errorMessage(error)}`)
  } finally {
    busyId.value = ''
  }
}

// ---- Reorder ----

function startReordering() {
  draft.value = [...designs.value]
  reordering.value = true
}

function cancelReordering() {
  reordering.value = false
  draft.value = []
}

// Swaps a design with the one before or after it (in reading order).
function move(index, step) {
  const other = index + step
  if (other < 0 || other >= draft.value.length) return
  const list = [...draft.value]
  ;[list[index], list[other]] = [list[other], list[index]]
  draft.value = list
}

async function saveOrder() {
  if (savingOrder.value) return
  if (!orderChanged.value) return cancelReordering()
  savingOrder.value = true
  toast.working()
  try {
    designs.value = await saveDesignOrder(draft.value.map((design) => design.id))
    reordering.value = false
    toast.saved('Order saved')
  } catch (error) {
    toast.failed(`Order not saved: ${errorMessage(error)}`)
  } finally {
    savingOrder.value = false
  }
}

onMounted(load)
onBeforeUnmount(() => clearTimeout(highlightTimer))
</script>

<template>
  <AdminLayout title="Designs">
    <template v-if="!reordering && !loading && !loadError" #actions>
      <button type="button" class="btn btn-primary" @click="startAdding">+ Add a design</button>
      <button
        v-if="designs.length > 1"
        type="button"
        class="btn btn-outline-primary"
        @click="startReordering"
      >
        Reorder
      </button>
    </template>

    <p class="muted intro">
      <template v-if="reordering">
        Move designs earlier or later, then tap <strong>Save order</strong>.
      </template>
      <template v-else
        >Customers see these in this order and quote the number in their DM.</template
      >
    </p>

    <p v-if="loading" role="status">Loading designs…</p>
    <div v-else-if="loadError" class="danger-note" role="alert">
      <p class="mb-2">{{ loadError }}</p>
      <button type="button" class="btn btn-primary btn-sm" @click="load">Try again</button>
    </div>
    <div v-else-if="designs.length === 0" class="empty-designs">
      <p class="mb-2">No designs yet.</p>
      <button type="button" class="btn btn-primary" @click="startAdding">
        Add your first design
      </button>
    </div>

    <ul
      v-else
      class="design-grid"
      :aria-label="reordering ? 'Designs in their new order' : 'Designs'"
    >
      <li v-for="(design, index) in shownList" :id="`design-${design.id}`" :key="design.id">
        <AdminDesignCard
          :design="design"
          :reordering="reordering"
          :position="index + 1"
          :is-first="index === 0"
          :is-last="index === shownList.length - 1"
          :busy="busyId === design.id"
          :highlight="highlightId === design.id"
          @edit="editing = design"
          @toggle-hidden="toggleHidden(design)"
          @move="move(index, $event)"
        />
      </li>
    </ul>

    <div v-if="reordering" class="order-bar">
      <button
        type="button"
        class="btn btn-primary flex-grow-1"
        :disabled="savingOrder"
        :aria-busy="savingOrder"
        @click="saveOrder"
      >
        {{ savingOrder ? 'Saving…' : 'Save order' }}
      </button>
      <button
        type="button"
        class="btn btn-outline-primary"
        :disabled="savingOrder"
        @click="cancelReordering"
      >
        Cancel
      </button>
    </div>

    <AdminSheet :open="addOpen" title="Add a design" @close="addOpen = adding">
      <AdminDesignForm :key="addKey" :busy="adding" :progress="addProgress" @save="saveNewDesign" />
    </AdminSheet>

    <AdminSheet
      :open="!!editing"
      :title="editing ? `Edit #${editing.number} ${editing.name}` : 'Edit'"
      @close="editing = editBusy ? editing : null"
    >
      <AdminDesignEditor
        v-if="editing"
        :key="editing.id"
        :design="editing"
        :busy="editBusy"
        :progress="editProgress"
        @save="saveEdit"
        @delete="deleteDesign"
        @cancel="editing = null"
      />
    </AdminSheet>
  </AdminLayout>
</template>

<style scoped>
.intro {
  margin-bottom: 1rem;
}

.design-grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

@media (min-width: 768px) {
  .design-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
  }
}

@media (min-width: 1200px) {
  .design-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.empty-designs {
  padding: 1.5rem;
  text-align: center;
  border: 1.5px dashed var(--tt-line);
  border-radius: var(--tt-radius);
  background: var(--tt-white);
}

/* "Save order" stays in reach at the bottom of the screen while she scrolls. */
.order-bar {
  position: sticky;
  bottom: 0;
  z-index: 10;
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 0.75rem 0 calc(0.75rem + env(safe-area-inset-bottom));
  background: var(--tt-cream);
  border-top: 1px solid var(--tt-line);
}
</style>
