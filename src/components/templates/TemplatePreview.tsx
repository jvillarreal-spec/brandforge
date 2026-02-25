"use client";

import { useEffect, useRef } from "react";
import * as fabric from "fabric";
import type { DesignSpec } from "@/lib/design-spec.types";

interface TemplatePreviewProps {
  designSpec: DesignSpec;
  className?: string;
}

export function TemplatePreview({ designSpec, className }: TemplatePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !designSpec?.canvas) return;

    // Clean up previous canvas
    if (fabricRef.current) {
      fabricRef.current.dispose();
    }

    const spec = designSpec;
    const canvasWidth = spec.canvas.width || 1080;
    const canvasHeight = spec.canvas.height || 1080;

    // Create canvas at small size for thumbnail
    const previewSize = 300;
    const scale = previewSize / Math.max(canvasWidth, canvasHeight);
    const displayWidth = Math.round(canvasWidth * scale);
    const displayHeight = Math.round(canvasHeight * scale);

    canvasRef.current.width = displayWidth;
    canvasRef.current.height = displayHeight;

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: displayWidth,
      height: displayHeight,
      selection: false,
      renderOnAddRemove: false,
    });
    fabricRef.current = canvas;

    // Set background
    if (spec.canvas.background) {
      const bg = spec.canvas.background;
      if (bg.type === "solid" && "color" in bg) {
        canvas.backgroundColor = bg.color;
      } else if (bg.type === "gradient" && "gradient" in bg) {
        const grad = bg.gradient;
        if (grad.stops && grad.stops.length >= 2) {
          canvas.backgroundColor = grad.stops[0].color;
        }
      }
    }

    // Render elements
    if (Array.isArray(spec.elements)) {
      for (const el of spec.elements) {
        try {
          renderElement(canvas, el, scale);
        } catch {
          // Skip elements that fail to render
        }
      }
    }

    canvas.renderAll();

    return () => {
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }
    };
  }, [designSpec]);

  return (
    <div className={`flex items-center justify-center bg-muted ${className || ""}`}>
      <canvas ref={canvasRef} />
    </div>
  );
}

function renderElement(canvas: fabric.Canvas, el: any, scale: number) {
  const left = (el.position?.x || 0) * scale;
  const top = (el.position?.y || 0) * scale;
  const width = (el.size?.width || 100) * scale;
  const height = (el.size?.height || 100) * scale;

  if (el.type === "shape") {
    let obj: fabric.FabricObject | null = null;

    if (el.shape === "rectangle" || !el.shape) {
      obj = new fabric.Rect({
        left,
        top,
        width,
        height,
        fill: el.style?.fill || "transparent",
        stroke: el.style?.stroke || undefined,
        strokeWidth: (el.style?.strokeWidth || 0) * scale,
        rx: (el.style?.borderRadius || 0) * scale,
        ry: (el.style?.borderRadius || 0) * scale,
        selectable: false,
      });
    } else if (el.shape === "circle") {
      const radius = Math.min(width, height) / 2;
      obj = new fabric.Circle({
        left,
        top,
        radius,
        fill: el.style?.fill || "transparent",
        stroke: el.style?.stroke || undefined,
        strokeWidth: (el.style?.strokeWidth || 0) * scale,
        selectable: false,
      });
    } else if (el.shape === "ellipse") {
      obj = new fabric.Ellipse({
        left,
        top,
        rx: width / 2,
        ry: height / 2,
        fill: el.style?.fill || "transparent",
        stroke: el.style?.stroke || undefined,
        selectable: false,
      });
    } else if (el.shape === "triangle") {
      obj = new fabric.Triangle({
        left,
        top,
        width,
        height,
        fill: el.style?.fill || "transparent",
        stroke: el.style?.stroke || undefined,
        selectable: false,
      });
    }

    if (obj) {
      if (el.opacity !== undefined) obj.opacity = el.opacity;
      if (el.rotation) obj.angle = el.rotation;
      canvas.add(obj);
    }
  } else if (el.type === "text") {
    const fontSize = Math.max((el.style?.fontSize || 24) * scale, 4);
    const textObj = new fabric.Textbox(el.content || "", {
      left,
      top,
      width,
      fontSize,
      fontFamily: el.style?.fontFamily || "Arial",
      fontWeight: el.style?.fontWeight || "normal",
      fontStyle: el.style?.fontStyle || "normal",
      fill: el.style?.color || "#000000",
      textAlign: el.style?.textAlign || "left",
      lineHeight: el.style?.lineHeight || 1.2,
      selectable: false,
    });

    if (el.style?.textTransform === "uppercase") {
      textObj.set("text", (el.content || "").toUpperCase());
    } else if (el.style?.textTransform === "lowercase") {
      textObj.set("text", (el.content || "").toLowerCase());
    }

    if (el.opacity !== undefined) textObj.opacity = el.opacity;
    if (el.rotation) textObj.angle = el.rotation;
    canvas.add(textObj);
  }
}
