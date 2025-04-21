import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type OTPScreenProps = {
  navigation?: any;
  route?: {
    params: {
      phoneNumber?: string;
      email: string;
      fullname?: string;
      password?: string;
      phone?: string;
      resetId?: string;
      isPasswordReset?: boolean;
    };
  };
};

const OTPScreen = ({ navigation, route }: OTPScreenProps) => {
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const inputRefs = useRef<Array<TextInput | null>>([]);
  
  // Get parameters from route
  const phoneNumber = route?.params?.phoneNumber || route?.params?.phone || '';
  const email = route?.params?.email || '';
  const fullname = route?.params?.fullname || '';
  const password = route?.params?.password || '';
  const resetId = route?.params?.resetId || '';
  const isPasswordReset = route?.params?.isPasswordReset || false;

  // Format phone number to international format (+84) if needed
  const formattedPhoneNumber = phoneNumber.startsWith('0')
    ? '+84' + phoneNumber.substring(1)
    : phoneNumber;

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (timer > 0) {
      interval = setInterval(() => {
        setTimer(prevTimer => prevTimer - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }

    return () => clearInterval(interval);
  }, [timer]);

  const handleOtpChange = (text: string, index: number) => {
    if (text.length <= 1) {
      const newOtpDigits = [...otpDigits];
      newOtpDigits[index] = text;
      setOtpDigits(newOtpDigits);

      // Auto focus to next input
      if (text.length === 1 && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Handle backspace
    if (e.nativeEvent.key === 'Backspace' && index > 0 && otpDigits[index] === '') {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResendOtp = async () => {
    if (canResend) {
      setIsLoading(true);

      try {
        let response;
        
        if (isPasswordReset) {
          response = await fetch('http://192.168.0.106:3000/auth/reset-password-request', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: email,
            }),
          });
        } else {
          response = await fetch('http://192.168.0.106:3000/auth/register-phone', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fullname: fullname,
              password: password,
              email: email,
              phone: phoneNumber,
            }),
          });
        }
        
        const data = await response.json();

        if (response.ok) {
          // Reset timer and state
          setTimer(60);
          setCanResend(false);

          // Reset OTP digits
          setOtpDigits(['', '', '', '', '', '']);
          inputRefs.current[0]?.focus();

          // Show temporary notification for 5 seconds
          setNotificationMessage(data.message || 'OTP đã được gửi đến email của bạn');
          setShowNotification(true);

          // Hide notification after 5 seconds
          setTimeout(() => {
            setShowNotification(false);
          }, 5000);
        } else {
          Alert.alert('Lỗi', data.message || 'Không thể gửi lại mã xác thực.');
        }
      } catch (error) {
        Alert.alert('Lỗi kết nối', 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleVerifyOtp = async () => {
    const otp = otpDigits.join('');

    if (otp.length === 6) {
      setIsLoading(true);

      try {
        let response;
        
        if (isPasswordReset) {
          response = await fetch(`http://192.168.0.106:3000/auth/reset-password/${resetId}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              otp: otp,
              password: password,
            }),
          });
        } else {
          response = await fetch('http://192.168.0.106:3000/auth/verify-otp', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: email,
              otp: otp,
            }),
          });
        }

        const data = await response.json();
        
        if (response.ok) {
          Alert.alert(
            'Thành công',
            isPasswordReset 
              ? 'Cập nhật mật khẩu thành công!' 
              : 'Xác thực tài khoản thành công!',
            [
              {
                text: 'OK',
                onPress: () => navigation?.navigate('Login')
              }
            ]
          );
        } else {
          Alert.alert('Lỗi', data.message || 'Mã OTP không chính xác. Vui lòng thử lại với OTP mới.');
        }
      } catch (error) {
        Alert.alert('Lỗi kết nối', 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.');
      } finally {
        setIsLoading(false);
      }
    } else {
      Alert.alert('Lỗi', 'Vui lòng nhập đủ 6 chữ số mã xác thực.');
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>    
            <StatusBar barStyle="light-content" backgroundColor="#1FAEEB" />

        {/* Loading Modal */}
        <Modal
          transparent={true}
          animationType="fade"
          visible={isLoading}
          onRequestClose={() => { }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1FAEEB" />
              <Text style={styles.loadingText}>Đang xử lý...</Text>
            </View>
          </View>
        </Modal>

        {/* Notification Popup */}
        {showNotification && (
          <View style={styles.notificationContainer}>
            <View style={styles.notificationContent}>
              <Ionicons name="checkmark-circle" size={24} color="#1FAEEB" />
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
            <Ionicons name="arrow-back" size={24} color="#FDF8F8" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isPasswordReset ? 'Xác thực đổi mật khẩu' : 'Xác thực tài khoản'}
          </Text>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          <Text style={styles.instructionTitle}>
            Nhập mã xác thực gồm 6 số được gửi đến
          </Text>

          <Text style={styles.phoneNumberText}>{email}</Text>

          {/* OTP Input */}
          <View style={styles.otpContainer}>
            {otpDigits.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={styles.otpInput}
                value={digit}
                onChangeText={(text) => handleOtpChange(text, index)}
                keyboardType="numeric"
                maxLength={1}
                onKeyPress={(e) => handleKeyPress(e, index)}
                autoFocus={index === 0}
              />
            ))}
          </View>

          {/* Timer and Resend */}
          <View style={styles.timerContainer}>
            <TouchableOpacity
              onPress={handleResendOtp}
              disabled={!canResend || isLoading}
            >
              <Text
                style={[
                  styles.resendText,
                  canResend && !isLoading ? styles.activeResend : styles.disabledResend
                ]}
              >
                Gửi lại {!canResend && `(${timer}s)`}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="information-circle" size={24} color="#1FAEEB" />
            </View>
            <Text style={styles.infoText}>
              Mã xác thực (OTP) đã được gửi bằng tin nhắn đến email của bạn.
              Vui lòng kiểm tra và nhập mã để tiếp tục.
            </Text>
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={styles.verifyButton}
            onPress={handleVerifyOtp}
            disabled={isLoading}
          >
            <Text style={styles.verifyText}>Xác nhận</Text>
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
  header: {
    backgroundColor: '#1FAEEB',
    paddingTop: 15,
    paddingBottom: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontFamily: 'System',
    fontSize: 18,
    fontWeight: '400',
    color: '#FDF8F8',
    marginLeft: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  instructionTitle: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '400',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 5,
  },
  phoneNumberText: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 40,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30,
  },
  otpInput: {
    width: 40,
    height: 45,
    borderBottomWidth: 2,
    borderBottomColor: '#1FAEEB',
    marginHorizontal: 8,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '600',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  resendText: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '400',
  },
  activeResend: {
    color: '#1FAEEB',
  },
  disabledResend: {
    color: '#8B8B8B',
  },
  infoCard: {
    backgroundColor: '#E8F5FE',
    borderRadius: 8,
    padding: 15,
    flexDirection: 'row',
    marginBottom: 30,
    width: '90%',
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
  verifyButton: {
    backgroundColor: '#1FAEEB',
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 24,
    alignItems: 'center',
    position: 'absolute',
    bottom: 40,
  },
  verifyText: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  }, loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#000000',
  }, notificationContainer: {
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

export default OTPScreen;
