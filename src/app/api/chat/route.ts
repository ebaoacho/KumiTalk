import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const userId = formData.get('userId') as string
    const title = formData.get('title') as string
    const file = formData.get('file') as File

    if (!userId || !title || !file) {
      return NextResponse.json(
        { error: 'ユーザーID、タイトル、ファイルが必要です' },
        { status: 400 }
      )
    }

    let content = ''
    let fileData = null

    // ファイルタイプに応じて処理を分ける
    if (file.type === 'application/pdf') {
      // PDFの場合はGemini APIで直接処理するため、バイナリデータを保持
      console.log('Processing PDF file:', file.name)
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      
      // Gemini APIにPDFを送信してテキストを抽出
      const apiKey = process.env.GEMINI_API_KEY
      if (!apiKey) {
        return NextResponse.json(
          { error: 'API key not configured' },
          { status: 500 }
        )
      }

      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

      try {
        // PDFをBase64エンコード
        const base64Data = Buffer.from(bytes).toString('base64')
        
        const result = await model.generateContent([
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: base64Data
            }
          },
          'このPDFドキュメントの内容を要約してください。'
        ])
        
        const response = await result.response
        content = response.text()
        console.log('PDF content extracted via Gemini API')
      } catch (error) {
        console.error('PDF processing error:', error)
        return NextResponse.json(
          { error: 'PDFの読み込みに失敗しました' },
          { status: 400 }
        )
      }
    } else if (file.type === 'text/plain') {
      // テキストファイルの場合
      console.log('Processing TXT file:', file.name)
      content = await file.text()
    } else {
      return NextResponse.json(
        { error: 'PDFまたはテキストファイルのみ対応しています' },
        { status: 400 }
      )
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'ファイルから内容を読み取れませんでした' },
        { status: 400 }
      )
    }

    // Create document first
    const document = await prisma.document.create({
      data: {
        userId,
        name: file.name,
        summary: content.length > 1000 ? content.substring(0, 1000) + '...' : content,
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
      { error: error instanceof Error ? error.message : 'チャットの作成に失敗しました' },
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
