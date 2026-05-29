"use client"

import { Download, Copy, Check, Crop, Maximize2, RotateCcw, RotateCw, FlipHorizontal, FlipVertical } from "lucide-react"
import type { OutputFormat } from "@/lib/image-converter"
import { FORMAT_CONFIG } from "@/lib/image-converter"
import type { CropRatio } from "@/hooks/use-converter"
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
  // Resize
  imageWidth: number
  imageHeight: number
  resizeEnabled: boolean
  onResizeEnabledChange: (enabled: boolean) => void
  resizeWidth: number
  resizeMode: "percent" | "pixels"
  onResizeModeChange: (mode: "percent" | "pixels") => void
  keepAspect: boolean
  onKeepAspectChange: (keep: boolean) => void
  resizeHeight: number
  onResizeWidthChange: (w: number) => void
  onResizeHeightChange: (h: number) => void
  // Crop
  cropEnabled: boolean
  cropRatio: CropRatio
  onCropClick: () => void
  onCropReset: () => void
  // Rotation / Flip
  rotation: 0 | 90 | 180 | 270
  flipH: boolean
  flipV: boolean
  isTransformed: boolean
  onRotateLeft: () => void
  onRotateRight: () => void
  onFlipH: () => void
  onFlipV: () => void
  onTransformReset: () => void
  // Copy
  copied: boolean
  onCopy: () => void
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
  imageWidth,
  imageHeight,
  resizeEnabled,
  onResizeEnabledChange,
  resizeWidth,
  resizeMode,
  onResizeModeChange,
  keepAspect,
  onKeepAspectChange,
  onResizeWidthChange,
  onResizeHeightChange,
  resizeHeight,
  cropEnabled,
  onCropClick,
  onCropReset,
  rotation,
  flipH,
  flipV,
  isTransformed,
  onRotateLeft,
  onRotateRight,
  onFlipH,
  onFlipV,
  onTransformReset,
  copied,
  onCopy,
}: ControlsBarProps) {
  const { t } = useI18n()

  const currentFmt = FORMAT_CONFIG.find((f) => f.value === format)!
  const isLossy = currentFmt.lossy

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      {/* Resize / Crop / Rotate controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-5 pb-5 border-b border-border">
        {/* Resize section */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <Maximize2 className="size-4 text-muted-foreground" />
            <button
              onClick={() => onResizeEnabledChange(!resizeEnabled)}
              className={cn(
                "text-xs font-medium transition-colors cursor-pointer",
                resizeEnabled ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t("resize.title")}
            </button>
            {resizeEnabled && imageWidth > 0 && (
              <span className="text-xs text-muted-foreground">
                ({t("resize.originalSize")}: {imageWidth} × {imageHeight})
              </span>
            )}
          </div>

          {resizeEnabled && (
            <div className="flex flex-col gap-3">
              {/* Mode toggle */}
              <div className="flex gap-1 bg-muted rounded-lg p-0.5 w-fit">
                <button
                  onClick={() => onResizeModeChange("pixels")}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                    resizeMode === "pixels"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t("resize.pixels")}
                </button>
                <button
                  onClick={() => onResizeModeChange("percent")}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer",
                    resizeMode === "percent"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {t("resize.percent")}
                </button>
              </div>

              {/* Width / Height inputs */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-muted-foreground w-10">{t("resize.width")}</label>
                  <input
                    type="number"
                    value={resizeWidth}
                    min={1}
                    max={resizeMode === "percent" ? 1000 : 32768}
                    className="w-20 px-2 py-1 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    onChange={(e) => onResizeWidthChange(Number(e.target.value) || 1)}
                  />
                  {resizeMode === "percent" && (
                    <span className="text-xs text-muted-foreground">%</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-muted-foreground w-10">{t("resize.height")}</label>
                  <input
                    type="number"
                    value={resizeHeight}
                    min={1}
                    max={resizeMode === "percent" ? 1000 : 32768}
                    className="w-20 px-2 py-1 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    onChange={(e) => onResizeHeightChange(Number(e.target.value) || 1)}
                  />
                  {resizeMode === "percent" && (
                    <span className="text-xs text-muted-foreground">%</span>
                  )}
                </div>
              </div>

              {/* Keep aspect ratio */}
              <label className="flex items-center gap-2 cursor-pointer w-fit">
                <input
                  type="checkbox"
                  checked={keepAspect}
                  onChange={(e) => onKeepAspectChange(e.target.checked)}
                  className="rounded border-border accent-primary"
                />
                <span className="text-xs text-muted-foreground">{t("resize.keepAspect")}</span>
              </label>
            </div>
          )}
        </div>

        {/* Crop section */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <Crop className="size-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              {t("crop.title")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onCropClick}
              disabled={!convertedUrl}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                cropEnabled
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-foreground border-border hover:border-primary hover:text-primary"
              )}
            >
              <Crop className="size-3.5" />
              {cropEnabled ? t("crop.apply") : t("crop.title")}
            </button>
            {cropEnabled && (
              <button
                onClick={onCropReset}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground border border-border hover:border-primary transition-colors cursor-pointer"
              >
                <RotateCcw className="size-3" />
                {t("crop.reset")}
              </button>
            )}
          </div>
        </div>

        {/* Rotate / Flip section */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <RotateCw className="size-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              {t("transform.rotateLeft")}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onRotateLeft}
              title={t("transform.rotateLeft")}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors cursor-pointer"
            >
              <RotateCcw className="size-4" />
            </button>
            <button
              onClick={onRotateRight}
              title={t("transform.rotateRight")}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors cursor-pointer"
            >
              <RotateCw className="size-4" />
            </button>
            <button
              onClick={onFlipH}
              title={t("transform.flipH")}
              className={cn(
                "inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-colors cursor-pointer",
                flipH
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-primary"
              )}
            >
              <FlipHorizontal className="size-4" />
            </button>
            <button
              onClick={onFlipV}
              title={t("transform.flipV")}
              className={cn(
                "inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-colors cursor-pointer",
                flipV
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-primary"
              )}
            >
              <FlipVertical className="size-4" />
            </button>
            {isTransformed && (
              <button
                onClick={onTransformReset}
                title={t("transform.reset")}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-colors cursor-pointer"
              >
                <RotateCcw className="size-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Format / Quality / Download */}
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

        {/* Copy & Download */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            disabled={!convertedUrl || converting}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer",
              copied
                ? "bg-green-500 text-white"
                : "bg-card text-foreground border border-border hover:border-primary hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            onClick={onCopy}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? t("clipboard.copied") : t("clipboard.copy")}
          </button>
          <button
            disabled={!convertedUrl || converting}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer",
              "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            onClick={onDownload}
          >
            <Download className="size-4" />
            {t("controls.download").replace("{format}", currentFmt.label)}
          </button>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
    </div>
  )
}