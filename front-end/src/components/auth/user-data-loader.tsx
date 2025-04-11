"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import useUserStore from "@/stores/useUserStoree";
import { Loader2 } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

interface UserDataLoaderProps {
  children: React.ReactNode;
}

export default function UserDataLoader({ children }: UserDataLoaderProps) {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const setTokens = useUserStore((state) => state.setTokens);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const initializeUser = async () => {
      setIsLoading(true); // Set loading state at start

      try {
        if (status === "loading") return;

        if (status === "authenticated" && session?.user) {
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

          // Set user data và tokens
          setUser(userData, session.accessToken);
          setTokens(session.accessToken, session.refreshToken);

          // Chỉ refresh khi cần thiết
          if (pathname === '/chat' && !userData) {
            router.refresh();
          }
        }
      } catch (error) {
        console.error('Error initializing user:', error);
      } finally {
        setIsLoading(false); // Always set loading to false when done
      }
    };

    initializeUser();
  }, [session, status, pathname]); // Remove user from dependencies

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

  return <>{children}</>;
}


