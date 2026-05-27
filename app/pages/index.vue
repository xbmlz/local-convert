<script setup lang="ts">
import { convertImage, isFormatSupported, type OutputFormat } from '~/composables/useImageConverter'

const FORMATS = [
  { value: 'jpeg' as OutputFormat, label: 'JPEG', ext: 'jpg', lossy: true },
  { value: 'png' as OutputFormat, label: 'PNG', ext: 'png', lossy: false },
  { value: 'webp' as OutputFormat, label: 'WebP', ext: 'webp', lossy: true },
  { value: 'avif' as OutputFormat, label: 'AVIF', ext: 'avif', lossy: true }
]

useSeoMeta({
  title: 'LocalConvert — Free image converter, 100% private',
  description: 'Convert images between JPEG, PNG, WebP and AVIF directly in your browser. No uploads, no servers, completely private.'
})

const file = ref<File | null>(null)
const originalUrl = ref('')
const convertedUrl = ref('')
const convertedSize = ref(0)
const converting = ref(false)
const dragOver = ref(false)
const format = ref<OutputFormat>('webp')
const quality = ref(82)
const error = ref('')
const fileInput = ref<HTMLInputElement>()
const supported = ref(new Set<OutputFormat>(['jpeg', 'png']))
let debounceTimer: ReturnType<typeof setTimeout>

onMounted(async () => {
  const checks = await Promise.all(
    FORMATS.map(async f => [f.value, await isFormatSupported(f.value)] as const)
  )
  supported.value = new Set(checks.filter(([, ok]) => ok).map(([v]) => v))
  if (!supported.value.has('webp')) format.value = 'jpeg'
})

const currentFmt = computed(() => FORMATS.find(f => f.value === format.value)!)
const isLossy = computed(() => currentFmt.value.lossy)

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(2)} MB`
}

const saving = computed(() => {
  if (!file.value || !convertedSize.value) return null
  return (file.value.size - convertedSize.value) / file.value.size * 100
})

async function doConvert() {
  if (!file.value) return
  converting.value = true
  error.value = ''
  try {
    const prev = convertedUrl.value
    const result = await convertImage(file.value, format.value, quality.value)
    if (prev) URL.revokeObjectURL(prev)
    convertedUrl.value = result.url
    convertedSize.value = result.size
  }
  catch (e) {
    error.value = e instanceof Error ? e.message : 'Conversion failed'
  }
  finally {
    converting.value = false
  }
}

function scheduleConvert() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(doConvert, 280)
}

watch(format, doConvert)
watch(quality, scheduleConvert)

async function loadFile(f: File) {
  if (!f.type.startsWith('image/')) {
    error.value = 'Please select an image file'
    return
  }
  if (originalUrl.value) URL.revokeObjectURL(originalUrl.value)
  if (convertedUrl.value) URL.revokeObjectURL(convertedUrl.value)
  file.value = f
  originalUrl.value = URL.createObjectURL(f)
  convertedUrl.value = ''
  convertedSize.value = 0
  error.value = ''
  await doConvert()
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  dragOver.value = false
  const f = e.dataTransfer?.files[0]
  if (f) loadFile(f)
}

function onFileChange(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (f) loadFile(f)
}

function reset() {
  if (originalUrl.value) URL.revokeObjectURL(originalUrl.value)
  if (convertedUrl.value) URL.revokeObjectURL(convertedUrl.value)
  file.value = null
  originalUrl.value = ''
  convertedUrl.value = ''
  convertedSize.value = 0
  error.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

function download() {
  if (!convertedUrl.value || !file.value) return
  const a = document.createElement('a')
  a.href = convertedUrl.value
  a.download = `${file.value.name.replace(/\.[^.]+$/, '')}.${currentFmt.value.ext}`
  a.click()
}

onUnmounted(() => {
  if (originalUrl.value) URL.revokeObjectURL(originalUrl.value)
  if (convertedUrl.value) URL.revokeObjectURL(convertedUrl.value)
})
</script>

<template>
  <!-- Drop zone: no file loaded -->
  <div v-if="!file" class="flex items-center justify-center px-4" style="min-height: calc(100vh - 130px)">
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

  <!-- Converter: file loaded -->
  <div v-else class="max-w-5xl mx-auto px-4 py-8">
    <!-- Header row -->
    <div class="flex items-center justify-between mb-6">
      <UButton variant="ghost" color="neutral" leading-icon="i-lucide-arrow-left" @click="reset">
        Convert another image
      </UButton>
    </div>

    <!-- Preview grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
      <!-- Original -->
      <div class="bg-(--ui-bg) rounded-xl border border-(--ui-border) overflow-hidden">
        <div
          class="aspect-video flex items-center justify-center bg-(--ui-bg-muted) p-2"
          style="background-image: repeating-conic-gradient(color-mix(in srgb, var(--ui-border) 60%, transparent) 0% 25%, transparent 0% 50%); background-size: 16px 16px;"
        >
          <img :src="originalUrl" class="max-w-full max-h-full object-contain rounded" alt="Original">
        </div>
        <div class="px-4 py-3 border-t border-(--ui-border)">
          <p class="text-sm font-medium truncate text-(--ui-text)">{{ file.name }}</p>
          <p class="text-xs text-(--ui-text-muted) mt-0.5">
            {{ fmtSize(file.size) }} · {{ (file.type.split('/')[1] || '').toUpperCase() }}
          </p>
        </div>
      </div>

      <!-- Converted -->
      <div class="bg-(--ui-bg) rounded-xl border border-(--ui-border) overflow-hidden">
        <div
          class="aspect-video flex items-center justify-center bg-(--ui-bg-muted) p-2"
          style="background-image: repeating-conic-gradient(color-mix(in srgb, var(--ui-border) 60%, transparent) 0% 25%, transparent 0% 50%); background-size: 16px 16px;"
        >
          <div v-if="converting" class="flex items-center gap-2.5 text-(--ui-text-muted)">
            <div class="size-5 border-2 border-(--ui-border) border-t-primary rounded-full animate-spin" />
            <span class="text-sm">Converting…</span>
          </div>
          <img
            v-else-if="convertedUrl"
            :src="convertedUrl"
            class="max-w-full max-h-full object-contain rounded"
            alt="Converted"
          >
        </div>
        <div class="px-4 py-3 border-t border-(--ui-border)">
          <p class="text-sm font-medium text-(--ui-text)">
            {{ file.name.replace(/\.[^.]+$/, '') }}.{{ currentFmt.ext }}
          </p>
          <div class="flex items-center gap-2 mt-0.5">
            <span class="text-xs text-(--ui-text-muted)">{{ fmtSize(convertedSize) }}</span>
            <span
              v-if="saving !== null"
              class="text-xs font-medium"
              :class="saving >= 0 ? 'text-green-500' : 'text-amber-500'"
            >
              {{ saving >= 0 ? '↓' : '↑' }} {{ Math.abs(saving).toFixed(1) }}%
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div class="bg-(--ui-bg) rounded-xl border border-(--ui-border) p-5">
      <div class="flex flex-col sm:flex-row sm:items-end gap-5">
        <!-- Format selector -->
        <div class="flex-1">
          <p class="text-xs font-medium text-(--ui-text-muted) mb-2">Output format</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="fmt in FORMATS"
              :key="fmt.value"
              :disabled="!supported.has(fmt.value)"
              class="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all border cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
              :class="format === fmt.value
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-(--ui-bg) text-(--ui-text) border-(--ui-border) hover:border-primary hover:text-primary'"
              @click="supported.has(fmt.value) && (format = fmt.value)"
            >
              {{ fmt.label }}
            </button>
          </div>
          <p v-if="!supported.has('avif')" class="text-xs text-(--ui-text-muted) mt-1.5">
            AVIF not supported in this browser
          </p>
        </div>

        <!-- Quality slider -->
        <div v-if="isLossy" class="sm:w-48">
          <p class="text-xs font-medium text-(--ui-text-muted) mb-2">
            Quality: <span class="text-(--ui-text) tabular-nums">{{ quality }}%</span>
          </p>
          <input
            v-model.number="quality"
            type="range"
            min="1"
            max="100"
            class="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-primary bg-(--ui-border)"
          >
        </div>

        <!-- Download -->
        <UButton
          size="lg"
          :disabled="!convertedUrl || converting"
          leading-icon="i-lucide-download"
          class="shrink-0"
          @click="download"
        >
          Download {{ currentFmt.label }}
        </UButton>
      </div>

      <p v-if="error" class="text-red-500 text-sm mt-3">{{ error }}</p>
    </div>

    <!-- Drop new image over the page -->
    <div
      v-if="dragOver"
      class="fixed inset-0 z-50 flex items-center justify-center bg-(--ui-bg)/80 backdrop-blur-sm border-4 border-dashed border-primary rounded-2xl m-4"
      @dragover.prevent
      @dragleave="dragOver = false"
      @drop="onDrop"
    >
      <div class="text-center">
        <UIcon name="i-lucide-image-up" class="size-16 text-primary mb-3" />
        <p class="text-lg font-semibold text-(--ui-text)">Drop to replace image</p>
      </div>
    </div>

    <!-- Trigger drag-over detection on the whole page when a file is loaded -->
    <div
      class="fixed inset-0 z-40 pointer-events-none"
      @dragover.prevent="dragOver = true"
    />
  </div>
</template>
