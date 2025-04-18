// filepath: c:\Users\MINHTHUAT\Desktop\zaloapp\mobile\hooks\useAuthInit.ts
import { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import AuthService from '../services/AuthService';
import SocketService from '../services/SocketService';

/**
 * Custom hook to manage authentication and socket initialization
 * Ensures that token is loaded and socket is connected before allowing protected actions
 * 
 * @param {boolean} redirectToLogin - Whether to redirect to login if not authenticated
 * @returns {object} Auth state containing isLoading, isAuthenticated, and initComplete flags
 */
export const useAuthInit = (redirectToLogin = true) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [initComplete, setInitComplete] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      try {
        // Lấy các instance của service
        const authService = AuthService.getInstance();
        const socketService = SocketService.getInstance();
        
        // Đảm bảo AuthService đã tải xong token
        console.log('Waiting for AuthService to be ready...');
        await authService.waitForReady();
        
        // Kiểm tra xác thực
        console.log('Checking authentication status...');
        const isUserAuthenticated = await authService.isAuthenticated();
        setIsAuthenticated(isUserAuthenticated);
        
        if (isUserAuthenticated) {
          console.log('User is authenticated, initializing socket...');
          // Nếu đã xác thực, khởi tạo socket
          const socketInitialized = await socketService.initialize();
          
          console.log('Socket initialization result:', socketInitialized);
          
          if (!socketInitialized) {
            console.warn('Socket initialized but not connected. Will retry automatically.');
          }
        } else if (redirectToLogin) {
          console.log('User not authenticated, redirecting to login...');
          // Nếu yêu cầu chuyển hướng và không xác thực
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' as never }],
          });
        }
      } catch (error) {
        console.error('Error during authentication initialization:', error);
        setIsAuthenticated(false);
        
        if (redirectToLogin) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' as never }],
          });
        }
      } finally {
        setIsLoading(false);
        setInitComplete(true);
      }
    };

    initializeAuth();
  }, [navigation, redirectToLogin]);

  return { isLoading, isAuthenticated, initComplete };
};

/**
 * Custom hook to safely use socket after ensuring authentication
 * 
 * @returns Socket object and connection state
 */
export const useSafeSocket = () => {
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const { isLoading, isAuthenticated, initComplete } = useAuthInit(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      const socketService = SocketService.getInstance();
      const socket = socketService.getSocket();
      
      setIsSocketConnected(socketService.isConnected());
      
      // Đăng ký listener để cập nhật trạng thái kết nối
      const handleConnectionChange = (connected: boolean) => {
        setIsSocketConnected(connected);
      };
      
      socketService.addConnectionListener(handleConnectionChange);
      
      return () => {
        socketService.removeConnectionListener(handleConnectionChange);
      };
    }
  }, [isLoading, isAuthenticated, initComplete]);

  const getSocket = () => {
    if (isAuthenticated && !isLoading) {
      return SocketService.getInstance().getSocket();
    }
    return null;
  };

  return { 
    socket: getSocket(),
    isConnected: isSocketConnected,
    isLoading,
    isAuthenticated,
    initComplete
  };
};

export default useAuthInit;
