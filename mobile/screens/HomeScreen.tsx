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
  Alert,
  Modal,
  FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FooterComponent from '../components/FooterComponent';
import io from 'socket.io-client';
import SocketService from '../services/SocketService';
import SearchUserScreen from './SearchUserScreen';

// Socket.IO server URL
const SOCKET_URL = 'http://192.168.0.106:3000';

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
    IDOwner?: string;
  };
  // Additional properties for UI
  latestMessage?: {
    content: string;
    dateTime: string;
    isRead: boolean;
    isRecall: boolean;
    type?: string;
    idSender?: string;
  };
  unreadCount?: number;
  otherUser?: {
    id?: string;
    fullname?: string;
    urlavatar?: string;
  };
  groupName?: string;
  groupAvatar?: string;
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
  route?: any;
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
  
  // Group chat creation modal state
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<SearchUserResult[]>([]);
  const [friendsList, setFriendsList] = useState<SearchUserResult[]>([]);
  const [isFetchingFriends, setIsFetchingFriends] = useState(false);

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
  
  // Function to fetch friends list for group creation
  const fetchFriendsList = async () => {
    try {
      setIsFetchingFriends(true);
      
      // Get authentication token
      const authService = require('../services/AuthService').default.getInstance();
      const token = await authService.getAccessToken();
      
      if (!token) {
        console.error('No access token available');
        Alert.alert('Error', 'Please log in again');
        setIsFetchingFriends(false);
        return;
      }
      
    // Call the API to get friends list
      const response = await fetch(`${SOCKET_URL}/user/friend/get-friends`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const result = await response.json();
      
      if (result.code === 0 && result.data) {
        console.log('Friends list received:', result.data.length);
        setFriendsList(result.data);
      } else {
        console.log('Failed to get friends list:', result.message);
        setFriendsList([]);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
      Alert.alert('Error', 'Failed to fetch friends list');
    } finally {
      setIsFetchingFriends(false);
    }
  };
  
  // Function to toggle member selection for group
  const toggleMemberSelection = (friend: SearchUserResult) => {
    setSelectedMembers(prevSelected => {
      const isAlreadySelected = prevSelected.some(item => item.id === friend.id);
      
      if (isAlreadySelected) {
        return prevSelected.filter(item => item.id !== friend.id);
      } else {
        return [...prevSelected, friend];
      }
    });
  };
    // Function to create a group conversation
  const createGroupConversation = () => {
    if (!socket || !userId) {
      Alert.alert('Lỗi', 'Không thể kết nối với máy chủ chat');
      return;
    }
    
    if (groupName.trim() === '') {
      Alert.alert('Lỗi', 'Vui lòng nhập tên nhóm');
      return;
    }
    
    // Nhóm phải có ít nhất 2 thành viên được chọn (tổng cộng 3 người khi tính cả người tạo)
    if (selectedMembers.length < 2) {
      Alert.alert('Lỗi', 'Vui lòng chọn ít nhất 2 thành viên để tạo nhóm (tổng cộng 3 người khi tính cả bạn)');
      return;
    }
    
    // Emit group creation event
    const memberIds = selectedMembers.map(member => member.id);
    
    console.log(`Đang tạo nhóm trò chuyện "${groupName}" với các thành viên:`, memberIds);
    console.log(`Người tạo nhóm: ${userId}`);
    
    socket.emit('create_group_conversation', {
      IDOwner: userId,
      groupName: groupName.trim(),
      groupMembers: memberIds
    });
    
    // Reset state and close modal
    setGroupName('');
    setSelectedMembers([]);
    setShowGroupModal(false);
  };

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
    
    // Add event listener for group conversation creation response
    const handleGroupCreateResponse = (data: any) => {
      console.log('Group creation response:', data);
      
      if (data.success) {
        Alert.alert('Thành công', 'Đã tạo nhóm trò chuyện mới');
        
        // Reload conversations to show the new group
        socket.emit('load_conversations', { IDUser: userId });
      } else {
        Alert.alert('Lỗi', data.message || 'Không thể tạo nhóm trò chuyện');
      }
    };
    
    socket.on('create_group_conversation_response', handleGroupCreateResponse);

    // Cleanup
    return () => {
      socket.off('create_conversation_response', handleCreateConversationResponse);
      socket.off('create_group_conversation_response', handleGroupCreateResponse);
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
  const setupSocketListeners = (socketInstance) => {    // Remove any existing listeners to avoid duplicates
    socketInstance.off('load_conversations_response');
    socketInstance.off('load_group_conversations_response');
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
        // Store personal conversations
        const personalConversations = data.Items;
        
        // Now request group conversations
        socketInstance.emit('load_group_conversations', { IDUser: userId });
        
        setConversations(personalConversations);
        // Save to global state (will be updated again when group conversations arrive)
        global.conversations = personalConversations;

        // Extract user IDs from conversations to check their online status
        const userIds = personalConversations.map((conversation) => {
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
      // Function to handle received group conversations
    const handleGroupConversationsResponse = (data: {
      Items: any[],
      LastEvaluatedKey: any,
      total: number
    }) => {
      console.log('Group conversations received:', data.Items?.length || 0);
      
      if (data && data.Items && data.Items.length > 0) {
        // Merge group conversations with existing conversations
        setConversations(prevConversations => {
          // Create a map of existing conversations by idConversation for easy lookup
          const existingConversationsMap = new Map();
          prevConversations.forEach(conv => {
            existingConversationsMap.set(conv.idConversation, conv);
          });
          
          // Filter out duplicates from new group conversations
          const newGroupConversations = data.Items.filter(groupConv => 
            !existingConversationsMap.has(groupConv.idConversation)
          );
          
          console.log(`Adding ${newGroupConversations.length} unique group conversations`);
          
          // Only add unique conversations
          const updatedConversations = [...prevConversations, ...newGroupConversations];
          
          // Sort by lastChange (most recent first)
          updatedConversations.sort((a, b) => {
            const dateA = new Date(a.lastChange);
            const dateB = new Date(b.lastChange);
            return dateB.getTime() - dateA.getTime();
          });
          
          // Update global state
          global.conversations = updatedConversations;
          
          return updatedConversations;
        });
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
    };    // Add all the event listeners
    socketInstance.on('load_conversations_response', handleConversationsResponse);
    socketInstance.on('load_group_conversations_response', handleGroupConversationsResponse);
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
    
    if (!selectedConversation) return;

    if (selectedConversation.isGroup) {
      // Navigate to GroupChatScreen for group conversations
      navigation?.navigate('GroupChatScreen', { 
        conversationId: selectedConversation?.idConversation,
        idConversation: selectedConversation?.idConversation,
        groupInfo: {
          name: selectedConversation?.groupName || 'Group Chat',
          avatar: selectedConversation?.groupAvatar,
          members: selectedConversation?.groupMembers,
          rules: selectedConversation?.rules
        }
      });
    } else {
      // Navigate to regular ChatScreen for 1-on-1 conversations
      navigation?.navigate('ChatScreen', { 
        conversationId: selectedConversation?.idConversation,
        idConversation: selectedConversation?.idConversation,
        idSender: selectedConversation?.idSender,
        idReceiver: selectedConversation?.idReceiver,
        chatItem: {
          name: selectedConversation.otherUser?.fullname || 'Chat',
          avatar: selectedConversation.otherUser?.urlavatar || null
        }
      });
    }
  };

  const handleTabPress = (tabName: string) => {
    if (tabName === 'profile') {
      navigation?.navigate('InfoScreen');
    }
    if (tabName === 'contacts') {
      navigation?.navigate('SearchUserScreen');
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

    if (socketToUse && currentUserId) {      // Request fresh conversations data
      socketToUse.emit('load_conversations', { IDUser: currentUserId });
      // Also request fresh group conversations
      socketToUse.emit('load_group_conversations', { IDUser: currentUserId });

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
          onPress={() => {
            setShowGroupModal(true);
            fetchFriendsList();
          }}
        >
          <Ionicons name="people-outline" size={20} color="rgba(242, 228, 228, 0.7)" />
        </TouchableOpacity>
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
          conversations.map((conversation) => {            // Xác định tên hiển thị cho cuộc trò chuyện
            const otherUserInfo = conversation.otherUser || {};
            const chatName = conversation.isGroup 
              ? conversation.groupName || `Nhóm ${conversation.idConversation.substring(0, 8)}` 
              : (otherUserInfo.fullname || 
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
              new Date(conversation.lastChange).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });            return (
              <TouchableOpacity key={conversation._id}
                style={styles.chatItem}
                onPress={() => {
                  // Check if this is a group conversation
                  if (conversation.isGroup) {
                    navigation?.navigate('GroupChatScreen', {
                      conversationId: conversation.idConversation,
                      idConversation: conversation.idConversation,
                      groupInfo: {
                        name: conversation.groupName || chatName,
                        avatar: conversation.groupAvatar,
                        members: conversation.groupMembers || [],
                        rules: conversation.rules || {}
                      }
                    });
                  } else {
                    navigation?.navigate('ChatScreen', {
                      idConversation: conversation.idConversation,
                      idSender: conversation.idSender,
                      idReceiver: conversation.idReceiver,
                      chatItem: {
                        name: chatName,
                        avatar: otherUserInfo.urlavatar || null
                      }
                    });
                  }
                }}
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

      {/* Group Creation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showGroupModal}
        onRequestClose={() => setShowGroupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tạo nhóm trò chuyện</Text>
              <TouchableOpacity onPress={() => setShowGroupModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.groupNameInputContainer}>
              <TextInput
                style={styles.groupNameInput}
                placeholder="Nhập tên nhóm"
                value={groupName}
                onChangeText={setGroupName}
              />
            </View>

            <Text style={styles.sectionTitle}>Chọn thành viên</Text>
            
            {isFetchingFriends ? (
              <View style={styles.loadingContainer}>
                <Text>Đang tải danh sách bạn bè...</Text>
              </View>
            ) : (
              <FlatList
                data={friendsList}
                keyExtractor={(item) => item.id}
                style={styles.friendsList}
                renderItem={({ item }) => {
                  const isSelected = selectedMembers.some(member => member.id === item.id);
                  return (
                    <TouchableOpacity 
                      style={[styles.friendItem, isSelected && styles.friendItemSelected]} 
                      onPress={() => toggleMemberSelection(item)}
                    >
                      <Image
                        source={item.urlavatar ? { uri: item.urlavatar } : require('../assets/Welo_image.png')}
                        style={styles.friendAvatar}
                      />
                      <Text style={styles.friendName}>{item.fullname}</Text>
                      {isSelected && (
                        <View style={styles.checkmarkContainer}>
                          <Ionicons name="checkmark-circle" size={24} color="#1FAEEB" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            )}

            <View style={styles.selectedMembersContainer}>
              <Text style={styles.selectedMembersText}>
                Đã chọn: {selectedMembers.length} thành viên
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.createGroupButton,
                (groupName.trim() === '' || selectedMembers.length === 0) && styles.disabledButton
              ]}
              onPress={createGroupConversation}
              disabled={groupName.trim() === '' || selectedMembers.length === 0}
            >
              <Text style={styles.createGroupButtonText}>Tạo nhóm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  
  // Group creation modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  groupNameInputContainer: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 5,
    padding: 10,
    marginBottom: 20,
  },
  groupNameInput: {
    fontSize: 16,
    height: 40,
  },
  friendsList: {
    maxHeight: 300,
    marginBottom: 10,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#EFEFEF',
  },
  friendItemSelected: {
    backgroundColor: 'rgba(31, 174, 235, 0.1)',
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  friendName: {
    flex: 1,
    fontSize: 16,
  },
  checkmarkContainer: {
    marginLeft: 10,
  },
  selectedMembersContainer: {
    marginVertical: 10,
    alignItems: 'center',
  },
  selectedMembersText: {
    fontSize: 14,
    color: '#1FAEEB',
  },
  createGroupButton: {
    backgroundColor: '#1FAEEB',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  createGroupButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
});

export default HomeScreen;
