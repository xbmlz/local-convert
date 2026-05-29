export type OutputFormat = "jpeg" | "png" | "webp" | "avif" | "heic"

export interface FormatConfig {
  value: OutputFormat
  label: string
  ext: string
  lossy: boolean
}

export const FORMAT_CONFIG: FormatConfig[] = [
  { value: "jpeg", label: "JPEG", ext: "jpg", lossy: true },
  { value: "png", label: "PNG", ext: "png", lossy: false },
  { value: "webp", label: "WebP", ext: "webp", lossy: true },
  { value: "avif", label: "AVIF", ext: "avif", lossy: true },
  { value: "heic", label: "HEIC", ext: "heic", lossy: true },
]

function isHeicFile(file: File): boolean {
  const ext = file.name.toLowerCase().split(".").pop() || ""
  return (
    ext === "heic" ||
    ext === "heif" ||
    file.type === "image/heic" ||
    file.type === "image/heif"
  )
}

function isAvifFile(file: File): boolean {
  const ext = file.name.toLowerCase().split(".").pop() || ""
  return ext === "avif" || file.type === "image/avif"
}

/** Formats that need server-side decoding for loadImg */
function needsServerDecode(file: File): boolean {
  return isHeicFile(file) || isAvifFile(file)
}

async function convertToJpegViaApi(file: File): Promise<File> {
  const formData = new FormData()
  formData.append("file", file)
  const res = await fetch("/api/heic-convert", {
    method: "POST",
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || "Server conversion failed")
  }
  const jpegBlob = await res.blob()
  return new File([jpegBlob], file.name.replace(/\.[^.]+$/, ".jpg"), {
    type: "image/jpeg",
  })
}

async function convertHeicToJpeg(file: File): Promise<File> {
  // Strategy 1: Try server-side (sharp or heic-convert) — fastest & most reliable
  try {
    return await convertToJpegViaApi(file)
  } catch {
    // Strategy 2: Try client-side heic2any (WASM-based)
    try {
      const heic2any = (await import("heic2any")).default
      const blob = await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.92,
      })
      const result = Array.isArray(blob) ? blob[0] : blob
      return new File([result], file.name.replace(/\.[^.]+$/, ".jpg"), {
        type: "image/jpeg",
      })
    } catch (clientErr) {
      const msg = clientErr instanceof Error ? clientErr.message : String(clientErr)
      throw new Error(`HEIC decode failed: ${msg}`)
    }
  }
}

/** Check if a file type is directly previewable in <img> */
export function isPreviewableType(file: File): boolean {
  const previewable = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/svg+xml"]
  if (previewable.includes(file.type)) return true
  const ext = file.name.toLowerCase().split(".").pop() || ""
  return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext)
}

/** Convert a file to a previewable blob URL (JPEG for HEIC, SVG as-is) */
export async function createPreviewUrl(file: File): Promise<string> {
  if (isHeicFile(file)) {
    const jpeg = await convertHeicToJpeg(file)
    return URL.createObjectURL(jpeg)
  }
  // SVG and other formats are directly previewable
  return URL.createObjectURL(file)
}

function loadImg(file: File): Promise<HTMLImageElement> {
  return new Promise(async (resolve, reject) => {
    try {
      let f = file
      // For HEIC/HEIF and AVIF, always try server-side decode first
      // since browser support is unreliable
      if (needsServerDecode(file)) {
        try {
          f = await convertToJpegViaApi(file)
        } catch {
          // Server decode failed, try client-side heic2any for HEIC
          if (isHeicFile(file)) {
            try {
              const heic2any = (await import("heic2any")).default
              const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 })
              const result = Array.isArray(blob) ? blob[0] : blob
              f = new File([result], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" })
            } catch (e) {
              const detail = e instanceof Error ? e.message : String(e)
              reject(new Error(`HEIC decode failed: ${detail}. Try converting to JPEG first.`))
              return
            }
          } else {
            // AVIF and server failed — try browser native as last resort
          }
        }
      }

      // Try loading the image (either original or decoded)
      const tryLoad = (fileToLoad: File) => new Promise<HTMLImageElement>((res, rej) => {
        const img = new Image()
        const url = URL.createObjectURL(fileToLoad)
        img.onload = () => { URL.revokeObjectURL(url); res(img) }
        img.onerror = () => { URL.revokeObjectURL(url); rej(new Error("Failed to load image")) }
        img.src = url
      })

      try {
        const img = await tryLoad(f)
        resolve(img)
      } catch {
        // If browser can't load it and we haven't tried server decode yet
        if (!needsServerDecode(f) && !needsServerDecode(file)) {
          reject(new Error("Failed to load image"))
          return
        }
        // Last attempt: try server decode if we haven't already
        try {
          const serverFile = await convertToJpegViaApi(file)
          const img = await tryLoad(serverFile)
          resolve(img)
        } catch (e2) {
          const detail = e2 instanceof Error ? e2.message : String(e2)
          reject(new Error(`Failed to decode image: ${detail}`))
        }
      }
    } catch (e) {
      reject(e instanceof Error ? e : new Error("Unknown error"))
    }
  })
}

export interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

export interface ResizeOptions {
  width?: number
  height?: number
  mode: "percent" | "pixels"
  keepAspect: boolean
}

export interface ImageTransformOptions {
  resize?: ResizeOptions
  crop?: CropArea
}

export async function convertImage(
  file: File,
  format: OutputFormat,
  quality: number,
  transform?: ImageTransformOptions
): Promise<Blob> {
  const img = await loadImg(file)

  // Determine source region (crop)
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight
  if (transform?.crop) {
    const c = transform.crop
    sx = Math.round(c.x)
    sy = Math.round(c.y)
    sw = Math.round(c.width)
    sh = Math.round(c.height)
  }

  // Determine output dimensions (resize)
  let dw = sw, dh = sh
  if (transform?.resize) {
    const r = transform.resize
    if (r.mode === "percent") {
      const scale = (r.width ?? 100) / 100
      dw = Math.round(sw * scale)
      dh = r.keepAspect ? Math.round(sh * scale) : Math.round(sh * ((r.height ?? 100) / 100))
    } else {
      if (r.width && r.height && !r.keepAspect) {
        dw = r.width
        dh = r.height
      } else if (r.width) {
        dw = r.width
        dh = r.keepAspect ? Math.round(sh * (r.width / sw)) : (r.height ?? sh)
      } else if (r.height) {
        dh = r.height
        dw = r.keepAspect ? Math.round(sw * (r.height / sh)) : (r.width ?? sw)
      }
    }
  }

  // Ensure minimum dimensions
  dw = Math.max(1, dw)
  dh = Math.max(1, dh)

  const canvas = document.createElement("canvas")
  canvas.width = dw
  canvas.height = dh
  const ctx = canvas.getContext("2d")!

  if (format === "jpeg") {
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, dw, dh)
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, dw, dh)

  const mime = format === "jpeg" ? "image/jpeg" : `image/${format}`
  const q = format === "png" ? undefined : quality / 100

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) =>
        b
          ? resolve(b)
          : reject(new Error(`${format.toUpperCase()} not supported in this browser`)),
      mime,
      q
    )
  )
}

/** Get the natural dimensions of an image file (after decode) */
export async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  const img = await loadImg(file)
  return { width: img.naturalWidth, height: img.naturalHeight }
}

export async function isFormatSupported(format: OutputFormat): Promise<boolean> {
  if (format === "jpeg" || format === "png") return true
  return new Promise((resolve) => {
    const c = document.createElement("canvas")
    c.width = 1
    c.height = 1
    const ctx = c.getContext("2d")!
    ctx.fillStyle = "#fff"
    ctx.fillRect(0, 0, 1, 1)
    c.toBlob((b) => resolve(!!b && b.size > 0), `image/${format}`)
  })
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1_048_576).toFixed(2)} MB`
}