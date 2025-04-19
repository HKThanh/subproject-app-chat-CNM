import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  RefreshControl,
  Image,
  TextInput,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FooterComponent from '../components/FooterComponent';
import io from 'socket.io-client';
import SocketService from '../services/SocketService';

// Socket.IO server URL
const SOCKET_URL = 'http://192.168.1.9:3000';

// Global state for persisting conversations between screen navigations
if (!global.socketInstance) {
  global.socketInstance = null;
}

if (!global.conversations) {
  global.conversations = [];
}

// Interface for conversation data from socket
interface ConversationItem {
  _id: string;
  idConversation: string;
  idSender: string;
  isGroup: boolean;
  idReceiver: string;
  isBlock: boolean;
  groupMembers: any[];
  listImage: any[];
  listFile: any[];
  lastChange: string;
  createdAt: string;
  updatedAt: string;
  idNewestMessage?: string;
  rules: {
    listIDCoOwner: string[];
  };
}

// Interface for unread messages
interface UnreadMessage {
  _id: string;
  idMessage: string;
  idSender: string;
  idReceiver: string;
  idConversation: string;
  type: string;
  content: string;
  dateTime: string;
  isRead: boolean;
  isRecall: boolean;
  isReply: boolean;
  isForward: boolean;
  isRemove: boolean;
  idMessageReply: string | null;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

// Interface for search results
interface SearchUserResult {
  id: string;
  fullname: string;
  email: string;
  phone: string;
  urlavatar: string;
}

// Interface for search response
interface SearchResponse {
  code: number;
  message: string;
  data?: SearchUserResult[];
}

// Interface for create conversation response
interface CreateConversationResponse {
  success: boolean;
  conversation: ConversationItem;
  message: string;
}

// Interface for connection success response
interface ConnectionResponse {
  message: string;
  socketId: string;
}

// Interface for user status response
interface UserStatusResponse {
  statuses: {
    [userId: string]: boolean;
  }
}

// Placeholder avatar images
const avatarPlaceholders = [
  require('../assets/Welo_image.png'), // Use placeholder until we have real assets
  require('../assets/Welo_image.png'),
  require('../assets/Welo_image.png'),
  require('../assets/Welo_image.png'),
  require('../assets/Welo_image.png')
];

type HomeScreenProps = {
  navigation?: any;
};

interface ChatItem {
  id: string;
  name: string;
  message: string;
  time: string;
  avatar?: any;
  isOnline?: boolean;
  isPinned?: boolean;
}

const HomeScreen = ({ navigation, route }: HomeScreenProps) => {
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUserResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [socket, setSocket] = useState<any>(null);
  const [unreadMessages, setUnreadMessages] = useState<UnreadMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<{ [userId: string]: boolean }>({});
  const [refreshing, setRefreshing] = useState(false);
  // Get user data from route params or SocketService if route params are not available
  const [userData, setUserData] = useState(route?.params?.user);
  const [userId, setUserId] = useState(route?.params?.user?.id);

  // Load user data from SocketService if not available in route params
  useEffect(() => {
    const loadUser = async () => {
      if (!userData || !userId) {
        const socketService = SocketService.getInstance();
        const savedUserData = await socketService.loadUserData();

        if (savedUserData) {
          console.log('Loaded user data from SocketService:', savedUserData.id);
          setUserData(savedUserData);
          setUserId(savedUserData.id);
        } else {
          console.warn('No user data available in SocketService');
        }
      }
    };

    loadUser();
  }, []);

  // Handle search input with debounce of 3 seconds
  const handleSearchInput = (text: string) => {
    setSearchText(text);

    // Clear any existing timer
    if (searchTimer) {
      clearTimeout(searchTimer);
    }

    if (text.trim() === '') {
      setShowSearchResults(false);
      setSearchResults([]);
      return;
    }

    // Set a new timer for 3 seconds
    const timer = setTimeout(() => {
      searchUsers(text);
    }, 300); // 3 seconds delay

    setSearchTimer(timer as unknown as NodeJS.Timeout);
  };
  // Function to search users via API
  const searchUsers = async (searchTerm: string) => {
    try {
      setIsSearching(true);

      // Get access token from AuthService, not SocketService
      const authService = require('../services/AuthService').default.getInstance();
      const token = await authService.getAccessToken();

      if (!token) {
        console.error('No access token available');
        Alert.alert('Error', 'Please log in again');
        return;
      }

      // Call the search API
      const response = await fetch(`${SOCKET_URL}/user/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text: searchTerm
        })
      });

      const result: SearchResponse = await response.json();

      if (result.code === 1 && result.data) {
        console.log('Search results:', result.data);
        setSearchResults(result.data);
        setShowSearchResults(true);
      } else {
        console.log('Search returned no results:', result.message);
        setSearchResults([]);
        setShowSearchResults(false);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('Error', 'Failed to search users');
    } finally {
      setIsSearching(false);
    }
  };

  // Function to create a new conversation with a user
  const createConversation = (receiverId: string) => {
    if (!socket || !userId) {
      Alert.alert('Error', 'Not connected to chat server');
      return;
    }

    console.log(`Creating conversation between ${userId} and ${receiverId}`);

    // Emit event to create conversation
    socket.emit('create_conversation', {
      IDSender: userId,
      IDReceiver: receiverId
    });

    // Hide search results
    setShowSearchResults(false);
    setSearchText('');
  };
  // Setup conversation creation response handler
  useEffect(() => {
    if (!socket) return;

    const handleCreateConversationResponse = (data: CreateConversationResponse) => {
      console.log('Create conversation response:', data);

      if (data.success) {
        // Don't navigate to chat screen, just show a success message
        Alert.alert('Thành công', 'Đã tạo cuộc trò chuyện mới');

        // Reload conversations to show the new one
        socket.emit('load_conversations', { IDUser: userId });
      } else {
        Alert.alert('Lỗi', 'Không thể tạo cuộc trò chuyện');
      }
    };

    // Add event listener for create_conversation_response
    socket.on('create_conversation_response', handleCreateConversationResponse);

    // Cleanup
    return () => {
      socket.off('create_conversation_response', handleCreateConversationResponse);
    };
  }, [socket, userId, navigation]);

  // Load saved conversations on component mount
  useEffect(() => {
    if (global.conversations && global.conversations.length > 0) {
      console.log('Loading saved conversations from global state');
      setConversations(global.conversations);
    }
  }, []);

  // Add focus listener to refresh data when coming back to this screen
  useEffect(() => {
    // Function to run when the screen comes into focus
    const handleScreenFocus = () => {
      console.log('HomeScreen in focus, refreshing data');
      onRefresh();
    };

    // Subscribe to focus events
    const unsubscribe = navigation.addListener('focus', handleScreenFocus);

    // Cleanup function
    return () => {
      unsubscribe();
    };
  }, [navigation, onRefresh, userId]);  // Connect to Socket.IO server and fetch conversations
  useEffect(() => {
    if (!userId) {
      console.warn('No user ID available, cannot fetch conversations');
      return;
    }

    // Use SocketService for persistent connection
    const socketService = SocketService.getInstance();
    let socketInstance = socketService.getSocket();

    // If no socket connection exists in SocketService, get it from global for backward compatibility
    if (!socketInstance) {
      socketInstance = global.socketInstance;

      if (!socketInstance || !socketInstance.connected) {
        console.log('No existing socket found, will initialize through SocketService');
        socketService.initialize().then(() => {
          // Update socket reference after initialization
          const newSocketInstance = socketService.getSocket();
          setSocket(newSocketInstance);
          setupSocketListeners(newSocketInstance);
        });
        return;
      }
    }

    setSocket(socketInstance);
    setupSocketListeners(socketInstance);

    // Clean up only event handlers when component unmounts, but keep socket alive
    return () => {
      if (socketInstance) {
        socketInstance.off('load_conversations_response');
        socketInstance.off('connect_error');
        socketInstance.off('connection_success');
        socketInstance.off('unread_messages');
        socketInstance.off('users_status');
        socketInstance.off('receive_message');
      }
    };
  }, [userId]);

  // Setup all socket event listeners
  const setupSocketListeners = (socketInstance) => {
    // Remove any existing listeners to avoid duplicates
    socketInstance.off('load_conversations_response');
    socketInstance.off('connect_error');
    socketInstance.off('connection_success');
    socketInstance.off('unread_messages');
    socketInstance.off('users_status');
    socketInstance.off('receive_message');

    // Function to handle received conversations
    const handleConversationsResponse = (data: {
      Items: any[],
      LastEvaluatedKey: any,
      total: number
    }) => {

      if (data && data.Items && data.Items.length > 0) {
        setConversations(data.Items);
        // Save to global state
        global.conversations = data.Items;

        // Extract user IDs from conversations to check their online status
        const userIds = data.Items.map((conversation) => {
          // Get the other user's ID (not the current user)
          return conversation.idSender === userId
            ? conversation.idReceiver
            : conversation.idSender;
        }).filter(Boolean);

        // Only check status if we have user IDs
        if (userIds.length > 0) {
          console.log('Checking status for users:', userIds);
          socketInstance.emit('check_users_status', { userIds });
        }
      }
    };

    // Function to handle connection success
    const handleConnectionSuccess = (data: ConnectionResponse) => {
      console.log('Connection successful:', data);
      // Can store the socketId if needed for later use
    };

    // Function to handle unread messages
    const handleUnreadMessages = (data: { messages: UnreadMessage[], count: number }) => {

      if (data && data.messages && data.messages.length > 0) {
        setUnreadMessages(data.messages);
      }
    };

    // Function to handle user status updates
    const handleUsersStatus = (data: UserStatusResponse) => {
      console.log('User statuses received:', data);
      if (data && data.statuses) {
        setOnlineUsers(data.statuses);
      }
    };

    // Xử lý khi nhận được tin nhắn mới theo thời gian thực
    const handleRealTimeMessage = (newMessage) => {
      console.log('New message received in HomeScreen:', newMessage);

      if (!newMessage) return;

      // Cập nhật danh sách cuộc trò chuyện ngay lập tức
      setConversations(prevConversations => {
        // Tìm cuộc trò chuyện có liên quan đến tin nhắn này
        const conversationIndex = prevConversations.findIndex(
          conv => conv.idConversation === newMessage.idConversation
        );

        if (conversationIndex === -1) {
          // Nếu không tìm thấy cuộc trò chuyện, có thể đây là cuộc trò chuyện mới
          // Chúng ta sẽ tải lại danh sách cuộc trò chuyện từ server
          socketInstance.emit('load_conversations', { IDUser: userId });
          return prevConversations;
        }

        // Tìm thấy cuộc trò chuyện, cập nhật tin nhắn mới nhất
        const updatedConversations = [...prevConversations];
        const conversation = { ...updatedConversations[conversationIndex] };

        // Cập nhật tin nhắn mới nhất cho cuộc trò chuyện
        conversation.latestMessage = {
          content: newMessage.content,
          dateTime: newMessage.dateTime,
          isRead: newMessage.isRead,
          isRecall: newMessage.isRecall
        };

        // Cập nhật lastChange để sắp xếp lại cuộc trò chuyện
        conversation.lastChange = new Date().toISOString();

        // Nếu tin nhắn này không phải do người dùng hiện tại gửi, tăng số tin nhắn chưa đọc
        if (newMessage.idSender !== userId) {
          conversation.unreadCount = (conversation.unreadCount || 0) + 1;
        }

        // Xóa cuộc trò chuyện khỏi mảng cũ
        updatedConversations.splice(conversationIndex, 1);

        // Thêm cuộc trò chuyện vào đầu danh sách (tin nhắn mới nhất)
        updatedConversations.unshift(conversation);

        // Cập nhật global state
        global.conversations = updatedConversations;

        return updatedConversations;
      });
    };

    // Add all the event listeners
    socketInstance.on('load_conversations_response', handleConversationsResponse);
    socketInstance.on('connection_success', handleConnectionSuccess);
    socketInstance.on('unread_messages', handleUnreadMessages);
    socketInstance.on('users_status', handleUsersStatus);
    socketInstance.on('receive_message', handleRealTimeMessage);

    // Handle connection errors
    socketInstance.on('connect_error', (error: any) => {
      console.error('Socket.IO connection error:', error);
      Alert.alert('Connection Error', 'Failed to connect to the chat server');
    });

    // Handle connection events
    if (socketInstance.connected) {
      console.log('Using existing connection - Socket already connected');
      socketInstance.emit('load_conversations', { IDUser: userId });
      // Connect with new_user_connect event
      socketInstance.emit('new_user_connect', { id: userId });
      console.log('Sent new_user_connect with ID:', userId);
    } else {
      // Set up connect event
      socketInstance.on('connect', () => {
        console.log('Connected to Socket.IO server');

        // Request conversations
        socketInstance.emit('load_conversations', { IDUser: userId });
        console.log('Requested conversations for user ID:', userId);

        // Connect with new_user_connect event
        socketInstance.emit('new_user_connect', { id: userId });
        console.log('Sent new_user_connect with ID:', userId);
      });
    }
  };

  // No more hardcoded chat data - we'll use only data from Socket.IO
  const handleChatPress = (conversationId: string) => {
    const selectedConversation = conversations.find(conversation => conversation.idConversation === conversationId);
    navigation?.navigate('ChatScreen', { conversationId: selectedConversation?.idConversation });
  };

  const handleTabPress = (tabName: string) => {
    if (tabName === 'profile') {
      navigation?.navigate('InfoScreen');
    }
  };  // Function to handle pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    console.log('Refreshing conversations...');

    // Clear existing online statuses to avoid showing stale data
    setOnlineUsers({});

    // Make sure we have the latest user ID by checking SocketService first
    let currentUserId = userId;

    if (!currentUserId) {
      try {
        const socketService = SocketService.getInstance();
        const savedUserData = await socketService.loadUserData();

        if (savedUserData && savedUserData.id) {
          console.log('Retrieved user data during refresh:', savedUserData.id);
          setUserData(savedUserData);
          setUserId(savedUserData.id);
          currentUserId = savedUserData.id;
        } else {
          console.warn('No user data available for refresh');
        }
      } catch (error) {
        console.error('Error loading user data during refresh:', error);
      }
    }

    // Get or initialize the socket
    let socketToUse = socket;
    if (!socketToUse) {
      const socketService = SocketService.getInstance();
      socketToUse = socketService.getSocket();

      if (!socketToUse) {
        await socketService.initialize();
        socketToUse = socketService.getSocket();
        setSocket(socketToUse);
      }
    }

    if (socketToUse && currentUserId) {
      // Request fresh conversations data
      socketToUse.emit('load_conversations', { IDUser: currentUserId });

      // Get user IDs from current conversations to check their status
      const userIds = conversations.map((conversation) => {
        return conversation.idSender === currentUserId
          ? conversation.idReceiver
          : conversation.idSender;
      }).filter(Boolean);

      // Update online status
      if (userIds.length > 0) {
        console.log('Refreshing online status for users:', userIds);
        socketToUse.emit('check_users_status', { userIds });
      }
    } else {
      console.warn('Cannot refresh: socket or userId unavailable');
    }

    // End refreshing after a short delay to show the spinner
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1FAEEB" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="rgba(252, 236, 236, 0.7)" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={handleSearchInput}
            placeholder="Tìm kiếm"
            placeholderTextColor="#EBE2E2"
          />
          {isSearching && (
            <View style={styles.loadingIndicator}>
              <Text style={styles.loadingText}>Đang tìm...</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={() => navigation.navigate('SearchUserScreen')}
        >
          <Ionicons name="person-add-outline" size={20} color="rgba(242, 228, 228, 0.7)" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIconButton}>
          <Ionicons name="qr-code-outline" size={20} color="rgba(251, 242, 242, 0.7)" />
        </TouchableOpacity>
      </View>

      {/* Search Results */}
      {showSearchResults && searchResults.length > 0 && (
        <View style={styles.searchResultsContainer}>
          <Text style={styles.searchResultsTitle}>Kết quả tìm kiếm</Text>
          {searchResults.map((user) => (
            <View key={user.id} style={styles.searchResultItem}>
              <Image
                source={user.urlavatar ? { uri: user.urlavatar } : require('../assets/Welo_image.png')}
                style={styles.searchResultAvatar}
              />
              <View style={styles.searchResultInfo}>
                <Text style={styles.searchResultName}>{user.fullname}</Text>
                <Text style={styles.searchResultEmail}>{user.email || user.phone}</Text>
              </View>
              <TouchableOpacity
                style={styles.messageButton}
                onPress={() => createConversation(user.id)}
              >
                <Text style={styles.messageButtonText}>Nhắn tin</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Chat List */}
      <ScrollView
        style={styles.chatListContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1FAEEB']} // Same color as the header
            tintColor="#1FAEEB"
            title="Đang tải cuộc trò chuyện..."
            titleColor="#645C5C"
          />
        }
      >
        {/* Conversations Section */}
        <Text style={styles.sectionTitle}>Cuộc trò chuyện</Text>
        {conversations.length > 0 ? (
          conversations.map((conversation) => {
            // Xác định người nhận là ai (nếu người đang đăng nhập là sender thì lấy receiver, ngược lại)
            const otherUserInfo = conversation.otherUser || {};
            const chatName = otherUserInfo.fullname ||
              (conversation.isGroup ? `Nhóm ${conversation.idConversation.substring(0, 8)}` :
                (conversation.idSender === userId ? conversation.idReceiver : conversation.idSender));
            // Lấy tin nhắn mới nhất nếu có
            const latestMessage = conversation.latestMessage || {};
            // Format message content based on message type and sender
            let messageContent = 'Chưa có tin nhắn';

            if (latestMessage.content) {
              const isCurrentUserSender = latestMessage.idSender === userId;

              switch (latestMessage.type) {
                case 'text':
                  messageContent = latestMessage.content;
                  break;

                case 'image':
                  messageContent = isCurrentUserSender
                    ? 'Bạn đã gửi một hình ảnh'
                    : 'Bạn nhận được một hình ảnh';
                  break;

                case 'video':
                  messageContent = isCurrentUserSender
                    ? 'Bạn đã gửi một video'
                    : 'Bạn nhận được một video';
                  break;

                case 'document':
                  messageContent = isCurrentUserSender
                    ? 'Bạn đã gửi một tài liệu'
                    : 'Bạn nhận được một tài liệu';
                  break;

                default:
                  messageContent = latestMessage.content;
              }
            }

            const messageTime = latestMessage.dateTime ?
              new Date(latestMessage.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
              new Date(conversation.lastChange).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <TouchableOpacity key={conversation._id}
                style={styles.chatItem}
                onPress={() => navigation?.navigate('ChatScreen', {
                  idConversation: conversation.idConversation,
                  idSender: conversation.idSender,
                  idReceiver: conversation.idReceiver,
                  chatItem: {
                    name: chatName,
                    avatar: otherUserInfo.avatar || null
                  }
                })}
              >
                <View style={styles.avatarContainer}>
                  <Image
                    source={
                      otherUserInfo.urlavatar
                        ? { uri: otherUserInfo.urlavatar }
                        : require('../assets/Welo_image.png')
                    }
                    style={styles.avatar}
                  />
                  {conversation.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadCount}>
                        {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                      </Text>
                    </View>
                  )}
                  {/* Display online status dot for users who are online */}
                  {onlineUsers[conversation.idSender === userId ? conversation.idReceiver : conversation.idSender] && (
                    <View style={styles.onlineDot} />
                  )}
                </View>

                <View style={styles.chatInfo}>
                  <View style={styles.chatNameTimeRow}>
                    <Text style={styles.chatName}>{chatName}</Text>
                    <Text style={styles.chatTime}>{messageTime}</Text>
                  </View>
                  <View style={styles.chatMessageContainer}>
                    <Text style={[
                      styles.chatMessage,
                      latestMessage.isRecall && styles.recalledMessage,
                      !latestMessage.isRead && styles.unreadMessage
                    ]}
                      numberOfLines={1}>
                      {latestMessage.isRecall ? 'Tin nhắn đã bị thu hồi' : messageContent}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyStateContainer}>
            <Text style={styles.emptyStateText}>Không có cuộc trò chuyện nào</Text>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <FooterComponent activeTab="messages" onTabPress={handleTabPress} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    backgroundColor: '#1FAEEB',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '400',
  },
  loadingIndicator: {
    marginLeft: 5,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontStyle: 'italic',
  },
  headerIconButton: {
    marginLeft: 15,
    padding: 5,
  },
  searchResultsContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
    maxHeight: 300,
    zIndex: 1000,
  },
  searchResultsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    padding: 10,
    backgroundColor: '#F8F8F8',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  searchResultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D9D9D9',
  },
  searchResultInfo: {
    flex: 1,
    marginLeft: 10,
  },
  searchResultName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  searchResultEmail: {
    fontSize: 12,
    color: '#645C5C',
  },
  messageButton: {
    backgroundColor: '#1FAEEB',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  messageButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  chatListContainer: {
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#D9D9D9', // Fallback color if image fails to load
  },
  onlineDot: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50', // Online status indicator color
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  unreadBadge: {
    position: 'absolute',
    right: -2,
    top: -2,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  unreadCount: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  chatInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  chatNameTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  chatName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  chatTime: {
    fontSize: 12,
    color: '#645C5C',
  },
  chatMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatMessage: {
    flex: 1,
    fontSize: 12,
    color: '#645C5C',
    marginRight: 5,
  },
  unreadMessage: {
    fontWeight: '500',
    color: '#000000',
  },
  recalledMessage: {
    fontStyle: 'italic',
    color: '#999999',
  },
  socketConversationsSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
    paddingBottom: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    marginLeft: 15,
    marginTop: 10,
  },
  emptyStateContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#645C5C',
    textAlign: 'center',
  },
});

export default HomeScreen;
