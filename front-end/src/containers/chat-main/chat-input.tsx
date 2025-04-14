import {
  Smile,
  ImageIcon,
  Paperclip,
  Code,
  MoreHorizontal,
  ThumbsUp,
  Send,
} from "lucide-react";
import { useState } from "react";

interface ChatInputProps {
  onSendMessage: (text: string) => void;
}

export default function ChatInput({ onSendMessage }: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSendMessage = () => {
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  return (
    <div className="p-3 border-t border-gray-200 bg-gray-50">
      <div className="flex items-center space-x-2 mb-2">
        <button className="p-2 rounded-full hover:bg-gray-200">
          <Smile className="w-5 h-5 text-gray-500" />
        </button>
        <button className="p-2 rounded-full hover:bg-gray-200">
          <ImageIcon className="w-5 h-5 text-gray-500" />
        </button>
        <button className="p-2 rounded-full hover:bg-gray-200">
          <Paperclip className="w-5 h-5 text-gray-500" />
        </button>
        <button className="p-2 rounded-full hover:bg-gray-200">
          <Code className="w-5 h-5 text-gray-500" />
        </button>
        <button className="p-2 rounded-full hover:bg-gray-200">
          <MoreHorizontal className="w-5 h-5 text-gray-500" />
        </button>
      </div>
      <div className="flex items-center">
        <input
          type="text"
          className="flex-1 bg-gray-100 rounded-full py-2 px-4 text-gray-900 placeholder-gray-500 focus:outline-none"
          placeholder="Nhập tin nhắn..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {message.trim() ? (
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
