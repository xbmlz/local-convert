"use client"

import { useState, useCallback } from "react"
import {
  type DocFormat,
  DOC_FORMATS,
  detectDocFormat,
  getOutputFormats,
  convertDocument,
  isPreviewable,
} from "@/lib/document-converter"

const DOC_EXTENSIONS = /\.(md|markdown|html|htm|txt|json|csv|tsv|xml|yaml|yml|log|ini|cfg|conf)$/i
const DOC_MIMES = /^(text\/|application\/json|application\/xml|application\/x-yaml)/

export function useDocConverter() {
  const [file, setFile] = useState<File | null>(null)
  const [content, setContent] = useState("")
  const [outputContent, setOutputContent] = useState("")
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null)
  const [inputFormat, setInputFormat] = useState<DocFormat>("plaintext")
  const [outputFormat, setOutputFormat] = useState<DocFormat>("json")
  const [converting, setConverting] = useState(false)
  const [error, setError] = useState("")

  const availableOutputs = getOutputFormats(inputFormat)
  const outputIsBinary = !isPreviewable(outputFormat)

  const doConvert = useCallback(
    async (text: string, from: DocFormat, to: DocFormat) => {
      setConverting(true)
      setError("")
      setOutputContent("")
      setOutputBlob(null)
      try {
        const result = await convertDocument(text, from, to)
        if (result instanceof Blob) {
          setOutputBlob(result)
          setOutputContent("")
        } else {
          setOutputContent(result)
          setOutputBlob(null)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Conversion failed")
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
        f.type === ""

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

        const outputs = getOutputFormats(detected)
        const firstOutput = outputs[0] || "plaintext"
        setOutputFormat(firstOutput)

        await doConvert(text, detected, firstOutput)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to read file")
      }
    },
    [doConvert]
  )

  const changeOutputFormat = useCallback(
    async (fmt: DocFormat) => {
      setOutputFormat(fmt)
      if (content) await doConvert(content, inputFormat, fmt)
    },
    [content, inputFormat, doConvert]
  )

  const download = useCallback(() => {
    if (!file) return

    const fmtConfig = DOC_FORMATS.find((f) => f.value === outputFormat)
    const ext = fmtConfig?.ext || "txt"
    const mime = fmtConfig?.mime || "text/plain"

    let blob: Blob
    if (outputBlob) {
      blob = outputBlob
    } else if (outputContent) {
      blob = new Blob([outputContent], { type: mime })
    } else {
      return
    }

    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${file.name.replace(/\.[^.]+$/, "")}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }, [outputContent, outputBlob, file, outputFormat])

  const reset = useCallback(() => {
    setFile(null)
    setContent("")
    setOutputContent("")
    setOutputBlob(null)
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
    outputBlob,
    inputFormat,
    outputFormat,
    converting,
    error,
    availableOutputs,
    outputIsBinary,
    inputFormatConfig,
    outputFormatConfig,
    loadFile,
    changeOutputFormat,
    download,
    reset,
  }
}