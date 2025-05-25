import NavigationSidebar from "@/components/chat/sidebar/NavigationSidebar";
import UserDataLoader from "@/components/auth/user-data-loader";
import SocketProviders from "@/components/providers/socket-providers";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default function RootLayout({
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
            <Suspense fallback={
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            }>
              <main className="flex-1 bg-gray-50">
                {children}
              </main>
            </Suspense>
          </div>
        </div>
      </SocketProviders>
    </UserDataLoader>
  );
}