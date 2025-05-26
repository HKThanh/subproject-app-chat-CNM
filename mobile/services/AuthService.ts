import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Key cho AsyncStorage
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_DATA_KEY = 'user_data';

// Đường dẫn API
const API_URL = 'http://192.168.0.104:3000';

// Interface cho response từ API refresh token
interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

// Interface for logout response
interface LogoutResponse {
  success: boolean;
  message: string;
}

// Interface for user data
export interface UserData {
  id: string;
  fullname?: string;
  email?: string;
  urlavatar?: string;
  phone?: string;
  bio?: string;
  coverPhoto?: string;
  birthday?: string;
  ismale?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

class AuthService {
  private static instance: AuthService;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private userData: UserData | null = null;
  private refreshPromise: Promise<string | null> | null = null;
  
  // Theo dõi trạng thái sẵn sàng của service
  private isReady: boolean = false;
  private readyPromise: Promise<boolean>;
  private resolveReady!: (value: boolean) => void;

  private constructor() {
    // Khởi tạo promise để theo dõi trạng thái sẵn sàng
    this.readyPromise = new Promise<boolean>(resolve => {
      this.resolveReady = resolve;
    });
    
    // Tải token ngay khi khởi tạo
    this.loadTokens().then(() => {
      this.isReady = true;
      this.resolveReady(true);
      console.log('AuthService is ready, tokens loaded');
    }).catch(error => {
      console.error('Error initializing AuthService:', error);
      this.isReady = false;
      this.resolveReady(false);
    });
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Đợi AuthService sẵn sàng
  public async waitForReady(): Promise<boolean> {
    return this.readyPromise;
  }

  // Kiểm tra nhanh trạng thái sẵn sàng
  public isServiceReady(): boolean {
    return this.isReady;
  }

  // Load tokens từ AsyncStorage khi khởi tạo service
  private async loadTokens(): Promise<void> {
    try {
      const [accessToken, refreshToken, userDataString] = await Promise.all([
        AsyncStorage.getItem(ACCESS_TOKEN_KEY),
        AsyncStorage.getItem(REFRESH_TOKEN_KEY),
        AsyncStorage.getItem(USER_DATA_KEY),
      ]);

      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      
      if (userDataString) {
        this.userData = JSON.parse(userDataString);
      }
      
      console.log('Tokens and user data loaded from storage');
    } catch (error) {
      console.error('Error loading tokens and user data:', error);
    }
  }

  // Lưu tokens vào AsyncStorage
  public async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    try {
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;

      await Promise.all([
        AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken),
        AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken),
      ]);

      console.log('Tokens saved to storage');
      this.isReady = true;
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  }

  // Lưu thông tin người dùng
  public async saveUserData(userData: UserData): Promise<void> {
    try {
      this.userData = userData;
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
      console.log('User data saved to storage');
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  }

  // Lấy thông tin người dùng
  public getUserData(): UserData | null {
    return this.userData;
  }

  // Xóa tokens khi đăng xuất
  public async clearTokens(): Promise<void> {
    try {
      this.accessToken = null;
      this.refreshToken = null;
      this.userData = null;

      await Promise.all([
        AsyncStorage.removeItem(ACCESS_TOKEN_KEY),
        AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
        AsyncStorage.removeItem(USER_DATA_KEY),
      ]);

      console.log('Tokens and user data cleared from storage');
    } catch (error) {
      console.error('Error clearing tokens and user data:', error);
    }
  }

  // Lấy access token, tự động refresh nếu cần
  public async getAccessToken(): Promise<string | null> {
    // Đảm bảo rằng service đã sẵn sàng
    if (!this.isReady) {
      console.log('AuthService not ready, waiting...');
      await this.waitForReady();
    }
    
    // Nếu không có refresh token, không thể lấy access token mới
    if (!this.refreshToken) {
      return null;
    }

    // Nếu có access token và còn hạn, trả về luôn
    if (this.accessToken && !this.isTokenExpired(this.accessToken)) {
      return this.accessToken;
    }

    // Nếu đang refresh token, đợi kết quả
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    // Refresh token
    this.refreshPromise = this.refreshAccessToken();
    const newAccessToken = await this.refreshPromise;
    this.refreshPromise = null;
    
    return newAccessToken;
  }

  // Kiểm tra token đã hết hạn chưa
  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // Convert to milliseconds
      return Date.now() > exp;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true; // Mặc định là hết hạn nếu có lỗi
    }
  }

  // Refresh access token
  private async refreshAccessToken(): Promise<string | null> {
    try {
      if (!this.refreshToken) {
        return null;
      }

      console.log('Refreshing access token...');
      
      const response = await fetch(`${API_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: this.refreshToken,
          platform: Platform.OS === 'ios' || Platform.OS === 'android' ? 'mobile' : 'web',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh token');
      }

      const data: TokenResponse = await response.json();
      
      if (data.accessToken && data.refreshToken) {
        await this.setTokens(data.accessToken, data.refreshToken);
        return data.accessToken;
      }
      
      return null;
    } catch (error) {
      console.error('Error refreshing token:', error);
      
      // Xóa tokens nếu refresh thất bại
      await this.clearTokens();
      return null;
    }
  }

  // Tạo Authorization header với Bearer token
  public async getAuthHeader(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  // Kiểm tra xem người dùng đã đăng nhập chưa
  public async isAuthenticated(): Promise<boolean> {
    // Đảm bảo rằng service đã sẵn sàng
    if (!this.isReady) {
      await this.waitForReady();
    }
    
    // Có token và token còn hạn
    const token = await this.getAccessToken();
    return !!token;
  }

  // Thực hiện fetch API với token tự động
  public async fetchWithAuth(
    url: string, 
    options: RequestInit = {}
  ): Promise<Response> {
    const token = await this.getAccessToken();
    
    if (!token) {
      throw new Error('No authentication token available');
    }
    
    const authHeader = {
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    };
    
    const response = await fetch(url, {
      ...options,
      headers: authHeader,
    });
    
    // Nếu token hết hạn (401), thử refresh token và gọi lại
    if (response.status === 401) {
      const newToken = await this.refreshAccessToken();
      
      if (newToken) {
        const newAuthHeader = {
          'Authorization': `Bearer ${newToken}`,
          ...options.headers,
        };
        
        return fetch(url, {
          ...options,
          headers: newAuthHeader,
        });
      }
    }
    
    return response;
  }
}

export default AuthService;
