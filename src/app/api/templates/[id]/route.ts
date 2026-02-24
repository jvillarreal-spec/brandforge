import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccountIdFromRequest } from "@/lib/auth-helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accountId = getAccountIdFromRequest(req);
    if (!accountId) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const piece = await prisma.designPiece.findFirst({
      where: { id, accountId },
    });

    if (!piece) {
      return NextResponse.json(
        { detail: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      template: {
        id: piece.id,
        piece_type: piece.pieceType,
        variation_style: piece.variationStyle,
        design_spec: piece.designSpec,
        thumbnail_url: piece.thumbnailUrl,
        name: piece.name,
        created_at: piece.createdAt.toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err.message || "Failed to get template" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const accountId = getAccountIdFromRequest(req);
    if (!accountId) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const piece = await prisma.designPiece.findFirst({
      where: { id, accountId },
    });

    if (!piece) {
      return NextResponse.json(
        { detail: "Template not found" },
        { status: 404 }
      );
    }

    await prisma.designPiece.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err.message || "Failed to delete template" },
      { status: 500 }
    );
  }
}
