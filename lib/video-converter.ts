/**
 * Browser-native video converter using FFmpeg.wasm.
 * FFmpeg core is lazy-loaded only when the user enters the video page.
 */

import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile, toBlobURL } from "@ffmpeg/util"

export type VideoFormat = "mp4" | "webm" | "mov" | "avi" | "gif" | "mp3" | "wav"

export interface VideoFormatConfig {
  value: VideoFormat
  label: string
  ext: string
  group: "video" | "audio" | "image"
}

export const VIDEO_FORMATS: VideoFormatConfig[] = [
  { value: "mp4", label: "MP4", ext: "mp4", group: "video" },
  { value: "webm", label: "WebM", ext: "webm", group: "video" },
  { value: "mov", label: "MOV", ext: "mov", group: "video" },
  { value: "avi", label: "AVI", ext: "avi", group: "video" },
  { value: "gif", label: "GIF", ext: "gif", group: "image" },
  { value: "mp3", label: "MP3", ext: "mp3", group: "audio" },
  { value: "wav", label: "WAV", ext: "wav", group: "audio" },
]

/** Video extensions we accept */
const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|avi|mkv|flv|wmv|m4v|3gp|ogv|mts|ts)$/i

export function isVideoFile(file: File): boolean {
  if (file.type.startsWith("video/")) return true
  return VIDEO_EXTENSIONS.test(file.name)
}

/** Estimate max upload size based on device memory */
export function getMaxVideoSize(): number {
  // navigator.deviceMemory is in GB (only available in Chromium)
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory
  if (!mem) return 500 * 1024 * 1024 // 500MB fallback for unknown devices
  if (mem <= 2) return 100 * 1024 * 1024   // 100MB for 2GB devices
  if (mem <= 4) return 300 * 1024 * 1024   // 300MB for 4GB devices
  if (mem <= 8) return 800 * 1024 * 1024   // 800MB for 8GB devices
  return 2 * 1024 * 1024 * 1024            // 2GB for 16GB+ devices
}

export function formatMaxSize(): string {
  const bytes = getMaxVideoSize()
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(0)} GB`
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`
}

/** Get thread count based on device capabilities */
export function getDeviceThreads(): number {
  const cores = (typeof navigator !== "undefined" && navigator.hardwareConcurrency) || 4
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory || 4
  if (mem <= 2) return 1
  if (mem <= 4) return Math.min(2, cores)
  return Math.min(4, cores)
}

export type VideoQuality = "fast" | "balanced" | "high"
export type VideoResolution = "original" | "1080p" | "720p" | "480p" | "360p"

export interface VideoConvertOptions {
  quality: VideoQuality
  resolution: VideoResolution
}

export const VIDEO_QUALITY_OPTIONS: { value: VideoQuality; labelKey: string }[] = [
  { value: "fast", labelKey: "video.qualityFast" },
  { value: "balanced", labelKey: "video.qualityBalanced" },
  { value: "high", labelKey: "video.qualityHigh" },
]

export const VIDEO_RESOLUTION_OPTIONS: { value: VideoResolution; labelKey: string }[] = [
  { value: "original", labelKey: "video.resolutionOriginal" },
  { value: "1080p", labelKey: "video.resolution1080p" },
  { value: "720p", labelKey: "video.resolution720p" },
  { value: "480p", labelKey: "video.resolution480p" },
  { value: "360p", labelKey: "video.resolution360p" },
]

/* ------------------------------------------------------------------ */
/*  FFmpeg singleton with lazy loading                                 */
/* ------------------------------------------------------------------ */

let ffmpegInstance: FFmpeg | null = null
let loadPromise: Promise<void> | null = null
let _isLoaded = false
let _loadProgress = 0

export function isFFmpegLoaded(): boolean {
  return _isLoaded
}

export function getLoadProgress(): number {
  return _loadProgress
}

// Multiple CDN sources for reliability (including Chinese-accessible ones)
const FFMPEG_CDN_URLS = [
  // jsdelivr (fast in China, global)
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd",
  // unpkg (global, works in China)
  "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd",
]

export async function loadFFmpeg(): Promise<void> {
  if (_isLoaded) return
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    const ffmpeg = new FFmpeg()
    ffmpeg.on("log", ({ message }) => {
      console.log("[FFmpeg]", message)
    })

    // Try each CDN with toBlobURL for CORS compatibility
    let lastError: unknown = null
    for (const baseURL of FFMPEG_CDN_URLS) {
      try {
        const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript")
        const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm")
        await ffmpeg.load({ coreURL, wasmURL })
        ffmpegInstance = ffmpeg
        _isLoaded = true
        console.log("[FFmpeg] Loaded successfully from", baseURL)
        return
      } catch (e) {
        lastError = e
        console.warn(`[FFmpeg] Failed from ${baseURL}:`, e)
      }
    }

    loadPromise = null
    throw lastError instanceof Error
      ? lastError
      : new Error("Failed to load FFmpeg from all CDN sources")
  })()

  return loadPromise
}

export interface ConvertProgress {
  ratio: number // 0-1
}

export async function convertVideo(
  file: File,
  outputFormat: VideoFormat,
  options?: VideoConvertOptions,
  onProgress?: (progress: ConvertProgress) => void
): Promise<Blob> {
  if (!ffmpegInstance) {
    throw new Error("FFmpeg not loaded. Call loadFFmpeg() first.")
  }

  const ffmpeg = ffmpegInstance
  const inputName = `input_${Date.now()}.${file.name.split(".").pop() || "mp4"}`
  const outputName = `output.${VIDEO_FORMATS.find((f) => f.value === outputFormat)?.ext ?? outputFormat}`

  // Bind progress listener right before conversion
  const progressHandler = ({ progress }: { progress: number }) => {
    const pct = Math.max(0, Math.min(1, progress))
    console.log("[FFmpeg] Progress:", (pct * 100).toFixed(1) + "%")
    onProgress?.({ ratio: pct })
  }
  ffmpeg.on("progress", progressHandler)

  // Also listen to log for debugging
  const logHandler = ({ type, message }: { type: string; message: string }) => {
    if (type === "fferr") {
      // stderr output from ffmpeg often contains progress info
      console.log("[FFmpeg:err]", message)
    }
  }
  ffmpeg.on("log", logHandler)

  try {
    // Write input file
    console.log("[FFmpeg] Writing input file:", inputName, "size:", file.size)
    await ffmpeg.writeFile(inputName, await fetchFile(file))
    console.log("[FFmpeg] Input file written")

    // Build FFmpeg arguments
    const args = buildFFmpegArgs(inputName, outputName, outputFormat, options)
    console.log("[FFmpeg] Running:", args.join(" "))

    // Run conversion with timeout (5 minutes)
    const execPromise = ffmpeg.exec(args)
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Conversion timed out (5 min limit)")), 5 * 60 * 1000)
    )
    await Promise.race([execPromise, timeoutPromise])
    console.log("[FFmpeg] Conversion completed")

    // Read output
    const data = (await ffmpeg.readFile(outputName)) as Uint8Array
    const buffer = new ArrayBuffer(data.byteLength)
    new Uint8Array(buffer).set(data)
    const outputBlob = new Blob([buffer], {
      type: getMimeType(outputFormat),
    })

    return outputBlob
  } finally {
    // Cleanup
    ffmpeg.off("progress", progressHandler)
    ffmpeg.off("log", logHandler)
    await ffmpeg.deleteFile(inputName).catch(() => {})
    await ffmpeg.deleteFile(outputName).catch(() => {})
  }
}

function buildFFmpegArgs(
  input: string,
  output: string,
  format: VideoFormat,
  options?: VideoConvertOptions
): string[] {
  const quality = options?.quality ?? "balanced"
  const resolution = options?.resolution ?? "original"
  const threads = getDeviceThreads()

  // Quality presets for H.264
  const qualityMap: Record<string, { preset: string; crf: string }> = {
    fast:     { preset: "ultrafast", crf: "32" },
    balanced: { preset: "fast",      crf: "26" },
    high:     { preset: "medium",    crf: "22" },
  }
  const q = qualityMap[quality] ?? qualityMap.balanced

  // Resolution scaling filter
  const scaleMap: Record<string, string | null> = {
    original: null,
    "1080p":  "scale=-2:1080",
    "720p":   "scale=-2:720",
    "480p":   "scale=-2:480",
    "360p":   "scale=-2:360",
  }
  const scaleFilter = scaleMap[resolution] ?? null

  // Build common video args
  const videoFilters: string[] = []
  if (scaleFilter) videoFilters.push(scaleFilter)
  const vfArgs = videoFilters.length > 0 ? ["-vf", videoFilters.join(",")] : []

  switch (format) {
    case "mp4":
      return [
        "-y", "-i", input,
        "-threads", String(threads),
        "-c:v", "libx264",
        "-preset", q.preset,
        "-crf", q.crf,
        "-pix_fmt", "yuv420p",
        ...vfArgs,
        "-c:a", "aac", "-b:a", quality === "fast" ? "96k" : "128k",
        "-movflags", "+faststart",
        output,
      ]
    case "webm":
      return [
        "-y", "-i", input,
        "-threads", String(threads),
        "-c:v", "libvpx-vp9",
        "-speed", quality === "fast" ? "8" : "4",
        "-crf", quality === "fast" ? "38" : "32",
        "-b:v", "0",
        ...vfArgs,
        "-c:a", "libvorbis",
        output,
      ]
    case "mov":
      return [
        "-y", "-i", input,
        "-threads", String(threads),
        "-c:v", "libx264",
        "-preset", q.preset,
        "-crf", q.crf,
        "-pix_fmt", "yuv420p",
        ...vfArgs,
        "-c:a", "aac", "-b:a", "128k",
        "-tag:v", "avc1",
        "-movflags", "+faststart",
        output,
      ]
    case "avi":
      return [
        "-y", "-i", input,
        "-threads", String(threads),
        "-c:v", "mpeg4",
        "-q:v", quality === "high" ? "4" : quality === "balanced" ? "6" : "8",
        ...vfArgs,
        "-c:a", "mp3",
        output,
      ]
    case "gif":
      return ["-y", "-i", input, "-vf", `fps=${quality === "high" ? "15" : "10"},scale=${quality === "high" ? "480" : "320"}:-1:flags=lanczos`, "-loop", "0", output]
    case "mp3":
      return ["-y", "-i", input, "-vn", "-ab", quality === "high" ? "320k" : quality === "balanced" ? "192k" : "128k", "-ar", "44100", "-f", "mp3", output]
    case "wav":
      return ["-y", "-i", input, "-vn", "-f", "wav", output]
    default:
      return ["-y", "-i", input, output]
  }
}

function getMimeType(format: VideoFormat): string {
  const map: Record<VideoFormat, string> = {
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    avi: "video/x-msvideo",
    gif: "image/gif",
    mp3: "audio/mpeg",
    wav: "audio/wav",
  }
  return map[format] ?? "application/octet-stream"
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} MB`
  return `${(bytes / 1_073_741_824).toFixed(2)} GB`
}