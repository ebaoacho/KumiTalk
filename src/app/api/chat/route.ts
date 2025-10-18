import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_MODEL = process.env.GEMINI_MODEL_ID ?? "gemini-2.5-flash";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const userId = formData.get("userId") as string;
    const title = formData.get("title") as string;
    const file = formData.get("file") as File;

    if (!userId || !title || !file) {
      return NextResponse.json(
        { error: "Missing userId, title or file" },
        { status: 400 }
      );
    }

    let content = "";

    if (file.type === "application/pdf") {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "Gemini API key is not configured" },
          { status: 500 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString("base64");

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

      try {
        const prompt = "Summarize the PDF in English. Highlight key points, list important steps, and include numbered bullet points when possible.";
        const result = await model.generateContent([
          {
            inlineData: {
              mimeType: "application/pdf",
              data: base64Data,
            },
          },
          prompt,
        ]);

        const response = await result.response;
        content = response.text();
      } catch (error) {
        console.error("Gemini PDF processing error:", error);
        return NextResponse.json(
          { error: "Failed to process PDF via Gemini" },
          { status: 500 }
        );
      }
    } else if (file.type === "text/plain") {
      content = await file.text();
    } else {
      return NextResponse.json(
        { error: "Only PDF or TXT files are supported" },
        { status: 400 }
      );
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: "Could not extract content from the uploaded file" },
        { status: 400 }
      );
    }

    const document = await prisma.document.create({
      data: {
        userId,
        name: file.name,
        summary:
          content.length > 1000 ? `${content.substring(0, 1000)}...` : content,
      },
    });

    const chat = await prisma.chat.create({
      data: {
        title,
        documentId: document.id,
      },
      include: {
        document: true,
      },
    });

    return NextResponse.json({
      id: chat.id,
      title: chat.title,
      fileName: document.name,
      createdAt: chat.createdAt.toISOString(),
      updatedAt: chat.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Chat creation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unknown error while creating chat",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const chats = await prisma.chat.findMany({
      include: {
        document: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    const formattedChats = chats.map((chat) => ({
      id: chat.id,
      title: chat.title,
      fileName: chat.document?.name || "",
      createdAt: chat.createdAt.toISOString(),
      updatedAt: chat.updatedAt.toISOString(),
    }));
    return NextResponse.json(formattedChats);
  } catch (error) {
    console.error("Fetch chats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch chats" },
      { status: 500 }
    );
  }
}
