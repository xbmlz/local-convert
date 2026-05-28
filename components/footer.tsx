"use client"

import { useI18n } from "@/lib/i18n-context"

export function Footer() {
  const { t } = useI18n()

  return (
    <footer className="border-t border-border py-3">
      <p className="text-center text-xs text-muted-foreground">
        🔒 {t("footer.tagline")}
      </p>
    </footer>
  )
}