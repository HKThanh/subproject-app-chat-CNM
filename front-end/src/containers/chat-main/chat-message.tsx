import { ThumbsUp } from "lucide-react";

interface ChatMessageProps {
  message: string;
  timestamp: string;
  isOwn?: boolean;
}

export default function ChatMessage({ message, timestamp, isOwn = false }: ChatMessageProps) {
  console.log("Rendering message:", message, "isOwn:", isOwn);
  return (
    <div className={`mb-4 ${isOwn ? 'flex justify-end' : ''}`}>
      <div
        className={`rounded-lg p-3 max-w-xs md:max-w-md lg:max-w-lg ${
          isOwn ? 'bg-[#4285F4] text-white' : 'bg-gray-100 text-gray-800'
        }`}
        style={{
          backgroundColor: isOwn ? '#4285F4' : '',
          color: isOwn ? 'white' : ''
        }}
      >
        <div className="whitespace-pre-wrap break-words">
          {message}
        </div>
        <div className="text-xs mt-1 opacity-70 text-right">
          {timestamp !== "Invalid Date" ? timestamp : "Bây giờ"}
        </div>
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
