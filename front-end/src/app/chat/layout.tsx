import NavigationSidebar from "@/components/chat/sidebar/NavigationSidebar";
import UserDataLoader from "@/components/auth/user-data-loader";
import SocketProviders from "@/components/providers/socket-providers";

export default function chatLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <UserDataLoader>
      <SocketProviders>
        <div className="h-screen flex flex-col sm:flex-row bg-background">
          <NavigationSidebar />
          <div className="ml-0 sm:ml-[70px] flex flex-1">
            <main className="flex-1 bg-gray-50">
              {children}
            </main>
          </div>
        </div>
      </SocketProviders>
    </UserDataLoader>
  );
}
