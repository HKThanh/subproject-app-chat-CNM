import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface User {
  id: string;
  fullname: string;
  urlavatar: string;
  email?: string;
  phone?: string;
}

const SearchUserScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://192.168.1.9:3000/api/users/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${global.accessToken}`
        },
        body: JSON.stringify({ text: searchQuery })
      });
      
      const data = await response.json();
      
      if (data.code === 1) {
        setSearchResults(data.data);
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

  const handleUserSelect = (user: User) => {
    if (user.id === global.userData?.id) {
      Alert.alert('Thông báo', 'Bạn không thể chat với chính mình');
      return;
    }
    
    // Chuyển đến màn hình chat với user được chọn
    navigation.navigate('ChatScreen', {
      receiverId: user.id,
      chatItem: {
        name: user.fullname,
        avatar: user.urlavatar || 'https://via.placeholder.com/50',
      }
    });
  };

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
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Nhập tên, email hoặc số điện thoại"
          value={searchQuery}
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
      
      {isLoading ? (
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
            <TouchableOpacity 
              style={styles.userItem}
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
          )}
          ListEmptyComponent={
            searchQuery.length > 0 && !error ? (
              <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>Không tìm thấy kết quả</Text>
              </View>
            ) : null
          }
        />
      )}
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
  }
});

export default SearchUserScreen;
