"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { ArrowLeft, Download, Loader2, Video, AlertCircle, Zap } from "lucide-react"
import { useI18n } from "@/lib/i18n-context"
import { useVideoConverter } from "@/hooks/use-video-converter"
import { DropZone } from "@/components/drop-zone"
import { VIDEO_FORMATS, VIDEO_QUALITY_OPTIONS, VIDEO_RESOLUTION_OPTIONS, formatBytes } from "@/lib/video-converter"
import { cn } from "@/lib/utils"

export function VideoConverterPage() {
  const { t } = useI18n()
  const {
    file,
    previewUrl,
    loadFile,
    reset,
    maxSize,
    ffmpegReady,
    loading,
    loadProgress,
    handleLoadFFmpeg,
    format,
    setFormat,
    quality,
    setQuality,
    resolution,
    setResolution,
    converting,
    convertProgress,
    convertedUrl,
    convertedSize,
    saving,
    currentFmt,
    error,
    doConvert,
    download,
  } = useVideoConverter()

  const [dragOver, setDragOver] = useState(false)
  const [dragCounter, setDragCounter] = useState(0)

  const onWindowDragEnter = useCallback(
    (e: DragEvent) => {
      if (!file) return
      e.preventDefault()
      setDragCounter((c) => {
        const next = c + 1
        setDragOver(true)
        return next
      })
    },
    [file]
  )

  const onWindowDragLeave = useCallback(() => {
    if (!file) return
    setDragCounter((c) => {
      const next = c - 1
      if (next === 0) setDragOver(false)
      return next
    })
  }, [file])

  const onWindowDrop = useCallback(
    (e: DragEvent) => {
      if (!file) return
      e.preventDefault()
      setDragCounter(0)
      setDragOver(false)
      const f = e.dataTransfer?.files[0]
      if (f) loadFile(f)
    },
    [file, loadFile]
  )

  useEffect(() => {
    window.addEventListener("dragenter", onWindowDragEnter)
    window.addEventListener("dragleave", onWindowDragLeave)
    window.addEventListener("dragover", (e) => e.preventDefault())
    window.addEventListener("drop", onWindowDrop)
    return () => {
      window.removeEventListener("dragenter", onWindowDragEnter)
      window.removeEventListener("dragleave", onWindowDragLeave)
      window.removeEventListener("drop", onWindowDrop)
    }
  }, [onWindowDragEnter, onWindowDragLeave, onWindowDrop])

  if (!file) {
    return (
      <>
        <DropZone onFile={loadFile} mode="video" />
        <p className="fixed bottom-4 left-0 right-0 text-center text-xs text-muted-foreground" suppressHydrationWarning>
          {t("video.maxSize").replace("{size}", formatBytes(maxSize))}
        </p>
      </>
    )
  }

  const isAudioOutput = format === "mp3" || format === "wav"

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <button
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          onClick={reset}
        >
          <ArrowLeft className="size-4" />
          {t("video.convertAnother")}
        </button>
      </div>

      {/* Preview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        {/* Original */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="aspect-video flex items-center justify-center bg-muted p-2">
            {previewUrl && !isAudioOutput ? (
              <video
                src={previewUrl}
                className="max-w-full max-h-full object-contain rounded"
                controls
                muted
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Video className="size-8" />
                <span className="text-sm">{file.name}</span>
              </div>
            )}
          </div>
          <div className="px-4 py-3 border-t border-border">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
          </div>
        </div>

        {/* Converted */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="aspect-video flex items-center justify-center bg-muted p-2">
            {converting ? (
              <div className="flex flex-col items-center gap-3 text-muted-foreground w-full px-6">
                <Loader2 className="size-6 animate-spin" />
                <span className="text-sm">{t("video.converting")}</span>
                <div className="w-full max-w-xs h-2 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.max(convertProgress, 2)}%` }}
                  />
                </div>
                <span className="text-xs tabular-nums">{convertProgress}%</span>
              </div>
            ) : convertedUrl ? (
              isAudioOutput ? (
                <audio src={convertedUrl} controls className="w-3/4" />
              ) : (
                <video
                  src={convertedUrl}
                  className="max-w-full max-h-full object-contain rounded"
                  controls
                  muted
                />
              )
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Video className="size-8" />
                <span className="text-sm">{t("video.noPreview")}</span>
              </div>
            )}
          </div>
          <div className="px-4 py-3 border-t border-border">
            {convertedUrl ? (
              <>
                <p className="text-sm font-medium truncate">
                  {file.name.replace(/\.[^.]+$/, "")}.{currentFmt.ext}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatBytes(convertedSize)}
                  </span>
                  {saving !== null && (
                    <span
                      className={`text-xs font-medium ${
                        saving >= 0 ? "text-green-500" : "text-amber-500"
                      }`}
                    >
                      {saving >= 0 ? "↓" : "↑"} {Math.abs(saving).toFixed(1)}%
                    </span>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-card rounded-xl border border-border p-5">
        {/* FFmpeg loading status */}
        {loading && (
          <div className="mb-4 flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                {t("video.loadingFFmpeg")}
              </span>
            </div>
            <div className="w-full h-2 bg-border rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${Math.max(loadProgress * 100, 5)}%` }}
              />
            </div>
          </div>
        )}

        {/* FFmpeg not loaded warning */}
        {!ffmpegReady && !loading && (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="size-4 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-600 dark:text-amber-400 flex-1">
              {error || t("video.ffmpegNotLoaded")}
            </p>
            <button
              onClick={handleLoadFFmpeg}
              className="shrink-0 px-3 py-1 rounded-md text-xs font-medium bg-amber-500 text-white hover:bg-amber-600 transition-colors cursor-pointer"
            >
              {t("video.loadEngine")}
            </button>
          </div>
        )}

        <div className="flex flex-col gap-4 mb-5 pb-5 border-b border-border">
          {/* Format selector */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {t("video.outputFormat")}
            </p>
            <div className="flex flex-wrap gap-2">
              {VIDEO_FORMATS.map((fmt) => (
                <button
                  key={fmt.value}
                  disabled={converting}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all border cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                    format === fmt.value
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card text-foreground border-border hover:border-primary hover:text-primary"
                  )}
                  onClick={() => setFormat(fmt.value)}
                >
                  {fmt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quality & Resolution row */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Quality */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {t("video.quality")}
              </p>
              <div className="flex gap-1 bg-muted rounded-lg p-0.5 w-fit">
                {VIDEO_QUALITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    disabled={converting}
                    onClick={() => setQuality(opt.value)}
                    className={cn(
                      "px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer disabled:opacity-50",
                      quality === opt.value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t(opt.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {t("video.resolution")}
              </p>
              <div className="flex gap-1 bg-muted rounded-lg p-0.5 w-fit">
                {VIDEO_RESOLUTION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    disabled={converting}
                    onClick={() => setResolution(opt.value)}
                    className={cn(
                      "px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer disabled:opacity-50",
                      resolution === opt.value
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t(opt.labelKey)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end gap-5">

          {/* Convert & Download buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Convert button */}
            {ffmpegReady && !convertedUrl && !converting && (
              <button
                onClick={doConvert}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Zap className="size-4" />
                {t("video.startConvert")}
              </button>
            )}
            {/* Re-convert button */}
            {ffmpegReady && convertedUrl && !converting && (
              <button
                onClick={doConvert}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer border border-border bg-card text-foreground hover:border-primary hover:text-primary"
              >
                <Zap className="size-4" />
                {t("video.startConvert")}
              </button>
            )}
            {/* Download button */}
            <button
              disabled={!convertedUrl || converting}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer",
                "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              onClick={download}
            >
              <Download className="size-4" />
              {t("video.download").replace("{format}", currentFmt.label)}
            </button>
          </div>
        </div>

        {error && ffmpegReady && (
          <p className="text-red-500 text-sm mt-3">{error}</p>
        )}
      </div>

      {/* Full-page drag overlay */}
      {dragOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity duration-150">
          <div className="text-center border-4 border-dashed border-primary rounded-2xl p-16">
            <Video className="size-16 text-primary mb-3 mx-auto" />
            <p className="text-lg font-semibold text-foreground">
              {t("video.dropToReplace")}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}