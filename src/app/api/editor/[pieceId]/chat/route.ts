import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAccountIdFromRequest } from "@/lib/auth-helpers";
import { callClaude } from "@/lib/ai/client";
import {
  DESIGN_EDITING_SYSTEM_PROMPT,
  buildDesignEditingUserPrompt,
} from "@/lib/ai/prompts";
import { extractJsonFromResponse, validateDesignEditResponse } from "@/lib/ai/validators";

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
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json(
        { detail: "Message is required" },
        { status: 400 }
      );
    }

    // Fetch design piece
    const piece = await prisma.designPiece.findFirst({
      where: { id: pieceId, accountId },
    });

    if (!piece) {
      return NextResponse.json(
        { detail: "Design piece not found" },
        { status: 404 }
      );
    }

    // Fetch brand profile
    const profile = await prisma.brandProfile.findUnique({
      where: { accountId },
    });

    const brandData = profile
      ? {
          name: profile.name,
          colors: profile.colors,
          typography: profile.typography,
          style: profile.style,
        }
      : {};

    // Fetch last 10 edits for chat history
    const historyEntries = await prisma.editHistory.findMany({
      where: { designPieceId: pieceId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const chatHistory = historyEntries
      .reverse()
      .map(
        (h) => `User: ${h.userMessage}\nAssistant: ${h.aiExplanation}`
      )
      .join("\n\n");

    // Save the current spec before edit
    const specBefore = JSON.parse(JSON.stringify(piece.designSpec));

    // Call Claude to edit design
    const userPrompt = buildDesignEditingUserPrompt(
      JSON.stringify(piece.designSpec, null, 2),
      JSON.stringify(brandData, null, 2),
      chatHistory || "No previous chat history.",
      message
    );

    const response = await callClaude(
      DESIGN_EDITING_SYSTEM_PROMPT,
      userPrompt,
      8192
    );

    let editResult = extractJsonFromResponse(response);
    const validation = validateDesignEditResponse(editResult);

    if (!validation.valid) {
      // Retry once with error context
      const retryPrompt = `${userPrompt}\n\nPrevious attempt had validation errors:\n${validation.errors.join("\n")}\n\nPlease fix these issues.`;
      const retryResponse = await callClaude(
        DESIGN_EDITING_SYSTEM_PROMPT,
        retryPrompt,
        8192
      );
      editResult = extractJsonFromResponse(retryResponse);

      const retryValidation = validateDesignEditResponse(editResult);
      if (!retryValidation.valid) {
        return NextResponse.json(
          { detail: `AI output validation failed: ${retryValidation.errors.join(", ")}` },
          { status: 422 }
        );
      }
    }

    // Update design piece
    await prisma.designPiece.update({
      where: { id: pieceId },
      data: { designSpec: editResult.design_spec },
    });

    // Save edit history
    await prisma.editHistory.create({
      data: {
        designPieceId: pieceId,
        userMessage: message,
        aiExplanation: editResult.explanation || "Design updated.",
        designSpecBefore: specBefore as any,
        designSpecAfter: editResult.design_spec,
      },
    });

    return NextResponse.json({
      design_spec: editResult.design_spec,
      explanation: editResult.explanation,
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err.message || "Chat edit failed" },
      { status: 500 }
    );
  }
}
