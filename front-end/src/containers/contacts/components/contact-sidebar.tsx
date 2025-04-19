import { Users, UserPlus, UsersRound } from "lucide-react";
import SearchBar from "@/containers/chats/chat-list/search-bar";

interface ContactSidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

export default function ContactSidebar({
  activeSection,
  setActiveSection,
}: ContactSidebarProps) {
  const handleSelectConversation = (id: string) => {
    console.log("Selected conversation:", id);
  };

  return (
    <div className="w-[240px] border-r border-gray-200 bg-white">
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
        <button
          className={`w-full px-4 py-2 text-left flex items-center gap-3 ${
            activeSection === "groups"
              ? "bg-blue-50 text-blue-600"
              : "hover:bg-gray-100"
          }`}
          onClick={() => setActiveSection("groups")}
        >
          <UsersRound className="w-5 h-5" />
          <span>Danh sách nhóm và cộng đồng</span>
        </button>
        <button
          className={`w-full px-4 py-2 text-left flex items-center gap-3 ${
            activeSection === "requests"
              ? "bg-blue-50 text-blue-600"
              : "hover:bg-gray-100"
          }`}
          onClick={() => setActiveSection("requests")}
        >
          <UserPlus className="w-5 h-5" />
          <span>Lời mời kết bạn</span>
        </button>
        <button
          className={`w-full px-4 py-2 text-left flex items-center gap-3 ${
            activeSection === "group-invites"
              ? "bg-blue-50 text-blue-600"
              : "hover:bg-gray-100"
          }`}
          onClick={() => setActiveSection("group-invites")}
        >
          <UsersRound className="w-5 h-5" />
          <span>Lời mời vào nhóm và cộng đồng</span>
        </button>
      </div>
    </div>
  );
}
