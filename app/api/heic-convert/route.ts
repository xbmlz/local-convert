import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Strategy 1: Try sharp (fast, but may lack HEVC codec)
    try {
      const sharp = (await import("sharp")).default
      const jpegBuffer = await sharp(buffer).jpeg({ quality: 92 }).toBuffer()
      return new NextResponse(new Uint8Array(jpegBuffer), {
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Length": String(jpegBuffer.length),
        },
      })
    } catch {
      // sharp failed (likely missing HEVC support), try heic-convert
    }

    // Strategy 2: Try heic-convert (pure JS WASM decoder, supports HEVC)
    try {
      const heicConvert = (await import("heic-convert")).default
      const outputBuffer = await heicConvert({
        buffer: new Uint8Array(arrayBuffer),
        format: "JPEG",
        quality: 0.92,
      })
      // heic-convert returns ArrayBuffer
      const jpegData = new Uint8Array(outputBuffer as ArrayBuffer)
      return new NextResponse(jpegData, {
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Length": String(jpegData.length),
        },
      })
    } catch (heicErr) {
      const msg = heicErr instanceof Error ? heicErr.message : String(heicErr)
      console.error("HEIC conversion failed (both sharp and heic-convert):", msg)
      return NextResponse.json(
        { error: `HEIC conversion failed: ${msg}` },
        { status: 500 }
      )
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("HEIC conversion error:", msg)
    return NextResponse.json(
      { error: `HEIC conversion failed: ${msg}` },
      { status: 500 }
    )
  }
}
