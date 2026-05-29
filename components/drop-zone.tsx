"use client"

import { useRef, useState, useCallback } from "react"
import { Upload } from "lucide-react"
import { useI18n } from "@/lib/i18n-context"

type DropZoneMode = "image" | "document" | "video"

const MODE_CONFIG: Record<DropZoneMode, { formats: string[]; accept: string; mimeRe: RegExp; extRe: RegExp; invalidKey: string }> = {
  image: {
    formats: ["JPEG", "PNG", "WebP", "AVIF", "HEIC", "GIF", "BMP", "SVG"],
    accept: "image/*,.heic,.heif,.tiff,.tif",
    mimeRe: /^image\//,
    extRe: /\.(jpe?g|png|gif|bmp|svg|webp|avif|heic|heif|tiff?|ico)$/i,
    invalidKey: "dropzone.invalidImage",
  },
  document: {
    formats: ["MD", "HTML", "TXT", "JSON", "CSV", "TSV", "XML", "YAML"],
    accept: ".md,.markdown,.html,.htm,.txt,.text,.json,.csv,.tsv,.xml,.yaml,.yml",
    mimeRe: /^(text\/|application\/json|application\/xml|application\/yaml)/,
    extRe: /\.(md|markdown|html?|txt|text|json|csv|tsv|xml|ya?ml)$/i,
    invalidKey: "dropzone.invalidDocument",
  },
  video: {
    formats: ["MP4", "WebM", "MOV", "AVI", "MKV", "FLV", "GIF"],
    accept: "video/*,.mkv,.flv,.avi,.mov,.wmv,.m4v,.3gp,.ogv",
    mimeRe: /^video\//,
    extRe: /\.(mp4|webm|mov|avi|mkv|flv|wmv|m4v|3gp|ogv|mts|ts)$/i,
    invalidKey: "dropzone.invalidFile",
  },
}

interface DropZoneProps {
  onFile: (file: File) => void
  mode?: DropZoneMode
}

export function DropZone({ onFile, mode = "image" }: DropZoneProps) {
  const { t } = useI18n()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState("")
  const cfg = MODE_CONFIG[mode]

  const handleFile = useCallback(
    (f: File) => {
      const isValid = cfg.mimeRe.test(f.type) || cfg.extRe.test(f.name)
      if (!isValid) {
        setError(t(cfg.invalidKey))
        return
      }
      setError("")
      onFile(f)
    },
    [onFile, t, cfg]
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const f = e.dataTransfer?.files[0]
      if (f) handleFile(f)
    },
    [handleFile]
  )

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      if (f) handleFile(f)
    },
    [handleFile]
  )

  return (
    <div
      className="flex items-center justify-center px-4"
      style={{
        minHeight:
          "calc(100dvh - var(--header-height, 4rem) - var(--footer-height, 3rem))",
      }}
    >
      <div className="w-full max-w-xl">
        <div
          className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-200 select-none ${
            dragOver
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border hover:border-primary hover:bg-primary/5"
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-5">
            <div className="size-16 rounded-2xl bg-muted flex items-center justify-center">
              <Upload className="size-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">
                {t("dropzone.title")}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("dropzone.subtitle")}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {cfg.formats.map((fmt) => (
                <span
                  key={fmt}
                  className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                >
                  {fmt}
                </span>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <p className="text-red-500 text-sm text-center mt-3">{error}</p>
        )}

        <p className="text-center text-xs text-muted-foreground mt-5 flex items-center justify-center gap-1.5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0"
          >
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          {t("dropzone.privacy")}
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept={cfg.accept}
          className="hidden"
          onChange={onFileChange}
        />
      </div>
    </div>
  )
}