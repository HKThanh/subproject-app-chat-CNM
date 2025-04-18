"use client";

import { useCallback, useState } from "react";
import { useSocketContext } from "./SocketContext";

interface FileUploadProgress {
  fileName: string;
  progress: number;
  status: "pending" | "uploading" | "completed" | "error";
  error?: string;
}

export const useFileUpload = (userId: string) => {
  const { socket, isConnected } = useSocketContext();
  const [uploadProgress, setUploadProgress] = useState<Record<string, FileUploadProgress>>({});

  // Chuyển đổi file thành base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === "string") {
          // Loại bỏ phần prefix "data:image/jpeg;base64," để lấy chuỗi base64 thuần túy
          const base64String = reader.result.split(",")[1];
          resolve(base64String);
        } else {
          reject(new Error("Không thể chuyển đổi file sang base64"));
        }
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Tải lên file
  const uploadFile = useCallback(
    async (file: File, conversationId: string) => {
      if (!socket || !isConnected || !userId) {
        console.error("Socket không được kết nối hoặc thiếu userId");
        return;
      }

      try {
        // Cập nhật trạng thái tải lên
        const fileId = `${Date.now()}-${file.name}`;
        setUploadProgress((prev) => ({
          ...prev,
          [fileId]: {
            fileName: file.name,
            progress: 0,
            status: "pending",
          },
        }));

        // Chuyển đổi file thành base64
        console.log(`Bắt đầu chuyển đổi file ${file.name} sang base64`);
        setUploadProgress((prev) => ({
          ...prev,
          [fileId]: {
            ...prev[fileId],
            status: "uploading",
            progress: 10,
          },
        }));

        const base64Content = await fileToBase64(file);
        
        setUploadProgress((prev) => ({
          ...prev,
          [fileId]: {
            ...prev[fileId],
            progress: 50,
          },
        }));

        console.log(`Gửi file ${file.name} đến server`);
        // Gửi file lên server
        socket.emit("send_file", {
          idSender: userId,
          idConversation: conversationId,
          file: {
            type: file.type,
            content: base64Content,
            fileName: file.name,
          },
        });

        // Lắng nghe phản hồi tải lên thành công
        const handleUploadSuccess = (data: any) => {
          console.log("Tải lên file thành công:", data);
          setUploadProgress((prev) => ({
            ...prev,
            [fileId]: {
              ...prev[fileId],
              progress: 100,
              status: "completed",
            },
          }));
          
          // Xóa sự kiện lắng nghe sau khi nhận được phản hồi
          socket.off("send_message_success", handleUploadSuccess);
          socket.off("send_message_error", handleUploadError);
        };

        // Lắng nghe lỗi tải lên
        const handleUploadError = (data: { message: string; error: string }) => {
          console.error("Lỗi tải lên file:", data.error);
          setUploadProgress((prev) => ({
            ...prev,
            [fileId]: {
              ...prev[fileId],
              progress: 0,
              status: "error",
              error: data.message,
            },
          }));
          
          // Xóa sự kiện lắng nghe sau khi nhận được phản hồi
          socket.off("send_message_success", handleUploadSuccess);
          socket.off("send_message_error", handleUploadError);
        };

        socket.on("send_message_success", handleUploadSuccess);
        socket.on("send_message_error", handleUploadError);

        return fileId;
      } catch (error) {
        console.error("Lỗi khi tải lên file:", error);
        const fileId = `${Date.now()}-${file.name}`;
        setUploadProgress((prev) => ({
          ...prev,
          [fileId]: {
            fileName: file.name,
            progress: 0,
            status: "error",
            error: error instanceof Error ? error.message : "Lỗi không xác định",
          },
        }));
        return null;
      }
    },
    [socket, isConnected, userId]
  );

  // Xóa thông tin tiến trình tải lên
  const clearUploadProgress = useCallback((fileId: string) => {
    setUploadProgress((prev) => {
      const newProgress = { ...prev };
      delete newProgress[fileId];
      return newProgress;
    });
  }, []);

  return {
    uploadFile,
    uploadProgress,
    clearUploadProgress,
  };
};
