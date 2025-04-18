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
  UserPlus,
  LogOut,
  Settings,
} from "lucide-react";
import Image from "next/image";
import { Conversation } from "@/socket/useChat";
import { useState } from "react";

interface ChatInfoProps {
  activeConversation: Conversation | null;
}

export default function ChatInfo({ activeConversation }: ChatInfoProps) {
  const [showMembers, setShowMembers] = useState(true);

  // Determine if this is a group conversation
  const isGroup = activeConversation?.isGroup === true;

  // Get group members if this is a group
  const groupMembers = activeConversation?.regularMembers || [];
  console.log("check group members:", groupMembers);
  console.log("check group members:", activeConversation?.groupName);
  console.log("check group members:", activeConversation?.groupAvatar);
  console.log("check group members:", activeConversation?.owner?.fullname);
  
  return (
    <div className="h-full overflow-y-auto bg-gray-50 text-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 text-center">
        <h2 className="text-lg font-medium">
          Thông tin {isGroup ? "nhóm" : "hội thoại"}
        </h2>
      </div>

      {/* Profile */}
      <div className="p-4 flex flex-col items-center border-b border-gray-200">
        <div className="relative mb-2">
          <div className="w-20 h-20 rounded-full overflow-hidden">
            {isGroup ? (
              <Image
                src={
                  activeConversation?.groupAvatar ||
                  "https://danhgiaxe.edu.vn/upload/2024/12/99-mau-avatar-nhom-dep-nhat-danh-cho-team-dong-nguoi-30.webp"
                }
                alt={activeConversation?.groupName || "Group"}
                width={80}
                height={80}
                className="object-cover"
              />
            ) : (
              <Image
                src={
                  activeConversation?.otherUser?.urlavatar ||
                  `https://ui-avatars.com/api/?name=${
                    activeConversation?.otherUser?.fullname || "User"
                  }`
                }
                alt={activeConversation?.otherUser?.fullname || "User"}
                width={80}
                height={80}
                className="object-cover"
              />
            )}
          </div>
          <button className="absolute bottom-0 right-0 bg-gray-200 p-1 rounded-full">
            <Pencil className="w-4 h-4 text-gray-600" />
          </button>
        </div>
        <h3 className="text-lg font-medium mb-4">
          {isGroup
            ? activeConversation?.groupName || "Nhóm"
            : activeConversation?.otherUser?.fullname || "Người dùng"}
        </h3>

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
          {isGroup ? (
            <div className="flex flex-col items-center">
              <button className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mb-1">
                <UserPlus className="w-5 h-5 text-blue-900" />
              </button>
              <span className="text-xs text-center">Thêm thành viên</span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <button className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mb-1">
                <Users className="w-5 h-5 text-blue-900" />
              </button>
              <span className="text-xs text-center">Tạo nhóm</span>
            </div>
          )}
        </div>
      </div>

      {/* Group Members (only for groups) */}
      {isGroup && (
        <div className="border-b border-gray-200">
          <div
            className="p-4 flex items-center justify-between cursor-pointer"
            onClick={() => setShowMembers(!showMembers)}
          >
            <div className="flex items-center">
              <Users className="w-5 h-5 text-blue-900 mr-2" />
              <span className="font-medium">
                Thành viên nhóm ({groupMembers.length})
              </span>
            </div>
            <ChevronDown
              className={`w-5 h-5 transition-transform ${
                showMembers ? "rotate-180" : ""
              }`}
            />
          </div>

          {showMembers && (
            <div className="px-4 pb-4 space-y-3">
              {/* Group Owner */}
              {activeConversation?.rules?.IDOwner && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                      <Image
                        src={
                          groupMembers.find(
                            (member) =>
                              member.id === activeConversation.rules.IDOwner
                          )?.urlavatar ||
                          "https://ui-avatars.com/api/?name=Owner"
                        }
                        alt="Group Owner"
                        width={40}
                        height={40}
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Chủ nhóm</p>
                      <p className="text-xs text-gray-500">
                        {activeConversation.owner.fullname}
                      </p>
                    </div>
                  </div>
                  <Settings className="w-5 h-5 text-gray-500" />
                </div>
              )}

              {/* Group Members (excluding owner) */}
              {groupMembers
                .filter(
                  (member) => member.id !== activeConversation?.rules?.IDOwner
                )
                .map((member, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full overflow-hidden mr-3">
                        <Image
                          src={
                            member.urlavatar ||
                            "https://nodebucketcnm203.s3.ap-southeast-1.amazonaws.com/avtdefault.avif"
                          }
                          alt={member.fullname}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{member.fullname}</p>
                        <p className="text-xs text-gray-500">Thành viên</p>
                      </div>
                    </div>
                  </div>
                ))}

              {/* Add Member Button */}
              <button className="w-full py-2 mt-2 text-blue-600 text-sm font-medium flex items-center justify-center border border-blue-600 rounded-md">
                <UserPlus className="w-4 h-4 mr-2" />
                Thêm thành viên
              </button>
            </div>
          )}
        </div>
      )}

      {/* Reminders */}
      {/* <div className="p-4 border-b border-gray-200">
        <div className="flex items-center mb-2">
          <Clock className="w-5 h-5 text-blue-900 mr-2" />
          <span className="text-blue-900 font-medium">Danh sách nhắc hẹn</span>
        </div>
      </div> */}

      {/* Common groups - only show for direct chats */}
      {!isGroup && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center">
            <Users className="w-5 h-5 text-blue-900 mr-2" />
            <span className="text-blue-900 font-medium">Nhóm chung</span>
          </div>
        </div>
      )}

      {/* Photos/Videos */}
      <div className="border-b border-gray-200">
        <div className="p-4 flex items-center justify-between">
          <span className="font-medium">Ảnh/Video</span>
          <ChevronDown className="w-5 h-5" />
        </div>
        <div className="px-4 pb-2">
          <div className="grid grid-cols-3 gap-1 mb-3">
            {/* Image placeholders */}
            {activeConversation?.listImage &&
              activeConversation.listImage.map((imageUrl) => (
                <div key={imageUrl} className="aspect-square relative">
                  <Image
                    src={imageUrl}
                    alt="Media"
                    width={100}
                    height={100}
                    className="object-cover w-full h-full"
                  />
                </div>
              ))}
          </div>
          <button className="w-full text-center text-blue-600 text-sm">
            Xem tất cả
          </button>
        </div>
      </div>

      {/* Files */}
      {/* <div className="border-b border-gray-200">
        <div className="p-4 flex items-center justify-between cursor-pointer">
          <span className="font-medium">File</span>
          <ChevronDown className="w-5 h-5" />
        </div>
        <div className="px-4 pb-4">
          {activeConversation?.listFile &&
            activeConversation.listFile.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                    <Link className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium truncate max-w-[200px]">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">{file.size}</p>
                  </div>
                </div>
                <a
                  href={file.url}
                  download
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Eye className="w-5 h-5" />
                </a>
              </div>
            ))}
          {(!activeConversation?.listFile ||
            activeConversation.listFile.length === 0) && (
            <p className="text-center text-gray-500 text-sm py-2">
              Không có file nào
            </p>
          )}
        </div>
      </div> */}

      {/* Links */}
      {/* <div className="border-b border-gray-200">
        <div className="p-4 flex items-center justify-between">
          <span className="font-medium">Liên kết</span>
          <ChevronDown className="w-5 h-5" />
        </div>
      </div> */}

      {/* Leave/Delete Group - only for groups */}
      {isGroup && (
        <div className="p-4">
          <button className="w-full py-2 text-red-600 text-sm font-medium flex items-center justify-center border border-red-600 rounded-md mb-3">
            <LogOut className="w-4 h-4 mr-2" />
            Rời nhóm
          </button>

          {activeConversation?.rules?.IDOwner === "currentUserId" && (
            <button className="w-full py-2 text-red-600 text-sm font-medium flex items-center justify-center border border-red-600 rounded-md">
              <Trash2 className="w-4 h-4 mr-2" />
              Xóa nhóm
            </button>
          )}
        </div>
      )}
    </div>
  );
}
