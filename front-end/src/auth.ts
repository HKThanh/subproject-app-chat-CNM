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
                email: {},
                password: { label: "Password", type: "password" },
            },
            authorize: async (credentials, request): Promise<IUser | null> => {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }
                if (
                    !credentials ||
                    typeof credentials.email !== "string" ||
                    typeof credentials.password !== "string"
                ) {
                    throw new Error("Invalid credentials.");
                }
                let response: any;
                try {
                    const { email, password } = credentials;
                    response = await fetch('http://localhost:3000/auth/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ email, password }),
                    }).then(res => res.json());
                    console.log("Authorize response:", response);
                } catch (error) {
                    console.error("Login error:", error);
                    throw new ServerError();
                }
                if (!response.user || !response.accessToken) {
                    if (response.message === "Sai tên đăng nhập") {
                        throw new InvalidPhonePasswordError()
                    }
                    else if (response.message === "Nhập sai mật khẩu") {
                        throw new InvalidPhonePasswordError()
                        
                    } else if (response.message === "Tài khoản chưa được xác thực")
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
                        accessToken: response.accessToken, // Add access token directly to user object
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
        async jwt({ token, user, session, trigger }) {
            // Thêm logic check expired token
            if (token.accessToken) {
                const expired = typeof token.accessToken === 'string' && isTokenExpired(token.accessToken);
                if (expired && token.refreshToken) {
                    try {
                        const response = await fetch('http://localhost:3000/auth/refresh-token', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ refreshToken: token.refreshToken }),
                        }).then(res => res.json());

                        if (response.accessToken) {
                            token.accessToken = response.accessToken;
                        }
                    } catch (error) {
                        console.error('Error refreshing token:', error);
                        // Clear tokens on refresh error
                        delete token.accessToken;
                        delete token.refreshToken;
                    }
                }
            }
            if (trigger === 'update' && session?.user) {
                // When updating via session, use session.user instead of user
                const userData = session.user;

                // Only iterate if userData exists
                if (userData) {
                    Object.keys(userData).forEach(key => {
                        if (userData[key] !== undefined) {
                            token[key] = userData[key];
                        }
                    });

                    // Ensure critical fields are set
                    token.sub = userData.id || token.sub;
                    token.id = userData.id || token.id;
                    token.fullname = userData.fullname || token.fullname;
                    token.bio = userData.bio || token.bio;
                    token.phone = userData.phone || token.phone;
                    token.ismale = userData.ismale || token.ismale;
                    token.birthday = userData.birthday || token.birthday;
                    token.urlavatar = userData.urlavatar || token.urlavatar;
                    token.coverPhoto = userData.coverPhoto || token.coverPhoto;
                }
            }

            // Initial sign in
            if (user) {
                token.sub = user.id;
                token.id = user.id;
                token.fullname = user.fullname;
                token.bio = user.bio;
                token.ismale = user.ismale;
                token.birthday = user.birthday;
                token.urlavatar = user.urlavatar;
                token.coverPhoto = user.coverPhoto;
                token.accessToken = user.accessToken;
                token.refreshToken = user.refreshToken;
                token.email = user.email;
                token.phone = user.phone;
                token.createdAt = user.createdAt;
            }

            return token;
        },
        async session({ session, token }) {
            console.log("Session callback token:", token);
            return {
                ...session,
                user: {
                    id: String(token.id),
                    urlavatar: String(token.urlavatar || ''),
                    birthday: String(token.birthday || ''),
                    createdAt: String(token.createdAt || ''),
                    fullname: String(token.fullname || ''),
                    email: String(token.email || ''),
                    phone: String(token.phone || ''),
                    bio: String(token.bio || ''),
                    coverPhoto: String(token.coverPhoto || ''),
                    ismale: Boolean(token.ismale || ''),
                },
                refreshToken: String(token.refreshToken || ''),
                accessToken: String(token.accessToken || '')
            };
        },
    },
    secret: process.env.AUTH_SECRET,
});

// Helper function to check token expiration
function isTokenExpired(token: string): boolean {
    try {
        const decoded = JSON.parse(atob(token.split('.')[1]));
        return decoded.exp * 1000 < Date.now();
    } catch {
        return true;
    }
}
