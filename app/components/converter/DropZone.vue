<script setup lang="ts">
const emit = defineEmits<{
  file: [file: File]
}>()

const dragOver = shallowRef(false)
const error = shallowRef('')
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')

function handleFile(f: File) {
  if (!f.type.startsWith('image/')) {
    error.value = 'Please select an image file'
    return
  }
  error.value = ''
  emit('file', f)
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  dragOver.value = false
  const f = e.dataTransfer?.files[0]
  if (f) handleFile(f)
}

function onFileChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) handleFile(f)
}
</script>

<template>
  <div class="flex items-center justify-center px-4" style="min-height: calc(100vh - 130px)">
    <div class="w-full max-w-xl">
      <div
        class="border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-200 select-none"
        :class="dragOver
          ? 'border-primary bg-primary/5 scale-[1.01]'
          : 'border-(--ui-border) hover:border-primary hover:bg-primary/5'"
        @dragover.prevent="dragOver = true"
        @dragleave="dragOver = false"
        @drop="onDrop"
        @click="fileInput?.click()"
      >
        <div class="flex flex-col items-center gap-5">
          <div class="size-16 rounded-2xl bg-(--ui-bg-muted) flex items-center justify-center">
            <UIcon name="i-lucide-image-up" class="size-8 text-(--ui-text-muted)" />
          </div>
          <div>
            <p class="text-lg font-semibold text-(--ui-text)">Drop your image here</p>
            <p class="text-sm text-(--ui-text-muted) mt-1">or click to browse files</p>
          </div>
          <div class="flex flex-wrap justify-center gap-1.5">
            <span
              v-for="fmt in ['JPEG', 'PNG', 'WebP', 'AVIF', 'GIF', 'BMP', 'SVG']"
              :key="fmt"
              class="text-xs px-2 py-0.5 rounded-full bg-(--ui-bg-muted) text-(--ui-text-muted)"
            >
              {{ fmt }}
            </span>
          </div>
        </div>
      </div>

      <p v-if="error" class="text-red-500 text-sm text-center mt-3">{{ error }}</p>

      <p class="text-center text-xs text-(--ui-text-muted) mt-5 flex items-center justify-center gap-1.5">
        <UIcon name="i-lucide-lock" class="size-3 shrink-0" />
        Images are processed locally — never uploaded to any server
      </p>
    </div>

    <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="onFileChange">
  </div>
</template>
