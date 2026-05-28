import { useState, useEffect, useRef, useCallback } from "react"
import {
  type OutputFormat,
  FORMAT_CONFIG,
  convertImage,
  isFormatSupported,
  createPreviewUrl,
} from "@/lib/image-converter"
import { useI18n } from "@/lib/i18n-context"

export function useConverter() {
  const { t } = useI18n()

  const [file, setFile] = useState<File | null>(null)
  const [originalUrl, setOriginalUrl] = useState("")
  const [convertedUrl, setConvertedUrl] = useState("")
  const [convertedSize, setConvertedSize] = useState(0)
  const [converting, setConverting] = useState(false)
  const [error, setError] = useState("")
  const [supported, setSupported] = useState<Set<OutputFormat>>(
    new Set(["jpeg", "png"])
  )
  const [format, setFormat] = useState<OutputFormat>("webp")
  const [quality, setQuality] = useState(82)

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const originalUrlRef = useRef("")
  const convertedUrlRef = useRef("")
  const fileRef = useRef<File | null>(null)

  // Keep refs in sync
  fileRef.current = file
  originalUrlRef.current = originalUrl
  convertedUrlRef.current = convertedUrl

  // Check format support on mount
  useEffect(() => {
    const checks = FORMAT_CONFIG.map(async (f) => {
      const ok = await isFormatSupported(f.value)
      return [f.value, ok] as const
    })
    Promise.all(checks).then((results) => {
      const newSupported = new Set(
        results.filter(([, ok]) => ok).map(([v]) => v)
      )
      setSupported(newSupported)
      if (!newSupported.has("webp")) setFormat("jpeg")
    })
  }, [])

  const currentFmt = FORMAT_CONFIG.find((f) => f.value === format)!

  const saving =
    file && convertedSize
      ? ((file.size - convertedSize) / file.size) * 100
      : null

  const convertedFilename = file
    ? `${file.name.replace(/\.[^.]+$/, "")}.${currentFmt.ext}`
    : ""

  const originalType = file
    ? (file.type.split("/")[1] || file.name.split(".").pop() || "").toUpperCase()
    : ""

  // Some formats can't be previewed directly in the browser
  const originalPreviewable = file
    ? (() => {
        const ext = file.name.toLowerCase().split(".").pop() || ""
        const unpreviewable = ["heic", "heif", "avif", "tiff", "tif", "ico"]
        return !unpreviewable.includes(ext)
      })()
    : true

  const doConvert = useCallback(async () => {
    const currentFile = fileRef.current
    if (!currentFile) return
    setConverting(true)
    setError("")
    try {
      const prev = convertedUrlRef.current
      const blob = await convertImage(currentFile, format, quality)
      if (prev) URL.revokeObjectURL(prev)
      const url = URL.createObjectURL(blob)
      setConvertedUrl(url)
      setConvertedSize(blob.size)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("controls.conversionFailed"))
    } finally {
      setConverting(false)
    }
  }, [format, quality, t])

  // Re-convert when format changes
  useEffect(() => {
    if (file) doConvert()
  }, [format]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced re-convert when quality changes
  useEffect(() => {
    if (!file) return
    clearTimeout(debounceTimer.current!)
    debounceTimer.current = setTimeout(doConvert, 280)
    return () => clearTimeout(debounceTimer.current!)
  }, [quality]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadFile = useCallback(
    async (f: File) => {
      const IMAGE_EXTENSIONS = /\.(jpe?g|png|gif|bmp|svg|webp|avif|heic|heif|tiff?|ico)$/i
      const isImage = /^image\//.test(f.type) || IMAGE_EXTENSIONS.test(f.name)
      if (!isImage) {
        setError(t("dropzone.invalidFile"))
        return
      }
      if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current)
      if (convertedUrlRef.current) URL.revokeObjectURL(convertedUrlRef.current)
      setFile(f)
      setConvertedUrl("")
      setConvertedSize(0)
      setError("")
      fileRef.current = f
      // For HEIC files, convert to JPEG for preview since browsers can't display HEIC
      try {
        const previewUrl = await createPreviewUrl(f)
        setOriginalUrl(previewUrl)
      } catch {
        // If preview fails, still try to convert
        setOriginalUrl(URL.createObjectURL(f))
      }
      // doConvert will be called after state updates, but we call it directly
      setConverting(true)
      try {
        const blob = await convertImage(f, format, quality)
        const url = URL.createObjectURL(blob)
        convertedUrlRef.current = url
        setConvertedUrl(url)
        setConvertedSize(blob.size)
      } catch (e) {
        setError(e instanceof Error ? e.message : t("controls.conversionFailed"))
      } finally {
        setConverting(false)
      }
    },
    [format, quality, t]
  )

  const reset = useCallback(() => {
    if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current)
    if (convertedUrlRef.current) URL.revokeObjectURL(convertedUrlRef.current)
    setFile(null)
    setOriginalUrl("")
    setConvertedUrl("")
    setConvertedSize(0)
    setError("")
  }, [])

  const download = useCallback(() => {
    if (!convertedUrl || !file) return
    const a = document.createElement("a")
    a.href = convertedUrl
    a.download = convertedFilename
    a.click()
  }, [convertedUrl, file, convertedFilename])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current)
      if (convertedUrlRef.current) URL.revokeObjectURL(convertedUrlRef.current)
    }
  }, [])

  return {
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
    convertedFilename,
    originalType,
    originalPreviewable,
    currentFmt,
    setFormat,
    setQuality,
    loadFile,
    reset,
    download,
  }
}