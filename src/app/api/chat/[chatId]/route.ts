import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  const { chatId } = await params;

  if (!chatId) {
    return NextResponse.json(
      { error: "chatId is required" },
      { status: 400 }
    );
  }

  try {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: {
        id: true,
        documentId: true,
      },
    });

    if (!chat) {
      return NextResponse.json(
        { error: "Chat not found" },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.chat.delete({ where: { id: chatId } });

      if (chat.documentId) {
        const remainingChats = await tx.chat.count({
          where: { documentId: chat.documentId },
        });

        if (remainingChats === 0) {
          await tx.document.delete({
            where: { id: chat.documentId },
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete chat:", error);
    return NextResponse.json(
      { error: "Failed to delete chat" },
      { status: 500 }
    );
  }
}
