"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import useUserStore from "@/stores/useUserStoree";

export default function AuthSync() {
  const { data: session, status } = useSession();
  const setUser = useUserStore((state) => state.setUser);
  const clearUser = useUserStore((state) => state.clearUser);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      console.log("No valid session found, clearing user store");
      clearUser();
      return;
    }

    const user: IUser = {
      id: session.user.id,
      username: session.user.username,
      phone: session.user.phone,
      fullname: session.user.fullname,
    };

    console.log("Syncing user to store:", user);
    setUser(user, session.accessToken);
  }, [session, status, setUser, clearUser]);

  return null;
}
