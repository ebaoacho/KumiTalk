import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      )
    }

    const chats = await prisma.chat.findMany({
      where: {
        document: {
          userId: userId
        }
      },
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
