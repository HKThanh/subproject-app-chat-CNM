"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, Upload, Download, RotateCw } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { updateAvatar, updateCoverPhoto } from "@/actions/userActions"
import { getAuthToken } from "@/utils/auth-utils"
import useUserStore from "@/stores/useUserStoree"
import { useSession } from "next-auth/react"
import { motion, AnimatePresence } from "framer-motion"

interface ImageViewerProps {
  imageUrl: string | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (type: "avatar" | "cover", url: string) => void
  imageType: "avatar" | "cover"
  readOnly?: boolean
}

export default function ImageViewer({
  imageUrl,
  isOpen,
  onClose,
  onUpdate,
  imageType,
  readOnly = false,
}: ImageViewerProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [imageRotation, setImageRotation] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { update } = useSession()
  const setUser = useUserStore((state) => state.setUser)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File quá lớn. Vui lòng chọn file nhỏ hơn 5MB.")
      return
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn file ảnh hợp lệ.")
      return
    }

    setIsUploading(true)

    try {
      const token = await getAuthToken()
      if (!token) {
        throw new Error("Không tìm thấy token xác thực")
      }

      const result = imageType === "avatar" ? await updateAvatar(file, token) : await updateCoverPhoto(file, token)

      if (result.success) {
        const newUrl =
          imageType === "avatar"
            ? (result as { avatarUrl: string }).avatarUrl
            : (result as { coverUrl: string }).coverUrl

        onUpdate(imageType, newUrl)

        if (result.user) {
          setUser(result.user, token)
          await update({
            user: result.user,
          })
        }

        toast.success(imageType === "avatar" ? "Cập nhật ảnh đại diện thành công!" : "Cập nhật ảnh bìa thành công!", {
          description: result.message || "Hình ảnh đã được cập nhật và lưu trữ thành công.",
          duration: 3000,
        })

        setTimeout(() => {
          onClose()
        }, 1500)
      } else {
        toast.warning(imageType === "avatar" ? "Cập nhật ảnh đại diện có vấn đề" : "Cập nhật ảnh bìa có vấn đề", {
          description: "Có thể đã cập nhật hình ảnh nhưng có lỗi xảy ra. Vui lòng kiểm tra lại.",
          duration: 4000,
        })

        setTimeout(() => {
          onClose()
        }, 2000)
      }
    } catch (error) {
      console.error("Lỗi cập nhật hình ảnh:", error)

      if (error instanceof Error) {
        if (error.message.includes("401")) {
          toast.error("Phiên đăng nhập đã hết hạn", {
            description: "Vui lòng đăng nhập lại để tiếp tục.",
            duration: 5000,
          })
        } else if (error.message.includes("size") || error.message.includes("large")) {
          toast.error("File quá lớn", {
            description: "Vui lòng chọn file nhỏ hơn 5MB.",
            duration: 5000,
          })
        } else if (error.message.includes("format") || error.message.includes("type")) {
          toast.error("Định dạng file không hợp lệ", {
            description: "Vui lòng chọn file ảnh (jpg, png, gif, v.v.).",
            duration: 5000,
          })
        } else {
          toast.error(imageType === "avatar" ? "Cập nhật ảnh đại diện thất bại" : "Cập nhật ảnh bìa thất bại", {
            description: error.message,
            duration: 5000,
          })
        }
      } else {
        toast.error(imageType === "avatar" ? "Cập nhật ảnh đại diện thất bại" : "Cập nhật ảnh bìa thất bại", {
          description: "Có lỗi xảy ra trong quá trình cập nhật. Vui lòng thử lại sau.",
          duration: 5000,
        })
      }
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const handleRotate = () => {
    setImageRotation((prev) => (prev + 90) % 360)
  }

  const handleDownload = async () => {
    if (!imageUrl) return

    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${imageType}-image.jpg`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success("Đã tải xuống hình ảnh")
    } catch (error) {
      toast.error("Không thể tải xuống hình ảnh")
    }
  }

  if (!imageUrl) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={onClose}>
          <DialogContent className="sm:max-w-[90vw] max-h-[90vh] p-0 overflow-hidden bg-black/95 border-0">
            <DialogTitle className="sr-only">Xem hình ảnh</DialogTitle>
            <motion.div
              className="relative h-[90vh] w-full"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
            >
              {/* Header Controls */}
              <motion.div
                className="absolute top-4 left-4 right-4 flex justify-between items-center z-20"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center space-x-2">
                  <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
                    <span className="text-white text-sm font-medium">
                      {imageType === "avatar" ? "Ảnh đại diện" : "Ảnh bìa"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 border border-white/20"
                    onClick={handleRotate}
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 border border-white/20"
                    onClick={handleDownload}
                  >
                    <Download className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 border border-white/20"
                    onClick={onClose}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>

              {/* Image Container */}
              <div className="relative h-full w-full flex items-center justify-center">
                <motion.div
                  className="relative max-w-full max-h-full"
                  style={{ transform: `rotate(${imageRotation}deg)` }}
                  transition={{ duration: 0.3 }}
                >
                  <Image
                    src={imageUrl || "/placeholder.svg"}
                    alt="Enlarged image"
                    width={800}
                    height={600}
                    className="object-contain max-h-[80vh] max-w-[80vw] rounded-lg shadow-2xl"
                  />
                </motion.div>
              </div>

              {/* Bottom Controls */}
              {!readOnly && (
                <motion.div
                  className="absolute bottom-6 left-1/2 transform -translate-x-1/2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                  />
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={triggerFileInput}
                      disabled={isUploading}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full shadow-lg backdrop-blur-sm border border-blue-500/30"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isUploading ? "Đang tải lên..." : "Cập nhật hình ảnh"}
                    </Button>
                  </motion.div>
                </motion.div>
              )}

              {/* Loading Overlay */}
              {isUploading && (
                <motion.div
                  className="absolute inset-0 bg-black/70 flex items-center justify-center z-30"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className="bg-white rounded-lg p-6 flex flex-col items-center space-y-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                    <p className="text-gray-700 font-medium">Đang tải lên hình ảnh...</p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  )
}
