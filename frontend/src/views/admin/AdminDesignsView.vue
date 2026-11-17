<script setup>
import { ref, reactive, onMounted } from 'vue'
import {
  getAdminDesigns,
  addDesign,
  updateDesign,
  replaceDesignPhoto,
  saveDesignOrder,
  removeDesign,
  errorMessage,
} from '@/services/adminApi'
import { useSaveStatus } from '@/composables/useSaveStatus'
import { shrinkPhoto } from '@/utils/shrinkPhoto'
import AdminLayout from '@/components/admin/AdminLayout.vue'
import AdminDesignCard from '@/components/admin/AdminDesignCard.vue'
import AdminDesignForm from '@/components/admin/AdminDesignForm.vue'
import AdminStatus from '@/components/admin/AdminStatus.vue'

// The owner's design gallery (/admin/designs): add, rename, replace photo, hide or show,
// reorder with up/down buttons, and delete. Customers see the designs in this order,
// without the hidden ones. Changes save straight away and are undone if saving fails.

const designs = ref([])
const loading = ref(true)
const loadError = ref('')
const adding = ref(false) // the "Add a design" form is open
const saving = ref(false) // a new design is uploading
const addProgress = ref(null)
const busyId = ref('') // the design whose photo is being replaced
const replaceProgress = ref(null)
const status = reactive(useSaveStatus())

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

async function saveNewDesign({ name, file }) {
  saving.value = true
  addProgress.value = 0
  status.working('Preparing photo…')
  try {
    const photo = await shrinkPhoto(file) // smaller upload; the server cleans it again
    status.working('Uploading…')
    const design = await addDesign(name, photo, (percent) => (addProgress.value = percent))
    designs.value.unshift(design) // new designs go first
    adding.value = false
    status.saved(`Added #${design.number} ${design.name}`)
  } catch (error) {
    status.failed(`Not added: ${errorMessage(error)}`)
  } finally {
    saving.value = false
    addProgress.value = null
  }
}

// ---- Changes to one design ----

async function rename(design, name) {
  const before = design.name
  design.name = name
  status.working()
  try {
    await updateDesign(design.id, { name })
    status.saved()
  } catch (error) {
    design.name = before
    status.failed(`Not renamed: ${errorMessage(error)}`)
  }
}

async function toggleHidden(design) {
  design.hidden = !design.hidden
  status.working()
  try {
    await updateDesign(design.id, { hidden: design.hidden })
    status.saved(design.hidden ? 'Hidden from customers' : 'Shown to customers')
  } catch (error) {
    design.hidden = !design.hidden
    status.failed(`Not saved: ${errorMessage(error)}`)
  }
}

async function replacePhoto(design, file) {
  busyId.value = design.id
  replaceProgress.value = 0
  status.working('Uploading…')
  try {
    const photo = await shrinkPhoto(file)
    const updated = await replaceDesignPhoto(design.id, photo, (p) => (replaceProgress.value = p))
    design.image = updated.image
    status.saved('Photo replaced')
  } catch (error) {
    status.failed(`Photo not replaced: ${errorMessage(error)}`)
  } finally {
    busyId.value = ''
    replaceProgress.value = null
  }
}

// Swaps a design with its neighbour, then saves the whole order.
async function move(index, step) {
  const other = index + step
  if (other < 0 || other >= designs.value.length) return
  const before = [...designs.value]
  const list = [...designs.value]
  ;[list[index], list[other]] = [list[other], list[index]]
  designs.value = list
  status.working()
  try {
    await saveDesignOrder(list.map((design) => design.id))
    status.saved('Order saved')
  } catch (error) {
    designs.value = before
    status.failed(`Order not saved: ${errorMessage(error)}`)
  }
}

async function remove(design) {
  const before = [...designs.value]
  designs.value = designs.value.filter((d) => d.id !== design.id)
  status.working('Deleting…')
  try {
    await removeDesign(design.id)
    status.saved(`Deleted #${design.number}`)
  } catch (error) {
    if (error.response?.status === 404) return status.saved('Already deleted')
    designs.value = before
    status.failed(`Not deleted: ${errorMessage(error)}`)
  }
}

onMounted(load)
</script>

<template>
  <AdminLayout title="Designs">
    <p class="muted measure">
      Customers see these in this order and quote the number in their message. Hidden designs stay
      here but are not shown on the site.
    </p>

    <div class="mb-4">
      <AdminDesignForm
        v-if="adding"
        :busy="saving"
        :progress="addProgress"
        @save="saveNewDesign"
        @cancel="adding = false"
      />
      <button v-else type="button" class="btn btn-primary" @click="adding = true">
        + Add a design
      </button>
    </div>

    <p v-if="loading" role="status">Loading designs…</p>
    <div v-else-if="loadError" class="load-error" role="alert">
      <p class="mb-2">{{ loadError }}</p>
      <button type="button" class="btn btn-primary btn-sm" @click="load">Try again</button>
    </div>
    <p v-else-if="designs.length === 0" class="muted">No designs yet. Add your first one above.</p>

    <ul v-else class="row row-cols-1 row-cols-sm-2 row-cols-lg-3 g-3 list-unstyled">
      <li v-for="(design, index) in designs" :key="design.id" class="col">
        <AdminDesignCard
          :design="design"
          :is-first="index === 0"
          :is-last="index === designs.length - 1"
          :busy="busyId === design.id"
          :progress="busyId === design.id ? replaceProgress : null"
          @rename="rename(design, $event)"
          @replace="replacePhoto(design, $event)"
          @toggle-hidden="toggleHidden(design)"
          @move="move(index, $event)"
          @remove="remove(design)"
        />
      </li>
    </ul>

    <AdminStatus :message="status.message" :kind="status.kind" />
  </AdminLayout>
</template>

<style scoped>
.load-error {
  background: #fbe3e5;
  border: 1px solid #8a1c2b;
  border-radius: var(--tt-radius-small);
  padding: 0.75rem;
}
</style>
