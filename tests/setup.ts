/// <reference types="vitest/globals" />

/**
 * Vitest setup file – provides browser-API mocks for jsdom environment.
 *
 * jsdom does NOT implement <canvas> drawing or `canvas.toBlob()`,
 * so we polyfill the parts the image-converter code relies on.
 */

/* ------------------------------------------------------------------ */
/*  URL.createObjectURL / revokeObjectURL                              */
/* ------------------------------------------------------------------ */
if (typeof URL.createObjectURL === "undefined") {
  const blobUrls = new Map<string, Blob>()
  URL.createObjectURL = (blob: Blob) => {
    const url = `blob:test/${crypto.randomUUID()}`
    blobUrls.set(url, blob)
    return url
  }
  URL.revokeObjectURL = (url: string) => blobUrls.delete(url)
}

/* ------------------------------------------------------------------ */
/*  Canvas context stub                                                */
/* ------------------------------------------------------------------ */
const _origCreateElement = document.createElement.bind(document)

/** Minimal 2-D context that fakes drawing ops and supports toBlob / toDataURL */
function createFakeCtx(width: number, height: number) {
  let _mime = "image/png"

  const ctx: Record<string, unknown> = {
    fillStyle: "",
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    scale: vi.fn(),

    // canvas reference (some libs read ctx.canvas.width / height)
    canvas: { width, height },
  }

  return {
    ctx,
    /** Called by canvas.toBlob(callback, mime, quality) */
    toBlob: (cb: (b: Blob | null) => void, mime?: string, _quality?: number) => {
      _mime = mime ?? "image/png"
      // Produce a tiny deterministic blob so tests can assert on it
      const payload = new Uint8Array([0x00, 0x01, 0x02, 0x03])
      const blob = new Blob([payload], { type: _mime })
      setTimeout(() => cb(blob), 0)
    },
    /** Called by canvas.toDataURL(mime, quality) */
    toDataURL: (mime?: string, _q?: number) => {
      return `data:${mime ?? "image/png"};base64,AAAA`
    },
  }
}

const fakeCanvasStore = new Map<HTMLCanvasElement, ReturnType<typeof createFakeCtx>>()

const origGetContext = HTMLCanvasElement.prototype.getContext

HTMLCanvasElement.prototype.getContext = function (
  this: HTMLCanvasElement,
  type: string,
  ...args: unknown[]
) {
  if (type === "2d") {
    const entry = createFakeCtx(this.width, this.height)
    fakeCanvasStore.set(this, entry)
    return entry.ctx as unknown as CanvasRenderingContext2D
  }
  return origGetContext.call(this, type, ...args) as CanvasRenderingContext2D | null
} as typeof HTMLCanvasElement.prototype.getContext

// Patch toBlob – jsdom doesn't implement it
HTMLCanvasElement.prototype.toBlob = function (
  this: HTMLCanvasElement,
  cb: (b: Blob | null) => void,
  mime?: string,
  quality?: number,
) {
  const entry = fakeCanvasStore.get(this)
  if (entry) {
    entry.toBlob(cb, mime, quality)
  } else {
    const blob = new Blob([new Uint8Array([0x00])], { type: mime ?? "image/png" })
    setTimeout(() => cb(blob), 0)
  }
} as typeof HTMLCanvasElement.prototype.toBlob

// Patch toDataURL
HTMLCanvasElement.prototype.toDataURL = function (
  this: HTMLCanvasElement,
  mime?: string,
  quality?: number,
) {
  const entry = fakeCanvasStore.get(this)
  return entry ? entry.toDataURL(mime, quality) : "data:image/png;base64,AAAA"
} as typeof HTMLCanvasElement.prototype.toDataURL

/* ------------------------------------------------------------------ */
/*  Image stub – fires onload synchronously when .src is set           */
/* ------------------------------------------------------------------ */
const origImageSrc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, "src")

Object.defineProperty(HTMLImageElement.prototype, "src", {
  set(val: string) {
    // Call original setter (sets the attribute)
    origImageSrc?.set?.call(this, val)
    // Simulate successful load with a tiny 2×2 image
    Object.defineProperty(this, "naturalWidth", { value: 2, configurable: true })
    Object.defineProperty(this, "naturalHeight", { value: 2, configurable: true })
    // Fire onload asynchronously (mimics real browser)
    setTimeout(() => this.dispatchEvent(new Event("load")), 0)
  },
  get() {
    return origImageSrc?.get?.call(this) ?? ""
  },
  configurable: true,
})