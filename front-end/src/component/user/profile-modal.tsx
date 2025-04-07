"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import ProfileView from "./profile-view"
import ProfileEdit from "./profile-edit"
import ImageViewer from "./image-viewer"
import { AnimatePresence } from "framer-motion"

export type UserProfile = {
  name: string
  bio: string
  gender: "Nam" | "Nữ"
  birthDay: string
  birthMonth: string
  birthYear: string
  phone: string
  avatarUrl: string
  coverUrl: string
}

export default function ProfileModal() {
  const [open, setOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [viewingImage, setViewingImage] = useState<string | null>(null)

  const [profile, setProfile] = useState<UserProfile>({
    name: "Nguyễn Đức Thịnh",
    bio: "Hello là chào cậu 👋",
    gender: "Nam",
    birthDay: "02",
    birthMonth: "03",
    birthYear: "2003",
    phone: "+84 327 410 155",
    avatarUrl:"",
    coverUrl: "/placeholder.svg?height=200&width=500",
  })

  const handleUpdateProfile = (updatedProfile: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...updatedProfile }))
    setIsEditing(false)
  }

  const handleUpdateImage = (type: "avatar" | "cover", url: string) => {
    if (type === "avatar") {
      setProfile((prev) => ({ ...prev, avatarUrl: url }))
    } else {
      setProfile((prev) => ({ ...prev, coverUrl: url }))
    }
    setViewingImage(null)
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>Mở thông tin tài khoản</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
          <DialogTitle className="sr-only">Thông tin tài khoản</DialogTitle>
          <AnimatePresence mode="wait" initial={false}>
            {isEditing ? (
              <ProfileEdit
                key="edit"
                profile={profile}
                onUpdate={handleUpdateProfile}
                onCancel={() => setIsEditing(false)}
              />
            ) : (
              <ProfileView
                key="view"
                profile={profile}
                onEdit={() => setIsEditing(true)}
                onViewImage={setViewingImage}
              />
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      <ImageViewer
        imageUrl={viewingImage}
        isOpen={!!viewingImage}
        onClose={() => setViewingImage(null)}
        onUpdate={handleUpdateImage}
      />
    </>
  )
}

