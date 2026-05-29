import { useState, useEffect, useRef, useCallback } from "react"
import {
  type OutputFormat,
  type CropArea,
  type ResizeOptions,
  type ImageTransformOptions,
  FORMAT_CONFIG,
  convertImage,
  isFormatSupported,
  createPreviewUrl,
  getImageDimensions,
} from "@/lib/image-converter"
import { useI18n } from "@/lib/i18n-context"

export type CropRatio = "free" | "1:1" | "3:4" | "4:3" | "16:9"

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

  // Image dimensions
  const [imageWidth, setImageWidth] = useState(0)
  const [imageHeight, setImageHeight] = useState(0)

  // Resize state
  const [resizeEnabled, setResizeEnabled] = useState(false)
  const [resizeWidth, setResizeWidth] = useState(0)
  const [resizeHeight, setResizeHeight] = useState(0)
  const [resizeMode, setResizeMode] = useState<"percent" | "pixels">("pixels")
  const [keepAspect, setKeepAspect] = useState(true)

  // Crop state
  const [cropEnabled, setCropEnabled] = useState(false)
  const [cropArea, setCropArea] = useState<CropArea | null>(null)
  const [cropRatio, setCropRatio] = useState<CropRatio>("free")

  // Crop overlay visibility
  const [showCropOverlay, setShowCropOverlay] = useState(false)

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const originalUrlRef = useRef("")
  const convertedUrlRef = useRef("")
  const fileRef = useRef<File | null>(null)
  const imageWidthRef = useRef(0)
  const imageHeightRef = useRef(0)
  const cropAreaRef = useRef<CropArea | null>(null)

  // Keep refs in sync
  fileRef.current = file
  originalUrlRef.current = originalUrl
  convertedUrlRef.current = convertedUrl
  imageWidthRef.current = imageWidth
  imageHeightRef.current = imageHeight
  cropAreaRef.current = cropArea

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

  // Build transform options from current state
  const buildTransform = useCallback((): ImageTransformOptions | undefined => {
    const resize: ResizeOptions | undefined = resizeEnabled
      ? { width: resizeWidth, height: resizeHeight, mode: resizeMode, keepAspect }
      : undefined
    const crop = cropEnabled ? cropAreaRef.current ?? undefined : undefined
    if (!resize && !crop) return undefined
    return { resize, crop }
  }, [resizeEnabled, resizeWidth, resizeHeight, resizeMode, keepAspect, cropEnabled])

  const doConvert = useCallback(async () => {
    const currentFile = fileRef.current
    if (!currentFile) return
    setConverting(true)
    setError("")
    try {
      const prev = convertedUrlRef.current
      const transform = buildTransform()
      const blob = await convertImage(currentFile, format, quality, transform)
      if (prev) URL.revokeObjectURL(prev)
      const url = URL.createObjectURL(blob)
      setConvertedUrl(url)
      setConvertedSize(blob.size)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("controls.conversionFailed"))
    } finally {
      setConverting(false)
    }
  }, [format, quality, t, buildTransform])

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

  // Re-convert when resize settings change
  useEffect(() => {
    if (!file || !resizeEnabled) return
    clearTimeout(debounceTimer.current!)
    debounceTimer.current = setTimeout(doConvert, 300)
    return () => clearTimeout(debounceTimer.current!)
  }, [resizeEnabled, resizeWidth, resizeHeight, resizeMode, keepAspect]) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-convert when crop changes
  useEffect(() => {
    if (!file || !cropEnabled || !cropArea) return
    doConvert()
  }, [cropArea, cropEnabled]) // eslint-disable-line react-hooks/exhaustive-deps

  // Update resize dimensions when image loads
  const updateImageDimensions = useCallback(async (f: File) => {
    try {
      const dims = await getImageDimensions(f)
      setImageWidth(dims.width)
      setImageHeight(dims.height)
      imageWidthRef.current = dims.width
      imageHeightRef.current = dims.height
      if (!resizeEnabled) {
        setResizeWidth(dims.width)
        setResizeHeight(dims.height)
      }
    } catch {
      // Ignore dimension detection errors
    }
  }, [resizeEnabled])

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
      setResizeEnabled(false)
      setCropEnabled(false)
      setCropArea(null)
      setCropRatio("free")
      setShowCropOverlay(false)
      fileRef.current = f
      // Get image dimensions
      await updateImageDimensions(f)
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
    [format, quality, t, updateImageDimensions]
  )

  // Resize handlers
  const handleResizeWidthChange = useCallback((w: number) => {
    setResizeWidth(w)
    if (keepAspect && imageWidthRef.current > 0 && imageHeightRef.current > 0) {
      const ratio = imageHeightRef.current / imageWidthRef.current
      if (resizeMode === "pixels") {
        setResizeHeight(Math.round(w * ratio))
      } else {
        setResizeHeight(w)
      }
    }
  }, [keepAspect, resizeMode])

  const handleResizeHeightChange = useCallback((h: number) => {
    setResizeHeight(h)
    if (keepAspect && imageWidthRef.current > 0 && imageHeightRef.current > 0) {
      const ratio = imageWidthRef.current / imageHeightRef.current
      if (resizeMode === "pixels") {
        setResizeWidth(Math.round(h * ratio))
      } else {
        setResizeWidth(h)
      }
    }
  }, [keepAspect, resizeMode])

  const handleResizeModeChange = useCallback((mode: "percent" | "pixels") => {
    setResizeMode(mode)
    if (mode === "percent") {
      setResizeWidth(100)
      setResizeHeight(100)
    } else {
      setResizeWidth(imageWidthRef.current)
      setResizeHeight(imageHeightRef.current)
    }
  }, [])

  // Crop handlers
  const handleCropApply = useCallback((area: CropArea) => {
    setCropArea(area)
    setCropEnabled(true)
    setShowCropOverlay(false)
  }, [])

  const handleCropCancel = useCallback(() => {
    setShowCropOverlay(false)
  }, [])

  const handleCropReset = useCallback(() => {
    setCropArea(null)
    setCropEnabled(false)
    setShowCropOverlay(false)
  }, [])

  const reset = useCallback(() => {
    if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current)
    if (convertedUrlRef.current) URL.revokeObjectURL(convertedUrlRef.current)
    setFile(null)
    setOriginalUrl("")
    setConvertedUrl("")
    setConvertedSize(0)
    setError("")
    setResizeEnabled(false)
    setResizeWidth(0)
    setResizeHeight(0)
    setCropEnabled(false)
    setCropArea(null)
    setCropRatio("free")
    setShowCropOverlay(false)
    setImageWidth(0)
    setImageHeight(0)
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
    // Image dimensions
    imageWidth,
    imageHeight,
    // Resize
    resizeEnabled,
    setResizeEnabled,
    resizeWidth,
    resizeHeight,
    resizeMode,
    setResizeMode,
    keepAspect,
    setKeepAspect,
    handleResizeWidthChange,
    handleResizeHeightChange,
    // Crop
    cropEnabled,
    cropArea,
    cropRatio,
    setCropRatio,
    showCropOverlay,
    setShowCropOverlay,
    handleCropApply,
    handleCropCancel,
    handleCropReset,
    // Actions
    setFormat,
    setQuality,
    loadFile,
    reset,
    download,
  }
}
