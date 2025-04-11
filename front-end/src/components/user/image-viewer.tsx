"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, Upload } from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"
import { updateAvatar, updateCoverPhoto } from "@/actions/userActions"
import { getAuthToken } from "@/utils/auth-utils"
import useUserStore from "@/stores/useUserStoree"
import { useSession } from "next-auth/react"

interface ImageViewerProps {
  imageUrl: string | null
  isOpen: boolean
  onClose: () => void
  onUpdate: (type: "avatar" | "cover", url: string) => void
  imageType: "avatar" | "cover"  // Thêm prop mới
}

export default function ImageViewer({
  imageUrl,
  isOpen,
  onClose,
    onUpdate,
  imageType  // Sử dụng prop mới
}: ImageViewerProps) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { update } = useSession()
  const setUser = useUserStore((state) => state.setUser)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Kiểm tra kích thước file (giới hạn 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File quá lớn. Vui lòng chọn file nhỏ hơn 5MB.')
      return
    }

    // Kiểm tra loại file
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh hợp lệ.')
      return
    }

    setIsUploading(true)

    // Sử dụng imageType được truyền vào từ props
    console.log('Image type from props:', imageType);

    try {
      // Lấy token xác thực
      const token = await getAuthToken()

      if (!token) {
        throw new Error('Không tìm thấy token xác thực')
      }
      console.log("check image type>>>", imageType);

      // Sử dụng imageType được truyền vào thay vì detect từ URL
      const result = imageType === 'avatar'
        ? await updateAvatar(file, token)
        : await updateCoverPhoto(file, token)

      if (result.success) {
        // Cập nhật URL mới
        const newUrl = imageType === 'avatar'
          ? (result as { avatarUrl: string }).avatarUrl
          : (result as { coverUrl: string }).coverUrl

        // Cập nhật UI
        onUpdate(imageType, newUrl)

        // Cập nhật dữ liệu người dùng trong Zustand
          if (result.user) {
          setUser(result.user, token)

          // Cập nhật session
          await update({
            user: result.user,
          })
        }

        // Hiển thị thông báo thành công với nội dung cụ thể cho từng loại ảnh
        toast.success(
          imageType === 'avatar'
            ? 'Cập nhật ảnh đại diện thành công!'
            : 'Cập nhật ảnh bìa thành công!',
          {
            description: result.message || 'Hình ảnh đã được cập nhật và lưu trữ thành công.',
            duration: 3000,
          }
        )

        // Đóng modal sau khi cập nhật thành công
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        // Nếu API trả về lỗi nhưng có thể ảnh đã được cập nhật
        console.warn('API reported failure but image might still be updated:', result);

        // Hiển thị thông báo cảnh báo với nội dung cụ thể cho từng loại ảnh
        toast.warning(
          imageType === 'avatar'
            ? 'Cập nhật ảnh đại diện có vấn đề'
            : 'Cập nhật ảnh bìa có vấn đề',
          {
            description: 'Có thể đã cập nhật hình ảnh nhưng có lỗi xảy ra. Vui lòng kiểm tra lại.',
            duration: 4000,
          }
        );

        // Đóng modal sau 2 giây
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    } catch (error) {
      console.error('Lỗi cập nhật hình ảnh:', error);

      // Xử lý các loại lỗi khác nhau
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          // Lỗi xác thực
          toast.error('Phiên đăng nhập đã hết hạn', {
            description: 'Vui lòng đăng nhập lại để tiếp tục.',
            duration: 5000,
          });
        } else if (error.message.includes('size') || error.message.includes('large')) {
          // Lỗi kích thước file
          toast.error('File quá lớn', {
            description: 'Vui lòng chọn file nhỏ hơn 5MB.',
            duration: 5000,
          });
        } else if (error.message.includes('format') || error.message.includes('type')) {
          // Lỗi định dạng file
          toast.error('Định dạng file không hợp lệ', {
            description: 'Vui lòng chọn file ảnh (jpg, png, gif, v.v.).',
            duration: 5000,
          });
        } else {
          // Lỗi khác
          toast.error(
            imageType === 'avatar'
              ? 'Cập nhật ảnh đại diện thất bại'
              : 'Cập nhật ảnh bìa thất bại',
            {
              description: error.message,
              duration: 5000,
            }
          );
        }
      } else {
        // Lỗi không xác định
        toast.error(
          imageType === 'avatar'
            ? 'Cập nhật ảnh đại diện thất bại'
            : 'Cập nhật ảnh bìa thất bại',
          {
            description: 'Có lỗi xảy ra trong quá trình cập nhật. Vui lòng thử lại sau.',
            duration: 5000,
          }
        );
      }
    } finally {
      setIsUploading(false)
      // Reset input file để có thể chọn lại cùng file nếu muốn
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  if (!imageUrl) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>

      <DialogContent className="sm:max-w-[80vw] max-h-[80vh] p-0 overflow-hidden">
        <DialogTitle className="sr-only">Xem hình ảnh</DialogTitle>
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

