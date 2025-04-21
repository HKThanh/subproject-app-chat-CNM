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
    // Add a global error handler for auth errors
    const handleAuthError = (event: PromiseRejectionEvent): void => {
      if (event && event.reason && 
          typeof event.reason.message === 'string' && 
          event.reason.message.includes('SESSION_EXPIRED')) {
        console.log('Session expired, redirecting to login');
        
        // Sign out the user and redirect to login
        signOut({ redirect: true, callbackUrl: '/auth/login' });
      }
    };

    // Add the event listener
    window.addEventListener('unhandledrejection', handleAuthError);
    
    // Clean up
    return () => {
      window.removeEventListener('unhandledrejection', handleAuthError);
    };
  }, [router]);

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
