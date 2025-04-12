import { ThumbsUp } from "lucide-react";

interface ChatMessageProps {
  message: string;
  timestamp: string;
  isOwn?: boolean;
}

export default function ChatMessage({ message, timestamp, isOwn = false }: ChatMessageProps) {
  return (
    <div className={`mb-4 ${isOwn ? 'flex justify-end' : ''}`}>
      <div
        className={`rounded-lg p-3 ${
          isOwn
            ? 'bg-[#4285F4] text-white max-w-xs md:max-w-md lg:max-w-lg'
            : 'bg-gray-100 text-gray-800 inline-block'
        }`}
        style={{
          backgroundColor: isOwn ? '#4285F4' : '',
          color: isOwn ? 'white' : '',
          maxWidth: !isOwn ? '80%' : '' // Giới hạn độ rộng tối đa cho tin nhắn của người nhận
        }}
      >
        <div className="whitespace-pre-wrap break-words">
          {message}
        </div>
        {/* Chỉ hiển thị timestamp khi message có giá trị */}
        {message && message.trim() !== "" && (
          <div className="text-xs mt-1 opacity-70 text-right">
            {timestamp !== "Invalid Date" ? timestamp : "Bây giờ"}
          </div>
        )}
      </div>
      {!isOwn && (
        <div className="flex items-center mt-1 ml-2">
          <button className="p-1 rounded-full hover:bg-gray-200">
            <ThumbsUp className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      )}
    </div>
  );
}
