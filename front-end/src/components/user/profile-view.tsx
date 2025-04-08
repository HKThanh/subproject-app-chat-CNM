"use client"

import { X, PenSquare, Camera } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import type { UserProfile } from "./profile-modal"
import { motion } from "framer-motion"

interface ProfileViewProps {
  profile: UserProfile
  onEdit: () => void
  onViewImage: (url: string) => void
}

export default function ProfileView({ profile, onEdit, onViewImage }: ProfileViewProps) {
  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header with close button */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Thông tin tài khoản</h2>
        <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Cover photo */}
      <div className="relative h-40 w-full cursor-pointer" onClick={() => onViewImage(profile.coverUrl)}>
<Image src={profile.coverUrl || `https://ui-avatars.com/api/?name=${profile.fullname}`} alt="Cover photo" fill className="object-cover" />
      </div>

      {/* Profile picture */}
      <div className="relative">
        <div
          className="absolute -top-12 left-4 rounded-full border-4 border-white overflow-hidden cursor-pointer"
          onClick={() => onViewImage(profile.avatarUrl)}
        >
          <div className="relative h-24 w-24">
            <Image src={profile.avatarUrl || `https://ui-avatars.com/api/?name=${profile.fullname}`} alt="Profile picture" fill className="object-cover" />
          </div>
          <div className="absolute bottom-0 right-0 bg-gray-100 rounded-full p-1">
            <Camera className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* User name */}
      <div className="mt-16 px-4">
        <div className="flex items-center">
          <h1 className="text-xl font-bold">{profile.fullname}</h1>
          <PenSquare className="h-4 w-4 ml-2 text-gray-500" />
        </div>
      </div>

      {/* User information */}
      <div className="p-4">
        <h3 className="font-semibold mb-4">Thông tin cá nhân</h3>

        <div className="space-y-4">
          <div className="flex">
            <span className="w-24 text-gray-500">Bio</span>
            <span>{profile.bio}</span>
          </div>

          <div className="flex">
            <span className="w-24 text-gray-500">Giới tính</span>
            <span>{profile.gender}</span>
          </div>

          <div className="flex">
            <span className="w-24 text-gray-500">Ngày sinh</span>
            <span>
              {profile.birthDay} tháng {profile.birthMonth}, {profile.birthYear}
            </span>
          </div>

          <div className="flex">
            <span className="w-24 text-gray-500">Điện thoại</span>
            <span>{profile.phone}</span>
          </div>

          <div className="text-xs text-gray-500 mt-4">
            Chỉ bạn bè có lưu số của bạn trong danh bạ mới xem được số này
          </div>
        </div>
      </div>

      {/* Update button */}
      <div className="p-4 flex justify-center border-t">
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="w-full">
          <Button variant="outline" className="w-full flex items-center justify-center" onClick={onEdit}>
            <PenSquare className="h-4 w-4 mr-2" />
            Cập nhật
          </Button>
        </motion.div>
      </div>
    </motion.div>
  )
}

