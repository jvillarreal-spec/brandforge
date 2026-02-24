import * as fabric from "fabric";
import {
  DesignSpec,
  DesignElement,
  TextElement,
  ImageElement,
  ShapeElement,
  GroupElement,
  BackgroundConfig,
  GradientConfig,
} from "./design-spec.types";

const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700" +
  "&family=Open+Sans:wght@300;400;600;700&family=Roboto:wght@300;400;500;700" +
  "&family=Poppins:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700" +
  "&family=Lato:wght@300;400;700&family=Playfair+Display:wght@400;700" +
  "&family=Raleway:wght@300;400;600;700&family=Nunito:wght@300;400;600;700" +
  "&family=Oswald:wght@300;400;600;700&family=Merriweather:wght@300;400;700" +
  "&family=Source+Sans+Pro:wght@300;400;600;700&display=swap";

const FONT_WEIGHT_MAP: Record<string, number> = {
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

async function loadGoogleFonts(fontFamilies: string[]): Promise<void> {
  if (typeof document === "undefined") return;

  const existing = document.querySelector('link[data-brandforge-fonts]');
  if (!existing) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = GOOGLE_FONTS_URL;
    link.setAttribute("data-brandforge-fonts", "true");
    document.head.appendChild(link);
  }

  const loadPromises = fontFamilies.map((family) => {
    return document.fonts
      .load(`16px "${family}"`)
      .catch(() => console.warn(`Failed to load font: ${family}`));
  });

  await Promise.all(loadPromises);
  await document.fonts.ready;
}

function collectFonts(elements: DesignElement[]): string[] {
  const fonts = new Set<string>();
  for (const el of elements) {
    if (el.type === "text") {
      fonts.add(el.style.fontFamily);
    } else if (el.type === "group") {
      collectFonts(el.children).forEach((f) => fonts.add(f));
    }
  }
  return Array.from(fonts);
}

function applyBackground(
  canvas: fabric.Canvas,
  background: BackgroundConfig
): void {
  if (background.type === "solid") {
    canvas.backgroundColor = background.color;
  } else if (background.type === "gradient") {
    const g = background.gradient;
    const gradientConfig: any = {
      colorStops: g.stops.reduce(
        (acc, stop) => {
          acc[stop.offset] = stop.color;
          return acc;
        },
        {} as Record<number, string>
      ),
    };

    if (g.type === "linear") {
      const angle = ((g.angle || 0) * Math.PI) / 180;
      const w = canvas.width || 1;
      const h = canvas.height || 1;
      gradientConfig.type = "linear";
      gradientConfig.coords = {
        x1: w / 2 - (Math.cos(angle) * w) / 2,
        y1: h / 2 - (Math.sin(angle) * h) / 2,
        x2: w / 2 + (Math.cos(angle) * w) / 2,
        y2: h / 2 + (Math.sin(angle) * h) / 2,
      };
    } else {
      gradientConfig.type = "radial";
      const w = canvas.width || 1;
      const h = canvas.height || 1;
      gradientConfig.coords = {
        x1: w / 2,
        y1: h / 2,
        r1: 0,
        x2: w / 2,
        y2: h / 2,
        r2: Math.max(w, h) / 2,
      };
    }

    const grad = new fabric.Gradient(gradientConfig);
    canvas.backgroundColor = grad as any;
  }
}

function createTextObject(el: TextElement): fabric.Textbox {
  const textbox = new fabric.Textbox(el.content, {
    left: el.position.x,
    top: el.position.y,
    width: el.size.width,
    height: el.size.height,
    fontFamily: el.style.fontFamily,
    fontSize: el.style.fontSize,
    fontWeight: FONT_WEIGHT_MAP[el.style.fontWeight] || 400,
    fontStyle: el.style.fontStyle || "normal",
    fill: el.style.color,
    textAlign: el.style.textAlign,
    lineHeight: el.style.lineHeight || 1.4,
    charSpacing: (el.style.letterSpacing || 0) * 10,
    angle: el.rotation || 0,
    opacity: el.opacity ?? 1,
    visible: el.visible ?? true,
    selectable: true,
    evented: true,
  });

  if (el.style.textDecoration === "underline") {
    textbox.set("underline", true);
  } else if (el.style.textDecoration === "line-through") {
    textbox.set("linethrough", true);
  }

  return textbox;
}

async function createImageObject(
  el: ImageElement,
  assetResolver: (src: string) => Promise<string>
): Promise<fabric.Image> {
  const url = await assetResolver(el.src);
  return new Promise((resolve, reject) => {
    fabric.Image.fromURL(
      url,
      { crossOrigin: "anonymous" }
    ).then((img) => {
      const scaleX = el.size.width / (img.width || 1);
      const scaleY = el.size.height / (img.height || 1);

      img.set({
        left: el.position.x,
        top: el.position.y,
        scaleX,
        scaleY,
        angle: el.rotation || 0,
        opacity: el.opacity ?? 1,
        visible: el.visible ?? true,
        selectable: true,
        evented: true,
      });

      if (el.style.borderRadius) {
        img.set(
          "clipPath",
          new fabric.Rect({
            width: el.size.width,
            height: el.size.height,
            rx: el.style.borderRadius,
            ry: el.style.borderRadius,
            left: -el.size.width / 2,
            top: -el.size.height / 2,
          })
        );
      }

      if (el.style.shadow) {
        img.set(
          "shadow",
          new fabric.Shadow({
            color: el.style.shadow.color,
            offsetX: el.style.shadow.offsetX,
            offsetY: el.style.shadow.offsetY,
            blur: el.style.shadow.blur,
          })
        );
      }

      resolve(img);
    }).catch(reject);
  });
}

function createShapeObject(el: ShapeElement): fabric.FabricObject {
  const baseProps: any = {
    left: el.position.x,
    top: el.position.y,
    width: el.size.width,
    height: el.size.height,
    fill: el.style.fill || "transparent",
    stroke: el.style.stroke || undefined,
    strokeWidth: el.style.strokeWidth || 0,
    angle: el.rotation || 0,
    opacity: el.opacity ?? 1,
    visible: el.visible ?? true,
    selectable: true,
    evented: true,
  };

  if (el.style.shadow) {
    baseProps.shadow = new fabric.Shadow({
      color: el.style.shadow.color,
      offsetX: el.style.shadow.offsetX,
      offsetY: el.style.shadow.offsetY,
      blur: el.style.shadow.blur,
    });
  }

  switch (el.shape) {
    case "rectangle":
      return new fabric.Rect({
        ...baseProps,
        rx: el.style.borderRadius || 0,
        ry: el.style.borderRadius || 0,
      });

    case "circle": {
      const radius = Math.min(el.size.width, el.size.height) / 2;
      return new fabric.Circle({
        ...baseProps,
        radius,
        width: undefined,
        height: undefined,
      });
    }

    case "ellipse":
      return new fabric.Ellipse({
        ...baseProps,
        rx: el.size.width / 2,
        ry: el.size.height / 2,
        width: undefined,
        height: undefined,
      });

    case "triangle":
      return new fabric.Triangle(baseProps);

    case "line":
      return new fabric.Line(
        [
          el.position.x,
          el.position.y,
          el.position.x + el.size.width,
          el.position.y + el.size.height,
        ],
        {
          stroke: el.style.stroke || el.style.fill || "#000000",
          strokeWidth: el.style.strokeWidth || 1,
          angle: el.rotation || 0,
          opacity: el.opacity ?? 1,
          visible: el.visible ?? true,
          selectable: true,
          evented: true,
        }
      );

    default:
      return new fabric.Rect(baseProps);
  }
}

async function createFabricObject(
  el: DesignElement,
  assetResolver: (src: string) => Promise<string>
): Promise<fabric.FabricObject> {
  switch (el.type) {
    case "text":
      return createTextObject(el);
    case "image":
      return await createImageObject(el, assetResolver);
    case "shape":
      return createShapeObject(el);
    case "group": {
      const children = await Promise.all(
        el.children.map((child) => createFabricObject(child, assetResolver))
      );
      return new fabric.Group(children, {
        left: el.position.x,
        top: el.position.y,
        angle: el.rotation || 0,
        opacity: el.opacity ?? 1,
        visible: el.visible ?? true,
        selectable: true,
        evented: true,
      });
    }
    default:
      throw new Error(`Unknown element type: ${(el as any).type}`);
  }
}

export async function renderDesignSpec(
  canvas: fabric.Canvas,
  spec: DesignSpec,
  assetResolver: (src: string) => Promise<string>
): Promise<void> {
  canvas.clear();

  canvas.setDimensions({
    width: spec.canvas.width,
    height: spec.canvas.height,
  });

  applyBackground(canvas, spec.canvas.background);

  const fonts = collectFonts(spec.elements);
  if (fonts.length > 0) {
    await loadGoogleFonts(fonts);
  }

  for (const el of spec.elements) {
    try {
      const obj = await createFabricObject(el, assetResolver);
      (obj as any).designElementId = el.id;
      canvas.add(obj);
    } catch (err) {
      console.error(`Failed to render element ${el.id}:`, err);
    }
  }

  canvas.renderAll();
}

export function exportCanvasToImage(
  canvas: fabric.Canvas,
  format: "png" | "jpeg",
  quality?: number
): string {
  return canvas.toDataURL({
    format,
    quality: quality || 1,
    multiplier: 1,
  });
}

export function exportCanvasToBlob(
  canvas: fabric.Canvas,
  format: "png" | "jpeg",
  quality?: number
): Promise<Blob> {
  return new Promise((resolve) => {
    const dataUrl = exportCanvasToImage(canvas, format, quality);
    const byteString = atob(dataUrl.split(",")[1]);
    const mimeType = format === "png" ? "image/png" : "image/jpeg";
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    resolve(new Blob([ab], { type: mimeType }));
  });
}
