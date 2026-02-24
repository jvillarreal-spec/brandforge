import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, createToken } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { detail: "Email and password are required" },
        { status: 400 }
      );
    }

    const account = await prisma.account.findUnique({ where: { email } });
    if (!account || !verifyPassword(password, account.hashedPassword)) {
      return NextResponse.json(
        { detail: "Invalid email or password" },
        { status: 401 }
      );
    }

    const token = createToken(account.id);

    const brandProfile = await prisma.brandProfile.findUnique({
      where: { accountId: account.id },
    });

    return NextResponse.json({
      token,
      user: {
        id: account.id,
        email: account.email,
        company_name: account.companyName,
        has_brand_profile: !!brandProfile,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err.message || "Login failed" },
      { status: 500 }
    );
  }
}
