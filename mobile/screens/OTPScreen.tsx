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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type OTPScreenProps = {
  navigation?: any;
  route?: {
    params: {
      phoneNumber: string;
    };
  };
};

const OTPScreen = ({ navigation, route }: OTPScreenProps) => {
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(300);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  // Format phone number to international format (+84)
  const phoneNumber = route?.params?.phoneNumber || '';
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

  const handleResendOtp = () => {
    if (canResend) {
      setTimer(300);
      setCanResend(false);
      // Reset OTP digits
      setOtpDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      
      // Show a message that OTP has been sent
      Alert.alert('Thông báo', 'Mã xác thực mới đã được gửi.');
    }
  };

  const handleVerifyOtp = () => {
    const otp = otpDigits.join('');
    
    if (otp.length === 6) {
      // For demonstration, we assume the OTP is correct
      // In a real app, you would verify this with your backend
      navigation?.navigate('WelcomeScreen');
    } else {
      Alert.alert('Lỗi', 'Vui lòng nhập đủ 6 chữ số mã xác thực.');
    }
  };

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
            <Ionicons name="arrow-back" size={24} color="#FDF8F8" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Xác thực số điện thoại</Text>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          <Text style={styles.instructionTitle}>
            Nhập mã xác thực gồm 6 số được gửi đến
          </Text>
          
          <Text style={styles.phoneNumberText}>{formattedPhoneNumber}</Text>

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
              disabled={!canResend}
            >
              <Text
                style={[
                  styles.resendText,
                  canResend ? styles.activeResend : styles.disabledResend
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
              Mã xác thực (OTP) đã được gửi bằng tin nhắn đến số điện thoại của bạn.
              Vui lòng kiểm tra và nhập mã để tiếp tục.
            </Text>
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={styles.verifyButton}
            onPress={handleVerifyOtp}
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
});

export default OTPScreen;
