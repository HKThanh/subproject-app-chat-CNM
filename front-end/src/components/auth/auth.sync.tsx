"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import useUserStore from "@/stores/useUserStoree";

export default function AuthSync() {
  const { data: session, status } = useSession();
  const setUser = useUserStore((state) => state.setUser);
  const setTokens = useUserStore((state) => state.setTokens);
  const clearUser = useUserStore((state) => state.clearUser);

  // Use a state to track if we're mounted on the client
  const [isMounted, setIsMounted] = useState(false);

  // First effect just to mark component as mounted (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Second effect to handle auth sync, only runs on client
  useEffect(() => {
    // Skip if not mounted (server-side) or still loading
    if (!isMounted || status === "loading") return;

    if (!session?.user) {
      console.log("No valid session found, clearing user store");
      clearUser();
      return;
    }

    if (status === "authenticated" && session?.user) {
      const user: IUser = {
        id: session.user.id,
        fullname: session.user.fullname,
        urlavatar: session.user.urlavatar,
        birthday: session.user.birthday,
        createdAt: session.user.createdAt,
        email: session.user.email,
        bio: session.user.bio,
        coverPhoto: session.user.coverPhoto,
        ismale: session.user.ismale,
      };

      setUser(user, session.accessToken);
      setTokens(session.accessToken, session.refreshToken)
    }
  }, [isMounted, session, status, setUser, clearUser, setTokens]);

  return null;
}
