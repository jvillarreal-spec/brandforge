import type { DesignSpec } from "./design-spec.types";

/**
 * Converts a Design Spec into a self-contained HTML file string.
 * The HTML includes all styles inline and renders as a visual representation of the design.
 */
export function designSpecToHtml(spec: DesignSpec): string {
  const { canvas, elements, metadata } = spec;
  const w = canvas.width;
  const h = canvas.height;

  // Collect fonts
  const fonts = new Set<string>();
  collectFonts(elements || [], fonts);

  // Build background CSS
  let bgCss = "#FFFFFF";
  const bg = canvas.background;
  if (bg) {
    if (bg.type === "solid" && "color" in bg) {
      bgCss = bg.color;
    } else if (bg.type === "gradient" && "gradient" in bg) {
      const grad = bg.gradient;
      const stops = grad.stops.map((s) => `${s.color} ${Math.round(s.offset * 100)}%`).join(", ");
      if (grad.type === "linear") {
        bgCss = `linear-gradient(${grad.angle || 0}deg, ${stops})`;
      } else {
        bgCss = `radial-gradient(circle, ${stops})`;
      }
    }
  }

  // Build element HTML
  const elementsHtml = (elements || []).map((el) => elementToHtml(el)).join("\n    ");

  // Google Fonts import
  const fontImport = fonts.size > 0
    ? `<link href="https://fonts.googleapis.com/css2?${Array.from(fonts).map(f => `family=${f.replace(/ /g, '+')}:wght@300;400;500;600;700`).join('&')}&display=swap" rel="stylesheet">`
    : "";

  const title = metadata?.name || "Design Export";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  ${fontImport}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f0f0; }
    .canvas-container {
      position: relative;
      width: ${w}px;
      height: ${h}px;
      background: ${bgCss};
      overflow: hidden;
    }
    .element {
      position: absolute;
    }
  </style>
</head>
<body>
  <div class="canvas-container">
    ${elementsHtml}
  </div>
</body>
</html>`;
}

function collectFonts(elements: any[], fonts: Set<string>) {
  for (const el of elements) {
    if (el.type === "text" && el.style?.fontFamily) {
      fonts.add(el.style.fontFamily);
    }
    if (el.type === "group" && Array.isArray(el.children)) {
      collectFonts(el.children, fonts);
    }
  }
}

function elementToHtml(el: any): string {
  if (!el || !el.type) return "";

  const x = el.position?.x || 0;
  const y = el.position?.y || 0;
  const w = el.size?.width || 100;
  const h = el.size?.height || 100;
  const opacity = el.opacity !== undefined ? el.opacity : 1;
  const rotation = el.rotation || 0;

  let transform = "";
  if (rotation) transform = `transform: rotate(${rotation}deg);`;

  const baseStyle = `left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px; opacity: ${opacity}; ${transform}`;

  if (el.type === "text") {
    const s = el.style || {};
    let content = el.content || "";

    if (s.textTransform === "uppercase") content = content.toUpperCase();
    else if (s.textTransform === "lowercase") content = content.toLowerCase();

    const shadow = el.style?.shadow
      ? `text-shadow: ${el.style.shadow.offsetX || 0}px ${el.style.shadow.offsetY || 0}px ${el.style.shadow.blur || 0}px ${el.style.shadow.color || "rgba(0,0,0,0.3)"};`
      : "";

    const textStyle = [
      `font-family: '${s.fontFamily || "Arial"}', sans-serif`,
      `font-size: ${s.fontSize || 16}px`,
      `font-weight: ${mapFontWeight(s.fontWeight)}`,
      `font-style: ${s.fontStyle || "normal"}`,
      `color: ${s.color || "#000000"}`,
      `text-align: ${s.textAlign || "left"}`,
      `line-height: ${s.lineHeight || 1.2}`,
      s.letterSpacing ? `letter-spacing: ${s.letterSpacing}px` : "",
      s.textDecoration && s.textDecoration !== "none" ? `text-decoration: ${s.textDecoration}` : "",
      shadow,
      `display: flex`,
      `align-items: ${s.verticalAlign === "middle" ? "center" : s.verticalAlign === "bottom" ? "flex-end" : "flex-start"}`,
      `word-wrap: break-word`,
      `overflow-wrap: break-word`,
    ].filter(Boolean).join("; ");

    return `<div class="element" style="${baseStyle} ${textStyle}">${escapeHtml(content)}</div>`;
  }

  if (el.type === "shape") {
    const s = el.style || {};
    const fill = s.fill || "transparent";
    const stroke = s.stroke ? `border: ${s.strokeWidth || 1}px solid ${s.stroke};` : "";
    const borderRadius = s.borderRadius ? `border-radius: ${s.borderRadius}px;` : "";

    const shadowCss = s.shadow
      ? `box-shadow: ${s.shadow.offsetX || 0}px ${s.shadow.offsetY || 0}px ${s.shadow.blur || 0}px ${s.shadow.color || "rgba(0,0,0,0.3)"};`
      : "";

    if (el.shape === "circle") {
      return `<div class="element" style="${baseStyle} background: ${fill}; border-radius: 50%; ${stroke} ${shadowCss}"></div>`;
    }
    if (el.shape === "ellipse") {
      return `<div class="element" style="${baseStyle} background: ${fill}; border-radius: 50%; ${stroke} ${shadowCss}"></div>`;
    }
    if (el.shape === "triangle") {
      const color = fill === "transparent" ? "transparent" : fill;
      return `<div class="element" style="${baseStyle} width: 0; height: 0; border-left: ${w / 2}px solid transparent; border-right: ${w / 2}px solid transparent; border-bottom: ${h}px solid ${color}; background: transparent;"></div>`;
    }
    // rectangle or default
    return `<div class="element" style="${baseStyle} background: ${fill}; ${borderRadius} ${stroke} ${shadowCss}"></div>`;
  }

  if (el.type === "group" && Array.isArray(el.children)) {
    const childrenHtml = el.children.map((child: any) => {
      const offsetChild = {
        ...child,
        position: {
          x: (el.position?.x || 0) + (child.position?.x || 0),
          y: (el.position?.y || 0) + (child.position?.y || 0),
        },
      };
      return elementToHtml(offsetChild);
    }).join("\n");
    return childrenHtml;
  }

  return "";
}

function mapFontWeight(weight?: string): string | number {
  switch (weight) {
    case "light": return 300;
    case "normal": return 400;
    case "medium": return 500;
    case "semibold": return 600;
    case "bold": return 700;
    default: return 400;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
