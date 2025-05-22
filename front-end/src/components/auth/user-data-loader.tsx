"use client";

import { useSession, signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useUserStore from "@/stores/useUserStoree";

interface UserDataLoaderProps {
  children: React.ReactNode;
}

export default function UserDataLoader({ children }: UserDataLoaderProps) {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const { user, setUser, setTokens, isLoading, setLoading } = useUserStore();
  const [isInitialized, setIsInitialized] = useState(false);
  const [redirectAttempted, setRedirectAttempted] = useState(false);
  const [manualCheckDone, setManualCheckDone] = useState(false);

  // Kiểm tra localStorage khi component mount
  useEffect(() => {
    if (typeof window !== "undefined" && !manualCheckDone) {
      try {
        const storedData = localStorage.getItem("user-storage");
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          if (parsedData.state && parsedData.state.user) {
            
            // Khôi phục dữ liệu từ localStorage
            setUser(parsedData.state.user, parsedData.state.accessToken || "");
            if (parsedData.state.accessToken && parsedData.state.refreshToken) {
              setTokens(parsedData.state.accessToken, parsedData.state.refreshToken);
            }
            setIsInitialized(true);
          }
        }
      } catch (error) {
        console.error("Lỗi khi kiểm tra localStorage:", error);
      }
      setManualCheckDone(true);
    }
  }, [manualCheckDone, setUser, setTokens]);

  useEffect(() => {
    // Đặt trạng thái loading khi đang kiểm tra session
    if (status === "loading") {
      setLoading(true);
      return;
    }

    const initializeUserData = async () => {
      try {
        // Nếu đã đăng nhập qua NextAuth
        if (status === "authenticated" && session) {
          
          
          // Nếu chưa có user trong store nhưng có trong session
          if (!user && session.user) {
           
            
            // Lưu thông tin user từ session vào store
            setUser(session.user, session.accessToken);
            
            // Lưu tokens nếu có
            if (session.accessToken && session.refreshToken) {
              setTokens(session.accessToken, session.refreshToken);
            }
          }
          
          setLoading(false);
          setIsInitialized(true);
        } 
        // Nếu chưa đăng nhập nhưng có dữ liệu trong store
        else if (status === "unauthenticated" && user) {
          
          // Thử cập nhật session từ dữ liệu store
          try {
            // Cập nhật session NextAuth từ dữ liệu store
            await update({
              user: user,
              accessToken: useUserStore.getState().accessToken || "",
              refreshToken: useUserStore.getState().refreshToken || "",
            });
            
            setLoading(false);
            setIsInitialized(true);
          } catch (error) {
            console.error("Lỗi khi cập nhật session:", error);
            setLoading(false);
            setIsInitialized(true);
          }
        }
        // Nếu chưa đăng nhập và không có dữ liệu trong store
        else if (status === "unauthenticated" && !user && !redirectAttempted) {
          console.log("Chưa đăng nhập và không có dữ liệu user, chuyển hướng đến trang login");
          setRedirectAttempted(true);
          router.push("/auth/login");
        }
      } catch (error) {
        console.error("Lỗi khi khởi tạo dữ liệu user:", error);
        setLoading(false);
        setIsInitialized(true);
      }
    };

    initializeUserData();
  }, [session, status, user, setUser, setTokens, router, setLoading, redirectAttempted, update]);

  // Hiển thị trạng thái loading khi đang kiểm tra session hoặc tải dữ liệu
  if (status === "loading" || isLoading || !isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-[#8A56FF] border-gray-200 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải thông tin người dùng...</p>
        </div>
      </div>
    );
  }

  // Kiểm tra xem có user trong store không
  const currentUser = useUserStore.getState().user;
  if (!currentUser) {
    console.log("Không tìm thấy user trong store sau khi khởi tạo");
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-t-[#8A56FF] border-gray-200 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang xác thực người dùng...</p>
        </div>
      </div>
    );
  }

  // Nếu đã có user trong store, hiển thị nội dung
  return <>{children}</>;
}


