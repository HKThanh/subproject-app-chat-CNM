import io, { Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService, { UserData } from './AuthService';

// Socket.IO server URL
const SOCKET_URL = 'http://192.168.1.9:3000';

// Keys for AsyncStorage
const USER_DATA_KEY = 'user_data';

// Interface for connection response
export interface ConnectionResponse {
  message: string;
  socketId: string;
}

class SocketService {
  private static instance: SocketService;
  private socket: Socket | null = null;
  private userData: UserData | null = null;
  private socketId: string | null = null;
  private connectionListeners: Array<(connected: boolean) => void> = [];
  
  // Flag để theo dõi quá trình khởi tạo
  private isInitializing: boolean = false;
  private initPromise: Promise<boolean> | null = null;

  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  // Initialize socket connection với promise để theo dõi tiến trình
  public initialize(): Promise<boolean> {
    // Nếu đang khởi tạo, trả về promise hiện tại
    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }
    
    // Tạo promise mới để theo dõi quá trình khởi tạo
    this.isInitializing = true;
    this.initPromise = this.initializeInternal();
    
    // Khi quá trình hoàn tất, cập nhật trạng thái
    this.initPromise.finally(() => {
      this.isInitializing = false;
    });
    
    return this.initPromise;
  }

  // Quy trình khởi tạo nội bộ
  private async initializeInternal(): Promise<boolean> {
    try {
      console.log('Starting SocketService initialization...');
      
      // Đợi AuthService sẵn sàng trước
      const authService = AuthService.getInstance();
      await authService.waitForReady();
      
      // Lấy user data từ AuthService
      this.userData = authService.getUserData();
      
      // Nếu không có user data, thử tải từ AsyncStorage
      if (!this.userData) {
        console.log('No user data from AuthService, trying to load from storage...');
        await this.loadUserData();
      }
      
      // Kiểm tra xác thực trước khi tiếp tục
      const isAuthenticated = await authService.isAuthenticated();
      
      if (!isAuthenticated) {
        console.warn('User is not authenticated, cannot initialize socket');
        return false;
      }
      
      if (!this.userData) {
        console.warn('Cannot initialize socket: No user data available after authentication check');
        return false;
      }
      
      // Tất cả điều kiện đã thỏa mãn, tiến hành kết nối socket
      console.log('Authentication verified, connecting socket...');
      this.connectSocket();
      
      return true;
    } catch (error) {
      console.error('Error during socket service initialization:', error);
      return false;
    }
  }

  // Connect to socket server
  public connectSocket(): void {
    if (!this.userData) {
      console.warn('Cannot connect socket: No user data available');
      return;
    }
    
    if (this.socket && this.socket.connected) {
      console.log('Socket already connected');
      return;
    }
    
    // Create socket connection with auth token
    AuthService.getInstance().getAccessToken().then(token => {
      if (!token) {
        console.error('Cannot connect socket: No auth token available');
        return;
      }
      
      console.log('Connecting socket with authentication...');
      
      // Tạo kết nối socket với token xác thực
      this.socket = io(SOCKET_URL, {
        auth: {
          token
        },
        transports: ['websocket'],
        forceNew: true
      });
      
      // Thiết lập các event handler
      this.setupEventHandlers();
    });
  }

  // Setup socket event handlers
  private setupEventHandlers(): void {
    if (!this.socket) return;
    
    this.socket.on('connect', () => {
      console.log('Socket connected');
      
      // Emit new_user_connect event when socket connects
      if (this.userData) {
        this.socket?.emit('new_user_connect', { id: this.userData.id });
        console.log('Sent new_user_connect with ID:', this.userData.id);
      }
      
      // Notify listeners of connection status change
      this.notifyConnectionListeners(true);
    });
    
    this.socket.on('connection_success', (data: ConnectionResponse) => {
      console.log('Connection successful:', data);
      this.socketId = data.socketId;
    });
    
    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.notifyConnectionListeners(false);
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.notifyConnectionListeners(false);
      
      // Kiểm tra lại xác thực nếu có lỗi kết nối
      AuthService.getInstance().getAccessToken().then(token => {
        if (token && this.socket) {
          console.log('Reconnecting with new token...');
          // Cập nhật token xác thực cho lần kết nối tiếp theo
          this.socket.auth = { token };
        }
      });
    });
  }

  // Set user data after successful login
  public async setUserData(userData: UserData): Promise<void> {
    this.userData = userData;
    
    // Save user data to AsyncStorage
    try {
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
      console.log('User data saved to storage from SocketService');
    } catch (error) {
      console.error('Error saving user data:', error);
    }
    
    // Connect socket if not already connected
    if (!this.socket || !this.socket.connected) {
      this.connectSocket();
    } else if (this.socket.connected && this.userData) {
      // If already connected, send new_user_connect event
      this.socket.emit('new_user_connect', { id: this.userData.id });
    }
  }

  // Load user data from AsyncStorage
  public async loadUserData(): Promise<UserData | null> {
    try {
      const userDataString = await AsyncStorage.getItem(USER_DATA_KEY);
      if (userDataString) {
        this.userData = JSON.parse(userDataString);
        return this.userData;
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
    
    return null;
  }
  
  // Emit user offline status before logout
  public async emitUserOffline(): Promise<void> {
    if (this.socket && this.userData) {
      console.log('Emitting user_offline event for user:', this.userData.id);
      this.socket.emit('user_offline', { userId: this.userData.id });
      
      // Wait a moment for the event to be sent
      return new Promise((resolve) => {
        setTimeout(resolve, 300);
      });
    }
    return Promise.resolve();
  }

  // Clear user data on logout
  public async logout(): Promise<void> {
    // First emit user_offline event if possible
    await this.emitUserOffline();
    
    // Then disconnect socket
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    // Clear user data
    this.userData = null;
    this.socketId = null;
    
    // Remove from AsyncStorage
    try {
      await AsyncStorage.removeItem(USER_DATA_KEY);
      console.log('User data removed from storage');
    } catch (error) {
      console.error('Error removing user data:', error);
    }
  }

  // Get the socket instance
  public getSocket(): Socket | null {
    return this.socket;
  }

  // Get the current user data
  public getUserData(): UserData | null {
    return this.userData;
  }

  // Get the socket ID
  public getSocketId(): string | null {
    return this.socketId;
  }
  
  // Check if socket is connected
  public isConnected(): boolean {
    return this.socket !== null && this.socket.connected;
  }

  // Add a connection listener
  public addConnectionListener(listener: (connected: boolean) => void): void {
    this.connectionListeners.push(listener);
  }

  // Remove a connection listener
  public removeConnectionListener(listener: (connected: boolean) => void): void {
    this.connectionListeners = this.connectionListeners.filter(l => l !== listener);
  }

  // Notify all connection listeners
  private notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach(listener => {
      try {
        listener(connected);
      } catch (error) {
        console.error('Error in connection listener:', error);
      }
    });
  }
  
  // Check online status for multiple users
  public checkUsersStatus(userIds: string[]): void {
    if (this.socket && this.socket.connected && userIds.length > 0) {
      this.socket.emit('check_users_status', { userIds });
    }
  }
}

export default SocketService;
