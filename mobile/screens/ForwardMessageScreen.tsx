import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  FlatList,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SocketService from '../services/SocketService';

// Define conversation type interface
interface Conversation {
  _id: string;
  idConversation: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  isOnline?: boolean;
  selected?: boolean; // For selection state
  isGroup?: boolean; // Identify if it's a group conversation
  groupName?: string; // Name of the group if it's a group conversation
  groupAvatar?: string; // Avatar of the group if it's a group conversation
}

// Define message type interface
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
}

// Define props type
type ForwardMessageScreenProps = {
  navigation: any;
  route: {
    params: {
      message: Message;
    };
  };
};

const ForwardMessageScreen: React.FC<ForwardMessageScreenProps> = ({ navigation, route }) => {
  // Get message from route params
  const { message } = route.params;

  // State for conversations
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversations, setSelectedConversations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get socket service instance
  const socketService = SocketService.getInstance();

  // Load conversations on component mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Function to load conversations
  const loadConversations = async () => {
    setIsLoading(true);
    const socket = socketService.getSocket();
    
    if (!socket) {
      console.error('Socket not connected. Cannot load conversations.');
      setIsLoading(false);
      return;
    }

    // Get user data for sender ID
    const userData = socketService.getUserData();
    if (!userData || !userData.id) {
      console.error('User data not available. Cannot load conversations.');
      setIsLoading(false);
      return;
    }    // First remove any existing listeners to avoid duplicates
    socket.off('load_conversations_response');
    socket.off('load_group_conversations_response');

    // Setup listener for individual conversations response
    socket.on('load_conversations_response', (data) => {
      console.log('Individual conversations received:', data);
      
      if (data && data.Items && Array.isArray(data.Items)) {
        // Process the individual conversation data from Items array
        const processedConversations = data.Items.map(item => {
          // Extract the relevant information
          return {
            _id: item._id,
            idConversation: item.idConversation,
            name: item.otherUser?.fullname || 'Unknown',
            avatar: item.otherUser?.urlavatar,
            lastMessage: item.latestMessage?.content,
            lastMessageTime: item.latestMessage?.dateTime,
            unreadCount: item.unreadCount || 0,
            isOnline: false, // This will be updated by user status events
            isGroup: false
          };
        });
        
        setConversations(processedConversations);
        
        // After loading individual conversations, also load group conversations
        socket.emit('load_group_conversations', {
          IDUser: userData.id
        });
      } else {
        // Even if no individual conversations are found, still load group conversations
        socket.emit('load_group_conversations', {
          IDUser: userData.id
        });
      }
    });
    
    // Setup listener for group conversations response
    socket.on('load_group_conversations_response', (data) => {
      console.log('Group conversations received:', data);
      
      if (data && data.Items && Array.isArray(data.Items)) {
        // Process the group conversation data
        const groupConversations = data.Items.map(item => {
          return {
            _id: item._id,
            idConversation: item.idConversation,
            name: item.groupName || `Group ${item.idConversation.substring(0, 8)}`,
            avatar: item.groupAvatar,
            lastMessage: item.latestMessage?.content,
            lastMessageTime: item.latestMessage?.dateTime,
            unreadCount: item.unreadCount || 0,
            isGroup: true,
            groupName: item.groupName,
            groupAvatar: item.groupAvatar
          };
        });
        
        // Merge group conversations with existing individual conversations
        setConversations(prevConversations => {
          const allConversations = [...prevConversations, ...groupConversations];
          // Sort by lastChange or lastMessageTime if needed
          return allConversations;
        });
      }
      
      // Finish loading after group conversations are processed
      setIsLoading(false);
    });

    // Emit event to load individual conversations first
    socket.emit('load_conversations', {
      IDUser: userData.id
    });
  };

  // Toggle conversation selection
  const toggleSelection = (conversationId: string) => {
    setSelectedConversations(prev => {
      if (prev.includes(conversationId)) {
        return prev.filter(id => id !== conversationId);
      } else {
        return [...prev, conversationId];
      }
    });
  };
  // Handle forward message
  const handleForwardMessage = () => {
    if (selectedConversations.length === 0) {
      Alert.alert('Chọn người nhận', 'Vui lòng chọn ít nhất một người để chuyển tiếp tin nhắn.');
      return;
    }

    const socket = socketService.getSocket();
    
    if (!socket) {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối với máy chủ. Vui lòng thử lại sau.');
      return;
    }

    // Get user data for sender ID
    const userData = socketService.getUserData();
    if (!userData || !userData.id) {
      Alert.alert('Lỗi xác thực', 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.');
      return;
    }

    // Create forward message payload according to API format
    const forwardData = {
      IDMessageDetail: message.idMessage,
      targetConversations: selectedConversations,
      IDSender: userData.id
    };

    console.log('Forwarding message with payload:', forwardData);

    // Emit forward_message event
    socket.emit('forward_message', forwardData);    // Set up listener for success response
    socket.once('forward_message_success', (response) => {
      console.log('Forward message success response:', response);
      
      if (response && response.success) {
        // Show success details - how many messages were forwarded
        const forwardCount = response.results?.length || 0;
        
        // Navigate directly to HomeScreen after successful forwarding
        Alert.alert(
          'Thành công',
          `Tin nhắn đã được chuyển tiếp thành công đến ${forwardCount} người nhận!`,
          [{ text: 'OK', onPress: () => navigation.navigate('HomeScreen') }]
        );
      } else {
        Alert.alert('Lỗi', 'Không thể chuyển tiếp tin nhắn. Vui lòng thử lại sau.');
      }
    });
  };

  // Render conversation item
  const renderConversationItem = ({ item }: { item: Conversation }) => {
    const isSelected = selectedConversations.includes(item.idConversation);
    
    return (
      <TouchableOpacity 
        style={[styles.conversationItem, isSelected && styles.selectedItem]}
        onPress={() => toggleSelection(item.idConversation)}
      >
        <View style={styles.avatarContainer}>
          <Image 
            source={
              item.avatar 
                ? { uri: item.avatar } 
                : require('../assets/zalo_background.png')
            } 
            style={styles.avatar} 
          />
          {item.isOnline && <View style={styles.onlineIndicator} />}
        </View>
        
        <View style={styles.conversationInfo}>
          <Text style={styles.nameText} numberOfLines={1}>{item.name}</Text>
        </View>
        
        <View style={styles.checkboxContainer}>
          {isSelected ? (
            <Ionicons name="checkmark-circle" size={24} color="#1FAEEB" />
          ) : (
            <Ionicons name="ellipse-outline" size={24} color="#CCCCCC" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1FAEEB" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FDF8F8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chuyển tiếp tin nhắn</Text>
        <View style={styles.headerRight} />
      </View>
      
      {/* Message preview */}
      <View style={styles.previewContainer}>
        <Text style={styles.previewLabel}>Tin nhắn cần chuyển tiếp:</Text>
        
        <View style={styles.messagePreview}>
          {message.type === 'image' ? (
            <View style={styles.previewImageContainer}>
              <Image source={{ uri: message.content }} style={styles.previewImage} />
              <Text style={styles.previewImageText}>Hình ảnh</Text>
            </View>
          ) : message.type === 'video' ? (
            <View style={styles.previewVideoContainer}>
              <Ionicons name="videocam" size={24} color="#1FAEEB" />
              <Text style={styles.previewContent}>Video</Text>
            </View>
          ) : message.type === 'document' ? (
            <View style={styles.previewDocumentContainer}>
              <Ionicons name="document-text" size={24} color="#1FAEEB" />
              <Text style={styles.previewContent}>Tài liệu</Text>
            </View>
          ) : (
            <Text style={styles.previewContent} numberOfLines={2}>
              {message.content}
            </Text>
          )}
        </View>
      </View>

      {/* Conversations list */}
      <View style={styles.listContainer}>
        <Text style={styles.sectionTitle}>Chọn người nhận:</Text>
        
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1FAEEB" />
            <Text style={styles.loadingText}>Đang tải cuộc trò chuyện...</Text>
          </View>
        ) : (
          <FlatList
            data={conversations}
            renderItem={renderConversationItem}
            keyExtractor={(item) => item.idConversation}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={60} color="#CCCCCC" />
                <Text style={styles.emptyText}>Không có cuộc trò chuyện</Text>
              </View>
            }
          />
        )}
      </View>
      
      {/* Forward button */}
      <TouchableOpacity 
        style={[
          styles.forwardButton,
          selectedConversations.length === 0 && styles.disabledButton
        ]}
        onPress={handleForwardMessage}
        disabled={selectedConversations.length === 0}
      >
        <Ionicons name="send" size={20} color="#FFFFFF" />
        <Text style={styles.forwardButtonText}>
          Chuyển tiếp {selectedConversations.length > 0 ? `(${selectedConversations.length})` : ''}
        </Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1FAEEB',
    paddingVertical: 10,
    paddingHorizontal: 15,
    height: 60,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: '#FDF8F8',
    fontSize: 16,
    fontWeight: '500',
  },
  headerRight: {
    width: 24,
  },
  previewContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  previewLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  messagePreview: {
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  previewContent: {
    fontSize: 14,
    color: '#333333',
  },
  previewImageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewImage: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginRight: 10,
  },
  previewImageText: {
    fontSize: 14,
    color: '#333333',
  },
  previewVideoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  previewDocumentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  listContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    padding: 16,
    paddingBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedItem: {
    backgroundColor: 'rgba(31, 174, 235, 0.1)',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  onlineIndicator: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    bottom: 0,
    right: 0,
  },
  conversationInfo: {
    flex: 1,
  },
  nameText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333333',
  },
  checkboxContainer: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666666',
  },
  forwardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1FAEEB',
    padding: 16,
    gap: 8,
  },
  forwardButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  }
});

export default ForwardMessageScreen;
