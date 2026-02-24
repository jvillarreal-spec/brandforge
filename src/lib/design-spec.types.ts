// === DESIGN SPEC TYPES ===

export interface DesignSpec {
  canvas: CanvasConfig;
  elements: DesignElement[];
  metadata?: {
    name?: string;
    pieceType: PieceType;
    description?: string;
  };
}

export type PieceType =
  | "instagram_post"
  | "instagram_story"
  | "instagram_carousel"
  | "email_header"
  | "email_full"
  | "presentation_slide";

export interface CanvasConfig {
  width: number;
  height: number;
  background: BackgroundConfig;
}

export type BackgroundConfig =
  | { type: "solid"; color: string }
  | { type: "gradient"; gradient: GradientConfig }
  | { type: "image"; src: string; opacity?: number };

export interface GradientConfig {
  type: "linear" | "radial";
  angle?: number;
  stops: { offset: number; color: string }[];
}

export type DesignElement =
  | TextElement
  | ImageElement
  | ShapeElement
  | GroupElement;

interface BaseElement {
  id: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotation?: number;
  opacity?: number;
  visible?: boolean;
}

export interface TextElement extends BaseElement {
  type: "text";
  content: string;
  style: TextStyle;
}

export interface TextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: "normal" | "bold" | "light" | "medium" | "semibold";
  fontStyle?: "normal" | "italic";
  color: string;
  textAlign: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  lineHeight?: number;
  letterSpacing?: number;
  textDecoration?: "none" | "underline" | "line-through";
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
}

export interface ImageElement extends BaseElement {
  type: "image";
  src: string;
  style: {
    objectFit: "contain" | "cover" | "fill";
    borderRadius?: number;
    border?: BorderConfig;
    shadow?: ShadowConfig;
  };
}

export interface ShapeElement extends BaseElement {
  type: "shape";
  shape: "rectangle" | "circle" | "ellipse" | "line" | "triangle";
  style: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    borderRadius?: number;
    shadow?: ShadowConfig;
  };
}

export interface GroupElement extends BaseElement {
  type: "group";
  children: DesignElement[];
}

export interface BorderConfig {
  color: string;
  width: number;
  style: "solid" | "dashed" | "dotted";
}

export interface ShadowConfig {
  color: string;
  offsetX: number;
  offsetY: number;
  blur: number;
}

export interface BrandProfile {
  id: string;
  accountId: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    neutral: string;
    textPrimary: string;
    textSecondary: string;
  };
  typography: {
    heading: string;
    body: string;
  };
  style: {
    mood: string;
    keywords: string[];
    borderRadius: string;
    shadowStyle: "none" | "subtle" | "medium" | "dramatic";
  };
  logos: {
    url: string;
    variant: "full" | "icon" | "horizontal" | "monochrome";
  }[];
  status: "draft" | "confirmed";
}
