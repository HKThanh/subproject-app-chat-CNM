import {
  Smile,
  ImageIcon,
  Paperclip,
  Code,
  MoreHorizontal,
  ThumbsUp,
} from "lucide-react";

export default function ChatInput() {
  return (
    <div className="p-3 border-t border-gray-800 bg-gray-900">
      <div className="flex items-center space-x-2 mb-2">
        <button className="p-2 rounded-full hover:bg-gray-800">
          <Smile className="w-5 h-5 text-gray-400" />
        </button>
        <button className="p-2 rounded-full hover:bg-gray-800">
          <ImageIcon className="w-5 h-5 text-gray-400" />
        </button>
        <button className="p-2 rounded-full hover:bg-gray-800">
          <Paperclip className="w-5 h-5 text-gray-400" />
        </button>
        <button className="p-2 rounded-full hover:bg-gray-800">
          <Code className="w-5 h-5 text-gray-400" />
        </button>
        <button className="p-2 rounded-full hover:bg-gray-800">
          <MoreHorizontal className="w-5 h-5 text-gray-400" />
        </button>
      </div>
      <div className="flex items-center">
        <input
          type="text"
          className="flex-1 bg-gray-800 rounded-full py-2 px-4 text-gray-200 placeholder-gray-400 focus:outline-none"
          placeholder="Nhập @, tin nhắn tới Tấn Lộc"
        />
        <button className="p-2 ml-2 rounded-full hover:bg-gray-800">
          <ThumbsUp className="w-5 h-5 text-gray-400" />
        </button>
      </div>
    </div>
  );
}
