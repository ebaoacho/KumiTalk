"use client"

import { MessageSquare, Upload } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Chat } from "./chat-interface"
import { FileUploadDialog } from "../dialog/file-upload-dialog"
import { useState } from "react"

interface ChatSidebarProps {
  chats: Chat[]
  selectedChatId?: string
  onSelectChatId: (chatId: string) => void
  onCreateChat: (title: string, file: File) => void
}

export function ChatSidebar({ chats, selectedChatId, onSelectChatId, onCreateChat }: ChatSidebarProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleDialogSubmit = (title: string, file: File) => {
    onCreateChat(title, file)
    setIsDialogOpen(false)
  }

  return (
    <div className="w-80 border-r border-border/50 bg-card/80 backdrop-blur-sm flex flex-col">
      <div className="p-4 border-b border-border/50">
        <Button
          onClick={() => setIsDialogOpen(true)}
          variant="outline"
          className="w-full border-dashed border-2 hover:bg-secondary/50"
        >
          <Upload className="h-4 w-4 mr-2" />
          ファイルを読み込む
        </Button>
      </div>

      {chats.length > 0 && (
        <div className="border-b border-border/50">
          <div className="px-4 py-2 bg-secondary/30">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase">ファイルチャット</h2>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {chats.map((chat) => {
              const isSelected = selectedChatId === chat.id
              return (
                <button
                  key={chat.id}
                  className={cn(
                    "w-full p-3 flex items-start gap-3 transition-colors border-b border-border/30 text-left",
                    isSelected 
                      ? "bg-primary/20 border-primary/30 opacity-80" 
                      : "hover:bg-secondary/50"
                  )}
                  onClick={() => onSelectChatId(chat.id)}
                >
                  <div className={cn(
                    "flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center",
                    isSelected ? "bg-primary/20" : "bg-primary/10"
                  )}>
                    <MessageSquare className={cn(
                      "h-5 w-5",
                      isSelected ? "text-primary/80" : "text-primary"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className={cn(
                        "font-medium text-sm truncate",
                        isSelected ? "text-foreground/80" : "text-foreground"
                      )}>{chat.title}</h3>
                      <span className={cn(
                        "text-xs",
                        isSelected ? "text-muted-foreground/80" : "text-muted-foreground"
                      )}>{chat.createdAt}</span>
                    </div>
                    <p className={cn(
                      "text-xs truncate",
                      isSelected ? "text-muted-foreground/80" : "text-muted-foreground"
                    )}>{chat.fileName}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
      <FileUploadDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} onSubmit={handleDialogSubmit} />
    </div>
  )
}
