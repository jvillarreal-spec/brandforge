import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccountIdFromRequest } from "@/lib/auth-helpers";

export async function GET(req: NextRequest) {
  try {
    const accountId = getAccountIdFromRequest(req);
    if (!accountId) {
      return NextResponse.json({ detail: "Unauthorized" }, { status: 401 });
    }

    const account = await prisma.account.findUnique({
      where: { id: accountId },
      include: { brandProfile: true },
    });

    if (!account) {
      return NextResponse.json({ detail: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: account.id,
      email: account.email,
      company_name: account.companyName,
      has_brand_profile: !!account.brandProfile,
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err.message || "Failed to get user" },
      { status: 500 }
    );
  }
}
