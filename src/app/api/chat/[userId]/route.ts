import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    if (!userId) {
      return NextResponse.json(
        { error: "ユーザーIDが必要です" },
        { status: 400 }
      );
    }

    const chats = await prisma.chat.findMany({
      where: {
        document: {
          userId,
        },
      },
      include: {
        document: true,
        assemblySteps: {
          select: {
            id: true,
            stepIndex: true,
          },
          orderBy: { stepIndex: "asc" },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedChats = chats.map((chat) => ({
      id: chat.id,
      title: chat.title,
      fileName: chat.document?.name ?? "",
      createdAt: chat.createdAt.toISOString(),
      updatedAt: chat.updatedAt.toISOString(),
      assemblyStepCount: chat.assemblySteps.length,
    }));

    return NextResponse.json(formattedChats);
  } catch (error) {
    console.error("Fetch chats error:", error);
    return NextResponse.json(
      { error: "チャットの取得に失敗しました" },
      { status: 500 }
    );
  }
}
