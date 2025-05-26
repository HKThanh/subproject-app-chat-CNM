import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SocketService from '../services/SocketService';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

interface IncomingCallData {
  callId: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  callType: 'audio' | 'video';
  roomUrl: string;
  caller?: {
    id: string;
    fullname: string;
    urlavatar?: string;
  };
  receiver?: {
    id: string;
    fullname: string;
    urlavatar?: string;
  };
}

const IncomingCallHandler: React.FC = () => {
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const navigation = useNavigation();
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 5;
  
  const socketService = SocketService.getInstance();

  // Ensure SocketService is initialized
  useEffect(() => {
    const initializeSocket = async () => {
      try {
        console.log('=== INCOMINGCALLHANDLER: Ensuring SocketService is initialized ===');
        const initialized = await socketService.initialize();
        if (!initialized) {
          console.warn('=== INCOMINGCALLHANDLER: SocketService initialization failed ===');
        }
      } catch (error) {
        console.error('=== INCOMINGCALLHANDLER: Error initializing SocketService ===', error);
      }
    };

    initializeSocket();
  }, []);

  useEffect(() => {
    let cleanupFunction: (() => void) | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;
    let connectionCheckInterval: NodeJS.Timeout | null = null;

    const setupCallListeners = () => {
      console.log('=== INCOMINGCALLHANDLER: Attempting to setup call listeners ===');
      
      const socket = socketService.getSocket();
      
      console.log('Socket service available:', !!socketService);
      console.log('Socket available:', !!socket);
      console.log('Socket connected:', socket?.connected);
      console.log('Retry count:', retryCount);

      if (!socket || !socket.connected) {
        console.log('=== INCOMINGCALLHANDLER: No socket or not connected, retrying... ===');
        
        if (retryCount < maxRetries) {
          setRetryCount(prev => prev + 1);
          retryTimeout = setTimeout(() => {
            setupCallListeners();
          }, Math.min(1000 * Math.pow(2, retryCount), 10000)); // Exponential backoff với max 10s
        } else {
          console.log('=== INCOMINGCALLHANDLER: Max retry attempts reached ===');
        }
        return;
      }

      // Reset retry count when successfully connected
      setRetryCount(0);      // Define event handlers
      const handleIncomingCall = (data: any) => {
        console.log('=== INCOMING CALL RECEIVED IN HANDLER ===');
        console.log('Raw incoming call data:', JSON.stringify(data, null, 2));
        
        // Enhanced caller name resolution with priority order
        let callerName = 'Người dùng'; // Default fallback
        
        // Priority order for getting caller name:
        // 1. data.caller.fullname (from backend user object)
        // 2. data.callerName (from initiate_call event)
        // 3. data.senderName (legacy support)
        // 4. Use callerId as fallback if no name available
        if (data.caller && data.caller.fullname) {
          callerName = data.caller.fullname;
          console.log('Using caller.fullname:', callerName);
        } else if (data.callerName && data.callerName !== '') {
          callerName = data.callerName;
          console.log('Using callerName:', callerName);
        } else if (data.senderName && data.senderName !== '') {
          callerName = data.senderName;
          console.log('Using senderName:', callerName);
        } else if (data.callerId || data.IDCaller) {
          callerName = data.callerId || data.IDCaller; // Use ID as last resort
          console.log('Using callerId as name:', callerName);
        }
        
        const callData: IncomingCallData = {
          callId: data.callId || data.idCall,
          callerId: data.caller?.id || data.callerId || data.IDCaller,
          callerName: callerName,
          callerAvatar: data.caller?.urlavatar || data.callerAvatar || data.avatar,
          callType: data.callType || 'video',
          roomUrl: data.roomUrl,
          caller: data.caller,
          receiver: data.receiver
        };

        console.log('Processed call data:', JSON.stringify(callData, null, 2));
        setIncomingCall(callData);
        setIsVisible(true);
      };

      const handleCallEnded = (data: any) => {
        console.log('=== INCOMINGCALLHANDLER: Call ended ===', data);
        setIsVisible(false);
        setIncomingCall(null);
      };

      const handleCallMissed = (data: any) => {
        console.log('=== INCOMINGCALLHANDLER: Call missed ===', data);
        setIsVisible(false);
        setIncomingCall(null);
      };

      const handleCallTimeout = (data: any) => {
        console.log('=== INCOMINGCALLHANDLER: Call timeout ===', data);
        setIsVisible(false);
        setIncomingCall(null);
      };

      const handleCallRejected = (data: any) => {
        console.log('=== INCOMINGCALLHANDLER: Call rejected ===', data);
        setIsVisible(false);
        setIncomingCall(null);
      };

      const handleCallAccepted = (data: any) => {
        console.log('=== INCOMINGCALLHANDLER: Call accepted by me on another device ===', data);
        setIsVisible(false);
        setIncomingCall(null);
      };

      const handleCallAutoEnded = (data: any) => {
        console.log('=== INCOMINGCALLHANDLER: Call auto ended ===', data);
        setIsVisible(false);
        setIncomingCall(null);
        Alert.alert('Cuộc gọi đã kết thúc', data.message || 'Cuộc gọi đã tự động kết thúc');
      };

      // Remove existing listeners to avoid duplicates
      socket.off('incoming_call');
      socket.off('call_ended');
      socket.off('call_missed');
      socket.off('call_timeout');
      socket.off('call_rejected');
      socket.off('call_accepted');
      socket.off('call_auto_ended');

      // Register event listeners
      socket.on('incoming_call', handleIncomingCall);
      socket.on('call_ended', handleCallEnded);
      socket.on('call_missed', handleCallMissed);
      socket.on('call_timeout', handleCallTimeout);
      socket.on('call_rejected', handleCallRejected);
      socket.on('call_accepted', handleCallAccepted);
      socket.on('call_auto_ended', handleCallAutoEnded);

      console.log('=== INCOMINGCALLHANDLER: Call listeners setup completed successfully ===');

      // Return cleanup function
      cleanupFunction = () => {
        console.log('=== INCOMINGCALLHANDLER: Cleaning up listeners ===');
        socket.off('incoming_call', handleIncomingCall);
        socket.off('call_ended', handleCallEnded);
        socket.off('call_missed', handleCallMissed);
        socket.off('call_timeout', handleCallTimeout);
        socket.off('call_rejected', handleCallRejected);
        socket.off('call_accepted', handleCallAccepted);
        socket.off('call_auto_ended', handleCallAutoEnded);
      };
    };

    // Start initial setup
    setupCallListeners();

    // Set up periodic connection check every 30 seconds
    connectionCheckInterval = setInterval(() => {
      if (!socketService.isConnected()) {
        console.log('=== INCOMINGCALLHANDLER: Periodic check - socket disconnected, ensuring connection ===');
        
        // Retry setting up listeners if socket was disconnected
        if (retryCount < maxRetries) {
          setupCallListeners();
        }
      }
    }, 30000); // Check every 30 seconds

    // Cleanup function
    return () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      if (connectionCheckInterval) {
        clearInterval(connectionCheckInterval);
      }
      if (cleanupFunction) {
        cleanupFunction();
      }
    };
  }, [retryCount]);
  // Chấp nhận cuộc gọi
  const acceptCall = () => {
    if (!incomingCall) {
      console.log('=== INCOMINGCALLHANDLER: No incoming call to accept ===');
      return;
    }

    const socket = socketService.getSocket();
    const userData = socketService.getUserData();

    console.log('=== ACCEPTCALL: Debug info ===');
    console.log('Socket available:', !!socket);
    console.log('Socket connected:', socket?.connected);
    console.log('UserData available:', !!userData);
    console.log('UserData:', userData);

    if (!socket || !userData || !userData.id) {
      console.error('=== ACCEPTCALL: Missing required data ===', { 
        hasSocket: !!socket, 
        hasUserData: !!userData, 
        hasUserId: !!userData?.id 
      });
      Alert.alert('Lỗi', 'Không thể kết nối. Vui lòng thử lại.');
      return;
    }

    // Gửi signal chấp nhận cuộc gọi theo format backend
    socketService.acceptCall({
      callId: incomingCall.callId,
      callerId: incomingCall.callerId,
      receiverId: userData.id,
      roomUrl: incomingCall.roomUrl
    });// Ẩn modal và chuyển sang CallScreen
    setIsVisible(false);
    setIncomingCall(null);

    // Navigate to CallScreen - backend đã tạo room URL sẵn
    if (navigation && incomingCall.roomUrl) {
      // Get proper user name with fallbacks
      const currentUserName = userData.fullname || 'Tôi';
      
      console.log('=== ACCEPTCALL: Navigating to CallScreen ===');
      console.log('Room URL from backend:', incomingCall.roomUrl);
      console.log('Current user name:', currentUserName);
      console.log('Caller name:', incomingCall.callerName);
      
      (navigation as any).navigate('CallScreen', {
        url: incomingCall.roomUrl,
        userName: currentUserName,
        otherUserName: incomingCall.callerName,
        callId: incomingCall.callId,
        callType: incomingCall.callType,
        isIncoming: true
      });
    }
  };
  // Từ chối cuộc gọi
  const rejectCall = () => {
    if (!incomingCall) {
      console.log('=== INCOMINGCALLHANDLER: No incoming call to reject ===');
      return;
    }

    const socket = socketService.getSocket();
    const userData = socketService.getUserData();

    console.log('=== REJECTCALL: Debug info ===');
    console.log('Socket available:', !!socket);
    console.log('Socket connected:', socket?.connected);
    console.log('UserData available:', !!userData);
    console.log('UserData:', userData);

    if (!socket || !userData || !userData.id) {
      console.error('=== REJECTCALL: Missing required data ===', { 
        hasSocket: !!socket, 
        hasUserData: !!userData, 
        hasUserId: !!userData?.id 
      });
      Alert.alert('Lỗi', 'Không thể kết nối. Vui lòng thử lại.');
      return;
    }

    // Gửi signal từ chối cuộc gọi - phải theo đúng format backend
    socketService.rejectCall({
      callId: incomingCall.callId,
      userId: userData.id
    });

    // Ẩn modal
    setIsVisible(false);
    setIncomingCall(null);
  };

  if (!isVisible || !incomingCall) {
    return null;
  }

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}}
    >
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.8)" />
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
          <View style={styles.callInfo}>
            <Text style={styles.callerName}>{incomingCall.callerName}</Text>
            <Text style={styles.callStatus}>
              {incomingCall.callType === 'video' ? 'Cuộc gọi video' : 'Cuộc gọi thoại'}
            </Text>
            
            {incomingCall.callerAvatar ? (
              <Image
                source={{ uri: incomingCall.callerAvatar }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatar, styles.defaultAvatar]}>
                <Ionicons name="person" size={60} color="#fff" />
              </View>
            )}
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.rejectButton} onPress={rejectCall}>
              <Ionicons name="call" size={30} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.acceptButton} onPress={acceptCall}>
              <Ionicons name="call" size={30} color="#fff" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 50,
  },
  callInfo: {
    alignItems: 'center',
    marginTop: 50,
  },
  callerName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  callStatus: {
    fontSize: 18,
    color: '#ccc',
    marginBottom: 30,
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginTop: 20,
  },
  defaultAvatar: {
    backgroundColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: width * 0.6,
    marginBottom: 50,
  },
  acceptButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  rejectButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

export default IncomingCallHandler;
