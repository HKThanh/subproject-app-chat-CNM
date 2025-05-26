import useUserStore from "@/stores/useUserStoree";
import { getAuthToken } from "@/utils/auth-utils";

import {
  Smile,
  ImageIcon,
  Paperclip,
  Code,
  Video,
  MoreHorizontal,
  ThumbsUp,
  Send,
  X,
  Loader2,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import type { EmojiClickData } from 'emoji-picker-react';
import EmojiPicker from "emoji-picker-react";

interface ChatInputProps {
  onSendMessage: (text: string, type?: string, fileUrl?: string, replyingTo?: {
    name: string;
    messageId: string;
    content: string;
    type: string;
  }) => void;
  replyingTo?: {
    name: string;
    messageId: string;
    content: string;
    type: string;
  } | null;
  onCancelReply?: () => void;
}

export default function ChatInput({ onSendMessage, replyingTo, onCancelReply }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  // Focus on input when replying
  useEffect(() => {
    if (replyingTo && messageInputRef.current) {
      messageInputRef.current.focus();
    }
  }, [replyingTo]);
  // Handle clicking outside emoji picker to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  const onEmojiClick = (emojiData: EmojiClickData) => {
    setMessage(prev => prev + emojiData.emoji);
    // setShowEmojiPicker(false);

    // Focus back on the input after selecting emoji
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
  };
  const handleSendMessage = () => {
    if (selectedFiles.length > 0) {
      // If files are selected, handle file upload
      handleFileUpload();
    } else if (message.trim()) {
      // If only text, send text message
      onSendMessage(message.trim(), "text", undefined, replyingTo || undefined);
      setMessage("");

      // Clear reply state if exists
      if (replyingTo && onCancelReply) {
        onCancelReply();
      }
    }
  };

  // Add new function to handle thumbs up click
  const handleThumbsUpClick = () => {
    // Send thumbs up emoji as a message
    onSendMessage("👍", "text");

    // Clear reply state if exists
    if (replyingTo && onCancelReply) {
      onCancelReply();
    }
  };

  const handleFileUpload = async () => {
    if (selectedFiles.length === 0) return;
    if (isUploading) {
      toast.info("Đang tải lên tệp, vui lòng đợi...");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Calculate total files for progress tracking
      const totalFiles = selectedFiles.length;
      let completedFiles = 0;

      // Upload each file and collect URLs
      const uploadPromises = selectedFiles.map(async (file, index) => {
        const formData = new FormData();
        formData.append("file", file);
        const api = `${process.env.NEXT_PUBLIC_API_URL}`;
        const response = await fetch(`${api}/upload/chat-file`, {
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

        // Update progress after each file completes
        completedFiles++;
        setUploadProgress(Math.round((completedFiles / totalFiles) * 100));

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
      toast.success("Tải lên tệp thành công!");
    } catch (error) {
      console.error("Lỗi khi upload file:", error);
      toast.error("Không thể upload file. Vui lòng thử lại sau.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
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

    // Check file size limits
    const oversizedFiles = fileArray.filter(file => {
      // 100MB limit for videos, 10MB for images, 50MB for other files
      const maxSize = type === 'video' ? 100 * 1024 * 1024 :
        type === 'image' ? 10 * 1024 * 1024 :
          50 * 1024 * 1024;
      return file.size > maxSize;
    });

    if (oversizedFiles.length > 0) {
      const typeLabel = type === 'video' ? 'Video' :
        type === 'image' ? 'Hình ảnh' :
          'Tệp';
      const sizeLimit = type === 'video' ? '100MB' :
        type === 'image' ? '10MB' :
          '50MB';
      toast.error(`${typeLabel} không được vượt quá ${sizeLimit}`);
      return;
    }

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
    <div className="p-3 border-t border-gray-200 bg-white">
      {/* Reply bar */}
      {replyingTo && (
        <div className="mb-3 bg-purple-50 p-2 rounded-lg border-l-4 border-purple-500 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs text-purple-600 font-medium">{replyingTo.name}</span>
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

      {/* Upload Progress Indicator */}
      {isUploading && (
        <div className="mb-3 bg-white p-2 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">
              Đang tải lên tệp... {uploadProgress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-purple-500 h-2.5 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* File previews */}
      {filePreviews.length > 0 && !isUploading && (
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
          <Video className="w-5 h-5 text-gray-500" />
        </button>
        <div className="relative">
          <button 
            className="p-2 rounded-full hover:bg-gray-200"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          >
            <Smile className="w-5 h-5 text-gray-500" />
          </button>
          {showEmojiPicker && (
            <div 
              className="absolute bottom-12 right-0 z-10" 
              ref={emojiPickerRef}
            >
              <EmojiPicker onEmojiClick={onEmojiClick} />
            </div>
          )}
        </div>
        {/* <button className="p-2 rounded-full hover:bg-gray-200">
          <MoreHorizontal className="w-5 h-5 text-gray-500" />
        </button> */}
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
          disabled={isUploading}
        />
        {message.trim() || selectedFiles.length > 0 ? (
          <button
            className={`p-2 ml-2 rounded-full ${isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#8A56FF] hover:bg-[#7442FF]'} text-white`}
            onClick={handleSendMessage}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        ) : (
          <button
            className="p-2 ml-2 rounded-full hover:bg-gray-200"
            disabled={isUploading}
            onClick={handleThumbsUpClick}
          >
            <ThumbsUp className="w-5 h-5 text-gray-500" width={30} color="#f6ca51" />
          </button>
        )}
      </div>
    </div>
  );
}
