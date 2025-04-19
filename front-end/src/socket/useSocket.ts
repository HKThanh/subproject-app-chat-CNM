"use client";

import { useEffect, useState, useRef } from "react";
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
  
  // Sử dụng useRef để theo dõi số lần thử kết nối
  const reconnectAttempts = useRef(0);
  const socketRef = useRef<Socket | null>(null);

  // Chỉ log khi cần thiết
  useEffect(() => {
    console.log("SOCKET_URL:", SOCKET_URL);
    console.log("Session status:", status);
    console.log("Access token available:", !!accessToken || !!session?.accessToken);
  }, [status, accessToken, session?.accessToken]);

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

    // Nếu đã có socket và đang kết nối, không tạo mới
    if (socketRef.current && socketRef.current.connected) {
      console.log("Socket đã kết nối, không tạo mới");
      return;
    }

    // Lấy token từ nhiều nguồn để đảm bảo có giá trị
    const token = session?.accessToken || accessToken || "";

    console.log("Tạo kết nối socket mới với URL:", SOCKET_URL);

    // Tạo instance socket với các cấu hình
    const socketInstance = io(SOCKET_URL, {
      extraHeaders: {
        Authorization: token ? `Bearer ${token}` : "",
      },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,  // Giới hạn số lần thử kết nối lại
      reconnectionDelay: 1000,  
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling'],
    });

    // Đăng ký sự kiện để debug
    socketInstance.on('connect', () => {
      console.log('Socket connected with ID:', socketInstance.id);
      setIsConnected(true);
      reconnectAttempts.current = 0; // Reset số lần thử kết nối
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('Socket disconnected, reason:', reason);
      setIsConnected(false);
      
      // Chỉ thử kết nối lại nếu lý do không phải là "io client disconnect"
      if (reason !== "io client disconnect" && reconnectAttempts.current < 5) {
        reconnectAttempts.current++;
        console.log(`Reconnect attempt ${reconnectAttempts.current}/5`);
      }
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      setIsConnected(false);
      
      // Giới hạn số lần thử kết nối lại
      if (reconnectAttempts.current < 5) {
        reconnectAttempts.current++;
        console.log(`Reconnect attempt ${reconnectAttempts.current}/5 after error`);
      }
    });

    // Lưu socket vào ref để tránh tạo mới không cần thiết
    socketRef.current = socketInstance;
    setSocket(socketInstance);

    return () => {
      // Chỉ ngắt kết nối khi component unmount hoặc dependencies thay đổi
      console.log("Cleanup socket connection");
      socketInstance.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [isOnline, status === "authenticated"]); // Chỉ phụ thuộc vào trạng thái online và xác thực

  // Xử lý khi mạng thay đổi
  useEffect(() => {
    if (!socketRef.current) return;
    
    if (isOnline && !socketRef.current.connected && reconnectAttempts.current < 5) {
      console.log("Mạng online - kết nối lại socket");
      socketRef.current.connect();
    } else if (!isOnline && socketRef.current.connected) {
      console.log("Mạng offline - ngắt kết nối socket");
      socketRef.current.disconnect();
      setIsConnected(false);
    }
  }, [isOnline]);

  return { socket, isConnected };
};
