"use client";

import { getSession } from "next-auth/react";
import useUserStore from "@/stores/useUserStoree";

/**
 * Kiểm tra token đã hết hạn chưa
 * @param token JWT token cần kiểm tra
 * @returns boolean True nếu token đã hết hạn
 */
export function isTokenExpired(token: string): boolean {
  try {
    // Decode JWT payload
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const decoded = JSON.parse(jsonPayload);
    const currentTime = Math.floor(Date.now() / 1000);

    return decoded.exp < currentTime;
  } catch (error) {
    console.error('Error decoding token:', error);
    return true;
  }
}

/**
 * Refresh token khi access token hết hạn
 * @param refreshToken Refresh token hiện tại
 * @returns Promise<{accessToken: string, refreshToken?: string} | null>
 */
async function refreshAccessToken(refreshToken: string): Promise<{accessToken: string, refreshToken?: string} | null> {
  try {
    console.log('Refreshing access token...');

    // Giải mã token để lấy thông tin
    const base64Url = refreshToken.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const decoded = JSON.parse(jsonPayload);
    console.log('Decoded refresh token:', decoded);
    const api = process.env.NEXT_PUBLIC_API;
    // Gửi request refresh token với platform
    const response = await fetch(`${api}/auth/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken,
        platform: "web",
        // Thêm userId từ token để backend có thể xác minh
        userId: decoded.id
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Refresh token error response:', errorData);
      throw new Error(`Refresh token failed with status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Refresh token response:', data);

    if (!data.accessToken) {
      throw new Error('No access token in refresh response');
    }

    // Cập nhật token trong Zustand store
    if (data.accessToken) {
      const userStore = useUserStore.getState();
      userStore.setTokens(data.accessToken, data.refreshToken || refreshToken);
    }

    return {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken || refreshToken // Giữ lại token cũ nếu không có token mới
    };
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
}

/**
 * Lấy token xác thực từ session hoặc zustand store
 * Tự động refresh nếu token hết hạn
 * @returns Promise<string | null> Token xác thực hoặc null nếu không tìm thấy
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const session = await getSession();
    let accessToken = session?.accessToken;
    let refreshToken = session?.refreshToken;

    if (!accessToken) {
      const userStore = useUserStore.getState();
      accessToken = userStore.accessToken || null;
      refreshToken = userStore.refreshToken || null;
    }

    if (!accessToken) {
      throw new Error('SESSION_EXPIRED');
    }

    // Check if token is expired
    if (typeof accessToken === 'string' && isTokenExpired(accessToken)) {
      if (refreshToken) {
        const refreshResult = await refreshAccessToken(refreshToken);
        if (refreshResult?.accessToken) {
          return refreshResult.accessToken;
        }
      }
      throw new Error('SESSION_EXPIRED');
    }

    return accessToken;
  } catch (error) {
    console.error("Auth token error:", error);
    throw new Error('SESSION_EXPIRED');
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
