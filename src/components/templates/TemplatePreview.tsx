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
      fabricRef.current = null;
    }

    const spec = designSpec;
    const canvasWidth = spec.canvas.width || 1080;
    const canvasHeight = spec.canvas.height || 1080;

    // Create canvas at small size for thumbnail
    const previewSize = 320;
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
    applyBackground(canvas, spec.canvas.background, displayWidth, displayHeight);

    // Render elements in order (z-index by array position)
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
    <div className={`flex items-center justify-center bg-muted overflow-hidden ${className || ""}`}>
      <canvas ref={canvasRef} style={{ maxWidth: "100%", maxHeight: "100%" }} />
    </div>
  );
}

function applyBackground(
  canvas: fabric.Canvas,
  background: any,
  width: number,
  height: number
) {
  if (!background) {
    canvas.backgroundColor = "#FFFFFF";
    return;
  }

  if (background.type === "solid" && background.color) {
    canvas.backgroundColor = background.color;
  } else if (background.type === "gradient" && background.gradient) {
    const grad = background.gradient;
    const stops = grad.stops || [];

    if (stops.length < 2) {
      canvas.backgroundColor = stops[0]?.color || "#FFFFFF";
      return;
    }

    // Create a full-canvas rectangle with gradient
    const gradientConfig: any = {
      colorStops: {} as Record<string, string>,
    };

    for (const stop of stops) {
      gradientConfig.colorStops[String(stop.offset)] = stop.color;
    }

    if (grad.type === "linear") {
      const angle = (grad.angle || 0) * (Math.PI / 180);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      // Calculate gradient coordinates based on angle
      const halfW = width / 2;
      const halfH = height / 2;

      gradientConfig.type = "linear";
      gradientConfig.coords = {
        x1: halfW - cos * halfW,
        y1: halfH - sin * halfH,
        x2: halfW + cos * halfW,
        y2: halfH + sin * halfH,
      };
    } else if (grad.type === "radial") {
      gradientConfig.type = "radial";
      gradientConfig.coords = {
        x1: width / 2,
        y1: height / 2,
        r1: 0,
        x2: width / 2,
        y2: height / 2,
        r2: Math.max(width, height) / 2,
      };
    }

    const bgRect = new fabric.Rect({
      left: 0,
      top: 0,
      width,
      height,
      selectable: false,
      evented: false,
    });

    try {
      const gradient = new fabric.Gradient(gradientConfig);
      bgRect.fill = gradient;
      canvas.add(bgRect);
      canvas.sendObjectToBack(bgRect);
    } catch {
      // Fallback: use first stop color
      canvas.backgroundColor = stops[0]?.color || "#FFFFFF";
    }
  } else {
    canvas.backgroundColor = "#FFFFFF";
  }
}

function renderElement(canvas: fabric.Canvas, el: any, scale: number) {
  const left = (el.position?.x || 0) * scale;
  const top = (el.position?.y || 0) * scale;
  const width = (el.size?.width || 100) * scale;
  const height = (el.size?.height || 100) * scale;
  const opacity = el.opacity !== undefined ? el.opacity : 1;
  const rotation = el.rotation || 0;

  if (el.type === "shape") {
    let obj: fabric.FabricObject | null = null;
    const fill = el.style?.fill || "transparent";
    const stroke = el.style?.stroke || undefined;
    const strokeWidth = (el.style?.strokeWidth || 0) * scale;

    if (el.shape === "rectangle" || !el.shape) {
      obj = new fabric.Rect({
        left,
        top,
        width,
        height,
        fill,
        stroke,
        strokeWidth,
        rx: (el.style?.borderRadius || 0) * scale,
        ry: (el.style?.borderRadius || 0) * scale,
        selectable: false,
        evented: false,
        opacity,
        angle: rotation,
      });
    } else if (el.shape === "circle") {
      const radius = Math.min(width, height) / 2;
      obj = new fabric.Circle({
        left,
        top,
        radius,
        fill,
        stroke,
        strokeWidth,
        selectable: false,
        evented: false,
        opacity,
        angle: rotation,
      });
    } else if (el.shape === "ellipse") {
      obj = new fabric.Ellipse({
        left,
        top,
        rx: width / 2,
        ry: height / 2,
        fill,
        stroke,
        strokeWidth,
        selectable: false,
        evented: false,
        opacity,
        angle: rotation,
      });
    } else if (el.shape === "triangle") {
      obj = new fabric.Triangle({
        left,
        top,
        width,
        height,
        fill,
        stroke,
        strokeWidth,
        selectable: false,
        evented: false,
        opacity,
        angle: rotation,
      });
    } else if (el.shape === "line") {
      const points: [number, number, number, number] = [left, top, left + width, top + height];
      obj = new fabric.Line(points, {
        stroke: stroke || fill,
        strokeWidth: strokeWidth || 1 * scale,
        selectable: false,
        evented: false,
        opacity,
        angle: rotation,
      });
    }

    // Apply shadow if defined
    if (obj && el.style?.shadow) {
      const s = el.style.shadow;
      obj.shadow = new fabric.Shadow({
        color: s.color || "rgba(0,0,0,0.3)",
        offsetX: (s.offsetX || 0) * scale,
        offsetY: (s.offsetY || 0) * scale,
        blur: (s.blur || 0) * scale,
      });
    }

    if (obj) {
      canvas.add(obj);
    }
  } else if (el.type === "text") {
    const fontSize = Math.max((el.style?.fontSize || 24) * scale, 3);
    let textContent = el.content || "";

    // Apply text transform
    if (el.style?.textTransform === "uppercase") {
      textContent = textContent.toUpperCase();
    } else if (el.style?.textTransform === "lowercase") {
      textContent = textContent.toLowerCase();
    } else if (el.style?.textTransform === "capitalize") {
      textContent = textContent.replace(/\b\w/g, (c: string) => c.toUpperCase());
    }

    const textObj = new fabric.Textbox(textContent, {
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
      letterSpacing: el.style?.letterSpacing ? el.style.letterSpacing * scale : undefined,
      selectable: false,
      evented: false,
      opacity,
      angle: rotation,
    });

    // Apply text decoration
    if (el.style?.textDecoration === "underline") {
      textObj.underline = true;
    } else if (el.style?.textDecoration === "line-through") {
      textObj.linethrough = true;
    }

    // Apply shadow if defined
    if (el.style?.shadow) {
      const s = el.style.shadow;
      textObj.shadow = new fabric.Shadow({
        color: s.color || "rgba(0,0,0,0.3)",
        offsetX: (s.offsetX || 0) * scale,
        offsetY: (s.offsetY || 0) * scale,
        blur: (s.blur || 0) * scale,
      });
    }

    canvas.add(textObj);
  } else if (el.type === "group" && Array.isArray(el.children)) {
    // Render group children with offset
    for (const child of el.children) {
      try {
        const offsetChild = {
          ...child,
          position: {
            x: (el.position?.x || 0) + (child.position?.x || 0),
            y: (el.position?.y || 0) + (child.position?.y || 0),
          },
        };
        renderElement(canvas, offsetChild, scale);
      } catch {
        // Skip
      }
    }
  }
}
