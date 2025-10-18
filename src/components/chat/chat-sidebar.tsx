"use client"

import { MessageSquare, Upload } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Contact, Chat } from "./chat-interface"
import { FileUploadDialog } from "../dialog/file-upload-dialog"
import { useState } from "react"

interface ChatSidebarProps {
  contacts: Contact[]
  selectedContact: Contact
  onSelectContact: (contact: Contact) => void
  chats: Chat[]
  onCreateChat: (title: string, file: File) => void
}

export function ChatSidebar({ contacts, selectedContact, onSelectContact, chats, onCreateChat }: ChatSidebarProps) {
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
            {chats.map((chat) => (
              <button
                key={chat.id}
                className="w-full p-3 flex items-start gap-3 hover:bg-secondary/50 transition-colors border-b border-border/30 text-left"
              >
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-sm text-foreground truncate">{chat.title}</h3>
                    <span className="text-xs text-muted-foreground">{chat.createdAt}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{chat.fileName}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto">
        {contacts.map((contact) => (
          <button
            key={contact.id}
            onClick={() => onSelectContact(contact)}
            className={cn(
              "w-full p-4 flex items-start gap-3 hover:bg-secondary/50 transition-colors border-b border-border/30",
              selectedContact.id === contact.id && "bg-secondary/70",
            )}
          >
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarImage src={contact.avatar || "/placeholder.svg"} alt={contact.name} />
                <AvatarFallback>{contact.name[0]}</AvatarFallback>
              </Avatar>
              {contact.online && (
                <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-card" />
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-medium text-sm text-foreground truncate">{contact.name}</h3>
                <span className="text-xs text-muted-foreground">{contact.timestamp}</span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground truncate">{contact.lastMessage}</p>
                {contact.unread && (
                  <Badge variant="default" className="ml-2 h-5 min-w-5 px-1.5 bg-primary text-primary-foreground">
                    {contact.unread}
                  </Badge>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
      <FileUploadDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} onSubmit={handleDialogSubmit} />
    </div>
  )
}
