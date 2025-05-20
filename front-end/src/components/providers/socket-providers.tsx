"use client";

import { ReactNode, useEffect, useState } from "react";
import { SocketProvider } from "@/socket/SocketContext";
import { ChatProvider } from "@/socket/ChatContext";
import useUserStore from "@/stores/useUserStoree";
import { useSession } from "next-auth/react";

interface SocketProvidersProps {
  children: ReactNode;
}

export default function SocketProviders({ children }: SocketProvidersProps) {
  const { data: session } = useSession();
  const user = useUserStore((state) => state.user);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  
  useEffect(() => {
    // Ưu tiên lấy userId từ store trước, nếu không có thì lấy từ session
    const id = user?.id || session?.user?.id;
    
    if (id && id !== userId) {
      console.log("Đã tìm thấy userId:", id);
      setUserId(id);
    }
  }, [user, session, userId]);

  // Nếu chưa có userId, hiển thị loading hoặc thông báo
  if (!userId) {
    console.log("Đang đợi userId...");
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-[#8A56FF] border-gray-200 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang kết nối đến máy chủ...</p>
        </div>
      </div>
    );
  }

  return (
    <SocketProvider>
      <ChatProvider userId={userId}>
        {children}
      </ChatProvider>
    </SocketProvider>
  );
}
