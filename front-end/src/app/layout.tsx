import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
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
      <body
        className={`${inter.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
