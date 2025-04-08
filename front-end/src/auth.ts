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
                        urlavatar: response.user.urlavatar,
                        fullname: response.user.fullname,
                        birthday: response.user.birthday,
                        createdAt: response.user.createdAt,
                        email: response.user.email,
                        phone: response.user.phone,
                        bio: response.user.bio,
                        coverPhoto: response.user.coverPhoto,
                        ismale: response.user.ismale,
                        accessToken: response.access_token, // Add access token directly to user object
                        refreshToken: response.refreshToken,
                        
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
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    callbacks: {
        async jwt({ token, user }: { token: any; user: any }) {
            if (user) {
                // Store complete user object in token
                return {
                    ...token,
                    ...user,
                    accessToken: user.accessToken,
                    refreshToken: user.refreshToken,
                };
            }
            return token;
        },
        async session({ session, token }) {
            // Ensure all user data is passed to the session
            return {
                ...session,
                user: {
                    id: String(token.id),
                    urlavatar: String(token.urlavatar || ''),
                    birthday: String(token.birthday || ''),
                    createdAt: String(token.createdAt || ''),
                    fullname: String(token.fullname || ''),
                    email: String(token.email|| ''),
                    phone: String(token.phone|| ''),
                    bio:String(token.bio || ''),
                    coverPhoto:String(token.coverPhoto || ''),
                    ismale:Boolean(token.ismale || ''),
                },
                refreshToken: String(token.refreshToken || ''),
                accessToken: String(token.accessToken || '')
            };
        },
    },
    secret: process.env.AUTH_SECRET,
});
