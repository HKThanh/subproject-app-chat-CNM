import {
  Bell,
  Pin,
  Users,
  Clock,
  Link,
  ChevronDown,
  Clock3,
  Eye,
  AlertTriangle,
  Trash2,
  Pencil,
} from "lucide-react";
import Image from "next/image";

export default function ChatInfo() {
  return (
    <div className="h-full overflow-y-auto bg-gray-50 text-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 text-center">
        <h2 className="text-lg font-medium">Thông tin hội thoại</h2>
      </div>

      {/* Profile */}
      <div className="p-4 flex flex-col items-center border-b border-gray-200">
        <div className="relative mb-2">
          <div className="w-20 h-20 rounded-full overflow-hidden">
            <Image
              src="/placeholder.svg?height=80&width=80"
              alt="Gió Đà Lạt"
              width={80}
              height={80}
              className="object-cover"
            />
          </div>
          <button className="absolute bottom-0 right-0 bg-gray-200 p-1 rounded-full">
            <Pencil className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <h3 className="text-lg font-medium mb-4">Gió Đà Lạt</h3>

        {/* Action buttons */}
        <div className="flex justify-between w-full">
          <div className="flex flex-col items-center">
            <button className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mb-1">
              <Bell className="w-5 h-5 text-blue-900" />
            </button>
            <span className="text-xs text-center">Tắt thông báo</span>
          </div>
          <div className="flex flex-col items-center">
            <button className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mb-1">
              <Pin className="w-5 h-5 text-blue-900" />
            </button>
            <span className="text-xs text-center">Ghim hội thoại</span>
          </div>
          <div className="flex flex-col items-center">
            <button className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mb-1">
              <Users className="w-5 h-5 text-blue-900" />
            </button>
            <span className="text-xs text-center">Tạo nhóm trò chuyện</span>
          </div>
        </div>
      </div>

      {/* Reminders */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center mb-2">
          <Clock className="w-5 h-5 text-blue-900 mr-2" />
          <span className="text-blue-900 font-medium">Danh sách nhắc hẹn</span>
        </div>
      </div>

      {/* Common groups */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center">
          <Users className="w-5 h-5 text-blue-900 mr-2" />
          <span className="text-blue-900 font-medium">4 nhóm chung</span>
        </div>
      </div>

      {/* Photos/Videos */}
      <div className="border-b border-gray-200">
        <div className="p-4 flex items-center justify-between">
          <span className="font-medium">Ảnh/Video</span>
          <ChevronDown className="w-5 h-5" />
        </div>
        <div className="px-4 pb-2">
          <div className="grid grid-cols-3 gap-1 mb-3">
            <div className="aspect-square relative">
              <Image
                src="/placeholder.svg?height=100&width=100"
                alt="Shared media"
                width={100}
                height={100}
                className="object-cover rounded-md"
              />
            </div>
          </div>
          <button className="w-full py-2 bg-gray-200 rounded-md text-center text-gray-700">
            Xem tất cả
          </button>
        </div>
      </div>

      {/* Files */}
      <div className="border-b border-gray-200">
        <div className="p-4 flex items-center justify-between">
          <span className="font-medium">File</span>
          <ChevronDown className="w-5 h-5" />
        </div>
        <div className="px-4 pb-4 text-center text-gray-500 text-sm">
          Chưa có File được chia sẻ từ sau 9/4/2025
        </div>
      </div>

      {/* Links */}
      <div className="border-b border-gray-200">
        <div className="p-4 flex items-center justify-between">
          <span className="font-medium">Link</span>
          <ChevronDown className="w-5 h-5" />
        </div>
        <div className="px-4 pb-2">
          <div className="bg-gray-200 p-3 rounded-md mb-3 flex">
            <div className="w-10 h-10 bg-gray-300 rounded-md flex items-center justify-center mr-3">
              <Link className="w-5 h-5 text-gray-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm mb-1 truncate">
                http://www.w3.org/2000/svg
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-blue-600">www.w3.org</span>
                <span className="text-xs text-gray-500">Hôm nay</span>
              </div>
            </div>
          </div>
          <button className="w-full py-2 bg-gray-200 rounded-md text-center text-gray-700">
            Xem tất cả
          </button>
        </div>
      </div>

      {/* Security settings */}
      <div className="border-b border-gray-200">
        <div className="p-4 flex items-center justify-between">
          <span className="font-medium">Thiết lập bảo mật</span>
          <ChevronDown className="w-5 h-5" />
        </div>
        <div className="px-4 pb-4">
          {/* Self-destructing messages */}
          <div className="flex items-center mb-4">
            <Clock3 className="w-5 h-5 text-gray-600 mr-3" />
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm font-medium">Tin nhắn tự xóa</div>
                  <div className="text-xs text-gray-500">Không bao giờ</div>
                </div>
                <button className="text-gray-400 text-lg">?</button>
              </div>
            </div>
          </div>

          {/* Hide conversation */}
          <div className="flex items-center mb-4">
            <Eye className="w-5 h-5 text-gray-600 mr-3" />
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium">Ẩn trò chuyện</div>
                <div className="w-10 h-5 bg-gray-300 rounded-full relative">
                  <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Report and Delete */}
      <div className="p-4">
        <div className="flex items-center mb-4">
          <AlertTriangle className="w-5 h-5 text-gray-600 mr-3" />
          <span className="text-sm font-medium">Báo xấu</span>
        </div>
        <div className="flex items-center">
          <Trash2 className="w-5 h-5 text-red-600 mr-3" />
          <span className="text-sm font-medium text-red-600">
            Xóa lịch sử trò chuyện
          </span>
        </div>
      </div>
    </div>
  );
}
