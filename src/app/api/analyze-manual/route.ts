import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file || file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'PDFファイルが必要です' },
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

    // PDFをBase64エンコード
    const arrayBuffer = await file.arrayBuffer()
    const base64Data = Buffer.from(arrayBuffer).toString('base64')

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

    // ステップ1: PDFから組立手順のページ番号を特定
    console.log('Analyzing PDF to find assembly instruction pages...')
    
    const analysisResult = await model.generateContent([
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: base64Data
        }
      },
      `このPDFは家具の組立説明書です。
      
組立手順が記載されているページ番号をすべて特定してください。
通常、組立手順は番号付きのステップ（1, 2, 3...）や図解で示されています。

以下のJSON形式で回答してください：
{
  "assemblyPages": [ページ番号の配列],
  "totalPages": 総ページ数,
  "description": "簡単な説明"
}

例：
{
  "assemblyPages": [7, 8, 9, 10, 11],
  "totalPages": 15,
  "description": "7ページから11ページに組立手順が記載されています"
}`
    ])

    const analysisText = analysisResult.response.text()
    console.log('Analysis result:', analysisText)
    
    // JSONを抽出（マークダウンのコードブロックを除去）
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('組立ページの解析に失敗しました')
    }
    
    const pageInfo = JSON.parse(jsonMatch[0])

    // ステップ2: 各ページの詳細な手順を解析
    const stepsAnalysisResult = await model.generateContent([
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: base64Data
        }
      },
      `このPDFの組立手順（ページ ${pageInfo.assemblyPages.join(', ')}）について、
      
各ステップの詳細を以下のJSON形式で教えてください：
{
  "steps": [
    {
      "stepNumber": ステップ番号,
      "page": ページ番号,
      "description": "このステップの説明",
      "parts": ["使用する部品"],
      "tools": ["使用する工具"],
      "keyPoints": ["重要なポイント"]
    }
  ]
}

できるだけ詳細に、各ステップの内容を説明してください。`
    ])

    const stepsText = stepsAnalysisResult.response.text()
    const stepsJsonMatch = stepsText.match(/\{[\s\S]*\}/)
    if (!stepsJsonMatch) {
      throw new Error('手順の解析に失敗しました')
    }
    
    const stepsInfo = JSON.parse(stepsJsonMatch[0])

    return NextResponse.json({
      pageInfo,
      stepsInfo,
      pdfBase64: base64Data // フロントエンドで画像抽出に使用
    })

  } catch (error) {
    console.error('Manual analysis error:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'マニュアルの解析に失敗しました' 
      },
      { status: 500 }
    )
  }
}
