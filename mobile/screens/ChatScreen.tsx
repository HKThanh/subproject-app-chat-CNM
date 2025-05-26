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
  RefreshControl
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

// Message type definition
interface Message {
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
  __v: number; sentByMe?: boolean;
  tempId?: string;
  originalMessage?: Message;
  messageReply?: {
    idMessage: string;
    content: string;
    idSender: string;
    dateTime: string;
    type: string;
  };
  reactions?: { [key: string]: ReactionData };
  callData?: {
    callType: string;
    outcome: string;
    duration?: string;
    callerId: string;
    receiverId: string;
    callerName?: string;
  };
}

// Reaction interfaces
interface UserReaction {
  user: {
    id: string;
    fullname: string;
    urlavatar?: string;
  };
  count: number;
}

interface ReactionData {
  reaction: string;
  totalCount: number;
  userReactions: UserReaction[];
}

// Message Action Menu component
interface MessageActionMenuProps {
  message: Message;
  onClose: () => void;
  onForward: (message: Message) => void;
  onRecall: (message: Message) => void;
  onDelete: (message: Message) => void;
  onReply: (message: Message) => void;
  onReaction: (message: Message) => void;
}

const MessageActionMenu: React.FC<MessageActionMenuProps> = ({
  message,
  onClose,
  onForward,
  onRecall,
  onDelete,
  onReply,
  onReaction
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
        ]}      >
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onReply(message)}
        >
          <Ionicons name="arrow-undo" size={22} color="#1FAEEB" />
          <Text style={styles.menuItemText}>Trả lời</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => onReaction(message)}
        >
          <Ionicons name="happy" size={22} color="#FFD60A" />
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

const ChatScreen: React.FC<ChatScreenProps> = ({ navigation, route }) => {
  // Sử dụng hook để đảm bảo xác thực sẵn sàng
  const { isLoading: isAuthLoading, isAuthenticated } = useAuthInit();

  // Get conversation data from route params
  const conversationId = route?.params?.conversationId;
  const receiverId = route?.params?.receiverId;
  const chatItem = route?.params?.chatItem || {};

  // State for UI
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false); 
  // State cho việc tải tin nhắn cũ
  const [hasMoreOldMessages, setHasMoreOldMessages] = useState(true);
   // Kiểm tra xem còn tin nhắn cũ hơn không
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [dataView, setDataView] = useState<Message[]>([]);
  const [receiverIsOnline, setReceiverIsOnline] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
   // State for emoji picker visibility
  // Message action menu state
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showMessageActionMenu, setShowMessageActionMenu] = useState(false);
  // Reply message state
  const [replyingToMessage, setReplyingToMessage] = useState<Message | null>(null);
  const [showReplyBar, setShowReplyBar] = useState(false);

  // Reaction state
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [selectedMessageForReaction, setSelectedMessageForReaction] = useState<Message | null>(null);
  const validReactions = ['👍', '❤️', '😂', '😮', '😢', '😡'];
  // File handling state
  const [selectedFiles, setSelectedFiles] = useState<FileInfo[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // Call state
  const [currentCallId, setCurrentCallId] = useState<string | null>(null);

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
            type: msg.type 
            // Preserve the original message type
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

  // Reaction handler functions
  const handleMessageReaction = (message: Message, reaction: string) => {
    const socket = socketService.getSocket();

    if (!socket) {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối với máy chủ. Vui lòng thử lại sau.');
      return;
    }

    // Get current user data
    const userData = socketService.getUserData();
    if (!userData || !userData.id) {
      Alert.alert('Lỗi', 'Không thể xác định người dùng hiện tại.');
      return;
    }

    // Check if user already has this reaction
    const existingReaction = message.reactions?.[reaction];
    const userReaction = existingReaction?.userReactions?.find(ur => ur.user.id === userData.id);

    // If user already has this reaction, remove it (count = 0), otherwise add it
    const count = userReaction ? 0 : 1;

    const reactionData = {
      IDUser: userData.id,
      IDMessage: message.idMessage,
      reaction: reaction,
      count: count
    };

    console.log('Sending reaction:', reactionData);
    socket.emit('add_reaction', reactionData);

    // Close reaction picker
    setShowReactionPicker(false);
    setSelectedMessageForReaction(null);
  };
  const handleShowReactionPicker = (message: Message) => {
    // Close message menu first
    handleCloseMessageMenu();
    setSelectedMessageForReaction(message);
    setShowReactionPicker(true);
  };

  const handleCloseReactionPicker = () => {
    setShowReactionPicker(false);
    setSelectedMessageForReaction(null);
  };

  // Get reaction count for a specific reaction type
  const getReactionCount = (message: Message, reaction: string): number => {
    return message.reactions?.[reaction]?.totalCount || 0;
  };

  // Check if current user has reacted with specific reaction
  const hasUserReacted = (message: Message, reaction: string): boolean => {
    const userData = socketService.getUserData();
    if (!userData || !userData.id) return false;

    const reactionData = message.reactions?.[reaction];
    return reactionData?.userReactions?.some(ur => ur.user.id === userData.id) || false;
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
  // Auto scroll to bottom when view is ready or messages change
  useEffect(() => {
    if (dataView.length > 0) {
      setTimeout(scrollToBottom, 100);
    }
  }, [dataView.length]);

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
    }

    // Cleanup on unmount
    return () => {
      // Remove only the listeners we added in this screen, don't disconnect the socket
      const cleanupSocket = socketService.getSocket();
      if (cleanupSocket) {
        cleanupSocket.off('load_messages_response');
        cleanupSocket.off('receive_message');
        cleanupSocket.off('send_message_success');
        cleanupSocket.off('users_status');
        cleanupSocket.off('recall_message_success');
        cleanupSocket.off('message_recalled');
        cleanupSocket.off('delete_message_success');
        cleanupSocket.off('forward_message_success');
        cleanupSocket.off('reply_message_success');
        cleanupSocket.off('message_reaction_updated');
        cleanupSocket.off('call_ended');
        cleanupSocket.off('call_accepted');
        cleanupSocket.off('call_rejected');
        cleanupSocket.off('call_missed');
        cleanupSocket.off('call_timeout');
        cleanupSocket.off('call_auto_ended');
        cleanupSocket.off('reconnect');
      }
    };
  }, []);  // Setup socket listeners specific to this screen
  const setupSocketListeners = (socket: Socket) => {
    // First remove any existing listeners to avoid duplicates
    socket.off('load_messages_response');
    socket.off('receive_message');
    socket.off('send_message_success');
    socket.off('users_status');
    socket.off('recall_message_success');
    socket.off('message_recalled'); socket.off('delete_message_success'); socket.off('forward_message_success');
    socket.off('reply_message_success');
    socket.off('message_reaction_updated');
    socket.off('call_ended');
    socket.off('call_rejected');
    socket.off('call_missed');
    socket.off('call_timeout');
    socket.off('call_auto_ended');// Load messages response handler
    socket.on('load_messages_response', async (data) => {
      console.log('Messages received:', data);
      setIsLoading(false);
      setIsLoadingOlder(false);

      if (data && data.messages && data.messages.length > 0) {
        // Process messages
        const userData = socketService.getUserData();
        const userId = userData?.id || 'user001';
         // Fallback if not available 
             // First map to add sentByMe flag
        const processedMessages = data.messages.map((msg: Message) => {
          const sentByMe = msg.idSender === userId;
          return {
            ...msg,
            sentByMe
          };
        });

        // Process reply messages to fetch original messages if needed
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
                    sentByMe: msg.messageReply.idSender === userId
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
                    originalMessage: {
                      ...originalMessage,
                      sentByMe: originalMessage.idSender === userId
                    }
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
        }));
        // Then filter out messages that should be hidden for the sender (deleted messages)
        const filteredMessages = messagesWithReplies.filter(msg => {
          // If message is marked as removed AND was sent by current user, hide it
          if (msg.isRemove && msg.idSender === userId) {
            return false; // Filter out this message
          }
          return true; // Keep all other messages
        });

        // Cập nhật hasMoreOldMessages dựa trên phản hồi từ server
        if (data.hasMore !== undefined) {
          setHasMoreOldMessages(data.hasMore);
        } else {
          // Nếu server không trả về hasMore, default là false
          setHasMoreOldMessages(false);
        }

        // Xác định xem đây có phải là tin nhắn cũ hay không
        const isOlderMessages = data.direction === 'older'; if (isOlderMessages) {
          console.log(`Nhận được ${filteredMessages.length} tin nhắn cũ`);

          // Sắp xếp tin nhắn cũ theo thời gian tăng dần để thêm vào đầu danh sách
          const sortedOlderMessages = [...filteredMessages].sort((a, b) => {
            const timeA = new Date(a.dateTime || a.createdAt).getTime();
            const timeB = new Date(b.dateTime || b.createdAt).getTime();
            return timeA - timeB; // Sắp xếp tăng dần: cũ -> mới
          });

          setDataView(prevMessages => {
            // Tạo Set các ID tin nhắn đã có để kiểm tra trùng lặp nhanh hơn
            const existingIds = new Set(prevMessages.map(msg =>
              msg._id || msg.idMessage
            ));

            // Lọc tin nhắn để tránh trùng lặp
            const uniqueNewMessages = sortedOlderMessages.filter(msg =>
              !existingIds.has(msg._id || msg.idMessage)
            );

            console.log(`Thêm ${uniqueNewMessages.length} tin nhắn cũ vào đầu danh sách`);

            // Gộp tin nhắn theo đúng thứ tự: tin cũ ở trên, tin hiện tại ở dưới
            return [...uniqueNewMessages, ...prevMessages];
          });
        } else {
          // Đây là tải tin nhắn ban đầu, thay thế toàn bộ danh sách
          // Sắp xếp tin nhắn theo thời gian như GroupChatScreen: mới nhất ở dưới cùng
          const sortedMessages = [...filteredMessages].reverse();
          setDataView(sortedMessages);

          // Cuộn xuống dưới cùng sau khi tải tin nhắn mới ban đầu
          setTimeout(() => {
            scrollToBottom();
          }, 100);
        }

        // Kiểm tra trạng thái online của người nhận sau khi nhận tin nhắn
        checkReceiverOnlineStatus();
      } else {
        // Nếu không phải là tải tin nhắn cũ, thì đặt danh sách rỗng
        if (!isLoadingOlder) {
          setDataView([]);
        }
        // Không còn tin nhắn cũ nữa
        setHasMoreOldMessages(false);
      }
    });

    // Listen for user status update
    socket.on('users_status', (data) => {
      console.log('Received users status:', data);
      if (data && data.statuses) {
        const userData = socketService.getUserData();
        const currentUserId = userData?.id;

        if (currentUserId) {
          // Xác định ID người nhận
          const idSenderParam = route.params?.idSender;
          const idReceiverParam = route.params?.idReceiver;
          const actualReceiverId = idSenderParam === currentUserId ? idReceiverParam : idSenderParam;

          // Cập nhật trạng thái online của người nhận
          if (actualReceiverId && data.statuses[actualReceiverId] !== undefined) {
            setReceiverIsOnline(data.statuses[actualReceiverId]);
            console.log(`Receiver ${actualReceiverId} is ${data.statuses[actualReceiverId] ? 'online' : 'offline'}`);
          }
        }
      }
    });

    // Listen for receive message event (real-time message receiving)
    socket.on('receive_message', (newMessage) => {
      console.log('New message received (real-time):', newMessage);

      // Add the new message to the chat immediately
      if (newMessage) {
        // Get user ID from the socket service
        const userData = socketService.getUserData();
        const userId = userData?.id || 'user001'; // Fallback if not available
        const sentByMe = newMessage.idSender === userId;

        // Check if the message belongs to current conversation
        const idConversationParam = route.params?.idConversation || conversationId;
        if (newMessage.idConversation !== idConversationParam) {
          console.log('Message is for another conversation, ignoring');
          return;
        }

        // Gửi phản hồi để xác nhận đã nhận được tin nhắn ngay lập tức
        socket.emit('message_received', {
          messageId: newMessage._id || newMessage.idMessage,
          userId: userId
        });

        // Cập nhật trạng thái online của người gửi
        if (!sentByMe) {
          setReceiverIsOnline(true);
        }
        // Thêm tin nhắn mới vào state ngay lập tức, không đợi kiểm tra trùng lặp
        setDataView(prevMessages => {
          // Kiểm tra nhanh xem tin nhắn đã tồn tại chưa
          const messageExists = prevMessages.some(msg => msg._id === newMessage._id);
          if (messageExists) return prevMessages;

          // Nếu không tồn tại, thêm vào ngay lập tức
          const updatedMessages = [...prevMessages, {
            ...newMessage,
            sentByMe,
            // Preserve original message for reply display
            originalMessage: newMessage.originalMessage
          }];

          // Đảm bảo cuộn xuống ngay sau khi thêm tin nhắn
          setTimeout(scrollToBottom, 10);

          return updatedMessages;
        });
      }
    });

    // Listen for send message success
    socket.on('send_message_success', (response) => {
      // Hiển thị đúng trạng thái dựa trên việc người nhận có đang online không
      const statusText = receiverIsOnline ? 'recipient online' : 'recipient offline';
      console.log(`Message sent successfully (${statusText}):`, response);

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
        const userId = userData?.id || 'user001'; // Fallback if not available
        const sentByMe = message.idSender === userId;
        // Nếu là tin nhắn từ người dùng hiện tại
        if (sentByMe) {
          setDataView(prevMessages => {            // Tìm tin nhắn tạm thời tương ứng - kiểm tra cả tempId và content
            const tempIndex = prevMessages.findIndex(msg =>
              (msg.tempId && response.tempId && msg.tempId === response.tempId) ||
              (msg._id && msg._id.startsWith('temp-') && msg.content === message.content)
            );

            // Nếu tìm thấy tin nhắn tạm thời, thay thế bằng tin nhắn chính thức
            if (tempIndex !== -1) {
              const updatedMessages = [...prevMessages];
              updatedMessages[tempIndex] = {
                ...message,
                sentByMe,
                // Preserve original message for reply display
                originalMessage: message.originalMessage
              };
              return updatedMessages;
            }

            // Nếu không tìm thấy tin nhắn tạm thời, thêm tin nhắn mới (tránh trùng lặp)
            const existingMessage = prevMessages.find(msg => msg._id === message._id);
            if (!existingMessage) {
              return [...prevMessages, {
                ...message,
                sentByMe,
                originalMessage: message.originalMessage
              }];
            }

            return prevMessages; 
            // Không thay đổi nếu tin nhắn đã tồn tại
          });
        } else {
          // Nếu là tin nhắn từ người khác
          setDataView(prevMessages => {
            const existingMessage = prevMessages.find(msg => msg._id === message._id);
            if (!existingMessage) {
              return [...prevMessages, {
                ...message,
                sentByMe,
                originalMessage: message.originalMessage
              }];
            }
            return prevMessages;
          });
        }

        // Cuộn xuống ngay lập tức
        scrollToBottom();

        // Kiểm tra lại trạng thái online của người nhận sau khi gửi tin nhắn
        checkReceiverOnlineStatus();
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
          }));
      }
    });    // Listen for reply message success
    socket.on('reply_message_success', (response) => {
      console.log('Reply message sent successfully:', response);
      if (response && response.message) {
        const message = response.message;

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
            // Find temporary message with matching tempId
            const tempIndex = prevMessages.findIndex(msg =>
              msg.tempId && response.tempId && msg.tempId === response.tempId
            );

            if (tempIndex !== -1) {
              console.log('Replacing temporary reply message with official message');
              const updatedMessages = [...prevMessages];
              updatedMessages[tempIndex] = {
                ...message,
                sentByMe,
                // Preserve original message for reply display
                originalMessage: message.originalMessage
              };
              return updatedMessages;
            }

            // If no temp message found, check if message already exists
            const messageExists = prevMessages.some(msg =>
              msg.idMessage === message.idMessage ||
              msg._id === message._id
            );

            if (!messageExists) {
              return [...prevMessages, {
                ...message,
                sentByMe,
                originalMessage: message.originalMessage
              }];
            }

            return prevMessages;
          });
        }     
           // Scroll to bottom to show new reply message
        scrollToBottom();
      }
    });    // Listen for reaction updates
    socket.on('message_reaction_updated', (reactionUpdate) => {
      console.log('Message reaction updated:', reactionUpdate);

      if (reactionUpdate && reactionUpdate.messageId) {
        const { messageId, reactions } = reactionUpdate;

        // Check if the reaction belongs to current conversation
        const idConversationParam = route.params?.idConversation || conversationId;

        setDataView(prevMessages =>
          prevMessages.map(msg => {
            if (msg.idMessage === messageId) {
              return {
                ...msg,
                reactions: reactions
              };
            }
            return msg;
          })
        );
      }
    });    // Listen for call outcome events to create call messages
    socket.on('call_ended', (data) => {
      console.log('Call ended event received:', data);
      createCallMessage(data, 'ended');
    }); socket.on('call_accepted', (data) => {
      console.log('Call accepted event received:', data);
      // Clear current call ID since call is now active
      setCurrentCallId(null);

      // Chuyển sang CallScreen khi người nhận đồng ý
      if (data && data.roomUrl && data.callId) {
        const userData = socketService.getUserData();
        const actualReceiverId = route.params?.idSender === userData?.id ? route.params?.idReceiver : route.params?.idSender;

        // Dismiss any waiting alerts by showing a brief success message
        Alert.alert('', 'Cuộc gọi đã được chấp nhận!', [], { cancelable: true });

        // Navigate to CallScreen
        setTimeout(() => {
          navigateToDailyCall(data.roomUrl, actualReceiverId, data.callId);
        }, 500);
      }
    });

    socket.on('call_rejected', (data) => {
      console.log('Call rejected event received:', data);
      // Clear current call ID and auto end call
      setCurrentCallId(null);

      // Auto end call with reason "rejected" - không cần chuyển CallScreen
      if (data && data.callId) {
        const userData = socketService.getUserData();
        if (userData?.id) {
          socketService.endCall({
            callId: data.callId,
            userId: userData.id,
            reason: 'rejected'
          });
        }
      }

      createCallMessage(data, 'rejected');

      // Dismiss waiting alerts and show rejection message
      Alert.alert('Cuộc gọi bị từ chối', `${data.rejectedBy?.fullname || data.receiver?.fullname || 'Người nhận'} đã từ chối cuộc gọi.`);
    });

    socket.on('call_missed', (data) => {
      console.log('Call missed event received:', data);
      createCallMessage(data, 'missed');
    });

    socket.on('call_timeout', (data) => {
      console.log('Call timeout event received:', data);
      createCallMessage(data, 'timeout');
    });

    socket.on('call_auto_ended', (data) => {
      console.log('Call auto ended event received:', data);
      createCallMessage(data, 'auto_ended');
    });
  };

  // Function to create call message based on call outcome
  const createCallMessage = (callData: any, outcome: 'ended' | 'rejected' | 'missed' | 'timeout' | 'auto_ended') => {
    const userData = socketService.getUserData();
    const currentUserId = userData?.id;

    if (!callData || !currentUserId) {
      console.log('Missing call data or user ID, cannot create call message');
      return;
    }

    // Check if this call message belongs to current conversation
    const idConversationParam = route.params?.idConversation || conversationId;

    // For 1-on-1 calls, check if we're part of this call
    const isInvolvedInCall = callData.callerId === currentUserId || callData.receiverId === currentUserId;

    if (!isInvolvedInCall) {
      console.log('Not involved in this call, ignoring call message');
      return;
    }

    // Generate call message content based on outcome and caller/receiver relationship
    let messageContent = '';
    const isCaller = callData.callerId === currentUserId;
    const callType = callData.callType === 'video' ? 'video' : 'audio';
    const callTypeText = callType === 'video' ? 'cuộc gọi video' : 'cuộc gọi thoại';

    switch (outcome) {
      case 'ended':
        const duration = callData.duration || '0 giây';
        messageContent = `${callTypeText} đã kết thúc - Thời gian: ${duration}`;
        break;
      case 'rejected':
        if (isCaller) {
          messageContent = `${callTypeText} bị từ chối`;
        } else {
          messageContent = `Đã từ chối ${callTypeText}`;
        }
        break;
      case 'missed':
        if (isCaller) {
          messageContent = `${callTypeText} không được trả lời`;
        } else {
          messageContent = `Cuộc gọi nhỡ - ${callTypeText}`;
        }
        break;
      case 'timeout':
        messageContent = `${callTypeText} hết thời gian chờ`;
        break;
      case 'auto_ended':
        messageContent = `${callTypeText} tự động kết thúc`;
        break;
    }

    // Create call message object
    const callMessage: Message = {
      _id: `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      idMessage: `call-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      idSender: 'system', // System generated message
      idReceiver: isCaller ? callData.receiverId : callData.callerId,
      idConversation: idConversationParam || '',
      type: 'call',
      content: messageContent,
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
      sentByMe: false, // System message, not sent by user
      // Additional call data
      callData: {
        callType: callType,
        outcome: outcome,
        duration: callData.duration,
        callerId: callData.callerId,
        receiverId: callData.receiverId,
        callerName: callData.callerName
      }
    };

    // Add call message to chat
    setDataView(prevMessages => [...prevMessages, callMessage]);

    // Scroll to bottom to show new call message
    setTimeout(scrollToBottom, 100);
  };

  // Function to load messages
  const loadMessages = (idConversation: string) => {
    setIsLoading(true);
    const socket = socketService.getSocket();
    if (socket) {
      console.log('Emitting load_messages with IDConversation:', idConversation);

      // Đảm bảo socket đã sẵn sàng trước khi gửi yêu cầu
      if (socket.connected) {
        socket.emit('load_messages', { IDConversation: idConversation });
      } else {
        // Nếu socket chưa kết nối, đợi kết nối rồi mới gửi yêu cầu
        socket.on('connect', () => {
          socket.emit('load_messages', { IDConversation: idConversation });
        });
      }

      // Set a timeout to prevent infinite loading if server doesn't respond
      setTimeout(() => {
        if (isLoading) {
          console.warn('Load messages timeout - no response from server after 5 seconds');
          setIsLoading(false);
        }
      }, 5000);
    } else {
      console.error('Socket not available to load messages');
      setIsLoading(false);
    }

    // Hiện thị trạng thái online của người nhận khi load tin nhắn
    setTimeout(() => {
      checkReceiverOnlineStatus();
    }, 1000);
  };
  // Function to load older messages
  const loadOlderMessages = () => {
    // Nếu đang tải hoặc đã tải hết tin nhắn cũ thì không làm gì
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

    setIsLoadingOlder(true);
    const socket = socketService.getSocket();

    if (socket) {
      const idConversationParam = route.params?.idConversation || conversationId;

      console.log('Loading older messages for conversation:', idConversationParam);
      console.log('Oldest message ID:', oldestMessageId);

      // Gửi yêu cầu tải tin nhắn cũ hơn với ID của tin nhắn cũ nhất hiện tại
      socket.emit('load_messages', {
        IDConversation: idConversationParam,
        lastMessageId: oldestMessageId
      });

      // Đặt timeout để tránh tình trạng loading vô tận nếu server không phản hồi
      setTimeout(() => {
        if (isLoadingOlder) {
          console.warn('Load older messages timeout - no response from server after 5 seconds');
          setIsLoadingOlder(false);
        }
      }, 5000);
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

    // Get conversation parameters from route
    const idConversationParam = route.params?.idConversation;
    const idSenderParam = route.params?.idSender;
    const idReceiverParam = route.params?.idReceiver;

    // Validate required parameters
    if (!idConversationParam || !idSenderParam || !idReceiverParam) {
      console.log('Route params:', route.params);
      console.error('Conversation ID, Sender ID or Receiver ID not available in route params. Cannot send message.');
      return;
    }

    // Get current user ID
    const currentUserId = userData.id;

    // Người gửi luôn là người dùng hiện tại
    const actualSenderId = currentUserId;

    // Người nhận là bên còn lại trong cuộc trò chuyện
    const actualReceiverId = idSenderParam === currentUserId ? idReceiverParam : idSenderParam;

    // Ensure we're not trying to send a message to ourselves
    if (actualSenderId === actualReceiverId) {
      console.error('Cannot send message to self. Sender ID and Receiver ID are the same.');
      return;
    }
    const messageContent = messageText.trim();

    // Tạo một ID tạm thời để theo dõi tin nhắn
    const tempId = `temp-${Date.now()}`;

    // Check if this is a reply message
    const isReply = replyingToMessage !== null;

    // Tạo tin nhắn tạm thời để hiển thị ngay lập tức
    const tempMessage: Message = {
      _id: tempId,
      idMessage: tempId,
      idSender: actualSenderId,
      idReceiver: actualReceiverId,
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
      // Add original message if replying
      originalMessage: isReply ? replyingToMessage : undefined
    };

    // Thêm tin nhắn tạm thời vào state để hiển thị tức thì
    setDataView(prevMessages => [...prevMessages, tempMessage]);
    // Cuộn xuống để xem tin nhắn mới ngay lập tức
    setTimeout(scrollToBottom, 10);

    if (isReply && replyingToMessage) {
      // Prepare reply message data for the server
      const replyMessageData = {
        IDSender: actualSenderId,
        IDReceiver: actualReceiverId,
        IDConversation: idConversationParam,
        IDMessageReply: replyingToMessage.idMessage,
        textMessage: messageContent,
        type: 'text',
        fileUrl: '',
        tempId: tempId
      };

      console.log('Sending reply message:', replyMessageData);

      // Kiểm tra trạng thái socket trước khi gửi
      if (!socket.connected) {
        console.warn('Socket disconnected. Attempting to reconnect before sending reply message...');
        socket.connect();

        socket.once('connect', () => {
          console.log('Socket reconnected. Sending reply message...');
          socket.emit('reply_message', replyMessageData);
        });
      } else {
        socket.emit('reply_message', replyMessageData);
      }

      // Clear reply state
      handleCancelReply();
    } else {
      // Chuẩn bị dữ liệu tin nhắn theo định dạng yêu cầu của server
      const messageData = {
        IDSender: actualSenderId,
        IDReceiver: actualReceiverId,
        textMessage: messageContent,
        type: 'text',
        fileUrl: '',
        tempId: tempId // Gửi ID tạm thời để có thể theo dõi tin nhắn này
      };

      // Kiểm tra trạng thái socket trước khi gửi
      if (!socket.connected) {
        console.warn('Socket disconnected. Attempting to reconnect before sending message...');
        socket.connect();

        // Đăng ký sự kiện connect để gửi tin nhắn sau khi kết nối lại
        socket.once('connect', () => {
          console.log('Socket reconnected. Sending message...');
          socket.emit('send_message', messageData);
          console.log('Message sent after reconnection:', messageData);
        });
      } else {
        // Gửi tin nhắn qua socket nếu kết nối đã sẵn sàng
        console.log('Sending message in real-time:', messageData);
        socket.emit('send_message', messageData);
      }
    }

    // Xóa nội dung tin nhắn trong input
    setMessageText('');
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
  // Function to start a call (audio or video) using backend CallController
  const handleStartCall = async (callType: 'audio' | 'video') => {
    const socket = socketService.getSocket();
    if (!socket) {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối với máy chủ. Vui lòng thử lại sau.');
      return;
    }

    // Get current user data
    const userData = socketService.getUserData();
    if (!userData || !userData.id) {
      Alert.alert('Lỗi xác thực', 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
      return;
    }

    // Determine actual receiver ID
    const idSenderParam = route.params?.idSender;
    const idReceiverParam = route.params?.idReceiver;
    const currentUserId = userData.id;
    const actualReceiverId = idSenderParam === currentUserId ? idReceiverParam : idSenderParam;

    if (!actualReceiverId) {
      Alert.alert('Lỗi', 'Không thể xác định người nhận cuộc gọi.');
      return;
    } try {
      // Hiển thị loading
      setIsLoading(true);

      // Gửi thông báo về cuộc gọi qua SocketService với backend integration
      // Backend sẽ tạo room URL và trả về trong response
      const socketService = SocketService.getInstance();
      const callResult = await socketService.initiateCall({
        callerId: currentUserId,
        receiverId: actualReceiverId,
        callType: callType,
        // Include full caller info for backend to properly handle
        caller: {
          id: currentUserId,
          fullname: userData.fullname || 'Người dùng',
          urlavatar: userData.urlavatar || null
        },
        // Include receiver info if available from chatItem
        receiver: {
          id: actualReceiverId,
          fullname: chatItem?.name || 'Người nhận',
          urlavatar: chatItem?.avatar || null
        }
      });

      // Ẩn loading
      setIsLoading(false);
      // Không chuyển ngay sang CallScreen - chờ người nhận accept_call
      if (callResult && callResult.roomUrl) {
        // Lưu callId để có thể hủy cuộc gọi
        const newCallId = callResult.idCall || callResult.callId;
        setCurrentCallId(newCallId);

        // Show waiting for response UI or just wait for socket events
        console.log('Call initiated successfully, waiting for receiver to accept...');
        Alert.alert(
          'Đang gọi...',
          `Đang chờ ${chatItem?.name || 'người nhận'} trả lời cuộc gọi.`,
          [
            {
              text: 'Hủy cuộc gọi',
              onPress: () => {
                // End call with reason 'cancelled'
                if (newCallId) {
                  socketService.endCall({
                    callId: newCallId,
                    userId: currentUserId,
                    reason: 'cancelled'
                  });
                  setCurrentCallId(null);
                }
              },
              style: 'cancel'
            }
          ]
        );
      } else {
        Alert.alert('Lỗi', 'Không thể khởi tạo cuộc gọi. Vui lòng thử lại sau.');
      }
    } catch (error) {
      setIsLoading(false);
      console.error('Error initiating call:', error);
      Alert.alert('Lỗi', 'Không thể khởi tạo cuộc gọi. Vui lòng thử lại sau.');
    }
  };  // Navigate to backend-provided call screen
  const navigateToDailyCall = (roomUrl: string, receiverId: string, callId?: string) => {
    // Get user names
    const userData = socketService.getUserData();
    const currentUserName = userData?.fullname || 'Tôi';
    const receiverName = chatItem?.name || 'Người dùng';

    // Navigate to CallScreen with room URL from backend CallController
    navigation.navigate('CallScreen', {
      url: roomUrl, // Use room URL directly from backend
      userName: currentUserName,
      otherUserName: receiverName,
      callerId: userData?.id,
      receiverId: receiverId,
      callId: callId // Pass callId for proper backend call ending
    });
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

  // File handling functions
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

    // Get conversation parameters
    const idConversationParam = route.params?.idConversation;
    const idSenderParam = route.params?.idSender;
    const idReceiverParam = route.params?.idReceiver;

    if (!idConversationParam || !idSenderParam || !idReceiverParam) {
      console.error('Conversation ID, Sender ID or Receiver ID not available. Cannot send message.');
      return;
    }

    // Current user is always the sender
    const currentUserId = userData.id;
    const actualSenderId = currentUserId;
    const actualReceiverId = idSenderParam === currentUserId ? idReceiverParam : idSenderParam;

    // Create temp ID for tracking
    const tempId = `temp-${Date.now()}`;

    // Create temp message for instant display
    const tempMessage: Message = {
      _id: tempId,
      idMessage: tempId,
      idSender: actualSenderId,
      idReceiver: actualReceiverId,
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
      sentByMe: true
    };

    // Add temp message to chat
    setDataView(prevMessages => [...prevMessages, tempMessage]);

    // Scroll to see new message
    setTimeout(scrollToBottom, 10);

    // Create socket message payload
    const messageData = {
      IDSender: actualSenderId,
      IDReceiver: actualReceiverId,
      type: fileType,
      fileUrl: fileUrl,
      tempId: tempId
    };

    // Send message via socket
    if (!socket.connected) {
      console.warn('Socket disconnected. Attempting to reconnect...');
      socket.connect();

      socket.once('connect', () => {
        socket.emit('send_message', messageData);
      });
    } else {
      socket.emit('send_message', messageData);
    }
  };

  // Render Zalo-style heart button for messages
  const renderZaloHeartButton = (message: Message) => (
    <TouchableOpacity
      style={styles.zaloHeartButton}
      onPress={() => handleMessageReaction(message, '❤️')}
      onLongPress={() => handleShowReactionPicker(message)}
      delayLongPress={500}
    >
      <Ionicons name="heart-outline" size={12} color="#000" />
    </TouchableOpacity>
  );

  // Render reactions for a message - Zalo style
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
            onPress={() => handleMessageReaction(message, '👍')}
          >
            <Text style={styles.zaloThumbsUpEmoji}>👍</Text>
            <Text style={styles.zaloReactionCount}>{thumbsUpReaction[1].totalCount}</Text>
          </TouchableOpacity>
        )}

        {heartReaction && heartReaction[1].totalCount > 0 && (
          <TouchableOpacity
            style={styles.zaloHeartDisplayContainer}
            onPress={() => handleMessageReaction(message, '❤️')}
          >
            <Text style={styles.zaloHeartEmoji}>❤️</Text>
            <Text style={styles.zaloReactionCount}>{heartReaction[1].totalCount}</Text>
          </TouchableOpacity>
        )}

        {/* Show other reactions in compact form */}
        {validReactionEntries
          .filter(([emoji, reactionData]) =>
            emoji !== '👍' && emoji !== '❤️' && reactionData.totalCount > 0
          )
          .map(([emoji, reactionData]) => {
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
                onPress={() => handleMessageReaction(message, emoji)}
              >
                <Text style={styles.zaloOtherReactionEmoji}>{emoji}</Text>
                <Text style={[
                  styles.zaloOtherReactionCount,
                  { color: isUserReacted ? '#FFFFFF' : '#333333' }
                ]}>{reactionData.totalCount}</Text>
              </TouchableOpacity>
            );
          })}
      </View>
    );
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1FAEEB" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FDF8F8" />
        </TouchableOpacity>    
            <Text style={styles.headerTitle} numberOfLines={1}>
          {chatItem?.name || ""}
        </Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => handleStartCall('audio')}
          >
            <Ionicons name="call" size={24} color="#FDF8F8" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => handleStartCall('video')}
          >
            <Ionicons name="videocam" size={24} color="#FDF8F8" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconButton}>
            <Ionicons name="ellipsis-vertical" size={20} color="#FDF8F8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1FAEEB" />
          <Text style={styles.loadingText}>Đang tải tin nhắn...</Text>
        </View>) : (
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
            removeClippedSubviews={false}
            // Ngăn không cho các view bị xóa khi không hiển thị
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
                  Hãy bắt đầu cuộc trò chuyện!
                </Text>
              </View>
            } renderItem={({ item: message }) => (
              <TouchableOpacity
                activeOpacity={message.type === 'call' || message.idSender === 'system' ? 1 : 0.8}
                delayLongPress={200}
                onLongPress={message.type === 'call' || message.idSender === 'system' ? undefined : () => handleLongPressMessage(message)}
              >
                {/* Handle call messages as system messages with centered layout */}
                {message.type === 'call' ? (
                  <View style={styles.systemMessageContainer}>
                    <View style={styles.callSystemMessageBubble}>
                      <View style={styles.callIconContainer}>
                        <Ionicons
                          name={message.callData?.callType === 'video' ? 'videocam' : 'call'}
                          size={16}
                          color={message.callData?.outcome === 'ended' ? '#4CAF50' :
                            message.callData?.outcome === 'rejected' ? '#F44336' :
                              message.callData?.outcome === 'missed' ? '#FF9800' : '#757575'}
                        />
                      </View>
                      <View style={styles.callMessageContent}>
                        <Text style={styles.callMessageText}>{message.content}</Text>
                        <Text style={styles.callMessageTime}>
                          {formatMessageTime(message.dateTime)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.messageBubble,
                      message.sentByMe ? styles.myMessage : styles.theirMessage,
                      message.type !== 'text' ? styles.fileMessageBubble : null,
                      (message.isRecall || message.isRemove) && styles.recalledMessage
                    ]}
                  >
                    {/* Show replied message if this is a reply - Zalo style */}
                    {message.isReply && message.originalMessage && (
                      <TouchableOpacity
                        style={styles.zaloRepliedMessageContainer}
                        onPress={() => {
                          // Handle quoted message press if needed
                          console.log('Quoted message pressed:', message.originalMessage);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.zaloRepliedMessageBar} />
                        <View style={styles.zaloRepliedMessageContent}>
                          <Text
                            style={styles.zaloRepliedSenderName}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {message.originalMessage.sentByMe ? 'Bạn' : (chatItem?.name || 'Người dùng')}
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
                      <Text style={styles.recalledMessageText}>Tin nhắn đã được thu hồi</Text>
                    ) : message.type === 'image' ? (
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
                      </View>
                    ) : (
                      <View style={styles.zaloMessageContentContainer}>
                        <View style={styles.zaloMessageTextContainer}>
                          <Text style={styles.messageText} numberOfLines={0}>{message.content}</Text>
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
                )}
              </TouchableOpacity>
            )} />

          {/* Reply Bar */}
          {showReplyBar && replyingToMessage && (
            <View style={styles.replyBarContainer}>
              <View style={styles.replyBar}>
                <Ionicons name="arrow-undo" size={16} color="#1FAEEB" />
                <View style={styles.replyContent}>
                  <View style={styles.replyHeader}>
                    <Text style={styles.replyToText}>Trả lời</Text>
                    <Text style={styles.replySenderName}>
                      {replyingToMessage.sentByMe ? 'bạn' : (chatItem?.name || 'Người dùng')}
                    </Text>
                  </View>
                  <Text style={styles.replyMessageText} numberOfLines={1}>
                    {replyingToMessage.type === 'text' ? replyingToMessage.content :
                      replyingToMessage.type === 'image' ? '📷 Hình ảnh' :
                        replyingToMessage.type === 'video' ? '🎥 Video' :
                          replyingToMessage.type === 'document' ? '📄 Tài liệu' : 'Tin nhắn'}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleCancelReply}>
                  <Ionicons name="close" size={20} color="#666" />
                </TouchableOpacity>
              </View>        
                  </View>
          )}
          {/* Reaction Picker Modal */}
          {showReactionPicker && selectedMessageForReaction && (
            <TouchableOpacity
              style={styles.reactionPickerOverlay}
              activeOpacity={1}
              onPress={handleCloseReactionPicker}
            >
              <View style={styles.reactionPickerContainer}>
                <View style={styles.reactionPickerBar}>
                  <View style={styles.reactionOptionsRow}>
                    {validReactions.map((reaction) => (
                      <TouchableOpacity
                        key={reaction}
                        style={[
                          styles.reactionOptionButton,
                          hasUserReacted(selectedMessageForReaction, reaction) && styles.selectedReactionOptionButton
                        ]}
                        onPress={() => handleMessageReaction(selectedMessageForReaction, reaction)}
                      >
                        <Text style={styles.reactionOptionEmoji}>{reaction}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {/* Arrow tail pointing down */}
                  <View style={styles.reactionPickerTail} />
                </View>
              </View>
            </TouchableOpacity>
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
                onChangeText={setMessageText}
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
      )}

      {/* Render file preview */}
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
          onReaction={handleShowReactionPicker}
        />
      )}
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
  headerTitle: {
    color: '#FDF8F8',
    fontSize: 14,
    fontFamily: 'Inter',
    fontWeight: '400',
    flex: 1,
    marginLeft: 10,
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
  },
  messageBubble: {
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 5,
    maxWidth: '75%',
  },
  myMessage: {
    backgroundColor: '#FFFCFC',
    alignSelf: 'flex-end',
  },
  theirMessage: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 20,
  }, messageTime: {
    fontSize: 10,
    color: '#999',
    flex: 1,
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
  playButton: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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
  }, documentName: {
    fontSize: 13,
    color: '#000000',
    marginLeft: 8,
    flex: 1,
  },
  // Call message styles
  callMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    minWidth: 180,
  },
  callIconContainer: {
    marginRight: 12,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  callMessageContent: {
    flex: 1,
  }, callMessageText: {
    fontSize: 13,
    color: '#000000',
    fontStyle: 'italic',
  },
  // System message styles for call messages
  systemMessageContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    marginVertical: 5,
    width: '100%',
  },
  callSystemMessageBubble: {
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '80%',
  },
  callMessageTime: {
    fontSize: 10,
    color: '#757575',
    marginTop: 2,
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
  }, noMoreMessagesText: {
    textAlign: 'center',
    color: '#999',
    paddingVertical: 10,
    fontSize: 12,
    fontStyle: 'italic',
  },
  // Reply message styles
  repliedMessageContainer: {
    backgroundColor: 'rgba(31, 174, 235, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#1FAEEB',
    paddingLeft: 8,
    paddingVertical: 4,
    marginBottom: 4,
    borderRadius: 4,
  },
  repliedMessageBar: {
    borderLeftWidth: 3,
    borderLeftColor: '#1FAEEB',
    paddingLeft: 6,
  }, repliedMessageContent: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  repliedSenderName: {
    fontSize: 11,
    color: '#1FAEEB',
    fontWeight: '600',
    marginBottom: 2,
  },
  replyBarContainer: {
    backgroundColor: '#F8F8F8',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#1FAEEB',
  },
  replyContent: {
    flex: 1,
    marginLeft: 8,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  replyToText: {
    fontSize: 12,
    color: '#1FAEEB',
    fontWeight: '600',
  },
  replySenderName: {
    fontSize: 12,
    color: '#1FAEEB',
    fontWeight: '500',
    marginLeft: 4,
  }, replyMessageText: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },

  // Message content container
  messageContentContainer: {
    flex: 1,
  },

  // Message footer with time and reactions
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
  },

  // Reaction footer container
  reactionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Existing reactions container (when users have already reacted)
  existingReactionsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },

  // Existing reaction bubble (for reactions that already exist)
  existingReactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },

  // User's existing reaction bubble
  userExistingReactionBubble: {
    backgroundColor: 'rgba(31, 174, 235, 0.2)',
    borderColor: '#1FAEEB',
  },

  // Existing reaction emoji
  existingReactionEmoji: {
    fontSize: 12,
    marginRight: 2,
  },

  // Existing reaction count
  existingReactionCount: {
    fontSize: 10,
    color: '#333',
    fontWeight: '600',
  },

  // Quick reactions container (for like and heart buttons)
  quickReactionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Quick reaction button (like and heart)
  quickReactionButton: {
    width: 26,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
    position: 'relative',
  },

  // Active quick reaction button
  activeQuickReactionButton: {
    backgroundColor: 'rgba(31, 174, 235, 0.2)',
    borderColor: '#1FAEEB',
  },
  // Quick reaction emoji
  quickReactionEmoji: {
    fontSize: 12,
  },

  // Quick reaction count
  quickReactionCount: {
    fontSize: 8,
    color: '#333',
    fontWeight: '600',
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#fff',
    borderRadius: 6,
    minWidth: 12,
    height: 12,
    textAlign: 'center',
    lineHeight: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  // Reaction picker styles - Horizontal bar design
  reactionPickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001,
  },

  reactionPickerContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },

  reactionPickerBar: {
    backgroundColor: 'white',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    position: 'relative',
  },

  reactionOptionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    minWidth: 280,
  },

  reactionOptionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    width: 36,
    height: 36,
    marginHorizontal: 4,
    backgroundColor: 'transparent',
  },

  selectedReactionOptionButton: {
    backgroundColor: 'rgba(31, 174, 235, 0.1)',
    transform: [{ scale: 1.2 }],
  },

  reactionOptionEmoji: {
    fontSize: 24,
  },
  reactionPickerTail: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'white',
  },
  reactionOptionCount: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
    marginTop: 2,
  },

  // Zalo-style message content styles
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
  },

  // Zalo-style heart button
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
  },

  // Zalo-style reactions container
  zaloReactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginBottom: 5,
    alignSelf: 'flex-end',
    maxWidth: '100%',
  },

  // Zalo-style thumbs up container
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
  },

  // Other reactions
  zaloOtherReactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginRight: 4,
    marginBottom: 2,
  },
  zaloOtherReactionChipActive: {
    backgroundColor: '#1FAEEB',
    borderColor: '#1FAEEB',
  },
  zaloOtherReactionEmoji: {
    fontSize: 12,
  },
  zaloOtherReactionCount: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 3,
  },

  // Zalo-style Replied Message in Bubble styles
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
});

export default ChatScreen;
