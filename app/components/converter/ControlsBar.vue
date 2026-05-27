<script setup lang="ts">
import type { OutputFormat } from '~/utils/imageConverter'

const props = defineProps<{
  format: OutputFormat
  quality: number
  converting: boolean
  convertedUrl: string
  supported: ReadonlySet<OutputFormat>
  error: string
}>()

const emit = defineEmits<{
  'update:format': [value: OutputFormat]
  'update:quality': [value: number]
  download: []
}>()

const currentFmt = computed(() => FORMAT_CONFIG.find(f => f.value === props.format)!)
const isLossy = computed(() => currentFmt.value.lossy)

const buttonClass = (fmt: OutputFormat) =>
  props.format === fmt
    ? 'bg-primary text-white border-primary shadow-sm'
    : 'bg-(--ui-bg) text-(--ui-text) border-(--ui-border) hover:border-primary hover:text-primary'
</script>

<template>
  <div class="bg-(--ui-bg) rounded-xl border border-(--ui-border) p-5">
    <div class="flex flex-col sm:flex-row sm:items-end gap-5">
      <!-- Format selector -->
      <div class="flex-1">
        <p class="text-xs font-medium text-(--ui-text-muted) mb-2">Output format</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="fmt in FORMAT_CONFIG"
            :key="fmt.value"
            :disabled="!supported.has(fmt.value)"
            class="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all border cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
            :class="buttonClass(fmt.value)"
            @click="supported.has(fmt.value) && emit('update:format', fmt.value)"
          >
            {{ fmt.label }}
          </button>
        </div>
        <p v-if="!supported.has('avif')" class="text-xs text-(--ui-text-muted) mt-1.5">
          AVIF not supported in this browser
        </p>
      </div>

      <!-- Quality slider (lossy formats only) -->
      <div v-if="isLossy" class="sm:w-48">
        <p class="text-xs font-medium text-(--ui-text-muted) mb-2">
          Quality: <span class="text-(--ui-text) tabular-nums">{{ quality }}%</span>
        </p>
        <input
          :value="quality"
          type="range"
          min="1"
          max="100"
          class="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-primary bg-(--ui-border)"
          @input="emit('update:quality', Number(($event.target as HTMLInputElement).value))"
        >
      </div>

      <!-- Download -->
      <UButton
        size="lg"
        :disabled="!convertedUrl || converting"
        leading-icon="i-lucide-download"
        class="shrink-0"
        @click="emit('download')"
      >
        Download {{ currentFmt.label }}
      </UButton>
    </div>

    <p v-if="error" class="text-red-500 text-sm mt-3">{{ error }}</p>
  </div>
</template>
