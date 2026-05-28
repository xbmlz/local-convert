"use client"

import { Download } from "lucide-react"
import type { OutputFormat } from "@/lib/image-converter"
import { FORMAT_CONFIG } from "@/lib/image-converter"
import { useI18n } from "@/lib/i18n-context"
import { cn } from "@/lib/utils"

interface ControlsBarProps {
  format: OutputFormat
  quality: number
  converting: boolean
  convertedUrl: string
  supported: Set<OutputFormat>
  error: string
  onFormatChange: (format: OutputFormat) => void
  onQualityChange: (quality: number) => void
  onDownload: () => void
}

export function ControlsBar({
  format,
  quality,
  converting,
  convertedUrl,
  supported,
  error,
  onFormatChange,
  onQualityChange,
  onDownload,
}: ControlsBarProps) {
  const { t } = useI18n()

  const currentFmt = FORMAT_CONFIG.find((f) => f.value === format)!
  const isLossy = currentFmt.lossy

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex flex-col sm:flex-row sm:items-end gap-5">
        {/* Format selector */}
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {t("controls.outputFormat")}
          </p>
          <div className="flex flex-wrap gap-2">
            {FORMAT_CONFIG.map((fmt) => (
              <button
                key={fmt.value}
                disabled={!supported.has(fmt.value)}
                className={cn(
                  "px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all border cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed",
                  format === fmt.value
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-foreground border-border hover:border-primary hover:text-primary"
                )}
                onClick={() =>
                  supported.has(fmt.value) && onFormatChange(fmt.value)
                }
              >
                {fmt.label}
              </button>
            ))}
          </div>
          {!supported.has("avif") && (
            <p className="text-xs text-muted-foreground mt-1.5">
              {t("controls.avifUnsupported")}
            </p>
          )}
        </div>

        {/* Quality slider */}
        {isLossy && convertedUrl && (
          <div className="sm:w-48">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {t("controls.quality")}:{" "}
              <span className="text-foreground tabular-nums">{quality}%</span>
            </p>
            <input
              value={quality}
              type="range"
              min={1}
              max={100}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-primary bg-border"
              onChange={(e) => onQualityChange(Number(e.target.value))}
            />
          </div>
        )}

        {/* Download */}
        <button
          disabled={!convertedUrl || converting}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all shrink-0 cursor-pointer",
            "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          onClick={onDownload}
        >
          <Download className="size-4" />
          {t("controls.download").replace("{format}", currentFmt.label)}
        </button>
      </div>

      {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
    </div>
  )
}