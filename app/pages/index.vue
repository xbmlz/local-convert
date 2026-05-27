<script setup lang="ts">
useSeoMeta({
  title: 'LocalConvert — Free image converter, 100% private',
  description: 'Convert images between JPEG, PNG, WebP and AVIF directly in your browser. No uploads, no servers, completely private.'
})

const {
  file,
  originalUrl,
  convertedUrl,
  convertedSize,
  converting,
  error,
  supported,
  format,
  quality,
  saving,
  convertedFilename,
  originalType,
  loadFile,
  reset,
  download
} = useConverter()

const dragOver = shallowRef(false)
let dragCounter = 0

function onWindowDragEnter(e: DragEvent) {
  if (!file.value) return
  e.preventDefault()
  dragCounter++
  dragOver.value = true
}

function onWindowDragLeave() {
  if (!file.value) return
  dragCounter--
  if (dragCounter === 0) dragOver.value = false
}

function onWindowDrop(e: DragEvent) {
  if (!file.value) return
  e.preventDefault()
  dragCounter = 0
  dragOver.value = false
  const f = e.dataTransfer?.files[0]
  if (f) loadFile(f)
}

onMounted(() => {
  window.addEventListener('dragenter', onWindowDragEnter)
  window.addEventListener('dragleave', onWindowDragLeave)
  window.addEventListener('dragover', e => e.preventDefault())
  window.addEventListener('drop', onWindowDrop)
})

onUnmounted(() => {
  window.removeEventListener('dragenter', onWindowDragEnter)
  window.removeEventListener('dragleave', onWindowDragLeave)
  window.removeEventListener('drop', onWindowDrop)
})
</script>

<template>
  <ConverterDropZone v-if="!file" @file="loadFile" />

  <div v-else class="max-w-5xl mx-auto px-4 py-8">
    <div class="flex items-center justify-between mb-6">
      <UButton variant="ghost" color="neutral" leading-icon="i-lucide-arrow-left" @click="reset">
        Convert another image
      </UButton>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
      <ConverterPreviewCard
        :url="originalUrl"
        :filename="file!.name"
        :size="file!.size"
        :type="originalType"
      />
      <ConverterPreviewCard
        :url="convertedUrl"
        :filename="convertedFilename"
        :size="convertedSize"
        :saving="saving"
        :converting="converting"
      />
    </div>

    <ConverterControlsBar
      v-model:format="format"
      v-model:quality="quality"
      :converting="converting"
      :converted-url="convertedUrl"
      :supported="supported"
      :error="error"
      @download="download"
    />

    <!-- Full-page drag overlay: replace the current image by dropping a new one -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="dragOver"
          class="fixed inset-0 z-50 flex items-center justify-center bg-(--ui-bg)/80 backdrop-blur-sm"
        >
          <div class="text-center border-4 border-dashed border-primary rounded-2xl p-16">
            <UIcon name="i-lucide-image-up" class="size-16 text-primary mb-3" />
            <p class="text-lg font-semibold text-(--ui-text)">Drop to replace image</p>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
