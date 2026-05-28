/**
 * Browser-native document converter.
 * All conversions happen client-side — no server needed.
 */

export type DocFormat = "markdown" | "html" | "plaintext" | "json" | "csv" | "tsv" | "xml" | "yaml"

export interface DocFormatConfig {
  value: DocFormat
  labelKey: string
  ext: string
  mime: string
}

export const DOC_FORMATS: DocFormatConfig[] = [
  { value: "markdown", labelKey: "document.markdown", ext: "md", mime: "text/markdown" },
  { value: "html", labelKey: "document.html", ext: "html", mime: "text/html" },
  { value: "plaintext", labelKey: "document.plaintext", ext: "txt", mime: "text/plain" },
  { value: "json", labelKey: "document.json", ext: "json", mime: "application/json" },
  { value: "csv", labelKey: "document.csv", ext: "csv", mime: "text/csv" },
  { value: "tsv", labelKey: "document.tsv", ext: "tsv", mime: "text/tab-separated-values" },
  { value: "xml", labelKey: "document.xml", ext: "xml", mime: "application/xml" },
  { value: "yaml", labelKey: "document.yaml", ext: "yaml", mime: "text/yaml" },
]

/** Detect the format of an input file by extension and content */
export function detectDocFormat(file: File, content: string): DocFormat {
  const ext = file.name.split(".").pop()?.toLowerCase() || ""

  if (ext === "md" || ext === "markdown") return "markdown"
  if (ext === "html" || ext === "htm") return "html"
  if (ext === "json" || file.type === "application/json") return "json"
  if (ext === "csv") return "csv"
  if (ext === "tsv") return "tsv"
  if (ext === "xml") return "xml"
  if (ext === "yaml" || ext === "yml") return "yaml"

  // Try to detect by content
  const trimmed = content.trim()
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return "json"
  if (trimmed.startsWith("<?xml") || trimmed.startsWith("<")) {
    // Could be HTML or XML
    if (/<html|<!DOCTYPE|<head|<body/i.test(trimmed)) return "html"
    return "xml"
  }
  if (/^#/m.test(trimmed) && /\n/.test(trimmed)) return "markdown"

  return "plaintext"
}

/** Get possible output formats for a given input format */
export function getOutputFormats(input: DocFormat): DocFormat[] {
  const all: DocFormat[] = ["markdown", "html", "plaintext", "json", "csv", "tsv", "xml", "yaml"]
  return all.filter((f) => f !== input)
}

/** Convert document content between formats */
export function convertDocument(
  content: string,
  from: DocFormat,
  to: DocFormat
): string {
  if (from === to) return content

  // Markdown → HTML
  if (from === "markdown" && to === "html") return markdownToHtml(content)
  // HTML → Markdown (basic)
  if (from === "html" && to === "markdown") return htmlToMarkdown(content)
  // JSON → CSV
  if (from === "json" && to === "csv") return jsonToCsv(content)
  // JSON → TSV
  if (from === "json" && to === "tsv") return jsonToTsv(content)
  // JSON → YAML
  if (from === "json" && to === "yaml") return jsonToYaml(content)
  // JSON → XML
  if (from === "json" && to === "xml") return jsonToXml(content)
  // CSV → JSON
  if (from === "csv" && to === "json") return csvToJson(content, ",")
  // CSV → TSV
  if (from === "csv" && to === "tsv") return csvToTsv(content)
  // TSV → JSON
  if (from === "tsv" && to === "json") return csvToJson(content, "\t")
  // TSV → CSV
  if (from === "tsv" && to === "csv") return tsvToCsv(content)
  // XML → JSON (basic)
  if (from === "xml" && to === "json") return xmlToJson(content)
  // YAML → JSON (basic)
  if (from === "yaml" && to === "json") return yamlToJson(content)
  // Plaintext conversions
  if (to === "plaintext") return content
  // HTML → Plaintext
  if (from === "html" && to === "plaintext") return stripHtml(content)

  // Fallback: return content as-is with a comment
  return content
}

/* ------------------------------------------------------------------ */
/*  Markdown → HTML (basic parser)                                     */
/* ------------------------------------------------------------------ */
function markdownToHtml(md: string): string {
  let html = md
    // Headers
    .replace(/^######\s+(.+)$/gm, "<h6>$1</h6>")
    .replace(/^#####\s+(.+)$/gm, "<h5>$1</h5>")
    .replace(/^####\s+(.+)$/gm, "<h4>$1</h4>")
    .replace(/^###\s+(.+)$/gm, "<h3>$1</h3>")
    .replace(/^##\s+(.+)$/gm, "<h2>$1</h2>")
    .replace(/^#\s+(.+)$/gm, "<h1>$1</h1>")
    // Bold & italic
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Links & images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    // Blockquotes
    .replace(/^>\s+(.+)$/gm, "<blockquote>$1</blockquote>")
    // Horizontal rule
    .replace(/^[-*_]{3,}$/gm, "<hr />")
    // Unordered lists
    .replace(/^\s*[-*+]\s+(.+)$/gm, "<li>$1</li>")
    // Ordered lists
    .replace(/^\s*\d+\.\s+(.+)$/gm, "<li>$1</li>")
    // Paragraphs
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br />")

  return `<p>${html}</p>`
}

/* ------------------------------------------------------------------ */
/*  HTML → Markdown (basic)                                            */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/*  HTML → Plaintext                                                   */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/*  JSON ↔ CSV / TSV                                                   */
/* ------------------------------------------------------------------ */
function jsonToCsv(json: string): string {
  const data = JSON.parse(json)
  const arr = Array.isArray(data) ? data : [data]
  if (arr.length === 0) return ""

  const headers = Object.keys(arr[0])
  const rows = arr.map((row: Record<string, unknown>) =>
    headers.map((h) => escapeCsv(String(row[h] ?? ""), ",")).join(",")
  )
  return [headers.map((h) => escapeCsv(h, ",")).join(","), ...rows].join("\n")
}

function jsonToTsv(json: string): string {
  const data = JSON.parse(json)
  const arr = Array.isArray(data) ? data : [data]
  if (arr.length === 0) return ""

  const headers = Object.keys(arr[0])
  const rows = arr.map((row: Record<string, unknown>) =>
    headers.map((h) => escapeCsv(String(row[h] ?? ""), "\t")).join("\t")
  )
  return [headers.join("\t"), ...rows].join("\n")
}

function csvToJson(csv: string, separator: "," | "\t"): string {
  const lines = csv.trim().split("\n")
  if (lines.length < 2) return "[]"

  const headers = parseCsvLine(lines[0], separator)
  const result = lines.slice(1).map((line) => {
    const values = parseCsvLine(line, separator)
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => {
      obj[h] = values[i] ?? ""
    })
    return obj
  })
  return JSON.stringify(result, null, 2)
}

function csvToTsv(csv: string): string {
  const lines = csv.trim().split("\n")
  return lines.map((line) => parseCsvLine(line, ",").join("\t")).join("\n")
}

function tsvToCsv(tsv: string): string {
  const lines = tsv.trim().split("\n")
  return lines.map((line) => parseCsvLine(line, "\t").map((v) => escapeCsv(v, ",")).join(",")).join("\n")
}

/* ------------------------------------------------------------------ */
/*  JSON ↔ XML (basic)                                                 */
/* ------------------------------------------------------------------ */
function jsonToXml(json: string): string {
  const data = JSON.parse(json)
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + objectToXml(data, "root")
}

function objectToXml(obj: unknown, tagName: string): string {
  if (obj === null || obj === undefined) return `<${tagName} />`
  if (typeof obj !== "object") return `<${tagName}>${escapeXml(String(obj))}</${tagName}>`
  if (Array.isArray(obj)) return obj.map((item) => objectToXml(item, "item")).join("\n")

  const children = Object.entries(obj as Record<string, unknown>)
    .map(([key, value]) => objectToXml(value, key))
    .join("\n")
  return `<${tagName}>\n${children}\n</${tagName}>`
}

function xmlToJson(xml: string): string {
  // Basic XML to JSON - extract text content from simple structures
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, "text/xml")
  const obj = xmlNodeToObject(doc.documentElement)
  return JSON.stringify(obj, null, 2)
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
    } else {
      obj[key] = value
    }
  }
  return obj
}

/* ------------------------------------------------------------------ */
/*  JSON ↔ YAML (basic)                                                */
/* ------------------------------------------------------------------ */
function jsonToYaml(json: string, indent = 0): string {
  const data = JSON.parse(json)
  return valueToYaml(data, indent)
}

function valueToYaml(value: unknown, indent: number): string {
  const prefix = "  ".repeat(indent)
  if (value === null || value === undefined) return `${prefix}null`
  if (typeof value === "boolean") return `${prefix}${value}`
  if (typeof value === "number") return `${prefix}${value}`
  if (typeof value === "string") {
    if (/[:#{}[\],&*?|>!%@`]/.test(value) || value.includes("\n")) {
      return `${prefix}"${value.replace(/"/g, '\\"')}"`
    }
    return `${prefix}${value}`
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return `${prefix}[]`
    return value.map((item) => {
      if (typeof item === "object" && item !== null) {
        const inner = valueToYaml(item, indent + 1).trimStart()
        return `${prefix}- ${inner}`
      }
      return `${prefix}- ${valueToYaml(item, 0).trim()}`
    }).join("\n")
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return `${prefix}{}`
    return entries.map(([key, val]) => {
      if (typeof val === "object" && val !== null) {
        return `${prefix}${key}:\n${valueToYaml(val, indent + 1)}`
      }
      return `${prefix}${key}: ${valueToYaml(val, 0).trim()}`
    }).join("\n")
  }
  return `${prefix}${String(value)}`
}

function yamlToJson(yaml: string): string {
  // Basic YAML parser for flat/simple structures
  const lines = yaml.split("\n")
  const result: Record<string, string> = {}
  for (const line of lines) {
    const match = line.match(/^(\s*)([\w.-]+):\s*(.*)$/)
    if (match) {
      const value = match[3].trim()
      // Try to parse numbers and booleans
      if (value === "true") result[match[2]] = "true"
      else if (value === "false") result[match[2]] = "false"
      else if (value === "null") result[match[2]] = "null"
      else if (!isNaN(Number(value)) && value !== "") result[match[2]] = value
      else result[match[2]] = value.replace(/^["']|["']$/g, "")
    }
  }
  return JSON.stringify(result, null, 2)
}

/* ------------------------------------------------------------------ */
/*  CSV helpers                                                        */
/* ------------------------------------------------------------------ */
function escapeCsv(value: string, separator: string): string {
  if (value.includes(separator) || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function parseCsvLine(line: string, separator: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
    } else {
      if (char === '"') {
        inQuotes = true
      } else if (char === separator) {
        result.push(current)
        current = ""
      } else {
        current += char
      }
    }
  }
  result.push(current)
  return result
}

function escapeXml(str: string): string {
  return str.replace(/[&<>"']/g, (ch) => {
    if (ch === String.fromCharCode(38)) return String.fromCharCode(38) + "amp;"
    if (ch === String.fromCharCode(60)) return String.fromCharCode(38) + "lt;"
    if (ch === String.fromCharCode(62)) return String.fromCharCode(38) + "gt;"
    if (ch === String.fromCharCode(34)) return String.fromCharCode(38) + "quot;"
    if (ch === String.fromCharCode(39)) return String.fromCharCode(38) + "apos;"
    return ch
  })
}
