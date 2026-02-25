"use client";

import { useEffect, useRef, useState } from "react";
import * as fabric from "fabric";
import type { DesignSpec } from "@/lib/design-spec.types";

interface TemplatePreviewProps {
  designSpec: DesignSpec;
  className?: string;
}

export function TemplatePreview({ designSpec, className }: TemplatePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !designSpec?.canvas) return;

    // Clean up previous canvas
    try {
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }
    } catch {
      fabricRef.current = null;
    }

    try {
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
      setHasError(false);
    } catch (err) {
      console.error("TemplatePreview render error:", err);
      setHasError(true);
    }

    return () => {
      try {
        if (fabricRef.current) {
          fabricRef.current.dispose();
          fabricRef.current = null;
        }
      } catch {
        fabricRef.current = null;
      }
    };
  }, [designSpec]);

  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-muted text-muted-foreground text-xs p-4 ${className || ""}`}>
        <p>Preview unavailable</p>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center bg-muted overflow-hidden ${className || ""}`}>
      <canvas ref={canvasRef} style={{ maxWidth: "100%", maxHeight: "100%" }} />
    </div>
  );
}

function hexToRgb(hex: string): string {
  // Convert #RRGGBB to rgb(r, g, b) for Fabric.js gradient colorStops
  if (!hex || !hex.startsWith("#")) return hex || "rgb(0,0,0)";
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) || 0;
  const g = parseInt(clean.substring(2, 4), 16) || 0;
  const b = parseInt(clean.substring(4, 6), 16) || 0;
  return `rgb(${r},${g},${b})`;
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

    // Fabric.js 6 expects colorStops as an ARRAY of { color (rgb string), offset, opacity }
    const colorStops = stops.map((s: any) => ({
      color: hexToRgb(s.color),
      offset: typeof s.offset === "number" ? s.offset : 0,
      opacity: 1,
    }));

    let coords: any;

    if (grad.type === "linear") {
      const angle = (grad.angle || 0) * (Math.PI / 180);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const halfW = width / 2;
      const halfH = height / 2;

      coords = {
        x1: halfW - cos * halfW,
        y1: halfH - sin * halfH,
        x2: halfW + cos * halfW,
        y2: halfH + sin * halfH,
      };
    } else {
      // radial
      coords = {
        x1: width / 2,
        y1: height / 2,
        r1: 0,
        x2: width / 2,
        y2: height / 2,
        r2: Math.max(width, height) / 2,
      };
    }

    try {
      const bgRect = new fabric.Rect({
        left: 0,
        top: 0,
        width,
        height,
        selectable: false,
        evented: false,
      });

      let gradient: any;
      if (grad.type === "radial") {
        gradient = new fabric.Gradient<"radial">({
          type: "radial",
          coords: coords as { x1: number; y1: number; r1: number; x2: number; y2: number; r2: number },
          colorStops,
        });
      } else {
        gradient = new fabric.Gradient<"linear">({
          type: "linear",
          coords: coords as { x1: number; y1: number; x2: number; y2: number },
          colorStops,
        });
      }

      bgRect.fill = gradient;
      canvas.add(bgRect);
      canvas.sendObjectToBack(bgRect);
    } catch {
      // Fallback to solid color
      canvas.backgroundColor = stops[0]?.color || "#FFFFFF";
    }
  } else {
    canvas.backgroundColor = "#FFFFFF";
  }
}

function renderElement(canvas: fabric.Canvas, el: any, scale: number) {
  if (!el || !el.type) return;

  const left = (el.position?.x || 0) * scale;
  const top = (el.position?.y || 0) * scale;
  const width = Math.max((el.size?.width || 100) * scale, 1);
  const height = Math.max((el.size?.height || 100) * scale, 1);
  const opacity = el.opacity !== undefined && el.opacity !== null ? Number(el.opacity) : 1;
  const rotation = el.rotation ? Number(el.rotation) : 0;

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
      const radius = Math.max(Math.min(width, height) / 2, 1);
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
        rx: Math.max(width / 2, 1),
        ry: Math.max(height / 2, 1),
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
      obj = new fabric.Line([0, 0, width, height], {
        left,
        top,
        stroke: stroke || fill || "#000000",
        strokeWidth: Math.max(strokeWidth, 1 * scale),
        selectable: false,
        evented: false,
        opacity,
        angle: rotation,
      });
    }

    // Apply shadow if defined
    if (obj && el.style?.shadow) {
      try {
        const s = el.style.shadow;
        obj.shadow = new fabric.Shadow({
          color: s.color || "rgba(0,0,0,0.3)",
          offsetX: (s.offsetX || 0) * scale,
          offsetY: (s.offsetY || 0) * scale,
          blur: (s.blur || 0) * scale,
        });
      } catch {
        // skip shadow
      }
    }

    if (obj) {
      canvas.add(obj);
    }
  } else if (el.type === "text") {
    const fontSize = Math.max((el.style?.fontSize || 24) * scale, 3);
    let textContent = el.content || " ";

    // Apply text transform
    if (el.style?.textTransform === "uppercase") {
      textContent = textContent.toUpperCase();
    } else if (el.style?.textTransform === "lowercase") {
      textContent = textContent.toLowerCase();
    } else if (el.style?.textTransform === "capitalize") {
      textContent = textContent.replace(/\b\w/g, (c: string) => c.toUpperCase());
    }

    // Ensure textContent is not empty (fabric crashes on empty strings in some cases)
    if (!textContent || textContent.trim() === "") {
      textContent = " ";
    }

    const textOpts: any = {
      left,
      top,
      width: Math.max(width, 10),
      fontSize,
      fontFamily: el.style?.fontFamily || "Arial",
      fontWeight: el.style?.fontWeight || "normal",
      fontStyle: el.style?.fontStyle || "normal",
      fill: el.style?.color || "#000000",
      textAlign: el.style?.textAlign || "left",
      lineHeight: el.style?.lineHeight || 1.2,
      selectable: false,
      evented: false,
      opacity,
      angle: rotation,
    };

    const textObj = new fabric.Textbox(textContent, textOpts);

    // Apply text decoration
    if (el.style?.textDecoration === "underline") {
      textObj.underline = true;
    } else if (el.style?.textDecoration === "line-through") {
      textObj.linethrough = true;
    }

    // Apply shadow if defined
    if (el.style?.shadow) {
      try {
        const s = el.style.shadow;
        textObj.shadow = new fabric.Shadow({
          color: s.color || "rgba(0,0,0,0.3)",
          offsetX: (s.offsetX || 0) * scale,
          offsetY: (s.offsetY || 0) * scale,
          blur: (s.blur || 0) * scale,
        });
      } catch {
        // skip shadow
      }
    }

    canvas.add(textObj);
  } else if (el.type === "group" && Array.isArray(el.children)) {
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
