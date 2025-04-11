"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useNetworkStatus } from "./useNetwork";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "";

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const isOnline = useNetworkStatus();

  useEffect(() => {
    if (!isOnline) {
      console.log("Offline - không kết nối socket");
      return;
    }

    const token = localStorage.getItem("token"); // tuỳ theo bạn lưu thế nào
    const socketInstance = io(SOCKET_URL, {
      extraHeaders: {
        token: token || "",
      },
    });
    console.log("Socket connected", socketInstance);
    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
      setSocket(null);
    };
  }, []);

  useEffect(() => {
    if (!socket) return;
    if (isOnline) {
      console.log("Mạng online - kết nối lại socket");
      socket.connect();
    } else {
      console.log("Mạng offline - ngắt kết nối socket");
      socket.disconnect();
    }
  }, [isOnline]);

  return { socket };
};
