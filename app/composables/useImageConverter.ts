export type OutputFormat = 'jpeg' | 'png' | 'webp' | 'avif'

export interface ConversionResult {
  blob: Blob
  url: string
  size: number
}

function loadImg(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')) }
    img.src = url
  })
}

export async function convertImage(
  file: File,
  format: OutputFormat,
  quality: number
): Promise<ConversionResult> {
  const img = await loadImg(file)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!

  // JPEG has no alpha channel — fill white background first
  if (format === 'jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  ctx.drawImage(img, 0, 0)

  const mime = format === 'jpeg' ? 'image/jpeg' : `image/${format}`
  // PNG is lossless, quality argument is ignored
  const q = format === 'png' ? undefined : quality / 100

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(b => b ? resolve(b) : reject(new Error(`${format.toUpperCase()} not supported in this browser`)), mime, q)
  )

  return { blob, url: URL.createObjectURL(blob), size: blob.size }
}

export async function isFormatSupported(format: OutputFormat): Promise<boolean> {
  if (format === 'jpeg' || format === 'png') return true
  return new Promise((resolve) => {
    const c = document.createElement('canvas')
    c.width = 1
    c.height = 1
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, 1, 1)
    c.toBlob(b => resolve(!!b && b.size > 0), `image/${format}`)
  })
}
