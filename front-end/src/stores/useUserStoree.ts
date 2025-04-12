import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface UserState {
  user: IUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setUser: (user: IUser, accessToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  refreshTokens: (refreshToken: string) => Promise<boolean>;
  clearUser: () => void;
}

// Check if we're in a browser environment
const isServer = typeof window === "undefined";

const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setUser: (user, accessToken) => {
        set({ user, accessToken });
      },
      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken });
      },
      refreshTokens: async (refreshToken) => {
        try {
          // Giải mã refresh token để lấy userId
          const base64Url = refreshToken.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));

          const decoded = JSON.parse(jsonPayload);
          console.log('Decoded refresh token in store:', decoded);

          const response = await fetch('http://localhost:3000/auth/refresh-token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              refreshToken,
              platform: "web",
              userId: decoded.id // Thêm userId để backend có thể xác minh
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Refresh token error in store:', errorData);
            throw new Error(`Refresh token failed with status: ${response.status}`);
          }

          const data = await response.json();
          console.log('Refresh token response in store:', data);

          if (data.accessToken) {
            set({
              accessToken: data.accessToken,
              refreshToken: data.refreshToken || refreshToken // Giữ lại token cũ nếu không có token mới
            });
            return true;
          }
          return false;
        } catch (error) {
          console.error('Error refreshing token in store:', error);
          return false;
        }
      },
      clearUser: () => {
        set({ user: null, accessToken: null, refreshToken: null });
      },
    }),
    {
      name: "user-session",
      // Only use storage in browser environment
      storage: isServer
        ? createJSONStorage(() => ({
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          }))
        : createJSONStorage(() => sessionStorage),
      // Skip persistence on server
      skipHydration: isServer,
    },
  ),
);

export default useUserStore;
