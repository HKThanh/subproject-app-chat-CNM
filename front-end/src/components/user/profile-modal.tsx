"use client"

import { useState, useEffect } from "react"
import { DialogContent, DialogTitle } from "@/components/ui/dialog"
import ProfileView from "./profile-view"
import ProfileEdit from "./profile-edit"
import ImageViewer from "./image-viewer"
import { AnimatePresence } from "framer-motion"
import useUserStore from "@/stores/useUserStoree"
import { useSession } from "next-auth/react"
import { updateProfile } from "@/actions/userActions"
import { getAuthToken } from "@/utils/auth-utils"

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

interface ProfileModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  
}

export default function ProfileModal() {
  const [isEditing, setIsEditing] = useState(false)
  const [viewingImage, setViewingImage] = useState<string | null>(null)
  const [imageType, setImageType] = useState<"avatar" | "cover" | null>(null)

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

  const { data: session, update} = useSession()
  const setUser = useUserStore((state) => state.setUser)

  const handleUpdateProfile = async (updatedProfile: Partial<UserProfile>) => {
    const birthday = updatedProfile.birthYear && updatedProfile.birthMonth && updatedProfile.birthDay
      ? `${updatedProfile.birthYear}-${updatedProfile.birthMonth}-${updatedProfile.birthDay}`
      : profile.birthYear && profile.birthMonth && profile.birthDay
      ? `${profile.birthYear}-${profile.birthMonth}-${profile.birthDay}`
      : user?.birthday || '';

    // Lấy accessToken từ session hoặc zustand
    const accessToken = await getAuthToken();

    if (!accessToken) {
      console.error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
      return;
    }

    const result = await updateProfile(
      updatedProfile.phone || profile.phone,
      updatedProfile.fullname || profile.fullname,
      (updatedProfile.gender || profile.gender) === "Nam" ? "true" : "false",
      birthday.toString(),
      updatedProfile.bio || profile.bio,
      accessToken
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

  const handleViewImage = (url: string, type: "avatar" | "cover") => {
    setViewingImage(url);
    setImageType(type);
  };

  return (
    <>
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
              onViewImage={handleViewImage}
            />
          )}
        </AnimatePresence>
      </DialogContent>

      {viewingImage && (
        <ImageViewer
          imageUrl={viewingImage}
          isOpen={!!viewingImage}
          onClose={() => {
            setViewingImage(null);
            setImageType(null);
          }}
          onUpdate={handleUpdateImage}
          imageType={imageType || "avatar"}
        />
      )}
    </>
  );
}
