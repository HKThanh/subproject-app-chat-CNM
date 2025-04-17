import { ChevronDown, MoreHorizontal, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import SearchBar from "./search-bar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function TabNavigation({ onSelectConversation }: { onSelectConversation: (id: string) => void }) {
  return (
    <div className="flex flex-col border-b border-gray-200 bg-gray-200">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-xl font-bold text-gray-900">Chats</h2>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="w-8 h-8 flex items-center justify-center rounded-full bg-chat-primary text-white">
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
    </div>
  );
}
