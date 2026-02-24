import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccountIdFromRequest } from "@/lib/auth-helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pieceId: string }> }
) {
  try {
    const accountId = getAccountIdFromRequest(req);
    if (!accountId) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const { pieceId } = await params;
    const { format } = await req.json();

    if (!format || !["png", "jpg", "html", "pptx"].includes(format)) {
      return NextResponse.json(
        { detail: "Format must be one of: png, jpg, html, pptx" },
        { status: 400 }
      );
    }

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

    // Create export record
    const exportRecord = await prisma.export.create({
      data: {
        designPieceId: pieceId,
        format,
        status: "processing",
      },
    });

    // PNG/JPG exports are handled client-side via Fabric.js
    if (format === "png" || format === "jpg") {
      await prisma.export.update({
        where: { id: exportRecord.id },
        data: { status: "completed" },
      });

      return NextResponse.json({
        export_id: exportRecord.id,
        status: "completed",
      });
    }

    // For HTML/PPTX, server-side export would happen here
    // For now, mark as completed with the design spec available
    await prisma.export.update({
      where: { id: exportRecord.id },
      data: { status: "completed" },
    });

    return NextResponse.json({
      export_id: exportRecord.id,
      status: "completed",
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err.message || "Export failed" },
      { status: 500 }
    );
  }
}
