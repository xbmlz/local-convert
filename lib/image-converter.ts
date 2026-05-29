export type OutputFormat = "jpeg" | "png" | "webp" | "avif" | "heic" | "ico"

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
  { value: "ico", label: "ICO", ext: "ico", lossy: false },
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

export interface RotateFlipOptions {
  rotation: 0 | 90 | 180 | 270
  flipH: boolean
  flipV: boolean
}

export interface ImageTransformOptions {
  resize?: ResizeOptions
  crop?: CropArea
  rotateFlip?: RotateFlipOptions
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

  // Handle rotation: 90° and 270° swap dimensions
  const rot = transform?.rotateFlip?.rotation ?? 0
  const flipH = transform?.rotateFlip?.flipH ?? false
  const flipV = transform?.rotateFlip?.flipV ?? false
  const isRotated = rot === 90 || rot === 270

  const finalW = isRotated ? dh : dw
  const finalH = isRotated ? dw : dh

  const canvas = document.createElement("canvas")
  canvas.width = finalW
  canvas.height = finalH
  const ctx = canvas.getContext("2d")!

  if (format === "jpeg") {
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, finalW, finalH)
  }

  // Apply transformations
  ctx.save()
  ctx.translate(finalW / 2, finalH / 2)
  if (rot) ctx.rotate((rot * Math.PI) / 180)
  if (flipH) ctx.scale(-1, 1)
  if (flipV) ctx.scale(1, -1)
  // Draw centered (after rotation, the "virtual" canvas is dw × dh)
  ctx.drawImage(img, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh)
  ctx.restore()

  // ICO format: manually encode from PNG data at multiple sizes
  if (format === "ico") {
    return canvasToIco(canvas)
  }

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

/**
 * Convert a canvas to an ICO file blob.
 * ICO format: ICONDIR header + PNG image data (multi-size: 16, 32, 48, 64, 128, 256).
 */
function canvasToIco(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Generate PNG data at the source size (clamped to max 256x256 for ICO)
    const sizes = [16, 32, 48, 64, 128, 256]
    const srcW = Math.min(canvas.width, 256)
    const srcH = Math.min(canvas.height, 256)

    // Render each size to PNG
    const pngPromises = sizes.map((size) => {
      return new Promise<{ data: Uint8Array; size: number }>((res, rej) => {
        const c = document.createElement("canvas")
        c.width = size
        c.height = size
        const ctx = c.getContext("2d")!
        // Draw source onto target size with smoothing
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = "high"
        ctx.drawImage(canvas, 0, 0, srcW, srcH, 0, 0, size, size)
        c.toBlob((blob) => {
          if (!blob) return rej(new Error("Failed to generate PNG for ICO"))
          blob.arrayBuffer().then((buf) => {
            res({ data: new Uint8Array(buf), size })
          }).catch(rej)
        }, "image/png")
      })
    })

    Promise.all(pngPromises)
      .then((pngs) => {
        // ICO header: 6 bytes
        //   2 bytes: reserved (0)
        //   2 bytes: type (1 = ICO)
        //   2 bytes: image count
        // Per image: 16 bytes
        //   1 byte: width (0 = 256)
        //   1 byte: height (0 = 256)
        //   1 byte: color palette (0)
        //   1 byte: reserved (0)
        //   2 bytes: color planes (1)
        //   2 bytes: bits per pixel (32)
        //   4 bytes: image data size
        //   4 bytes: image data offset
        const headerSize = 6 + pngs.length * 16
        const totalSize = headerSize + pngs.reduce((s, p) => s + p.data.length, 0)
        const buffer = new ArrayBuffer(totalSize)
        const view = new DataView(buffer)
        const bytes = new Uint8Array(buffer)

        // ICONDIR header
        view.setUint16(0, 0, true)           // reserved
        view.setUint16(2, 1, true)           // type = ICO
        view.setUint16(4, pngs.length, true) // image count

        let offset = headerSize
        pngs.forEach((png, i) => {
          const entryOffset = 6 + i * 16
          view.setUint8(entryOffset, png.size < 256 ? png.size : 0)     // width
          view.setUint8(entryOffset + 1, png.size < 256 ? png.size : 0) // height
          view.setUint8(entryOffset + 2, 0)   // color palette
          view.setUint8(entryOffset + 3, 0)   // reserved
          view.setUint16(entryOffset + 4, 1, true)  // color planes
          view.setUint16(entryOffset + 6, 32, true) // bits per pixel
          view.setUint32(entryOffset + 8, png.data.length, true) // data size
          view.setUint32(entryOffset + 12, offset, true)          // data offset
          bytes.set(png.data, offset)
          offset += png.data.length
        })

        resolve(new Blob([buffer], { type: "image/x-icon" }))
      })
      .catch(reject)
  })
}

export async function isFormatSupported(format: OutputFormat): Promise<boolean> {
  if (format === "jpeg" || format === "png" || format === "ico") return true
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