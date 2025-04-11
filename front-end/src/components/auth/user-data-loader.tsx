"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import useUserStore from "@/stores/useUserStoree";
import { Loader2 } from "lucide-react";

interface UserDataLoaderProps {
  children: React.ReactNode;
}

export default function UserDataLoader({ children }: UserDataLoaderProps) {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const setTokens = useUserStore((state) => state.setTokens);

  useEffect(() => {
    // Nếu đang loading session, tiếp tục chờ
    if (status === "loading") return;
    // Nếu đã authenticated và có session
    if (status === "authenticated" && session?.user) {
      // Nếu chưa có user trong store, set user từ session
      if (!user) {
        console.log("check data user>>> ", user);
        const userData: IUser = {
          id: session.user.id,
          fullname: session.user.fullname,
          urlavatar: session.user.urlavatar,
          birthday: session.user.birthday,
          createdAt: session.user.createdAt,
          email: session.user.email,
          bio: session.user.bio,
          phone: session.user.phone,
          coverPhoto: session.user.coverPhoto,
          ismale: session.user.ismale,
        };

        // Đặt một Promise để đảm bảo thứ tự thực thi
        Promise.all([
          new Promise(resolve => {
            setUser(userData, session.accessToken);
            resolve(true);
          }),
          new Promise(resolve => {
            setTokens(session.accessToken, session.refreshToken);
            resolve(true);
          })
        ]).then(() => {
          // Đảm bảo zustand đã được cập nhật trước khi reload
          window.location.reload();
        });
        
        return;
      }
      
      setIsLoading(false);
    } else if (status === "unauthenticated") {
      // Nếu không authenticated, không cần loading
      setIsLoading(false);
    }
  }, [session, status, user, setUser, setTokens]);

  // Hiển thị loading spinner khi đang tải dữ liệu
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Đang tải thông tin người dùng...</p>
        </div>
      </div>
    );
  }

  // Khi đã tải xong, hiển thị children
  return <>{children}</>;
}


