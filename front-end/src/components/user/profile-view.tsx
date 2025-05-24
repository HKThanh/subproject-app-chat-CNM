"use client"

import {
  X,
  PenSquare,
  Camera,
  MessageSquare,
  UserPlus,
  UserX,
  Loader2,
  Loader2Icon,
  Calendar,
  Phone,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import Image from "next/image"
import type { UserProfile } from "./profile-modal"
import { motion } from "framer-motion"
import { on } from "events"

interface ProfileViewProps {
  profile: UserProfile
  onEdit: () => void
  onViewImage: (url: string, type: "avatar" | "cover") => void
  onStartChat?: () => void
  onAddFriend?: () => void
  onDeclineRequest?: () => void
  onRemoveFriend?: () => void
  onCancelRequest?: () => void
  onAcceptRequest?: () => void
  isCurrentUser?: boolean
  friendStatus?: "none" | "pending" | "requested" | "friends"
  isLoading?: boolean
  loadingAction?: "add" | "cancel" | "remove" | "accept" | "chat" | "decline" | null
}

export default function ProfileView({
  profile,
  onEdit,
  onViewImage,
  isCurrentUser = true,
  onStartChat,
  onAddFriend,
  onRemoveFriend,
  onCancelRequest,
  onDeclineRequest,
  onAcceptRequest,
  friendStatus = "none",
  isLoading = false,
  loadingAction = null,
}: ProfileViewProps) {
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut",
        staggerChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: { duration: 0.3 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  }

  // Handle cover photo click
  const handleCoverClick = () => {
    if (profile.coverUrl) {
      onViewImage(profile.coverUrl, "cover")
    }
  }

  return (
    <motion.div
      className="relative bg-white"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* Header */}
      <motion.div className="flex items-center justify-between p-3 border-b border-gray-100" variants={itemVariants}>
        <h2 className="text-xl font-bold text-gray-900">Thông tin tài khoản</h2>
        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
          {isCurrentUser ? "Tài khoản của bạn" : "Thông tin bạn bè"}
        </Badge>
      </motion.div>

      {/* Cover Photo Section - Fixed */}
      <motion.div
        className="relative h-32 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-400 overflow-hidden cursor-pointer group"
        variants={itemVariants}
        onClick={handleCoverClick}
      >
        {profile.coverUrl ? (
          <>
            <Image
              src={profile.coverUrl || "/placeholder.svg"}
              alt="Cover Photo"
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 600px) 100vw, 600px"
              priority={false}
            />
            {/* Overlay for better interaction */}
            <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors" />

            {/* Camera icon for cover photo */}
            {isCurrentUser && (
              <motion.div
                className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                whileHover={{ scale: 1.1 }}
              >
                <Camera className="h-4 w-4 text-gray-700" />
              </motion.div>
            )}
          </>
        ) : (
          <>
            {/* Default gradient background when no cover photo */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-400" />
            {isCurrentUser && (
              <motion.div
                className="absolute top-3 right-3 bg-white/80 backdrop-blur-sm rounded-full p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                whileHover={{ scale: 1.1 }}
              >
                <Camera className="h-4 w-4 text-gray-700" />
              </motion.div>
            )}
          </>
        )}

        {/* Gradient overlay for better text readability - positioned to not interfere with clicks */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      </motion.div>

      {/* Profile Picture & Basic Info */}
      <motion.div className="relative px-3" variants={itemVariants}>
        <div className="flex items-end justify-between -mt-12 mb-3">
          <motion.div
            className="relative group cursor-pointer"
            onClick={() =>
              onViewImage(profile.avatarUrl || `https://ui-avatars.com/api/?name=${profile.fullname}`, "avatar")
            }
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="relative h-20 w-20 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white">
              <Image
                src={profile.avatarUrl || `https://ui-avatars.com/api/?name=${profile.fullname}`}
                alt="Profile picture"
                fill
                className="object-cover transition-transform group-hover:scale-110"
                sizes="80px"
              />
            </div>
            {/* Camera icon for avatar */}
            {isCurrentUser && (
              <motion.div
                className="absolute bottom-1 right-1 bg-white rounded-full p-1.5 shadow-lg border border-gray-200 group-hover:bg-blue-50 transition-colors"
                whileHover={{ scale: 1.1 }}
              >
                <Camera className="h-3 w-3 text-gray-600 group-hover:text-blue-600" />
              </motion.div>
            )}
          </motion.div>

          {/* Online Status Badge */}
          {/* <motion.div
            className="mb-4"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Badge className="bg-green-100 text-green-800 border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
              Đang hoạt động
            </Badge>
          </motion.div> */}
        </div>

        {/* User Name & Bio */}
        <motion.div className="mb-6" variants={itemVariants}>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{profile.fullname}</h1>
          <p className="text-gray-600 text-sm leading-relaxed">{profile.bio}</p>
        </motion.div>
      </motion.div>

      {/* Action Buttons for Other Users */}
      {!isCurrentUser && (
        <motion.div className="px-3 mb-3" variants={itemVariants}>
          <div className="flex gap-3">
            {friendStatus === "friends" && (
              <>
                <motion.div className="flex-1" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg py-2"
                    onClick={onStartChat}
                    disabled={isLoading && loadingAction === "chat"}
                  >
                    {isLoading && loadingAction === "chat" ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <MessageSquare className="h-4 w-4 mr-2" />
                    )}
                    Nhắn tin
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200 py-2"
                    onClick={onRemoveFriend}
                    disabled={isLoading && loadingAction === "remove"}
                  >
                    {isLoading && loadingAction === "remove" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserX className="h-4 w-4" />
                    )}
                  </Button>
                </motion.div>
              </>
            )}

            {friendStatus === "none" && (
              <motion.div className="w-full" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  className="w-full border-blue-200 text-blue-600 hover:bg-blue-50 py-2"
                  onClick={onAddFriend}
                  disabled={isLoading && loadingAction === "add"}
                >
                  {isLoading && loadingAction === "add" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  Kết bạn
                </Button>
              </motion.div>
            )}

            {friendStatus === "pending" && (
              <motion.div className="w-full" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  variant="outline"
                  className="w-full text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200 py-2"
                  onClick={onCancelRequest}
                  disabled={isLoading && loadingAction === "cancel"}
                >
                  {isLoading && loadingAction === "cancel" ? (
                    <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <X className="h-4 w-4 mr-2" />
                  )}
                  Thu hồi lời mời
                </Button>
              </motion.div>
            )}

            {friendStatus === "requested" && (
              <motion.div className="flex flex-col w-full gap-3" variants={itemVariants}>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg py-2"
                    onClick={onAcceptRequest}
                    disabled={isLoading && loadingAction === "accept"}
                  >
                    {isLoading && loadingAction === "accept" ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-2" />
                    )}
                    Chấp nhận
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outline"
                    className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200 py-2"
                    onClick={onDeclineRequest}
                    disabled={isLoading && loadingAction === "decline"}
                  >
                    {isLoading && loadingAction === "decline" ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <X className="h-4 w-4 mr-2" />
                    )}
                    Từ chối
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      <Separator className="mx-6" />

      {/* User Information */}
      <motion.div className="p-3" variants={itemVariants}>
        <h3 className="font-semibold text-lg text-gray-900 mb-4 flex items-center">
          <div className="w-1 h-6 bg-blue-500 rounded-full mr-3" />
          Thông tin cá nhân
        </h3>

        <div className="space-y-2">
          <motion.div
            className="flex items-center p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            whileHover={{ x: 2 }}
          >
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
              <PenSquare className="w-3 h-3 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-gray-500 block">Tiểu sử</span>
              <span className="text-gray-900 text-sm font-medium line-clamp-1 break-words">{profile.bio}</span>
            </div>
          </motion.div>

          <motion.div
            className="flex items-center p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            whileHover={{ x: 2 }}
          >
            <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
              <div className="w-3 h-3 bg-purple-600 rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-gray-500 block">Giới tính</span>
              <span className="text-gray-900 text-sm font-medium">{profile.gender}</span>
            </div>
          </motion.div>

          <motion.div
            className="flex items-center p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            whileHover={{ x: 2 }}
          >
            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
              <Calendar className="w-3 h-3 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-gray-500 block">Ngày sinh</span>
              <span className="text-gray-900 text-sm font-medium">
                {profile.birthDay ? `${profile.birthDay} tháng ${profile.birthMonth}, ${profile.birthYear}` : "Chưa cập nhật"}
              </span>
            </div>
          </motion.div>

          {/* Phone field */}
          <motion.div
            className="flex items-center p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            whileHover={{ x: 2 }}
          >
            <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
              <Phone className="w-3 h-3 text-orange-600" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs text-gray-500 block">Số điện thoại</span>
              <span className="text-gray-900 text-sm font-medium">{profile.phone || "Chưa cập nhật"}</span>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <Separator className="mx-6" />

      {/* Update Button */}
      {isCurrentUser && (
        <motion.div className="p-3" variants={itemVariants}>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full">
            <Button
              variant="outline"
              className="w-full flex items-center justify-center border-blue-200 text-blue-600 hover:bg-blue-50 py-2"
              onClick={onEdit}
            >
              <PenSquare className="h-4 w-4 mr-2" />
              Cập nhật thông tin
            </Button>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  )
}
