"use client"

import { useState, useCallback } from "react"
import { createPortal } from "react-dom"
import { MessageSquare, X } from "lucide-react"
import Giscus from "@giscus/react"
import { useTheme } from "next-themes"
import { useI18n } from "@/lib/i18n-context"

export function CommentButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
        title="Comments"
      >
        <MessageSquare className="size-4" />
        <span className="sr-only">Comments</span>
      </button>

      {open && createPortal(
        <CommentDrawer onClose={() => setOpen(false)} />,
        document.body,
      )}
    </>
  )
}

function CommentDrawer({ onClose }: { onClose: () => void }) {
  const { theme } = useTheme()
  const { locale } = useI18n()

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose()
    },
    [onClose],
  )

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-lg h-full bg-background shadow-xl flex flex-col animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <h2 className="font-semibold text-lg">💬 评论</h2>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          >
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {/* Giscus */}
        <div className="flex-1 overflow-y-auto p-4">
          <Giscus
            id="comments"
            repo="xbmlz/local-convert"
            repoId="R_kgDOSpPHaQ"
            category="Announcements"
            categoryId="DIC_kwDOSpPHac4C-EMN"
            mapping="og:title"
            strict="0"
            reactionsEnabled="1"
            emitMetadata="0"
            inputPosition="bottom"
            theme={theme === "dark" ? "dark" : "light"}
            lang={locale === "zh" ? "zh-CN" : "en"}
            loading="lazy"
          />
        </div>
      </div>
    </div>
  )
}