"use client"

import { useEffect, useState } from "react"
import { Phone, Video, MoreVertical, Smile, Paperclip, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Message } from "./chat-interface"

interface ChatWindowProps {
  selectedChatId?: string
}

export function ChatWindow({ selectedChatId }: ChatWindowProps) {
  const [inputMessage, setInputMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>([])

  useEffect(() => {
    if (selectedChatId) {
      fetchMessages(selectedChatId)
    } else {
      setMessages([])
    }
  }, [selectedChatId])

  const fetchMessages = async (chatId: string) => {
    const response = await fetch(`/api/messages/${chatId}`)
    const data = await response.json()
    setMessages(data)
  }

  const handleSend = async (chatId: string) => {
  const content = inputMessage.trim()
  if (!content) return
  if (!chatId) {
    alert("チャットが選択されていません。")
    return
  }
  
  setInputMessage("")
  
  try {
    const response = await fetch(`/api/messages/${chatId}`, {  
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to send message")
    }
    
    const data = await response.json()
    
    // ユーザーメッセージとAIメッセージの両方を追加
    setMessages(prev => [...prev, data.userMessage, data.aiMessage])
  } catch (error) {
    console.error("Failed to send message:", error)
    alert("メッセージの送信に失敗しました。")
  }
}

  return (
    <div className="flex-1 flex flex-col bg-card/40 backdrop-blur-sm">
      {/* Header */}
      <div className="p-4 border-b border-border/50 bg-card/60 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Video className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}
          >
            <div className={cn("max-w-md", message.role === "user" ? "items-end" : "items-start")}>
              <div
                className={cn(
                  "rounded-2xl px-4 py-2.5 shadow-sm",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-card-foreground border border-border/50",
                )}
              >
                <p className="text-sm leading-relaxed">{message.content}</p>
              </div>
              {/* timestamp がないケースがあるのでオプショナルに */}
              {"timestamp" in message && message.timestamp && (
                <span className="text-xs text-muted-foreground mt-1 block px-2">{message.timestamp}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border/50 bg-card/60 backdrop-blur-sm">
        <div className="flex items-end gap-2">
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0" type="button">
            <Paperclip className="h-5 w-5" />
          </Button>
          <div className="flex-1 relative">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                // Enter/Shift+Enter どちらでも送信しない
                if (e.key === "Enter") {
                  // フォーム内でのデフォルト送信を防ぐ（保険）
                  e.preventDefault()
                }
              }}
              placeholder="メッセージを入力..."
              className="pr-12 bg-secondary/50 border-border/50 rounded-full"
            />
            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8" type="button">
              <Smile className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={() => selectedChatId && handleSend(selectedChatId)}
            size="icon"
            className="h-10 w-10 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
            type="button"
            disabled={!selectedChatId || !inputMessage.trim()}
            aria-disabled={!selectedChatId || !inputMessage.trim()}
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
