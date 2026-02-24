import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccountIdFromRequest } from "@/lib/auth-helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ pieceId: string }> }
) {
  try {
    const accountId = getAccountIdFromRequest(req);
    if (!accountId) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const { pieceId } = await params;

    // Verify piece belongs to user
    const piece = await prisma.designPiece.findFirst({
      where: { id: pieceId, accountId },
    });

    if (!piece) {
      return NextResponse.json(
        { detail: "Design piece not found" },
        { status: 404 }
      );
    }

    const edits = await prisma.editHistory.findMany({
      where: { designPieceId: pieceId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      edits: edits.map((e) => ({
        id: e.id,
        user_message: e.userMessage,
        ai_explanation: e.aiExplanation,
        created_at: e.createdAt.toISOString(),
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err.message || "Failed to get history" },
      { status: 500 }
    );
  }
}
