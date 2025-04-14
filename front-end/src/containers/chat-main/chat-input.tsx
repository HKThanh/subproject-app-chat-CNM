import useUserStore from "@/stores/useUserStoree";
import { getAuthToken } from "@/utils/auth-utils";
import {
  Smile,
  ImageIcon,
  Paperclip,
  Code,
  MoreHorizontal,
  ThumbsUp,
  Send,
  X,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface ChatInputProps {
  onSendMessage: (text: string, type?: string, fileUrl?: string) => void;
  replyingTo?: {
    messageId: string;
    content: string;
    type: string;
  } | null;
  onCancelReply?: () => void;
}

export default function ChatInput({ onSendMessage, replyingTo, onCancelReply }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      const token = await getAuthToken();
      setAccessToken(token);
    };
    fetchToken();
  }, []);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);

  // Focus on input when replying
  useEffect(() => {
    if (replyingTo && messageInputRef.current) {
      messageInputRef.current.focus();
    }
  }, [replyingTo]);

  const handleSendMessage = () => {
    if (selectedFile) {
      // Nếu có file được chọn, xử lý upload file
      handleFileUpload();
    } else if (message.trim()) {
      // Nếu chỉ có text, gửi tin nhắn text
      onSendMessage(message.trim(), "text");
      setMessage("");
      
      // Clear reply state if exists
      if (replyingTo && onCancelReply) {
        onCancelReply();
      }
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) return;

    try {
      // Tạo FormData để upload file
      const formData = new FormData();
      formData.append("file", selectedFile);

      // Gọi API upload file
      const response = await fetch(`http://localhost:3000/upload/chat-file`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error("Upload file thất bại");
      }

      const data = await response.json();
      const fileUrl = data.fileUrl;
      const success = data.success;
      const fileName = data.fileName;
      console.log("check response upload>>>> ", data);

      if (!success) {
        throw new Error("Upload file thất bại");
      }
      // Gửi tin nhắn với file đã upload
      onSendMessage(
        message.trim() || "Đã gửi một tệp đính kèm",
        fileType || "file",
        fileUrl
      );

      // Reset state
      setMessage("");
      setSelectedFile(null);
      setFilePreview(null);
      setFileType(null);
    } catch (error) {
      console.error("Lỗi khi upload file:", error);
      alert("Không thể upload file. Vui lòng thử lại sau.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setFileType(type);

    // Tạo preview cho file
    if (type === "image" || type === "video") {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      // Hiển thị tên file cho các loại file khác
      setFilePreview(file.name);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setFileType(null);

    // Reset input file
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  return (
    <div className="p-3 border-t border-gray-200 bg-gray-50">
      {/* Reply bar */}
      {replyingTo && (
        <div className="mb-3 bg-blue-50 p-2 rounded-lg border-l-4 border-blue-500 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-blue-600 font-medium">Trả lời Thơ</span>
            <p className="text-sm text-gray-700 truncate">{replyingTo.content}</p>
          </div>
          <button
            className="p-1 rounded-full hover:bg-gray-200"
            onClick={onCancelReply}
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      )}

      {/* File preview */}
      {filePreview && (
        <div className="mb-3 relative bg-gray-100 p-2 rounded-lg">
          <button
            className="absolute top-1 right-1 bg-gray-200 rounded-full p-1 hover:bg-gray-300"
            onClick={clearSelectedFile}
          >
            <X className="w-4 h-4" />
          </button>

          {fileType === "image" ? (
            <img
              src={filePreview}
              alt="Preview"
              className="max-h-40 rounded mx-auto"
            />
          ) : fileType === "video" ? (
            <video
              src={filePreview}
              controls
              className="max-h-40 rounded mx-auto"
            />
          ) : (
            <div className="flex items-center justify-center p-2">
              <Paperclip className="mr-2 w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-700">{filePreview}</span>
            </div>
          )}
        </div>
      )}

      {/* File inputs (hidden) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileSelect(e, "document")}
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
      />
      <input
        type="file"
        ref={imageInputRef}
        onChange={(e) => handleFileSelect(e, "image")}
        className="hidden"
        accept="image/*"
      />
      <input
        type="file"
        ref={videoInputRef}
        onChange={(e) => handleFileSelect(e, "video")}
        className="hidden"
        accept="video/*"
      />

      <div className="flex items-center space-x-2 mb-2">
        <button
          className="p-2 rounded-full hover:bg-gray-200"
          onClick={() => imageInputRef.current?.click()}
        >
          <ImageIcon className="w-5 h-5 text-gray-500" />
        </button>
        <button
          className="p-2 rounded-full hover:bg-gray-200"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="w-5 h-5 text-gray-500" />
        </button>
        <button
          className="p-2 rounded-full hover:bg-gray-200"
          onClick={() => videoInputRef.current?.click()}
        >
          <Code className="w-5 h-5 text-gray-500" />
        </button>
        <button className="p-2 rounded-full hover:bg-gray-200">
          <Smile className="w-5 h-5 text-gray-500" />
        </button>
        <button className="p-2 rounded-full hover:bg-gray-200">
          <MoreHorizontal className="w-5 h-5 text-gray-500" />
        </button>
      </div>
      <div className="flex items-center">
        <input
          type="text"
          ref={messageInputRef}
          className="flex-1 bg-gray-100 rounded-full py-2 px-4 text-gray-900 placeholder-gray-500 focus:outline-none"
          placeholder={replyingTo ? "Nhập phản hồi..." : "Nhập tin nhắn..."}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {message.trim() || selectedFile ? (
          <button
            className="p-2 ml-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
            onClick={handleSendMessage}
          >
            <Send className="w-5 h-5" />
          </button>
        ) : (
          <button className="p-2 ml-2 rounded-full hover:bg-gray-200">
            <ThumbsUp className="w-5 h-5 text-gray-500" />
          </button>
        )}
      </div>
    </div>
  );
}
