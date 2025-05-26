import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  FlatList,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Keyboard,
  ScrollView,
  Alert,
  Linking,
  RefreshControl,
  Modal,
  Pressable
} from 'react-native';
import { Socket } from 'socket.io-client';
import { Ionicons } from '@expo/vector-icons';
import SocketService from '../services/SocketService';
import AuthService from '../services/AuthService';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Video, ResizeMode } from 'expo-av';
import axios from 'axios';
import * as Progress from 'react-native-progress';
import VideoMessage from '../components/VideoMessage';
import DocumentMessage from '../components/DocumentMessage';
import { pickDocument, getDocumentIcon, createDocumentFileData } from '../components/DocumentHandler';
import useAuthInit, { useSafeSocket } from '../hooks/useAuthInit';

// API URL
const API_URL = 'http://192.168.0.104:3000';

// Define allowed file types
const allowedTypes = {
  'image': ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
  'video': ['video/mp4', 'video/quicktime'],
  'document': ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
};

// File interface definition
interface FileInfo {
  uri: string;
  name: string;
  type: string;
  fileType: 'image' | 'video' | 'document'; // Category of file
  size?: number;
}

// Get device dimensions
const { width, height } = Dimensions.get('window');

// Define props type
type ChatScreenProps = {
  navigation?: any;
  route?: any;
};

// Reaction interfaces
interface UserReaction {
  user?: {
    id?: string;
    fullname?: string;
    urlavatar?: string;
  } | null;
  count?: number;
}

interface ReactionData {
  reaction: string;
  totalCount: number;
  userReactions: UserReaction[];
}

interface MessageReactions {
  [reactionType: string]: ReactionData;
}

// Mention interfaces
interface MentionedUser {
  id: string;
  fullname: string;
  urlavatar?: string;
}

interface MentionData {
  messageId: string;
  conversationId: string;
  sender: {
    id: string;
    fullname: string;
    urlavatar?: string;
  };
  mentionedUsers: MentionedUser[];
  isGroup: boolean;
  groupName?: string | null;
  timestamp: string;
}

// Message type definition
interface Message {
  _id: string;
  idMessage: string;
  idSender: string;
  idReceiver?: string;
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
  sentByMe?: boolean;
  tempId?: string;
  // Add sender information fields
  senderInfo?: {
    _id?: string;
    id?: string;
    fullname?: string;
    urlavatar?: string;
    phone?: string;
  };  // Reply message fields
  originalMessage?: Message;
  messageReply?: {
    idMessage: string;
    content: string;
    idSender: string;
    dateTime: string;
    type: string;
    senderInfo?: {
      id: string;
      fullname: string;
      urlavatar?: string;
    };
  };
  // Reaction fields
  reactions?: MessageReactions;
  // Mention fields
  mentionedUsers?: string[];
}

// Group user information
interface GroupUserInfo {
  id: string;
  fullname: string;
  urlavatar?: string;
  phone?: string;
  email?: string;
}

// Group info from params
interface GroupInfo {
  name: string;
  avatar?: string;
  members: string[];
  rules: {
    listIDCoOwner: string[];
    IDOwner?: string;
  };
}

// Message Action Menu component
interface MessageActionMenuProps {
  message: Message;
  onClose: () => void;
  onForward: (message: Message) => void;
  onRecall: (message: Message) => void;
  onDelete: (message: Message) => void;
  onReply: (message: Message) => void;
  onReact: (message: Message) => void;
}

const MessageActionMenu: React.FC<MessageActionMenuProps> = ({
  message,
  onClose,
  onForward,
  onRecall,
  onDelete,
  onReply,
  onReact
}) => {
  const isSentByMe = message.sentByMe;

  return (
    <TouchableOpacity
      style={styles.messageMenuOverlay}
      activeOpacity={1}
      onPress={onClose}
    >
      <View
        style={[
          styles.messageMenu,
          message.sentByMe ? styles.myMessageMenu : styles.theirMessageMenu
        ]}
      >
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onReply(message)}
        >
          <Ionicons name="arrow-undo" size={22} color="#1FAEEB" />
          <Text style={styles.menuItemText}>Trả lời</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onReact(message)}
        >
          <Ionicons name="happy" size={22} color="#1FAEEB" />
          <Text style={styles.menuItemText}>Thả cảm xúc</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onForward(message)}
        >
          <Ionicons name="arrow-redo" size={22} color="#1FAEEB" />
          <Text style={styles.menuItemText}>Chuyển tiếp</Text>
        </TouchableOpacity>

        {isSentByMe && (
          <>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => onRecall(message)}
            >
              <Ionicons name="refresh" size={22} color="#FF9500" />
              <Text style={styles.menuItemText}>Thu hồi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => onDelete(message)}
            >
              <Ionicons name="trash" size={22} color="#FF3B30" />
              <Text style={styles.menuItemText}>Xóa</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

// Hàm tạo màu sắc nhất quán cho mỗi người dùng dựa trên ID
const getUserColor = (userId: string) => {
  // Danh sách các màu sắc sẽ được sử dụng cho tên người dùng
  const colors = [
    '#FF5733', // Đỏ cam
    '#33A8FF', // Xanh dương
    '#33FF57', // Xanh lá
    '#FF33A8', // Hồng
    '#A833FF', // Tím
    '#FFB233', // Cam
    '#33FFE0', // Xanh ngọc
    '#FF5733', // Đỏ
    '#8033FF', // Tím đậm
    '#33FFA8', // Xanh mint
    '#FF3380', // Hồng đậm
    '#33FFD1', // Xanh biển nhạt
  ];

  // Tính tổng giá trị các ký tự trong userId để tạo số duy nhất
  let sum = 0;
  for (let i = 0; i < userId.length; i++) {
    sum += userId.charCodeAt(i);
  }

  // Lấy màu từ danh sách dựa trên tổng
  return colors[sum % colors.length];
};

const GroupChatScreen: React.FC<ChatScreenProps> = ({ navigation, route }) => {
  // Sử dụng hook để đảm bảo xác thực sẵn sàng
  const { isLoading: isAuthLoading, isAuthenticated } = useAuthInit();

  // Get conversation data from route params
  const conversationId = route?.params?.conversationId;
  const groupInfo = route?.params?.groupInfo || {}; // Get group info from params

  // State for UI
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false); // State cho việc tải tin nhắn cũ
  const [hasMoreOldMessages, setHasMoreOldMessages] = useState(true); // Kiểm tra xem còn tin nhắn cũ hơn không
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [dataView, setDataView] = useState<Message[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); // State for emoji picker visibility
  // Group-specific state
  const [groupMembers, setGroupMembers] = useState<{ [key: string]: GroupUserInfo }>({});
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  // Message action menu state
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showMessageActionMenu, setShowMessageActionMenu] = useState(false);
  // Reply message state
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [showReplyBar, setShowReplyBar] = useState(false);
  // Reaction state
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [selectedMessageForReaction, setSelectedMessageForReaction] = useState<Message | null>(null);
  const [availableReactions] = useState(['👍', '❤️', '😂', '😮', '😢', '😡']);

  // Mention state
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedMentions, setSelectedMentions] = useState<GroupUserInfo[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<GroupUserInfo[]>([]);

  // Function to fetch member info for group chat
  const fetchMemberInfo = async (memberId: string) => {
    try {
      // Don't fetch if already loading this member or we already have this member's data
      if (groupMembers[memberId]) return;

      console.log('Fetching info for group member:', memberId);
      setIsLoadingMembers(true);

      // Get authentication token
      const authService = require('../services/AuthService').default.getInstance();
      const token = await authService.getAccessToken();

      if (!token) {
        console.error('No access token available');
        setIsLoadingMembers(false);
        return;
      }

      // Call API to get user information
      const response = await fetch(`${API_URL}/user/${memberId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();
      if (result && result.id) {
        // API trả về kết quả trực tiếp, không có code và data
        console.log('Received info for group member:', result.fullname);

        // Save member info to state
        setGroupMembers(prev => ({
          ...prev,
          [memberId]: {
            id: memberId,
            fullname: result.fullname || 'Unknown User',
            urlavatar: result.urlavatar || '',
            phone: result.phone || '',
            email: result.email || ''
          }
        }));

        // Update message display with new sender info
        setDataView(prevMessages =>
          prevMessages.map(msg => {
            if (msg.idSender === memberId && !msg.senderInfo) {
              return {
                ...msg,
                senderInfo: {
                  id: memberId,
                  fullname: result.fullname || 'Unknown User',
                  urlavatar: result.urlavatar || ''
                }
              };
            }
            return msg;
          })
        );
      } else {
        console.log('Failed to get info for group member:', result.message);
      }
    } catch (error) {
      console.error('Error fetching group member info:', error);
    } finally {
      setIsLoadingMembers(false);
    }
  };

  // File handling state
  const [selectedFiles, setSelectedFiles] = useState<FileInfo[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Message action handlers
  const handleLongPressMessage = (message: Message) => {
    setSelectedMessage(message);
    setShowMessageActionMenu(true);
  };

  const handleCloseMessageMenu = () => {
    setShowMessageActionMenu(false);
    setSelectedMessage(null);
  };
  const handleForwardMessage = (message: Message) => {
    handleCloseMessageMenu();
    navigation.navigate('ForwardMessageScreen', { message });
  };

  const handleReplyMessage = (message: Message) => {
    handleCloseMessageMenu();
    setReplyingToMessage(message);
    setShowReplyBar(true);
    // Focus on text input
    if (textInputRef.current) {
      textInputRef.current.focus();
    }
  };
  const handleCancelReply = () => {
    setReplyingToMessage(null);
    setShowReplyBar(false);
  };

  // Reaction handlers
  const handleShowReactionPicker = (message: Message) => {
    handleCloseMessageMenu();
    setSelectedMessageForReaction(message);
    setShowReactionPicker(true);
  };

  const handleReactionSelect = (reaction: string) => {
    if (!selectedMessageForReaction) return;

    const socket = socketService.getSocket();
    const userData = socketService.getUserData();

    if (!socket || !userData) {
      Alert.alert('Lỗi', 'Không thể thêm reaction. Vui lòng thử lại.');
      return;
    }    // Check if user already has this reaction
    const currentReactions = selectedMessageForReaction.reactions || {};
    const existingReaction = currentReactions[reaction];
    const userAlreadyReacted = existingReaction?.userReactions?.some(
      ur => ur && 
            typeof ur === 'object' && 
            ur.user && 
            typeof ur.user === 'object' && 
            ur.user.id && 
            typeof ur.user.id === 'string' && 
            ur.user.id === userData.id
    );

    // Send reaction to server
    socket.emit('add_reaction', {
      IDUser: userData.id,
      IDMessage: selectedMessageForReaction.idMessage,
      reaction: reaction,
      count: userAlreadyReacted ? 0 : 1 // 0 to remove, 1 to add
    });

    setShowReactionPicker(false);
    setSelectedMessageForReaction(null);
  };

  const handleQuickReaction = (message: Message, reaction: string) => {
    const socket = socketService.getSocket();
    const userData = socketService.getUserData();

    if (!socket || !userData) {
      Alert.alert('Lỗi', 'Không thể thêm reaction. Vui lòng thử lại.');
      return;
    }    // Check if user already has this reaction
    const currentReactions = message.reactions || {};
    const existingReaction = currentReactions[reaction];
    const userAlreadyReacted = existingReaction?.userReactions?.some(
      ur => ur && 
            typeof ur === 'object' && 
            ur.user && 
            typeof ur.user === 'object' && 
            ur.user.id && 
            typeof ur.user.id === 'string' && 
            ur.user.id === userData.id
    );

    // Send reaction to server
    socket.emit('add_reaction', {
      IDUser: userData.id,
      IDMessage: message.idMessage,
      reaction: reaction,
      count: userAlreadyReacted ? 0 : 1 // 0 to remove, 1 to add
    });
  };
  const handleRecallMessage = (message: Message) => {
    handleCloseMessageMenu();
    const socket = socketService.getSocket();

    if (!socket) {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối với máy chủ. Vui lòng thử lại sau.');
      return;
    }

    // Send recall message request with the exact format required
    const recallData = {
      idMessage: message.idMessage,
      idConversation: message.idConversation
    };

    // Optimistically update UI for better user experience before server response
    setDataView(prevMessages =>
      prevMessages.map(msg =>
        msg.idMessage === message.idMessage
          ? {
            ...msg,
            isRecall: true,
            content: 'Tin nhắn đã được thu hồi',
            type: msg.type // Preserve the original message type
          }
          : msg
      )
    );

    console.log('Emitting recall_message:', recallData);
    socket.emit('recall_message', recallData);
  };
  const handleDeleteMessage = (message: Message) => {
    handleCloseMessageMenu();
    const socket = socketService.getSocket();

    if (!socket) {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối với máy chủ. Vui lòng thử lại sau.');
      return;
    }

    // Send delete message request
    const userData = socketService.getUserData();
    if (!userData || !userData.id) {
      Alert.alert('Lỗi xác thực', 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
      return;
    }

    const deleteData = {
      idMessage: message.idMessage,
      idSender: userData.id
    };

    // Optimistically update UI for sender only
    // For sender: hide the message immediately
    setDataView(prevMessages =>
      prevMessages.map(msg =>
        msg.idMessage === message.idMessage
          ? { ...msg, isRemove: true, hiddenForSender: true }
          : msg
      )
    );

    // Send delete request to server
    console.log('Emitting delete_message:', deleteData);
    socket.emit('delete_message', deleteData);
  };

  // Popular emoji list for the emoji picker
  const emojiList = [
    "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃",
    "😉", "😊", "😇", "😍", "🥰", "😘", "😗", "😚", "😙", "😋",
    "😛", "😜", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨",
    "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔",
    "❤️", "💙", "💚", "💛", "💜", "🖤", "💔", "❣️", "💕", "💞",
    "👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "👊", "👏", "🙏"
  ];
  // Function to handle emoji selection
  const handleEmojiSelect = (emoji: string) => {
    setMessageText(prevText => prevText + emoji);
    // No longer closing the emoji picker after selection
  };

  // Get socket service instance
  const socketService = SocketService.getInstance();

  // References
  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<TextInput>(null);
  // Format time for display
  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };  // Function to scroll to bottom of messages
  const scrollToBottom = () => {
    if (flatListRef.current && dataView.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  // Function to scroll to a specific message by ID
  const scrollToMessage = (messageId: string) => {
    if (!flatListRef.current || !dataView.length) return;
    
    const messageIndex = dataView.findIndex(msg => 
      msg.idMessage === messageId || msg._id === messageId
    );
    
    if (messageIndex !== -1) {
      // Scroll to the found message with animation
      flatListRef.current.scrollToIndex({
        index: messageIndex,
        animated: true,
        viewPosition: 0.5 // Center the message in the view
      });
      
      // Optional: Add a brief highlight effect to the target message
      console.log(`Scrolled to message at index ${messageIndex}`);
    } else {
      console.log('Original message not found in current view');
      // Could show a toast notification here if desired
    }
  };

  // Handle tapping on quoted message to scroll to original
  const handleQuotedMessagePress = (originalMessage: any) => {
    if (originalMessage && (originalMessage.idMessage || originalMessage._id)) {
      scrollToMessage(originalMessage.idMessage || originalMessage._id);
    }
  };
  // Auto scroll to bottom when view is ready or messages change
  useEffect(() => {
    if (dataView.length > 0) {
      setTimeout(scrollToBottom, 100);
    }
  }, [dataView.length]);
  
  // Thêm useEffect để cập nhật khi người dùng quay lại màn hình
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('GroupChatScreen is focused - updating messages and members');

      // Đảm bảo chúng ta có conversationId hợp lệ
      const idConversationParam = route.params?.idConversation || conversationId;
      if (!idConversationParam) return;

      // Tải lại tin nhắn để đảm bảo hiển thị thông báo hệ thống mới nhất
      loadMessages(idConversationParam);

      // Lấy thông tin nhóm mới nhất nếu có
      const socket = socketService.getSocket();
      if (socket && socket.connected) {
        const userData = socketService.getUserData();
        if (userData && userData.id) {
          console.log('Requesting updated group info after returning to screen');
          // Yêu cầu thông tin nhóm cập nhật từ server
          socket.emit('get_group_info', {
            IDUser: userData.id,
            IDConversation: idConversationParam
          });

          // Lắng nghe phản hồi một lần
          socket.once('group_info_response', (response) => {
            console.log('Received updated group info:', response);
            if (response && response.success && response.conversation) {
              // Cập nhật thông tin nhóm với thông tin mới nhất từ server
              const updatedInfo = {
                name: response.conversation.groupName || groupInfo.name,
                avatar: response.conversation.groupAvatar || groupInfo.avatar,
                members: response.conversation.groupMembers || groupInfo.members,
                rules: response.conversation.rules || groupInfo.rules
              };

              // Cập nhật params cho màn hình
              navigation.setParams({ groupInfo: updatedInfo });
            }
          });
        }
      }
    });

    return unsubscribe;
  }, [navigation, conversationId]);
  // Load group members info
  useEffect(() => {
    // Check if we're in a group chat
    if (groupInfo && groupInfo.members && groupInfo.members.length > 0) {
      console.log('Loading group members info:', groupInfo.members.length, 'members');

      // Sử dụng Promise.all để tải song song thông tin các thành viên
      const loadAllMembersInfo = async () => {
        try {
          console.log('Bắt đầu tải thông tin tất cả thành viên nhóm');
          setIsLoadingMembers(true);

          // Lấy token xác thực một lần cho tất cả request
          const authService = require('../services/AuthService').default.getInstance();
          const token = await authService.getAccessToken();

          if (!token) {
            console.error('No access token available');
            setIsLoadingMembers(false);
            return;
          }

          // Tạo mảng promise cho tất cả các thành viên
          const memberPromises = groupInfo.members.map(async (memberId) => {
            // Bỏ qua các thành viên đã có thông tin
            if (groupMembers[memberId]) return null;

            try {
              console.log('Fetching info for group member:', memberId);
              const response = await fetch(`${API_URL}/user/${memberId}`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                }
              });

              // Kiểm tra response trước khi parse JSON
              if (!response.ok) {
                console.log(`Error fetching member ${memberId}: Status ${response.status}`);
                return null;
              }

              // Kiểm tra Content-Type
              const contentType = response.headers.get('content-type');
              if (!contentType || !contentType.includes('application/json')) {
                console.log(`Invalid content type for member ${memberId}: ${contentType}`);
                return null;
              }

              try {
                const result = await response.json();
                return { id: memberId, data: result };
              } catch (error) {
                console.error(`Error parsing JSON for member ${memberId}:`, error);
                return null;
              }
            } catch (error) {
              console.error(`Error fetching info for member ${memberId}:`, error);
              return null;
            }
          });

          // Chờ tất cả các request hoàn thành
          const results = await Promise.all(memberPromises);

          // Xử lý kết quả trả về
          const newMembers = {};
          results.forEach(result => {
            if (result && result.data) {
              const { id, data } = result;
              newMembers[id] = {
                id: id,
                fullname: data.fullname || 'Unknown User',
                urlavatar: data.urlavatar || '',
                phone: data.phone || '',
                email: data.email || ''
              };
            }
          });

          // Cập nhật state một lần duy nhất với tất cả thông tin thành viên
          if (Object.keys(newMembers).length > 0) {
            setGroupMembers(prev => ({
              ...prev,
              ...newMembers
            }));

            // Cập nhật thông tin sender cho tất cả tin nhắn
            setDataView(prevMessages =>
              prevMessages.map(msg => {
                const memberInfo = newMembers[msg.idSender];
                if (memberInfo && !msg.senderInfo) {
                  return {
                    ...msg,
                    senderInfo: {
                      id: memberInfo.id,
                      fullname: memberInfo.fullname,
                      urlavatar: memberInfo.urlavatar
                    }
                  };
                }
                return msg;
              })
            );
          }

          console.log('Hoàn thành tải thông tin tất cả thành viên nhóm');
        } catch (error) {
          console.error('Error loading all members info:', error);
        } finally {
          setIsLoadingMembers(false);
        }
      };

      // Gọi hàm tải thông tin tất cả thành viên
      loadAllMembersInfo();
    }
  }, [groupInfo]);

  // Connect to socket and load messages
  useEffect(() => {
    // Ensure socket service is connected
    if (!socketService.isConnected()) {
      socketService.initialize().then(() => {
        console.log("Socket initialized successfully");
        // After successful initialization, get the socket and continue setup
        const socketAfterInit = socketService.getSocket();
        if (socketAfterInit) {
          continueWithSocketSetup(socketAfterInit);

          // Đăng ký sự kiện tái kết nối để đảm bảo tin nhắn luôn được gửi đi
          socketAfterInit.on('reconnect', () => {
            console.log('Socket reconnected - re-establishing chat connection');
            // Khi kết nối lại, thiết lập lại các listener và tải lại tin nhắn
            setupSocketListeners(socketAfterInit);
            const idConversationParam = route.params?.idConversation || conversationId;
            if (idConversationParam) {
              loadMessages(idConversationParam);
            }
          });
        }
      }).catch(err => {
        console.error("Socket initialization error:", err);
        setIsLoading(false);
      });
    } else {
      // Socket is already connected, proceed with setup
      const socket = socketService.getSocket();
      if (socket) {
        continueWithSocketSetup(socket);

        // Đăng ký sự kiện tái kết nối cho socket đã kết nối
        socket.on('reconnect', () => {
          console.log('Socket reconnected - re-establishing chat connection');
          // Khi kết nối lại, thiết lập lại các listener và tải lại tin nhắn
          setupSocketListeners(socket);
          const idConversationParam = route.params?.idConversation || conversationId;
          if (idConversationParam) {
            loadMessages(idConversationParam);
          }
        });
      } else {
        console.error("Could not get socket instance");
        setIsLoading(false);
      }
    }

    // Function to continue with socket setup after ensuring connection
    function continueWithSocketSetup(socket) {
      // Check parameters used to load messages
      const idConversationParam = route.params?.idConversation;
      console.log("Conversation params:", {
        'route.params.conversationId': conversationId,
        'route.params.idConversation': idConversationParam
      });

      // Use the correct parameter for loading messages
      const conversationIdToUse = idConversationParam || conversationId;

      if (!conversationIdToUse) {
        console.error("No conversation ID available to load messages");
        setIsLoading(false);
        return;
      }

      // Setup socket event handlers for this screen
      setupSocketListeners(socket);

      // Load messages for this conversation
      console.log("Loading messages for conversation:", conversationIdToUse);
      loadMessages(conversationIdToUse);
    }      // Cleanup on unmount
    return () => {      // Remove only the listeners we added in this screen, don't disconnect the socket
      const cleanupSocket = socketService.getSocket();
      if (cleanupSocket) {
        cleanupSocket.off('load_messages_response');
        cleanupSocket.off('receive_message');
        cleanupSocket.off('send_message_success');
        cleanupSocket.off('users_status');
        cleanupSocket.off('recall_message_success');        cleanupSocket.off('message_recalled');
        cleanupSocket.off('delete_message_success');
        cleanupSocket.off('forward_message_success');        cleanupSocket.off('reply_message_success');
        cleanupSocket.off('message_reaction_updated');
        cleanupSocket.off('user_mentioned');
        cleanupSocket.off('mention_user_response');
        // Remove additional listeners for group updates
        cleanupSocket.off('group_info_updated');
        cleanupSocket.off('member_added_to_group');
        cleanupSocket.off('member_removed_from_group');
        cleanupSocket.off('group_owner_changed');
        cleanupSocket.off('member_promoted_to_admin');
        cleanupSocket.off('member_demoted_from_admin');
        cleanupSocket.off('group_deleted');
      }
    };
  }, []);  // Setup socket listeners specific to this screen
  const setupSocketListeners = (socket: Socket) => {    // First remove any existing listeners to avoid duplicates
    socket.off('load_messages_response');
    socket.off('receive_message');
    socket.off('send_message_success');
    socket.off('users_status');
    socket.off('recall_message_success');
    socket.off('message_recalled');
    socket.off('delete_message_success');
    socket.off('forward_message_success');
    socket.off('reply_message_success');
    socket.off('group_info_updated');
    socket.off('member_added_to_group');
    socket.off('member_removed_from_group');
    socket.off('group_owner_changed');    socket.off('member_promoted_to_admin');
    socket.off('member_demoted_from_admin');
    socket.off('group_deleted');
    socket.off('user_mentioned');    socket.off('mention_user_response');// Load messages response handler
    socket.on('load_messages_response', async (data) => {
      console.log('Messages received:', data);
      setIsLoading(false);
      setIsLoadingOlder(false);

      console.log('Debug - hasMessages:', data && data.messages && data.messages.length > 0);
      console.log('Debug - messages count:', data?.messages?.length || 0);
      console.log('Debug - message direction:', data?.direction || 'newer');

      if (data && data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
        // Process messages
        const userData = socketService.getUserData();
        const userId = userData?.id || ''; // Fallback if not available

        console.log('Processing messages, current user ID:', userId);
        console.log('First message in response:', data.messages[0]);            // First map to add sentByMe flag and handle senderInfo
        const processedMessages = data.messages.map((msg: Message) => {
          // Xác định lại idSender của tin nhắn có trùng với userId hiện tại không
          // Đảm bảo rằng khi đăng nhập tài khoản khác, tin nhắn sẽ được phân loại đúng
          const sentByMe = msg.idSender === userId;

          console.log(`Processing message ${msg.idMessage}, sentByMe: ${sentByMe}, sender: ${msg.idSender}, current user: ${userId}`);

          // If this is a group chat and the message doesn't have senderInfo
          if (!msg.senderInfo && msg.idSender) {
            // Check if we already have this sender's info in our groupMembers state
            const senderInfo = groupMembers[msg.idSender];
            if (senderInfo) {
              return {
                ...msg,
                sentByMe,
                senderInfo: {
                  id: senderInfo.id,
                  fullname: senderInfo.fullname,
                  urlavatar: senderInfo.urlavatar
                }
              };
            } else {
              // Fetch this user's info if we don't have it yet
              fetchMemberInfo(msg.idSender);

              // Return message with sentByMe flag even if we don't have sender info yet
              return {
                ...msg,
                sentByMe
              };
            }
          }          return {
            ...msg,
            sentByMe
          };
        });        // Process reply messages to fetch original messages if needed
        const messagesWithReplies = await Promise.all(processedMessages.map(async (msg) => {
          // If this is a reply message, handle the messageReply field from backend
          if (msg.isReply && (msg.messageReply || msg.idMessageReply)) {
            try {
              // Check if we already have originalMessage from the backend messageReply field
              if (msg.messageReply && msg.messageReply.idMessage) {
                console.log('Processing reply message with messageReply from backend:', msg.idMessage);
                // Backend provides messageReply object - use it as originalMessage
                return {
                  ...msg,
                  originalMessage: {
                    idMessage: msg.messageReply.idMessage,
                    content: msg.messageReply.content,
                    idSender: msg.messageReply.idSender,
                    dateTime: msg.messageReply.dateTime,
                    type: msg.messageReply.type,
                    senderInfo: msg.messageReply.senderInfo
                  }
                };
              }
              
              // If messageReply exists but incomplete, or if we only have idMessageReply
              if (msg.idMessageReply) {
                console.log('Looking for original message locally for reply:', msg.idMessage, 'idMessageReply:', msg.idMessageReply);
                
                // Try to find the original message in current messages first
                let originalMessage = processedMessages.find(m => m.idMessage === msg.idMessageReply);
                
                // If not found in current batch, try in existing dataView
                if (!originalMessage) {
                  originalMessage = dataView.find(m => m.idMessage === msg.idMessageReply);
                }
                
                if (originalMessage) {
                  console.log('Found original message locally for reply:', msg.idMessage);
                  return {
                    ...msg,
                    originalMessage: originalMessage
                  };
                } else {
                  console.log('Could not find original message for reply:', msg.idMessage, 'idMessageReply:', msg.idMessageReply);
                  // Return message as is - the reply will show without original message quote
                  return msg;
                }
              }
            } catch (error) {
              console.log('Error processing reply message:', error);
            }
          }
          return msg;
        }));// Filter out messages that should be hidden for the sender (deleted messages)
        const filteredMessages = messagesWithReplies.filter(msg => {
          // If message is marked as removed AND was sent by current user, hide it
          if (msg.isRemove && msg.idSender === userId) {
            return false; // Filter out this message
          }
          return true; // Keep all other messages
        });

        console.log(`After filtering, have ${filteredMessages.length} messages to display`);
        
        // Debug: Log reply messages to see what we have
        const replyMessages = filteredMessages.filter(msg => msg.isReply);
        console.log(`Found ${replyMessages.length} reply messages after processing`);
        replyMessages.forEach(msg => {
          console.log(`Reply message ${msg.idMessage}:`, {
            hasOriginalMessage: !!msg.originalMessage,
            hasMessageReply: !!msg.messageReply,
            idMessageReply: msg.idMessageReply,
            originalMessageId: msg.originalMessage?.idMessage
          });
        });

        // Update hasMoreOldMessages based on server response
        if (data.hasMore !== undefined) {
          setHasMoreOldMessages(data.hasMore);
          console.log('Server indicated hasMore:', data.hasMore);
        } else {
          // If server doesn't return hasMore, default to false
          setHasMoreOldMessages(false);
          console.log('Server did not indicate hasMore, defaulting to false');
        }

        // Determine if these are older messages
        const isOlderMessages = data.direction === 'older';
        console.log('Loading message direction:', isOlderMessages ? 'older' : 'newer');

        if (isOlderMessages) {
          console.log(`Received ${filteredMessages.length} older messages`);

          // Không cần đảo ngược nếu tin nhắn đã được sắp xếp theo thứ tự cũ nhất -> mới nhất
          // Server đã trả về tin nhắn theo thứ tự từ cũ nhất đến mới nhất
          const olderMessages = [...filteredMessages];

          setDataView(prevMessages => {
            // Create Set of existing message IDs to check for duplicates faster
            const existingIds = new Set(prevMessages.map(msg =>
              msg._id || msg.idMessage
            ));

            // Filter messages to avoid duplicates
            const uniqueNewMessages = olderMessages.filter(msg =>
              !existingIds.has(msg._id || msg.idMessage)
            );

            console.log(`Adding ${uniqueNewMessages.length} unique older messages to the list`);
            
            // Kiểm tra các tin nhắn hệ thống để xử lý đặc biệt
            const systemMessages = uniqueNewMessages.filter(msg => 
              msg.idSender === 'system' || msg.type === 'system'
            );
            
            if (systemMessages.length > 0) {
              console.log(`Found ${systemMessages.length} system messages in older messages`);
            }

            // Combine messages in correct order: older messages on top, newer below
            return [...uniqueNewMessages, ...prevMessages];
          });
          
          // Không cuộn xuống khi tải tin nhắn cũ
        } else {
          // Initial message load, replace the entire list
          const sortedMessages = [...filteredMessages].reverse();

          // Debug log message count before setting state
          console.log(`Setting dataView with ${sortedMessages.length} messages`);

          // Force update with new messages - this is critical
          setDataView([...sortedMessages]);

          // Scroll to bottom after loading initial new messages
          setTimeout(() => {
            scrollToBottom();
          }, 100);
        }
      } else {
        // Log if no messages were found
        console.log('No messages found in response or invalid messages format');

        // If not loading older messages, set empty list
        if (!isLoadingOlder) {
          setDataView([]);
        }
        // No more older messages
        setHasMoreOldMessages(false);
      }
    });

    // Listen for user status update
    socket.on('users_status', (data) => {
      console.log('Received users status:', data);
      if (data && data.statuses) {
        // In group chat, we can update online status for all group members
        if (groupInfo?.members && groupInfo.members.length > 0) {
          // Filter statuses to only include group members
          const groupMemberStatuses = {};
          groupInfo.members.forEach(memberId => {
            if (data.statuses[memberId] !== undefined) {
              groupMemberStatuses[memberId] = data.statuses[memberId];
            }
          });

          console.log('Group member statuses:', groupMemberStatuses);
        }
      }
    });    // Listen for receive message event (real-time message receiving)
    socket.on('receive_message', (data) => {
      console.log('New message received (real-time):', data);
      
      // Chuẩn hóa dữ liệu - trong một số trường hợp, message đến có thể nằm trong data.message
      const newMessage = data.message || data;
      
      // Add the new message to the chat immediately
      if (newMessage) {
        // Get user ID from the socket service
        const userData = socketService.getUserData();
        const userId = userData?.id || ''; // Fallback if not available
        const sentByMe = newMessage.idSender === userId;
        
        // Đặc biệt xử lý tin nhắn hệ thống
        const isSystemMessage = newMessage.idSender === 'system' || newMessage.type === 'system';
        
        // Check if the message belongs to current conversation
        const idConversationParam = route.params?.idConversation || conversationId;
        
        // Sử dụng log để debug
        console.log('Received message conversation check:', {
          messageConversation: newMessage.idConversation,
          routeConversation: route.params?.idConversation,
          conversationId: conversationId,
          idConversationParam: idConversationParam,
          isSystemMessage: isSystemMessage
        });
        
        // Kiểm tra conversation ID linh hoạt hơn
        const currentConversationIDs = [
          idConversationParam, 
          conversationId,
          route.params?.conversation?.idConversation,
          data.conversationId // Thêm trường conversationId từ payload
        ].filter(Boolean);
        
        const isForCurrentConversation = currentConversationIDs.some(id => 
          id === newMessage.idConversation
        );
        
        if (!isForCurrentConversation && !isSystemMessage) {
          console.log('Message is for another conversation:', newMessage.idConversation, 'current:', idConversationParam);
          
          // Special handling for forwarded messages - don't return early if this is the active conversation
          // Even if route.params.idConversation is not set correctly
          if (conversationId && newMessage.idConversation === conversationId) {
            console.log('But this appears to be the active conversation by conversationId, showing message anyway');
          } else {
            return;
          }
        }

        // Acknowledge message receipt immediately
        socket.emit('message_received', {
          messageId: newMessage._id || newMessage.idMessage,
          userId: userId
        });

        // For group chat, ensure we have sender info
        if (!sentByMe && !newMessage.senderInfo && newMessage.idSender) {
          // Check if we have this sender's info in our state
          const senderInfo = groupMembers[newMessage.idSender];
          if (!senderInfo) {
            // If not, fetch it
            fetchMemberInfo(newMessage.idSender);
          }
        }        // Add new message to state with enhanced duplicate detection
        setDataView(prevMessages => {
          // Kiểm tra nhiều tiêu chí để phát hiện trùng lặp
          // 1. Kiểm tra ID chính thức
          // 2. Kiểm tra tin nhắn tạm (bằng nội dung và người gửi)
          const isDuplicate = prevMessages.some(msg => 
            // Kiểm tra ID chính thức
            msg._id === newMessage._id || 
            msg.idMessage === newMessage.idMessage ||
            // Kiểm tra tin nhắn tạm với nội dung và người gửi giống nhau
            (msg._id?.startsWith('temp-') && 
             msg.idSender === newMessage.idSender && 
             msg.content === newMessage.content &&
             // Đảm bảo chỉ kiểm tra trong khoảng thời gian gần (30 giây)
             new Date().getTime() - new Date(msg.dateTime).getTime() < 30000)
          );

          console.log(`Received message: ${newMessage.idMessage}, isDuplicate: ${isDuplicate}`);
          
          if (isDuplicate) {
            console.log('Duplicate message detected, updating temporary message');
            
            // Thay thế tin nhắn tạm bằng tin nhắn chính thức tại vị trí hiện tại của tin nhắn tạm
            return prevMessages.map(msg => {
              // Nếu đây là tin nhắn tạm tương ứng với tin nhắn vừa nhận
              if (msg._id?.startsWith('temp-') && 
                  msg.content === newMessage.content && 
                  msg.idSender === newMessage.idSender) {
                console.log('Replacing temporary message with official one');                return {
                  ...newMessage,
                  sentByMe,
                  // Preserve original message from temp message or use backend data
                  originalMessage: msg.originalMessage || newMessage.originalMessage || (newMessage.messageReply ? {
                    idMessage: newMessage.messageReply.idMessage,
                    content: newMessage.messageReply.content,
                    idSender: newMessage.messageReply.idSender,
                    dateTime: newMessage.messageReply.dateTime,
                    type: newMessage.messageReply.type,
                    senderInfo: newMessage.messageReply.senderInfo
                  } : undefined)
                };
              }
              return msg;
            });
          }          // Nếu không phải tin nhắn trùng lặp, thêm vào cuối danh sách
          const updatedMessages = [...prevMessages, {
            ...newMessage,
            sentByMe,
            // Handle originalMessage from backend - check both fields
            originalMessage: newMessage.originalMessage || (newMessage.messageReply ? {
              idMessage: newMessage.messageReply.idMessage,
              content: newMessage.messageReply.content,
              idSender: newMessage.messageReply.idSender,
              dateTime: newMessage.messageReply.dateTime,
              type: newMessage.messageReply.type,
              senderInfo: newMessage.messageReply.senderInfo
            } : undefined)
          }];

          // Đảm bảo cuộn xuống sau khi thêm tin nhắn
          setTimeout(scrollToBottom, 10);

          return updatedMessages;
        });
      }
    });    // Listen for send message success
    socket.on('send_message_success', (response) => {
      console.log('Group message sent successfully:', response);

      // Add the message to the chat
      if (response && response.message) {
        const message = response.message;

        // Check if the message belongs to current conversation
        const idConversationParam = route.params?.idConversation || conversationId;
        if (message.idConversation !== idConversationParam) {
          console.log('Message success is for another conversation, ignoring');
          return;
        }

        // Get user ID from the socket service
        const userData = socketService.getUserData();
        const userId = userData?.id || ''; // Fallback if not available
        const sentByMe = message.idSender === userId;
        
        // Handle message from current user
        if (sentByMe) {
          setDataView(prevMessages => {
            // Find temporary message with matching ID or content
            const tempIndex = prevMessages.findIndex(msg =>
              (msg._id && msg._id.startsWith('temp-') && msg.content === message.content) ||
              (msg.tempId && msg.tempId === response.tempId)
            );

            // Log for debugging
            console.log(`Processing sent message success. Found temp message: ${tempIndex !== -1}, temp ID: ${response.tempId}, message ID: ${message.idMessage}`);            // If found temporary message, replace with official message
            if (tempIndex !== -1) {
              console.log('Replacing temporary message with official message');              const updatedMessages = [...prevMessages];
              updatedMessages[tempIndex] = {
                ...message,
                sentByMe,
                // Handle originalMessage from backend response
                originalMessage: message.originalMessage || (message.messageReply ? {
                  idMessage: message.messageReply.idMessage,
                  content: message.messageReply.content,
                  idSender: message.messageReply.idSender,
                  dateTime: message.messageReply.dateTime,
                  type: message.messageReply.type,
                  senderInfo: message.messageReply.senderInfo
                } : undefined)
              };
              return updatedMessages;
            }
            
            // Kiểm tra kỹ xem tin nhắn đã có trong danh sách chưa
            const messageExists = prevMessages.some(msg => 
              msg.idMessage === message.idMessage || 
              msg._id === message._id ||
              (msg.content === message.content && 
               msg.idSender === userId &&
               new Date(msg.dateTime).getTime() > Date.now() - 10000) // Tin nhắn có cùng nội dung trong 10 giây gần đây
            );
            
            if (messageExists) {
              console.log('Message already exists in chat, not adding duplicate');
              return prevMessages;
            }
            
            // Không thêm tin nhắn mới nếu không tìm thấy tin nhắn tạm thời
            // Tin nhắn chính thức sẽ đến qua sự kiện receive_message
            console.log('No temporary message found, waiting for receive_message event');
            return prevMessages;
          });
        }

        // Scroll down immediately
        scrollToBottom();
      }
    });

    // Listen for message recall events
    socket.on('recall_message_success', (data) => {
      console.log('Recall message success (sender):', data);
      if (data && data.messageId && data.success) {
        // Update the UI to show recalled message for the sender
        setDataView(prevMessages =>
          prevMessages.map(msg =>
            msg.idMessage === data.messageId
              ? { ...msg, isRecall: true, content: 'Tin nhắn đã được thu hồi' }
              : msg
          )
        );
      }
    });

    // Listen for message recalled (for receiver)
    socket.on('message_recalled', (data) => {
      console.log('Message recalled (receiver):', data);
      if (data && data.messageId && data.updatedMessage) {
        // Update the UI with the recalled message data from server
        setDataView(prevMessages =>
          prevMessages.map(msg =>
            msg.idMessage === data.messageId
              ? {
                ...data.updatedMessage,
                sentByMe: msg.sentByMe // Preserve the sentByMe flag
              }
              : msg
          )
        );
      }
    });

    // Listen for message delete events
    socket.on('delete_message_success', (data) => {
      console.log('Message deleted:', data);
      if (data && data.messageId && data.updatedMessage) {
        // Get user data to determine if current user is the sender
        const userData = socketService.getUserData();
        const currentUserId = userData?.id;

        // For the sender: remove the message completely
        // For the receiver: keep the message as is (no changes)
        setDataView(prevMessages =>
          prevMessages.filter(msg => {
            // If this is the deleted message
            if (msg.idMessage === data.messageId) {
              // If current user is the sender, remove the message
              if (data.updatedMessage.idSender === currentUserId) {
                return false; // Filter out this message for sender
              }
              // For receiver, keep the message with unchanged content
              return true;
            }
            // Keep all other messages
            return true;
          }).map(msg => {
            // If this is the deleted message and user is receiver
            if (msg.idMessage === data.messageId && data.updatedMessage.idSender !== currentUserId) {
              // For receiver, update the message but keep all content visible
              return {
                ...msg,
                ...data.updatedMessage,
                sentByMe: msg.sentByMe // Preserve the sentByMe flag
              };
            }
            return msg;
          })
        );
      }
    });    // Listen for reply message success
    socket.on('reply_message_success', (data) => {
      console.log('Reply message sent successfully:', data);
      
      // Debug: Log the message structure
      if (data && data.message) {
        console.log('Reply message structure:', {
          hasOriginalMessage: !!data.message.originalMessage,
          hasMessageReply: !!data.message.messageReply,
          isReply: data.message.isReply,
          idMessageReply: data.message.idMessageReply
        });
      }
      
      if (data && data.message) {
        const message = data.message;

        // Check if the message belongs to current conversation
        const idConversationParam = route.params?.idConversation || conversationId;
        if (message.idConversation !== idConversationParam) {
          console.log('Reply message success is for another conversation, ignoring');
          return;
        }

        // Get user ID from the socket service
        const userData = socketService.getUserData();
        const userId = userData?.id || '';
        const sentByMe = message.idSender === userId;
        
        // Handle message from current user
        if (sentByMe) {
          setDataView(prevMessages => {
            // Find temporary message with matching ID or content
            const tempIndex = prevMessages.findIndex(msg =>
              (msg._id && msg._id.startsWith('temp-') && msg.content === message.content) ||
              (msg.tempId && msg.tempId === data.tempId)
            );            if (tempIndex !== -1) {
              console.log('Replacing temporary reply message with official message');              const updatedMessages = [...prevMessages];
              updatedMessages[tempIndex] = {
                ...message,
                sentByMe,
                // Handle originalMessage from backend response
                originalMessage: message.originalMessage || (message.messageReply ? {
                  idMessage: message.messageReply.idMessage,
                  content: message.messageReply.content,
                  idSender: message.messageReply.idSender,
                  dateTime: message.messageReply.dateTime,
                  type: message.messageReply.type,
                  senderInfo: message.messageReply.senderInfo
                } : undefined)
              };
              return updatedMessages;
            }
            
            // Check if message already exists
            const messageExists = prevMessages.some(msg => 
              msg.idMessage === message.idMessage || 
              msg._id === message._id
            );
            
            if (messageExists) {
              console.log('Reply message already exists in chat, not adding duplicate');
              return prevMessages;
            }
            
            return prevMessages;
          });
        }

        // Scroll down immediately
        scrollToBottom();
      }
    });
    // Listener for group info updates (name, avatar, etc.) - consolidated with better messaging
    socket.on('group_info_updated', (data) => {
      console.log('Group info updated:', data);
      if (data && data.success && data.conversation) {
        // Update group info in UI
        const updatedInfo = {
          name: data.conversation.groupName || groupInfo.name,
          avatar: data.conversation.groupAvatar || groupInfo.avatar,
          members: groupInfo.members // Keep existing members for now
        };

        // Tạo thông báo chi tiết hơn dựa trên loại cập nhật
        let updateMessage = `${data.updatedBy ? data.updatedBy.fullname : 'Ai đó'} đã cập nhật thông tin nhóm`;

        // Xác định cụ thể đã thay đổi gì
        if (data.conversation.groupName !== groupInfo.name) {
          updateMessage = `${data.updatedBy ? data.updatedBy.fullname : 'Ai đó'} đã đổi tên nhóm thành "${data.conversation.groupName}"`;
        } else if (data.conversation.groupAvatar !== groupInfo.avatar) {
          updateMessage = `${data.updatedBy ? data.updatedBy.fullname : 'Ai đó'} đã thay đổi ảnh nhóm`;
        }

        // Thêm thông báo hệ thống vào tin nhắn
        const systemMessage: Message = {
          _id: `system-${Date.now()}`,
          idMessage: `system-${Date.now()}`,
          idSender: 'system',
          idConversation: conversationId,
          type: 'system',
          content: updateMessage,
          dateTime: new Date().toISOString(),
          isRead: true,
          isRecall: false,
          isReply: false,
          isForward: false,
          isRemove: false,
          idMessageReply: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          __v: 0
        };

        // Cập nhật thông tin nhóm
        navigation.setParams({ groupInfo: updatedInfo });

        // Thêm tin nhắn hệ thống vào danh sách tin nhắn
        setDataView(prevMessages => [...prevMessages, systemMessage]);
        setTimeout(scrollToBottom, 100);
      }
    });  // New listener: New member added to group - enhanced to handle multiple data formats
    socket.on('member_added_to_group', (data) => {
      console.log('Member added to group:', data);
      
      // Handle multiple data formats that could come from server
      if (data) {
        let newMembers: any[] = [];
        let addedBy: any = null;
        let idConversationFromEvent = null;
        
        // Check for different data structures the server might send
        if (data.success && data.newMembers && data.newMembers.length > 0) {
          newMembers = data.newMembers;
          addedBy = data.addedBy;
          idConversationFromEvent = data.conversation?.idConversation;
        } else if (data.success && data.members && data.members.length > 0) {
          // Alternative format the server might use
          newMembers = data.members;
          addedBy = data.addedBy || { id: data.IDUser, fullname: data.IDUser };
          idConversationFromEvent = data.conversation?.idConversation || data.IDConversation;
        } else if (data.conversation && data.conversation.groupMembers) {
          // Direct conversation update format
          idConversationFromEvent = data.conversation.idConversation;
          const currentMembers = groupInfo.members || [];
          // Find new members by comparing with current members
          const addedMemberIds = data.conversation.groupMembers.filter(
            (id: string) => !currentMembers.includes(id)
          );
          
          // If we have member info directly
          if (data.members && data.members.length > 0) {
            newMembers = data.members;
          } else {
            // Otherwise create placeholder entries for the new IDs
            newMembers = addedMemberIds.map((id: string) => ({ id, fullname: id }));
          }
          
          // Use provided or fallback info for who added the members
          addedBy = data.addedBy || { id: data.IDUser, fullname: data.IDUser || 'Ai đó' };
        }
          // Check if event belongs to current conversation - more flexible matching for conversation IDs
        const idConversationParam = route.params?.idConversation || conversationId;
        
        // Make conversation ID matching more flexible by checking all possible ID sources
        const currentConversationIDs = [
          idConversationParam, 
          conversationId,
          route.params?.conversation?.idConversation,
          route.params?.conversation?.id
        ].filter(Boolean); // Filter out undefined/null values
        
        // Enhanced check: the event is for current conversation if any of our IDs match
        const isForCurrentConversation = currentConversationIDs.some(id => 
          id === idConversationFromEvent || 
          id === data.conversation?.idConversation ||
          id === data.IDConversation
        );
        
        console.log('Member add event conversation check:', {
          currentConversationIDs,
          idConversationFromEvent,
          conversationFromData: data.conversation?.idConversation || data.IDConversation,
          isForCurrentConversation
        });

        // Only proceed if we found new members and this appears to be for current conversation
        // More permissive check to ensure notifications are shown
        if (newMembers.length > 0 && (isForCurrentConversation || !idConversationFromEvent)) {
          console.log('Processing new members:', newMembers);
          
          // Extract just the IDs for updating the members list
          const newMemberIds = newMembers.map(m => m.id);
          
          // Update group members in UI - avoid duplicates
          const currentMembers = groupInfo.members || [];
          const uniqueNewMemberIds = newMemberIds.filter(id => !currentMembers.includes(id));
          
          if (uniqueNewMemberIds.length === 0) {
            console.log('No new unique members to add');
            return;
          }
          
          const updatedMembers = [...currentMembers, ...uniqueNewMemberIds];
          const updatedInfo = {
            ...groupInfo,
            members: updatedMembers
          };

          // Update group info in route params
          navigation.setParams({ groupInfo: updatedInfo });

          // Get new members names
          const newMembersNames = newMembers.map(m => m.fullname || m.id || 'Unknown User').join(', ');

          // Create detailed system message showing who added whom
          const systemMessageId = `system-add-${Date.now()}`;
          const systemMessage: Message = {
            _id: systemMessageId,
            idMessage: systemMessageId,
            idSender: 'system',
            idConversation: conversationId || idConversationFromEvent || (data.conversation && data.conversation.idConversation),
            type: 'system',
            content: `${addedBy?.fullname || 'Ai đó'} đã thêm ${newMembersNames} vào nhóm`,
            dateTime: new Date().toISOString(),
            isRead: true,
            isRecall: false,
            isReply: false,
            isForward: false,
            isRemove: false,
            idMessageReply: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            __v: 0
          };

          // Add system message to message list, avoiding duplicates
          setDataView(prevMessages => {
            // Check if a very similar message was added in the last minute
            const isDuplicate = prevMessages.some(msg => 
              msg.type === 'system' &&
              msg.content === systemMessage.content &&
              new Date(msg.dateTime).getTime() > Date.now() - 60000
            );
            
            if (isDuplicate) {
              console.log('Duplicate system message detected, not adding');
              return prevMessages;
            }
            
            console.log('Adding system message about new members');
            const newMessages = [...prevMessages, systemMessage];
            
            // Đảm bảo tin nhắn xuất hiện ngay lập tức
            setTimeout(scrollToBottom, 100);
            
            return newMessages;
          });

          // Fetch info for new members
          newMembers.forEach(member => {
            if (member && member.id) {
              fetchMemberInfo(member.id);
            }
          });
        }
      }
    });
    // New listener: Member removed from group
    socket.on('member_removed_from_group', (data) => {
      console.log('Member removed from group:', data);
      if (data && data.removedMember) {
        // Check if current user was removed
        const userData = socketService.getUserData();
        const currentUserId = userData?.id;

        if (data.removedMember.id === currentUserId) {
          // Current user was removed from the group - navigate immediately
          Alert.alert('Thông báo', `${data.message || 'Bạn đã bị xóa khỏi nhóm'}`, [
            { text: 'OK', onPress: () => navigation.navigate('HomeScreen') }
          ]);
          return;
        }

        // Update group members in UI (remove the member)
        const updatedMembers = (groupInfo.members || []).filter(m => m !== data.removedMember.id);
        const updatedInfo = {
          ...groupInfo,
          members: updatedMembers
        };

        // Cập nhật dữ liệu nhóm trong route params
        navigation.setParams({ groupInfo: updatedInfo });

        // Thêm thông báo hệ thống vào tin nhắn với thông tin người xóa
        const systemMessageId = `system-remove-${Date.now()}`;
        const systemMessage: Message = {
          _id: systemMessageId,
          idMessage: systemMessageId,
          idSender: 'system',
          idConversation: conversationId,
          type: 'system',
          // Hiển thị ai đã xóa ai khỏi nhóm hoặc ai đã rời nhóm
          content: data.leftGroup
            ? `${data.removedMember.fullname || 'Ai đó'} đã rời khỏi nhóm`
            : `${data.removedBy?.fullname || 'Ai đó'} đã xóa ${data.removedMember.fullname || 'một thành viên'} khỏi nhóm`,
          dateTime: new Date().toISOString(),
          isRead: true,
          isRecall: false,
          isReply: false,
          isForward: false,
          isRemove: false,
          idMessageReply: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          __v: 0
        };

        // Kiểm tra xem đã có tin nhắn tương tự chưa để tránh trùng lặp
        setDataView(prevMessages => {
          const isDuplicate = prevMessages.some(msg =>
            msg.type === 'system' &&
            msg.content === systemMessage.content &&
            new Date(msg.dateTime).getTime() > Date.now() - 60000 // Trong khoảng 1 phút
          );

          if (isDuplicate) return prevMessages;
          return [...prevMessages, systemMessage];
        });

        // Đảm bảo cuộn đến tin nhắn mới
        setTimeout(scrollToBottom, 100);
      }
    });

    // Đăng ký các sự kiện khác liên quan đến xóa thành viên
    socket.on('remove_member_response', (data) => {
      console.log('Remove member response:', data);
      if (data && data.success && data.conversation) {
        // Cập nhật thông tin nhóm với danh sách thành viên mới
        const updatedInfo = {
          ...groupInfo,
          members: data.conversation.groupMembers || groupInfo.members
        };
        navigation.setParams({ groupInfo: updatedInfo });
      }
    });    socket.on('member_removed_notification', (data) => {
      console.log('Member removed notification:', data);
      
      // Kiểm tra nếu server gửi trực tiếp system message (trường hợp chuyển quyền trưởng nhóm)
      if (data && data.systemMessage) {
        console.log('Received system message in notification:', data.systemMessage);
        
        // Kiểm tra ID cuộc trò chuyện
        const idConversationParam = route.params?.idConversation || conversationId;
        if (data.conversationId === idConversationParam || data.systemMessage.idConversation === idConversationParam) {
          
          // Tạo message từ systemMessage nhận từ server
          const systemMessage: Message = {
            ...data.systemMessage,
            _id: data.systemMessage._id || data.systemMessage.idMessage || `system-${Date.now()}`,
            type: 'system',
            isRead: true,
            sentByMe: false
          };
          
          // Thêm tin nhắn hệ thống vào danh sách tin nhắn
          setDataView(prevMessages => {
            // Kiểm tra trùng lặp
            const isDuplicate = prevMessages.some(msg => 
              msg.idMessage === systemMessage.idMessage || 
              (msg.type === 'system' && msg.content === systemMessage.content && 
               new Date(msg.dateTime).getTime() > Date.now() - 60000)
            );
            
            if (isDuplicate) {
              console.log('Duplicate system message detected, not adding');
              return prevMessages;
            }
            
            console.log('Adding system message from notification');
            return [...prevMessages, systemMessage];
          });
          
          setTimeout(scrollToBottom, 100);
          
          // Nếu là thay đổi chủ nhóm, cập nhật thông tin nhóm
          if (data.systemMessage.content && data.systemMessage.content.includes('đã chuyển quyền chủ nhóm')) {
            if (data.conversation) {
              navigation.setParams({ 
                groupInfo: {
                  ...groupInfo,
                  rules: data.conversation.rules
                }
              });
            }
          }
        }
      }
      // Xử lý trường hợp thông báo xóa thành viên
      else if (data && data.removedMembers && data.removedMembers.length > 0) {
        // Xử lý tương tự như member_removed_from_group
        const removedNames = data.removedMembers.map(m => m.fullname).join(', ');

        const systemMessageId = `system-remove-notif-${Date.now()}`;
        const systemMessage: Message = {
          _id: systemMessageId,
          idMessage: systemMessageId,
          idSender: 'system',
          idConversation: conversationId,
          type: 'system',
          content: `${data.removedBy?.fullname || 'Ai đó'} đã xóa ${removedNames} khỏi nhóm`,
          dateTime: new Date().toISOString(),
          isRead: true,
          isRecall: false,
          isReply: false,
          isForward: false,
          isRemove: false,
          idMessageReply: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          __v: 0
        };

        setDataView(prevMessages => [...prevMessages, systemMessage]);
        setTimeout(scrollToBottom, 100);
      }
    });
    // New listener: Group owner changed
    socket.on('group_owner_changed', (data) => {
      console.log('Group owner changed:', data);
      if (data && data.success && data.newOwner && data.oldOwner) {
        // Thêm thông báo hệ thống vào tin nhắn
        const systemMessage: Message = {
          _id: `system-${Date.now()}`,
          idMessage: `system-${Date.now()}`,
          idSender: 'system',
          idConversation: conversationId,
          type: 'system',
          content: `${data.newOwner.fullname || 'Unknown User'} đã trở thành trưởng nhóm mới`,
          dateTime: new Date().toISOString(),
          isRead: true,
          isRecall: false,
          isReply: false,
          isForward: false,
          isRemove: false,
          idMessageReply: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          __v: 0
        };

        // Thêm tin nhắn hệ thống vào danh sách tin nhắn
        setDataView(prevMessages => [...prevMessages, systemMessage]);
        setTimeout(scrollToBottom, 100);

        // Cập nhật rules cho nhóm
        const updatedRules = {
          ...groupInfo.rules,
          IDOwner: data.newOwner.id
        };

        // Cập nhật thông tin nhóm
        const updatedInfo = {
          ...groupInfo,
          rules: updatedRules
        };

        navigation.setParams({ groupInfo: updatedInfo });
      }
    });    // New listener: Member promoted to admin (co-owner)
    socket.on('member_promoted_to_admin', (data) => {
      console.log('Member promoted to admin:', data);
      if (data && data.success && data.promotedMember) {
        // Thêm thông báo hệ thống vào tin nhắn
        const systemMessage: Message = {
          _id: `system-${Date.now()}`,
          idMessage: `system-${Date.now()}`,
          idSender: 'system',
          idConversation: conversationId,
          type: 'system',
          content: `${data.promotedMember.fullname || 'Unknown User'} đã được bổ nhiệm làm phó nhóm`,
          dateTime: new Date().toISOString(),
          isRead: true,
          isRecall: false,
          isReply: false,
          isForward: false,
          isRemove: false,
          idMessageReply: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          __v: 0
        };

        // Thêm tin nhắn hệ thống vào danh sách tin nhắn
        setDataView(prevMessages => [...prevMessages, systemMessage]);
        setTimeout(scrollToBottom, 100);

        // Cập nhật danh sách co-owners
        const updatedCoOwners = [...(groupInfo.rules.listIDCoOwner || []), data.promotedMember.id];

        // Cập nhật rules cho nhóm
        const updatedRules = {
          ...groupInfo.rules,
          listIDCoOwner: updatedCoOwners
        };

        // Cập nhật thông tin nhóm
        const updatedInfo = {
          ...groupInfo,
          rules: updatedRules
        };

        navigation.setParams({ groupInfo: updatedInfo });
      }
    });
    
    // Listener cho member_promoted_notification event
    socket.on('member_promoted_notification', (data) => {
      console.log('Member promotion notification received:', data);
      
      if (data && data.systemMessage) {
        // Kiểm tra ID cuộc trò chuyện để đảm bảo tin nhắn thuộc về cuộc hội thoại hiện tại
        const idConversationParam = route.params?.idConversation || conversationId;
        const messageConversationId = data.systemMessage.idConversation || data.conversationId;
        
        if (messageConversationId === idConversationParam) {
          console.log('Processing promotion notification for current conversation');
          
          // Tạo message từ systemMessage nhận được từ server
          const systemMessage: Message = {
            ...data.systemMessage,
            _id: data.systemMessage._id || data.systemMessage.idMessage || `system-${Date.now()}`,
            type: 'system',
            isRead: true,
            sentByMe: false
          };
          
          // Thêm tin nhắn hệ thống vào danh sách tin nhắn
          setDataView(prevMessages => {
            // Kiểm tra trùng lặp
            const isDuplicate = prevMessages.some(msg => 
              msg.idMessage === systemMessage.idMessage || 
              (msg.type === 'system' && msg.content === systemMessage.content && 
               new Date(msg.dateTime).getTime() > Date.now() - 60000)
            );
            
            if (isDuplicate) {
              console.log('Duplicate promotion notification detected, not adding');
              return prevMessages;
            }
            
            console.log('Adding promotion notification system message');
            const newMessages = [...prevMessages, systemMessage];
            
            // Đảm bảo tin nhắn xuất hiện ngay lập tức
            setTimeout(scrollToBottom, 100);
            
            return newMessages;
          });
          
          // Cập nhật thông tin nhóm nếu có thành viên được bổ nhiệm
          if (data.promotedMember) {
            const promotedMemberId = data.promotedMember;
            
            // Cập nhật danh sách co-owners
            const updatedCoOwners = [...(groupInfo.rules?.listIDCoOwner || [])];
            if (!updatedCoOwners.includes(promotedMemberId)) {
              updatedCoOwners.push(promotedMemberId);
            }
            
            // Cập nhật rules cho nhóm
            const updatedRules = {
              ...groupInfo.rules,
              listIDCoOwner: updatedCoOwners
            };
            
            // Cập nhật thông tin nhóm
            navigation.setParams({ 
              groupInfo: {
                ...groupInfo,
                rules: updatedRules
              }
            });
          }
        }
      }
    });    // New listener: Member demoted from admin (co-owner)
    socket.on('member_demoted_from_admin', (data) => {
      console.log('Member demoted from admin:', data);
      if (data && data.success && data.demotedMember) {
        // Thêm thông báo hệ thống vào tin nhắn
        const systemMessage: Message = {
          _id: `system-${Date.now()}`,
          idMessage: `system-${Date.now()}`,
          idSender: 'system',
          idConversation: conversationId,
          type: 'system',
          content: `${data.demotedMember.fullname || 'Unknown User'} đã bị thu hồi quyền phó nhóm`,
          dateTime: new Date().toISOString(),
          isRead: true,
          isRecall: false,
          isReply: false,
          isForward: false,
          isRemove: false,
          idMessageReply: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          __v: 0
        };

        // Thêm tin nhắn hệ thống vào danh sách tin nhắn
        setDataView(prevMessages => [...prevMessages, systemMessage]);
        setTimeout(scrollToBottom, 100);

        // Cập nhật danh sách co-owners
        const updatedCoOwners = (groupInfo.rules.listIDCoOwner || []).filter(
          id => id !== data.demotedMember.id
        );

        // Cập nhật rules cho nhóm
        const updatedRules = {
          ...groupInfo.rules,
          listIDCoOwner: updatedCoOwners
        };

        // Cập nhật thông tin nhóm
        const updatedInfo = {
          ...groupInfo,
          rules: updatedRules
        };

        navigation.setParams({ groupInfo: updatedInfo });
      }
    });
    
    // Listener cho member_demoted_notification event
    socket.on('member_demoted_notification', (data) => {
      console.log('Member demotion notification received:', data);
      
      if (data && data.systemMessage) {
        // Kiểm tra ID cuộc trò chuyện để đảm bảo tin nhắn thuộc về cuộc hội thoại hiện tại
        const idConversationParam = route.params?.idConversation || conversationId;
        const messageConversationId = data.systemMessage.idConversation || data.conversationId;
        
        if (messageConversationId === idConversationParam) {
          console.log('Processing demotion notification for current conversation');
          
          // Tạo message từ systemMessage nhận được từ server
          const systemMessage: Message = {
            ...data.systemMessage,
            _id: data.systemMessage._id || data.systemMessage.idMessage || `system-${Date.now()}`,
            type: 'system',
            isRead: true,
            sentByMe: false
          };
          
          // Thêm tin nhắn hệ thống vào danh sách tin nhắn
          setDataView(prevMessages => {
            // Kiểm tra trùng lặp
            const isDuplicate = prevMessages.some(msg => 
              msg.idMessage === systemMessage.idMessage || 
              (msg.type === 'system' && msg.content === systemMessage.content && 
               new Date(msg.dateTime).getTime() > Date.now() - 60000)
            );
            
            if (isDuplicate) {
              console.log('Duplicate demotion notification detected, not adding');
              return prevMessages;
            }
            
            console.log('Adding demotion notification system message');
            const newMessages = [...prevMessages, systemMessage];
            
            // Đảm bảo tin nhắn xuất hiện ngay lập tức
            setTimeout(scrollToBottom, 100);
            
            return newMessages;
          });
          
          // Cập nhật thông tin nhóm nếu có thành viên bị giáng cấp
          if (data.demotedMember) {
            const demotedMemberId = data.demotedMember;
            
            // Cập nhật danh sách co-owners bằng cách loại bỏ thành viên bị giáng cấp
            const updatedCoOwners = (groupInfo.rules?.listIDCoOwner || []).filter(
              id => id !== demotedMemberId
            );
            
            // Cập nhật rules cho nhóm
            const updatedRules = {
              ...groupInfo.rules,
              listIDCoOwner: updatedCoOwners
            };
            
            // Cập nhật thông tin nhóm
            navigation.setParams({ 
              groupInfo: {
                ...groupInfo,
                rules: updatedRules
              }
            });
          }
        }
      }
    });    // New listener: Group deleted
    socket.on('group_deleted', (data) => {
      console.log('Group deleted:', data);
      if (data && data.success && data.conversationId === conversationId) {
        // Show alert and navigate to HomeScreen
        Alert.alert('Thông báo', data.message || 'Nhóm đã bị xóa bởi trưởng nhóm', [
          { 
            text: 'OK', 
            onPress: () => {
              // Navigate to HomeScreen with refresh flag to reload conversations list
              navigation.navigate('HomeScreen', { refreshConversations: true });
            } 
          }
        ]);
      }
    });
    socket.on('new_group_conversation', (data) => {
      console.log('New group conversation event:', data);
      
      // Check if this is a group deletion notification
      if (data && data.status === 'deleted' && data.conversationId === conversationId) {
        console.log('Group deletion notification received, redirecting to HomeScreen');
        
        // Show alert and navigate to HomeScreen
        Alert.alert('Thông báo', data.message || 'Nhóm đã bị xóa bởi trưởng nhóm', [
          { 
            text: 'OK', 
            onPress: () => {
              // Navigate to HomeScreen with refresh flag to reload conversations list
              navigation.navigate('HomeScreen', { refreshConversations: true });
            }          }
        ]);
      }
    });    // Listen for reaction updates
    socket.on('message_reaction_updated', (data) => {
      console.log('Message reaction updated:', data);
      if (data && data.messageId && data.reactions) {
        setDataView(prevMessages => {
          return prevMessages.map(msg => {
            if (msg.idMessage === data.messageId) {
              // Ensure reactions data is properly structured
              const updatedReactions = data.reactions || {};
              
              // Clean up any malformed reaction data
              Object.keys(updatedReactions).forEach(reactionType => {
                const reactionData = updatedReactions[reactionType];
                if (reactionData && reactionData.userReactions && Array.isArray(reactionData.userReactions)) {
                  // Filter out any null or undefined user reactions with comprehensive validation
                  reactionData.userReactions = reactionData.userReactions.filter(
                    ur => ur && 
                          typeof ur === 'object' && 
                          ur.user && 
                          typeof ur.user === 'object' && 
                          ur.user.id && 
                          typeof ur.user.id === 'string'
                  );
                } else {
                  // If userReactions is not an array, initialize it as empty array
                  reactionData.userReactions = [];
                }
              });

              return {
                ...msg,
                reactions: updatedReactions
              };
            }
            return msg;
          });
        });
      }
    });

    // Listen for mention notifications
    socket.on('user_mentioned', (data) => {
      console.log('User mentioned notification:', data);
      
      if (data && data.conversationId && data.sender) {
        // Show notification or update UI for mention
        const notificationTitle = data.isGroup 
          ? `${data.sender.fullname} đã nhắc bạn trong ${data.groupName || 'nhóm'}`
          : `${data.sender.fullname} đã nhắc bạn`;
        
        // You can add notification logic here
        console.log('Mention notification:', notificationTitle);
        
        // If this mention is in the current conversation, you might want to highlight it
        if (data.conversationId === conversationId) {
          // Handle in-app mention notification for current conversation
          // You can add UI feedback here like highlighting the message or showing a badge
        }
      }
    });    // Listen for mention response
    socket.on('mention_user_response', (data) => {
      console.log('Mention user response:', data);
      
      // More robust response handling
      if (data) {
        if (data.success === true) {
          console.log('Mention sent successfully');
          // Update the temporary message with actual message ID if needed
          if (data.messageId) {
            setDataView(prevMessages => {
              return prevMessages.map(msg => {
                if (msg.tempId && msg.tempId === data.messageId) {
                  return {
                    ...msg,
                    idMessage: data.messageId,
                    mentionedUsers: data.mentionedUsers
                  };
                }
                return msg;
              });
            });
          }
        }
        //  else if (data.success === false) {
        //   // Handle mention error more gracefully
        //   const errorMessage = data.message || data.error || 'Lỗi khi nhắc người dùng';
        //   console.error('Mention failed:', errorMessage);
          
        //   // Show user-friendly error message
        //   Alert.alert('Thông báo', errorMessage);
        // }
         else {
          // Handle case where success field is undefined or not boolean
          console.warn('Mention response format unexpected:', data);
        }
      } else {
        console.error('Empty mention response received');
      }
    });
  };

  // Function to load messages
  const loadMessages = (idConversation: string, lastMessageId?: string) => {
    // Set appropriate loading state based on whether we're loading older messages
    if (lastMessageId) {
      setIsLoadingOlder(true);
    } else {
      setIsLoading(true);
    }

    const socket = socketService.getSocket();
    if (socket) {
      console.log('Emitting load_messages with IDConversation:', idConversation);

      // Prepare message request data based on whether we're loading older messages
      const messageRequestData = lastMessageId
        ? { IDConversation: idConversation, lastMessageId }
        : { IDConversation: idConversation };

      // Đảm bảo socket đã sẵn sàng trước khi gửi yêu cầu
      if (socket.connected) {
        socket.emit('load_messages', messageRequestData);
      } else {
        // Nếu socket chưa kết nối, đợi kết nối rồi mới gửi yêu cầu
        socket.on('connect', () => {
          socket.emit('load_messages', messageRequestData);
        });
      }

      // Set a timeout to prevent infinite loading if server doesn't respond
      setTimeout(() => {
        if (lastMessageId && isLoadingOlder) {
          console.warn('Load older messages timeout - no response from server after 5 seconds');
          setIsLoadingOlder(false);
        } else if (isLoading) {
          console.warn('Load messages timeout - no response from server after 5 seconds');
          setIsLoading(false);
        }
      }, 5000);
    } else {
      console.error('Socket not available to load messages');
      setIsLoading(false);
      setIsLoadingOlder(false);
    }

    // Hiện thị trạng thái online của người nhận khi load tin nhắn
    setTimeout(() => {
      checkReceiverOnlineStatus();
    }, 1000);
  };  // Function to load older messages
  const loadOlderMessages = () => {
    // Nếu đang tải hoặc đã tải hết tin nhắn cũ hơn thì không làm gì
    if (isLoadingOlder || !hasMoreOldMessages || dataView.length === 0) {
      console.log('Skip loading older messages:', {
        isLoadingOlder,
        hasMoreOldMessages,
        messagesCount: dataView.length
      });
      return;
    }

    // Lấy ID của tin nhắn cũ nhất hiện tại
    const oldestMessage = dataView[0];
    const oldestMessageId = oldestMessage?.idMessage;

    if (!oldestMessageId) {
      console.error('No oldest message ID available');
      return;
    }

    const idConversationParam = route.params?.idConversation || conversationId;

    console.log('Loading older messages for conversation:', idConversationParam);
    console.log('Oldest message ID:', oldestMessageId);

    // Hiển thị trạng thái loading
    setIsLoadingOlder(true);
    
    const socket = socketService.getSocket();
    if (socket) {
      // Tạo payload cho yêu cầu tải tin nhắn cũ
      const loadOlderMessagesData = {
        IDConversation: idConversationParam,
        lastMessageId: oldestMessageId
      };
      
      console.log('Emitting load_messages for older messages:', loadOlderMessagesData);
      socket.emit('load_messages', loadOlderMessagesData);
      
      // Thiết lập timeout để tránh loading vô hạn nếu server không phản hồi
      setTimeout(() => {
        if (isLoadingOlder) {
          console.log('Timeout reached while loading older messages');
          setIsLoadingOlder(false);
        }
      }, 8000);
    } else {
      console.error('Socket not available to load older messages');
      setIsLoadingOlder(false);
    }
  };

  // Listen to keyboard events
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setIsKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Mention handlers
  const handleTextInputChange = (text: string) => {
    setMessageText(text);
    
    // Check for @ mentions
    const atIndex = text.lastIndexOf('@');
    if (atIndex !== -1) {
      const afterAt = text.substring(atIndex + 1);
      
      // If the character before @ is space or start of string, this might be a mention
      const beforeAt = atIndex > 0 ? text[atIndex - 1] : ' ';
      if (beforeAt === ' ' || atIndex === 0) {
        setMentionStartIndex(atIndex);
        setMentionQuery(afterAt);
        
        // Filter group members based on query
        if (afterAt.length === 0) {
          // Show all members when just typed @
          const socketService = SocketService.getInstance();
          const userData = socketService.getUserData();
          const members = Object.values(groupMembers).filter(member => 
            member.id !== userData?.id // Exclude current user
          );
          setFilteredMembers(members);
          setShowMentionSuggestions(true);
        } else {
          // Filter members by name
          const socketService = SocketService.getInstance();
          const userData = socketService.getUserData();
          const filtered = Object.values(groupMembers).filter(member => 
            member.id !== userData?.id &&
            member.fullname.toLowerCase().includes(afterAt.toLowerCase())
          );
          setFilteredMembers(filtered);
          setShowMentionSuggestions(filtered.length > 0);
        }
      }
    } else {
      // No @ found, hide suggestions
      setShowMentionSuggestions(false);
      setMentionQuery('');
      setMentionStartIndex(-1);
    }
  };

  const handleMentionSelect = (member: GroupUserInfo) => {
    if (mentionStartIndex === -1) return;
    
    // Replace the @query with @username
    const beforeMention = messageText.substring(0, mentionStartIndex);
    const afterMention = messageText.substring(mentionStartIndex + mentionQuery.length + 1);
    const newText = `${beforeMention}@${member.fullname} ${afterMention}`;
    
    setMessageText(newText);
    
    // Add to selected mentions if not already selected
    if (!selectedMentions.find(m => m.id === member.id)) {
      setSelectedMentions(prev => [...prev, member]);
    }
    
    // Hide suggestions
    setShowMentionSuggestions(false);
    setMentionQuery('');
    setMentionStartIndex(-1);
    
    // Focus back to input
    if (textInputRef.current) {
      textInputRef.current.focus();
    }
  };

  // Handle sending a message  
  const handleSendMessage = () => {
    if (!messageText.trim()) return;

    const socket = socketService.getSocket();
    if (!socket) {
      console.error('Socket not connected. Cannot send message.');
      return;
    }

    // Get user ID from socket service - this should be the logged in user
    const userData = socketService.getUserData();
    if (!userData || !userData.id) {
      console.error('User data not available. Cannot send message.');
      return;
    }

    // Get conversation ID from route params
    const idConversationParam = route.params?.idConversation || conversationId;

    // Validate required parameter
    if (!idConversationParam) {
      console.error('Conversation ID not available. Cannot send message.');
      return;
    }

    // Get current user ID
    const currentUserId = userData.id;

    // Message content
    const messageContent = messageText.trim();    // Create a temporary ID to track the message
    const tempId = `temp-${Date.now()}`;

    // Check if this is a reply message
    const isReply = replyingToMessage !== null;

    // Extract mentioned user IDs from selected mentions and message text
    const mentionedUserIds = selectedMentions
      .filter(mention => messageContent.includes(`@${mention.fullname}`))
      .map(mention => mention.id);

    // Create a temporary message to display immediately
    const tempMessage: Message = {
      _id: tempId,
      idMessage: tempId,
      idSender: currentUserId,
      idConversation: idConversationParam,
      type: 'text',
      content: messageContent,
      dateTime: new Date().toISOString(),
      isRead: false,
      isRecall: false,
      isReply: isReply,
      isForward: false,
      isRemove: false,
      idMessageReply: isReply ? replyingToMessage!.idMessage : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      __v: 0,
      sentByMe: true,
      tempId: tempId,
      // Add sender info if available
      senderInfo: {
        id: currentUserId,
        fullname: userData.fullname || "Me",
        urlavatar: userData.urlavatar || ""
      },
      // Add original message if replying
      originalMessage: isReply ? replyingToMessage : undefined,
      // Include mention information
      ...(mentionedUserIds.length > 0 && {
        mentionedUsers: mentionedUserIds
      })
    };

    // Add temporary message to state for immediate display - add to end of list
    setDataView(prevMessages => [...prevMessages, tempMessage]);

    // Scroll down to see the new message immediately
    setTimeout(scrollToBottom, 10);

    if (isReply && replyingToMessage) {
      // Prepare reply message data for the server
      const replyMessageData = {
        IDSender: currentUserId,
        IDReceiver: "", // For group messages, this might not be needed
        IDConversation: idConversationParam,
        IDMessageReply: replyingToMessage.idMessage,
        textMessage: messageContent,
        type: 'text',
        fileUrl: '',
        tempId: tempId
      };

      console.log('Sending reply message:', replyMessageData);
      socket.emit('reply_message', replyMessageData);

      // Clear reply state
      handleCancelReply();
    } else {
      // Prepare normal message data for the server
      const messageData = {
        IDSender: currentUserId,
        IDConversation: idConversationParam,
        textMessage: messageContent,
        type: 'text',
        fileUrl: '',
        tempId: tempId
      };

      // Check socket connection before sending
      if (!socket.connected) {
        console.warn('Socket disconnected. Attempting to reconnect before sending message...');
        socket.connect();

        // Register connect event to send message after reconnection
        socket.once('connect', () => {
          console.log('Socket reconnected. Sending group message...');
          socket.emit('send_group_message', messageData);
          console.log('Group message sent after reconnection:', messageData);
        });
      } else {
        // Send message via socket if connection is ready        console.log('Sending group message in real-time:', messageData);
        socket.emit('send_group_message', messageData);
      }
    }    // Handle mentions
    if (mentionedUserIds.length > 0) {
      console.log('Sending mention with data:', {
        IDSender: currentUserId,
        IDConversation: idConversationParam,
        mentionedUsers: mentionedUserIds,
        messageId: tempId
      });
      
      socket.emit('mention_user', {
        IDSender: currentUserId,
        IDConversation: idConversationParam,
        mentionedUsers: mentionedUserIds,
        messageId: tempId, // Will be updated when message is confirmed
        messageText: messageContent // Include message content for context
      });
    }

    // Clear message input and reset states
    setMessageText('');
    setSelectedMentions([]);
    setShowMentionSuggestions(false);
  };

  // Function to check online status of receiver
  const checkReceiverOnlineStatus = () => {
    const socket = socketService.getSocket();
    if (!socket) return;

    // Get the ID of receiver to check their status
    const userData = socketService.getUserData();
    const currentUserId = userData?.id;

    if (!currentUserId) return;

    // Determine actual receiver ID based on route params
    const idSenderParam = route.params?.idSender;
    const idReceiverParam = route.params?.idReceiver;
    const actualReceiverId = idSenderParam === currentUserId ? idReceiverParam : idSenderParam;

    if (!actualReceiverId) return;

    console.log('Checking online status for user:', actualReceiverId);
    // Emit event to check user status
    socket.emit('check_users_status', { userIds: [actualReceiverId] });
  };

  // Kiểm tra trạng thái online của người nhận khi component mount và cứ mỗi 30 giây
  useEffect(() => {
    // Kiểm tra ngay khi component mount
    checkReceiverOnlineStatus();

    // Thiết lập kiểm tra định kỳ mỗi 30 giây
    const intervalId = setInterval(() => {
      checkReceiverOnlineStatus();
    }, 30000);

    // Cleanup khi component unmount
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // File handling functions```tsx
  // Determine file type category based on MIME type
  const getFileTypeCategory = (mimeType: string): 'image' | 'video' | 'document' => {
    if (allowedTypes.image.includes(mimeType)) return 'image';
    if (allowedTypes.video.includes(mimeType)) return 'video';
    return 'document';
  };

  // Take photo from camera
  const handleTakePhoto = async () => {
    try {
      // Request camera permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera permission is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        // Get file info
        const fileInfo: FileInfo = {
          uri: asset.uri,
          name: `photo_${Date.now()}.jpg`,
          type: 'image/jpeg',
          fileType: 'image',
          size: asset.fileSize || 0
        };

        setSelectedFiles(prev => [...prev, fileInfo]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  // Select image from gallery
  const handlePickImage = async () => {
    try {
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Media library permission is required to select images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newFiles: FileInfo[] = result.assets.map(asset => {
          const fileType = asset.type === 'video' ? 'video' : 'image';
          const mimeType = asset.type === 'video' ? 'video/mp4' : `image/${asset.uri.split('.').pop()?.toLowerCase() || 'jpeg'}`;

          return {
            uri: asset.uri,
            name: asset.fileName || `${fileType}_${Date.now()}.${asset.uri.split('.').pop() || 'jpg'}`,
            type: mimeType,
            fileType: fileType as 'image' | 'video',
            size: asset.fileSize || 0
          };
        });

        setSelectedFiles(prev => [...prev, ...newFiles]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };  // Select document using the enhanced document picker handler
  const handlePickDocument = async () => {
    try {
      console.log('Starting enhanced document picker...');

      // Use our improved document picker that handles PDF, DOC, DOCX files correctly
      const newFiles = await pickDocument();

      if (newFiles.length > 0) {
        console.log(`Selected ${newFiles.length} document(s)`);
        setSelectedFiles(prev => [...prev, ...newFiles]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to select document. Please try again.');
    }
  };

  // Remove selected file
  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };
  // Upload files to server with improved handling
  const uploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Get authentication token directly
      const authService = AuthService.getInstance();
      const accessToken = await authService.getAccessToken();

      if (!accessToken) {
        Alert.alert('Authentication Error', 'You need to be logged in to upload files.');
        setIsUploading(false);
        return;
      }

      console.log('Starting file upload with token available:', !!accessToken);

      // Process one file at a time
      for (const file of selectedFiles) {
        console.log('Uploading file:', file.name, 'Type:', file.fileType);

        // Create FormData - using very explicit typing for React Native
        const formData = new FormData();

        // Handle file URI format differences between iOS and Android
        const fileUri = Platform.OS === 'android' ? file.uri : file.uri.replace('file://', '');

        const fileData = {
          uri: fileUri,
          name: file.name,
          type: file.type
        };

        formData.append('file', fileData as any);
        formData.append('fileType', file.fileType);

        console.log('FormData created for file:', file.name);

        try {
          // Upload file with explicit authentication token in header
          const response = await axios.post(`${API_URL}/upload/chat-file`, formData, {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'multipart/form-data',
              'Authorization': `Bearer ${accessToken}`
            },
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setUploadProgress(progress);
              }
            }
          });

          console.log('Upload response:', response.data);

          if (response.data && response.data.success) {
            // Send message with file via socket
            const { fileUrl, fileType, fileName } = response.data;
            console.log('File uploaded successfully:', fileUrl);
            sendFileMessage(fileUrl, fileType);
          } else {
            console.error('Upload failed, invalid response:', response.data);
            Alert.alert('Upload Error', 'Server returned an invalid response.');
          }
        } catch (uploadError) {
          console.error('Error in axios upload:', uploadError);

          if (axios.isAxiosError(uploadError) && uploadError.response) {
            console.error('Error status:', uploadError.response.status);
            console.error('Error data:', uploadError.response.data);
          }

          Alert.alert('Upload Failed', 'Failed to upload file. Please try again.');
        }
      }

      // Clear selected files after upload completes
      setSelectedFiles([]);
      setIsUploading(false);
    } catch (error) {
      console.error('Error in upload process:', error);
      Alert.alert('Upload Failed', 'Failed to upload file. Please check your connection and try again.');
      setIsUploading(false);
    }
  };

  // Send file message via socket
  const sendFileMessage = (fileUrl: string, fileType: string) => {
    const socket = socketService.getSocket();
    if (!socket) {
      console.error('Socket not connected. Cannot send message.');
      return;
    }

    // Get user data
    const userData = socketService.getUserData();
    if (!userData || !userData.id) {
      console.error('User data not available. Cannot send message.');
      return;
    }

    // Get conversation ID for group
    const idConversationParam = route.params?.idConversation || conversationId;

    if (!idConversationParam) {
      console.error('Conversation ID not available. Cannot send message.');
      return;
    }

    // Current user is the sender
    const currentUserId = userData.id;

    // Create temp ID for tracking
    const tempId = `temp-${Date.now()}`;

    // Create temp message for instant display
    const tempMessage: Message = {
      _id: tempId,
      idMessage: tempId,
      idSender: currentUserId,
      idReceiver: "", // Not needed for group messages
      idConversation: idConversationParam,
      type: fileType,
      content: fileUrl,
      dateTime: new Date().toISOString(),
      isRead: false,
      isRecall: false,
      isReply: false,
      isForward: false,
      isRemove: false,
      idMessageReply: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      __v: 0,
      sentByMe: true,
      // Add sender info
      senderInfo: {
        id: currentUserId,
        fullname: userData.fullname || "Me",
        urlavatar: userData.urlavatar
      }
    };

    // Add temp message to chat
    setDataView(prevMessages => [...prevMessages, tempMessage]);

    // Scroll to see new message
    setTimeout(scrollToBottom, 10);

    // Create socket message payload for group message
    const messageData = {
      IDSender: currentUserId,
      IDConversation: idConversationParam,
      type: fileType,
      fileUrl: fileUrl,
      tempId: tempId
    };

    // Send message via socket using group message event
    if (!socket.connected) {
      console.warn('Socket disconnected. Attempting to reconnect...');
      socket.connect();

      socket.once('connect', () => {
        socket.emit('send_group_message', messageData);
      });
    } else {
      socket.emit('send_group_message', messageData);
    }
  };

  // Render file preview component
  const renderFilePreview = () => {
    if (selectedFiles.length === 0) return null;

    return (
      <View style={styles.filePreviewContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {selectedFiles.map((file, index) => (
            <View key={index} style={styles.filePreviewItem}>
              {file.fileType === 'image' ? (
                <Image source={{ uri: file.uri }} style={styles.imagePreview} />
              ) : file.fileType === 'video' ? (
                <View style={styles.videoPreview}>
                  <Ionicons name="videocam" size={24} color="#FFFFFF" />
                  <Text style={styles.fileNameText} numberOfLines={1}>
                    {file.name}
                  </Text>
                </View>
              ) : (
                <View style={styles.documentPreview}>
                  <Ionicons name="document-text" size={24} color="#FFFFFF" />
                  <Text style={styles.fileNameText} numberOfLines={1}>
                    {file.name}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.removeFileButton}
                onPress={() => handleRemoveFile(index)}
              >
                <Ionicons name="close-circle" size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        {isUploading ? (
          <View style={styles.uploadProgressContainer}>
            <Progress.Bar progress={uploadProgress / 100} width={width - 40} />
            <Text style={styles.uploadProgressText}>{`Uploading... ${uploadProgress}%`}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.sendFilesButton}
            onPress={uploadFiles}
          >
            <Text style={styles.sendFilesButtonText}>Send Files</Text>
            <Ionicons name="send" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    );
  };
  // Render reaction picker modal
  const renderReactionPicker = () => (
    <Modal
      visible={showReactionPicker}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowReactionPicker(false)}
    >
      <Pressable 
        style={styles.zaloReactionPickerOverlay}
        onPress={() => setShowReactionPicker(false)}
      >
        <View style={styles.zaloReactionPickerContainer}>
          {/* Arrow tail pointing down */}
          <View style={styles.zaloReactionPickerArrow} />
          
          {/* Horizontal reaction bar */}
          <View style={styles.zaloReactionBar}>
            {availableReactions.map((reaction, index) => (
              <TouchableOpacity
                key={reaction}
                style={[
                  styles.zaloReactionBarButton,
                  index === 0 && styles.zaloReactionBarButtonFirst,
                  index === availableReactions.length - 1 && styles.zaloReactionBarButtonLast
                ]}
                onPress={() => handleReactionSelect(reaction)}
              >
                <Text style={styles.zaloReactionBarEmoji}>{reaction}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Pressable>
    </Modal>
  );

  // Render text with mentions highlighted
  const renderTextWithMentions = (text: string, mentionedUsers?: string[]) => {
    if (!mentionedUsers || mentionedUsers.length === 0) {
      return <Text style={styles.messageText} numberOfLines={0}>{text}</Text>;
    }

    // Create a pattern to match @mentions
    const mentionPattern = /@(\w+(?:\s+\w+)*)/g;
    const parts: Array<{type: 'text' | 'mention', content: string, key: string}> = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionPattern.exec(text)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index),
          key: `text-${lastIndex}`
        });
      }

      // Check if this mention corresponds to a mentioned user
      const mentionName = match[1];
      const isMentioned = Object.values(groupMembers).some((member: any) => 
        mentionedUsers.includes(member.id) && member.fullname === mentionName
      );

      // Add mention (highlighted if it's a real mention)
      parts.push({
        type: isMentioned ? 'mention' : 'text',
        content: match[0],
        key: `mention-${match.index}`
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex),
        key: `text-${lastIndex}`
      });
    }

    return (
      <Text style={styles.messageText} numberOfLines={0}>
        {parts.map((part) => (
          part.type === 'mention' ? (
            <Text key={part.key} style={styles.mentionText}>
              {part.content}
            </Text>
          ) : (
            <Text key={part.key}>{part.content}</Text>
          )
        ))}
      </Text>
    );
  };  // Render reactions for a message
  const renderMessageReactions = (message: Message) => {
    if (!message.reactions || Object.keys(message.reactions).length === 0) {
      return null;
    }

    const userData = socketService.getUserData();
    const reactionEntries = Object.entries(message.reactions);
      // Filter out reactions with totalCount = 0 and ensure reactions have valid structure
    const validReactionEntries = reactionEntries.filter(([emoji, reactionData]) => {
      if (!reactionData || reactionData.totalCount <= 0) return false;
      
      // Ensure userReactions is an array and filter out invalid entries
      if (reactionData.userReactions && Array.isArray(reactionData.userReactions)) {
        reactionData.userReactions = reactionData.userReactions.filter(
          ur => ur && 
                typeof ur === 'object' && 
                ur.user && 
                typeof ur.user === 'object' && 
                ur.user.id && 
                typeof ur.user.id === 'string'
        );
      } else {
        // If userReactions is not an array, initialize it as empty array
        reactionData.userReactions = [];
      }
      
      return true;
    });
    
    if (validReactionEntries.length === 0) {
      return null;
    }
    
    // Show thumbs up and heart reactions in specific style
    const thumbsUpReaction = validReactionEntries.find(([emoji]) => emoji === '👍');
    const heartReaction = validReactionEntries.find(([emoji]) => emoji === '❤️');
    
    return (
      <View style={styles.zaloReactionsContainer}>
        {thumbsUpReaction && thumbsUpReaction[1].totalCount > 0 && (
          <TouchableOpacity
            style={styles.zaloThumbsUpContainer}
            onPress={() => handleQuickReaction(message, '👍')}
          >
            <Text style={styles.zaloThumbsUpEmoji}>👍</Text>
            <Text style={styles.zaloReactionCount}>{thumbsUpReaction[1].totalCount}</Text>
          </TouchableOpacity>
        )}
        
        {heartReaction && heartReaction[1].totalCount > 0 && (
          <TouchableOpacity
            style={styles.zaloHeartDisplayContainer}
            onPress={() => handleQuickReaction(message, '❤️')}
          >
            <Text style={styles.zaloHeartEmoji}>❤️</Text>
            <Text style={styles.zaloReactionCount}>{heartReaction[1].totalCount}</Text>
          </TouchableOpacity>
        )}
        
        {/* Show other reactions in compact form */}
        {validReactionEntries
          .filter(([emoji, reactionData]) => 
            emoji !== '👍' && emoji !== '❤️' && reactionData.totalCount > 0
          )          .map(([emoji, reactionData]) => {
            const isUserReacted = reactionData.userReactions.some(ur => 
              ur && 
              typeof ur === 'object' && 
              ur.user && 
              typeof ur.user === 'object' && 
              ur.user.id && 
              typeof ur.user.id === 'string' && 
              ur.user.id === (userData?.id || '')
            );
            return (
              <TouchableOpacity
                key={emoji}
                style={[
                  styles.zaloOtherReactionChip,
                  isUserReacted && styles.zaloOtherReactionChipActive
                ]}
                onPress={() => handleQuickReaction(message, emoji)}
              >
                <Text style={styles.zaloOtherReactionEmoji}>{emoji}</Text>
                <Text style={[
                  styles.zaloOtherReactionCount,
                  { color: isUserReacted ? '#FFFFFF' : '#333333' }
                ]}>{reactionData.totalCount}</Text>
              </TouchableOpacity>
            );
          })}      </View>
    );
  };

  // Render quick reaction button for messages
  const renderQuickReactionButton = (message: Message) => (
    <TouchableOpacity
      style={styles.quickReactionButton}
      onPress={() => handleShowReactionPicker(message)}
    >
      <Ionicons name="add-circle-outline" size={16} color="#666" />
    </TouchableOpacity>
  );
  // Render Zalo-style heart button for messages
  const renderZaloHeartButton = (message: Message) => (
    <TouchableOpacity
      style={styles.zaloHeartButton}
      onPress={() => handleQuickReaction(message, '❤️')}
      onLongPress={() => handleShowReactionPicker(message)}
      delayLongPress={500}
    >
      <Ionicons name="heart-outline" size={12} color="#000" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1FAEEB" />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FDF8F8" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {groupInfo?.name || "Nhóm chat"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {groupInfo?.members ? `${groupInfo.members.length} thành viên` : ''}
          </Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.headerIconButton}>
            <Ionicons name="call" size={24} color="#FDF8F8" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconButton}>
            <Ionicons name="videocam" size={24} color="#FDF8F8" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => navigation.navigate('DetailGroupChatScreen', {
              conversationId: conversationId,
              groupInfo: groupInfo
            })}
          >
            <Ionicons name="ellipsis-vertical" size={20} color="#FDF8F8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1FAEEB" />
          <Text style={styles.loadingText}>Đang tải tin nhắn...</Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardAvoidContainer}
          keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 0}
        >
          <FlatList
            ref={flatListRef}
            style={styles.messagesContainer}
            contentContainerStyle={
              dataView.length > 0
                ? styles.messagesContent
                : styles.emptyMessagesContent
            }
            data={dataView}
            keyExtractor={(item) => item._id || item.idMessage}
            inverted={false}
            removeClippedSubviews={false} // Ngăn không cho các view bị xóa khi không hiển thị
            onEndReached={() => {
              // Load more messages when reaching the end
              console.log("Reached end of messages");
            }}
            onEndReachedThreshold={0.2}
            refreshControl={
              <RefreshControl
                refreshing={isLoadingOlder}
                onRefresh={loadOlderMessages}
                colors={["#1FAEEB"]}
                tintColor="#1FAEEB"
                title="Đang tải tin nhắn cũ..."
                titleColor="#757575"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyStateContainer}>
                <Ionicons name="chatbubbles-outline" size={80} color="#CCCCCC" />
                <Text style={styles.emptyStateText}>Chưa có tin nhắn nào</Text>
                <Text style={styles.emptyStateSubtext}>
                  Hãy bắt đầu cuộc trò chuyện nhóm!
                </Text>
              </View>
            } renderItem={({ item: message }) => {
              // Check if this is a system message
              if (message.idSender === "system") {
                // Render system message centered in chat
                return (
                  <View style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingVertical: 5,
                    marginVertical: 10,
                    width: '100%',
                  }}>
                    <Text style={{
                      backgroundColor: 'rgba(0, 0, 0, 0.1)',
                      color: '#666',
                      fontSize: 12,
                      padding: 8,
                      borderRadius: 10,
                      overflow: 'hidden',
                      textAlign: 'center',
                    }}>
                      {message.content}
                    </Text>
                  </View>
                );
              }

              // For regular messages, continue with normal rendering
              // Find sender information either from message.senderInfo or groupMembers state
              const senderInfo = message.senderInfo || groupMembers[message.idSender] || { fullname: "Unknown", urlavatar: "" };
              const showSenderInfo = !message.sentByMe && !message.isRecall;

              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  delayLongPress={200}
                  onLongPress={() => handleLongPressMessage(message)}
                >
                  <View style={showSenderInfo && styles.messageBubbleWithSender}>
                    {/* Show sender info for others' messages in group chat */}
                    {showSenderInfo && (
                      <View style={styles.senderInfoContainer}>
                        <View style={styles.senderAvatarContainer}>
                          <Image
                            source={
                              senderInfo.urlavatar
                                ? { uri: senderInfo.urlavatar }
                                : require('../assets/Welo_image.png')
                            }
                            style={styles.senderAvatar}
                          />
                          {/* Display gold key for group owner */}
                          {groupInfo?.rules?.IDOwner === message.idSender && (
                            <Ionicons
                              name="key"
                              size={12}
                              color="#FFD700"
                              style={styles.keyIcon}
                            />
                          )}
                          {/* Display silver key for co-owners */}
                          {groupInfo?.rules?.listIDCoOwner?.includes(message.idSender) && (
                            <Ionicons
                              name="key"
                              size={12}
                              color="#C0C0C0"
                              style={styles.keyIcon}
                            />
                          )}
                        </View>
                        <View style={styles.senderNameContainer}>
                          <Text style={[
                            styles.senderName,
                            { color: getUserColor(message.idSender) }
                          ]}>
                            {senderInfo.fullname}
                          </Text>
                        </View>
                      </View>
                    )}                    <View
                      style={[
                        styles.messageBubble,
                        message.sentByMe ? styles.myMessage : styles.theirMessage,
                        message.type !== 'text' ? styles.fileMessageBubble : null,
                        (message.isRecall || message.isRemove) && styles.recalledMessage
                      ]}
                    >                      {/* Show replied message if this is a reply */}
                      {message.isReply && message.originalMessage && (
                        <TouchableOpacity 
                          style={styles.zaloRepliedMessageContainer}
                          onPress={() => handleQuotedMessagePress(message.originalMessage)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.zaloRepliedMessageBar} />
                          <View style={styles.zaloRepliedMessageContent}>
                            <Text 
                              style={styles.zaloRepliedSenderName}
                              numberOfLines={1}
                              ellipsizeMode="tail"
                            >
                              {message.originalMessage.senderInfo?.fullname || 
                               groupMembers[message.originalMessage.idSender]?.fullname || 
                               "Unknown User"}
                            </Text>
                            <Text 
                              style={styles.zaloRepliedMessageText} 
                              numberOfLines={2} 
                              ellipsizeMode="tail"
                            >
                              {message.originalMessage.type === 'image' ? '📷 Hình ảnh' :
                               message.originalMessage.type === 'video' ? '🎥 Video' :
                               message.originalMessage.type === 'document' ? '📄 Tài liệu' :
                               message.originalMessage.content}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      )}

                      {message.isRecall ? (
                        // Recalled message style
                        <Text style={styles.recalledMessageText}>Tin nhắn đã được thu hồi</Text>                      ) : message.type === 'image' ? (
                        <View style={styles.zaloMessageContentContainer}>
                          <View style={styles.zaloMessageTextContainer}>
                            <Image
                              source={{ uri: message.content }}
                              style={styles.messageImage}
                              resizeMode="cover"
                            />
                            <Text style={styles.messageTime}>
                              {formatMessageTime(message.dateTime)}
                            </Text>
                          </View>
                          
                          {/* Zalo-style interaction buttons */}
                          <View style={styles.zaloMessageInteractionContainer}>
                            {renderZaloHeartButton(message)}
                          </View>
                        </View>
                      ) : message.type === 'video' ? (
                        <View style={styles.zaloMessageContentContainer}>
                          <View style={styles.zaloMessageTextContainer}>
                            <VideoMessage
                              uri={message.content}
                              timestamp={formatMessageTime(message.dateTime)}
                            />
                          </View>
                          
                          {/* Zalo-style interaction buttons */}
                          <View style={styles.zaloMessageInteractionContainer}>
                            {renderZaloHeartButton(message)}
                          </View>
                        </View>
                      ) : message.type === 'document' ? (
                        <View style={styles.zaloMessageContentContainer}>
                          <View style={styles.zaloMessageTextContainer}>
                            <DocumentMessage
                              uri={message.content}
                              timestamp={formatMessageTime(message.dateTime)}
                            />
                          </View>
                          
                          {/* Zalo-style interaction buttons */}
                          <View style={styles.zaloMessageInteractionContainer}>
                            {renderZaloHeartButton(message)}
                          </View>
                        </View>) : (
                        <View style={styles.zaloMessageContentContainer}>
                          <View style={styles.zaloMessageTextContainer}>
                            {renderTextWithMentions(message.content, message.mentionedUsers)}
                            <Text style={styles.messageTime}>
                              {formatMessageTime(message.dateTime)}
                            </Text>
                          </View>
                          
                          {/* Zalo-style interaction buttons */}
                          <View style={styles.zaloMessageInteractionContainer}>
                            {renderZaloHeartButton(message)}
                          </View>
                        </View>
                      )}

                      {/* Render reactions for this message */}
                      {renderMessageReactions(message)}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}          />          {/* Reply Bar - Zalo Style */}
          {showReplyBar && replyingToMessage && (
            <View style={styles.zaloReplyBarContainer}>
              <View style={styles.zaloReplyPreviewBox}>
                <View style={styles.zaloReplyLeftBorder} />
                <View style={styles.zaloReplyContent}>
                  <View style={styles.zaloReplyHeader}>
                    <Text style={styles.zaloReplySenderName}>
                      {replyingToMessage.senderInfo?.fullname || 
                       groupMembers[replyingToMessage.idSender]?.fullname || 
                       "Unknown User"}
                    </Text>
                    <TouchableOpacity 
                      style={styles.zaloReplyCloseButton}
                      onPress={handleCancelReply}
                    >
                      <Ionicons name="close" size={18} color="#666" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.zaloReplyMessageText} numberOfLines={2}>
                    {replyingToMessage.type === 'image' ? '📷 Hình ảnh' :
                     replyingToMessage.type === 'video' ? '🎥 Video' :
                     replyingToMessage.type === 'document' ? '📄 Tài liệu' :
                     replyingToMessage.content}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Mention Suggestions */}
          {showMentionSuggestions && filteredMembers.length > 0 && (
            <View style={styles.mentionSuggestionsContainer}>              <FlatList
                data={filteredMembers}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.mentionSuggestionItem}
                    onPress={() => handleMentionSelect(item)}
                  >
                    <Image
                      source={{ uri: item.urlavatar || 'https://via.placeholder.com/40' }}
                      style={styles.mentionAvatar}
                    />
                    <Text style={styles.mentionName}>{item.fullname}</Text>
                  </TouchableOpacity>
                )}
                horizontal={false}
                style={styles.mentionSuggestionsList}
                showsVerticalScrollIndicator={false}
              />
            </View>
          )}

          {/* Input area */}
          <View style={styles.inputContainer}>
            <TouchableOpacity
              style={styles.attachButton}
              onPress={() => setShowEmojiPicker(!showEmojiPicker)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Ionicons name="happy-outline" size={26} color="#645C5C" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.attachButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
              onPress={handlePickDocument}
            >
              <Ionicons name="add-circle-outline" size={26} color="#645C5C" />
            </TouchableOpacity>
            <View style={styles.textInputContainer}>
              <TextInput
                ref={textInputRef}
                style={styles.textInput}
                placeholder="Nhập tin nhắn..."
                placeholderTextColor="#999999"
                value={messageText}
                onChangeText={handleTextInputChange}
                multiline
                maxLength={1000}
              />
            </View>
            <View style={styles.rightButtons}>
              {!messageText.trim() ? (
                <>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={handleTakePhoto}
                  >
                    <Ionicons name="camera-outline" size={26} color="#645C5C" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={handlePickImage}
                  >
                    <Ionicons name="image-outline" size={26} color="#645C5C" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconButton}>
                    <Ionicons name="mic-outline" size={26} color="#645C5C" />
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    { backgroundColor: '#1FAEEB' }
                  ]}
                  onPress={handleSendMessage}
                >
                  <Ionicons
                    name="send"
                    size={20}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Emoji picker */}
          {showEmojiPicker && (
            <View style={styles.emojiPickerContainer}>
              <FlatList
                data={emojiList}
                numColumns={8}
                keyExtractor={(item, index) => `emoji-${index}`}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.emojiItem}
                    onPress={() => handleEmojiSelect(item)}
                  >
                    <Text style={styles.emojiText}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </KeyboardAvoidingView>
      )}      {/* Render file preview */}
      {renderFilePreview()}

      {/* Message Action Menu */}
      {showMessageActionMenu && selectedMessage && (
        <MessageActionMenu
          message={selectedMessage}
          onClose={handleCloseMessageMenu}
          onForward={handleForwardMessage}
          onRecall={handleRecallMessage}
          onDelete={handleDeleteMessage}
          onReply={handleReplyMessage}
          onReact={handleShowReactionPicker}
        />
      )}

      {/* Render reaction picker modal */}
      {renderReactionPicker()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoidContainer: {
    flex: 1,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1FAEEB',
    paddingVertical: 10,
    paddingHorizontal: 15,
    height: 60,
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 5,
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FDF8F8',
    fontSize: 15,
    fontFamily: 'Inter',
    fontWeight: '500',
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'Inter',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    marginLeft: 12,
    padding: 5,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#D7CFCF',
  },
  messagesContent: {
    padding: 10,
    paddingBottom: 20,
  },  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 5,
    maxWidth: '88%',
    minWidth: 130,
    position: 'relative',
    minHeight: 35, // Ensure minimum height for heart button
  },
  myMessage: {
    backgroundColor: '#FFFCFC',
    alignSelf: 'flex-end',
  },
  theirMessage: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
  },  messageText: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
    flexWrap: 'wrap',
    flexShrink: 1,
  },messageTime: {
    fontSize: 10,
    color: '#999999',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  // File message styles
  fileMessageBubble: {
    padding: 8,
    overflow: 'hidden',
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  videoMessage: {
    width: '100%',
  },
  videoContainer: {
    width: 200,
    height: 150,
    borderRadius: 12,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    overflow: 'hidden',
  },
  messageVideo: {
    width: '100%',
    height: '100%',
    opacity: 0.7,
  },
  documentMessage: {
    minWidth: 180,
  },
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'rgba(31, 174, 235, 0.1)',
    borderRadius: 8,
    marginBottom: 4,
  },
  documentName: {
    fontSize: 13,
    color: '#000000',
    marginLeft: 8,
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  attachButton: {
    padding: 8,
  },
  textInputContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    marginHorizontal: 8,
    paddingHorizontal: 12,
  },
  textInput: {
    fontSize: 15,
    color: '#000000',
    paddingVertical: 8,
    maxHeight: 100,
  },
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 6,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFEFEF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#D7CFCF',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#1FAEEB',
  },
  emptyMessagesContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666666',
    marginTop: 10,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999999',
    marginTop: 5,
  },
  emojiPickerContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingVertical: 10,
    maxHeight: 250,
  },
  emojiItem: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    width: width / 8,
  },
  emojiText: {
    fontSize: 24,
  },
  // File preview styles
  filePreviewContainer: {
    padding: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  filePreviewItem: {
    marginRight: 10,
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  videoPreview: {
    width: 100,
    height: 100,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1FAEEB',
  },
  documentPreview: {
    width: 100,
    height: 100,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1FAEEB',
  },
  fileNameText: {
    marginLeft: 5,
    color: '#FFFFFF',
    fontSize: 12,
  },
  removeFileButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 10,
  },
  uploadProgressContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  uploadProgressText: {
    marginTop: 5,
    color: '#1FAEEB',
  },
  sendFilesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1FAEEB',
    padding: 10,
    borderRadius: 20,
    marginTop: 10,
  },
  sendFilesButtonText: {
    color: '#FFFFFF',
    marginRight: 5,
  },
  messageMenuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  messageMenu: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    width: '80%',
    maxWidth: 300,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  myMessageMenu: {
    alignSelf: 'center',
  },
  theirMessageMenu: {
    alignSelf: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 10,
    color: '#333',
  },
  recalledMessage: {
    backgroundColor: '#f0f0f0',
  }, recalledMessageText: {
    fontStyle: 'italic',
    color: '#999',
  },
  // Styles cho phần tải tin nhắn cũ hơn
  loadOlderMessagesButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: 'rgba(31, 174, 235, 0.1)',
    marginVertical: 10,
    marginHorizontal: 20,
    borderRadius: 20,
  },
  loadOlderMessagesText: {
    color: '#1FAEEB',
    fontWeight: '500',
    fontSize: 14,
  },
  noMoreMessagesText: {
    textAlign: 'center',
    color: '#999',
    paddingVertical: 10,
    fontSize: 12,
    fontStyle: 'italic',
  },  // New styles for message sender info
  messageBubbleWithSender: {
    marginTop: 10,
    marginBottom: 2,
    width: '100%',
  },
  // System message styles
  systemMessageContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 5,
    marginVertical: 10,
    width: '100%',
  },
  systemMessageText: {
    // backgroundColor: 'rgba(0, 0, 0, 0.1)',
    backgroundColor: 'white',
    color: '#666',
    fontSize: 12,
    padding: 8,
    borderRadius: 10,
    overflow: 'hidden',
    textAlign: 'center',
  },
  reactionPickerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  reactionPickerContainer: {
    width: 300,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
  },
  reactionPickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  reactionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  reactionButton: {
    padding: 10,
  },  reactionEmoji: {
    fontSize: 24,
  },  // Zalo-style message content styles
  zaloMessageContentContainer: {
    flexDirection: 'column',
    width: '100%',
  },
  zaloMessageTextContainer: {
    width: '100%',
    paddingRight: 35, // Give space for heart button
  },
  zaloMessageInteractionContainer: {
    position: 'absolute',
    right: 5,
    bottom: 5,
    zIndex: 1,
  },  // Zalo-style heart button
  zaloHeartButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 2,
  },// Zalo-style reactions container
  zaloReactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginBottom: 5,
    alignSelf: 'flex-end',
    maxWidth: '100%',
  },  // Zalo-style thumbs up container
  zaloThumbsUpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginRight: 4,
    marginBottom: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  zaloThumbsUpEmoji: {
    fontSize: 12,
  },
  zaloReactionCount: {
    fontSize: 10,
    color: '#000',
    fontWeight: '600',
    marginLeft: 3,
  },
  // Zalo-style heart display container
  zaloHeartDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginRight: 4,
    marginBottom: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  zaloHeartEmoji: {
    fontSize: 12,
  },  // Other reactions in compact style
  zaloOtherReactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginRight: 3,
    marginBottom: 2,
  },
  zaloOtherReactionChipActive: {
    backgroundColor: '#1FAEEB',
  },
  zaloOtherReactionEmoji: {
    fontSize: 10,
  },
  zaloOtherReactionCount: {
    fontSize: 9,
    marginLeft: 2,
    fontWeight: '600',
  },
  // Zalo-style reaction picker
  zaloReactionPickerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  zaloReactionPickerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  zaloReactionPickerArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF',
    marginBottom: -1,
    zIndex: 2,
  },
  zaloReactionBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  zaloReactionBarButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
  },
  zaloReactionBarButtonFirst: {
    borderTopLeftRadius: 25,
    borderBottomLeftRadius: 25,
  },
  zaloReactionBarButtonLast: {
    borderTopRightRadius: 25,
    borderBottomRightRadius: 25,
  },
  zaloReactionBarEmoji: {
    fontSize: 20,
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    padding: 5,
    margin: 2,
  },
  reactionChipActive: {
    backgroundColor: '#1FAEEB',
  },
  reactionChipEmoji: {
    fontSize: 16,
  },
  reactionChipCount: {
    fontSize: 12,
    marginLeft: 5,
    fontWeight: '600',
  },  quickReactionButton: {
    padding: 5,
  },  // Sender info styles
  senderInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    width: '100%',
    paddingHorizontal: 2,
  },
  senderAvatarContainer: {
    position: 'relative',
    marginRight: 8,
    flexShrink: 0,
  },
  senderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  keyIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 1,
  },  senderNameContainer: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  senderName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
    flexShrink: 1,
    flexWrap: 'nowrap',
  },
  // Reply message styles
  repliedMessageContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  repliedMessageBar: {
    width: 3,
    backgroundColor: '#1FAEEB',
    borderRadius: 1.5,
    marginRight: 8,
  },
  repliedMessageContent: {
    flex: 1,
  },
  repliedSenderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1FAEEB',
    marginBottom: 2,
  },
  repliedMessageText: {
    fontSize: 12,
    color: '#666',
  },
  // Reply bar styles
  replyBarContainer: {
    backgroundColor: '#F8F8F8',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    padding: 10,
  },
  replyBar: {
    width: 3,
    backgroundColor: '#1FAEEB',
    borderRadius: 1.5,
    marginRight: 8,
  },
  replyContent: {
    flex: 1,
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  replyToText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1FAEEB',
  },
  replySenderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },  replyMessageText: {
    fontSize: 12,
    color: '#999',
  },
  // Zalo-style Reply Bar styles
  zaloReplyBarContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  zaloReplyPreviewBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
  },
  zaloReplyLeftBorder: {
    width: 3,
    backgroundColor: '#1FAEEB',
    borderRadius: 1.5,
    alignSelf: 'stretch',
    marginRight: 10,
  },
  zaloReplyContent: {
    flex: 1,
  },
  zaloReplyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  zaloReplySenderName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    flex: 1,
  },
  zaloReplyCloseButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginLeft: 8,
  },  zaloReplyMessageText: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
  },  // Zalo-style Replied Message in Bubble styles
  zaloRepliedMessageContainer: {
    backgroundColor: 'rgba(31, 174, 235, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    minWidth: 160,
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  zaloRepliedMessageBar: {
    width: 3,
    backgroundColor: '#1FAEEB',
    borderRadius: 1.5,
    alignSelf: 'stretch',
    marginRight: 12,
    flexShrink: 0,
  },
  zaloRepliedMessageContent: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  zaloRepliedSenderName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1FAEEB',
    marginBottom: 4,
    flexWrap: 'nowrap',
    flexShrink: 1,
  },
  zaloRepliedMessageText: {
    fontSize: 12,
    color: '#666666',
    lineHeight: 16,
    flexWrap: 'nowrap',
    flexShrink: 1,
  },
  // Mention styles
  mentionText: {
    color: '#1FAEEB',
    fontWeight: '600',
    backgroundColor: 'rgba(31, 174, 235, 0.1)',
    borderRadius: 4,
    paddingHorizontal: 2,
  },
  mentionSuggestionsContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    maxHeight: 150,
    paddingVertical: 8,
  },
  mentionSuggestionsList: {
    paddingHorizontal: 10,
  },
  mentionSuggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  mentionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  mentionName: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
});
export default GroupChatScreen;


