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
import { toast } from "sonner"

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
  id?: string
  email?: string
}

interface ProfileModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  userId?: string;
  userData?: UserProfile; // prop userData để nhận dữ liệu trực tiếp
  onStartChat?: () => void; // callback để bắt đầu chat
  onAddFriend?: (userId: string) => void; //  callback để thêm bạn
  onCancelRequest?: (requestId: string) => void; // callback để thu hồi lời mời
  onDeclineRequest?: (requestId: string) => void; // callback để từ chối lời mời
  onRemoveFriend?: (userId: string) => void; // callback để hủy kết bạn
  onAcceptRequest?: (requestId: string) => void; // callback để chấp nhận lời mời
  friendStatus?: "none" | "pending" | "requested" | "friends"; // trạng thái bạn bè
  friendRequestId?: string; // ID của lời mời kết bạn (nếu có)
}

export default function ProfileModal({ userId, userData, onStartChat, onAddFriend, onCancelRequest,
  onRemoveFriend, onDeclineRequest, onAcceptRequest,
  friendStatus = "none",
  friendRequestId, }: ProfileModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [viewingImage, setViewingImage] = useState<string | null>(null)
  const [imageType, setImageType] = useState<"avatar" | "cover" | null>(null)
  const [isCurrentUser, setIsCurrentUser] = useState(true) // Flag to determine if viewing own profile
  const [isLoading, setIsLoading] = useState(false)
  const [loadingAction, setLoadingAction] = useState<"add" | "cancel" | "remove" | "accept" | "chat" | "decline"| null>(null)
  const currentUser = useUserStore((state) => state.user)
  const accessToken = useUserStore((state) => state.accessToken)
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

  const { data: session, update } = useSession()
  const setUser = useUserStore((state) => state.setUser)

  // Fetch user profile data based on userId
  useEffect(() => {
    if (userData) {
      // Sử dụng dữ liệu được truyền vào trực tiếp
      setIsCurrentUser(false) // Đây là profile của người khác
      setProfile(userData);
    } else if (currentUser) {
      // Nếu không có userData, sử dụng dữ liệu người dùng hiện tại
      setIsCurrentUser(true)
      setProfile({
        fullname: currentUser.fullname?.toString() || "",
        bio: currentUser.bio?.toString() || "Hello là chào cậu 👋",
        gender: currentUser.ismale === true ? "Nam" : "Nữ",
        birthDay: currentUser.birthday?.split('-')[2] || "",
        birthMonth: currentUser.birthday?.split('-')[1] || "",
        birthYear: currentUser.birthday?.split('-')[0] || "",
        phone: currentUser.phone?.toString() || "",
        avatarUrl: currentUser.urlavatar?.toString() || "",
        coverUrl: currentUser.coverPhoto?.toString() || "",
        id: currentUser.id
      });
    }
  }, [currentUser, userData])
  // Tạo các hàm wrapper để xử lý loading state
  const handleStartChat = () => {
    if (isLoading) return;
    setIsLoading(true);
    setLoadingAction("chat");
    
    // Gọi callback gốc
    if (onStartChat) {
      onStartChat();
    }
    
    // Reset loading state sau 1 khoảng thời gian (hoặc trong callback thành công)
    setTimeout(() => {
      setIsLoading(false);
      setLoadingAction(null);
    }, 1000);
  };

  const handleAddFriend = (userId: string) => {
    if (isLoading) return;
    setIsLoading(true);
    setLoadingAction(friendStatus === "requested" ? "accept" : "add");
    
    // Gọi callback gốc
    if (onAddFriend) {
      onAddFriend(userId);
    }
    
    // Reset loading state sau khi hoàn thành (nên được gọi trong callback thành công)
    // Tạm thời dùng timeout để mô phỏng
    setTimeout(() => {
      setIsLoading(false);
      setLoadingAction(null);
    }, 1000);
  };

  const handleCancelRequest = (requestId: string) => {
    console.log("handleCancelRequest called with requestId:", requestId);
    if (isLoading) return;
    setIsLoading(true);
    setLoadingAction("cancel");
    
    // Gọi callback gốc
    if (onCancelRequest) {
      onCancelRequest(requestId);
    }
    
    // Reset loading state
    setTimeout(() => {
      setIsLoading(false);
      setLoadingAction(null);
    }, 1000);
  };
  const handleDeclineRequest = (requestId: string) => {
    if (isLoading) return;
    setIsLoading(true);
    setLoadingAction("decline");
    
    // Gọi callback gốc
    if (onDeclineRequest) {
      onDeclineRequest(requestId);
    }
    
    // Reset loading state
    setTimeout(() => {
      setIsLoading(false);
      setLoadingAction(null);
    }, 1000); 
  }

  const handleAcceptRequest = (requestId: string) => {
    if (isLoading) return;
    setIsLoading(true);
    setLoadingAction("accept");
    
    // Gọi callback gốc
    if (onAcceptRequest) {
      onAcceptRequest(requestId);
    }
    
    // Reset loading state
    setTimeout(() => {
      setIsLoading(false);
      setLoadingAction(null);
    }, 1000); 
  }
  const handleRemoveFriend = (userId: string) => {
    if (isLoading) return;
    setIsLoading(true);
    setLoadingAction("remove");
    
    // Gọi callback gốc
    if (onRemoveFriend) {
      onRemoveFriend(userId);
    }
    
    // Reset loading state
    setTimeout(() => {
      setIsLoading(false);
      setLoadingAction(null);
    }, 1000);
  };
  const handleUpdateProfile = async (updatedProfile: Partial<UserProfile>) => {
    const birthday = updatedProfile.birthYear && updatedProfile.birthMonth && updatedProfile.birthDay
      ? `${updatedProfile.birthYear}-${updatedProfile.birthMonth}-${updatedProfile.birthDay}`
      : profile.birthYear && profile.birthMonth && profile.birthDay
        ? `${profile.birthYear}-${profile.birthMonth}-${profile.birthDay}`
        : currentUser?.birthday || '';

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
          createdAt: currentUser?.createdAt || result.user.createdAt || "",
        },
        accessToken: session?.accessToken || "",
        refreshToken: session?.refreshToken || "",
      });
      console.log("Zustand session after update:", session);
      // Làm mới session thủ công
      // const updatedSession = await fetch("/api/auth/session").then((res) => res.json());
      // console.log("Updated session:", updatedSession);
      toast.success("Cập nhật thành công")
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
        {isLoading && !loadingAction ? (
          <div className="flex items-center justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            {isCurrentUser && isEditing ? (
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
                onEdit={isCurrentUser ? () => setIsEditing(true) : () => {}}
                onViewImage={handleViewImage}
                isCurrentUser={isCurrentUser}
                friendStatus={friendStatus}
                isLoading={isLoading}
                loadingAction={loadingAction}
                onStartChat={handleStartChat}
                onAddFriend={profile.id ? () => handleAddFriend(profile.id!) : undefined}
                onCancelRequest={friendRequestId ? () => handleCancelRequest(friendRequestId) : undefined}
                onRemoveFriend={profile.id ? () => handleRemoveFriend(profile.id!) : undefined}
                onDeclineRequest={friendRequestId ? () => handleDeclineRequest(friendRequestId) : undefined}
                onAcceptRequest={friendRequestId ? () => handleAcceptRequest(friendRequestId) : undefined}
              />
            )}
          </AnimatePresence>
        )}
      </DialogContent>

      {viewingImage && (
        <ImageViewer
          imageUrl={viewingImage}
          isOpen={!!viewingImage}
          onClose={() => {
            setViewingImage(null);
            setImageType(null);
          }}
          onUpdate={isCurrentUser ? handleUpdateImage : () => { }}
          imageType={imageType || "avatar"}
          readOnly={!isCurrentUser}
        />
      )}
    </>
  );
}
