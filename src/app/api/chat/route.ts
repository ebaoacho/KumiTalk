import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, title, fileName, content } = body

    if (!userId || !title || !fileName || !content) {
      return NextResponse.json(
        { error: 'ユーザーID、タイトル、ファイル名、内容が必要です' },
        { status: 400 }
      )
    }

    // Create document first
    const document = await prisma.document.create({
      data: {
        userId,
        name: fileName,
        summary: content.length > 200 ? content.substring(0, 200) + '...' : content,
      },
    })

    // Create chat associated with the document
    const chat = await prisma.chat.create({
      data: {
        title,
        documentId: document.id,
      },
      include: {
        document: true,
      },
    })

    // Return chat with fileName for frontend
    return NextResponse.json({
      id: chat.id,
      title: chat.title,
      fileName: document.name,
      createdAt: chat.createdAt.toISOString(),
      updatedAt: chat.updatedAt.toISOString(),
    })

  } catch (error) {
    console.error('Chat creation error:', error)
    return NextResponse.json(
      { error: 'チャットの作成に失敗しました' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const chats = await prisma.chat.findMany({
      include: {
        document: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const formattedChats = chats.map(chat => ({
      id: chat.id,
      title: chat.title,
      fileName: chat.document?.name || '',
      createdAt: chat.createdAt.toISOString(),
      updatedAt: chat.updatedAt.toISOString(),
    }))

    return NextResponse.json(formattedChats)
  } catch (error) {
    console.error('Fetch chats error:', error)
    return NextResponse.json(
      { error: 'チャットの取得に失敗しました' },
      { status: 500 }
    )
  }
}
