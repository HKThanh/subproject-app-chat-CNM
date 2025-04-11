"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import useUserStore from "@/stores/useUserStoree";

export default function AuthSync() {
  const { data: session, status } = useSession();
  const setUser = useUserStore((state) => state.setUser);
  const setTokens = useUserStore((state) => state.setTokens);
  const clearUser = useUserStore((state) => state.clearUser);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      console.log("No valid session found, clearing user store");
      clearUser();
      return;
    }
    console.log("check status >>> ", status);
    
    if (status === "authenticated" && session?.user) {
      const user: IUser = {
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

      console.log("Syncing user to store:", user);
      setUser(user, session.accessToken);
      setTokens(session.accessToken, session.refreshToken)
    }
  }, [session, status, setUser, clearUser]);

  return null;
}
