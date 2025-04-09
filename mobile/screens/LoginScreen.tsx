import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Alert
} from 'react-native';

// Define navigation prop type if you're using React Navigation
type LoginScreenProps = {
  navigation?: any;
};

// Define user type to match API response
interface User {
  id: string;
  fullname: string;
  urlavatar: string;
  birthday: string;
  createdAt: string;
  phone: string;
}

// Define auth response type
interface AuthResponse {
  message: string;
  accessToken?: string;
  refreshToken?: string;
  user?: User;
}

const LoginScreen = ({ navigation }: LoginScreenProps) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1FAEEB" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Đăng nhập</Text>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          <Text style={styles.instructionText}>
            Vui lòng nhập số điện thoại và mật khẩu đăng nhập
          </Text>

          {/* Phone Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Số điện thoại</Text>
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              placeholder="Nhập số điện thoại"
              placeholderTextColor="rgba(100, 92, 92, 0.5)"
            />
            <View style={styles.activeInputLine} />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Mật khẩu</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="Nhập mật khẩu"
                placeholderTextColor="rgba(100, 92, 92, 0.5)"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Text style={styles.showHideText}>
                  {showPassword ? 'ẨN' : 'HIỆN'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputLine} />
          </View>

          {/* Forgot Password */}
          <TouchableOpacity style={styles.forgotPasswordContainer}>
            <Text style={styles.forgotPasswordText}>Lấy lại mật khẩu</Text>
          </TouchableOpacity>
          {/* Login Button */}          
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.disabledButton]}
            disabled={isLoading}
            onPress={async () => {
              // Validate inputs
              if (!phoneNumber.trim()) {
                Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');
                return;
              }

              if (!password.trim()) {
                Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu');
                return;
              }

              // Clear previous errors
              setError(null);

              // Show loading indicator
              setIsLoading(true);

              try {
                // Make API call to login endpoint
                const response = await fetch('http://192.168.0.107:3000/auth/login', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    phone: phoneNumber.trim(),
                    password: password.trim()
                  })
                });

                const data: AuthResponse = await response.json();

                if (data.accessToken && data.refreshToken && data.user) {
                  // Store token in global object for now since AsyncStorage isn't installed
                  // In production you should use AsyncStorage:
                  // await AsyncStorage.setItem('accessToken', data.accessToken);
                  // await AsyncStorage.setItem('refreshToken', data.refreshToken);
                  
                  // For now, store in global variable
                  global.accessToken = data.accessToken;
                  
                  console.log('Login successful:', data.message);
                  console.log('User:', data.user);

                  // Navigate to HomeScreen on successful login
                  navigation?.navigate('HomeScreen', { 
                    user: data.user,
                    accessToken: data.accessToken,
                    refreshToken: data.refreshToken
                  });
                } else {
                  // Show error message
                  setError(data.message);
                  Alert.alert('Đăng nhập thất bại', data.message);
                }
              } catch (err) {
                setError('Lỗi kết nối. Vui lòng thử lại sau.');
                Alert.alert('Lỗi', 'Không thể kết nối đến máy chủ');
                console.error('Login error:', err);
              } finally {
                setIsLoading(false);
              }
            }}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.loginButtonText}>Đăng nhập</Text>
            )}
          </TouchableOpacity>

          {/* FAQ */}
          <TouchableOpacity style={styles.faqContainer}>
            <Text style={styles.faqText}>Các câu hỏi thường gặp</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 5,
  },
  disabledButton: {
    backgroundColor: 'rgba(31, 174, 235, 0.7)',
  },
  header: {
    backgroundColor: '#1FAEEB',
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    color: '#FDF8F8',
    fontSize: 18,
    fontWeight: '400',
  },
  headerTitle: {
    color: '#FDF8F8',
    fontSize: 18,
    fontFamily: 'Inter',
    fontWeight: '400',
    marginLeft: 15,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  instructionText: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '400',
    marginBottom: 20,
    color: '#000000',
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '400',
    color: '#645C5C',
    marginBottom: 5,
  },
  input: {
    fontSize: 14,
    paddingVertical: 5,
    paddingHorizontal: 0,
  },
  passwordContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 5,
    paddingHorizontal: 0,
  },
  showHideText: {
    color: '#645C5C',
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '400',
  },
  activeInputLine: {
    height: 1,
    backgroundColor: 'rgba(6, 195, 255, 0.3)',
    marginTop: 5,
  },
  inputLine: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    marginTop: 5,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: 10,
    marginBottom: 30,
  },
  forgotPasswordText: {
    color: '#2753EC',
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '400',
  },
  loginButton: {
    backgroundColor: '#1FAEEB',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonText: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'Inter',
    color: '#FFFFFF',
  },
  faqContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  faqText: {
    color: '#645C5C',
    fontSize: 12,
    fontFamily: 'Inter',
    fontWeight: '400',
  },
});

export default LoginScreen;
