import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccountIdFromRequest } from "@/lib/auth-helpers";

function detectAssetType(contentType: string): string {
  if (contentType.startsWith("image/")) return "image";
  if (contentType.includes("pdf")) return "pdf";
  if (contentType.includes("presentation") || contentType.includes("pptx")) return "pptx";
  return "image";
}

export async function POST(req: NextRequest) {
  try {
    const accountId = getAccountIdFromRequest(req);
    if (!accountId) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { detail: "At least one file is required" },
        { status: 400 }
      );
    }

    const assetIds: string[] = [];

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const contentType = file.type || "application/octet-stream";

      // Store file reference in DB (S3 upload would happen here when configured)
      const s3Key = `brand_${accountId}/assets/${Date.now()}_${file.name}`;

      const asset = await prisma.brandAsset.create({
        data: {
          accountId,
          filename: file.name,
          s3Key,
          contentType,
          fileSize: bytes.byteLength,
          assetType: detectAssetType(contentType),
        },
      });

      assetIds.push(asset.id);
    }

    return NextResponse.json({
      asset_ids: assetIds,
      message: `Successfully uploaded ${assetIds.length} file(s)`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err.message || "Upload failed" },
      { status: 500 }
    );
  }
}
