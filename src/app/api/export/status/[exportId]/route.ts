import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccountIdFromRequest } from "@/lib/auth-helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ exportId: string }> }
) {
  try {
    const accountId = getAccountIdFromRequest(req);
    if (!accountId) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const { exportId } = await params;

    const exportRecord = await prisma.export.findUnique({
      where: { id: exportId },
    });

    if (!exportRecord) {
      return NextResponse.json(
        { detail: "Export not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: exportRecord.status,
      download_url: exportRecord.s3Key || null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err.message || "Failed to get export status" },
      { status: 500 }
    );
  }
}
