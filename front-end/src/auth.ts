import { log } from "console";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

// import { authApi } from "./lib/api/authApi";
import {
    AccountIsLoggedError,
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
                        body: JSON.stringify({ email, password, platform: "web" }),
                    }).then(res => res.json());
                    console.log("Authorize response:", response);
                } catch (error) {
                    console.error("Login error:", error);
                    throw new ServerError();
                }
                if (!response.user || !response.accessToken) {
                    if (response.message === "Nhập sai email hoặc mật khẩu") {
                        throw new InvalidPhonePasswordError()
                    }
                    else if (response.message === "Nhập sai mật khẩu") {
                        throw new InvalidPhonePasswordError()

                    } else if (response.message === "Người dùng đang đăng nhập")
                        throw new AccountIsLoggedError();
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
            // console.log('Token callback:', { token, user, session, trigger });
            if (token.accessToken) {

                const expired = typeof token.accessToken === 'string' && isTokenExpired(token.accessToken);
                if (expired && token.refreshToken) {
                    try {
                        // Giải mã refresh token để lấy userId
                        const refreshToken = token.refreshToken as string;
                        const base64Url = refreshToken.split('.')[1];
                        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                        }).join(''));

                        const decoded = JSON.parse(jsonPayload);
                        console.log('Decoded refresh token in auth.ts:', decoded);
                        console.log("Refresh token in auth.ts:", refreshToken);

                        const response = await fetch('http://localhost:3000/auth/refresh-token', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                refreshToken: token.refreshToken,
                                platform: "web",
                                userId: decoded.id // Thêm userId để backend có thể xác minh
                            }),
                        });

                        if (!response.ok) {
                            const errorData = await response.json().catch(() => ({}));
                            console.error('Refresh token error in auth.ts:', errorData);

                            // Clear all token data to force logout
                            token = {
                                ...token,
                                accessToken: undefined,
                                refreshToken: undefined
                            };

                            // This will trigger a redirect to login page on next request
                            throw new Error(`SESSION_EXPIRED`);
                        }

                        const data = await response.json();

                        if (data.accessToken) {
                            token.accessToken = data.accessToken;

                            // Nếu có refreshToken mới, cập nhật luôn
                            if (data.refreshToken) {
                                token.refreshToken = data.refreshToken;
                            }

                            // Cập nhật thông tin user nếu có
                            if (data.user) {
                                token.id = data.user.id || token.id;
                                token.fullname = data.user.fullname || token.fullname;
                                token.email = data.user.email || token.email;
                                token.urlavatar = data.user.urlavatar || token.urlavatar;
                                // Cập nhật các thông tin khác nếu cần
                            }
                        } else {
                            console.error('No access token in refresh response');
                            throw new Error('No access token in refresh response');
                        }
                    } catch (error) {
                        console.error('Error refreshing token:', error);

                        // Clear tokens on refresh error
                        token.accessToken = undefined;
                        token.refreshToken = undefined;

                        // If we have a SESSION_EXPIRED error, we'll let the error propagate
                        // to trigger the signOut in the error handler
                        if (error instanceof Error && error.message === 'SESSION_EXPIRED') {
                            throw error;
                        }
                    }
                }
            }
            else if (trigger !== 'signIn' && (!token.accessToken || !token.refreshToken)) {
                console.error('No access token in token callback');
                throw new Error(`SESSION_EXPIRED`);
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
        // Decode JWT payload
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const decoded = JSON.parse(jsonPayload);
        const currentTime = Math.floor(Date.now() / 1000);

        return decoded.exp < currentTime;
    } catch (error) {
        console.error('Error decoding token:', error);
        return true;
    }
}
