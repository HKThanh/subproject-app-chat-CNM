import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Define navigation prop type if you're using React Navigation
type FormRegisterScreenProps = {
  navigation?: any;
  route?: {
    params?: {
      phoneNumber?: string;
      email?: string;
    };
  };
};

const FormRegisterScreen = ({ navigation, route }: FormRegisterScreenProps) => {
  const phoneNumber = route?.params?.phoneNumber || '';
  const email = route?.params?.email || '';
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChecked, setPasswordChecked] = useState(false);
  const [passwordMatch, setPasswordMatch] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (confirmPassword.length > 0) {
      setPasswordMatch(text === confirmPassword);
    }
  };
  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    if (text.length > 0) {
      setPasswordChecked(true);
      setPasswordMatch(password === text);
    } else {
      setPasswordChecked(false);
    }
  };
  const handleRegister = async () => {
    if (!name.trim() || !password.trim() || password.length < 6 || password !== confirmPassword) {
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      const response = await fetch('http://192.168.0.107:3000/auth/register-phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullname: name.trim(),
          password: password,
          email: email,
          phone: phoneNumber,
        }),
      });

      const data = await response.json();      if (response.ok) {
        // Đăng ký thành công, OTP đã được gửi đến email
        navigation.navigate('OTPScreen', { 
          phoneNumber: phoneNumber,
          email: email,
          fullname: name.trim(),
          password: password
        });
      } else {
        // Xử lý lỗi từ server
        setErrorMessage(data.message || 'Đăng ký không thành công');
        if (data.message === 'Tài khoản đã có người đăng ký') {
          Alert.alert(
            'Lỗi đăng ký',
            'Số điện thoại đã được đăng ký. Vui lòng sử dụng số điện thoại khác hoặc đăng nhập.',
            [{ text: 'Đã hiểu' }]
          );
        } else {
          Alert.alert(
            'Lỗi đăng ký',
            data.message || 'Có lỗi xảy ra khi đăng ký tài khoản',
            [{ text: 'Đã hiểu' }]
          );
        }
      }
    } catch (error) {
      setErrorMessage('Không thể kết nối đến máy chủ');
      Alert.alert(
        'Lỗi kết nối',
        'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.',
        [{ text: 'Đã hiểu' }]
      );
    } finally {
      setIsLoading(false);
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
            <Text>
              <Ionicons name="arrow-back" size={24} color="#FDF8F8" />
            </Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tạo tài khoản</Text>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Name Input */}
          <Text style={styles.inputLabel}>Tên Welo</Text>
          <TextInput
            style={styles.nameInput}
            value={name}
            onChangeText={setName}
            placeholder="Nhập tên Welo của bạn"
            placeholderTextColor="#645C5C"
          />
          <View style={styles.inputLine} />

          <Text style={styles.helperText}>Gồm 2-40 ký tự</Text>

          {/* Password Input */}
          <Text style={styles.inputLabel}>Mật khẩu</Text>
          <TextInput
            style={styles.nameInput}
            value={password}
            onChangeText={handlePasswordChange}
            placeholder="Nhập mật khẩu của bạn"
            placeholderTextColor="#645C5C"
            secureTextEntry={true}
          />
          <View style={styles.inputLine} />
          <Text style={styles.helperText}>Mật khẩu phải có ít nhất 6 ký tự</Text>
          <TextInput
            style={styles.nameInput}
            value={confirmPassword}
            onChangeText={handleConfirmPasswordChange}
            placeholder="Nhập lại mật khẩu của bạn"
            placeholderTextColor="#645C5C"
            secureTextEntry={true}
          />
          <View style={styles.inputLine} />
          {passwordChecked && !passwordMatch ? (
            <Text style={styles.errorText}>Mật khẩu nhập lại không khớp</Text>
          ) : (
            confirmPassword.length > 0 && (
              <Text style={styles.helperText}>Mật khẩu hợp lệ</Text>
            )
          )}

          {/* <Text style={styles.linkText}>Lưu ý khi đặt tên</Text> */}

          {/* Guidelines */}
          <View style={styles.guidelineContainer}>
            <View style={styles.bulletPoint} />
            <Text style={styles.guidelineText}>
              Nên sử dụng tên thật giúp bạn bè dễ nhận ra bạn
            </Text>
          </View>

          <View style={styles.guidelineContainer}>
            <View style={styles.bulletPoint} />
            <Text style={styles.guidelineText}>
              Không vi phạm{' '}
              <Text style={styles.blueText}>Quy định đặt tên trên Welo</Text>
            </Text>
          </View>

          {/* Continue Button */}
          <View style={styles.footer}>
            <View style={styles.termsContainer}>
              <View style={styles.checkboxContainer}>
                <TouchableOpacity onPress={() => setAgreedToTerms(!agreedToTerms)}>
                  <View style={styles.checkbox}>
                    {agreedToTerms && (
                      <Text>
                        <Ionicons name="checkmark" size={14} color="#FDF8F8" />
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
                <Text style={styles.termsText}>
                  Tiếp tục nghĩa là bạn đồng ý với các{' '}
                  <Text style={styles.blueText}>điều khoản sử dụng Welo</Text>
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.continueButton, (!name.trim() || !password.trim() || password.length < 6 || password !== confirmPassword || isLoading) ? styles.disabledButton : {}]}
                disabled={!name.trim() || !password.trim() || password.length < 6 || password !== confirmPassword || isLoading}
                onPress={handleRegister}
              >
                <View style={styles.arrowCircle}>
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FDF8F8" />
                  ) : (
                    <Text>
                      <Ionicons name="arrow-forward" size={18} color="#FDF8F8" />
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            </View>
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
    paddingTop: 15,
    paddingBottom: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '400',
    color: '#FFFFFF',
    marginLeft: 20,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  inputLabel: {
    fontFamily: 'Inter',
    fontSize: 18,
    fontWeight: '400',
    color: '#000000',
    marginBottom: 15,
    marginTop: 20,
  },
  nameInput: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '400',
    color: '#000000',
    padding: 0,
    marginBottom: 5,
  },
  inputLine: {
    height: 1,
    backgroundColor: 'rgba(97, 104, 106, 0.3)',
    marginBottom: 5,
  },
  helperText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '400',
    color: '#645C5C',
    marginBottom: 20,
  },
  linkText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '400',
    color: '#111010',
    marginBottom: 20,
  },
  guidelineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  bulletPoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#131212',
    marginRight: 10,
  },
  guidelineText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '400',
    color: '#000000',
    flex: 1,
  },
  blueText: {
    color: '#1FAEEB',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
  },
  termsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1FAEEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  termsText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '400',
    color: '#645C5C',
    flex: 1,
  },
  continueButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  arrowCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1FAEEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '400',
    color: '#FF0000',
    marginBottom: 20,
  },
});

export default FormRegisterScreen;
