'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import * as pdfjsLib from 'pdfjs-dist'
import type { PDFPageProxy } from 'pdfjs-dist'


// PDF.jsのワーカー設定
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

interface Step {
  stepNumber: number
  page: number
  description: string
  parts: string[]
  tools: string[]
  keyPoints: string[]
}

export function ManualAnalyzer() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [pageImages, setPageImages] = useState<string[]>([])
  const [steps, setSteps] = useState<Step[]>([])
  const [error, setError] = useState<string>('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setError('')
    }
  }

  const extractPagesAsImages = async (pdfBase64: string, pageNumbers: number[]) => {
    try {
      const pdfData = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0))
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise
      
      const images: string[] = []
      
      for (const pageNum of pageNumbers) {
        const page = await pdf.getPage(pageNum)
        const viewport = page.getViewport({ scale: 2.0 })
        
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        if (!context) {
          throw new Error('Canvas context could not be created')
        }
        
        canvas.width = viewport.width
        canvas.height = viewport.height
        
        // try-catchで囲む
        try {
          const renderContext = {
            canvasContext: context,
            viewport: viewport,
          }
          await (page.render(renderContext as any) as any).promise
        } catch (renderError) {
          console.error('Render error:', renderError)
          throw renderError
        }
        
        const imageDataUrl = canvas.toDataURL('image/png')
        images.push(imageDataUrl)
      }
      
      return images
    } catch (error) {
      console.error('PDF画像抽出エラー:', error)
      throw error
    }
  }

  const handleAnalyze = async () => {
    if (!file) {
      setError('ファイルを選択してください')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Step 1: PDFを解析してページ情報と手順を取得
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/analyze-manual', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '解析に失敗しました')
      }

      const data = await response.json()
      console.log('解析結果:', data)

      // Step 2: 組立手順のページを画像として抽出
      const images = await extractPagesAsImages(
        data.pdfBase64,
        data.pageInfo.assemblyPages
      )
      
      setPageImages(images)
      setSteps(data.stepsInfo.steps)

    } catch (error) {
      console.error('解析エラー:', error)
      setError(error instanceof Error ? error.message : '解析に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">組立説明書アナライザー</h1>
      
      {/* ファイルアップロード */}
      <div className="mb-6 space-y-4">
        <Input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="max-w-md"
        />
        <Button
          onClick={handleAnalyze}
          disabled={!file || loading}
          className="w-full max-w-md"
        >
          {loading ? '解析中...' : '組立手順を解析'}
        </Button>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* 結果表示 */}
      {pageImages.length > 0 && (
        <div className="space-y-8">
          <h2 className="text-xl font-semibold">組立手順</h2>
          
          {pageImages.map((image, index) => (
            <div key={index} className="border rounded-lg p-4 bg-white shadow">
              <div className="grid md:grid-cols-2 gap-6">
                {/* 画像 */}
                <div>
                  <img
                    src={image}
                    alt={`ステップ ${index + 1}`}
                    className="w-full rounded border"
                  />
                </div>
                
                {/* 手順の説明 */}
                <div className="space-y-4">
                  {steps
                    .filter(step => step.page === index + 7) // ページ番号は調整が必要
                    .map((step, stepIndex) => (
                      <div key={stepIndex} className="space-y-2">
                        <h3 className="font-bold text-lg">
                          ステップ {step.stepNumber}
                        </h3>
                        <p className="text-gray-700">{step.description}</p>
                        
                        {step.parts.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm">使用部品:</h4>
                            <ul className="list-disc list-inside text-sm">
                              {step.parts.map((part, i) => (
                                <li key={i}>{part}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {step.keyPoints.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm text-red-600">
                              重要ポイント:
                            </h4>
                            <ul className="list-disc list-inside text-sm text-red-600">
                              {step.keyPoints.map((point, i) => (
                                <li key={i}>{point}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
