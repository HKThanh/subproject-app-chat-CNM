import { ChevronDown, MoreHorizontal, Search, X, Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import SearchBar from "./search-bar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";

export default function TabNavigation({ onSelectConversation }: { onSelectConversation: (id: string) => void }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  // Mock data for recent conversations
  const recentConversations = [
    { id: '1', name: 'Nguyễn Thanh Cảnh', avatar: 'https://ui-avatars.com/api/?name=Nguyễn+Thanh+Cảnh&background=random' },
    { id: '2', name: 'Vũ Hải Nam', avatar: 'https://ui-avatars.com/api/?name=Vũ+Hải+Nam&background=random' },
    { id: '3', name: 'Thơ', avatar: 'https://ui-avatars.com/api/?name=Thơ&background=random' },
    { id: '4', name: 'Thuylinh', avatar: 'https://ui-avatars.com/api/?name=Thuylinh&background=random' },
    { id: '5', name: 'Dương Thái Bảo', avatar: 'https://ui-avatars.com/api/?name=Dương+Thái+Bảo&background=random' },
    { id: '6', name: 'An Quốc Việt', avatar: 'https://ui-avatars.com/api/?name=An+Quốc+Việt&background=random' },
    { id: '7', name: 'Anh Đạt Tiếc', avatar: 'https://ui-avatars.com/api/?name=Anh+Đạt+Tiếc&background=random' },
    { id: '8', name: 'Anh Khoa Kaha', avatar: 'https://ui-avatars.com/api/?name=Anh+Khoa+Kaha&background=random' },
  ];

  const toggleUserSelection = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleCreateGroup = () => {
    // Logic to create group with selected users
    console.log("Creating group:", {
      name: groupName,
      members: selectedUsers
    });
    
    // Close modal and reset state
    setIsModalOpen(false);
    setGroupName("");
    setSearchQuery("");
    setSelectedUsers([]);
  };

  return (
    <div className="flex flex-col border-b border-gray-200 bg-gray-200">
      <div className="flex items-center justify-between px-4 py-3">
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
        <button className="px-3 py-1 text-sm font-medium text-gray-900 bg-gray-100 rounded-full">
          DIRECT
        </button>
        <button className="px-3 py-1 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-full">
          GROUPS
        </button>
        <button className="px-3 py-1 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-full">
          PUBLIC
        </button>
      </div>
      
      <div className="px-4 pb-3">
        <SearchBar onSelectConversation={onSelectConversation} />
      </div>

      {/* Create Group Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle className="text-center font-bold text-xl">Tạo nhóm</DialogTitle>
          <button 
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
            onClick={() => setIsModalOpen(false)}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
          
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative">
              <div className="w-14 h-14 bg-gray-200 rounded-full flex items-center justify-center">
                <Camera className="w-6 h-6 text-gray-500" />
              </div>
              <button className="absolute bottom-0 right-0 w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold">+</span>
              </button>
            </div>
            <Input 
              placeholder="Nhập tên nhóm..." 
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="flex-1"
            />
          </div>
          
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Nhập tên, số điện thoại, hoặc danh sách số điện thoại" 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex space-x-2 mb-4 overflow-x-auto py-1">
            <Button variant="default" className="rounded-full bg-blue-600 hover:bg-blue-700 text-white text-xs px-4">
              Tất cả
            </Button>
            <Button variant="outline" className="rounded-full text-xs px-4 whitespace-nowrap">
              job
            </Button>
            <Button variant="outline" className="rounded-full text-xs px-4 whitespace-nowrap">
              KTPM
            </Button>
            <Button variant="outline" className="rounded-full text-xs px-4 whitespace-nowrap">
              Trả lời sau
            </Button>
            <Button variant="outline" className="rounded-full text-xs px-4 whitespace-nowrap">
              QLDA
            </Button>
            <Button variant="outline" className="rounded-full text-xs px-4 whitespace-nowrap">
              bigdata
            </Button>
          </div>
          
          <div className="mb-2">
            <h3 className="font-semibold text-sm mb-2">Trò chuyện gần đây</h3>
            <div className="max-h-60 overflow-y-auto pr-2">
              {recentConversations.map((user) => (
                <div key={user.id} className="flex items-center space-x-3 py-2 border-b border-gray-100">
                  <input
                    type="checkbox"
                    id={`user-${user.id}`}
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => toggleUserSelection(user.id)}
                    className="rounded-full h-5 w-5 text-blue-600"
                  />
                  <Avatar className="h-10 w-10">
                    <img src={user.avatar} alt={user.name} />
                  </Avatar>
                  <label htmlFor={`user-${user.id}`} className="flex-1 cursor-pointer">
                    {user.name}
                  </label>
                </div>
              ))}
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 mt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button 
              disabled={!groupName || selectedUsers.length === 0}
              onClick={handleCreateGroup}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              Tạo nhóm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
