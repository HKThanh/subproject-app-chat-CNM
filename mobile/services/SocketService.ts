import io, { Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import AuthService, { UserData } from './AuthService';

// Socket.IO server URL
const SOCKET_URL = 'ws://192.168.0.104:3000';

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

  // Các biến thành viên để quản lý listeners cho cuộc gọi video
  private videoCallInviteListeners: Array<(data: any) => void> = [];
  private videoCallResponseListeners: Array<(data: any) => void> = [];
  
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
      
      // Initialize call features
      this.initializeCallFeatures();
      
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

    // Additional backend events for proper call flow
    this.socket.on('call_accepted_confirmed', (data: any) => {
      console.log('Received call_accepted_confirmed from backend:', data);
      // Handle accepted confirmation for receiver
    });
    
    this.socket.on('call_rejected_confirmed', (data: any) => {
      console.log('Received call_rejected_confirmed from backend:', data);
      // Handle rejected confirmation for receiver
    });
    
    this.socket.on('call_ended_confirmed', (data: any) => {
      console.log('Received call_ended_confirmed from backend:', data);
      // Handle end call confirmation
    });
    
    this.socket.on('call_error', (data: any) => {
      console.log('Received call_error from backend:', data);
      Alert.alert('Lỗi cuộc gọi', data.message || 'Có lỗi xảy ra trong cuộc gọi');
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
  
  // Initialize call features
  public initializeCallFeatures(): void {
    if (!this.socket) return;
    
    // Pre-offer for direct calls
    this.socket.on('pre-offer-single', (data: any) => {
      console.log('Received pre-offer-single:', data);
      // This event will be handled by call screen
    });
    
    // Pre-offer answer for direct calls
    this.socket.on('pre-offer-single-answer', (data: any) => {
      console.log('Received pre-offer-single-answer:', data);
      // This event will be handled by call screen
    });
    
    // WebRTC signaling
    this.socket.on('webRTC-signaling', (data: any) => {
      console.log('Received webRTC-signaling:', data);
      // This event will be handled by call screen
    });
    
    // End call
    this.socket.on('end-call', (data: any) => {
      console.log('Received end-call:', data);
      // This event will be handled by call screen
    });
      // Video call invitation - sử dụng event từ backend
    this.socket.on('incoming_call', (data: any) => {
      console.log('Received incoming_call from backend:', data);
      // Emit event cho các listener sử dụng
      this.emitVideoCallInvite(data);
    });
    
    // Video call response events from backend
    this.socket.on('call_accepted', (data: any) => {
      console.log('Received call_accepted from backend:', data);
      this.emitVideoCallResponse({ ...data, accepted: true });
    });
    
    this.socket.on('call_rejected', (data: any) => {
      console.log('Received call_rejected from backend:', data);
      this.emitVideoCallResponse({ ...data, accepted: false });
    });
    
    this.socket.on('call_ended', (data: any) => {
      console.log('Received call_ended from backend:', data);
      // Handle call ended event
    });
    
    this.socket.on('call_missed', (data: any) => {
      console.log('Received call_missed from backend:', data);
      // Handle call missed event
    });
    
    this.socket.on('call_timeout', (data: any) => {
      console.log('Received call_timeout from backend:', data);
      // Handle call timeout event
    });
    
    this.socket.on('call_auto_ended', (data: any) => {
      console.log('Received call_auto_ended from backend:', data);
      // Handle auto end event
    });
    
    // Legacy video call events (keep for backward compatibility)
    this.socket.on('video_call_invite', (data: any) => {
      console.log('Received video call invitation (legacy):', data);
      // Emit event cho các listener sử dụng
      this.emitVideoCallInvite(data);
    });
    
    // Video call response
    this.socket.on('video_call_response', (data: any) => {
      console.log('Received video call response (legacy):', data);
      // Emit event cho các listeners
      this.emitVideoCallResponse(data);
    });
  }
  
  // Check online status for multiple users
  public checkUsersStatus(userIds: string[]): void {
    if (this.socket && this.socket.connected && userIds.length > 0) {
      this.socket.emit('check_users_status', { userIds });
    }
  }
    // ===== Video Call Methods =====
  
  // Thêm listener cho video call invite
  public addVideoCallInviteListener(listener: (data: any) => void): void {
    this.videoCallInviteListeners.push(listener);
  }
  
  // Xóa listener cho video call invite
  public removeVideoCallInviteListener(listener: (data: any) => void): void {
    this.videoCallInviteListeners = this.videoCallInviteListeners.filter(l => l !== listener);
  }
  
  // Gửi sự kiện video call invite đến tất cả listeners
  private emitVideoCallInvite(data: any): void {
    this.videoCallInviteListeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('Error in video call invite listener:', error);
      }
    });
  }
  
  // Thêm listener cho video call response
  public addVideoCallResponseListener(listener: (data: any) => void): void {
    this.videoCallResponseListeners.push(listener);
  }
  
  // Xóa listener cho video call response
  public removeVideoCallResponseListener(listener: (data: any) => void): void {
    this.videoCallResponseListeners = this.videoCallResponseListeners.filter(l => l !== listener);
  }
  
  // Gửi sự kiện video call response đến tất cả listeners
  private emitVideoCallResponse(data: any): void {
    this.videoCallResponseListeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('Error in video call response listener:', error);
      }
    });
  }
  // ===== Backend CallController Integration =====
    // Khởi tạo cuộc gọi - gửi đến backend CallController
  public initiateCall(callData: {
    callerId: string;
    receiverId: string;
    callType: 'video' | 'audio';
    roomUrl?: string;
    caller?: any;
    receiver?: any;
  }): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.socket && this.socket.connected) {
        console.log('Initiating call to backend:', callData);        // Set up one-time listener for the response
        const responseHandler = (response: any) => {
          console.log('Received call initiated response:', response);
          this.socket?.off('call_initiated', responseHandler);
          
          if (response.success) {
            resolve(response);
          } else {
            reject(new Error(response.message || 'Failed to initiate call'));
          }
        };
        
        this.socket.on('call_initiated', responseHandler);
        
        // Set timeout for response
        setTimeout(() => {
          this.socket?.off('call_initiated', responseHandler);
          reject(new Error('Call initiation timeout'));
        }, 10000);
        
        // Emit call initiation using backend format
        this.socket.emit('initiate_call', {
          IDCaller: callData.callerId,
          IDReceiver: callData.receiverId,
          callType: callData.callType
        });
      } else {
        console.error('Cannot initiate call: Socket not connected');
        reject(new Error('Socket not connected'));
      }
    });
  }
    // Chấp nhận cuộc gọi - gửi đến backend CallController
  public acceptCall(callData: {
    callId: string;
    callerId?: string;
    receiverId?: string;
    roomUrl?: string;
  }): void {
    if (this.socket && this.socket.connected) {
      console.log('Accepting call in backend:', callData);
      
      // Chuyển đổi tham số theo format backend mong đợi
      this.socket.emit('accept_call', {
        callId: callData.callId,
        userId: callData.receiverId || this.userData?.id
      });
    } else {
      console.error('Cannot accept call: Socket not connected');
    }
  }
    // Từ chối cuộc gọi - gửi đến backend CallController
  public rejectCall(callData: {
    callId: string;
    callerId?: string;
    receiverId?: string;
    userId?: string;
    reason?: string;
  }): void {
    if (this.socket && this.socket.connected) {
      console.log('Rejecting call in backend:', callData);
      
      // Chuyển đổi tham số theo format backend mong đợi
      this.socket.emit('reject_call', {
        callId: callData.callId,
        userId: callData.userId || callData.receiverId || this.userData?.id
      });
    } else {
      console.error('Cannot reject call: Socket not connected');
    }
  }
    // Kết thúc cuộc gọi - gửi đến backend CallController
  public endCall(callData: {
    callId: string;
    callerId?: string;
    receiverId?: string;
    userId?: string;
    duration?: number;
    reason?: string;
  }): void {
    if (this.socket && this.socket.connected) {
      console.log('Ending call in backend:', callData);
      
      // Chuyển đổi tham số theo format backend mong đợi
      this.socket.emit('end_call', {
        callId: callData.callId,
        userId: callData.userId || callData.callerId || callData.receiverId || this.userData?.id,
        reason: callData.reason || 'normal'
      });
    } else {
      console.error('Cannot end call: Socket not connected');
    }
  }

  // ===== Legacy Support =====
  
  // Gửi phản hồi cuộc gọi (legacy)
  public sendVideoCallResponse(response: {
    senderId: string;
    receiverId: string;
    accepted: boolean;
    roomUrl?: string;
  }): void {
    if (this.socket && this.socket.connected) {
      console.log('Sending video call response (legacy):', response);
      this.socket.emit('video_call_response', response);
    } else {
      console.error('Cannot send video call response: Socket not connected');
    }
  }
}

export default SocketService;
