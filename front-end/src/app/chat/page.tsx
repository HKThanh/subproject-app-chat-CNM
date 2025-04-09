import MessageList from "@/containers/chat-list/message-list";
import SearchBar from "@/containers/chat-list/search-bar";
import TabNavigation from "@/containers/chat-list/tab-navigation";
import ChatDetail from "@/containers/chat-main/chat-detail";
import ChatList from "@/containers/chats/chat-list";

const ChatPage = () => {
  return (
    <div className="flex h-screen bg-gray-900 text-gray-200">
      <div className="w-1/3 flex flex-col border-r border-gray-800">
        <div className="p-4">
          <SearchBar />
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">
          <TabNavigation />
          <MessageList />
        </div>
      </div>
      <div className="w-2/3 flex flex-col">
        <ChatDetail />
      </div>
    </div>
  );
};

export default ChatPage;
