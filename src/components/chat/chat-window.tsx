"use client"

import { useState } from "react"
import { Phone, Video, MoreVertical, Smile, Paperclip, Send } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Contact, Message } from "./chat-interface"

interface ChatWindowProps {
  contact: Contact
  messages: Message[]
}

export function ChatWindow({ contact, messages }: ChatWindowProps) {
  const [inputMessage, setInputMessage] = useState("")

  const handleSend = () => {
    if (inputMessage.trim()) {
      // Handle sending message
      console.log("Sending:", inputMessage)
      setInputMessage("")
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-card/40 backdrop-blur-sm">
      {/* Chat Header */}
      <div className="p-4 border-b border-border/50 bg-card/60 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-10 w-10">
                <AvatarImage src={contact.avatar || "/placeholder.svg"} alt={contact.name} />
                <AvatarFallback>{contact.name[0]}</AvatarFallback>
              </Avatar>
              {contact.online && (
                <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-card" />
              )}
            </div>
            <div>
              <h2 className="font-semibold text-foreground">{contact.name}</h2>
              <p className="text-xs text-muted-foreground">{contact.online ? "オンライン" : "最終ログイン: 2時間前"}</p>
            </div>
          </div>
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

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn("flex gap-3", message.sender === "user" ? "justify-end" : "justify-start")}
          >
            {message.sender === "contact" && (
              <Avatar className="h-8 w-8">
                <AvatarImage src={contact.avatar || "/placeholder.svg"} alt={contact.name} />
                <AvatarFallback>{contact.name[0]}</AvatarFallback>
              </Avatar>
            )}
            <div className={cn("max-w-md", message.sender === "user" ? "items-end" : "items-start")}>
              <div
                className={cn(
                  "rounded-2xl px-4 py-2.5 shadow-sm",
                  message.sender === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-card-foreground border border-border/50",
                )}
              >
                <p className="text-sm leading-relaxed">{message.content}</p>
              </div>
              <span className="text-xs text-muted-foreground mt-1 block px-2">{message.timestamp}</span>
            </div>
            {message.sender === "user" && (
              <Avatar className="h-8 w-8">
                <AvatarImage src="/diverse-user-avatars.png" alt="You" />
                <AvatarFallback>You</AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border/50 bg-card/60 backdrop-blur-sm">
        <div className="flex items-end gap-2">
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0">
            <Paperclip className="h-5 w-5" />
          </Button>
          <div className="flex-1 relative">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="メッセージを入力..."
              className="pr-12 bg-secondary/50 border-border/50 rounded-full"
            />
            <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8">
              <Smile className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={handleSend}
            size="icon"
            className="h-10 w-10 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
