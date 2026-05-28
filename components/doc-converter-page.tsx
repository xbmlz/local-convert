"use client"

import { useState, useCallback, useRef } from "react"
import { ArrowLeft, FileText, Copy, Check, Download, AlertCircle } from "lucide-react"
import { useI18n } from "@/lib/i18n-context"
import { useDocConverter } from "@/hooks/use-doc-converter"
import { DOC_FORMATS, isPreviewable } from "@/lib/document-converter"

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
    outputIsBinary,
    loadFile,
    changeOutputFormat,
    download,
    reset,
  } = useDocConverter()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleFile = useCallback(
    (f: File) => { loadFile(f) },
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
    } catch {}
  }, [outputContent])

  const getLabel = (fmt: string) => {
    const cfg = DOC_FORMATS.find((f) => f.value === fmt)
    return cfg ? t(cfg.labelKey) : fmt
  }

  // Drop zone
  if (!file) {
    return (
      <div
        className="flex items-center justify-center px-4"
        style={{ minHeight: "calc(100dvh - 3.5rem - 2.25rem)" }}
      >
        <div className="w-full max-w-xl">
          <div
            className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-200 select-none ${
              dragOver
                ? "border-primary bg-primary/5 scale-[1.01]"
                : "border-border hover:border-primary hover:bg-primary/5"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
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
                {DOC_FORMATS.filter((f) => f.canInput).map((fmt) => (
                  <span key={fmt.value} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {fmt.ext.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm text-center mt-3">{error}</p>}

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

  const inputFmtCfg = DOC_FORMATS.find((f) => f.value === inputFormat)
  const outputFmtCfg = DOC_FORMATS.find((f) => f.value === outputFormat)

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
      <div className="bg-card rounded-xl border border-border p-5 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          {/* Input format (read-only) */}
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {t("document.inputFormat")}
            </p>
            <div className="px-3 py-2 rounded-lg bg-muted text-sm font-medium">
              {getLabel(inputFormat)}
              {inputFmtCfg && (
                <span className="text-muted-foreground ml-1">(.{inputFmtCfg.ext})</span>
              )}
            </div>
          </div>

          <span className="text-muted-foreground text-lg hidden sm:block pb-2">→</span>

          {/* Output format selector */}
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {t("document.outputFormat")}
            </p>
            <select
              value={outputFormat}
              onChange={(e) => changeOutputFormat(e.target.value as typeof outputFormat)}
              className="w-full px-3 py-2 rounded-lg bg-muted text-sm font-medium cursor-pointer border border-border"
            >
              {/* Group labels */}
              {availableOutputs.some((f) => DOC_FORMATS.find((c) => c.value === f)?.group === "text") && (
                <optgroup label={t("document.textGroup") || "Text"}>
                  {availableOutputs.filter((f) => DOC_FORMATS.find((c) => c.value === f)?.group === "text").map((fmt) => (
                    <option key={fmt} value={fmt}>{getLabel(fmt)}</option>
                  ))}
                </optgroup>
              )}
              {availableOutputs.some((f) => DOC_FORMATS.find((c) => c.value === f)?.group === "data") && (
                <optgroup label={t("document.dataGroup") || "Data"}>
                  {availableOutputs.filter((f) => DOC_FORMATS.find((c) => c.value === f)?.group === "data").map((fmt) => (
                    <option key={fmt} value={fmt}>{getLabel(fmt)}</option>
                  ))}
                </optgroup>
              )}
              {availableOutputs.some((f) => DOC_FORMATS.find((c) => c.value === f)?.group === "binary") && (
                <optgroup label={t("document.binaryGroup") || "Binary"}>
                  {availableOutputs.filter((f) => DOC_FORMATS.find((c) => c.value === f)?.group === "binary").map((fmt) => (
                    <option key={fmt} value={fmt}>{getLabel(fmt)}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {/* Download button */}
          <button
            onClick={download}
            disabled={converting || (!outputContent && !outputIsBinary)}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            <Download className="size-4" />
            {t("document.download").replace("{format}", outputFmtCfg?.ext.toUpperCase() || "")}
          </button>
        </div>
      </div>

      {/* Content panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input panel */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium truncate">{file.name}</span>
            <span className="text-xs text-muted-foreground">{getLabel(inputFormat)}</span>
          </div>
          <div className="p-4 max-h-96 overflow-auto">
            <pre className="text-sm whitespace-pre-wrap break-words font-mono text-muted-foreground">
              {content.slice(0, 50000)}
            </pre>
          </div>
        </div>

        {/* Output panel */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium truncate">
              {file.name.replace(/\.[^.]+$/, "")}.{outputFmtCfg?.ext || "txt"}
            </span>
            <div className="flex items-center gap-2">
              {!outputIsBinary && outputContent && (
                <button
                  onClick={copyOutput}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              )}
            </div>
          </div>
          <div className="p-4 max-h-96 overflow-auto">
            {converting ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <div className="animate-spin size-5 border-2 border-muted-foreground border-t-transparent rounded-full mr-2" />
                <span className="text-sm">{t("document.converting")}</span>
              </div>
            ) : outputIsBinary ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                <FileText className="size-8" />
                <p className="text-sm">{t("document.binaryReady") || "Binary file ready for download"}</p>
                <p className="text-xs text-muted-foreground">
                  {outputFmtCfg?.ext.toUpperCase()} {t("document.cannotPreview") || "cannot be previewed in browser"}
                </p>
              </div>
            ) : (
              <pre className="text-sm whitespace-pre-wrap break-words font-mono text-muted-foreground">
                {outputContent.slice(0, 50000)}
              </pre>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 mt-3 text-red-500 text-sm">
          <AlertCircle className="size-4" />
          {error}
        </div>
      )}
    </div>
  )
}