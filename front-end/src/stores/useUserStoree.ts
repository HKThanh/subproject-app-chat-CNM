import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface UserState {
  user: IUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  setUser: (user: IUser, accessToken: string) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
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
        console.log('Setting user:', user); // Add debug log
        set({ user, accessToken });
      },
      setTokens: (accessToken, refreshToken) => {
        console.log('Setting tokens:', { accessToken, refreshToken }); // Add debug log
        set({ accessToken, refreshToken });
      },
      clearUser: () => {
        console.log('Clearing user'); // Add debug log
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
