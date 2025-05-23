"use client"

import { X, PenSquare, Camera, Pencil, MessageSquare, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import type { UserProfile } from "./profile-modal"

interface ProfileViewProps {
  profile: UserProfile
  onEdit: () => void
  onViewImage: (url: string, type: "avatar" | "cover") => void
  isCurrentUser?: boolean
}

export default function ProfileView({ profile, onEdit, onViewImage, isCurrentUser = true }: ProfileViewProps) {
  return (
    <div className="relative">
      {/* Header with close button */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Thông tin tài khoản</h2>
      </div>

      {/* Cover photo */}
      <div className="relative h-32 bg-gradient-to-r from-blue-100 to-purple-100">
        {profile.coverUrl && (
          <img
            src={profile.coverUrl}
            alt="Cover"
            className="w-full h-full object-cover"
            onClick={() => onViewImage(profile.coverUrl, "cover")}
          />
        )}
        {/* Only show edit button for current user */}
        {isCurrentUser && onEdit && (
          <Button
            onClick={onEdit}
            size="sm"
            className="absolute top-2 right-2 bg-white/80 hover:bg-white text-gray-800"
          >
            <Pencil className="h-4 w-4 mr-1" />
            Chỉnh sửa
          </Button>
        )}
      </div>

      {/* Profile picture */}
      <div className="relative">
        <div
          className="absolute -top-12 left-4 rounded-full border-4 border-white overflow-hidden cursor-pointer"
          onClick={() => onViewImage(profile.avatarUrl || `https://ui-avatars.com/api/?name=${profile.fullname}`, "avatar")}
        >
          <div className="relative h-24 w-24">
            <Image src={profile.avatarUrl || `https://ui-avatars.com/api/?name=${profile.fullname}`} alt="Profile picture" fill className="object-cover" />
          </div>
          <div className="absolute bottom-0 right-0 bg-gray-100 rounded-full p-1">
            <Camera className="h-4 w-4" />
          </div>
        </div>
      </div>
        {/* Add contact/message buttons for other users' profiles */}
      {!isCurrentUser && (
        <div className="flex justify-center gap-3 mt-4 mb-6 px-4">
          <Button className="flex-1 bg-blue-500 hover:bg-blue-600">
            <MessageSquare className="h-4 w-4 mr-2" />
            Nhắn tin
          </Button>
          <Button variant="outline" className="flex-1">
            <UserPlus className="h-4 w-4 mr-2" />
            Kết bạn
          </Button>
        </div>
      )}
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

          {/* <div className="flex">
            <span className="w-24 text-gray-500">Điện thoại</span>
            <span>{profile.phone}</span>
          </div>

          <div className="text-xs text-gray-500 mt-4">
            Chỉ bạn bè có lưu số của bạn trong danh bạ mới xem được số này
          </div> */}
        </div>
      </div>

      {/* Update button - only show for current user */}
      {isCurrentUser && (
        <div className="p-4 flex justify-center border-t">
          <div className="w-full">
            <Button variant="outline" className="w-full flex items-center justify-center" onClick={onEdit}>
              <PenSquare className="h-4 w-4 mr-2" />
              Cập nhật
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

