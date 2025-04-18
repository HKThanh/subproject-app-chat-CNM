import { ChevronDown, MoreHorizontal } from "lucide-react";

export default function TabNavigation() {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
      <div className="flex space-x-6">
        <button className="text-gray-500 font-medium">Tất cả</button>
        {/* <button className="text-blue-600 font-medium border-b-2 border-blue-600 pb-1">
          Chưa đọc
        </button> */}
      </div>
      <div className="flex items-center space-x-2">
        <button className="flex items-center text-gray-700 text-sm">
          Phân loại
          <ChevronDown className="w-4 h-4 ml-1" />
        </button>
        <button className="p-1 rounded-full hover:bg-gray-200">
          <MoreHorizontal className="w-5 h-5 text-gray-700" />
        </button>
      </div>
    </div>
  );
}
