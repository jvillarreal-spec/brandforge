import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccountIdFromRequest } from "@/lib/auth-helpers";
import { callClaude } from "@/lib/ai/client";
import {
  TEMPLATE_GENERATION_SYSTEM_PROMPT,
  buildTemplateGenerationUserPrompt,
  VARIATION_STYLES,
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
      const userPrompt = buildTemplateGenerationUserPrompt(
        piece_type,
        JSON.stringify(brandData, null, 2),
        config.width,
        config.height,
        variation,
        content_theme || "general branding",
        config.elementHint
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

  return {
    canvas: {
      width,
      height,
      background: { type: "solid", color: colors.neutral || "#F3F4F6" },
    },
    elements: [
      {
        type: "shape",
        id: "el_001",
        position: { x: 0, y: 0 },
        size: { width, height: height * 0.4 },
        shape: "rectangle",
        style: { fill: colors.primary || "#2563EB" },
      },
      {
        type: "text",
        id: "el_002",
        position: { x: width * 0.1, y: height * 0.15 },
        size: { width: width * 0.8, height: 80 },
        content: brand.name || "Your Brand",
        style: {
          fontFamily: typography.heading || "Montserrat",
          fontSize: Math.max(48, width * 0.05),
          fontWeight: "bold",
          color: "#FFFFFF",
          textAlign: "center",
        },
      },
      {
        type: "text",
        id: "el_003",
        position: { x: width * 0.1, y: height * 0.55 },
        size: { width: width * 0.8, height: 60 },
        content: "Your content here",
        style: {
          fontFamily: typography.body || "Open Sans",
          fontSize: Math.max(24, width * 0.025),
          fontWeight: "normal",
          color: colors.textPrimary || "#111827",
          textAlign: "center",
        },
      },
    ],
    metadata: {
      pieceType,
      name: `${pieceType} - ${variation}`,
      description: `Auto-generated ${variation} design`,
    },
  };
}
