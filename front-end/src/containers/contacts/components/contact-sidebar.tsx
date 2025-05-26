import { Users, UserPlus, UsersRound, Shield } from "lucide-react";
import SearchBar from "@/containers/chats/chat-list/search-bar";

interface ContactSidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  friendRequestCount?: number;
}

export default function ContactSidebar({
  activeSection,
  setActiveSection,
  friendRequestCount = 0,
}: ContactSidebarProps) {
  const handleSelectConversation = (id: string) => {
    console.log("Selected conversation:", id);
  };

  return (
    <div className="w-2/44 border-r border-gray-200 bg-white">
      <div className="p-4">
        <SearchBar onSelectConversation={handleSelectConversation} />
      </div>
      <div className="space-y-1">
        <button
          className={`w-full px-4 py-2 text-left flex items-center gap-3 ${
            activeSection === "friends"
              ? "bg-blue-50 text-blue-600"
              : "hover:bg-gray-100"
          }`}
          onClick={() => setActiveSection("friends")}
        >
          <Users className="w-5 h-5" />
          <span>Danh sách bạn bè</span>
        </button>
        {/* <button
          className={`w-full px-4 py-2 text-left flex items-center gap-3 ${
            activeSection === "groups"
              ? "bg-blue-50 text-blue-600"
              : "hover:bg-gray-100"
          }`}
          onClick={() => setActiveSection("groups")}
        >
          <UsersRound className="w-5 h-5" />
          <span>Danh sách nhóm và cộng đồng</span>
        </button> */}
        <button
          className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-left ${
            activeSection === "requests"
              ? "bg-blue-50 text-blue-600"
              : "hover:bg-gray-100"
          }`}
          onClick={() => setActiveSection("requests")}
        >
          <div className="flex items-center">
            <UserPlus className="w-5 h-5 mr-3" />
            <span>Lời mời kết bạn</span>
          </div>
          {friendRequestCount > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
              {friendRequestCount}
            </span>
          )}
        </button>
        <button
          className={`w-full px-4 py-2 text-left flex items-center gap-3 ${
            activeSection === "blocked"
              ? "bg-blue-50 text-blue-600"
              : "hover:bg-gray-100"
          }`}
          onClick={() => setActiveSection("blocked")}
        >
          <Shield className="w-5 h-5" />
          <span>Danh sách chặn</span>
        </button>
        {/* <button
          className={`w-full px-4 py-2 text-left flex items-center gap-3 ${
            activeSection === "group-invites"
              ? "bg-blue-50 text-blue-600"
              : "hover:bg-gray-100"
          }`}
          onClick={() => setActiveSection("group-invites")}
        >
          <UsersRound className="w-5 h-5" />
          <span>Lời mời vào nhóm và cộng đồng</span>
        </button> */}
      </div>
    </div>
  );
}
