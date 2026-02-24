import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, createToken } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  try {
    const { email, password, company_name } = await req.json();

    if (!email || !password || !company_name) {
      return NextResponse.json(
        { detail: "Email, password, and company name are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.account.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { detail: "Email already registered" },
        { status: 400 }
      );
    }

    const account = await prisma.account.create({
      data: {
        email,
        hashedPassword: hashPassword(password),
        companyName: company_name,
      },
    });

    const token = createToken(account.id);

    return NextResponse.json({
      id: account.id,
      email: account.email,
      company_name: account.companyName,
      token,
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err.message || "Registration failed" },
      { status: 500 }
    );
  }
}
