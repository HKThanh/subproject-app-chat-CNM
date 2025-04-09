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

type InfoScreenProps = {
  navigation?: any;
  route?: {
    params?: {
      user?: any;
      accessToken?: string;
    };
  };
};

const InfoScreen = ({ navigation, route }: InfoScreenProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  
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

  const handleTabPress = (tabName: 'messages' | 'contacts' | 'explore' | 'diary' | 'profile') => {
    if (tabName === 'messages') {
      navigation?.navigate('HomeScreen');
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://192.168.0.107:3000/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': accessToken ? `Bearer ${accessToken}` : '', 
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();
      
      // Clear the stored token
      global.accessToken = null;
      
      // In production with AsyncStorage:
      // await AsyncStorage.removeItem('accessToken');
      // await AsyncStorage.removeItem('refreshToken');
      
      if (response.ok) {
        Alert.alert('Thành công', data.message || 'Bạn đã đăng xuất thành công', [
          { text: 'OK', onPress: () => navigation?.navigate('WelcomeScreen') }
        ]);
      } else {
        // Even if the server response isn't OK, we still log out locally
        Alert.alert('Thông báo', 'Đã xảy ra lỗi khi đăng xuất, nhưng bạn vẫn được đăng xuất khỏi ứng dụng', [
          { text: 'OK', onPress: () => navigation?.navigate('WelcomeScreen') }
        ]);
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Even if the server call fails, we still log out locally
      global.accessToken = null;
      Alert.alert('Thông báo', 'Không thể kết nối đến máy chủ, nhưng bạn vẫn được đăng xuất khỏi ứng dụng', [
        { text: 'OK', onPress: () => navigation?.navigate('WelcomeScreen') }
      ]);
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
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <Image 
            source={require('../assets/Welo_image.png')} 
            style={styles.profileImage} 
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Hiểu Đôngg</Text>
            <Text style={styles.profileAction}>Xem trang cá nhân</Text>
          </View>
          <TouchableOpacity style={styles.profileArrow}>
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
});

export default InfoScreen;
