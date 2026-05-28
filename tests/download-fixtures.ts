/**
 * Download test images in various formats for integration testing.
 * Run with:  pnpm tsx tests/download-fixtures.ts
 *
 * If you need a proxy, run this first (PowerShell):
 *   $env:HTTP_PROXY="http://127.0.0.1:7897"; $env:HTTPS_PROXY="http://127.0.0.1:7897"
 *
 * Sources:
 *  - http://www.libpng.org/pub/png/pngsuite.html  (PNG test suite)
 *  - https://picsum.photos (Lorem Picsum – random photos)
 *  - https://upload.wikimedia.org (Wikipedia commons)
 *  - https://www.w3.org (W3C test suites)
 */

import fs from "node:fs"
import path from "node:path"
import { pipeline } from "node:stream/promises"
import { Readable } from "node:stream"
import { fileURLToPath } from "node:url"
import { ProxyAgent, setGlobalDispatcher } from "undici"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const FIXTURES_DIR = path.resolve(__dirname, "fixtures")

// Configure proxy if set in env
const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY
if (proxy) {
  console.log(`🌐 Using proxy: ${proxy}`)
  setGlobalDispatcher(new ProxyAgent(proxy))
}

async function download(url: string, dest: string, timeoutMs = 15000): Promise<boolean> {
  console.log(`  Downloading: ${url}`)
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok || !res.body) {
      console.warn(`  ⚠ Skipped (${res.status}): ${url}`)
      return false
    }
    const fileStream = fs.createWriteStream(dest)
    await pipeline(Readable.fromWeb(res.body as any), fileStream)
    const stat = fs.statSync(dest)
    console.log(`  ✓ Saved: ${path.basename(dest)} (${(stat.size / 1024).toFixed(1)} KB)`)
    return true
  } catch (err: any) {
    console.warn(`  ⚠ Failed: ${url} (${err.message ?? err})`)
    return false
  }
}

async function main() {
  fs.mkdirSync(FIXTURES_DIR, { recursive: true })

  let downloaded = 0
  let failed = 0

  function ok(r: boolean) { if (r) downloaded++; else failed++ }

  console.log("\n🖼  Downloading test images...\n")

  // ------- JPEG (picsum.photos) -------
  ok(await download(
    "https://picsum.photos/seed/test1/800/600",
    path.join(FIXTURES_DIR, "photo.jpg"),
  ))
  ok(await download(
    "https://picsum.photos/seed/small/100/100",
    path.join(FIXTURES_DIR, "photo-small.jpg"),
  ))
  ok(await download(
    "https://picsum.photos/seed/large/1920/1080",
    path.join(FIXTURES_DIR, "photo-large.jpg"),
  ))

  // ------- PNG (libpng.org – HTTP, no TLS issues) -------
  ok(await download(
    "http://www.libpng.org/pub/png/PngSuite/basn0g01.png",
    path.join(FIXTURES_DIR, "png-basn0g01.png"),
  ))
  ok(await download(
    "http://www.libpng.org/pub/png/PngSuite/basn2c08.png",
    path.join(FIXTURES_DIR, "png-basn2c08.png"),
  ))
  ok(await download(
    "http://www.libpng.org/pub/png/PngSuite/basn6a08.png",
    path.join(FIXTURES_DIR, "png-basn6a08.png"),
  ))

  // ------- WebP (Google) -------
  ok(await download(
    "https://www.gstatic.com/webp/gallery/1.webp",
    path.join(FIXTURES_DIR, "webp-lossy.webp"),
  ))
  ok(await download(
    "https://www.gstatic.com/webp/gallery/4.webp",
    path.join(FIXTURES_DIR, "webp-photo.webp"),
  ))

  // ------- Wikimedia commons (various) -------
  ok(await download(
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Camponotus_flavomarginatus_ant.jpg/320px-Camponotus_flavomarginatus_ant.jpg",
    path.join(FIXTURES_DIR, "source-640.png"),
  ))
  ok(await download(
    "https://upload.wikimedia.org/wikipedia/commons/2/2c/Rotating_earth_%28large%29.gif",
    path.join(FIXTURES_DIR, "animated.gif"),
  ))
  ok(await download(
    "https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png",
    path.join(FIXTURES_DIR, "wiki-png-alpha.png"),
  ))

  // ------- GIF from giphy static -------
  ok(await download(
    "https://upload.wikimedia.org/wikipedia/commons/5/5f/Trex_Rex.gif",
    path.join(FIXTURES_DIR, "static.gif"),
  ))

  // ------- Locally generated formats -------
  console.log("\n🔧 Generating binary formats locally...\n")

  // SVG (locally generated)
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#ff0000"/>
  <circle cx="50" cy="50" r="40" fill="#00ff00" opacity="0.7"/>
  <text x="50" y="55" text-anchor="middle" fill="white" font-size="14">SVG</text>
</svg>`
  fs.writeFileSync(path.join(FIXTURES_DIR, "test.svg"), svgContent)
  console.log(`  ✓ Generated: test.svg (${svgContent.length} bytes)`)

  const svgSimple = `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><rect width="50" height="50" fill="blue"/></svg>`
  fs.writeFileSync(path.join(FIXTURES_DIR, "simple.svg"), svgSimple)
  console.log(`  ✓ Generated: simple.svg (${svgSimple.length} bytes)`)

  // BMP
  const bmp = createSimpleBmp(8, 8)
  fs.writeFileSync(path.join(FIXTURES_DIR, "tiny.bmp"), bmp)
  console.log(`  ✓ Generated: tiny.bmp (${bmp.length} bytes)`)

  // ICO
  const ico = createSimpleIco(16, 16)
  fs.writeFileSync(path.join(FIXTURES_DIR, "favicon.ico"), ico)
  console.log(`  ✓ Generated: favicon.ico (${ico.length} bytes)`)

  // Try to generate TIFF/AVIF/WebP with sharp if available
  try {
    const sharp = (await import("sharp")).default
    const srcPng = path.join(FIXTURES_DIR, "source-640.png")
    const srcJpg = path.join(FIXTURES_DIR, "photo.jpg")
    const hasSrcPng = fs.existsSync(srcPng)
    const hasSrcJpg = fs.existsSync(srcJpg)

    if (hasSrcPng) {
      await sharp(srcPng).resize(640, 480).tiff({ compression: "lzw" })
        .toFile(path.join(FIXTURES_DIR, "photo.tiff"))
      console.log("  ✓ Generated: photo.tiff")

      await sharp(srcPng).resize(640, 480).avif({ quality: 80 })
        .toFile(path.join(FIXTURES_DIR, "photo.avif"))
      console.log("  ✓ Generated: photo.avif")

      await sharp(srcPng).resize(640, 480).webp({ lossless: true })
        .toFile(path.join(FIXTURES_DIR, "webp-lossless.webp"))
      console.log("  ✓ Generated: webp-lossless.webp")

      await sharp(srcPng).resize(640, 480).png({ palette: true })
        .toFile(path.join(FIXTURES_DIR, "photo-palette.png"))
      console.log("  ✓ Generated: photo-palette.png")
    }

    if (hasSrcJpg) {
      await sharp(srcJpg).avif({ quality: 60 })
        .toFile(path.join(FIXTURES_DIR, "photo-from-jpeg.avif"))
      console.log("  ✓ Generated: photo-from-jpeg.avif")

      await sharp(srcJpg).tiff({ compression: "none" })
        .toFile(path.join(FIXTURES_DIR, "photo-from-jpeg.tiff"))
      console.log("  ✓ Generated: photo-from-jpeg.tiff")
    }
  } catch {
    console.log("  ℹ sharp not available – skipping TIFF/AVIF/WebP lossless generation")
    console.log("    Install with: pnpm add -D sharp && pnpm tsx tests/generate-advanced.ts")
  }

  // ------- HEIC (user-provided) -------
  const heicPath = path.join(FIXTURES_DIR, "photo-for-heic.heic")
  if (fs.existsSync(heicPath)) {
    const heicStat = fs.statSync(heicPath)
    console.log(`  ✓ Found: photo-for-heic.heic (${(heicStat.size / 1024).toFixed(1)} KB, user-provided)`)
  }

  console.log(`\n📊 Results: ${downloaded} downloaded, ${failed} skipped`)
  console.log("✅ Test fixtures ready in tests/fixtures/\n")
}

/** Create a minimal 24-bit BMP file (no compression) */
function createSimpleBmp(width: number, height: number): Buffer {
  const rowSize = width * 3
  const padding = (4 - (rowSize % 4)) % 4
  const imageSize = (rowSize + padding) * height
  const headerSize = 14 + 40
  const fileSize = headerSize + imageSize

  const buf = Buffer.alloc(fileSize)

  // BMP file header
  buf.write("BM", 0)
  buf.writeUInt32LE(fileSize, 2)
  buf.writeUInt32LE(headerSize, 10)

  // DIB header (BITMAPINFOHEADER)
  buf.writeUInt32LE(40, 14)         // header size
  buf.writeInt32LE(width, 18)
  buf.writeInt32LE(height, 22)
  buf.writeUInt16LE(1, 26)          // planes
  buf.writeUInt16LE(24, 28)         // bits per pixel
  buf.writeUInt32LE(imageSize, 34)

  // Pixel data (BGR)
  let offset = headerSize
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      buf[offset++] = (x + y) * 40   // B
      buf[offset++] = 128             // G
      buf[offset++] = 255 - (x + y) * 40  // R
    }
    offset += padding
  }

  return buf
}

/** Create a minimal ICO file (16x16, 32bpp) */
function createSimpleIco(width: number, height: number): Buffer {
  // ICO header: 6 bytes
  // ICO directory entry: 16 bytes
  // BMP info header: 40 bytes
  // Pixel data: width * height * 4 (BGRA)
  const headerSize = 6
  const dirSize = 16
  const bmpHeaderSize = 40
  const pixelDataSize = width * height * 4
  const totalSize = headerSize + dirSize + bmpHeaderSize + pixelDataSize

  const buf = Buffer.alloc(totalSize)

  // ICO header
  buf.writeUInt16LE(0, 0)       // reserved
  buf.writeUInt16LE(1, 2)       // type: ICO
  buf.writeUInt16LE(1, 4)       // image count: 1

  // ICO directory entry
  let offset = headerSize
  buf[offset++] = width & 0xff   // width (0 means 256)
  buf[offset++] = height & 0xff  // height (0 means 256)
  buf[offset++] = 0              // color count
  buf[offset++] = 0              // reserved
  buf.writeUInt16LE(1, offset)   // color planes
  offset += 2
  buf.writeUInt16LE(32, offset)  // bits per pixel
  offset += 2
  buf.writeUInt32LE(bmpHeaderSize + pixelDataSize, offset) // data size
  offset += 4
  buf.writeUInt32LE(headerSize + dirSize, offset) // data offset

  // BMP info header (BITMAPINFOHEADER)
  offset = headerSize + dirSize
  buf.writeUInt32LE(bmpHeaderSize, offset)      // header size
  offset += 4
  buf.writeInt32LE(width, offset)               // width
  offset += 4
  buf.writeInt32LE(height * 2, offset)          // height (doubled for ICO)
  offset += 4
  buf.writeUInt16LE(1, offset)                  // planes
  offset += 2
  buf.writeUInt16LE(32, offset)                 // bpp
  offset += 2

  // Pixel data (BGRA, bottom-up)
  offset = headerSize + dirSize + bmpHeaderSize
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      buf[offset++] = 0x00              // B
      buf[offset++] = 0x80 + y * 4     // G
      buf[offset++] = 0xff - x * 8     // R
      buf[offset++] = 0xff             // A (fully opaque)
    }
  }

  return buf
}

main().catch((err) => {
  console.error("Failed:", err)
  process.exit(1)
})
