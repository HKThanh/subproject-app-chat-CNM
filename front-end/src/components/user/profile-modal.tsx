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
      });
    }
  }, [user])

  useEffect(() => {
    console.log("Profile updated:", profile);
  }, [profile]);

  const { data: session, update} = useSession()
  const setUser = useUserStore((state) => state.setUser)

  const handleUpdateProfile = async (updatedProfile: Partial<UserProfile>) => {
    const birthday = updatedProfile.birthYear && updatedProfile.birthMonth && updatedProfile.birthDay
      ? `${updatedProfile.birthYear}-${updatedProfile.birthMonth}-${updatedProfile.birthDay}`
      : profile.birthYear && profile.birthMonth && profile.birthDay
      ? `${profile.birthYear}-${profile.birthMonth}-${profile.birthDay}`
      : user?.birthday || '';

    const result = await updateProfile(
      updatedProfile.phone || profile.phone,
      updatedProfile.fullname || profile.fullname,
      (updatedProfile.gender || profile.gender) === "Nam" ? "true" : "false",
      birthday.toString()
    );

    console.log("Result from updateProfile:", result);

    if (result.success && result.user) {
      const newProfile = {
        fullname: result.user.fullname || "",
        bio: result.user.bio || "Hello là chào cậu 👋",
        gender: result.user.ismale === true ? "Nam" : "Nữ",
        birthDay: result.user.birthday?.split('-')[2] || "",
        birthMonth: result.user.birthday?.split('-')[1] || "",
        birthYear: result.user.birthday?.split('-')[0] || "",
        phone: result.user.phone || "",
        avatarUrl: result.user.urlavatar || profile.avatarUrl,
        coverUrl: result.user.coverPhoto || profile.coverUrl,
      };
      setProfile(newProfile as UserProfile);

      setUser({
        ...result.user,
        birthday: result.user.birthday || birthday,
        urlavatar: result.user.urlavatar || profile.avatarUrl,
        coverPhoto: result.user.coverPhoto || profile.coverUrl,
      }, "");
      console.log("Zustand user after update:", useUserStore.getState().user);

      await update({
        user: {
          id: result.user.id,
          fullname: result.user.fullname,
          bio: result.user.bio,
          birthday: result.user.birthday || birthday,
          phone: result.user.phone,
          urlavatar: result.user.urlavatar || profile.avatarUrl,
          coverPhoto: result.user.coverPhoto || profile.coverUrl,
          ismale: result.user.ismale === true || result.user.ismale === "true",
          // email: user?.email || result.user.email || "",
          createdAt: user?.createdAt || result.user.createdAt || "",
        },
        accessToken: session?.accessToken || "",
        refreshToken: session?.refreshToken || "",
      });
      console.log("Zustand session after update:", session);
      // Làm mới session thủ công
      // const updatedSession = await fetch("/api/auth/session").then((res) => res.json());
      // console.log("Updated session:", updatedSession);

      setIsEditing(false);
    } else {
      console.error('Failed to update profile:', result.error);
    }
  }

  const handleUpdateImage = (type: "avatar" | "cover", url: string) => {
    if (type === "avatar") {
      setProfile((prev) => ({ ...prev, avatarUrl: url }));
    } else {
      setProfile((prev) => ({ ...prev, coverUrl: url }));
    }
    setViewingImage(null);
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