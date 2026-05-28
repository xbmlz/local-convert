import type { Metadata } from "next"
import { ConverterPage } from "@/components/converter-page"

export const metadata: Metadata = {
  title: "Image Converter",
  description:
    "Free online image converter. Convert between JPEG, PNG, WebP, AVIF, HEIC and more directly in your browser. No uploads, 100% private.",
  openGraph: {
    title: "Image Converter | LocalConvert",
    description:
      "Convert between JPEG, PNG, WebP, AVIF, HEIC and more directly in your browser. No uploads, 100% private.",
    url: "https://localconvert.cn/img",
  },
}

export default function ImagePage() {
  return <ConverterPage />
}