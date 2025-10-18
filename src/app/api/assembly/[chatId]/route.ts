import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params;
    if (!chatId) {
      return NextResponse.json(
        { error: "chatId is required" },
        { status: 400 }
      );
    }

    const steps = await prisma.assemblyStep.findMany({
      where: { chatId },
      orderBy: { stepIndex: "asc" },
    });

    return NextResponse.json(
      steps.map((step) => ({
        id: step.id,
        chatId: step.chatId,
        stepIndex: step.stepIndex,
        title: step.title,
        description: step.description,
        imageBase64: step.imageBase64 ?? undefined,
        parts: step.parts as Array<{
          name: string;
          description?: string;
          color: string;
        }>,
        createdAt: step.createdAt.toISOString(),
        updatedAt: step.updatedAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Fetch assembly steps error:", error);
    return NextResponse.json(
      { error: "Failed to fetch assembly steps" },
      { status: 500 }
    );
  }
}
