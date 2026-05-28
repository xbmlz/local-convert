/**
 * Generate TIFF and AVIF test images from downloaded PNG sources using sharp.
 * Run after download-fixtures.ts.
 *
 * Usage:
 *   $env:HTTP_PROXY="http://127.0.0.1:7897"; $env:HTTPS_PROXY="http://127.0.0.1:7897"
 *   pnpm add -D sharp
 *   pnpm tsx tests/generate-advanced.ts
 */

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const FIXTURES_DIR = path.resolve(__dirname, "fixtures")

async function main() {
  // Dynamic import so the script works even if sharp is not installed yet
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sharp: any
  try {
    sharp = (await import("sharp" as string)).default
  } catch {
    console.error("❌ sharp is not installed. Run: pnpm add -D sharp")
    process.exit(1)
  }

  console.log("\n🔧 Generating TIFF & AVIF test images with sharp...\n")

  const sourcePng = path.join(FIXTURES_DIR, "source-640.png")
  if (!fs.existsSync(sourcePng)) {
    console.error("❌ source-640.png not found. Run: pnpm tsx tests/download-fixtures.ts first")
    process.exit(1)
  }

  // ------- AVIF -------
  const avifOutput = path.join(FIXTURES_DIR, "photo.avif")
  await sharp(sourcePng)
    .resize(640, 480)
    .avif({ quality: 80 })
    .toFile(avifOutput)
  console.log(`  ✓ Generated: photo.avif (${(fs.statSync(avifOutput).size / 1024).toFixed(1)} KB)`)

  // AVIF from JPEG source
  const jpegSource = path.join(FIXTURES_DIR, "photo.jpg")
  if (fs.existsSync(jpegSource)) {
    const avifFromJpeg = path.join(FIXTURES_DIR, "photo-from-jpeg.avif")
    await sharp(jpegSource).avif({ quality: 60 }).toFile(avifFromJpeg)
    console.log(`  ✓ Generated: photo-from-jpeg.avif (${(fs.statSync(avifFromJpeg).size / 1024).toFixed(1)} KB)`)
  }

  // ------- TIFF -------
  const tiffOutput = path.join(FIXTURES_DIR, "photo.tiff")
  await sharp(sourcePng)
    .resize(640, 480)
    .tiff({ compression: "lzw" })
    .toFile(tiffOutput)
  console.log(`  ✓ Generated: photo.tiff (${(fs.statSync(tiffOutput).size / 1024).toFixed(1)} KB)`)

  // TIFF from JPEG source
  if (fs.existsSync(jpegSource)) {
    const tiffFromJpeg = path.join(FIXTURES_DIR, "photo-from-jpeg.tiff")
    await sharp(jpegSource).tiff({ compression: "none" }).toFile(tiffFromJpeg)
    console.log(`  ✓ Generated: photo-from-jpeg.tiff (${(fs.statSync(tiffFromJpeg).size / 1024).toFixed(1)} KB)`)
  }

  // ------- Additional PNG variations -------
  // Palette PNG
  const pngPalette = path.join(FIXTURES_DIR, "photo-palette.png")
  await sharp(sourcePng).resize(640, 480).png({ palette: true }).toFile(pngPalette)
  console.log(`  ✓ Generated: photo-palette.png (${(fs.statSync(pngPalette).size / 1024).toFixed(1)} KB)`)

  // ------- WebP lossless -------
  const webpLossless = path.join(FIXTURES_DIR, "webp-lossless.webp")
  await sharp(sourcePng).resize(640, 480).webp({ lossless: true }).toFile(webpLossless)
  console.log(`  ✓ Generated: webp-lossless.webp (${(fs.statSync(webpLossless).size / 1024).toFixed(1)} KB)`)

  console.log("\n✅ All advanced test images generated in tests/fixtures/\n")
}

main().catch((err) => {
  console.error("Failed:", err)
  process.exit(1)
})