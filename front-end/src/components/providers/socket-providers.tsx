"use client";

import { ReactNode } from "react";
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
  
  // Lấy userId từ session hoặc store
  const userId = user?.id || session?.user?.id;

  if (!userId) {
    // Nếu chưa có userId, chỉ render children mà không cung cấp socket
    return <>{children}</>;
  }

  return (
    <SocketProvider>
      <ChatProvider userId={userId}>
        {children}
      </ChatProvider>
    </SocketProvider>
  );
}
