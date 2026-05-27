<script setup lang="ts">
defineProps<{
  url: string
  filename: string
  size: number
  type?: string
  saving?: number | null
  converting?: boolean
}>()
</script>

<template>
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
        v-else-if="url"
        :src="url"
        class="max-w-full max-h-full object-contain rounded"
        :alt="filename"
      >
    </div>
    <div class="px-4 py-3 border-t border-(--ui-border)">
      <p class="text-sm font-medium truncate text-(--ui-text)">{{ filename }}</p>
      <div class="flex items-center gap-2 mt-0.5">
        <span class="text-xs text-(--ui-text-muted)">
          {{ formatBytes(size) }}<template v-if="type"> · {{ type }}</template>
        </span>
        <span
          v-if="saving !== null && saving !== undefined"
          class="text-xs font-medium"
          :class="saving >= 0 ? 'text-green-500' : 'text-amber-500'"
        >
          {{ saving >= 0 ? '↓' : '↑' }} {{ Math.abs(saving).toFixed(1) }}%
        </span>
      </div>
    </div>
  </div>
</template>
