"use client";

import React, { createContext, useContext, ReactNode } from "react";
import { Socket } from "socket.io-client";
import { useSocket } from "./useSocket";

// Định nghĩa kiểu dữ liệu cho context
interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

// Tạo context với giá trị mặc định
const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

// Hook để sử dụng socket context
export const useSocketContext = () => useContext(SocketContext);

// Provider component
interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { socket, isConnected } = useSocket();

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
