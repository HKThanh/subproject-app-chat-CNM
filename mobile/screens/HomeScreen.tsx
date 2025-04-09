import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Image,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FooterComponent from '../components/FooterComponent';

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

const HomeScreen = ({ navigation }: HomeScreenProps) => {
  const [searchText, setSearchText] = useState('');
  const [chats, setChats] = useState<ChatItem[]>([
    {
      id: '1',
      name: 'Cloud của tôi',
      message: 'Cuộc trò chuyện này đang được ghim',
      time: '10:30 AM',
      avatar: avatarPlaceholders[0],
      isPinned: true
    },
    {
      id: '2',
      name: 'Bảo Ngọc',
      message: 'Bạn đang làm gì đấy?',
      time: '09:45 AM',
      avatar: avatarPlaceholders[1],
      isOnline: true
    },
    {
      id: '3',
      name: 'Hiểu Đông',
      message: 'Hôm nay mình đi chơi không?',
      time: '08:20 AM',
      avatar: avatarPlaceholders[2],
      isOnline: true
    },
    {
      id: '4',
      name: 'Nhóm Bạn Thân',
      message: 'Khánh: Cuối tuần đi cafe nhé mọi người',
      time: 'Hôm qua',
      avatar: avatarPlaceholders[3]
    },
    {
      id: '5',
      name: 'Mẹ',
      message: 'Con ăn cơm chưa?',
      time: 'Thứ ba',
      avatar: avatarPlaceholders[4]
    }
  ]);

  const handleChatPress = (chatId: string) => {
    const selectedChat = chats.find(chat => chat.id === chatId);
    navigation?.navigate('ChatScreen', { chatItem: selectedChat });
  };

  const handleTabPress = (tabName: string) => {
    if (tabName === 'profile') {
      navigation?.navigate('InfoScreen');
    }
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
            onChangeText={setSearchText}
            placeholder="Tìm kiếm"
            placeholderTextColor="#EBE2E2"
          />
        </View>
        <TouchableOpacity style={styles.headerIconButton}>
          <Ionicons name="person-add-outline" size={20} color="rgba(242, 228, 228, 0.7)" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIconButton}>
          <Ionicons name="qr-code-outline" size={20} color="rgba(251, 242, 242, 0.7)" />
        </TouchableOpacity>
      </View>

      {/* Chat List */}
      <ScrollView style={styles.chatListContainer}>
        {chats.map((chat) => (
          <TouchableOpacity
            key={chat.id}
            style={styles.chatItem}
            onPress={() => handleChatPress(chat.id)}
          >
            <View style={styles.avatarContainer}>
              <Image 
                source={chat.avatar} 
                style={styles.avatar} 
              />
              {chat.isOnline && <View style={styles.onlineDot} />}
            </View>

            <View style={styles.chatInfo}>
              <View style={styles.chatNameTimeRow}>
                <Text style={styles.chatName}>{chat.name}</Text>
                <Text style={styles.chatTime}>{chat.time}</Text>
              </View>
              <View style={styles.chatMessageContainer}>
                <Text style={styles.chatMessage} numberOfLines={1}>
                  {chat.message}
                </Text>
                {chat.isPinned && (
                  <Ionicons name="pin" size={14} color="#645C5C" />
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))}
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
  headerIconButton: {
    marginLeft: 15,
    padding: 5,
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
});

export default HomeScreen;
