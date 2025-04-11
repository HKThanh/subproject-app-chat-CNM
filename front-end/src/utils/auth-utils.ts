"use client";

import { getSession } from "next-auth/react";
import useUserStore from "@/stores/useUserStoree";

/**
 * Lấy token xác thực từ session hoặc zustand store
 * @returns Promise<string | null> Token xác thực hoặc null nếu không tìm thấy
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    // Thử lấy token từ session
    const session = await getSession();
    const sessionToken = session?.accessToken;

    console.log('Session token:', sessionToken);

    if (sessionToken) {
      return sessionToken;
    }

    // Nếu không có trong session, thử lấy từ zustand
    const zustandToken = useUserStore.getState().accessToken;
    console.log('Zustand token:', zustandToken);

    return zustandToken || null;
  } catch (error) {
    console.error("Lỗi khi lấy token xác thực:", error);
    return null;
  }
}

/**
 * Tạo headers với token xác thực
 * @param token Token xác thực
 * @returns Headers với Authorization Bearer
 */
export function createAuthHeaders(token: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}
