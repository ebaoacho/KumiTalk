"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, X, FileText } from "lucide-react"

interface FileUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (title: string, file: File) => void
}

export function FileUploadDialog({ open, onOpenChange, onSubmit }: FileUploadDialogProps) {
  const [title, setTitle] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      
      // Check if it's a .txt file
      if (!droppedFile.name.toLowerCase().endsWith('.txt')) {
        alert('.txtファイルのみアップロード可能です')
        return
      }
      
      setFile(droppedFile)
      readFileContent(droppedFile)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      
      // Check if it's a .txt file
      if (!selectedFile.name.toLowerCase().endsWith('.txt')) {
        alert('.txtファイルのみアップロード可能です')
        return
      }
      
      setFile(selectedFile)
      readFileContent(selectedFile)
    }
  }

  const readFileContent = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleSubmit = () => {
    if (title && file) {
      onSubmit(title, file)
      // Reset form
      setTitle("")
      setFile(null)
    }
  }

  const handleClose = () => {
    setTitle("")
    setFile(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ファイルをアップロード</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title Input */}
          <div className="space-y-2">
            <Label htmlFor="title">チャットの題名</Label>
            <Input
              id="title"
              placeholder="例: プロジェクト資料"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* File Upload Area */}
          <div className="space-y-2">
            <Label>ファイル</Label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
                dragActive ? "border-primary bg-primary/5" : "border-border"
              }`}
            >
              <input
                type="file"
                id="file-upload"
                accept=".txt"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileChange}
              />

              {file ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.preventDefault()
                      setFile(null)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-foreground mb-1">ファイルをドラッグ＆ドロップ</p>
                  <p className="text-xs text-muted-foreground">またはクリックして選択</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            キャンセル
          </Button>
          <Button onClick={handleSubmit} disabled={!title || !file}>
            完了
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
