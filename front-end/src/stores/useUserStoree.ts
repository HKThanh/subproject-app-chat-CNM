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

// We'll use a function to check server/client environment
const getIsServer = () => typeof window === "undefined";

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
      storage: createJSONStorage(() => {
        // Check environment at runtime
        if (getIsServer()) {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return sessionStorage;
      }),
      // Skip persistence on server
      skipHydration: true,
    },
  ),
);

export default useUserStore;
