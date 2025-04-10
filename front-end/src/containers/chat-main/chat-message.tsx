import { ThumbsUp } from "lucide-react";

interface ChatMessageProps {
  message: string;
  timestamp: string;
}

export default function ChatMessage({ message, timestamp }: ChatMessageProps) {
  return (
    <div className="mb-4">
      <div className="bg-gray-100 rounded-lg p-4 max-w-3xl">
        <pre className="text-gray-800 whitespace-pre-wrap font-mono text-sm overflow-x-auto">
          {message}
        </pre>
      </div>
      <div className="flex items-center mt-1 justify-end">
        <button className="p-1 rounded-full hover:bg-gray-200">
          <ThumbsUp className="w-4 h-4 text-gray-500" />
        </button>
      </div>
    </div>
  );
}
