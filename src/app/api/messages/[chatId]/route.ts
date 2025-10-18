import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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
  const { chatId } = await params
  const { content } = await request.json()
  if (!chatId || !content) {
    return NextResponse.json({ error: 'chatId and content are required' }, { status: 400 })
  }
  const message = await prisma.message.create({
    data: { chatId: chatId, content: content, role: "user" },
    include: {
      chat: true,
    },
  })
  return NextResponse.json(message, { status: 200 })
}
