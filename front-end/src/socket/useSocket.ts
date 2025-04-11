"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useNetworkStatus } from "./useNetwork";
import { useSession } from "next-auth/react";
import useUserStore from "@/stores/useUserStoree";

// Mặc định kết nối đến server hiện tại nếu không có cấu hình
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const isOnline = useNetworkStatus();
  const { data: session, status } = useSession();
  const accessToken = useUserStore((state) => state.accessToken);

  // Log thông tin để debug
  console.log("SOCKET_URL:", SOCKET_URL);
  console.log("Session status:", status);
  console.log("Access token from store:", accessToken);
  console.log("Session token:", session?.accessToken);

  useEffect(() => {
    // Không kết nối nếu offline
    if (!isOnline) {
      console.log("Offline - không kết nối socket");
      return;
    }

    // Kiểm tra URL socket
    if (!SOCKET_URL) {
      console.error("NEXT_PUBLIC_SOCKET_URL không được cấu hình");
      return;
    }

    // Lấy token từ nhiều nguồn để đảm bảo có giá trị
    const token = session?.accessToken || accessToken || "";

    if (!token && status === "authenticated") {
      console.warn("Đã xác thực nhưng không có token");
    }

    console.log("Kết nối socket với URL:", SOCKET_URL);
    console.log("Sử dụng token:", token ? "Có" : "Không");

    // Tạo instance socket với các cấu hình
    const socketInstance = io(SOCKET_URL, {
      extraHeaders: {
        Authorization: token ? `Bearer ${token}` : "",
      },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,  // Giảm thời gian delay giữa các lần thử kết nối lại
      reconnectionDelayMax: 2000,
      timeout: 30000,  // Tăng thời gian timeout
      transports: ['websocket', 'polling'], // Thử cả hai phương thức
    });

    // Đăng ký sự kiện để debug
    socketInstance.on('connect', () => {
      console.log('Socket connected with ID:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      setIsConnected(false);

      // Tự động thử kết nối lại sau 2 giây
      setTimeout(() => {
        console.log('Attempting to reconnect socket...');
        socketInstance.connect();
      }, 2000);
    });

    // Thêm log cho các sự kiện khác
    socketInstance.onAny((event, ...args) => {
      console.log(`Socket event received: ${event}`, args);
    });

    // Log khi gửi sự kiện
    const originalEmit = socketInstance.emit;
    socketInstance.emit = function(event, ...args) {
      console.log(`Socket emitting event: ${event}`, args);
      return originalEmit.apply(this, [event, ...args]);
    };

    console.log("Socket instance created");
    setSocket(socketInstance);

    return () => {
      console.log("Cleanup socket connection");
      socketInstance.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [isOnline, session, accessToken, status]);

  useEffect(() => {
    if (!socket) return;
    if (isOnline) {
      console.log("Mạng online - kết nối lại socket");
      socket.connect();
    } else {
      console.log("Mạng offline - ngắt kết nối socket");
      socket.disconnect();
      setIsConnected(false);
    }
  }, [isOnline, socket]);

  return { socket, isConnected };
};
