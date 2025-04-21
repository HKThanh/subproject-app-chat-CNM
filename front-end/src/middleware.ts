import { NextResponse } from "next/server";
import { auth } from "@/auth";
export async function middleware(request: any) {
  const session = await auth();
  // Các routes cần auth
  const protectedPaths = ['/chat', '/contacts', '/profile'];

  // Check if current path is protected
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );

  // Kiểm tra session và access token
  if (isProtectedPath) {
    if (!session?.user) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    // Kiểm tra access token
    if (!session.accessToken) {
      // Clear session và redirect về login
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  // Ngăn user đã login access login page
  if (request.nextUrl.pathname.startsWith('/auth/login') && session?.user) {
    return NextResponse.redirect(new URL("/", request.url));
  }


  return NextResponse.next();
}

export const config = {
  matcher: [
    '/chat/:path*',
    '/contacts/:path*',
    '/profile/:path*',
    '/auth/login',
    "/((?!api|_next/static|_next/image|_next/data|favicon.ico|auth|verify|login|register|$).*)",
  ],
};
