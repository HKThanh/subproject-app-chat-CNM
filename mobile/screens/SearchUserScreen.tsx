import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  FlatList,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import io from 'socket.io-client';
import FooterComponent from '../components/FooterComponent';

// Định nghĩa các trạng thái bạn bè
enum FriendshipStatus {
  NONE = 'NONE',            // Chưa là bạn bè
  FRIEND = 'FRIEND',        // Đã là bạn bè
  PENDING_SENT = 'PENDING_SENT',    // Đã gửi lời mời kết bạn
  PENDING_RECEIVED = 'PENDING_RECEIVED',  // Đã nhận lời mời kết bạn
  BLOCKED = 'BLOCKED',      // Đã chặn người dùng
  BLOCKED_BY = 'BLOCKED_BY' // Bị người dùng chặn
}

interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: string;
}

interface User {
  id: string;
  fullname: string;
  urlavatar: string;
  email?: string;
  phone?: string;
  friendshipStatus?: FriendshipStatus;
  friendRequestId?: string; // ID của yêu cầu kết bạn nếu có
  isFriend?: boolean;
  isPendingSent?: boolean;
  isPendingReceived?: boolean;
  isBlocked?: boolean;
  isBlockedBy?: boolean;
  wasFriendBeforeBlocking?: boolean; // Thêm thuộc tính này để lưu trạng thái bạn bè trước khi chặn
}

const SearchUserScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isActionModalVisible, setIsActionModalVisible] = useState(false);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const socketRef = useRef<any>(null);
  const [activeTab, setActiveTab] = useState<'search' | 'friends' | 'received' | 'sent'>('search');
  const searchBarAnimation = useRef(new Animated.Value(0)).current;
  const [friends, setFriends] = useState<User[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<User[]>([]);
  const [sentRequests, setSentRequests] = useState<User[]>([]);
  const [isFriendsLoading, setIsFriendsLoading] = useState(false);
  const [isRequestsLoading, setIsRequestsLoading] = useState(false);

  // Handle navigation when tabs are pressed in FooterComponent
  const handleTabPress = (tabName: 'messages' | 'contacts' | 'explore' | 'diary' | 'profile') => {
    if (tabName === 'messages') {
      navigation?.navigate('HomeScreen');
    } else if (tabName === 'profile') {
      navigation?.navigate('InfoScreen');
    }
  };

  // Tải danh sách bạn bè
  const loadFriends = async () => {
    setIsFriendsLoading(true);
    try {
      const response = await fetch('http://192.168.0.105:3000/user/friend/get-friends', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${global.accessToken}`
        }
      });

      const data = await response.json();

      // Lấy danh sách người dùng đã chặn để kiểm tra
      const blockedResponse = await fetch('http://192.168.0.105:3000/user/blocked/get-blocked', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${global.accessToken}`
        }
      });
      const blockedData = await blockedResponse.json();
      const blockedUserIds = blockedData.success ? blockedData.data.map(user => user.id) : [];

      if (data.code === 0) {
        // Đánh dấu những người dùng đã bị chặn
        const friendsWithBlockStatus = (data.data || []).map(friend => ({
          ...friend,
          isBlocked: blockedUserIds.includes(friend.id)
        }));
        setFriends(friendsWithBlockStatus);
      } else {
        console.error('Error loading friends:', data.message);
        setFriends([]);
      }
    } catch (error) {
      console.error('Error loading friends:', error);
      setFriends([]);
    } finally {
      setIsFriendsLoading(false);
    }
  };// Tải danh sách lời mời kết bạn đã nhận
  const loadReceivedRequests = async () => {
    setIsRequestsLoading(true);
    try {
      const response = await fetch('http://192.168.0.105:3000/user/get-received-friend-requests', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${global.accessToken}`
        }
      });

      const data = await response.json();

      if (data.success) {
        // API trả về thông tin người gửi đầy đủ trong trường sender, bao gồm cả phone và email
        const requests = data.data || [];
        const userRequests = requests.map((request) => {
          // Sử dụng thông tin từ trường sender nếu có
          if (request.sender) {
            console.log('Thông tin người gửi yêu cầu kết bạn:', request.sender);
            return {
              id: request.senderId,
              fullname: request.sender.fullname,
              urlavatar: request.sender.urlavatar || 'https://via.placeholder.com/50',
              phone: request.sender.phone,
              email: request.sender.email,
              friendRequestId: request.id,
              friendshipStatus: FriendshipStatus.PENDING_RECEIVED,
              isPendingReceived: true
            };
          }

          // Fallback nếu không có thông tin sender
          return {
            id: request.senderId,
            fullname: request.senderName || 'Người dùng',
            urlavatar: request.senderAvatar || 'https://via.placeholder.com/50',
            friendRequestId: request.id,
            friendshipStatus: FriendshipStatus.PENDING_RECEIVED,
            isPendingReceived: true
          };
        });

        setReceivedRequests(userRequests.filter(user => user !== null));
      } else {
        setReceivedRequests([]);
      }
    } catch (error) {
      console.error('Error loading received requests:', error);
      setReceivedRequests([]);
    } finally {
      setIsRequestsLoading(false);
    }
  };// Tải danh sách lời mời kết bạn đã gửi
  const loadSentRequests = async () => {
    setIsRequestsLoading(true);
    try {
      const response = await fetch('http://192.168.0.105:3000/user/get-sended-friend-requests', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${global.accessToken}`
        }
      });

      const data = await response.json();

      if (data.success) {
        // API trả về thông tin người nhận đầy đủ trong trường receiver, bao gồm cả phone và email
        const requests = data.data || [];
        const userRequests = requests.map((request) => {
          // Sử dụng thông tin từ trường receiver nếu có
          if (request.receiver) {
            return {
              id: request.receiverId,
              fullname: request.receiver.fullname,
              urlavatar: request.receiver.urlavatar || 'https://via.placeholder.com/50',
              phone: request.receiver.phone,
              email: request.receiver.email,
              friendRequestId: request.id,
              friendshipStatus: FriendshipStatus.PENDING_SENT,
              isPendingSent: true
            };
          }

          // Fallback nếu không có thông tin receiver
          return {
            id: request.receiverId,
            fullname: request.receiverName || 'Người dùng',
            urlavatar: request.receiverAvatar || 'https://via.placeholder.com/50',
            friendRequestId: request.id,
            friendshipStatus: FriendshipStatus.PENDING_SENT,
            isPendingSent: true
          };
        });

        console.log('Yêu cầu kết bạn đã gửi:', userRequests);
        setSentRequests(userRequests.filter(user => user !== null));
      } else {
        setSentRequests([]);
      }
    } catch (error) {
      console.error('Error loading sent requests:', error);
      setSentRequests([]);
    } finally {
      setIsRequestsLoading(false);
    }
  };
  // Tải tất cả dữ liệu khi chuyển tab
  const loadTabData = (tab: 'search' | 'friends' | 'received' | 'sent') => {
    setActiveTab(tab);

    // Khởi động animation khi chuyển tab
    if (tab === 'search') {
      // Nếu chuyển đến tab tìm kiếm, hiển thị thanh search với hiệu ứng trượt xuống
      Animated.spring(searchBarAnimation, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 40
      }).start();
    } else {
      // Nếu chuyển khỏi tab tìm kiếm, ẩn thanh search với hiệu ứng trượt lên
      Animated.spring(searchBarAnimation, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8
      }).start();
    }

    if (tab === 'friends') {
      loadFriends();
    } else if (tab === 'received') {
      loadReceivedRequests();
    } else if (tab === 'sent') {
      loadSentRequests();
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Vui lòng nhập từ khóa tìm kiếm');
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://192.168.0.105:3000/user/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${global.accessToken}`
        },
        body: JSON.stringify({ text: searchQuery })
      });

      const data = await response.json();

      if (data.code === 1) {
        // Process users to set relevant flags based on friendship status
        const processedUsers = await processUserFriendshipStatus(data.data);
        setSearchResults(processedUsers);
      } else {
        setError(data.message || 'Không tìm thấy người dùng');
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Lỗi kết nối, vui lòng thử lại');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch and determine friendship status for each user
  const processUserFriendshipStatus = async (users: User[]): Promise<User[]> => {
    try {
      // Get user's friends
      const friendsResponse = await fetch('http://192.168.0.105:3000/user/friend/get-friends', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${global.accessToken}`
        }
      });
      const friendsData = await friendsResponse.json();
      const friendIds = friendsData.code === 0 ? friendsData.data.map(friend => friend.id) : [];

      // Get sent friend requests
      const sentRequestsResponse = await fetch('http://192.168.0.105:3000/user/get-sended-friend-requests', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${global.accessToken}`
        }
      });
      const sentRequestsData = await sentRequestsResponse.json();
      const sentRequests = sentRequestsData.success ? sentRequestsData.data : [];

      // Get received friend requests
      const receivedRequestsResponse = await fetch('http://192.168.0.105:3000/user/get-received-friend-requests', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${global.accessToken}`
        }
      });
      const receivedRequestsData = await receivedRequestsResponse.json();
      const receivedRequests = receivedRequestsData.success ? receivedRequestsData.data : [];

      // Get blocked users
      const blockedUsersResponse = await fetch('http://192.168.0.105:3000/user/blocked/get-blocked', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${global.accessToken}`
        }
      });
      const blockedUsersData = await blockedUsersResponse.json();
      const blockedUsers = blockedUsersData.success ? blockedUsersData.data : [];

      // Update each user with their friendship status
      return users.map(user => {
        // Check if user is a friend
        const isFriend = friendIds.includes(user.id);

        // Check if there's a pending sent request
        const pendingSentRequest = sentRequests.find(
          req => req.receiverId === user.id && req.status === 'PENDING'
        );

        // Check if there's a pending received request
        const pendingReceivedRequest = receivedRequests.find(
          req => req.senderId === user.id && req.status === 'PENDING'
        );

        // Check if user is blocked
        const isBlocked = blockedUsers.some(blockedUser => blockedUser.id === user.id);

        // Determine friendship status
        let friendshipStatus = FriendshipStatus.NONE;
        if (isFriend) {
          friendshipStatus = FriendshipStatus.FRIEND;
        } else if (pendingSentRequest) {
          friendshipStatus = FriendshipStatus.PENDING_SENT;
        } else if (pendingReceivedRequest) {
          friendshipStatus = FriendshipStatus.PENDING_RECEIVED;
        } else if (isBlocked) {
          friendshipStatus = FriendshipStatus.BLOCKED;
        }

        return {
          ...user,
          friendshipStatus,
          isFriend,
          isPendingSent: !!pendingSentRequest,
          isPendingReceived: !!pendingReceivedRequest,
          isBlocked,
          friendRequestId: pendingSentRequest?.id || pendingReceivedRequest?.id
        };
      });
    } catch (error) {
      console.error('Error processing friendship status:', error);
      return users; // Return original users if there's an error
    }
  };
  const handleUserSelect = (user: User) => {
    if (user.id === global.userData?.id) {
      Alert.alert('Thông báo', 'Đây là tài khoản của bạn');
      return;
    }

    setSelectedUser(user);
    setIsActionModalVisible(true);
  };

  // Navigate to chat with the selected user
  const navigateToChatWithUser = (user: User) => {
    if (user.friendshipStatus === FriendshipStatus.BLOCKED) {
      Alert.alert('Thông báo', 'Bạn đã chặn người dùng này. Vui lòng bỏ chặn để trò chuyện.');
      return;
    }

    if (user.friendshipStatus === FriendshipStatus.BLOCKED_BY) {
      Alert.alert('Thông báo', 'Bạn đã bị người dùng này chặn.');
      return;
    }

    navigation.navigate('ChatScreen', {
      receiverId: user.id,
      chatItem: {
        name: user.fullname,
        avatar: user.urlavatar || 'https://via.placeholder.com/50',
      }
    });
    setIsActionModalVisible(false);
  };
  // Set up socket connections
  useEffect(() => {
    // Connect to the socket server
    socketRef.current = io('http://192.168.0.105:3000');

    // Join user's room to receive notifications
    if (global.userData?.id) {
      socketRef.current.emit('joinUserRoom', global.userData.id);
    }

    // Listen for friend request events
    socketRef.current.on('newFriendRequest', (data) => {
      // Update search results if the sender is in the list
      refreshUserInResults(data.sender.id);

      // Reload received requests if we're on that tab
      if (activeTab === 'received') {
        loadReceivedRequests();
      }
    });

    socketRef.current.on('friendRequestAccepted', (data) => {
      // Update the status of the user in search results
      refreshUserInResults(data.userId);

      // Reload relevant tabs based on the current tab
      if (activeTab === 'friends') {
        loadFriends();
      } else if (activeTab === 'sent') {
        loadSentRequests();
      }
    });

    socketRef.current.on('friendRequestDeclined', (data) => {
      // Update the status of the user in search results
      refreshUserInResults(data.userId);

      // Reload sent requests if we're on that tab
      if (activeTab === 'sent') {
        loadSentRequests();
      }
    });

    // Listen for block events
    socketRef.current.on('blockedByUser', (data) => {
      refreshUserInResults(data.blockerId);
    });
    socketRef.current.on('unblockedByUser', (data) => {
      refreshUserInResults(data.blockerId);
    });

    // Lắng nghe sự kiện hủy kết bạn
    socketRef.current.on('unfriend', (data) => {
      console.log('Unfriend event received:', data);

      // Xóa người dùng khỏi danh sách bạn bè nếu đang ở tab bạn bè
      if (data.friendId) {
        setFriends(prev => prev.filter(friend => friend.id !== data.friendId));
      }

      // Cập nhật người dùng trong kết quả tìm kiếm (nếu có)
      if (data.friendId) {
        updateUserInSearchResults(data.friendId, {
          friendshipStatus: FriendshipStatus.NONE,
          isFriend: false
        });
      }

      // Hiển thị thông báo
      if (data.message) {
        Alert.alert('Thông báo', data.message);
      }
    });

    // Load initial data for the active tab
    loadTabData(activeTab);

    return () => {
      // Clean up socket connection
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [activeTab]); // Re-run effect when activeTab changes

  // Helper function to refresh a specific user in search results
  const refreshUserInResults = async (userId: string) => {
    if (!searchResults.some(user => user.id === userId)) return;

    // Re-run the search to update the results
    if (searchQuery.trim()) {
      handleSearch();
    }
  };
  // Handle sending a friend request
  const handleSendFriendRequest = async (userId: string) => {
    if (isProcessing) return;

    setProcessingUserId(userId);
    setIsProcessing(true);

    try {
      // Kiểm tra trạng thái yêu cầu kết bạn trước
      const requestStatus = await checkFriendRequestExists(userId);

      if (requestStatus.code === 2) {
        // Đã là bạn bè
        Alert.alert('Thông báo', requestStatus.message);
        updateUserInSearchResults(userId, {
          friendshipStatus: FriendshipStatus.FRIEND,
          isFriend: true
        });
        setIsProcessing(false);
        setProcessingUserId(null);
        return;
      } else if (requestStatus.code === 0) {
        // Đã có yêu cầu kết bạn
        Alert.alert('Thông báo', requestStatus.message);
        updateUserInSearchResults(userId, {
          friendshipStatus: FriendshipStatus.PENDING_SENT,
          isPendingSent: true
        });
        setIsProcessing(false);
        setProcessingUserId(null);
        return;
      }
      // Gửi yêu cầu kết bạn mới
      const response = await fetch('http://192.168.0.105:3000/user/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${global.accessToken}`
        },
        body: JSON.stringify({ receiverId: userId })
      });

      const data = await response.json();
      if (data.code === 1) {
        // Success
        Alert.alert('Thành công', 'Đã gửi lời mời kết bạn');

        // Lấy friendRequestId từ response nếu có
        const friendRequestId = data.data?.id;

        // Update user in search results
        updateUserInSearchResults(userId, {
          friendshipStatus: FriendshipStatus.PENDING_SENT,
          isPendingSent: true,
          friendRequestId: friendRequestId // Cập nhật friendRequestId
        });

        // Join the friend request socket room for real-time updates
        socketRef.current?.emit('joinFriendRequest', userId);
      } else if (data.code === 2 || data.code === 3) {
        // Already friends
        Alert.alert('Thông báo', data.message);
        updateUserInSearchResults(userId, {
          friendshipStatus: FriendshipStatus.FRIEND,
          isFriend: true
        });
      } else {
        // Error
        Alert.alert('Lỗi', data.message);
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Lỗi', 'Không thể gửi lời mời kết bạn');
    } finally {
      setIsProcessing(false);
      setProcessingUserId(null);
    }
  };
  // Handle canceling a friend request
  const handleCancelFriendRequest = async (userId: string, requestId: string) => {
    if (isProcessing) return;

    setProcessingUserId(userId);
    setIsProcessing(true);

    try {
      // Kiểm tra lại ID yêu cầu kết bạn mới nhất trước khi hủy
      const sentResponse = await fetch('http://192.168.0.105:3000/user/get-sended-friend-requests', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${global.accessToken}`
        }
      });
      const sentData = await sentResponse.json();

      // Nếu tìm thấy yêu cầu kết bạn cập nhật, sử dụng ID đó thay vì ID cũ
      let actualRequestId = requestId;
      if (sentData.success) {
        const latestRequest = sentData.data.find(req => req.receiverId === userId && req.status === 'PENDING');
        if (latestRequest) {
          actualRequestId = latestRequest.id;
        }
      }

      // Sử dụng URL chính xác theo tài liệu API với ID yêu cầu mới nhất
      const response = await fetch(`http://192.168.0.105:3000/user/cancel/${actualRequestId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${global.accessToken}`
        }
      });

      // Kiểm tra kiểu nội dung trước khi parse JSON
      const contentType = response.headers.get('content-type');
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Nếu không phải JSON, log nội dung và ném lỗi
        const text = await response.text();
        console.error('Server trả về không phải JSON:', text);
        throw new Error('Phản hồi từ server không phải định dạng JSON');
      }

      if (data.code === 1) {
        // Success
        Alert.alert('Thành công', 'Đã hủy lời mời kết bạn');

        // Update user in search results
        updateUserInSearchResults(userId, {
          friendshipStatus: FriendshipStatus.NONE,
          isPendingSent: false,
          friendRequestId: undefined
        });

        // Reload sent requests tab if active
        if (activeTab === 'sent') {
          loadSentRequests();
        }
      } else {
        // Error
        Alert.alert('Lỗi', data.message || 'Không thể hủy lời mời kết bạn');
      }
    } catch (error) {
      console.error('Error canceling friend request:', error);
      Alert.alert('Lỗi', 'Không thể hủy lời mời kết bạn');
    } finally {
      setIsProcessing(false);
      setProcessingUserId(null);
    }
  };

  // Handle accepting a friend request
  const handleAcceptFriendRequest = async (userId: string, requestId: string) => {
    if (isProcessing) return;

    setProcessingUserId(userId);
    setIsProcessing(true);

    try {
      const response = await fetch('http://192.168.0.105:3000/user/handle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${global.accessToken}`
        },
        body: JSON.stringify({
          id: requestId,
          type: 'ACCEPTED'
        })
      });

      const data = await response.json();

      if (data.code === 2) {
        // Success
        Alert.alert('Thành công', 'Đã chấp nhận lời mời kết bạn');

        // Update user in search results
        updateUserInSearchResults(userId, {
          friendshipStatus: FriendshipStatus.FRIEND,
          isPendingReceived: false,
          isFriend: true,
          friendRequestId: undefined
        });

        // Join the friend request socket room for real-time updates
        socketRef.current?.emit('joinFriendRequest', userId);
      } else {
        // Error
        Alert.alert('Lỗi', data.message || 'Không thể chấp nhận lời mời kết bạn');
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Lỗi', 'Không thể chấp nhận lời mời kết bạn');
    } finally {
      setIsProcessing(false);
      setProcessingUserId(null);
    }
  };

  // Handle declining a friend request
  const handleDeclineFriendRequest = async (userId: string, requestId: string) => {
    if (isProcessing) return;

    setProcessingUserId(userId);
    setIsProcessing(true);

    try {
      const response = await fetch('http://192.168.0.105:3000/user/handle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${global.accessToken}`
        },
        body: JSON.stringify({
          id: requestId,
          type: 'DECLINED'
        })
      });

      const data = await response.json();

      if (data.code === 1) {
        // Success
        Alert.alert('Thành công', 'Đã từ chối lời mời kết bạn');

        // Update user in search results
        updateUserInSearchResults(userId, {
          friendshipStatus: FriendshipStatus.NONE,
          isPendingReceived: false,
          friendRequestId: undefined
        });
      } else {
        // Error
        Alert.alert('Lỗi', data.message || 'Không thể từ chối lời mời kết bạn');
      }
    } catch (error) {
      console.error('Error declining friend request:', error);
      Alert.alert('Lỗi', 'Không thể từ chối lời mời kết bạn');
    } finally {
      setIsProcessing(false);
      setProcessingUserId(null);
    }
  };
  // Handle blocking a user
  const handleBlockUser = async (userId: string) => {
    if (isProcessing) return;

    setProcessingUserId(userId);
    setIsProcessing(true);

    try {
      // Lưu trạng thái trước khi chặn để sử dụng khi bỏ chặn
      const user = searchResults.find(u => u.id === userId) || selectedUser;
      const wasFriend = user?.isFriend || false;

      // Hủy lời mời kết bạn nếu có
      if (user?.friendRequestId) {
        try {
          if (user.isPendingSent) {
            // Hủy lời mời đã gửi
            await fetch(`http://192.168.0.105:3000/user/cancel/${user.friendRequestId}`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${global.accessToken}`
              }
            });
          } else if (user.isPendingReceived) {
            // Từ chối lời mời đã nhận
            await fetch('http://192.168.0.105:3000/user/handle', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${global.accessToken}`
              },
              body: JSON.stringify({
                id: user.friendRequestId,
                type: 'DECLINED'
              })
            });
          }
        } catch (error) {
          console.error('Error canceling friend request before blocking:', error);
        }
      }

      // Thực hiện chặn người dùng
      const response = await fetch('http://192.168.0.105:3000/user/blocked/block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${global.accessToken}`
        },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();

      if (data.success) {
        // Success
        Alert.alert('Thành công', 'Đã chặn người dùng');

        // Update user in search results
        updateUserInSearchResults(userId, {
          friendshipStatus: FriendshipStatus.BLOCKED,
          isBlocked: true,
          isFriend: false,
          isPendingSent: false,
          isPendingReceived: false,
          wasFriendBeforeBlocking: wasFriend // Lưu trạng thái bạn bè trước khi chặn
        });

        // Cập nhật danh sách bạn bè nếu đang ở tab Bạn bè
        if (activeTab === 'friends') {
          setFriends(prev =>
            prev.map(friend =>
              friend.id === userId
                ? { ...friend, isBlocked: true, wasFriendBeforeBlocking: true }
                : friend
            )
          );

          // Ẩn modal sau khi chặn thành công
          setIsActionModalVisible(false);
        }

        // Emit socket event
        socketRef.current?.emit('joinUserRoom', userId);
      } else {
        // Error
        Alert.alert('Lỗi', data.message || 'Không thể chặn người dùng');
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      Alert.alert('Lỗi', 'Không thể chặn người dùng');
    } finally {
      setIsProcessing(false);
      setProcessingUserId(null);
    }
  };    // Handle unblocking a user
  const handleUnblockUser = async (userId: string) => {
    if (isProcessing) return;

    setProcessingUserId(userId);
    setIsProcessing(true);

    try {
      // Lấy thông tin người dùng để kiểm tra trạng thái trước khi chặn
      const user = searchResults.find(u => u.id === userId) ||
        friends.find(f => f.id === userId) ||
        selectedUser;

      const wasFriend = user?.wasFriendBeforeBlocking || false;

      const response = await fetch('http://192.168.0.105:3000/user/blocked/unblock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${global.accessToken}`
        },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();

      if (data.success) {
        // Success
        Alert.alert('Thành công', 'Đã bỏ chặn người dùng');

        // Update user in search results - restore to friend status if was a friend before blocking
        if (wasFriend) {
          updateUserInSearchResults(userId, {
            friendshipStatus: FriendshipStatus.FRIEND,
            isBlocked: false,
            isFriend: true,
            wasFriendBeforeBlocking: undefined
          });
        } else {
          updateUserInSearchResults(userId, {
            friendshipStatus: FriendshipStatus.NONE,
            isBlocked: false,
            wasFriendBeforeBlocking: undefined
          });
        }

        // Cập nhật danh sách bạn bè nếu đang ở tab Bạn bè
        if (activeTab === 'friends') {
          setFriends(prev =>
            prev.map(friend =>
              friend.id === userId
                ? {
                  ...friend,
                  isBlocked: false,
                  wasFriendBeforeBlocking: undefined
                }
                : friend
            )
          );

          // Ẩn modal sau khi bỏ chặn thành công
          setIsActionModalVisible(false);
        }

        // Emit socket event
        socketRef.current?.emit('joinUserRoom', userId);
      } else {
        // Error
        Alert.alert('Lỗi', data.message || 'Không thể bỏ chặn người dùng');
      }
    } catch (error) {
      console.error('Error unblocking user:', error);
      Alert.alert('Lỗi', 'Không thể bỏ chặn người dùng');
    } finally {
      setIsProcessing(false);
      setProcessingUserId(null);
    }
  };

  // Handle unfriending a user
  const handleUnfriend = async (userId: string) => {
    if (isProcessing) return;

    // Hiển thị hộp thoại xác nhận trước khi hủy kết bạn
    Alert.alert(
      'Xác nhận hủy kết bạn',
      'Bạn có chắc chắn muốn hủy kết bạn với người này không?',
      [
        {
          text: 'Hủy',
          style: 'cancel'
        },
        {
          text: 'Đồng ý',
          style: 'destructive',
          onPress: async () => {
            setProcessingUserId(userId);
            setIsProcessing(true);

            try {
              const response = await fetch('http://192.168.0.105:3000/user/friend/unfriend', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${global.accessToken}`
                },
                body: JSON.stringify({ friendId: userId })
              });

              const data = await response.json();

              if (data.code === 1) {
                // Hủy kết bạn thành công
                Alert.alert('Thành công', data.message || 'Đã hủy kết bạn thành công');

                // Xóa người dùng khỏi danh sách bạn bè
                setFriends(prev => prev.filter(friend => friend.id !== userId));

                // Cập nhật người dùng trong kết quả tìm kiếm (nếu có)
                updateUserInSearchResults(userId, {
                  friendshipStatus: FriendshipStatus.NONE,
                  isFriend: false
                });

                // Đóng modal
                setIsActionModalVisible(false);
              } else {
                // Lỗi
                Alert.alert('Thông báo', data.message || 'Không thể hủy kết bạn');
              }
            } catch (error) {
              console.error('Error unfriending user:', error);
              Alert.alert('Lỗi', 'Đã có lỗi xảy ra khi hủy kết bạn');
            } finally {
              setIsProcessing(false);
              setProcessingUserId(null);
            }
          }
        }
      ]
    );
  };

  // Helper function to update a user in the search results
  const updateUserInSearchResults = (userId: string, updates: Partial<User>) => {
    setSearchResults(prevResults =>
      prevResults.map(user =>
        user.id === userId ? { ...user, ...updates } : user
      )
    );
  };

  // Kiểm tra trạng thái yêu cầu kết bạn
  const checkFriendRequestExists = async (userId: string) => {
    try {
      // Kiểm tra xem người dùng đã là bạn bè hay chưa
      const friendResponse = await fetch('http://192.168.0.105:3000/user/friend/get-friends', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${global.accessToken}`
        }
      });
      const friendData = await friendResponse.json();

      if (friendData.code === 0) {
        const isFriend = friendData.data.some(friend => friend.id === userId);
        if (isFriend) {
          return { code: 2, message: 'Hai bạn đã là bạn bè' };
        }
      }

      // Kiểm tra yêu cầu kết bạn đã gửi
      const sentResponse = await fetch('http://192.168.0.105:3000/user/get-sended-friend-requests', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${global.accessToken}`
        }
      });
      const sentData = await sentResponse.json();

      if (sentData.success) {
        const existingRequest = sentData.data.find(
          req => req.receiverId === userId && req.status === 'PENDING'
        );

        if (existingRequest) {
          return { code: 0, message: 'Bạn đã gửi lời mời kết bạn cho người này rồi', requestId: existingRequest.id };
        }
      }

      // Kiểm tra yêu cầu kết bạn đã nhận
      const receivedResponse = await fetch('http://192.168.0.105:3000/user/get-received-friend-requests', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${global.accessToken}`
        }
      });
      const receivedData = await receivedResponse.json();
      if (receivedData.success) {
        const existingRequest = receivedData.data.find(
          req => req.senderId === userId && req.status === 'PENDING'
        );

        if (existingRequest) {
          return { code: 1, message: 'Người này đã gửi cho bạn lời mời kết bạn', requestId: existingRequest.id };
        }
      }

      return { code: -1, message: 'Không tìm thấy yêu cầu kết bạn' };
    } catch (error) {
      console.error('Lỗi kiểm tra yêu cầu kết bạn:', error);
      return { code: -1, message: 'Không thể kiểm tra yêu cầu kết bạn' };
    }
  };

  // Render the Action Modal
  const renderActionModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isActionModalVisible}
      onRequestClose={() => setIsActionModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Tùy chọn</Text>
            <TouchableOpacity onPress={() => setIsActionModalVisible(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          {selectedUser && (
            <View style={styles.userInfoModal}>
              <Image
                source={{ uri: selectedUser.urlavatar || 'https://via.placeholder.com/80' }}
                style={styles.modalAvatar}
              />
              <Text style={styles.modalUserName}>{selectedUser.fullname}</Text>
              <Text style={styles.modalUserDetails}>
                {selectedUser.phone || selectedUser.email || 'Không có thông tin liên hệ'}
              </Text>
            </View>
          )}     
               <View style={styles.actionButtons}>
            {/* Hiển thị nút "Bỏ chặn" nếu người dùng đã bị chặn */}
            {selectedUser?.isBlocked ? (
              <TouchableOpacity
                style={[styles.actionButton, styles.secondaryButton]}
                onPress={() => handleUnblockUser(selectedUser.id)}
              >
                <Text style={styles.actionButtonText}>Bỏ chặn</Text>
              </TouchableOpacity>
            ) : (
              <>
                {/* Hiện các nút tương tác dựa vào trạng thái kết bạn */}
                {selectedUser?.friendshipStatus === FriendshipStatus.NONE && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.primaryButton]}
                      onPress={() => handleSendFriendRequest(selectedUser.id)}
                    >
                      <Text style={styles.actionButtonText}>Kết bạn</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.warningButton]}
                      onPress={() => handleBlockUser(selectedUser.id)}
                    >
                      <Text style={styles.actionButtonText}>Chặn</Text>
                    </TouchableOpacity>
                  </>
                )}
                {selectedUser?.friendshipStatus === FriendshipStatus.PENDING_SENT && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.cancelButton]}
                      onPress={() => handleCancelFriendRequest(selectedUser.id, selectedUser.friendRequestId!)}
                    >
                      <Text style={styles.actionButtonText}>Hủy lời mời</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.warningButton]}
                      onPress={() => handleBlockUser(selectedUser.id)}
                    >
                      <Text style={styles.actionButtonText}>Chặn</Text>
                    </TouchableOpacity>
                  </>
                )}
                {selectedUser?.friendshipStatus === FriendshipStatus.PENDING_RECEIVED && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.primaryButton]}
                      onPress={() => handleAcceptFriendRequest(selectedUser.id, selectedUser.friendRequestId!)}
                    >
                      <Text style={styles.actionButtonText}>Đồng ý</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.declineButton]}
                      onPress={() => handleDeclineFriendRequest(selectedUser.id, selectedUser.friendRequestId!)}
                    >
                      <Text style={styles.actionButtonText}>Từ chối</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.warningButton]}
                      onPress={() => handleBlockUser(selectedUser.id)}
                    >
                      <Text style={styles.actionButtonText}>Chặn</Text>
                    </TouchableOpacity>
                  </>
                )}           
                     {selectedUser?.friendshipStatus === FriendshipStatus.FRIEND && (
                  <>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.declineButton]}
                      onPress={() => handleUnfriend(selectedUser.id)}
                    >
                      <Text style={styles.actionButtonText}>Hủy kết bạn</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.warningButton]}
                      onPress={() => handleBlockUser(selectedUser.id)}
                    >
                      <Text style={styles.actionButtonText}>Chặn</Text>
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1FAEEB" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FDF8F8" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Tìm người dùng</Text>
      </View>

      {/* Chỉ hiển thị thanh tìm kiếm khi ở tab tìm kiếm */}
      {activeTab === 'search' && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Nhập tên, email hoặc số điện thoại"
            value={searchQuery}
            placeholderTextColor="gray"
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />

          <TouchableOpacity
            style={styles.searchButton}
            onPress={handleSearch}
          >
            <Ionicons name="search" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'search' && styles.activeTabButton]}
          onPress={() => loadTabData('search')}
        >
          <Ionicons
            name="search"
            size={20}
            color={activeTab === 'search' ? '#1FAEEB' : '#999'}
          />
          <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>
            Tìm kiếm
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'friends' && styles.activeTabButton]}
          onPress={() => loadTabData('friends')}
        >
          <Ionicons
            name="people"
            size={20}
            color={activeTab === 'friends' ? '#1FAEEB' : '#999'}
          />
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Bạn bè
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'received' && styles.activeTabButton]}
          onPress={() => loadTabData('received')}
        >
          <Ionicons
            name="person-add"
            size={20}
            color={activeTab === 'received' ? '#1FAEEB' : '#999'}
          />
          <Text style={[styles.tabText, activeTab === 'received' && styles.activeTabText]}>
            Lời mời
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'sent' && styles.activeTabButton]}
          onPress={() => loadTabData('sent')}
        >
          <Ionicons
            name="paper-plane"
            size={20}
            color={activeTab === 'sent' ? '#1FAEEB' : '#999'}
          />
          <Text style={[styles.tabText, activeTab === 'sent' && styles.activeTabText]}>
            Đã gửi
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content based on activeTab */}
      {activeTab === 'search' ? (
        // Search Results Content
        isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#1FAEEB" />
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
            <View style={styles.userItemWithActions}>
              <TouchableOpacity
                style={styles.userItemMain}
                onPress={() => handleUserSelect(item)}
              >
                <Image
                  source={{ uri: item.urlavatar || 'https://via.placeholder.com/50' }}
                  style={styles.avatar}
                  defaultSource={require('../assets/Welo_image.png')}
                />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.fullname}</Text>
                  <Text style={styles.userDetails}>
                    {item.phone || item.email || 'Không có thông tin liên hệ'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#999" />
              </TouchableOpacity>

              {/* Hiển thị nút dựa trên trạng thái kết bạn */}
              {item.id !== global.userData?.id && (
                <View style={styles.searchResultActions}>               
                     {item.isBlocked && (
                  <View style={[styles.statusBadge, styles.blockedBadge]}>
                    <Text style={styles.blockedStatusText}>Đã chặn</Text>
                  </View>
                )}

                  {!item.isBlocked && item.friendshipStatus === FriendshipStatus.NONE && (
                    <TouchableOpacity
                      style={[styles.inlineButton, styles.acceptButton]}
                      onPress={() => handleSendFriendRequest(item.id)}
                      disabled={processingUserId === item.id}
                    >
                      {processingUserId === item.id ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.inlineButtonText}>Kết bạn</Text>
                      )}
                    </TouchableOpacity>
                  )}

                  {!item.isBlocked && item.friendshipStatus === FriendshipStatus.PENDING_SENT && (
                    <TouchableOpacity
                      style={[styles.inlineButton, styles.cancelButton]}
                      onPress={() => handleCancelFriendRequest(item.id, item.friendRequestId!)}
                      disabled={processingUserId === item.id}
                    >
                      {processingUserId === item.id ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.inlineButtonText}>Hủy lời mời</Text>
                      )}
                    </TouchableOpacity>
                  )}

                  {!item.isBlocked && item.friendshipStatus === FriendshipStatus.PENDING_RECEIVED && (
                    <View style={styles.actionButtonsInline}>
                      <TouchableOpacity
                        style={[styles.inlineButton, styles.acceptButton]}
                        onPress={() => handleAcceptFriendRequest(item.id, item.friendRequestId!)}
                        disabled={processingUserId === item.id}
                      >
                        {processingUserId === item.id ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <Text style={styles.inlineButtonText}>Đồng ý</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.inlineButton, styles.declineButton]}
                        onPress={() => handleDeclineFriendRequest(item.id, item.friendRequestId!)}
                        disabled={processingUserId === item.id}
                      >
                        {processingUserId === item.id ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <Text style={styles.inlineButtonText}>Từ chối</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {!item.isBlocked && item.friendshipStatus === FriendshipStatus.FRIEND && (
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>Bạn bè</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
            )}
            ListEmptyComponent={
              searchQuery.length > 0 && !error ? (
                <View style={styles.centerContainer}>
                  <Text style={styles.emptyText}>Không tìm thấy kết quả</Text>
                </View>
              ) : null
            }
          />
        )
      ) : activeTab === 'friends' ? (
        // Friends List Content
        isFriendsLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#1FAEEB" />
          </View>
        ) : (
          <FlatList
            data={friends}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.userItem}
                onPress={() => handleUserSelect({ ...item, friendshipStatus: FriendshipStatus.FRIEND, isBlocked: item.isBlocked })}
              >
                <Image
                  source={{ uri: item.urlavatar || 'https://via.placeholder.com/50' }}
                  style={styles.avatar}
                  defaultSource={require('../assets/Welo_image.png')}
                />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.fullname}</Text>
                  <Text style={styles.userDetails}>
                    {item.phone || item.email || 'Không có thông tin liên hệ'}
                  </Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  item.isBlocked && styles.blockedBadge
                ]}>
                  <Text style={[
                    styles.statusText,
                    item.isBlocked && styles.blockedStatusText
                  ]}>
                    {item.isBlocked ? 'Đã chặn' : 'Bạn bè'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>Bạn chưa có bạn bè nào</Text>
              </View>
            }
          />
        )
      ) : activeTab === 'received' ? (
        // Received Requests Content
        isRequestsLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#1FAEEB" />
          </View>
        ) : (
          <FlatList
            data={receivedRequests}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.userItemWithActions}>
                <TouchableOpacity
                  style={styles.userItemMain}
                  onPress={() => handleUserSelect({ ...item, friendshipStatus: FriendshipStatus.PENDING_RECEIVED })}
                >
                  <Image
                    source={{ uri: item.urlavatar || 'https://via.placeholder.com/50' }}
                    style={styles.avatar}
                    defaultSource={require('../assets/Welo_image.png')}
                  />
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.fullname}</Text>
                    <Text style={styles.userDetails}>
                      {item.phone || item.email || 'Không có thông tin liên hệ'}
                    </Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.actionButtonsInline}>
                  <TouchableOpacity
                    style={[styles.inlineButton, styles.acceptButton]}
                    onPress={() => handleAcceptFriendRequest(item.id, item.friendRequestId!)}
                    disabled={processingUserId === item.id}
                  >
                    {processingUserId === item.id ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.inlineButtonText}>Đồng ý</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.inlineButton, styles.declineButton]}
                    onPress={() => handleDeclineFriendRequest(item.id, item.friendRequestId!)}
                    disabled={processingUserId === item.id}
                  >
                    {processingUserId === item.id ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.inlineButtonText}>Từ chối</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>Không có lời mời kết bạn nào</Text>
              </View>
            }
          />
        )
      ) : (
        // Sent Requests Content
        isRequestsLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#1FAEEB" />
          </View>
        ) : (
          <FlatList
            data={sentRequests}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (<View style={styles.userItemWithActions}>
              <TouchableOpacity
                style={styles.userItemMain}
                onPress={() => handleUserSelect({ ...item, friendshipStatus: FriendshipStatus.PENDING_SENT })}
              >
                <Image
                  source={{ uri: item.urlavatar || 'https://via.placeholder.com/50' }}
                  style={styles.avatar}
                  defaultSource={require('../assets/Welo_image.png')}
                />
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.fullname || 'Người dùng không xác định'}</Text>
                  <Text style={styles.userDetails}>
                    {item.phone || item.email || 'Không có thông tin liên hệ'}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.inlineButton, styles.declineButton, styles.smallButton]}
                onPress={() => handleCancelFriendRequest(item.id, item.friendRequestId!)}
                disabled={processingUserId === item.id}
              >
                {processingUserId === item.id ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.inlineButtonText}>Hủy</Text>
                )}
              </TouchableOpacity>
            </View>
            )}
            ListEmptyComponent={
              <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>Bạn chưa gửi lời mời kết bạn nào</Text>
              </View>
            }
          />
        )
      )}

      {renderActionModal()}

      {/* Footer Component */}
      <FooterComponent activeTab="contacts" onTabPress={handleTabPress} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1FAEEB',
    paddingVertical: 10,
    paddingHorizontal: 15,
    height: 50,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: '#FDF8F8',
    fontSize: 18,
    fontWeight: '500',
    marginLeft: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE'
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 10,
    marginRight: 10
  },
  searchButton: {
    backgroundColor: '#1FAEEB',
    borderRadius: 8,
    width: 50,
    justifyContent: 'center',
    alignItems: 'center'
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    backgroundColor: '#FFF'
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    flexDirection: 'row'
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#1FAEEB',
  },
  tabText: {
    fontSize: 14,
    color: '#999',
    marginLeft: 5
  },
  activeTabText: {
    color: '#1FAEEB',
    fontWeight: '500'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 16,
    textAlign: 'center'
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center'
  },
  userItem: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE'
  },
  userItemWithActions: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE'
  },
  userItemMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#DDD'
  },
  userInfo: {
    flex: 1,
    marginLeft: 15
  },
  userName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000'
  },
  userDetails: {
    fontSize: 14,
    color: '#999',
    marginTop: 2
  },
  statusBadge: {
    backgroundColor: '#E8F5FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginLeft: 10
  },
  statusText: {
    color: '#1FAEEB',
    fontSize: 12,
    fontWeight: '500'
  }, actionButtonsInline: {
    flexDirection: 'row',
    justifyContent: 'flex-end'
  },
  searchResultActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8
  },
  inlineButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    marginLeft: 10
  },
  inlineButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center'
  },
  acceptButton: {
    backgroundColor: '#1FAEEB',
  },
  declineButton: {
    backgroundColor: '#FF3B30',
  },
  cancelButton: {
    backgroundColor: '#999',
  },
  smallButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 60,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 20,
    elevation: 5
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  closeButton: {
    padding: 5
  },
  userInfoModal: {
    alignItems: 'center',
    marginVertical: 15
  },
  modalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DDD'
  },
  modalUserName: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: '500'
  },
  modalUserDetails: {
    fontSize: 14,
    color: '#999',
    marginTop: 2
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 5,
    borderRadius: 5,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  primaryButton: {
    backgroundColor: '#1FAEEB'
  },
  secondaryButton: {
    backgroundColor: '#28A745'
  },
  warningButton: {
    backgroundColor: '#FF3B30'
  },
  actionButtonText: {
    color: '#FFF',
    marginLeft: 5
  }, blockedText: {
    color: '#FF3B30',
    textAlign: 'center',
    marginVertical: 10
  },
  blockedBadge: {
    backgroundColor: '#FFEEEE',
  },
  blockedStatusText: {
    color: '#FF3B30',
  }
});

export default SearchUserScreen;
