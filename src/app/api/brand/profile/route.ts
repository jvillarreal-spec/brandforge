import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccountIdFromRequest } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  try {
    const accountId = getAccountIdFromRequest(req);
    if (!accountId) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.brandProfile.findUnique({
      where: { accountId },
    });

    if (!profile) {
      return NextResponse.json(
        { detail: "No brand profile found" },
        { status: 404 }
      );
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
      { detail: err.message || "Failed to get profile" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const accountId = getAccountIdFromRequest(req);
    if (!accountId) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const profile = await prisma.brandProfile.findUnique({
      where: { accountId },
    });

    if (!profile) {
      return NextResponse.json(
        { detail: "No brand profile found" },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.colors !== undefined) updateData.colors = body.colors;
    if (body.typography !== undefined) updateData.typography = body.typography;
    if (body.style !== undefined) updateData.style = body.style;
    if (body.status !== undefined) updateData.status = body.status;

    const updated = await prisma.brandProfile.update({
      where: { accountId },
      data: updateData,
    });

    return NextResponse.json({
      brand_profile: {
        id: updated.id,
        accountId: updated.accountId,
        name: updated.name,
        colors: updated.colors,
        typography: updated.typography,
        style: updated.style,
        logos: updated.logos,
        status: updated.status,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err.message || "Failed to update profile" },
      { status: 500 }
    );
  }
}
