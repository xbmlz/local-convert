import type { Metadata } from "next"
import { DocConverterPage } from "@/components/doc-converter-page"

export const metadata: Metadata = {
  title: "Document Converter",
  description:
    "Free online document converter. Convert between Markdown, HTML, JSON, CSV, XML, YAML, PDF, DOCX and more. 100% browser-based, no uploads.",
  openGraph: {
    title: "Document Converter | LocalConvert",
    description:
      "Convert between Markdown, HTML, JSON, CSV, XML, YAML, PDF, DOCX and more. 100% browser-based, no uploads.",
    url: "https://localconvert.app/doc",
  },
}

export default function DocumentPage() {
  return <DocConverterPage />
}