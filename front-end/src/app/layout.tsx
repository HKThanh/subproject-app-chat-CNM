import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import AuthSync from "@/components/auth/auth.sync";
import { Toaster } from "sonner";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "WeChat - Ứng dụng nhắn tin trực tuyến",
  description: "WeChat là ứng dụng nhắn tin trực tuyến giúp bạn kết nối và trò chuyện với bạn bè một cách nhanh chóng và tiện lợi",
  keywords: "chat app, nhắn tin trực tuyến, chat realtime, messenger",
  authors: [{ name: "WeChat Team" }],
  openGraph: {
    title: "WeChat - Ứng dụng nhắn tin trực tuyến",
    description: "Kết nối và trò chuyện với bạn bè một cách nhanh chóng và tiện lợi",
    type: "website",
    locale: "vi_VN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          <AuthSync />
          <Toaster richColors position="top-right" />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
