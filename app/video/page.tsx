import type { Metadata } from "next"
import { VideoConverterPage } from "@/components/video-converter-page"

export const metadata: Metadata = {
  title: "Video Converter",
  description:
    "Free browser-based video converter. Convert MP4, WebM, MOV, AVI, GIF, MP3 and more. 100% private — no uploads.",
  keywords: [
    "video converter",
    "MP4 to WebM",
    "video to GIF",
    "video to MP3",
    "free video converter",
    "online video converter",
  ],
}

export default function VideoPage() {
  return <VideoConverterPage />
}