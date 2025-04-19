import { ChevronDown, MoreHorizontal, Search, X, Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import SearchBar from "./search-bar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { useSocketContext } from "@/socket/SocketContext";
import useUserStore from "@/stores/useUserStoree";
import { useChatContext } from "@/socket/ChatContext";
import { toast } from "sonner";
import { getAuthToken } from "@/utils/auth-utils";
import MessageList from "./message-list";

export default function TabNavigation({
  onSelectConversation,
  activeConversationId,
}: {
  onSelectConversation: (id: string) => void;
  activeConversationId?: string | null;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState(""); // Add searchTerm state for filtering conversations
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // Add state for active tab
  const [activeTab, setActiveTab] = useState<"DIRECT" | "GROUPS">("DIRECT");
  
  // Get socket, current user, and chat context
  const { socket } = useSocketContext();
  const currentUser = useUserStore((state) => state.user);
  const { conversations, loading, createGroupConversation } = useChatContext(); // Add createGroupConversation
  
  // Use a ref for API_URL to keep it stable between renders
  const API_URL = useRef(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000").current;
  
  // State for friends list
  const [friends, setFriends] = useState<
    Array<{ id: string; fullname: string; urlavatar?: string }>
  >([]);
  
  // Memoize the group creation response handler
  const handleGroupCreationResponse = useCallback((data: any) => {
    setIsLoading(false);
    
    if (data.success) {
      toast.success("Tạo nhóm thành công");
      setIsModalOpen(false);
      setGroupName("");
      setSearchQuery("");
      setSelectedUsers([]);
      
      // Switch to GROUPS tab after successful group creation
      setActiveTab("GROUPS");
      
      // Select the newly created conversation
      if (data.conversation && data.conversation.idConversation) {
        onSelectConversation(data.conversation.idConversation);
      }
    } else {
      toast.error(data.message || "Không thể tạo nhóm");
    }
  }, [onSelectConversation]);
  
  // Fetch friends when modal opens
  useEffect(() => {
    // Only fetch friends when the modal is actually open
    if (isModalOpen && currentUser) {
      const fetchFriends = async () => {
        try {
          // Get token only when needed
          const token = await getAuthToken();
          
          const response = await fetch(`${API_URL}/user/friend/get-friends`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          
          const data = await response.json();
          
          if (data.code === 0) {
            setFriends(data.data);
            console.log("data friends>>>> ", data.data);
          } else {
            toast.error("Không thể tải danh sách bạn bè");
          }
        } catch (err) {
          console.error(err);
          toast.error("Không thể tải danh sách bạn bè");
        }
      };

      fetchFriends();
      
      // Add listener for group creation response
      socket?.on("create_group_conversation_response", handleGroupCreationResponse);
      
      return () => {
        socket?.off("create_group_conversation_response", handleGroupCreationResponse);
      };
    }
  }, [isModalOpen, currentUser, socket, handleGroupCreationResponse]);

  // Load appropriate conversations when tab changes
  useEffect(() => {
    if (socket && currentUser?.id) {
      if (activeTab === "DIRECT") {
        console.log("Switching to DIRECT tab, loading direct conversations");
        socket.emit("load_conversations", {
          IDUser: currentUser.id,
          lastEvaluatedKey: 0,
        });
      } else if (activeTab === "GROUPS") {
        console.log("Switching to GROUPS tab, loading group conversations");
        socket.emit("load_group_conversations", {
          IDUser: currentUser.id,
          lastEvaluatedKey: 0,
        });
      }
    }
  }, [activeTab, socket, currentUser]);

  // Filter friends based on search query
  const filteredFriends = searchQuery
    ? friends.filter((friend) =>
        friend.fullname.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : friends;

  const toggleUserSelection = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleCreateGroup = () => {
    if (!createGroupConversation || !currentUser) {
      toast.error("Không thể kết nối đến máy chủ");
      return;
    }

    if (!groupName.trim()) {
      toast.error("Vui lòng nhập tên nhóm");
      return;
    }

    if (selectedUsers.length === 0) {
      toast.error("Vui lòng chọn ít nhất một thành viên");
      return;
    }

    setIsLoading(true);

    console.log("Creating group with members:", selectedUsers);
    
    // Use the createGroupConversation function from useChat
    createGroupConversation(
      groupName.trim(),
      selectedUsers,
      undefined // groupAvatar
    );
    
    // Add a timeout to handle cases where the server doesn't respond
    setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        toast.error("Tạo nhóm không nhận được phản hồi, vui lòng thử lại sau");
      }
    }, 10000);
  };

  return (
    <div className="flex flex-col h-full bg-gray-200">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">Chats</h2>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-full bg-chat-primary text-white"
                onClick={() => setIsModalOpen(true)}
              >
                <span className="text-lg font-bold">+</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Tạo nhóm</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex space-x-1 px-4 pb-3">
        <button 
          className={`px-3 py-1 text-sm font-medium rounded-full ${
            activeTab === "DIRECT" 
              ? "text-gray-900 bg-gray-100" 
              : "text-gray-500 hover:bg-gray-100"
          }`}
          onClick={() => setActiveTab("DIRECT")}
        >
          DIRECT
        </button>
        <button 
          className={`px-3 py-1 text-sm font-medium rounded-full ${
            activeTab === "GROUPS" 
              ? "text-gray-900 bg-gray-100" 
              : "text-gray-500 hover:bg-gray-100"
          }`}
          onClick={() => setActiveTab("GROUPS")}
        >
          GROUPS
        </button>
      </div>

      <div className="px-4 pb-3">
        <SearchBar 
          onSearch={setSearchTerm} 
          activeTab={activeTab} 
        />
      </div>

      <MessageList 
        conversations={conversations || []}
        activeConversationId={activeConversationId || null}
        onSelectConversation={onSelectConversation}
        loading={loading || false}
        activeTab={activeTab}
        searchTerm={searchTerm}
      />

      {/* Create Group Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="text-lg font-semibold border-b pb-2">Tạo nhóm</DialogTitle>
          <div className="space-y-4 py-2">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                <Camera className="h-6 w-6 text-gray-500" />
              </div>
              <Input
                id="group-name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Nhập tên nhóm..."
                className="flex-1"
              />
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search-friends"
                placeholder="Nhập tên, số điện thoại, hoặc danh sách số điện thoại"
                className="pl-10 py-5 rounded-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="max-h-[400px] overflow-y-auto">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Trò chuyện gần đây</h3>
              
              {filteredFriends.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  {searchQuery ? "Không tìm thấy bạn bè" : "Không có bạn bè"}
                </p>
              ) : (
                <div className="space-y-1">
                  {filteredFriends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center py-2 cursor-pointer"
                      onClick={() => toggleUserSelection(friend.id)}
                    >
                      <div className="mr-3 flex-shrink-0">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(friend.id)}
                          onChange={() => {}}
                          className="h-5 w-5 rounded-full border-gray-300"
                        />
                      </div>
                      <Avatar className="h-10 w-10 mr-3 rounded-full">
                        {friend.urlavatar ? (
                          <img
                            src={friend.urlavatar}
                            alt={friend.fullname}
                            className="h-full w-full object-cover rounded-full"
                          />
                        ) : (
                          <div className="h-full w-full bg-gray-300 flex items-center justify-center rounded-full">
                            <span className="text-sm font-medium">
                              {friend.fullname.charAt(0)}
                            </span>
                          </div>
                        )}
                      </Avatar>
                      <span className="text-sm font-medium">{friend.fullname}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-4 border-t pt-3">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isLoading}
              className="rounded-md px-6"
            >
              Hủy
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={isLoading || !groupName.trim() || selectedUsers.length === 0}
              className="rounded-md bg-blue-400 hover:bg-blue-500 px-6"
            >
              {isLoading ? (
                <>
                  <span className="mr-2">Đang tạo...</span>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </>
              ) : (
                "Tạo nhóm"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
