"use client"

import { useState, useEffect } from "react"
import { ChatSidebar } from "./chat-sidebar"
import { ChatWindow } from "./chat-window"
import { Role } from "@prisma/client"
import html2canvas from 'html2canvas'

export interface User {
  id: string
  email: string
  password?: string
  createdAt?: string
  updatedAt?: string
}

export interface Document {
  id: string    
  userId: string   
  name: string
  manufacturer?: string | null
  modelNumber?: string | null
  summary?: string | null
  createdAt: string
  updatedAt: string
}

export interface Chat {
  id: string
  title: string
  fileName: string
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  role: Role
  content: string
  createdAt?: string
  updatedAt?: string
  timestamp?: string
}

export function ChatInterface({ userId }: { userId: string }) {
  const [chats, setChats] = useState<Chat[]>([])
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [assemblyImages, setAssemblyImages] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string>('')
  const [assemblyPages, setAssemblyPages] = useState<number[]>([])

  useEffect(() => {
    if (!userId) return

    const loadChats = async () => {
      try {
        const response = await fetch(`/api/chat/${userId}`)
        if (!response.ok) {
          throw new Error(`Failed to load chats (status ${response.status})`)
        }
        const data = await response.json()
        setChats(data)
      } catch (error) {
        console.error("Failed to load chats:", error)
      }
    }

    loadChats()
  }, [userId])

  const capturePdfPages = async (pdfBlobUrl: string, pageNumbers: number[]) => {
    console.log('PDFページをキャプチャ開始...')
    
    const images: string[] = []
    
    // 隠しiframeを作成
    const iframe = document.createElement('iframe')
    iframe.style.position = 'absolute'
    iframe.style.left = '-10000px'
    iframe.style.top = '-10000px'
    iframe.style.width = '1200px'
    iframe.style.height = '1600px'
    document.body.appendChild(iframe)

    try {
      // PDFを読み込む
      iframe.src = pdfBlobUrl

      // PDFの読み込みを待つ
      await new Promise((resolve) => {
        iframe.onload = () => {
          setTimeout(resolve, 2000) // 2秒待機
        }
      })

      console.log('PDF読み込み完了、キャプチャを開始します')

      // 各ページをキャプチャ（簡易版：全体をキャプチャ）
      const canvas = await html2canvas(iframe, {
        allowTaint: true,
        useCORS: true,
        logging: true,
      })

      const imageDataUrl = canvas.toDataURL('image/png')
      images.push(imageDataUrl)
      
      console.log(`キャプチャ完了: ${imageDataUrl.length} bytes`)

    } catch (error) {
      console.error('PDFキャプチャエラー:', error)
    } finally {
      // iframeを削除
      document.body.removeChild(iframe)
    }

    return images
  }

  const handleCreateChat = async (title: string, file: File) => {
    if (!userId) {
      alert("userId が未設定です。ログイン後にもう一度お試しください。")
      return
    }

    console.log("=== ファイルアップロード開始 ===")

    setIsProcessing(true)
    setAssemblyImages([])

    try {
      const formData = new FormData()
      formData.append("userId", userId)
      formData.append("title", title)
      formData.append("file", file)

      console.log('PDFをアップロード中...')
      const response = await fetch("/api/chat", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "アップロードに失敗しました。")
      }

      const created = await response.json()
      console.log("=== サーバーからのレスポンス ===")
      console.log("assemblyPages:", created.pdfData?.assemblyPages)

      setChats((prev) => [...prev, created])

    if (created.pdfData && created.pdfData.hasAssemblyInstructions) {
      console.log(`組立手順を発見: ${created.pdfData.assemblyPages.length}ページ`)
      console.log('サーバーサイドで画像変換を開始します...')
      
      // サーバーサイドAPIで画像変換
      const convertResponse = await fetch('/api/pdf-to-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64: created.pdfData.base64,
          pageNumbers: created.pdfData.assemblyPages
        })
      })

      if (!convertResponse.ok) {
        throw new Error('画像変換に失敗しました')
      }

      const { images } = await convertResponse.json()
      console.log(`${images.length}枚の画像を取得しました`)
      
      setAssemblyImages(images)
      setSelectedChatId(created.id)
    }

    } catch (error) {
      console.error("=== エラー発生 ===")
      console.error("Error:", error)
      alert(error instanceof Error ? error.message : "アップロードに失敗しました。")
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex h-full bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <ChatSidebar
        chats={chats}
        selectedChatId={selectedChatId ?? undefined}
        onSelectChatId={setSelectedChatId}
        onCreateChat={handleCreateChat}
      />
      <ChatWindow 
        selectedChatId={selectedChatId ?? undefined} 
        assemblyImages={assemblyImages}
        pdfUrl={pdfUrl}
        isProcessing={isProcessing}
      />
    </div>
  )
}
