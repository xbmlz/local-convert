"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { ArrowLeft, Upload, FileText, Copy, Check, Download } from "lucide-react"
import { useI18n } from "@/lib/i18n-context"
import { useDocConverter } from "@/hooks/use-doc-converter"
import { DOC_FORMATS } from "@/lib/document-converter"

export function DocConverterPage() {
  const { t } = useI18n()
  const {
    file,
    content,
    outputContent,
    inputFormat,
    outputFormat,
    converting,
    error,
    availableOutputs,
    loadFile,
    changeOutputFormat,
    download,
    reset,
  } = useDocConverter()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleFile = useCallback(
    (f: File) => {
      loadFile(f)
    },
    [loadFile]
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

  const copyOutput = useCallback(async () => {
    if (!outputContent) return
    try {
      await navigator.clipboard.writeText(outputContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }, [outputContent])

  // Drop zone
  if (!file) {
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
                <FileText className="size-8 text-muted-foreground" />
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
                {["Markdown", "HTML", "JSON", "CSV", "XML", "YAML", "TXT", "TSV"].map((fmt) => (
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
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            {t("dropzone.privacy")}
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,.html,.htm,.txt,.json,.csv,.tsv,.xml,.yaml,.yml,.log,.ini,.cfg,.conf,text/*,application/json,application/xml"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <button
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          onClick={reset}
        >
          <ArrowLeft className="size-4" />
          {t("document.convertAnother")}
        </button>
      </div>

      {/* Format selector */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("document.inputFormat")}:</span>
          <span className="px-2.5 py-1 rounded-md bg-muted text-sm font-medium">
            {t(`document.${inputFormat}`)}
          </span>
        </div>
        <span className="text-muted-foreground">→</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("document.outputFormat")}:</span>
          <select
            value={outputFormat}
            onChange={(e) => changeOutputFormat(e.target.value as typeof outputFormat)}
            className="px-2.5 py-1 rounded-md bg-muted text-sm font-medium cursor-pointer border border-border"
          >
            {availableOutputs.map((fmt) => {
              const cfg = DOC_FORMATS.find((f) => f.value === fmt)
              return (
                <option key={fmt} value={fmt}>
                  {cfg ? t(cfg.labelKey) : fmt}
                </option>
              )
            })}
          </select>
        </div>
      </div>

      {/* Content panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Input */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium">{file.name}</span>
            <span className="text-xs text-muted-foreground">
              {t(`document.${inputFormat}`)}
            </span>
          </div>
          <div className="p-4 max-h-96 overflow-auto">
            <pre className="text-sm whitespace-pre-wrap break-words font-mono text-muted-foreground">
              {content.slice(0, 50000)}
            </pre>
          </div>
        </div>

        {/* Output */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium">
              {file.name.replace(/\.[^.]+$/, "")}.{DOC_FORMATS.find((f) => f.value === outputFormat)?.ext || "txt"}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={copyOutput}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
          <div className="p-4 max-h-96 overflow-auto">
            {converting ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <div className="animate-spin size-5 border-2 border-muted-foreground border-t-transparent rounded-full mr-2" />
                <span className="text-sm">{t("document.converting")}</span>
              </div>
            ) : (
              <pre className="text-sm whitespace-pre-wrap break-words font-mono text-muted-foreground">
                {outputContent.slice(0, 50000)}
              </pre>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={download}
          disabled={!outputContent}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="size-4" />
          {t("document.download").replace("{format}", DOC_FORMATS.find((f) => f.value === outputFormat)?.ext.toUpperCase() || "")}
        </button>
      </div>

      {error && (
        <p className="text-red-500 text-sm text-center mt-3">{error}</p>
      )}
    </div>
  )
}