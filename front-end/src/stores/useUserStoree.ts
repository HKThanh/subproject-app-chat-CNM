import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface UserState {
  user: IUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean; // Add loading state
  setUser: (user: IUser, accessToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  refreshTokens: (refreshToken: string) => Promise<boolean>;
  clearUser: () => void;
  setLoading: (isLoading: boolean) => void;
}

// Check if we're in a browser environment
const isServer = typeof window === "undefined";

const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: true, // Initialize as true to show loading on first render
      setUser: (user, accessToken) => {
        set({ user, accessToken, isLoading: false }); // Set loading to false when user is set
      },
      setTokens: (accessToken, refreshToken) => {
        set({ accessToken, refreshToken });
      },
      refreshTokens: async (refreshToken) => {
        try {
          set({ isLoading: true }); // Set loading to true during token refresh
          // Giải mã refresh token để lấy userId
          const base64Url = refreshToken.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));

          const decoded = JSON.parse(jsonPayload);
          console.log('Decoded refresh token in store:', decoded);
          const api = process.env.NEXT_PUBLIC_API;
          const response = await fetch(`${api}/auth/refresh-token`, {
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
            set({ isLoading: false }); // Set loading to false on error
            throw new Error(`Refresh token failed with status: ${response.status}`);
          }

          const data = await response.json();
          console.log('Refresh token response in store:', data);

          if (data.accessToken) {
            set({
              accessToken: data.accessToken,
              refreshToken: data.refreshToken || refreshToken, // Giữ lại token cũ nếu không có token mới
              isLoading: false // Set loading to false on success
            });
            return true;
          }
          set({ isLoading: false }); // Set loading to false if no access token
          return false;
        } catch (error) {
          console.error('Error refreshing token in store:', error);
          set({ isLoading: false }); // Set loading to false on error
          return false;
        }
      },
      clearUser: () => {
        set({ user: null, accessToken: null, refreshToken: null, isLoading: false });
      },
      setLoading: (isLoading) => {
        set({ isLoading });
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
      onRehydrateStorage: () => (state) => {
        // When store is rehydrated, set loading to false if we have a user
        if (state && state.user) {
          state.setLoading(false);
        } else {
          // Keep loading true if no user found
          state?.setLoading(true);
        }
      }
    },
  ),
);

export default useUserStore;
