"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import type { CropArea } from "@/lib/image-converter"
import type { CropRatio } from "@/hooks/use-converter"
import { useI18n } from "@/lib/i18n-context"
import { cn } from "@/lib/utils"

interface CropOverlayProps {
  imageUrl: string
  imageWidth: number
  imageHeight: number
  cropRatio: CropRatio
  onRatioChange: (ratio: CropRatio) => void
  onApply: (area: CropArea) => void
  onCancel: () => void
}

const RATIOS: { value: CropRatio; label: string; ratio: number | null }[] = [
  { value: "free", label: "crop.free", ratio: null },
  { value: "1:1", label: "crop.square", ratio: 1 },
  { value: "3:4", label: "crop.portrait", ratio: 3 / 4 },
  { value: "4:3", label: "crop.landscape", ratio: 4 / 3 },
  { value: "16:9", label: "crop.wide", ratio: 16 / 9 },
]

export function CropOverlay({
  imageUrl,
  imageWidth,
  imageHeight,
  cropRatio,
  onRatioChange,
  onApply,
  onCancel,
}: CropOverlayProps) {
  const { t } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  // Display dimensions (the rendered image size in the container)
  const [displayW, setDisplayW] = useState(0)
  const [displayH, setDisplayH] = useState(0)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)

  // Crop box in display coordinates
  const [box, setBox] = useState({ x: 0, y: 0, w: 0, h: 0 })

  // Drag state
  const dragRef = useRef<{
    type: "move" | "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w"
    startX: number
    startY: number
    startBox: { x: number; y: number; w: number; h: number }
  } | null>(null)

  // Calculate display dimensions when image loads
  const handleImageLoad = useCallback(() => {
    const container = containerRef.current
    const img = imgRef.current
    if (!container || !img) return

    const cw = container.clientWidth
    const ch = container.clientHeight
    const aspect = imageWidth / imageHeight

    let dw: number, dh: number
    if (cw / ch > aspect) {
      dh = ch
      dw = ch * aspect
    } else {
      dw = cw
      dh = cw / aspect
    }

    setDisplayW(dw)
    setDisplayH(dh)
    setOffsetX((cw - dw) / 2)
    setOffsetY((ch - dh) / 2)

    // Initialize crop box to 80% centered
    const margin = 0.1
    const currentRatio = RATIOS.find((r) => r.value === cropRatio)?.ratio
    let bw = dw * (1 - 2 * margin)
    let bh = dh * (1 - 2 * margin)

    if (currentRatio) {
      if (bw / bh > currentRatio) {
        bw = bh * currentRatio
      } else {
        bh = bw / currentRatio
      }
    }

    setBox({
      x: (dw - bw) / 2,
      y: (dh - bh) / 2,
      w: bw,
      h: bh,
    })
  }, [imageWidth, imageHeight, cropRatio])

  // Constrain box to display bounds
  const constrainBox = useCallback(
    (b: { x: number; y: number; w: number; h: number }) => {
      const minSize = 20
      let { x, y, w, h } = b
      w = Math.max(minSize, Math.min(w, displayW))
      h = Math.max(minSize, Math.min(h, displayH))
      x = Math.max(0, Math.min(x, displayW - w))
      y = Math.max(0, Math.min(y, displayH - h))
      return { x, y, w, h }
    },
    [displayW, displayH]
  )

  // Mouse/touch handlers
  const handlePointerDown = useCallback(
    (
      e: React.PointerEvent,
      type: "move" | "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w"
    ) => {
      e.preventDefault()
      e.stopPropagation()
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      dragRef.current = {
        type,
        startX: e.clientX,
        startY: e.clientY,
        startBox: { ...box },
      }
    },
    [box]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return

      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY
      const sb = drag.startBox
      const ratio = RATIOS.find((r) => r.value === cropRatio)?.ratio ?? null

      let newBox = { ...sb }

      switch (drag.type) {
        case "move":
          newBox.x = sb.x + dx
          newBox.y = sb.y + dy
          break
        case "se":
          newBox.w = sb.w + dx
          newBox.h = ratio ? newBox.w / ratio : sb.h + dy
          break
        case "sw":
          newBox.x = sb.x + dx
          newBox.w = sb.w - dx
          newBox.h = ratio ? newBox.w / ratio : sb.h + dy
          break
        case "ne":
          newBox.w = sb.w + dx
          newBox.h = ratio ? newBox.w / ratio : sb.h - dy
          newBox.y = ratio ? sb.y + sb.h - newBox.h : sb.y + dy
          break
        case "nw":
          newBox.x = sb.x + dx
          newBox.w = sb.w - dx
          newBox.h = ratio ? newBox.w / ratio : sb.h - dy
          newBox.y = ratio ? sb.y + sb.h - newBox.h : sb.y + dy
          break
        case "n":
          newBox.y = sb.y + dy
          newBox.h = sb.h - dy
          if (ratio) {
            newBox.w = newBox.h * ratio
            newBox.x = sb.x + (sb.w - newBox.w) / 2
          }
          break
        case "s":
          newBox.h = sb.h + dy
          if (ratio) {
            newBox.w = newBox.h * ratio
            newBox.x = sb.x + (sb.w - newBox.w) / 2
          }
          break
        case "e":
          newBox.w = sb.w + dx
          if (ratio) {
            newBox.h = newBox.w / ratio
            newBox.y = sb.y + (sb.h - newBox.h) / 2
          }
          break
        case "w":
          newBox.x = sb.x + dx
          newBox.w = sb.w - dx
          if (ratio) {
            newBox.h = newBox.w / ratio
            newBox.y = sb.y + (sb.h - newBox.h) / 2
          }
          break
      }

      setBox(constrainBox(newBox))
    },
    [cropRatio, constrainBox]
  )

  const handlePointerUp = useCallback(() => {
    dragRef.current = null
  }, [])

  // Reset crop box when ratio changes
  useEffect(() => {
    if (displayW === 0 || displayH === 0) return
    const ratio = RATIOS.find((r) => r.value === cropRatio)?.ratio
    const margin = 0.1
    let bw = displayW * (1 - 2 * margin)
    let bh = displayH * (1 - 2 * margin)

    if (ratio) {
      if (bw / bh > ratio) {
        bw = bh * ratio
      } else {
        bh = bw / ratio
      }
    }

    setBox({
      x: (displayW - bw) / 2,
      y: (displayH - bh) / 2,
      w: bw,
      h: bh,
    })
  }, [cropRatio, displayW, displayH])

  const handleApply = useCallback(() => {
    if (displayW === 0 || displayH === 0) return
    const scaleX = imageWidth / displayW
    const scaleY = imageHeight / displayH
    onApply({
      x: box.x * scaleX,
      y: box.y * scaleY,
      width: box.w * scaleX,
      height: box.h * scaleY,
    })
  }, [box, displayW, displayH, imageWidth, imageHeight, onApply])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
      {/* Top toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/50">
        <div className="flex items-center gap-2">
          {RATIOS.map((r) => (
            <button
              key={r.value}
              onClick={() => onRatioChange(r.value)}
              className={cn(
                "px-3 py-1 rounded-md text-sm font-medium transition-colors cursor-pointer",
                cropRatio === r.value
                  ? "bg-white text-black"
                  : "bg-white/10 text-white hover:bg-white/20"
              )}
            >
              {t(r.label)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 rounded-md text-sm font-medium bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
          >
            {t("crop.cancel")}
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-1.5 rounded-md text-sm font-medium bg-white text-black hover:bg-white/90 transition-colors cursor-pointer"
          >
            {t("crop.apply")}
          </button>
        </div>
      </div>

      {/* Image + crop area */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden select-none touch-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <img
          ref={imgRef}
          src={imageUrl}
          onLoad={handleImageLoad}
          className="absolute"
          style={{
            left: offsetX,
            top: offsetY,
            width: displayW,
            height: displayH,
            objectFit: "contain",
          }}
          alt="Crop preview"
          draggable={false}
        />

        {displayW > 0 && displayH > 0 && (
          <>
            {/* Darkened overlay - 4 rectangles around the crop box */}
            {/* Top */}
            <div
              className="absolute bg-black/60"
              style={{
                left: offsetX,
                top: offsetY,
                width: displayW,
                height: box.y,
              }}
            />
            {/* Bottom */}
            <div
              className="absolute bg-black/60"
              style={{
                left: offsetX,
                top: offsetY + box.y + box.h,
                width: displayW,
                height: displayH - box.y - box.h,
              }}
            />
            {/* Left */}
            <div
              className="absolute bg-black/60"
              style={{
                left: offsetX,
                top: offsetY + box.y,
                width: box.x,
                height: box.h,
              }}
            />
            {/* Right */}
            <div
              className="absolute bg-black/60"
              style={{
                left: offsetX + box.x + box.w,
                top: offsetY + box.y,
                width: displayW - box.x - box.w,
                height: box.h,
              }}
            />

            {/* Crop box border */}
            <div
              className="absolute border-2 border-white"
              style={{
                left: offsetX + box.x,
                top: offsetY + box.y,
                width: box.w,
                height: box.h,
              }}
            >
              {/* Move handle */}
              <div
                className="absolute inset-0 cursor-move"
                onPointerDown={(e) => handlePointerDown(e, "move")}
              />

              {/* Rule of thirds grid */}
              <div className="absolute inset-0 pointer-events-none">
                <div
                  className="absolute border-white/30"
                  style={{
                    left: "33.33%",
                    top: 0,
                    width: 0,
                    height: "100%",
                    borderLeftWidth: 1,
                  }}
                />
                <div
                  className="absolute border-white/30"
                  style={{
                    left: "66.66%",
                    top: 0,
                    width: 0,
                    height: "100%",
                    borderLeftWidth: 1,
                  }}
                />
                <div
                  className="absolute border-white/30"
                  style={{
                    top: "33.33%",
                    left: 0,
                    height: 0,
                    width: "100%",
                    borderTopWidth: 1,
                  }}
                />
                <div
                  className="absolute border-white/30"
                  style={{
                    top: "66.66%",
                    left: 0,
                    height: 0,
                    width: "100%",
                    borderTopWidth: 1,
                  }}
                />
              </div>

              {/* Corner handles */}
              {(["nw", "ne", "sw", "se"] as const).map((corner) => {
                const isTop = corner.includes("n")
                const isLeft = corner.includes("w")
                return (
                  <div
                    key={corner}
                    className="absolute w-4 h-4 cursor-nwse-resize"
                    style={{
                      [isTop ? "top" : "bottom"]: -8,
                      [isLeft ? "left" : "right"]: -8,
                    }}
                    onPointerDown={(e) => handlePointerDown(e, corner)}
                  >
                    <div
                      className="absolute bg-white rounded-full"
                      style={{
                        width: 8,
                        height: 8,
                        top: isTop ? 0 : undefined,
                        bottom: isTop ? undefined : 0,
                        left: isLeft ? 0 : undefined,
                        right: isLeft ? undefined : 0,
                      }}
                    />
                  </div>
                )
              })}

              {/* Edge handles */}
              {(["n", "s", "e", "w"] as const).map((edge) => {
                const isHorizontal = edge === "n" || edge === "s"
                const isStart = edge === "n" || edge === "w"
                return (
                  <div
                    key={edge}
                    className={cn(
                      "absolute",
                      isHorizontal
                        ? "left-1/2 -translate-x-1/2 h-4 cursor-ns-resize"
                        : "top-1/2 -translate-y-1/2 w-4 cursor-ew-resize"
                    )}
                    style={{
                      [isStart ? "top" : "bottom"]: isHorizontal ? -8 : undefined,
                      [isStart ? "left" : "right"]: !isHorizontal ? -8 : undefined,
                      ...(isHorizontal
                        ? { width: Math.min(box.w * 0.4, 80) }
                        : { height: Math.min(box.h * 0.4, 80) }),
                    }}
                    onPointerDown={(e) => handlePointerDown(e, edge)}
                  />
                )
              })}

              {/* Size indicator */}
              <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-white/70 text-xs whitespace-nowrap bg-black/50 px-1.5 py-0.5 rounded">
                {Math.round(box.w * (imageWidth / displayW))} × {Math.round(box.h * (imageHeight / displayH))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}