import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccountIdFromRequest } from "@/lib/auth-helpers";
import { callClaudeWithImages } from "@/lib/ai/client";
import { BRAND_ANALYSIS_SYSTEM_PROMPT, buildBrandAnalysisUserPrompt } from "@/lib/ai/prompts";
import { extractJsonFromResponse } from "@/lib/ai/validators";

export const runtime = "nodejs";
export const maxDuration = 60;

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

    // Fetch assets with file data
    const assets = await prisma.brandAsset.findMany({
      where: { id: { in: asset_ids }, accountId },
    });

    if (assets.length === 0) {
      return NextResponse.json({ detail: "No assets found" }, { status: 404 });
    }

    // Build image array from stored base64 data
    const images: { mediaType: string; data: string }[] = [];
    const assetDescriptions: string[] = [];

    for (const asset of assets) {
      assetDescriptions.push(`- ${asset.filename} (${asset.contentType})`);

      // Accept images AND PDFs for Claude analysis
      const isImage = asset.contentType.startsWith("image/");
      const isPdf = asset.contentType === "application/pdf";

      if (asset.fileData && (isImage || isPdf)) {
        images.push({
          mediaType: asset.contentType,
          data: asset.fileData,
        });
      }
    }

    let analysis;
    const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

    if (hasApiKey && images.length > 0) {
      // Use Claude Vision to analyze images
      const userPrompt = buildBrandAnalysisUserPrompt(
        assetDescriptions.join("\n"),
        company_url
      );

      try {
        const response = await callClaudeWithImages(
          BRAND_ANALYSIS_SYSTEM_PROMPT,
          userPrompt,
          images
        );
        analysis = extractJsonFromResponse(response);
      } catch (aiErr: any) {
        console.error("AI analysis failed, using fallback:", aiErr.message);
        analysis = null;
      }
    }

    // Fallback if no API key or AI failed
    if (!analysis) {
      const brandName = company_url
        ? new URL(company_url.startsWith("http") ? company_url : `https://${company_url}`).hostname
            .replace("www.", "")
            .split(".")[0]
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c: string) => c.toUpperCase())
        : "My Brand";

      analysis = {
        name: brandName,
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
    console.error("Analyze error:", err);
    return NextResponse.json(
      { detail: err.message || "Analysis failed" },
      { status: 500 }
    );
  }
}
