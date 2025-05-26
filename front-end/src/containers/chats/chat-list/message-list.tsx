"use client";
import {
  MessageSquare,
  Phone,
  ImageIcon,
  Loader2,
  Clock,
  File,
} from "lucide-react";
import Image from "next/image";
import { Conversation } from "@/socket/useChat";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { useEffect, useState, useRef, useMemo } from "react";
import useUserStore from "@/stores/useUserStoree";
import { Avatar } from "@/components/ui/avatar";
import { BlockedAvatar } from "@/components/ui/blocked-avatar";
import { getAuthToken } from "@/utils/auth-utils";

interface MessageListProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  loading: boolean;
  activeTab: "DIRECT" | "GROUPS";
  searchTerm: string;
}

export default function MessageList({
  conversations,
  activeConversationId,
  onSelectConversation,
  loading,
  activeTab,
  searchTerm,
}: MessageListProps) {
  // Track previous conversation order to detect changes
  const prevConversationsRef = useRef<string[]>([]);
  const [animatingItems, setAnimatingItems] = useState<Set<string>>(new Set());
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());

  // Filter conversations based on active tab and search term
  const filteredConversations = useMemo(() => {
    if (!conversations || conversations.length === 0) {
      return [];
    }
    // First filter by tab type
    let filtered = conversations.filter((conv) => {
      if (activeTab === "DIRECT") return !conv.isGroup;
      if (activeTab === "GROUPS") return conv.isGroup === true;
      return true;
    });

    // Remove duplicates by conversation ID
    filtered = Array.from(
      new Map(filtered.map((conv) => [conv.idConversation, conv])).values()
    );

    // Then filter by search term if provided
    if (searchTerm && searchTerm.trim()) {
      filtered = filtered.filter((conv) => {
        const name = conv.isGroup
          ? conv.groupName
          : conv.otherUser?.fullname || "";

        return name.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    // Sort conversations by lastChange date (most recent first)
    return [...filtered].sort((a, b) => {
      // Convert dates to timestamps for comparison
      const dateA = new Date(a.lastChange).getTime();
      const dateB = new Date(b.lastChange).getTime();

      // Sort in descending order (newest first)
      return dateB - dateA;
    });
  }, [conversations, activeTab, searchTerm]);

  // Track conversation order changes and trigger animations
  useEffect(() => {
    // Get current conversation IDs in order
    const currentIds = filteredConversations.map((c) => c.idConversation);
    const prevIds = prevConversationsRef.current;

    // Find conversations that changed position
    const changedItems = new Set<string>();

    if (prevIds.length > 0) {
      currentIds.forEach((id, index) => {
        const prevIndex = prevIds.indexOf(id);
        // If item moved up in the list (lower index = higher in the list)
        if (prevIndex > index && prevIndex !== -1) {
          changedItems.add(id);
        }
      });
    }

    // Update ref with current order
    prevConversationsRef.current = currentIds;

    // Set animating items
    if (changedItems.size > 0) {
      setAnimatingItems(changedItems);

      // Clear animation flags after animation completes
      const timer = setTimeout(() => {
        setAnimatingItems(new Set());
      }, 500); // Match this to your animation duration

      return () => clearTimeout(timer);
    }
  }, [filteredConversations]);

  const user = useUserStore((state) => state.user);

  // Fetch blocked users
  useEffect(() => {
    const fetchBlockedUsers = async () => {
      try {
        const token = await getAuthToken();
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/user/blocked/get-blocked`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const result = await response.json();

        if (result.success) {
          const blockedIds = new Set<string>(
            result.data.map((user: any) => user.id as string)
          );
          setBlockedUserIds(blockedIds);
        }
      } catch (error) {
        console.error("Error fetching blocked users:", error);
      }
    };

    fetchBlockedUsers();

    // Listen for block/unblock events
    const handleUserBlocked = (event: CustomEvent) => {
      const { userId, isBlocked } = event.detail;
      setBlockedUserIds((prev) => {
        const newSet = new Set(prev);
        if (isBlocked) {
          newSet.add(userId);
        } else {
          newSet.delete(userId);
        }
        return newSet;
      });
    };

    window.addEventListener("userBlocked", handleUserBlocked as EventListener);

    return () => {
      window.removeEventListener(
        "userBlocked",
        handleUserBlocked as EventListener
      );
    };
  }, []);

  // Format message preview based on message type and sender
  const formatMessagePreview = (message: any) => {
    if (!message) return "Không có tin nhắn";

    // Add prefix for messages sent by the current user
    const prefix = message.idSender === user?.id ? "Bạn: " : "";

    // If message has a preview property (for non-text messages), use it
    if (message.preview) {
      return `${prefix}${message.preview}`;
    }

    // Otherwise format based on message type
    switch (message.type) {
      case "image":
        return `${prefix}Đã gửi một hình ảnh`;
      case "video":
        return `${prefix}Đã gửi một video`;
      case "document":
      case "file":
        return `${prefix}Đã gửi một tệp đính kèm`;
      default:
        return `${prefix}${message.content || ""}`;
    }
  };

  // Format thời gian
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true, locale: vi });
    } catch (error) {
      return "Không rõ";
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-200">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 text-chat-primary animate-spin" />
          <p className="mt-2 text-sm text-gray-500">
            Đang tải cuộc trò chuyện...
          </p>
        </div>
      </div>
    );
  }

  if (filteredConversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-200">
        <div className="flex flex-col items-center">
          <MessageSquare className="h-12 w-12 text-gray-300" />
          <p className="mt-2 text-gray-500">
            {activeTab === "DIRECT"
              ? "Không có cuộc trò chuyện trực tiếp nào"
              : "Không có nhóm trò chuyện nào"}
          </p>
          <p className="text-sm text-gray-400">
            {searchTerm
              ? "Thử tìm kiếm với từ khóa khác"
              : "Bắt đầu trò chuyện mới"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin bg-gray-200">
      {filteredConversations.map((conversation) => {
        // Check if there are unread messages
        const hasUnread = (conversation.unreadCount ?? 0) > 0;

        // Xác định xem cuộc trò chuyện có đang được chọn không
        const isActive = activeConversationId === conversation.idConversation;

        // Check if this item should be animated
        const isAnimating = animatingItems.has(conversation.idConversation);

        // Get message type icon
        const getMessageTypeIcon = () => {
          if (!conversation.latestMessage) return null;

          switch (conversation.latestMessage.type) {
            case "image":
              return <ImageIcon className="h-3 w-3 mr-1 text-gray-400" />;
            case "video":
              return <File className="h-3 w-3 mr-1 text-gray-400" />;
            case "document":
            case "file":
              return <File className="h-3 w-3 mr-1 text-gray-400" />;
            default:
              return null;
          }
        };

        // Determine display name and avatar based on conversation type
        const displayName = conversation.isGroup
          ? conversation.groupName
          : conversation.otherUser?.fullname || "Người dùng";

        const avatarSrc = conversation.isGroup
          ? conversation.groupAvatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              conversation.groupName || "Group"
            )}&background=random`
          : conversation.otherUser?.urlavatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              conversation.otherUser?.fullname || "User"
            )}&background=random`;

        // Check if the other user is blocked (only for direct conversations)
        const isOtherUserBlocked =
          !conversation.isGroup &&
          conversation.otherUser &&
          conversation.otherUser.id
            ? blockedUserIds.has(conversation.otherUser.id)
            : false;

        return (
          <div
            key={conversation.idConversation}
            className={`flex items-center px-4 py-3 cursor-pointer transition-colors duration-200 mb-2 mx-2 rounded-lg ${
              isActive
                ? "bg-chat-dark text-white"
                : "bg-white text-gray-900 hover:bg-gray-50"
            } ${isAnimating ? "animate-highlight" : ""}`}
            onClick={() => onSelectConversation(conversation.idConversation)}
          >
            <div className="relative mr-3">
              <Avatar className="h-12 w-12 border-2 border-white">
                <img src={avatarSrc} alt={`Avatar của ${displayName}`} />
              </Avatar>
              {/* Status indicator: blocked icon or online dot */}
              {!conversation.isGroup && (
                <>
                  {isOtherUserBlocked ? (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white bg-red-500 flex items-center justify-center">
                      <span className="text-white text-[8px]">🚫</span>
                    </div>
                  ) : conversation.otherUser?.isOnline ? (
                    <span
                      className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white bg-green-500"
                      title="Online"
                    ></span>
                  ) : null}
                </>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <h3
                  className={`${
                    hasUnread ? "font-bold" : "font-semibold"
                  } text-sm truncate`}
                >
                  {displayName}
                </h3>
                <span
                  className={`text-xs ${
                    isActive ? "text-gray-300" : "text-gray-500"
                  } whitespace-nowrap`}
                >
                  {formatTime(conversation.lastChange)}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <div className="flex items-center max-w-[180px]">
                  {getMessageTypeIcon()}
                  <p
                    className={`text-xs ${
                      hasUnread ? "font-semibold" : "font-normal"
                    } ${isActive ? "text-gray-300" : "text-gray-500"} truncate`}
                  >
                    {formatMessagePreview(conversation.latestMessage)}
                  </p>
                </div>
                {hasUnread && (
                  <div
                    className={`ml-1 ${
                      isActive
                        ? "bg-white text-chat-dark"
                        : "bg-chat-primary text-white"
                    } text-xs rounded-full h-5 min-w-5 flex items-center justify-center px-1.5 font-medium`}
                  >
                    {(conversation.unreadCount ?? 0) > 9
                      ? "9+"
                      : conversation.unreadCount ?? 0}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
