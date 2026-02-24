import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccountIdFromRequest } from "@/lib/auth-helpers";
import { callClaudeWithImages } from "@/lib/ai/client";
import { BRAND_ANALYSIS_SYSTEM_PROMPT, buildBrandAnalysisUserPrompt } from "@/lib/ai/prompts";
import { extractJsonFromResponse } from "@/lib/ai/validators";

export async function POST(req: NextRequest) {
  try {
    const accountId = getAccountIdFromRequest(req);
    if (!accountId) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const { asset_ids, company_url } = await req.json();

    if (!asset_ids || !Array.isArray(asset_ids) || asset_ids.length === 0) {
      return NextResponse.json(
        { detail: "At least one asset_id is required" },
        { status: 400 }
      );
    }

    // Fetch assets
    const assets = await prisma.brandAsset.findMany({
      where: { id: { in: asset_ids }, accountId },
    });

    if (assets.length === 0) {
      return NextResponse.json({ detail: "No assets found" }, { status: 404 });
    }

    // Build descriptions for the AI prompt
    const assetDescriptions = assets
      .map((a) => `- ${a.filename} (${a.contentType})`)
      .join("\n");

    // For now, we send the descriptions since we don't have S3 configured
    // When S3 is configured, we would download and base64 encode images
    const images: { mediaType: string; data: string }[] = [];

    let analysis;
    if (images.length > 0) {
      const userPrompt = buildBrandAnalysisUserPrompt(assetDescriptions, company_url);
      const response = await callClaudeWithImages(
        BRAND_ANALYSIS_SYSTEM_PROMPT,
        userPrompt,
        images
      );
      analysis = extractJsonFromResponse(response);
    } else {
      // Fallback: generate default brand profile based on company name
      analysis = {
        name: company_url || "My Brand",
        colors: {
          primary: "#2563EB",
          secondary: "#1E40AF",
          accent: "#F59E0B",
          neutral: "#F3F4F6",
          textPrimary: "#111827",
          textSecondary: "#6B7280",
        },
        typography: {
          heading: "Montserrat",
          body: "Open Sans",
        },
        style: {
          mood: "Modern and professional",
          keywords: ["clean", "professional", "modern"],
          borderRadius: "8px",
          shadowStyle: "subtle",
        },
      };
    }

    // Upsert brand profile
    const existing = await prisma.brandProfile.findUnique({
      where: { accountId },
    });

    let profile;
    if (existing) {
      profile = await prisma.brandProfile.update({
        where: { accountId },
        data: {
          name: analysis.name || "My Brand",
          colors: analysis.colors || {},
          typography: analysis.typography || {},
          style: analysis.style || {},
          status: "draft",
        },
      });
    } else {
      profile = await prisma.brandProfile.create({
        data: {
          accountId,
          name: analysis.name || "My Brand",
          colors: analysis.colors || {},
          typography: analysis.typography || {},
          style: analysis.style || {},
          logos: [],
          status: "draft",
        },
      });
    }

    return NextResponse.json({
      brand_profile: {
        id: profile.id,
        accountId: profile.accountId,
        name: profile.name,
        colors: profile.colors,
        typography: profile.typography,
        style: profile.style,
        logos: profile.logos,
        status: profile.status,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err.message || "Analysis failed" },
      { status: 500 }
    );
  }
}
