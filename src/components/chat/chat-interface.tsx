"use client"

import { useState } from "react"
import { ChatSidebar } from "./chat-sidebar"
import { ChatWindow } from "./chat-window"
import { Role } from "@prisma/client"

export interface Contact {
  id: string
  name: string
  avatar: string
  lastMessage: string
  timestamp: string
  unread?: number
  online?: boolean
}

export interface Chat {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  role: Role
  content: string
  createdAt: string
  updatedAt: string
}

export function ChatInterface() {
  const [contacts] = useState<Contact[]>([
    {
      id: "1",
      name: "Sarah Chen",
      avatar: "/professional-woman.png",
      lastMessage: "プロジェクトの進捗はどうですか？",
      timestamp: "13:45",
      unread: 2,
      online: true,
    },
    {
      id: "2",
      name: "Michael Rodriguez",
      avatar: "/professional-man.png",
      lastMessage: "ミーティングの資料を送りました",
      timestamp: "12:30",
      online: true,
    },
    {
      id: "3",
      name: "Emily Watson",
      avatar: "/woman-designer.png",
      lastMessage: "デザインのフィードバックをお願いします",
      timestamp: "昨日",
      unread: 1,
      online: false,
    },
    {
      id: "4",
      name: "David Kim",
      avatar: "/man-developer.png",
      lastMessage: "コードレビューありがとうございました！",
      timestamp: "昨日",
      online: false,
    },
  ])

  const [selectedContact, setSelectedContact] = useState<Contact>(contacts[0])

  const [messages] = useState<Message[]>([
    {
      id: "1",
      content: "こんにちは！プロジェクトの件で相談があります",
      timestamp: "13:30",
      role: Role.USER,
    },
    {
      id: "2",
      content: "はい、どうぞ！何でも聞いてください",
      timestamp: "13:32",
      role: Role.USER,
    },
    {
      id: "3",
      content: "新しい機能の実装について、いくつか質問があります",
      timestamp: "13:35",
      role: Role.USER,
    },
    {
      id: "4",
      content: "もちろんです。具体的にどの部分でしょうか？",
      timestamp: "13:40",
      role: Role.USER,
    },
    {
      id: "5",
      content: "プロジェクトの進捗はどうですか？",
      role: Role.USER,
    },
  ])

  const [chats, setChats] = useState<Chat[]>([])

  const handleCreateChat = async (title: string, file: File) => {
    try {
      const response = await fetch('api/chat', {
        method: 'POST',
        body: JSON.stringify({ title, file }),
      })
      if (!response.ok) {
        throw new Error('アップロードに失敗しました。')
      }
      const data = await response.json()
      setChats((prev) => [...prev, data])

    } catch (error) {
      alert('アップロードに失敗しました。')
    }

  }
  
  return (
    <div className="flex h-full bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <ChatSidebar
        contacts={contacts}
        selectedContact={selectedContact}
        onSelectContact={setSelectedContact}
        chats={chats}
        onCreateChat={handleCreateChat}
      />
      <ChatWindow contact={selectedContact} messages={messages} />
    </div>
  )
}
