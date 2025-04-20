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
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ResetPassScreenProps = {
  navigation?: any;
};

const ResetPassScreen = ({ navigation }: ResetPassScreenProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(true);
  const [resetId, setResetId] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  // Function to show notification for 5 seconds
  const showTemporaryNotification = (message: string) => {
    setNotificationMessage(message);
    setShowNotification(true);

    // Hide notification after 5 seconds
    setTimeout(() => {
      setShowNotification(false);
    }, 5000);
  };

  // Function to validate email
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Function to validate password
  const validatePassword = () => {
    if (password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu nhập lại không khớp');
      return false;
    }
    return true;
  };
  // Function to handle checking if email exists
  const handleResetRequest = async () => {
    // Validate email
    if (!validateEmail(email)) {
      Alert.alert('Lỗi', 'Vui lòng nhập email hợp lệ');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://192.168.0.103:3000/auth/reset-password-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok && data.id) {
        // Store the reset ID for the next step
        setResetId(data.id);
        // Show password form without sending OTP yet
        setShowEmailForm(false);
        showTemporaryNotification('Email hợp lệ. Vui lòng nhập mật khẩu mới.');
      } else {
        Alert.alert('Lỗi', data.message || 'Không thể gửi yêu cầu đặt lại mật khẩu.');
      }
    } catch (error) {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to proceed to OTP screen
  const handleProceedToOTP = () => {
    // Validate passwords
    if (!validatePassword()) {
      return;
    }

    // Navigate to OTP screen with necessary params
    navigation?.navigate('OTPScreen', {
      email: email,
      resetId: resetId,
      password: password,
      isPasswordReset: true
    });
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1FAEEB" />
        
        {/* Notification */}
        {showNotification && (
          <View style={styles.notificationContainer}>
            <View style={styles.notificationContent}>
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.notificationText}>{notificationMessage}</Text>
            </View>
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
          <Text style={styles.headerTitle}>Lấy lại mật khẩu</Text>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {showEmailForm ? (
            <>
              <Text style={styles.instructionText}>
                Vui lòng nhập email đã đăng ký để lấy lại mật khẩu
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

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, isLoading && styles.disabledButton]}
                disabled={isLoading}
                onPress={handleResetRequest}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Tiếp tục</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.instructionText}>
                Nhập mật khẩu mới cho tài khoản {email}
              </Text>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Mật khẩu mới</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    placeholder="Nhập mật khẩu mới"
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

              {/* Confirm Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Nhập lại mật khẩu mới</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    placeholder="Nhập lại mật khẩu mới"
                    placeholderTextColor="rgba(100, 92, 92, 0.5)"
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Text style={styles.showHideText}>
                      {showConfirmPassword ? 'ẨN' : 'HIỆN'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.inputLine} />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, isLoading && styles.disabledButton]}
                disabled={isLoading}
                onPress={handleProceedToOTP}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Tiếp tục</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {/* Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="information-circle" size={24} color="#1FAEEB" />
            </View>
            <Text style={styles.infoText}>
              {showEmailForm 
                ? "Mã xác thực (OTP) sẽ được gửi đến email của bạn. Vui lòng kiểm tra hộp thư đến sau khi gửi yêu cầu."
                : "Bạn sẽ nhận được mã OTP qua email để xác nhận đổi mật khẩu. Mật khẩu phải có ít nhất 6 ký tự."
              }
            </Text>
          </View>
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
  submitButton: {
    backgroundColor: '#1FAEEB',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  submitButtonText: {
    fontSize: 12,
    fontWeight: '400',
    fontFamily: 'Inter',
    color: '#FFFFFF',
  },
  disabledButton: {
    backgroundColor: 'rgba(31, 174, 235, 0.7)',
  },
  infoCard: {
    backgroundColor: '#E8F5FE',
    borderRadius: 8,
    padding: 15,
    flexDirection: 'row',
    marginTop: 20,
  },
  infoIconContainer: {
    marginRight: 10,
  },
  infoText: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '400',
    color: '#000000',
    flex: 1,
  },
  notificationContainer: {
    position: 'absolute',
    top: 80,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 999,
  },
  notificationContent: {
    backgroundColor: '#1FAEEB',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    width: '100%',
    justifyContent: 'center',
  },
  notificationText: {
    marginLeft: 10,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ResetPassScreen;
