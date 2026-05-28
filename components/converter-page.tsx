"use client"

import { useState, useEffect, useCallback } from "react"
import { ArrowLeft, ImageUp } from "lucide-react"
import { useI18n } from "@/lib/i18n-context"
import { useConverter } from "@/hooks/use-converter"
import { DropZone } from "@/components/drop-zone"
import { PreviewCard } from "@/components/preview-card"
import { ControlsBar } from "@/components/controls-bar"

export function ConverterPage() {
  const { t } = useI18n()
  const {
    file,
    originalUrl,
    convertedUrl,
    convertedSize,
    converting,
    error,
    supported,
    format,
    quality,
    saving,
    originalType,
    originalPreviewable,
    setFormat,
    setQuality,
    loadFile,
    reset,
    download,
  } = useConverter()

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
    return <DropZone onFile={loadFile} />
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <button
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          onClick={reset}
        >
          <ArrowLeft className="size-4" />
          {t("page.convertAnother")}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <PreviewCard
          url={originalUrl}
          filename={file.name}
          size={file.size}
          type={originalType}
          previewable={originalPreviewable}
        />
        <PreviewCard
          url={convertedUrl}
          filename={
            `${file.name.replace(/\.[^.]+$/, "")}.${
              (
                [
                  { value: "jpeg", ext: "jpg" },
                  { value: "png", ext: "png" },
                  { value: "webp", ext: "webp" },
                  { value: "avif", ext: "avif" },
                  { value: "heic", ext: "heic" },
                ] as const
              ).find((f) => f.value === format)?.ext ?? "webp"
            }`
          }
          size={convertedSize}
          saving={saving}
          converting={converting}
        />
      </div>

      <ControlsBar
        format={format}
        quality={quality}
        converting={converting}
        convertedUrl={convertedUrl}
        supported={supported}
        error={error}
        onFormatChange={setFormat}
        onQualityChange={setQuality}
        onDownload={download}
      />

      {/* Full-page drag overlay */}
      {dragOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity duration-150">
          <div className="text-center border-4 border-dashed border-primary rounded-2xl p-16">
            <ImageUp className="size-16 text-primary mb-3 mx-auto" />
            <p className="text-lg font-semibold text-foreground">
              {t("page.dropToReplace")}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}