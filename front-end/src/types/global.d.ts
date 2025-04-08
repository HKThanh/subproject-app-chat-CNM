// Tích hợp với NextAuth
import { DefaultSession, DefaultUser, JWT } from "next-auth";

declare global {
  interface IUser {
    id: string;
    fullname: String,
    urlavatar: String,
    birthday: String,
    createdAt: String,
  }

  interface IAuthResponse {
    user: IUser;
    access_token: string;

    refresh_token: string;  }
}
namespace NodeJS {
  interface ProcessEnv {
    NEXTAUTH_SECRET: string;
    // Các biến môi trường khác nếu có
  }
}

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & IUser; // Kết hợp DefaultUser với IUser
    accessToken: string; // Thêm accessToken vào Session
  }

  interface User extends DefaultUser, IUser {
    // Kết hợp DefaultUser với IUser
  }

  interface JWT {
    id: string;
    user: IUser;
    accessToken: string;
  }
}
export {};
