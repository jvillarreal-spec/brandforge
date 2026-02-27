import type { DesignSpec } from "./design-spec.types";

// Convert pixels to inches (PowerPoint uses inches, 96 DPI)
function pxToInch(px: number): number {
  return px / 96;
}

// Convert HEX color to pptxgenjs format (without #)
function hexToColor(hex?: string): string {
  if (!hex) return "000000";
  return hex.replace("#", "");
}

function mapFontWeight(weight?: string): boolean {
  return weight === "bold" || weight === "semibold";
}

/**
 * Load PptxGenJS from CDN at runtime to avoid webpack/node: protocol issues.
 */
async function loadPptxGenJS(): Promise<any> {
  // Check if already loaded
  if ((window as any).PptxGenJS) {
    return (window as any).PptxGenJS;
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js";
    script.onload = () => {
      if ((window as any).PptxGenJS) {
        resolve((window as any).PptxGenJS);
      } else {
        reject(new Error("PptxGenJS failed to load"));
      }
    };
    script.onerror = () => reject(new Error("Failed to load PptxGenJS from CDN"));
    document.head.appendChild(script);
  });
}

/**
 * Converts a Design Spec into a PPTX file and triggers download.
 */
export async function designSpecToPptx(spec: DesignSpec, filename: string): Promise<void> {
  const PptxGenJS = await loadPptxGenJS();
  const pptx = new PptxGenJS();

  const canvasW = spec.canvas.width;
  const canvasH = spec.canvas.height;

  // Set slide dimensions based on canvas
  pptx.defineLayout({
    name: "CUSTOM",
    width: pxToInch(canvasW),
    height: pxToInch(canvasH),
  });
  pptx.layout = "CUSTOM";

  const slide = pptx.addSlide();

  // Apply background
  const bg = spec.canvas.background;
  if (bg) {
    if (bg.type === "solid" && "color" in bg) {
      slide.background = { color: hexToColor(bg.color) };
    } else if (bg.type === "gradient" && "gradient" in bg) {
      const stops = bg.gradient.stops;
      if (stops && stops.length >= 2) {
        slide.background = { color: hexToColor(stops[0].color) };

        // Simulate gradient with two overlapping shapes
        try {
          slide.addShape(pptx.shapes.RECTANGLE, {
            x: 0,
            y: 0,
            w: pxToInch(canvasW),
            h: pxToInch(canvasH),
            fill: { type: "solid", color: hexToColor(stops[stops.length - 1].color) },
          });
          slide.addShape(pptx.shapes.RECTANGLE, {
            x: 0,
            y: 0,
            w: pxToInch(canvasW),
            h: pxToInch(canvasH / 2),
            fill: { type: "solid", color: hexToColor(stops[0].color) },
          });
        } catch {
          // Fallback to solid
        }
      }
    }
  }

  // Add elements
  for (const el of spec.elements || []) {
    try {
      addElementToSlide(pptx, slide, el);
    } catch {
      // Skip elements that fail
    }
  }

  // Generate and download
  await pptx.writeFile({ fileName: filename });
}

function addElementToSlide(pptx: any, slide: any, el: any): void {
  if (!el || !el.type) return;

  const x = pxToInch(el.position?.x || 0);
  const y = pxToInch(el.position?.y || 0);
  const w = pxToInch(el.size?.width || 100);
  const h = pxToInch(el.size?.height || 100);
  const rotate = el.rotation || 0;

  if (el.type === "text") {
    const s = el.style || {};
    let content = el.content || "";

    if (s.textTransform === "uppercase") content = content.toUpperCase();
    else if (s.textTransform === "lowercase") content = content.toLowerCase();

    const fontSize = Math.max(Math.round((s.fontSize || 16) * 0.75), 6);

    slide.addText(content, {
      x,
      y,
      w,
      h,
      fontSize,
      fontFace: s.fontFamily || "Arial",
      color: hexToColor(s.color),
      bold: mapFontWeight(s.fontWeight),
      italic: s.fontStyle === "italic",
      align: s.textAlign === "center" ? "center" : s.textAlign === "right" ? "right" : "left",
      valign: s.verticalAlign === "middle" ? "middle" : s.verticalAlign === "bottom" ? "bottom" : "top",
      rotate,
      transparency: el.opacity !== undefined ? Math.round((1 - el.opacity) * 100) : 0,
      wrap: true,
    });
    return;
  }

  if (el.type === "shape") {
    const s = el.style || {};
    const fill = s.fill && s.fill !== "transparent" ? hexToColor(s.fill) : undefined;
    const borderColor = s.stroke ? hexToColor(s.stroke) : undefined;
    const borderWidth = s.strokeWidth || 0;
    const borderRadius = s.borderRadius ? pxToInch(s.borderRadius) : 0;

    const shapeOpts: any = {
      x,
      y,
      w,
      h,
      rotate,
      transparency: el.opacity !== undefined ? Math.round((1 - el.opacity) * 100) : 0,
    };

    if (fill) {
      shapeOpts.fill = { type: "solid", color: fill };
    }
    if (borderColor && borderWidth > 0) {
      shapeOpts.line = { color: borderColor, width: borderWidth };
    }

    // Use pptx.shapes (CDN bundle) for shape types
    const shapes = pptx.shapes || {};

    if (el.shape === "circle" || el.shape === "ellipse") {
      slide.addShape(shapes.OVAL || "oval", shapeOpts);
    } else if (el.shape === "triangle") {
      slide.addShape(shapes.TRIANGLE || "triangle", shapeOpts);
    } else if (el.shape === "line") {
      slide.addShape(shapes.LINE || "line", {
        x,
        y,
        w,
        h: 0,
        line: { color: borderColor || fill || "000000", width: Math.max(borderWidth, 1) },
        rotate,
      });
    } else {
      // rectangle
      if (borderRadius > 0) {
        shapeOpts.rectRadius = borderRadius;
      }
      slide.addShape(shapes.RECTANGLE || "rect", shapeOpts);
    }
    return;
  }

  if (el.type === "group" && Array.isArray(el.children)) {
    for (const child of el.children) {
      const offsetChild = {
        ...child,
        position: {
          x: (el.position?.x || 0) + (child.position?.x || 0),
          y: (el.position?.y || 0) + (child.position?.y || 0),
        },
      };
      addElementToSlide(pptx, slide, offsetChild);
    }
  }
}
