import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { GoogleGenerativeAI } from "@google/generative-ai"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params
    
    if (!chatId) {
      return NextResponse.json({ error: 'chatId is required' }, { status: 400 })
    }
    
    const messages = await prisma.message.findMany({
      where: { chatId: chatId },
      include: {
        chat: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })
    
    return NextResponse.json(messages, { status: 200 })
  } catch (error) {
    console.error('Fetch messages error:', error)
    return NextResponse.json(
      { error: 'メッセージの取得に失敗しました' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const { chatId } = await params
    const { content } = await request.json()
    
    if (!chatId || !content) {
      return NextResponse.json(
        { error: 'chatId and content are required' },
        { status: 400 }
      )
    }

    // 1. ユーザーのメッセージを保存
    const userMessage = await prisma.message.create({
      data: { 
        chatId: chatId, 
        content: content, 
        role: "user" 
      },
      include: {
        chat: true,
      },
    })

    // 2. チャットに紐づくドキュメントを取得（コンテキストとして使用）
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: { document: true },
    })

    // 3. Gemini APIキーの確認
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set")
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      )
    }

    // 4. Gemini APIでAIの返答を生成
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" })

    // ドキュメントの内容をコンテキストとして含める
    let prompt = content.trim()
    if (chat?.document?.summary) {
      prompt = `以下はドキュメントの要約です：
${chat.document.summary}

ユーザーの質問：${content.trim()}

上記のドキュメントを参考にして、ユーザーの質問に答えてください。`
    }

    console.log("Generating AI response...")
    
    const result = await model.generateContent(prompt)
    const response = await result.response
    const aiResponseText = response.text()

    console.log("AI response:", aiResponseText)

    // 5. AIの返答を保存
    const aiMessage = await prisma.message.create({
      data: {
        chatId: chatId,
        content: aiResponseText,
        role: "assistant",
      },
      include: {
        chat: true,
      },
    })

    // 6. ユーザーメッセージとAIメッセージの両方を返す
    return NextResponse.json({
      userMessage,
      aiMessage,
    }, { status: 200 })

  } catch (error) {
    console.error('Message creation error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'メッセージの送信に失敗しました' 
      },
      { status: 500 }
    )
  }
}
