import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccountIdFromRequest } from "@/lib/auth-helpers";
import { callClaude } from "@/lib/ai/client";
import {
  TEMPLATE_GENERATION_SYSTEM_PROMPT,
  buildTemplateGenerationUserPrompt,
  VARIATION_STYLES,
  VARIATION_STYLE_DESCRIPTIONS,
  PIECE_TYPE_CONFIGS,
} from "@/lib/ai/prompts";
import { extractJsonFromResponse, validateDesignSpec } from "@/lib/ai/validators";

export async function POST(req: NextRequest) {
  try {
    const accountId = getAccountIdFromRequest(req);
    if (!accountId) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const { piece_type, content_theme } = await req.json();

    if (!piece_type) {
      return NextResponse.json(
        { detail: "piece_type is required" },
        { status: 400 }
      );
    }

    // Fetch confirmed brand profile
    const profile = await prisma.brandProfile.findUnique({
      where: { accountId },
    });

    if (!profile || profile.status !== "confirmed") {
      return NextResponse.json(
        { detail: "Brand profile must be confirmed before generating templates" },
        { status: 400 }
      );
    }

    const brandData = {
      name: profile.name,
      colors: profile.colors,
      typography: profile.typography,
      style: profile.style,
    };

    const config = PIECE_TYPE_CONFIGS[piece_type];
    if (!config) {
      return NextResponse.json(
        { detail: `Unknown piece type: ${piece_type}` },
        { status: 400 }
      );
    }

    const templates = [];

    for (const variation of VARIATION_STYLES) {
      const variationDesc = VARIATION_STYLE_DESCRIPTIONS[variation] || "";
      const userPrompt = buildTemplateGenerationUserPrompt(
        piece_type,
        JSON.stringify(brandData, null, 2),
        config.width,
        config.height,
        variation,
        content_theme || "general branding",
        config.elementHint,
        variationDesc
      );

      let spec: any;
      let retried = false;

      try {
        const response = await callClaude(
          TEMPLATE_GENERATION_SYSTEM_PROMPT,
          userPrompt,
          8192
        );
        spec = extractJsonFromResponse(response);
        const validation = validateDesignSpec(spec);

        if (!validation.valid && !retried) {
          // Retry once with error context
          retried = true;
          const retryPrompt = `${userPrompt}\n\nPrevious attempt had validation errors:\n${validation.errors.join("\n")}\n\nPlease fix these issues and return a valid Design Spec.`;
          const retryResponse = await callClaude(
            TEMPLATE_GENERATION_SYSTEM_PROMPT,
            retryPrompt,
            8192
          );
          spec = extractJsonFromResponse(retryResponse);
        }
      } catch (aiErr: any) {
        // If AI fails, create a minimal valid spec
        spec = createFallbackSpec(config.width, config.height, piece_type, variation, brandData);
      }

      const piece = await prisma.designPiece.create({
        data: {
          accountId,
          pieceType: piece_type,
          variationStyle: variation,
          designSpec: spec,
          name: `${piece_type} - ${variation}`,
        },
      });

      templates.push({
        id: piece.id,
        piece_type: piece.pieceType,
        variation_style: piece.variationStyle,
        design_spec: piece.designSpec,
        thumbnail_url: null,
        name: piece.name,
        created_at: piece.createdAt.toISOString(),
      });
    }

    return NextResponse.json({ templates });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err.message || "Template generation failed" },
      { status: 500 }
    );
  }
}

function createFallbackSpec(
  width: number,
  height: number,
  pieceType: string,
  variation: string,
  brand: any
) {
  const colors = brand.colors || {};
  const typography = brand.typography || {};
  const primary = colors.primary || "#2563EB";
  const secondary = colors.secondary || "#1E40AF";
  const accent = colors.accent || "#F59E0B";
  const neutral = colors.neutral || "#F3F4F6";
  const textPrimary = colors.textPrimary || "#111827";
  const heading = typography.heading || "Montserrat";
  const body = typography.body || "Open Sans";
  const brandName = brand.name || "Your Brand";

  switch (variation) {
    case "bold_and_impactful":
      return {
        canvas: { width, height, background: { type: "gradient", gradient: { type: "linear", angle: 135, stops: [{ offset: 0, color: primary }, { offset: 1, color: secondary }] } } },
        elements: [
          { type: "shape", id: "el_001", position: { x: -100, y: height * 0.6 }, size: { width: width * 0.6, height: width * 0.6 }, shape: "circle", style: { fill: accent }, opacity: 0.15 },
          { type: "shape", id: "el_002", position: { x: 0, y: height * 0.75 }, size: { width, height: height * 0.25 }, shape: "rectangle", style: { fill: secondary }, opacity: 0.5 },
          { type: "text", id: "el_003", position: { x: 60, y: height * 0.15 }, size: { width: width - 120, height: 150 }, content: brandName.toUpperCase(), style: { fontFamily: heading, fontSize: Math.max(72, width * 0.08), fontWeight: "bold", color: "#FFFFFF", textAlign: "left", textTransform: "uppercase" } },
          { type: "shape", id: "el_004", position: { x: 60, y: height * 0.42 }, size: { width: 120, height: 8 }, shape: "rectangle", style: { fill: accent } },
          { type: "text", id: "el_005", position: { x: 60, y: height * 0.48 }, size: { width: width - 120, height: 80 }, content: "Making an impact", style: { fontFamily: body, fontSize: Math.max(32, width * 0.035), fontWeight: "normal", color: "#FFFFFF", textAlign: "left" } },
          { type: "shape", id: "el_006", position: { x: width * 0.7, y: -50 }, size: { width: 200, height: 200 }, shape: "circle", style: { fill: accent }, opacity: 0.2 },
        ],
        metadata: { pieceType, name: `${pieceType} - Bold`, description: "Bold and impactful design" },
      };

    case "clean_and_minimal":
      return {
        canvas: { width, height, background: { type: "solid", color: "#FFFFFF" } },
        elements: [
          { type: "shape", id: "el_001", position: { x: 40, y: 40 }, size: { width: width - 80, height: height - 80 }, shape: "rectangle", style: { fill: "transparent", stroke: neutral, strokeWidth: 1 } },
          { type: "text", id: "el_002", position: { x: width * 0.15, y: height * 0.3 }, size: { width: width * 0.7, height: 100 }, content: brandName, style: { fontFamily: heading, fontSize: Math.max(42, width * 0.04), fontWeight: "light", color: textPrimary, textAlign: "center" } },
          { type: "shape", id: "el_003", position: { x: width * 0.4, y: height * 0.48 }, size: { width: width * 0.2, height: 2 }, shape: "rectangle", style: { fill: primary } },
          { type: "text", id: "el_004", position: { x: width * 0.2, y: height * 0.55 }, size: { width: width * 0.6, height: 60 }, content: "Elegant simplicity", style: { fontFamily: body, fontSize: Math.max(18, width * 0.018), fontWeight: "normal", color: colors.textSecondary || "#6B7280", textAlign: "center" } },
          { type: "shape", id: "el_005", position: { x: width * 0.45, y: height * 0.72 }, size: { width: 16, height: 16 }, shape: "circle", style: { fill: primary } },
        ],
        metadata: { pieceType, name: `${pieceType} - Minimal`, description: "Clean and minimal design" },
      };

    case "informative_and_structured":
      return {
        canvas: { width, height, background: { type: "solid", color: "#FFFFFF" } },
        elements: [
          { type: "shape", id: "el_001", position: { x: 0, y: 0 }, size: { width, height: height * 0.35 }, shape: "rectangle", style: { fill: primary } },
          { type: "text", id: "el_002", position: { x: 60, y: height * 0.08 }, size: { width: width - 120, height: 80 }, content: brandName, style: { fontFamily: heading, fontSize: Math.max(44, width * 0.045), fontWeight: "bold", color: "#FFFFFF", textAlign: "left" } },
          { type: "text", id: "el_003", position: { x: 60, y: height * 0.2 }, size: { width: width - 120, height: 50 }, content: "Key information here", style: { fontFamily: body, fontSize: Math.max(20, width * 0.02), fontWeight: "normal", color: "#FFFFFF", textAlign: "left" } },
          { type: "shape", id: "el_004", position: { x: 60, y: height * 0.42 }, size: { width: width - 120, height: 2 }, shape: "rectangle", style: { fill: neutral } },
          { type: "shape", id: "el_005", position: { x: 60, y: height * 0.48 }, size: { width: 12, height: 12 }, shape: "circle", style: { fill: accent } },
          { type: "text", id: "el_006", position: { x: 90, y: height * 0.475 }, size: { width: width - 150, height: 40 }, content: "Feature one — Quality content", style: { fontFamily: body, fontSize: Math.max(18, width * 0.018), fontWeight: "normal", color: textPrimary, textAlign: "left" } },
          { type: "shape", id: "el_007", position: { x: 60, y: height * 0.56 }, size: { width: 12, height: 12 }, shape: "circle", style: { fill: accent } },
          { type: "text", id: "el_008", position: { x: 90, y: height * 0.555 }, size: { width: width - 150, height: 40 }, content: "Feature two — Professional design", style: { fontFamily: body, fontSize: Math.max(18, width * 0.018), fontWeight: "normal", color: textPrimary, textAlign: "left" } },
          { type: "shape", id: "el_009", position: { x: width * 0.2, y: height * 0.78 }, size: { width: width * 0.6, height: 56 }, shape: "rectangle", style: { fill: primary, borderRadius: 28 } },
          { type: "text", id: "el_010", position: { x: width * 0.2, y: height * 0.79 }, size: { width: width * 0.6, height: 44 }, content: "Learn More", style: { fontFamily: heading, fontSize: Math.max(20, width * 0.02), fontWeight: "semibold", color: "#FFFFFF", textAlign: "center" } },
        ],
        metadata: { pieceType, name: `${pieceType} - Structured`, description: "Informative and structured layout" },
      };

    case "creative_and_dynamic":
      return {
        canvas: { width, height, background: { type: "gradient", gradient: { type: "radial", stops: [{ offset: 0, color: secondary }, { offset: 1, color: primary }] } } },
        elements: [
          { type: "shape", id: "el_001", position: { x: width * 0.5, y: -100 }, size: { width: width * 0.7, height: width * 0.7 }, shape: "circle", style: { fill: accent }, opacity: 0.15, rotation: 0 },
          { type: "shape", id: "el_002", position: { x: -50, y: height * 0.4 }, size: { width: width * 0.5, height: height * 0.4 }, shape: "triangle", style: { fill: primary }, opacity: 0.3, rotation: 15 },
          { type: "shape", id: "el_003", position: { x: width * 0.6, y: height * 0.6 }, size: { width: 200, height: 200 }, shape: "rectangle", style: { fill: accent }, opacity: 0.2, rotation: 45 },
          { type: "text", id: "el_004", position: { x: width * 0.08, y: height * 0.2 }, size: { width: width * 0.84, height: 120 }, content: brandName, style: { fontFamily: heading, fontSize: Math.max(64, width * 0.065), fontWeight: "bold", color: "#FFFFFF", textAlign: "center" }, rotation: -3 },
          { type: "shape", id: "el_005", position: { x: width * 0.3, y: height * 0.45 }, size: { width: width * 0.4, height: 4 }, shape: "rectangle", style: { fill: accent } },
          { type: "text", id: "el_006", position: { x: width * 0.1, y: height * 0.52 }, size: { width: width * 0.8, height: 60 }, content: "Think different. Be creative.", style: { fontFamily: body, fontSize: Math.max(24, width * 0.025), fontWeight: "normal", color: "#FFFFFF", textAlign: "center" } },
          { type: "shape", id: "el_007", position: { x: width * 0.75, y: height * 0.05 }, size: { width: 80, height: 80 }, shape: "circle", style: { fill: "#FFFFFF" }, opacity: 0.1 },
          { type: "shape", id: "el_008", position: { x: 30, y: height * 0.85 }, size: { width: 60, height: 60 }, shape: "rectangle", style: { fill: accent }, opacity: 0.4, rotation: 30 },
        ],
        metadata: { pieceType, name: `${pieceType} - Creative`, description: "Creative and dynamic design" },
      };

    default:
      return {
        canvas: { width, height, background: { type: "solid", color: neutral } },
        elements: [
          { type: "shape", id: "el_001", position: { x: 0, y: 0 }, size: { width, height: height * 0.4 }, shape: "rectangle", style: { fill: primary } },
          { type: "text", id: "el_002", position: { x: width * 0.1, y: height * 0.15 }, size: { width: width * 0.8, height: 80 }, content: brandName, style: { fontFamily: heading, fontSize: Math.max(48, width * 0.05), fontWeight: "bold", color: "#FFFFFF", textAlign: "center" } },
          { type: "text", id: "el_003", position: { x: width * 0.1, y: height * 0.55 }, size: { width: width * 0.8, height: 60 }, content: "Your content here", style: { fontFamily: body, fontSize: Math.max(24, width * 0.025), fontWeight: "normal", color: textPrimary, textAlign: "center" } },
        ],
        metadata: { pieceType, name: `${pieceType} - ${variation}`, description: `Auto-generated ${variation} design` },
      };
  }
}
