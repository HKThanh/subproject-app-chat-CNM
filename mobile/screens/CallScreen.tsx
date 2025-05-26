import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  TouchableOpacity,
  Text,
  SafeAreaView,
  StatusBar,
  BackHandler,
  Alert,
  Dimensions
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import SocketService from '../services/SocketService';

// Get device dimensions
const { width, height } = Dimensions.get('window');

// Define props type
type CallScreenProps = {
  navigation: any;
  route: {
    params: {
      url: string;
      userName: string;
      otherUserName: string;
      callerId?: string;
      receiverId?: string;
      callId?: string;
      callType?: string;
      isIncoming?: boolean;
    };
  };
};

const CallScreen: React.FC<CallScreenProps> = ({ navigation, route }) => {
  const { url, userName, otherUserName, callerId, receiverId, callId, callType, isIncoming } = route.params;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const webViewRef = useRef<WebView>(null);
  const socketService = SocketService.getInstance();
  const endCallTimeoutRef = useRef<NodeJS.Timeout | null>(null);  // Construct URL with proper user name parameter
  const constructCallUrl = () => {
    const userData = socketService.getUserData();
    const currentUserName = userData?.fullname || userName || 'Unknown User';
    
    // Add name parameter to URL for proper display in Daily.co
    const separator = url.includes('?') ? '&' : '?';
    const finalUrl = `${url}${separator}name=${encodeURIComponent(currentUserName)}`;
    
    //console.log('CallScreen - Original URL:', url);
    //console.log('CallScreen - User name for display:', currentUserName);
    //console.log('CallScreen - Final URL with name:', finalUrl);
    
    return finalUrl;
  };

  const finalUrl = constructCallUrl();
  
  // Function to end call through backend
  const endCall = () => {
    try {
      const userData = socketService.getUserData();
      if (userData && callId) {
        // Use callId if available (from call initiation)
        socketService.endCall({
          callId: callId,
          userId: userData.id,
          reason: 'normal'
        });
      } else if (userData && (callerId || receiverId)) {
        // Fallback to old method if callId not available
        const otherUserId = callerId === userData.id ? receiverId : callerId;
        
        if (otherUserId) {
          socketService.endCall({
            callId: callId || '', // Empty callId as fallback
            userId: userData.id,
            reason: 'normal'
          });
        }
      }
      // Set a timeout fallback in case backend doesn't respond
      endCallTimeoutRef.current = setTimeout(() => {
        //console.log('End call timeout - navigating back as fallback');
        navigation.goBack();
      }, 5000); // 5 second timeout
      
    } catch (error) {
      console.error('Error ending call:', error);
      // If error, still navigate back as fallback
      navigation.goBack();
    }
    
    // DON'T navigate back immediately - wait for backend confirmation
    // The navigation will be handled by call_ended event listener
  };

  // Handle back button to confirm before exiting call
  useEffect(() => {
    const backAction = () => {
      Alert.alert(
        'Kết thúc cuộc gọi',
        'Bạn có chắc muốn kết thúc cuộc gọi này?',
        [
          { text: 'Hủy', style: 'cancel', onPress: () => {} },
          { text: 'Kết thúc', style: 'destructive', onPress: endCall }
        ]
      );
      return true; // Prevent default back behavior
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [navigation]);

  // Listen for call events from backend
  useEffect(() => {
    const socket = socketService.getSocket();
    
    if (!socket) {
      //console.log('No socket available for call events');
      return;
    }    // Handler for call ended by backend
    const handleCallEnded = (data: any) => {
      //console.log('Call ended event received:', data);
      // Clear timeout since backend responded
      if (endCallTimeoutRef.current) {
        clearTimeout(endCallTimeoutRef.current);
        endCallTimeoutRef.current = null;
      }
      // Navigate back when call is ended by backend
      navigation.goBack();
    };

    // Handler for call ended confirmation
    const handleCallEndedConfirmed = (data: any) => {
      //console.log('Call ended confirmed event received:', data);
      // Clear timeout since backend responded
      if (endCallTimeoutRef.current) {
        clearTimeout(endCallTimeoutRef.current);
        endCallTimeoutRef.current = null;
      }
      // Navigate back when our end call is confirmed
      navigation.goBack();
    };

    // Handler for auto-ended calls
    const handleCallAutoEnded = (data: any) => {
      //console.log('Call auto ended event received:', data);
      // Clear timeout since backend responded
      if (endCallTimeoutRef.current) {
        clearTimeout(endCallTimeoutRef.current);
        endCallTimeoutRef.current = null;
      }
      Alert.alert(
        'Cuộc gọi đã kết thúc',
        data.message || 'Cuộc gọi đã tự động kết thúc',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    };

    // Register event listeners
    socket.on('call_ended', handleCallEnded);
    socket.on('call_ended_confirmed', handleCallEndedConfirmed);
    socket.on('call_auto_ended', handleCallAutoEnded);    // Cleanup listeners on unmount
    return () => {
      // Clear any pending timeout
      if (endCallTimeoutRef.current) {
        clearTimeout(endCallTimeoutRef.current);
        endCallTimeoutRef.current = null;
      }
      
      socket.off('call_ended', handleCallEnded);
      socket.off('call_ended_confirmed', handleCallEndedConfirmed);
      socket.off('call_auto_ended', handleCallAutoEnded);
    };
  }, [navigation, socketService]);

  // Handle WebView loading
  const handleLoadStart = () => {
    setIsLoading(true);
    setError(null);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setError('Không thể kết nối đến phòng họp. Vui lòng kiểm tra kết nối mạng và thử lại.');
  };
  // Handle manual exit call
  const handleExitCall = () => {
    Alert.alert(
      'Kết thúc cuộc gọi',
      'Bạn có chắc muốn kết thúc cuộc gọi này?',
      [
        { text: 'Hủy', style: 'cancel', onPress: () => {} },
        { text: 'Kết thúc', style: 'destructive', onPress: endCall }
      ]
    );
  };

  // JavaScript to inject into WebView to handle call events
  const injectedJavaScript = `
    // Log to console for debugging
    console.log("Daily.co WebView script loaded");
    
    // Function to check if Daily.co is loaded
    function checkDailyLoaded() {
      if (window.DailyIframe) {
        console.log("Daily.co iframe detected");
        setupDailyEvents();
      } else {
        console.log("Daily.co iframe not detected yet, waiting...");
        setTimeout(checkDailyLoaded, 1000);
      }
    }
    
    // Function to set up Daily.co event handlers
    function setupDailyEvents() {
      try {
        console.log("Setting up Daily.co event handlers");
        
        // Sometimes Daily.co might put the iframe on the page with different ID or structure
        const dailyIframe = document.querySelector('iframe[allow*="camera"]') || 
                           document.getElementById('daily-iframe') ||
                           document.querySelector('iframe');
        
        if (dailyIframe) {
          console.log("Found Daily iframe element:", dailyIframe.id || "unnamed iframe");
          const callFrame = window.DailyIframe.wrap(dailyIframe);
          
          callFrame.on('joined-meeting', (event) => {
            console.log("Joined meeting event:", event);
            window.ReactNativeWebView.postMessage(JSON.stringify({
              event: 'joined-meeting',
              data: event
            }));
          });
          
          callFrame.on('left-meeting', (event) => {
            console.log("Left meeting event:", event);
            window.ReactNativeWebView.postMessage(JSON.stringify({
              event: 'left-meeting',
              data: event
            }));
          });
          
          callFrame.on('error', (error) => {
            console.log("Error event:", error);
            window.ReactNativeWebView.postMessage(JSON.stringify({
              event: 'error',
              error: error
            }));
          });
          
          // Join the call automatically if needed
          callFrame.join();
        } else {
          console.error("No Daily.co iframe found on the page");
          window.ReactNativeWebView.postMessage(JSON.stringify({
            event: 'error',
            error: { message: 'No Daily.co iframe found on the page' }
          }));
        }
      } catch (e) {
        console.error("Error setting up Daily.co events:", e);
        window.ReactNativeWebView.postMessage(JSON.stringify({
          event: 'error',
          error: { message: 'Error setting up Daily.co: ' + e.message }
        }));
      }
    }
    
    // Send debug logs to React Native
    const originalConsoleLog = console.log;
    console.log = function(...args) {
      originalConsoleLog.apply(console, args);
      window.ReactNativeWebView.postMessage(JSON.stringify({
        event: 'console-log',
        data: args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ')
      }));
    };
    
    // Start checking for Daily.co when the page loads
    window.addEventListener('load', function() {
      console.log("Page loaded, checking for Daily.co");
      checkDailyLoaded();
      
      // Notify React Native that the page has loaded
      window.ReactNativeWebView.postMessage(JSON.stringify({
        event: 'page-loaded'
      }));
    });
    
    // Start checking even before page fully loads
    checkDailyLoaded();
    
    true;
  `;

  // Handle messages from WebView
  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      // Log all messages for debugging
      //console.log("Message from WebView:", data);
      
      if (data.event === 'console-log') {
        //console.log("WebView log:", data.data);
      } else if (data.event === 'joined-meeting') {
        //console.log("Successfully joined the meeting");
        setIsLoading(false);      } else if (data.event === 'left-meeting' || data.event === 'call-ended') {
        //console.log("Call ended or left meeting in WebView");
        // Don't navigate directly - let backend handle the synchronization
        endCall();
      } else if (data.event === 'error') {
        console.error("Error in Daily.co:", data.error);
        setError('Lỗi cuộc gọi: ' + (data.error?.message || 'Không xác định'));
      } else if (data.event === 'page-loaded') {
        //console.log("WebView page loaded");
      }
    } catch (e) {
      //console.log('Error handling WebView message', e);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Call header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isLoading ? 'Đang kết nối...' : `Đang gọi với ${otherUserName}`}
        </Text>
        <TouchableOpacity style={styles.endCallButton} onPress={handleExitCall}>
          <Ionicons name="call" size={24} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
        </TouchableOpacity>
      </View>
      
      {/* Error display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setError(null);
              setIsLoading(true);
              webViewRef.current?.reload();
            }}
          >
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1FAEEB" />
          <Text style={styles.loadingText}>Đang kết nối đến phòng họp...</Text>
        </View>
      )} 
             {/* Daily.co WebView */}
      {!error && (
        <WebView
          ref={webViewRef}
          source={{ uri: finalUrl }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          allowsFullscreenVideo={true}
          originWhitelist={['*']}
          cacheEnabled={false}
          injectedJavaScript={injectedJavaScript}
          onMessage={handleMessage}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
          onHttpError={(event) => {
            console.error("WebView HTTP error:", event.nativeEvent);
            handleError();
          }}
          startInLoadingState={true}
          javaScriptCanOpenWindowsAutomatically={true}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  endCallButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webview: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    zIndex: 5,
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1FAEEB',
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  fallbackTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 20,
    marginBottom: 10,
  },
  fallbackText: {
    fontSize: 16,
    color: '#AAAAAA',
    textAlign: 'center',
    marginBottom: 10,
  },
  fallbackButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#1FAEEB',
    borderRadius: 5,
  },
  fallbackButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  debugButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 8,
    borderRadius: 5,
    zIndex: 999,
  },
  debugButtonText: {
    color: '#FFF',
    fontSize: 12,
  },
});

export default CallScreen;