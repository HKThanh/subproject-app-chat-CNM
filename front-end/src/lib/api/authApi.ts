import useUserStore from "@/stores/useUserStoree";
const API_URL = process.env.NEXT_PUBLIC_API_URL;

class AuthApi {
  async login(email: string, password: string) {
    try {
      // Đặt trạng thái loading trước khi gọi API
      const store = useUserStore.getState();
      store.setLoading(true);
      
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, platform: "web" }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        store.setLoading(false);
        return {
          success: false,
          message: data.message || "Login failed",
          status: response.status,
        };
      }
      
      // If login successful, store user data in Zustand
      if (data.user && data.accessToken) {
        // Lưu thông tin user vào store
        store.setUser(data.user, data.accessToken);
        
        // Lưu tokens nếu có
        if (data.refreshToken) {
          store.setTokens(data.accessToken, data.refreshToken);
        }
        
        // Lưu trực tiếp vào localStorage để đảm bảo
        if (typeof window !== 'undefined') {
          try {
            const userData = {
              state: {
                user: data.user,
                accessToken: data.accessToken,
                refreshToken: data.refreshToken || null,
              }
            };
            localStorage.setItem("user-storage", JSON.stringify(userData));
            console.log("Đã lưu thông tin user vào localStorage");
          } catch (error) {
            console.error("Lỗi khi lưu vào localStorage:", error);
          }
        }
        
        // Log thông tin user từ response API
        console.log("User data from API response:", data.user);
      } else {
        console.error("Missing user data or access token in login response");
      }
      
      store.setLoading(false);
      
      return {
        success: true,
        data,
        status: response.status,
      };
    } catch (error) {
      console.error("Login API error:", error);
      useUserStore.getState().setLoading(false);
      return {
        success: false,
        message: "An unexpected error occurred",
        status: 500,
      };
    }
  }
  
  async refreshToken(refreshToken: string, userId: string) {
    try {
      const response = await fetch(`${API_URL}/auth/refresh-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          refreshToken,
          platform: "web",
          userId,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          message: data.message || "Token refresh failed",
          status: response.status,
        };
      }
      
      // Update tokens in Zustand store
      if (data.accessToken) {
        const store = useUserStore.getState();
        store.setTokens(
          data.accessToken, 
          data.refreshToken || refreshToken
        );
      }
      
      return {
        success: true,
        data,
        status: response.status,
      };
    } catch (error) {
      console.error("Refresh token API error:", error);
      return {
        success: false,
        message: "An unexpected error occurred",
        status: 500,
      };
    }
  }
  
  async getMe(accessToken: string) {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          message: data.message || "Failed to get user data",
          status: response.status,
        };
      }
      
      // Update user data in Zustand store
      if (data.success && data.data) {
        const store = useUserStore.getState();
        store.setUser(data.data, accessToken);
      }
      
      return {
        success: true,
        data: data.data,
        status: response.status,
      };
    } catch (error) {
      console.error("Get user API error:", error);
      return {
        success: false,
        message: "An unexpected error occurred",
        status: 500,
      };
    }
  }
  
  async logout(accessToken: string) {
    try {
      const response = await fetch(`${API_URL}/auth/logout/web`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      
      const data = await response.json();
      
      // Clear user data from Zustand regardless of API response
      const store = useUserStore.getState();
      store.clearUser();
      
      return {
        success: response.ok,
        message: data.message,
        status: response.status,
      };
    } catch (error) {
      console.error("Logout API error:", error);
      
      // Still clear user data even if API call fails
      const store = useUserStore.getState();
      store.clearUser();
      
      return {
        success: false,
        message: "An unexpected error occurred",
        status: 500,
      };
    }
  }
}

export const authApi = new AuthApi();