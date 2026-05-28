"use client"

import { Loader2 } from "lucide-react"
import { formatBytes } from "@/lib/image-converter"
import { useI18n } from "@/lib/i18n-context"

interface PreviewCardProps {
  url: string
  filename: string
  size: number
  type?: string
  saving?: number | null
  converting?: boolean
  previewable?: boolean
}

export function PreviewCard({
  url,
  filename,
  size,
  type,
  saving,
  converting,
  previewable = true,
}: PreviewCardProps) {
  const { t } = useI18n()

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div
        className="aspect-video flex items-center justify-center bg-muted p-2"
        style={{
          backgroundImage:
            "repeating-conic-gradient(color-mix(in srgb, var(--color-border) 60%, transparent) 0% 25%, transparent 0% 50%)",
          backgroundSize: "16px 16px",
        }}
      >
        {converting ? (
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            <span className="text-sm">{t("preview.converting")}</span>
          </div>
        ) : url && previewable ? (
          <img
            src={url}
            className="max-w-full max-h-full object-contain rounded"
            alt={filename}
          />
        ) : !previewable ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span className="text-sm">{t("preview.notPreviewable") || "无法预览此格式"}</span>
          </div>
        ) : null}
      </div>
      <div className="px-4 py-3 border-t border-border">
        <p className="text-sm font-medium truncate text-foreground">
          {filename}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {formatBytes(size)}
            {type && ` · ${type}`}
          </span>
          {saving !== null && saving !== undefined && (
            <span
              className={`text-xs font-medium ${
                saving >= 0 ? "text-green-500" : "text-amber-500"
              }`}
            >
              {saving >= 0 ? "↓" : "↑"} {Math.abs(saving).toFixed(1)}%
            </span>
          )}
        </div>
      </div>
    </div>
  )
}