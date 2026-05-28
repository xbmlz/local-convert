"use client"

import { useState, useCallback } from "react"
import {
  type DocFormat,
  DOC_FORMATS,
  detectDocFormat,
  getOutputFormats,
  convertDocument,
} from "@/lib/document-converter"

const DOC_EXTENSIONS = /\.(md|markdown|html|htm|txt|json|csv|tsv|xml|yaml|yml|log|ini|cfg|conf)$/i
const DOC_MIMES = /^(text\/|application\/json|application\/xml|application\/x-yaml)/

export function useDocConverter() {
  const [file, setFile] = useState<File | null>(null)
  const [content, setContent] = useState("")
  const [outputContent, setOutputContent] = useState("")
  const [inputFormat, setInputFormat] = useState<DocFormat>("plaintext")
  const [outputFormat, setOutputFormat] = useState<DocFormat>("json")
  const [converting, setConverting] = useState(false)
  const [error, setError] = useState("")

  const availableOutputs = getOutputFormats(inputFormat)

  const doConvert = useCallback(
    (text: string, from: DocFormat, to: DocFormat) => {
      setConverting(true)
      setError("")
      try {
        const result = convertDocument(text, from, to)
        setOutputContent(result)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Conversion failed")
        setOutputContent("")
      } finally {
        setConverting(false)
      }
    },
    []
  )

  const loadFile = useCallback(
    async (f: File) => {
      const isDoc =
        DOC_MIMES.test(f.type) ||
        DOC_EXTENSIONS.test(f.name) ||
        f.type === "" // some text files have empty type
      if (!isDoc) {
        setError("Please select a document file")
        return
      }

      setFile(f)
      setError("")

      try {
        const text = await f.text()
        setContent(text)

        const detected = detectDocFormat(f, text)
        setInputFormat(detected)

        // Pick first available output format
        const outputs = getOutputFormats(detected)
        const firstOutput = outputs[0] || "plaintext"
        setOutputFormat(firstOutput)

        doConvert(text, detected, firstOutput)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to read file")
      }
    },
    [doConvert]
  )

  const changeOutputFormat = useCallback(
    (fmt: DocFormat) => {
      setOutputFormat(fmt)
      if (content) doConvert(content, inputFormat, fmt)
    },
    [content, inputFormat, doConvert]
  )

  const download = useCallback(() => {
    if (!outputContent || !file) return
    const fmtConfig = DOC_FORMATS.find((f) => f.value === outputFormat)
    const ext = fmtConfig?.ext || "txt"
    const mime = fmtConfig?.mime || "text/plain"
    const blob = new Blob([outputContent], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${file.name.replace(/\.[^.]+$/, "")}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }, [outputContent, file, outputFormat])

  const reset = useCallback(() => {
    setFile(null)
    setContent("")
    setOutputContent("")
    setInputFormat("plaintext")
    setOutputFormat("json")
    setError("")
  }, [])

  const inputFormatConfig = DOC_FORMATS.find((f) => f.value === inputFormat)
  const outputFormatConfig = DOC_FORMATS.find((f) => f.value === outputFormat)

  return {
    file,
    content,
    outputContent,
    inputFormat,
    outputFormat,
    converting,
    error,
    availableOutputs,
    inputFormatConfig,
    outputFormatConfig,
    loadFile,
    changeOutputFormat,
    download,
    reset,
  }
}