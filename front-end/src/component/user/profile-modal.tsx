"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import ProfileView from "./profile-view"
import ProfileEdit from "./profile-edit"
import ImageViewer from "./image-viewer"
import { AnimatePresence } from "framer-motion"
import useUserStore from "@/stores/useUserStoree"
import { useSession } from "next-auth/react"
import { updateProfile } from "@/actions/userActions"

export type UserProfile = {
  fullname: string
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
  
  const user = useUserStore((state) => state.user)
  const [profile, setProfile] = useState<UserProfile>({
    fullname: "",
    bio: "Hello là chào cậu 👋",
    gender: "Nam",
    birthDay: "",
    birthMonth: "",
    birthYear: "",
    phone: "",
    avatarUrl: "",
    coverUrl: "",
  })

  // Update profile when user data changes
  useEffect(() => {
    if (user) {
      setProfile({
        fullname: user.fullname?.toString() || "",
        bio: user.bio?.toString() || "Hello là chào cậu 👋",
        gender: user.ismale === true ? "Nam" : "Nữ",
        birthDay: user.birthday?.split('-')[2] || "",
        birthMonth: user.birthday?.split('-')[1] || "",
        birthYear: user.birthday?.split('-')[0] || "",
        phone: user.phone?.toString() || "",
        avatarUrl: user.urlavatar?.toString() || "",
        coverUrl: user.coverPhoto?.toString() || "",
      })
    }
  }, [user])

  const { update: updateSession } = useSession()
  const setUser = useUserStore((state) => state.setUser)

  const handleUpdateProfile = async (updatedProfile: Partial<UserProfile>) => {
    // Construct birthday only if all date parts are provided
    const birthday = updatedProfile.birthYear && updatedProfile.birthMonth && updatedProfile.birthDay
      ? `${updatedProfile.birthYear}-${updatedProfile.birthMonth}-${updatedProfile.birthDay}`
      : profile.birthYear && profile.birthMonth && profile.birthDay
      ? `${profile.birthYear}-${profile.birthMonth}-${profile.birthDay}`
      : user?.birthday || '';
  
    const result = await updateProfile(
      profile.phone,
      updatedProfile.fullname || profile.fullname,
      (updatedProfile.gender || profile.gender) === "Nam" ? "true" : "false",
      birthday.toString()
    )
    console.log("check data in modal>> ", result);
    if (result.success) {
      // Only update the fields that were changed
      setProfile((prev) => ({
        ...prev,
        fullname: result.user.fullname,
        gender: result.user.ismale === true ? "Nam" : "Nữ",
        birthDay: result.user.birthday.split('-')[2],
        birthMonth: result.user.birthday.split('-')[1],
        birthYear: result.user.birthday.split('-')[0],
        bio: result.user.bio,
        phone: result.user.phone,
        avatarUrl: result.user.urlavatar || prev.avatarUrl,
        coverUrl: result.user.coverPhoto || prev.coverUrl,
      }))
      
      // Update Zustand store
      setUser(result.user, "")
      
      // Update NextAuth session
      await updateSession({
        user: result.user
      })

      setIsEditing(false)
    } else {
      console.error('Failed to update profile:', result.error)
    }
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

