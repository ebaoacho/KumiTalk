"use client"

import { useState, useEffect } from "react"
import { ChatSidebar } from "./chat-sidebar"
import { ChatWindow } from "./chat-window"
import { Role } from "@prisma/client"

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
  // 既存のダミーデータに合わせて timestamp を許容（UIは変更しない）
  timestamp?: string
}

export function ChatInterface({ userId }: { userId: string }) {
  const [chats, setChats] = useState<Chat[]>([])
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)

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

const handleCreateChat = async (title: string, file: File) => {
  if (!userId) {
    alert("userId が未設定です。ログイン後にもう一度お試しください。")
    return
  }
  console.log("userId", userId)

  // ファイルタイプのチェック
  const allowedTypes = ["application/pdf", "text/plain"]
  if (!allowedTypes.includes(file.type)) {
    alert("PDFまたはテキストファイルのみアップロード可能です。")
    return
  }

  try {
    // FormDataを使用してファイルを送信
    const formData = new FormData()
    formData.append("userId", userId)
    formData.append("title", title)
    formData.append("file", file)

    const response = await fetch("/api/chat", {
      method: "POST",
      body: formData, // Content-Typeは自動設定されるのでヘッダーは不要
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "アップロードに失敗しました。")
    }

    const created = await response.json()
    setChats((prev) => [...prev, created])

  } catch (error) {
    console.error("Chat creation error:", error)
    alert(error instanceof Error ? error.message : "アップロードに失敗しました。")
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
      <ChatWindow selectedChatId={selectedChatId ?? undefined} />
    </div>
  )
}
