import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";

const GEMINI_CONVERSATION_MODEL = "gemini-2.5-flash";

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

    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(messages, { status: 200 });
  } catch (error) {
    console.error("Fetch messages error:", error);
    return NextResponse.json(
      { error: "メッセージの取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params;
    const body = await request.json();
    const content = (body?.content as string | undefined)?.trim() ?? "";
    const stepIndex =
      typeof body?.stepIndex === "number" ? body.stepIndex : undefined;

    if (!chatId || content.length === 0) {
      return NextResponse.json(
        { error: "chatId and content are required" },
        { status: 400 }
      );
    }

    const [chat, userMessage] = await prisma.$transaction(async (tx) => {
      const createdMessage = await tx.message.create({
        data: {
          chatId,
          content,
          role: "user",
          stepIndex: stepIndex ?? null,
        },
      });

      const linkedChat = await tx.chat.findUnique({
        where: { id: chatId },
        include: { document: true },
      });

      return [linkedChat, createdMessage] as const;
    });

    if (!chat) {
      return NextResponse.json(
        { error: "Chat not found" },
        { status: 404 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: GEMINI_CONVERSATION_MODEL,
    });

    let prompt = "";
    if (chat.document?.summary) {
      prompt += `以下のドキュメント要約を前提として回答してください。
---
${chat.document.summary}
`;
    }

    if (typeof stepIndex === "number") {
      const assemblyStep = await prisma.assemblyStep.findFirst({
        where: { chatId, stepIndex },
      });
      if (assemblyStep) {
        const parts =
          (assemblyStep.parts as Array<{
            name: string;
            description?: string;
            color: string;
          }>) ?? [];
        prompt += `
--- フォーカスすべき組立ステップ (${assemblyStep.stepIndex}) ---
タイトル: ${assemblyStep.title}
説明: ${assemblyStep.description}
部品:
${parts
  .map(
    (part) =>
      `- ${part.name} (色: ${part.color}${
        part.description ? `, メモ: ${part.description}` : ""
      })`
  )
  .join("\n")}
`;
      }
    }

    prompt += `
--- ユーザーからの質問 ---
${content}

回答方針:
- 常に日本語で、具体的かつ丁寧に説明する。
- 安全上の注意や確認ポイントがあれば箇条書きで補足する。
- ステップ外の質問であっても、ドキュメント知識を活かして有用な助言を行う。
- 不明点があれば、その旨とユーザーが確認すべき事項を提案する。
`;

    const completion = await model.generateContent(prompt);
    const aiText = completion.response?.text() ?? "申し訳ありません。回答を生成できませんでした。";

    const aiMessage = await prisma.message.create({
      data: {
        chatId,
        content: aiText,
        role: "assistant",
        stepIndex: stepIndex ?? null,
      },
    });

    return NextResponse.json(
      {
        userMessage,
        aiMessage,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Message creation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "メッセージの送信に失敗しました",
      },
      { status: 500 }
    );
  }
}
