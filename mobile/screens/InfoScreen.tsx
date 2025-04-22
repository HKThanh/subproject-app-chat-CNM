import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Image,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FooterComponent from '../components/FooterComponent';
import SocketService from '../services/SocketService';
import AuthService from '../services/AuthService';

const avatarDefaulturi = 'https://static.vecteezy.com/system/resources/previews/009/292/244/non_2x/default-avatar-icon-of-social-media-user-vector.jpg';
type InfoScreenProps = {
  navigation?: any;
  route?: {
    params?: {
      user?: any;
      accessToken?: string;
    };
  };
};

interface UserData {
  id: string;
  email: string;
  username: string;
  phone: string; // Đúng với tên trường API
  urlavatar: string | null; // Đúng với tên trường API
  bio: string | null;
  fullname: string | null; // Đúng với tên trường API - viết thường
}

const InfoScreen = ({ navigation, route }: InfoScreenProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);

  // Get the access token from navigation params or global variable
  useEffect(() => {
    // First check if we have the token in route params
    if (route?.params?.accessToken) {
      setAccessToken(route.params.accessToken);
    }
    // Then try from global variable
    else if (global.accessToken) {
      setAccessToken(global.accessToken);
    }
  }, [route?.params]);

  // Fetch user data when we have an access token
  useEffect(() => {
    if (accessToken) {
      fetchUserData();
    }
  }, [accessToken]);

  const fetchUserData = async () => {
    if (!accessToken) return;

    setIsLoadingUserData(true);
    try {
      const response = await fetch('http://192.168.0.104:3000/user', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserData(data);
        console.log('User data retrieved:', data);
      } else {
        const errorData = await response.json();
        console.error('Failed to fetch user data:', errorData);
        Alert.alert('Lỗi', errorData.message || 'Không thể lấy thông tin người dùng');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert('Lỗi kết nối', 'Không thể kết nối đến máy chủ để lấy thông tin người dùng');
    } finally {
      setIsLoadingUserData(false);
    }
  };

  const handleTabPress = (tabName: 'messages' | 'contacts' | 'explore' | 'diary' | 'profile') => {
    if (tabName === 'messages') {
      navigation?.navigate('HomeScreen');
    }
    if (tabName === 'contacts') {
      navigation?.navigate('SearchUserScreen');
    }
  };  const handleLogout = async () => {
    try {
      setIsLoading(true);
      
      // Lấy token từ AuthService
      const authService = AuthService.getInstance();
      const headers = await authService.getAuthHeader();
      
      // Lấy socketService trước để phát sự kiện user_offline trước khi đăng xuất
      const socketService = SocketService.getInstance();
      
      // Phát sự kiện user_offline để thông báo cho server rằng người dùng đang offline
      // Đây là bước bạn yêu cầu để thay đổi trạng thái trước khi logout
      console.log('Emitting user_offline event before logging out');
      await socketService.emitUserOffline();
      
      // Gọi API đăng xuất
      const response = await fetch('http://192.168.0.104:3000/auth/logout/mobile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      });
      
      const data = await response.json();
      console.log('Logout response:', data);
      
      // Xóa tokens trong AuthService
      await authService.clearTokens();
      
      // Xóa dữ liệu và ngắt kết nối socket
      await socketService.logout();
      
      // Xóa biến global cho tương thích ngược (backward compatibility)
      global.accessToken = null;
      global.socketInstance = null;
      global.conversations = [];
      
      // Điều hướng về màn hình đăng nhập
      navigation.reset({
        index: 0,
        routes: [{ name: 'WelcomeScreen' }],
      });
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert('Lỗi đăng xuất', 'Có lỗi xảy ra khi đăng xuất. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
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
            placeholder="Tìm kiếm"
            placeholderTextColor="#EBE2E2"
          />
        </View>
      </View>

      <ScrollView style={styles.contentContainer}>
        {isLoadingUserData ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1FAEEB" />
            <Text style={styles.loadingText}>Đang tải thông tin...</Text>
          </View>
        ) : (
          <>
            {/* Profile Section */}
            <View style={styles.profileSection}>
              <Image
                source={{
                  uri: userData?.urlavatar || avatarDefaulturi
                }}
                style={styles.profileImage}
              />            
                <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {userData?.fullname || (userData?.username && !userData?.username.match(/^\d+$/) ? userData?.username : 'Người dùng')}
                </Text>
                <TouchableOpacity onPress={() => navigation?.navigate('BioScreen', { userData, accessToken })}>
                  <Text style={styles.profileAction}>Xem trang cá nhân</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.profileArrow}
                onPress={() => navigation?.navigate('BioScreen', { userData, accessToken })}
              >
                <Ionicons name="chevron-forward" size={20} color="rgba(12, 113, 232, 0.64)" />
              </TouchableOpacity>
            </View>

            {/* Account and Security Section */}
            <View style={styles.sectionContainer}>
              <TouchableOpacity style={styles.menuItem}>
                <Ionicons name="shield-outline" size={22} color="#0C71E8" style={styles.menuIcon} />
                <Text style={styles.menuTitle}>Tài khoản và bảo mật</Text>
                <Ionicons name="chevron-forward" size={20} color="rgba(12, 113, 232, 0.64)" style={styles.menuArrow} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <Ionicons name="lock-closed-outline" size={22} color="#0C71E8" style={styles.menuIcon} />
                <Text style={styles.menuTitle}>Quyền riêng tư</Text>
                <Ionicons name="chevron-forward" size={20} color="rgba(12, 113, 232, 0.64)" style={styles.menuArrow} />
              </TouchableOpacity>
            </View>

            {/* Features Section */}
            <View style={[styles.sectionContainer, styles.marginTop]}>
              <TouchableOpacity style={styles.menuItem}>
                <Ionicons name="qr-code-outline" size={22} color="#0C71E8" style={styles.menuIcon} />
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>Ví QR</Text>
                  <Text style={styles.menuDescription}>Lưu trữ và xuất trình các mã QR quan trọng</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(12, 113, 232, 0.64)" style={styles.menuArrow} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <Ionicons name="cloud-outline" size={22} color="#0C71E8" style={styles.menuIcon} />
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>Clound của tôi</Text>
                  <Text style={styles.menuDescription}>Lưu trữ các tin nhắn quan trọng</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(12, 113, 232, 0.64)" style={styles.menuArrow} />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem}>
                <Ionicons name="save-outline" size={22} color="#0C71E8" style={styles.menuIcon} />
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>Quản lí dung lượng và bộ nhớ</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(12, 113, 232, 0.64)" style={styles.menuArrow} />
              </TouchableOpacity>
            </View>

            {/* Logout Section */}
            <View style={[styles.sectionContainer, styles.marginTop]}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigation?.navigate('ChangePasswordScreen', { userData, accessToken })}
              >
                <Ionicons name="key-outline" size={22} color="#0C71E8" style={styles.menuIcon} />
                <View style={styles.menuTextContainer}>
                  <Text style={styles.menuTitle}>Đổi mật khẩu</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(12, 113, 232, 0.64)" style={styles.menuArrow} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleLogout}
                disabled={isLoading}
              >
                <Ionicons name="log-out-outline" size={22} color="#E53935" style={styles.menuIcon} />
                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuTitle, styles.logoutText]}>
                    {isLoading ? 'Đang đăng xuất...' : 'Đăng xuất'}
                  </Text>
                </View>
                {isLoading ? (
                  <ActivityIndicator size="small" color="#E53935" />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color="rgba(229, 57, 53, 0.64)" style={styles.menuArrow} />
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
      {/* Footer */}
      <FooterComponent activeTab="profile" onTabPress={handleTabPress} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D9D9D9',
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
  contentContainer: {
    flex: 1,
  },
  profileSection: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 10,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#D9D9D9', // Fallback color
  },
  profileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  profileName: {
    fontSize: 13,
    fontWeight: '400',
    fontFamily: 'Inter',
    color: '#000000',
  },
  profileEmail: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '400',
    color: '#645C5C',
    marginTop: 4,
  },
  profileAction: {
    fontSize: 10,
    fontFamily: 'Inter',
    fontWeight: '400',
    color: '#645C5C',
    marginTop: 4,
  },
  profileArrow: {
    padding: 4,
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
  },
  marginTop: {
    marginTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  menuIcon: {
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '400',
    color: '#000000',
  },
  logoutText: {
    color: '#E53935',
    fontWeight: '500',
  },
  menuDescription: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '400',
    color: '#645C5C',
    marginTop: 2,
  },
  menuArrow: {
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#1FAEEB',
  },
});

export default InfoScreen;
