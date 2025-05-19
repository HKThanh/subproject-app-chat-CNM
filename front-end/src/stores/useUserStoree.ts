import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface IUser {
  id: string;
  fullname: string;
  email: string;
  urlavatar?: string;
  birthday?: string;
  createdAt?: string;
  phone?: string;
  bio?: string;
  coverPhoto?: string;
  ismale?: boolean;
  friendList?: string[];
  isVerified?: boolean;
  blockedUsers?: string[];
}

interface UserState {
  user: IUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  setUser: (user: IUser, accessToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearUser: () => void;
  setLoading: (isLoading: boolean) => void;
}

// Check if we're in a browser environment
const isServer = typeof window === "undefined";

const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      
      setUser: (user, accessToken) => {
        console.log("Setting user in store:", user);
        set({ 
          user: { ...user }, 
          accessToken,
          isLoading: false 
        });
        console.log("User after set:", get().user);
        
        // Lưu vào localStorage thủ công để đảm bảo
        if (!isServer) {
          try {
            const userData = {
              state: {
                user: { ...user },
                accessToken,
                refreshToken: get().refreshToken
              }
            };
            localStorage.setItem("user-storage", JSON.stringify(userData));
            console.log("Manually saved to localStorage");
          } catch (error) {
            console.error("Error saving to localStorage:", error);
          }
        }
      },
      
      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken });
        
        // Cập nhật localStorage khi tokens thay đổi
        if (!isServer && get().user) {
          try {
            const userData = {
              state: {
                user: get().user,
                accessToken,
                refreshToken
              }
            };
            localStorage.setItem("user-storage", JSON.stringify(userData));
            console.log("Tokens saved to localStorage");
          } catch (error) {
            console.error("Error saving tokens to localStorage:", error);
          }
        }
      },
      
      clearUser: () => {
        set({ 
          user: null, 
          accessToken: null, 
          refreshToken: null 
        });
        
        // Xóa khỏi localStorage
        if (!isServer) {
          try {
            localStorage.removeItem("user-storage");
            console.log("User data removed from localStorage");
          } catch (error) {
            console.error("Error removing from localStorage:", error);
          }
        }
      },
      
      setLoading: (isLoading) => {
        set({ isLoading });
      },
    }),
    {
      name: "user-storage",
      storage: !isServer 
        ? createJSONStorage(() => localStorage)
        : createJSONStorage(() => ({
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          })),
      skipHydration: true, // Bỏ qua hydration tự động
    }
  )
);

// Hàm để hydrate store từ localStorage
export const hydrateUserStore = () => {
  if (typeof window !== "undefined") {
    try {
      const storedData = localStorage.getItem("user-storage");
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        if (parsedData.state && parsedData.state.user) {
          useUserStore.setState({
            user: parsedData.state.user,
            accessToken: parsedData.state.accessToken,
            refreshToken: parsedData.state.refreshToken,
            isLoading: false,
          });
          console.log("Hydrated user store from localStorage");
        }
      }
    } catch (error) {
      console.error("Error hydrating from localStorage:", error);
    }
  }
};

export default useUserStore;
