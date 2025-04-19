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
  
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
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
    if (selectedFiles.length > 0) {
      // If files are selected, handle file upload
      handleFileUpload();
    } else if (message.trim()) {
      // If only text, send text message
      onSendMessage(message.trim(), "text");
      setMessage("");
      
      // Clear reply state if exists
      if (replyingTo && onCancelReply) {
        onCancelReply();
      }
    }
  };

  const handleFileUpload = async () => {
    if (selectedFiles.length === 0) return;

    try {
      // Upload each file and collect URLs
      const uploadPromises = selectedFiles.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);

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
        return data;
      });

      const results = await Promise.all(uploadPromises);
      
      // Send each file as a separate message
      for (const result of results) {
        const fileUrl = result.fileUrl;
        const success = result.success;
        
        if (!success) {
          throw new Error("Upload file thất bại");
        }
        
        // Send message with uploaded file
        onSendMessage(
          message.trim() || "Đã gửi một tệp đính kèm",
          fileType || "file",
          fileUrl
        );
      }

      // Reset state
      setMessage("");
      setSelectedFiles([]);
      setFilePreviews([]);
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
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Convert FileList to array
    const fileArray = Array.from(files);
    setSelectedFiles(prev => [...prev, ...fileArray]);
    setFileType(type);

    // Create previews for files
    fileArray.forEach(file => {
      if (type === "image" || type === "video") {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFilePreviews(prev => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      } else {
        // Display filename for other file types
        setFilePreviews(prev => [...prev, file.name]);
      }
    });
  };

  const clearSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
    
    if (selectedFiles.length === 1) {
      setFileType(null);
    }
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    setFilePreviews([]);
    setFileType(null);

    // Reset input files
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

      {/* File previews */}
      {filePreviews.length > 0 && (
        <div className="mb-3 relative bg-gray-100 p-2 rounded-lg">
          {/* Clear all button */}
          <button
            className="absolute top-1 right-1 bg-gray-200 rounded-full p-1 hover:bg-gray-300 z-10"
            onClick={clearAllFiles}
          >
            <X className="w-4 h-4" />
          </button>

          {/* Grid layout for multiple images */}
          <div className="grid grid-cols-3 gap-2 mt-2">
            {filePreviews.map((preview, index) => (
              <div key={index} className="relative">
                {fileType === "image" ? (
                  <div className="relative group">
                    <img
                      src={preview}
                      alt={`Preview ${index}`}
                      className="h-24 w-full object-cover rounded"
                    />
                    <button
                      className="absolute top-1 right-1 bg-gray-200 rounded-full p-1 hover:bg-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => clearSelectedFile(index)}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : fileType === "video" ? (
                  <div className="relative group">
                    <video
                      src={preview}
                      className="h-24 w-full object-cover rounded"
                    />
                    <button
                      className="absolute top-1 right-1 bg-gray-200 rounded-full p-1 hover:bg-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => clearSelectedFile(index)}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2 bg-white rounded">
                    <div className="flex items-center">
                      <Paperclip className="mr-2 w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-700 truncate max-w-[150px]">{preview}</span>
                    </div>
                    <button
                      className="p-1 rounded-full hover:bg-gray-200"
                      onClick={() => clearSelectedFile(index)}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
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
        multiple
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
        {message.trim() || selectedFiles.length > 0 ? (
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
