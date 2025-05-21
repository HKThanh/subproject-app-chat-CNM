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
import useUserStore from "@/stores/useUserStoree";
import CallUI from "@/components/call/CallUI";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const router = useRouter();

  useEffect(() => {
    const handleAuthError = async (event: PromiseRejectionEvent): Promise<void> => {
      if (event?.reason?.message?.includes('SESSION_EXPIRED')) {
        console.log('Session expired, redirecting to login');
        
        try {
          // Clear any stored auth data
          const userStore = useUserStore.getState();
          userStore.clearUser();
          
          // Sign out and redirect
          await signOut({ 
            redirect: false,
          });
          
          // Force navigation to login
          router.push('/auth/login');
        } catch (error) {
          console.error('Error during sign out:', error);
          // Force navigation even if signOut fails
          window.location.href = '/auth/login';
        }
      }
    };

    window.addEventListener('unhandledrejection', handleAuthError);
    return () => {
      window.removeEventListener('unhandledrejection', handleAuthError);
    };
  }, [router]);

  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          <AuthSync />
          <CallUI />
          <Toaster richColors position="top-right" />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
