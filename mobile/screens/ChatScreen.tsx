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
const API_URL = 'http://192.168.0.105:3000';

// Define allowed file types
const allowedTypes = {
  'image': ['image/jpeg','image/jpg', 'image/png', 'image/gif'],
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
  __v: number;
  sentByMe?: boolean;
}

// Message Action Menu component
interface MessageActionMenuProps {
  message: Message;
  onClose: () => void;
  onForward: (message: Message) => void;
  onRecall: (message: Message) => void;
  onDelete: (message: Message) => void;
}

const MessageActionMenu: React.FC<MessageActionMenuProps> = ({ 
  message, 
  onClose, 
  onForward, 
  onRecall, 
  onDelete 
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
  const [isLoadingOlder, setIsLoadingOlder] = useState(false); // State cho việc tải tin nhắn cũ
  const [hasMoreOldMessages, setHasMoreOldMessages] = useState(true); // Kiểm tra xem còn tin nhắn cũ hơn không
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [dataView, setDataView] = useState<Message[]>([]);
  const [receiverIsOnline, setReceiverIsOnline] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false); // State for emoji picker visibility
  
  // Message action menu state
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showMessageActionMenu, setShowMessageActionMenu] = useState(false);
  
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
    }      // Cleanup on unmount
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
    socket.off('message_recalled');
    socket.off('delete_message_success');
    socket.off('forward_message_success');    // Load messages response handler
    socket.on('load_messages_response', (data) => {
      console.log('Messages received:', data);
      setIsLoading(false);
      setIsLoadingOlder(false);
      
      if (data && data.messages && data.messages.length > 0) {
        // Process messages
        const userData = socketService.getUserData();
        const userId = userData?.id || 'user001'; // Fallback if not available
        
        // First map to add sentByMe flag
        const processedMessages = data.messages.map((msg: Message) => {
          const sentByMe = msg.idSender === userId;
          return {
            ...msg,
            sentByMe
          };
        });
        
        // Then filter out messages that should be hidden for the sender (deleted messages)
        const filteredMessages = processedMessages.filter(msg => {
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
        const isOlderMessages = data.direction === 'older';
        
        if (isOlderMessages) {
          console.log(`Nhận được ${filteredMessages.length} tin nhắn cũ`);
          
          // Đảo ngược thứ tự để tin nhắn cũ hơn nằm trên cùng
          const reversedMessages = [...filteredMessages].reverse();
          
          setDataView(prevMessages => {
            // Tạo Set các ID tin nhắn đã có để kiểm tra trùng lặp nhanh hơn
            const existingIds = new Set(prevMessages.map(msg => 
              msg._id || msg.idMessage
            ));
            
            // Lọc tin nhắn để tránh trùng lặp
            const uniqueNewMessages = reversedMessages.filter(msg => 
              !existingIds.has(msg._id || msg.idMessage)
            );
            
            console.log(`Thêm ${uniqueNewMessages.length} tin nhắn cũ vào đầu danh sách`);
            
            // Gộp tin nhắn theo đúng thứ tự: tin cũ ở trên, tin mới ở dưới
            return [...uniqueNewMessages, ...prevMessages];
          });
        } else {
          // Đây là tải tin nhắn ban đầu, thay thế toàn bộ danh sách
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
            sentByMe
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
          setDataView(prevMessages => {
            // Tìm tin nhắn tạm thời tương ứng
            const tempIndex = prevMessages.findIndex(msg => 
              msg._id && msg._id.startsWith('temp-') && msg.content === message.content
            );
            
            // Nếu tìm thấy tin nhắn tạm thời, thay thế bằng tin nhắn chính thức
            if (tempIndex !== -1) {
              const updatedMessages = [...prevMessages];
              updatedMessages[tempIndex] = {
                ...message,
                sentByMe
              };
              return updatedMessages;
            }
            
            // Nếu không tìm thấy tin nhắn tạm thời, thêm tin nhắn mới (tránh trùng lặp)
            const existingMessage = prevMessages.find(msg => msg._id === message._id);
            if (!existingMessage) {
              return [...prevMessages, {
                ...message,
                sentByMe
              }];
            }
            
            return prevMessages; // Không thay đổi nếu tin nhắn đã tồn tại
          });
        } else {
          // Nếu là tin nhắn từ người khác
          setDataView(prevMessages => {
            const existingMessage = prevMessages.find(msg => msg._id === message._id);
            if (!existingMessage) {
              return [...prevMessages, {
                ...message,
                sentByMe
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
          })
        );
      }
    });
  };// Function to load messages
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
      isReply: false,
      isForward: false,
      isRemove: false,
      idMessageReply: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      __v: 0,
      sentByMe: true
    };
    
    // Thêm tin nhắn tạm thời vào state để hiển thị tức thì
    setDataView(prevMessages => [ ...prevMessages,tempMessage]);
    
    // Cuộn xuống để xem tin nhắn mới ngay lập tức
    setTimeout(scrollToBottom, 10);
    
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
          {chatItem?.name || "Bảo Ngọc"}
        </Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.headerIconButton}>
            <Ionicons name="call" size={24} color="#FDF8F8" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconButton}>
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
        </View>      ) : (     
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
                  Hãy bắt đầu cuộc trò chuyện!
                </Text>
              </View>
            }renderItem={({ item: message }) => (
              <TouchableOpacity
                activeOpacity={0.8}
                delayLongPress={200}
                onLongPress={() => handleLongPressMessage(message)}
              >
                <View
                  style={[
                    styles.messageBubble,
                    message.sentByMe ? styles.myMessage : styles.theirMessage,
                    message.type !== 'text' ? styles.fileMessageBubble : null,
                    (message.isRecall || message.isRemove) && styles.recalledMessage
                  ]}
                >            
                      {message.isRecall ? (
                    // Recalled message style
                    <Text style={styles.recalledMessageText}>Tin nhắn đã được thu hồi</Text>
                  ) : message.type === 'image' ? (
                    <View>
                      <Image 
                        source={{ uri: message.content }} 
                        style={styles.messageImage}
                        resizeMode="cover"
                      />
                      <Text style={styles.messageTime}>
                        {formatMessageTime(message.dateTime)}
                      </Text>
                    </View>
                  ) : message.type === 'video' ? (
                    <VideoMessage 
                      uri={message.content} 
                      timestamp={formatMessageTime(message.dateTime)} 
                    />
                  ) : message.type === 'document' ? (
                    <DocumentMessage
                      uri={message.content}
                      timestamp={formatMessageTime(message.dateTime)}
                    />
                  ) : (
                    <>
                      <Text style={styles.messageText} numberOfLines={0}>{message.content}</Text>
                      <Text style={styles.messageTime}>
                        {formatMessageTime(message.dateTime)}
                      </Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            )}
          />         
           {/* Input area */} 
                    <View style={styles.inputContainer}>
            <TouchableOpacity 
              style={styles.attachButton}
              onPress={() => setShowEmojiPicker(!showEmojiPicker)}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
              activeOpacity={0.7}
            >
              <Ionicons name="happy-outline" size={26} color="#645C5C" />
            </TouchableOpacity>       
                 <TouchableOpacity 
              style={styles.attachButton}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
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
  },
  messageTime: {
    fontSize: 10,
    color: '#645C5C',
    alignSelf: 'flex-end',
    marginTop: 2,
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
  },  recalledMessageText: {
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
  },
});

export default ChatScreen;
