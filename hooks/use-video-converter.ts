"use client"

import { useState, useCallback, useRef } from "react"
import {
  type VideoFormat,
  type VideoQuality,
  type VideoResolution,
  type VideoConvertOptions,
  VIDEO_FORMATS,
  isVideoFile,
  getMaxVideoSize,
  loadFFmpeg,
  isFFmpegLoaded,
  convertVideo,
  formatBytes,
} from "@/lib/video-converter"
import { useI18n } from "@/lib/i18n-context"

export function useVideoConverter() {
  const { t } = useI18n()

  // File state
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState("")

  // FFmpeg state
  const [ffmpegReady, setFfmpegReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadProgress, setLoadProgress] = useState(0)

  // Conversion state
  const [format, setFormat] = useState<VideoFormat>("mp4")
  const [quality, setQuality] = useState<VideoQuality>("balanced")
  const [resolution, setResolution] = useState<VideoResolution>("original")
  const [converting, setConverting] = useState(false)
  const [convertProgress, setConvertProgress] = useState(0)
  const [convertedUrl, setConvertedUrl] = useState("")
  const [convertedSize, setConvertedSize] = useState(0)
  const [error, setError] = useState("")

  const previewUrlRef = useRef("")
  const convertedUrlRef = useRef("")

  const currentFmt = VIDEO_FORMATS.find((f) => f.value === format)!

  const saving =
    file && convertedSize
      ? ((file.size - convertedSize) / file.size) * 100
      : null

  const convertedFilename = file
    ? `${file.name.replace(/\.[^.]+$/, "")}.${currentFmt.ext}`
    : ""

  const maxSize = getMaxVideoSize()

  // Load FFmpeg on demand
  const handleLoadFFmpeg = useCallback(async () => {
    if (isFFmpegLoaded()) {
      setFfmpegReady(true)
      return
    }
    setLoading(true)
    setLoadProgress(0)
    setError("")
    // Simulate progress since direct CDN loading doesn't have progress callbacks
    const progressTimer = setInterval(() => {
      setLoadProgress((p) => Math.min(p + 0.02, 0.95))
    }, 200)
    try {
      await loadFFmpeg()
      setLoadProgress(1)
      setFfmpegReady(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load FFmpeg")
    } finally {
      clearInterval(progressTimer)
      setLoading(false)
    }
  }, [])

  // Load a video file
  const loadFile = useCallback(
    async (f: File) => {
      if (!isVideoFile(f)) {
        setError(t("video.invalidFile"))
        return
      }
      if (f.size > maxSize) {
        setError(t("video.fileTooLarge").replace("{size}", formatBytes(maxSize)))
        return
      }
      // Cleanup old URLs
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
      if (convertedUrlRef.current) URL.revokeObjectURL(convertedUrlRef.current)

      setFile(f)
      setError("")
      setConvertedUrl("")
      setConvertedSize(0)
      setConvertProgress(0)

      const url = URL.createObjectURL(f)
      previewUrlRef.current = url
      setPreviewUrl(url)
    },
    [maxSize, t]
  )

  // Convert the video
  const doConvert = useCallback(async () => {
    if (!file || !ffmpegReady) return
    setConverting(true)
    setConvertProgress(0)
    setError("")
    try {
      const options: VideoConvertOptions = { quality, resolution }
      const blob = await convertVideo(file, format, options, (p) => {
        setConvertProgress(Math.round(p.ratio * 100))
      })
      if (convertedUrlRef.current) URL.revokeObjectURL(convertedUrlRef.current)
      const url = URL.createObjectURL(blob)
      convertedUrlRef.current = url
      setConvertedUrl(url)
      setConvertedSize(blob.size)
    } catch (e) {
      setError(e instanceof Error ? e.message : t("video.conversionFailed"))
    } finally {
      setConverting(false)
    }
  }, [file, format, quality, resolution, ffmpegReady, t])

  // Download
  const download = useCallback(() => {
    if (!convertedUrl || !file) return
    const a = document.createElement("a")
    a.href = convertedUrl
    a.download = convertedFilename
    a.click()
  }, [convertedUrl, file, convertedFilename])

  // Reset
  const reset = useCallback(() => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    if (convertedUrlRef.current) URL.revokeObjectURL(convertedUrlRef.current)
    setFile(null)
    setPreviewUrl("")
    setConvertedUrl("")
    setConvertedSize(0)
    setConvertProgress(0)
    setError("")
    setConverting(false)
  }, [])

  return {
    // File
    file,
    previewUrl,
    loadFile,
    reset,
    maxSize,
    // FFmpeg
    ffmpegReady,
    loading,
    loadProgress,
    handleLoadFFmpeg,
    // Conversion
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
    convertedFilename,
    currentFmt,
    error,
    doConvert,
    download,
  }
}