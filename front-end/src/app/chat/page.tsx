import MessageList from "@/containers/chat-components/message-list";
import SearchBar from "@/containers/chat-components/search-bar";
import TabNavigation from "@/containers/chat-components/tab-navigation";
import ChatList from "@/containers/chats/chat-list";

const ChatPage = () => {
  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-200 w-1/4">
      <div className="p-4">
        <SearchBar />
      </div>
      <div className="flex-1 overflow-hidden flex flex-col">
        <TabNavigation />
        <MessageList />
      </div>
    </div>
  );
};

export default ChatPage;
