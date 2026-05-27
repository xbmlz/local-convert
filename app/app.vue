<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

useSeoMeta({
  title: 'LocalConvert — Free image converter, 100% private',
  description: 'Convert images between JPEG, PNG, WebP and AVIF directly in your browser. No uploads, no servers, completely private.',
  ogTitle: 'LocalConvert — Free image converter, 100% private',
  ogDescription: 'Convert images between JPEG, PNG, WebP and AVIF directly in your browser. No uploads, no servers, completely private.',
  twitterCard: 'summary'
})
</script>

<template>
  <UApp>
    <UHeader>
      <template #left>
        <NuxtLink to="/" class="flex items-center gap-2.5 text-(--ui-text) hover:text-primary transition-colors">
          <div class="size-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <UIcon name="i-lucide-image" class="size-4 text-white" />
          </div>
          <span class="font-semibold text-sm">LocalConvert</span>
        </NuxtLink>
      </template>

      <template #right>
        <UTooltip text="Toggle theme">
          <UColorModeButton />
        </UTooltip>
        <UTooltip text="View on GitHub">
          <UButton
            to="https://github.com/xbmlz/local-convert"
            target="_blank"
            icon="i-simple-icons-github"
            aria-label="GitHub"
            color="neutral"
            variant="ghost"
          />
        </UTooltip>
      </template>
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>

    <UFooter>
      <template #left>
        <p class="text-xs text-(--ui-text-muted) flex items-center gap-1.5">
          <UIcon name="i-lucide-lock" class="size-3" />
          Images never leave your browser · No account needed · Free forever
        </p>
      </template>
    </UFooter>
  </UApp>
</template>
