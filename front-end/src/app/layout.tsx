"use client"
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import AuthSync from "@/components/auth/auth.sync";
import { Toaster } from "sonner";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { hydrateUserStore } from "@/stores/useUserStoree";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});
// Thêm component này vào layout
function StoreHydration() {
  useEffect(() => {
    hydrateUserStore();
  }, []);
  return null;
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <StoreHydration />
          <AuthSync />
          <Toaster richColors position="top-right" />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
