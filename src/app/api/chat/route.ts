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
    let assemblyPages: number[] = []
    let pdfBase64 = ''
    let pageImageUrls: string[] = [] // 新規追加

    if (file.type === 'application/pdf') {
      console.log('Processing PDF file:', file.name)
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      
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
        pdfBase64 = Buffer.from(bytes).toString('base64')
        
        console.log('Analyzing PDF with Gemini...')
        
        // まず、部品と組立ページを特定
        const result = await model.generateContent([
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: pdfBase64
            }
          },
          `このPDFは組立説明書です。以下の情報を提供してください：

1. ドキュメント全体の要約
2. 「部品」または「部品一覧」「Parts」が記載されているページ番号（1から始まる）
3. 「組み立てかた」「組立手順」「Assembly Instructions」が記載されているページ番号（1から始まる）

表紙、注意事項、連絡先などのページは除外してください。
実際に部品の図や組立手順の図解があるページのみを含めてください。

必ず以下のJSON形式で回答してください：
{
  "summary": "ドキュメントの要約",
  "partsPages": [部品ページの番号の配列],
  "assemblyPages": [組立手順ページの番号の配列],
  "allRelevantPages": [部品と組立ページを合わせた配列]
}

例：
{
  "summary": "オフィスチェアOC113の組立説明書",
  "partsPages": [5, 6],
  "assemblyPages": [7, 8, 9, 10, 11, 12],
  "allRelevantPages": [5, 6, 7, 8, 9, 10, 11, 12]
}`
        ])
        
        const response = await result.response
        const responseText = response.text()
        console.log('Gemini response:', responseText)
        
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          try {
            const analysisData = JSON.parse(jsonMatch[0])
            content = analysisData.summary
            assemblyPages = analysisData.allRelevantPages || analysisData.assemblyPages || []
            
            console.log('Parsed pages:', assemblyPages)
          } catch (parseError) {
            console.error('JSON parse error:', parseError)
            content = responseText
            // フォールバック: 5-12ページを使用
            assemblyPages = [5, 6, 7, 8, 9, 10, 11, 12]
          }
        } else {
          console.log('Could not parse JSON from response')
          content = responseText
          // フォールバック: 5-12ページを使用
          assemblyPages = [5, 6, 7, 8, 9, 10, 11, 12]
        }
        
        console.log('PDF analysis complete')
      } catch (error) {
        console.error('PDF processing error:', error)
        return NextResponse.json(
          { error: 'PDFの読み込みに失敗しました' },
          { status: 400 }
        )
      }
    } else if (file.type === 'text/plain') {
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

    const document = await prisma.document.create({
      data: {
        userId,
        name: file.name,
        summary: content.length > 1000 ? content.substring(0, 1000) + '...' : content,
      },
    })

    const chat = await prisma.chat.create({
      data: {
        title,
        documentId: document.id,
      },
      include: {
        document: true,
      },
    })

    const responseData: any = {
      id: chat.id,
      title: chat.title,
      fileName: document.name,
      createdAt: chat.createdAt.toISOString(),
      updatedAt: chat.updatedAt.toISOString(),
    }

    if (file.type === 'application/pdf') {
      responseData.pdfData = {
        base64: pdfBase64,
        assemblyPages: assemblyPages,
        hasAssemblyInstructions: assemblyPages.length > 0
      }
      
      console.log('Sending response with pdfData:', {
        hasAssemblyInstructions: assemblyPages.length > 0,
        pageCount: assemblyPages.length,
        pages: assemblyPages
      })
    }

    return NextResponse.json(responseData)
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
