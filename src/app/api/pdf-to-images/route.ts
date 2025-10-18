import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { pdfBase64, pageNumbers } = await request.json()

    if (!pdfBase64 || !pageNumbers || !Array.isArray(pageNumbers)) {
      return NextResponse.json(
        { error: 'pdfBase64とpageNumbersが必要です' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      )
    }

    console.log(`Generating images for ${pageNumbers.length} pages...`)

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    const images: string[] = []

    // 各ページごとに詳細な説明を生成
    for (const pageNum of pageNumbers) {
      console.log(`Processing page ${pageNum}...`)

      try {
        const result = await model.generateContent([
          {
            inlineData: {
              mimeType: 'application/pdf',
              data: pdfBase64
            }
          },
          `このPDFの${pageNum}ページ目の内容を、非常に詳細に説明してください。

以下の要素を必ず含めてください：
- ページのタイトルや見出し
- すべての図や画像の詳細な説明
- 部品番号や部品名
- 手順の番号とその内容
- 矢印や指示線の説明
- 注意書きや警告文
- すべてのテキスト

視覚的な情報を言葉で完全に再現してください。`
        ])

        const response = await result.response
        const description = response.text()

        console.log(`Page ${pageNum} description length:`, description.length)

        // テキスト説明をSVG画像として生成
        const svgImage = createDetailedSvgImage(pageNum, description)
        images.push(svgImage)
        
        console.log(`Page ${pageNum} processed successfully`)
      } catch (error) {
        console.error(`Error processing page ${pageNum}:`, error)
        const errorImage = createDetailedSvgImage(pageNum, `ページ ${pageNum} の処理中にエラーが発生しました。`)
        images.push(errorImage)
      }
    }

    console.log(`Successfully processed ${images.length} pages`)
    return NextResponse.json({ images })

  } catch (error) {
    console.error('PDF to images error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to convert PDF to images' },
      { status: 500 }
    )
  }
}

function createDetailedSvgImage(pageNum: number, text: string): string {
  // HTMLエスケープ
  const escapedText = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

  const svg = `
    <svg width="1000" height="1400" xmlns="http://www.w3.org/2000/svg">
      <rect width="1000" height="1400" fill="#ffffff"/>
      <rect x="20" y="20" width="960" height="1360" fill="none" stroke="#2563eb" stroke-width="3" rx="10"/>
      
      <!-- ヘッダー -->
      <rect x="20" y="20" width="960" height="80" fill="#2563eb"/>
      <text x="500" y="70" font-family="Arial, sans-serif" font-size="32" font-weight="bold" fill="white" text-anchor="middle">
        ページ ${pageNum}
      </text>
      
      <!-- コンテンツエリア -->
      <foreignObject x="40" y="120" width="920" height="1240">
        <div xmlns="http://www.w3.org/1999/xhtml" style="
          font-family: 'Segoe UI', Arial, sans-serif;
          font-size: 16px;
          line-height: 1.8;
          color: #1f2937;
          padding: 20px;
          white-space: pre-wrap;
          word-wrap: break-word;
          overflow-wrap: break-word;
        ">
          ${escapedText}
        </div>
      </foreignObject>
      
      <!-- フッター -->
      <line x1="40" y1="1360" x2="960" y2="1360" stroke="#e5e7eb" stroke-width="2"/>
      <text x="500" y="1390" font-family="Arial" font-size="14" fill="#6b7280" text-anchor="middle">
        Gemini AI による内容説明
      </text>
    </svg>
  `
  
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}
