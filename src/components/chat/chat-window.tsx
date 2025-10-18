"use client"

import { useEffect, useState } from "react"
import { Phone, Video, MoreVertical, Smile, Paperclip, Send, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Message } from "./chat-interface"

interface ChatWindowProps {
  selectedChatId?: string
  assemblyImages?: string[]
  pdfUrl?: string
  isProcessing?: boolean
}

export function ChatWindow({ selectedChatId, assemblyImages = [], isProcessing = false }: ChatWindowProps) {
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
          {isProcessing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>画像を抽出中...</span>
            </div>
          )}
          {!isProcessing && assemblyImages.length > 0 && (
            <span className="text-sm text-green-600 font-medium">
              組立手順: {assemblyImages.length}ページ抽出完了
            </span>
          )}
        </div>
      </div>

      {/* Assembly Images Display */}
      {assemblyImages.length > 0 && !isProcessing && (
        <div className="border-b border-border/50 bg-white">
          <div className="p-4">
            <h3 className="text-lg font-bold mb-4 text-gray-800">組立手順</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assemblyImages.map((image, index) => (
                <div key={index} className="flex flex-col gap-2">
                  <div className="relative group">
                    <img 
                      src={image} 
                      alt={`ステップ ${index + 1}`}
                      className="w-full h-auto rounded-lg border-2 border-gray-200 shadow-md hover:shadow-xl transition-shadow cursor-pointer"
                      onClick={() => window.open(image, '_blank')}
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-opacity rounded-lg flex items-center justify-center">
                      <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium">
                        クリックで拡大
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-2">
                    <span className="text-sm font-semibold text-gray-700">
                      ステップ {index + 1}
                    </span>
                    <span className="text-xs text-gray-500">
                      ページ {index + 1} / {assemblyImages.length}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {assemblyImages.length === 0 && !isProcessing && (
          <div className="text-center text-gray-500 mt-8">
            PDFファイルをアップロードして会話を始めましょう
          </div>
        )}
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
                if (e.key === "Enter") {
                  e.preventDefault()
                  if (selectedChatId && inputMessage.trim()) {
                    handleSend(selectedChatId)
                  }
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
