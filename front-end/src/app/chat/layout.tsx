import NavigationSidebar from "@/components/chat/sidebar/NavigationSidebar";

export default function chatLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="h-screen flex bg-background">
      <NavigationSidebar />
      <div className="ml-[70px] flex flex-1">
        {/* <ChatListSidebar /> */}
        <main className="flex-1 bg-gray-50">
          {/* Chat content area */}
          {children}
        </main>
      </div>
    </div>
  );
}
