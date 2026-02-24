import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccountIdFromRequest } from "@/lib/auth-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pieceId: string; editId: string }> }
) {
  try {
    const accountId = getAccountIdFromRequest(req);
    if (!accountId) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const { pieceId, editId } = await params;

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

    // Find the edit entry
    const edit = await prisma.editHistory.findFirst({
      where: { id: editId, designPieceId: pieceId },
    });

    if (!edit) {
      return NextResponse.json(
        { detail: "Edit not found" },
        { status: 404 }
      );
    }

    // Revert to the spec before this edit
    await prisma.designPiece.update({
      where: { id: pieceId },
      data: { designSpec: edit.designSpecBefore as any },
    });

    return NextResponse.json({
      design_spec: edit.designSpecBefore,
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err.message || "Revert failed" },
      { status: 500 }
    );
  }
}
