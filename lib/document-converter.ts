/**
 * Browser-native document converter.
 * All conversions happen client-side — no server needed.
 *
 * Conversion matrix:
 *   Text group:  Markdown ↔ HTML ↔ Plain Text
 *   Data group:  JSON ↔ CSV ↔ TSV ↔ XML ↔ YAML
 *   Any format → PDF
 *   Any format → DOCX
 */

export type DocFormat =
  | "markdown" | "html" | "plaintext"
  | "json" | "csv" | "tsv" | "xml" | "yaml"
  | "pdf" | "docx"

export interface DocFormatConfig {
  value: DocFormat
  labelKey: string
  ext: string
  mime: string
  group: "text" | "data" | "binary"
  canInput: boolean   // can be used as input (uploaded)
  canPreview: boolean // can show content preview
  isOutput: boolean   // can be used as output (downloaded)
}

export const DOC_FORMATS: DocFormatConfig[] = [
  // Text group
  { value: "markdown", labelKey: "document.markdown", ext: "md", mime: "text/markdown", group: "text", canInput: true, canPreview: true, isOutput: true },
  { value: "html",     labelKey: "document.html",     ext: "html", mime: "text/html", group: "text", canInput: true, canPreview: true, isOutput: true },
  { value: "plaintext",labelKey: "document.plaintext", ext: "txt",  mime: "text/plain", group: "text", canInput: true, canPreview: true, isOutput: true },
  // Data group
  { value: "json",     labelKey: "document.json",     ext: "json", mime: "application/json", group: "data", canInput: true, canPreview: true, isOutput: true },
  { value: "csv",      labelKey: "document.csv",      ext: "csv",  mime: "text/csv", group: "data", canInput: true, canPreview: true, isOutput: true },
  { value: "tsv",      labelKey: "document.tsv",      ext: "tsv",  mime: "text/tab-separated-values", group: "data", canInput: true, canPreview: true, isOutput: true },
  { value: "xml",      labelKey: "document.xml",      ext: "xml",  mime: "application/xml", group: "data", canInput: true, canPreview: true, isOutput: true },
  { value: "yaml",     labelKey: "document.yaml",     ext: "yaml", mime: "text/yaml", group: "data", canInput: true, canPreview: true, isOutput: true },
  // Binary output
  { value: "pdf",      labelKey: "document.pdf",      ext: "pdf",  mime: "application/pdf", group: "binary", canInput: false, canPreview: false, isOutput: true },
  { value: "docx",     labelKey: "document.docx",     ext: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", group: "binary", canInput: false, canPreview: false, isOutput: true },
]

/** Detect the format of an input file */
export function detectDocFormat(file: File, content: string): DocFormat {
  const ext = file.name.split(".").pop()?.toLowerCase() || ""

  if (ext === "md" || ext === "markdown") return "markdown"
  if (ext === "html" || ext === "htm") return "html"
  if (ext === "json" || file.type === "application/json") return "json"
  if (ext === "csv") return "csv"
  if (ext === "tsv") return "tsv"
  if (ext === "xml") return "xml"
  if (ext === "yaml" || ext === "yml") return "yaml"

  // Detect by content
  const trimmed = content.trim()
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json"
  if (trimmed.startsWith("<?xml") || trimmed.startsWith("<")) {
    if (/<html|<!DOCTYPE|<head|<body/i.test(trimmed)) return "html"
    return "xml"
  }
  if (/^#/m.test(trimmed) && /\n/.test(trimmed)) return "markdown"

  return "plaintext"
}

/** Get valid output formats for a given input format */
export function getOutputFormats(input: DocFormat): DocFormat[] {
  const cfg = DOC_FORMATS.find((f) => f.value === input)
  if (!cfg) return []

  const textFormats: DocFormat[] = ["markdown", "html", "plaintext"]
  const dataFormats: DocFormat[] = ["json", "csv", "tsv", "xml", "yaml"]

  const outputs: DocFormat[] = []

  if (cfg.group === "text") {
    // Text → other text formats + data formats + binary
    outputs.push(...textFormats.filter((f) => f !== input))
    outputs.push(...dataFormats)
    outputs.push("pdf", "docx")
  } else if (cfg.group === "data") {
    // Data → other data formats + text (as formatted) + binary
    outputs.push(...dataFormats.filter((f) => f !== input))
    outputs.push("plaintext", "html")
    outputs.push("pdf", "docx")
  }

  return outputs
}

/** Check if a format is previewable */
export function isPreviewable(format: DocFormat): boolean {
  return DOC_FORMATS.find((f) => f.value === format)?.canPreview ?? false
}

/** Convert document content between formats. Returns text or Blob for binary. */
export async function convertDocument(
  content: string,
  from: DocFormat,
  to: DocFormat
): Promise<string | Blob> {
  if (from === to) return content

  // --- Binary output ---
  if (to === "pdf") return textToPdf(content, from)
  if (to === "docx") return textToDocx(content, from)

  // --- Text conversions ---
  // Anything → Plaintext
  if (to === "plaintext") return from === "html" ? stripHtml(content) : content
  // Markdown → HTML
  if (from === "markdown" && to === "html") return markdownToHtml(content)
  // HTML → Markdown
  if (from === "html" && to === "markdown") return htmlToMarkdown(content)

  // --- Data conversions ---
  if (from === "json" && to === "csv") return jsonToCsv(content, ",")
  if (from === "json" && to === "tsv") return jsonToTsv(content)
  if (from === "json" && to === "yaml") return jsonToYaml(content)
  if (from === "json" && to === "xml") return jsonToXml(content)
  if (from === "csv" && to === "json") return csvToJson(content, ",")
  if (from === "csv" && to === "tsv") return csvToTsv(content)
  if (from === "tsv" && to === "json") return csvToJson(content, "\t")
  if (from === "tsv" && to === "csv") return tsvToCsv(content)
  if (from === "xml" && to === "json") return xmlToJson(content)
  if (from === "yaml" && to === "json") return yamlToJson(content)

  // Cross-group: data → text
  if (from === "json" && to === "html") return `<pre>${escapeHtml(content)}</pre>`
  if (from === "csv" && to === "html") return csvToHtml(content, ",")
  if (from === "tsv" && to === "html") return csvToHtml(content, "\t")

  // Fallback
  return content
}

/* ================================================================== */
/*  Binary converters                                                  */
/* ================================================================== */

async function textToPdf(content: string, from: DocFormat): Promise<Blob> {
  const { jsPDF } = await import("jspdf")
  const doc = new jsPDF()

  let text = content
  if (from === "html") text = stripHtml(content)
  if (from === "markdown") text = content // raw markdown text

  const lines = doc.splitTextToSize(text, 180)
  doc.text(lines, 10, 10)

  const arrayBuffer = doc.output("arraybuffer")
  return new Blob([arrayBuffer], { type: "application/pdf" })
}

async function textToDocx(content: string, from: DocFormat): Promise<Blob> {
  const JSZip = (await import("jszip")).default

  let text = content
  if (from === "html") text = stripHtml(content)

  // Escape XML special characters in text (avoiding literal entities in source)
  const escXml = (s: string) => {
    const amp = String.fromCharCode(38)
    const map: Record<string, string> = {
      [amp]: amp + "amp;",
      "<": amp + "lt;",
      ">": amp + "gt;",
      '"': amp + "quot;",
    }
    return s.replace(/[&<>"]/g, (ch) => map[ch] ?? ch)
  }

  // Build paragraph XML from each line
  const paragraphsXml = text
    .split("\n")
    .map((line) => `<w:p><w:r><w:t xml:space="preserve">${escXml(line)}</w:t></w:r></w:p>`)
    .join("")

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${paragraphsXml}</w:body>
</w:document>`

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`

  const wordRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`

  const zip = new JSZip()
  zip.file("[Content_Types].xml", contentTypesXml)
  zip.file("_rels/.rels", relsXml)
  zip.file("word/document.xml", documentXml)
  zip.file("word/_rels/document.xml.rels", wordRelsXml)

  return await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })
}

/* ================================================================== */
/*  Text converters                                                    */
/* ================================================================== */

function markdownToHtml(md: string): string {
  let html = md
    .replace(/^######\s+(.+)$/gm, "<h6>$1</h6>")
    .replace(/^#####\s+(.+)$/gm, "<h5>$1</h5>")
    .replace(/^####\s+(.+)$/gm, "<h4>$1</h4>")
    .replace(/^###\s+(.+)$/gm, "<h3>$1</h3>")
    .replace(/^##\s+(.+)$/gm, "<h2>$1</h2>")
    .replace(/^#\s+(.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/^>\s+(.+)$/gm, "<blockquote>$1</blockquote>")
    .replace(/^[-*_]{3,}$/gm, "<hr />")
    .replace(/^\s*[-*+]\s+(.+)$/gm, "<li>$1</li>")
    .replace(/^\s*\d+\.\s+(.+)$/gm, "<li>$1</li>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br />")
  return `<p>${html}</p>`
}

function htmlToMarkdown(html: string): string {
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n")
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n")
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n")
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, "#### $1\n")
    .replace(/<h5[^>]*>(.*?)<\/h5>/gi, "##### $1\n")
    .replace(/<h6[^>]*>(.*?)<\/h6>/gi, "###### $1\n")
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>(.*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>(.*?)<\/em>/gi, "*$1*")
    .replace(/<i[^>]*>(.*?)<\/i>/gi, "*$1*")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, "![$2]($1)")
    .replace(/<code[^>]*>(.*?)<\/code>/gi, "`$1`")
    .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, "```\n$1\n```")
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, "> $1\n")
    .replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1")
    .replace(/<hr\s*\/?>/gi, "---\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?p[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
}

/* ================================================================== */
/*  Data converters                                                    */
/* ================================================================== */

function jsonToCsv(json: string, sep: "," | "\t"): string {
  const data = JSON.parse(json)
  const arr = Array.isArray(data) ? data : [data]
  if (arr.length === 0) return ""
  const headers = Object.keys(arr[0])
  const rows = arr.map((row: Record<string, unknown>) =>
    headers.map((h) => escapeCsv(String(row[h] ?? ""), sep)).join(sep)
  )
  return [headers.map((h) => escapeCsv(h, sep)).join(sep), ...rows].join("\n")
}

function jsonToTsv(json: string): string { return jsonToCsv(json, "\t") }

function csvToJson(csv: string, separator: "," | "\t"): string {
  const lines = csv.trim().split("\n")
  if (lines.length < 2) return "[]"
  const headers = parseCsvLine(lines[0], separator)
  const result = lines.slice(1).map((line) => {
    const values = parseCsvLine(line, separator)
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => { obj[h] = values[i] ?? "" })
    return obj
  })
  return JSON.stringify(result, null, 2)
}

function csvToTsv(csv: string): string {
  return csv.trim().split("\n").map((l) => parseCsvLine(l, ",").join("\t")).join("\n")
}

function tsvToCsv(tsv: string): string {
  return tsv.trim().split("\n").map((l) => parseCsvLine(l, "\t").map((v) => escapeCsv(v, ",")).join(",")).join("\n")
}

function jsonToXml(json: string): string {
  const data = JSON.parse(json)
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + objectToXml(data, "root")
}

function objectToXml(obj: unknown, tag: string): string {
  if (obj === null || obj === undefined) return `<${tag} />`
  if (typeof obj !== "object") {
    const val = String(obj).replace(/&/g, "&").replace(/</g, "<").replace(/>/g, ">")
    return `<${tag}>${val}</${tag}>`
  }
  if (Array.isArray(obj)) return obj.map((item) => objectToXml(item, "item")).join("\n")
  const children = Object.entries(obj as Record<string, unknown>).map(([k, v]) => objectToXml(v, k)).join("\n")
  return `<${tag}>\n${children}\n</${tag}>`
}

function xmlToJson(xml: string): string {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, "text/xml")
  return JSON.stringify(xmlNodeToObject(doc.documentElement), null, 2)
}

function xmlNodeToObject(node: Element): unknown {
  const children = Array.from(node.children)
  if (children.length === 0) return node.textContent?.trim() || ""
  const obj: Record<string, unknown> = {}
  for (const child of children) {
    const key = child.tagName
    const value = xmlNodeToObject(child)
    if (key in obj) {
      const existing = obj[key]
      obj[key] = Array.isArray(existing) ? [...existing, value] : [existing, value]
    } else { obj[key] = value }
  }
  return obj
}

function jsonToYaml(json: string): string { return valueToYaml(JSON.parse(json), 0) }

function valueToYaml(value: unknown, indent: number): string {
  const p = "  ".repeat(indent)
  if (value === null || value === undefined) return `${p}null`
  if (typeof value === "boolean" || typeof value === "number") return `${p}${value}`
  if (typeof value === "string") {
    if (/[:#{}[\],&*?|>!%@`]/.test(value) || value.includes("\n")) return `${p}"${value.replace(/"/g, '\\"')}"`
    return `${p}${value}`
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return `${p}[]`
    return value.map((item) => {
      if (typeof item === "object" && item !== null) return `${p}- ${valueToYaml(item, indent + 1).trimStart()}`
      return `${p}- ${valueToYaml(item, 0).trim()}`
    }).join("\n")
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return `${p}{}`
    return entries.map(([k, v]) => {
      if (typeof v === "object" && v !== null) return `${p}${k}:\n${valueToYaml(v, indent + 1)}`
      return `${p}${k}: ${valueToYaml(v, 0).trim()}`
    }).join("\n")
  }
  return `${p}${String(value)}`
}

function yamlToJson(yaml: string): string {
  const result: Record<string, string> = {}
  for (const line of yaml.split("\n")) {
    const match = line.match(/^(\s*)([\w.-]+):\s*(.*)$/)
    if (match) {
      const v = match[3].trim()
      if (v === "true" || v === "false" || v === "null") result[match[2]] = v
      else if (!isNaN(Number(v)) && v !== "") result[match[2]] = v
      else result[match[2]] = v.replace(/^["']|["']$/g, "")
    }
  }
  return JSON.stringify(result, null, 2)
}

function csvToHtml(csv: string, sep: "," | "\t"): string {
  const lines = csv.trim().split("\n")
  const headers = parseCsvLine(lines[0], sep)
  const rows = lines.slice(1).map((l) => parseCsvLine(l, sep))

  let html = '<table border="1" cellpadding="4">\n<thead><tr>'
  headers.forEach((h) => { html += `<th>${escapeHtml(h)}</th>` })
  html += "</tr></thead>\n<tbody>\n"
  rows.forEach((row) => {
    html += "<tr>"
    row.forEach((cell) => { html += `<td>${escapeHtml(cell)}</td>` })
    html += "</tr>\n"
  })
  html += "</tbody></table>"
  return html
}

/* ================================================================== */
/*  CSV helpers                                                        */
/* ================================================================== */

function escapeCsv(value: string, sep: string): string {
  if (value.includes(sep) || value.includes('"') || value.includes("\n")) return `"${value.replace(/"/g, '""')}"`
  return value
}

function parseCsvLine(line: string, sep: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') { if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++ } else inQuotes = false }
      else current += ch
    } else {
      if (ch === '"') inQuotes = true
      else if (ch === sep) { result.push(current); current = "" }
      else current += ch
    }
  }
  result.push(current)
  return result
}