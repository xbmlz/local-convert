import type { OutputFormat } from '~/utils/imageConverter'

export function useConverter() {
  const file = shallowRef<File | null>(null)
  const originalUrl = shallowRef('')
  const convertedUrl = shallowRef('')
  const convertedSize = shallowRef(0)
  const converting = shallowRef(false)
  const error = shallowRef('')
  const supported = shallowRef(new Set<OutputFormat>(['jpeg', 'png']))

  const format = shallowRef<OutputFormat>('webp')
  const quality = shallowRef(82)

  let debounceTimer: ReturnType<typeof setTimeout>

  onMounted(async () => {
    const checks = await Promise.all(
      FORMAT_CONFIG.map(async f => [f.value, await isFormatSupported(f.value)] as const)
    )
    supported.value = new Set(checks.filter(([, ok]) => ok).map(([v]) => v))
    if (!supported.value.has('webp')) format.value = 'jpeg'
  })

  const currentFmt = computed(() => FORMAT_CONFIG.find(f => f.value === format.value)!)

  const saving = computed(() => {
    if (!file.value || !convertedSize.value) return null
    return (file.value.size - convertedSize.value) / file.value.size * 100
  })

  const convertedFilename = computed(() => {
    if (!file.value) return ''
    return `${file.value.name.replace(/\.[^.]+$/, '')}.${currentFmt.value.ext}`
  })

  const originalType = computed(() =>
    file.value ? (file.value.type.split('/')[1] || '').toUpperCase() : ''
  )

  async function doConvert() {
    if (!file.value) return
    converting.value = true
    error.value = ''
    try {
      const prev = convertedUrl.value
      const blob = await convertImage(file.value, format.value, quality.value)
      if (prev) URL.revokeObjectURL(prev)
      convertedUrl.value = URL.createObjectURL(blob)
      convertedSize.value = blob.size
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

  function reset() {
    if (originalUrl.value) URL.revokeObjectURL(originalUrl.value)
    if (convertedUrl.value) URL.revokeObjectURL(convertedUrl.value)
    file.value = null
    originalUrl.value = ''
    convertedUrl.value = ''
    convertedSize.value = 0
    error.value = ''
  }

  function download() {
    if (!convertedUrl.value || !file.value) return
    const a = document.createElement('a')
    a.href = convertedUrl.value
    a.download = convertedFilename.value
    a.click()
  }

  onUnmounted(() => {
    if (originalUrl.value) URL.revokeObjectURL(originalUrl.value)
    if (convertedUrl.value) URL.revokeObjectURL(convertedUrl.value)
  })

  return {
    // Readonly state
    file: readonly(file),
    originalUrl: readonly(originalUrl),
    convertedUrl: readonly(convertedUrl),
    convertedSize: readonly(convertedSize),
    converting: readonly(converting),
    error: readonly(error),
    supported: readonly(supported),
    // Computed
    currentFmt,
    saving,
    convertedFilename,
    originalType,
    // Writable user controls (bound via v-model)
    format,
    quality,
    // Actions
    loadFile,
    reset,
    download
  }
}
