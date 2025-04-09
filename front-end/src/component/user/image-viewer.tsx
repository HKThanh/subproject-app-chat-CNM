"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, Upload } from "lucide-react"
import Image from "next/image"

interface ImageViewerProps {
  imageUrl: string | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (type: "avatar" | "cover", url: string) => void
}

export default function ImageViewer({ imageUrl, isOpen, onClose, onUpdate }: ImageViewerProps) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)

    // Simulate file upload with a timeout
    setTimeout(() => {
      // In a real app, you would upload the file to a server and get a URL back
      // For this example, we'll use a placeholder URL
      const type = imageUrl?.includes("100") ? "avatar" : "cover"
      const newUrl = `/placeholder.svg?height=${type === "avatar" ? "100" : "200"}&width=${type === "avatar" ? "100" : "500"}&text=New+Image`

      onUpdate(type as "avatar" | "cover", newUrl)
      setIsUploading(false)
    }, 1000)
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  if (!imageUrl) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[80vw] max-h-[80vh] p-0 overflow-hidden">
        <div className="relative">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 rounded-full bg-black/50 text-white hover:bg-black/70 z-10"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Image */}
          <div className="relative h-[70vh] w-full flex items-center justify-center bg-black">
            <Image src={imageUrl || "/placeholder.svg"} alt="Enlarged image" fill className="object-contain" />
          </div>

          {/* Update button */}
          <div className="absolute bottom-4 right-4">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            <Button
              onClick={triggerFileInput}
              disabled={isUploading}
              className="bg-black/50 hover:bg-black/70 text-white"
            >
              <Upload className="h-4 w-4 mr-2" />
              {isUploading ? "Đang tải lên..." : "Cập nhật hình ảnh"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

