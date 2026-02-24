import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccountIdFromRequest } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  try {
    const accountId = getAccountIdFromRequest(req);
    if (!accountId) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const pieceType = searchParams.get("piece_type");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const where: any = { accountId };
    if (pieceType) where.pieceType = pieceType;

    const [templates, total] = await Promise.all([
      prisma.designPiece.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.designPiece.count({ where }),
    ]);

    return NextResponse.json({
      templates: templates.map((t) => ({
        id: t.id,
        piece_type: t.pieceType,
        variation_style: t.variationStyle,
        design_spec: t.designSpec,
        thumbnail_url: t.thumbnailUrl,
        name: t.name,
        created_at: t.createdAt.toISOString(),
      })),
      total,
      page,
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err.message || "Failed to list templates" },
      { status: 500 }
    );
  }
}
