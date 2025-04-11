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
  Alert,
  Platform,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  email: string;
  bio: string;
  phone: string;
  coverPhoto: string;
  ismale: boolean;
  isVerified: boolean;
}

// Define auth response type
interface AuthResponse {
  message: string;
  accessToken?: string;
  refreshToken?: string;
  user?: User;
}

const LoginScreen = ({ navigation }: LoginScreenProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showVerifyNotification, setShowVerifyNotification] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState('');
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  // Function to show the verification notification for 5 seconds
  const showVerificationMessage = (message: string) => {
    setVerifyMessage(message);
    setShowVerifyNotification(true);

    // Hide message after 5 seconds
    setTimeout(() => {
      setShowVerifyNotification(false);
    }, 5000);
  };

  // Function to show verification modal popup
  const showVerificationModal = (message: string) => {
    setVerifyMessage(message);
    setShowVerifyModal(true);

    // Hide modal after 5 seconds and navigate to OTP screen
    setTimeout(() => {
      setShowVerifyModal(false);
    }, 5000);
  };

  // Function to logout a user
  const logoutUser = async (userEmail: string, userPassword: string) => {
    try {
      const response = await fetch('http://192.168.0.107:3000/auth/logout/mobile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': accessToken ? `Bearer ${accessToken}` : '',
        },
        body: JSON.stringify({
          email: userEmail.trim(),
          password: userPassword.trim(),
        }),
      });

      const data = await response.json();
      console.log('Logout response:', data);

      // Clear any stored tokens or user data
      global.accessToken = null;

      return data;
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, message: 'Đã xảy ra lỗi khi đăng xuất' };
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1FAEEB" />

        {/* Verification Modal Popup */}
        <Modal
          transparent={true}
          animationType="fade"
          visible={showVerifyModal}
          onRequestClose={() => { }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Ionicons name="alert-circle" size={40} color="#1FAEEB" />
              <Text style={styles.modalTitle}>Thông báo</Text>
              <Text style={styles.modalMessage}>{verifyMessage}</Text>
            </View>
          </View>
        </Modal>

        {/* Verification Notification */}
        {showVerifyNotification && (
          <View style={styles.verificationNotification}>
            <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
            <Text style={styles.verificationText}>{verifyMessage}</Text>
          </View>
        )}

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
            Vui lòng nhập email và mật khẩu đăng nhập
          </Text>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="Nhập email"
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
          <TouchableOpacity 
            style={styles.forgotPasswordContainer}
            onPress={() => navigation?.navigate('ResetPassScreen')}
          >
            <Text style={styles.forgotPasswordText}>Lấy lại mật khẩu</Text>
          </TouchableOpacity>
          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.disabledButton]}
            disabled={isLoading}
            onPress={async () => {
              // Validate inputs
              if (!email.trim()) {
                Alert.alert('Lỗi', 'Vui lòng nhập email');
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
                    email: email.trim(),
                    password: password.trim(),
                    platform: Platform.OS === 'ios' || Platform.OS === 'android' ? 'mobile' : 'web'
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
                  console.log('User:', data.user);                  // Check if user is verified
                  if (data.user.isVerified) {
                    // User is verified, navigate to HomeScreen
                    navigation?.navigate('HomeScreen', {
                      user: data.user,
                      accessToken: data.accessToken,
                      refreshToken: data.refreshToken
                    });
                  } else {
                    // User is not verified, logout immediately
                    await logoutUser(email.trim(), password.trim());

                    // Show modal notification in the center of screen
                    showVerificationModal('Bạn cần xác thực tài khoản');

                    // Send registration info to server and then navigate to OTP screen
                    setTimeout(async () => {
                      try {
                        // Send registration info to API
                        const registerResponse = await fetch('http://192.168.0.107:3000/auth/register-phone',
                          {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            fullname: data.user?.fullname,
                            email: data.user?.email,
                            phone: data.user?.phone,
                            password: password.trim(),
                          }),
                        });

                        const registerData = await registerResponse.json();
                        console.log('Registration response:', registerData);

                        // Navigate to OTP screen regardless of API response
                        navigation?.navigate('OTPScreen', {
                          fullname: data.user?.fullname,
                          email: data.user?.email,
                          phone: data.user?.phone,
                          password: password.trim(),
                        });
                      } catch (error) {
                        console.error('Registration error:', error);
                        // Navigate to OTP screen even if registration fails
                        navigation?.navigate('OTPScreen', {
                          fullname: data.user?.fullname,
                          email: data.user?.email,
                          phone: data.user?.phone,
                          password: password.trim(),
                        });
                      }
                    }, 5000);
                  }
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
  }, verificationNotification: {
    backgroundColor: '#1FAEEB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  verificationText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
  },
  modalContent: {
    width: 300,
    padding: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  modalMessage: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default LoginScreen;
