import { log } from "console";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

// import { authApi } from "./lib/api/authApi";
import {
    AccountNotActivatedError,
    InvalidPhonePasswordError,
    ServerError,
} from "./utils/errors";

if (!process.env.AUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET must be defined');
}

export const {
    handlers,
    signIn,
    signOut,
    auth,
}: {
    handlers: any;
    signIn: any;
    signOut: any;
    auth: any;
} = NextAuth({
    providers: [
        Credentials({
            credentials: {
                phone: {},
                password: { label: "Password", type: "password" },
            },
            authorize: async (credentials, request): Promise<IUser | null> => {
                if (!credentials?.phone || !credentials?.password) {
                    return null;
                }
                if (
                    !credentials ||
                    typeof credentials.phone !== "string" ||
                    typeof credentials.password !== "string"
                ) {
                    throw new Error("Invalid credentials.");
                }
                let response: any;
                try {
                    const { phone, password } = credentials;
                    response = await fetch('http://localhost:3000/auth/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ phone, password }),
                        credentials: 'include',
                    }).then(res => res.json());
                    console.log("Authorize response:", response);
                } catch (error) {
                    console.error("Login error:", error);
                    throw new ServerError();
                }
                if (!response.user || !response.accessToken) {
                    if (response.message === "User not found") {
                        throw new InvalidPhonePasswordError()
                    }
                    else if (response.message === "Nhập sai password")
                        throw new InvalidPhonePasswordError()
                    else if (response.message === "Tài khoản chưa được xác thực")
                        throw new AccountNotActivatedError(response._id);
                    else if (response.message === "Số điện thoại hoặc mật khẩu không đúng")
                        throw new InvalidPhonePasswordError()
                    else {
                        throw new ServerError();
                    }
                }
                else {
                    const user = {
                        id: response.user.id,
                        username: response.user.username,
                        fullname: response.user.fullname,
                        phone: response.user.phone,
                        accessToken: response.access_token, // Add access token directly to user object
                    };
                    return user;
                }
            },
        }),
    ],
    pages: {
        signIn: "/auth/login",
    },
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async jwt({ token, user }: { token: any; user: any }) {
            if (user) {
                // Cập nhật token với thông tin user theo interface IUser
                token.id = user.id;
                token.username = user.username;
                token.phone = user.phone;
                token.fullname = user.fullname;
                // Lưu accessToken riêng, không nằm trong interface IUser
                token.accessToken = user.accessToken;
            }
            return token;
        },
        async session({ session, token }: { session: any; token: any }) {
            // Cập nhật session.user theo interface IUser
            session.user = {
                id: token.id,
                username: token.username,
                phone: token.phone,
                fullname: token.fullname,
                session: token.session,
            };
            // Lưu accessToken ở cấp session, không phải trong user
            session.accessToken = token.accessToken;
            return session;
        },
        authorized: async ({ auth }) => {
            // Logged in users are authenticated, otherwise redirect to login page
            return !!auth;
        },
    },
    secret: process.env.AUTH_SECRET,
});
