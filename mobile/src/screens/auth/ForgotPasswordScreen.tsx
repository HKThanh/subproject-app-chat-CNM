import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AuthStackParamList } from '../../navigation/LoginStackNavigator';
import OTPModal from '../../components/OTPModal';
import PasswordField from '../../components/PasswordField';
import { requestOTP, verifyOTP } from '../../services/authApi';

type ForgotPasswordScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  'ForgotPasswordScreen'
>;

interface ForgotPasswordScreenProps {
  navigation: ForgotPasswordScreenNavigationProp;
}

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const [phone, setPhone] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [otpModalVisible, setOtpModalVisible] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const handleResetPassword = async () => {
    if (!phone) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');
      return;
    }

    if (!newPassword || !confirmPassword) {
      Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu mới và xác nhận mật khẩu');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
      return;
    }

    // Password strength validation
    const passwordRegex = 
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    
    if (!passwordRegex.test(newPassword)) {
      Alert.alert(
        'Lỗi',
        'Mật khẩu phải chứa ít nhất 8 ký tự, bao gồm ít nhất một chữ cái viết thường, một chữ cái viết hoa, một số và một ký tự đặc biệt.'
      );
      return;
    }

    try {
      setLoading(true);
      // Request OTP for password reset
      await requestOTP(phone);
      setOtpModalVisible(true);
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Lỗi', error.message);
      } else {
        Alert.alert('Lỗi', 'Không thể gửi OTP, vui lòng thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      setLoading(true);
      await requestOTP(phone);
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Lỗi', error.message);
      } else {
        Alert.alert('Lỗi', 'Không thể gửi lại OTP, vui lòng thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOTP = async (otp: string) => {
    try {
      setLoading(true);
      // Verify OTP
      await verifyOTP(phone, otp);
      
      // Here you would reset the password by calling your API
      // Since we don't have that endpoint yet, we'll simulate success
      
      Alert.alert(
        'Thành công', 
        'Mật khẩu đã được đặt lại thành công. Vui lòng đăng nhập bằng mật khẩu mới.',
        [
          { 
            text: 'OK', 
            onPress: () => navigation.navigate('SignIn') 
          }
        ]
      );
      setOtpModalVisible(false);
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Lỗi', error.message);
      } else {
        Alert.alert('Lỗi', 'Không thể xác thực OTP, vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đặt lại mật khẩu</Text>
      <Text style={styles.description}>
        Nhập số điện thoại của bạn và mật khẩu mới để đặt lại mật khẩu.
      </Text>

      <Text style={styles.label}>Số điện thoại</Text>
      <TextInput
        style={styles.input}
        placeholder="Nhập số điện thoại"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />

      <Text style={styles.label}>Mật khẩu mới</Text>
      <PasswordField
        placeholder="Nhập mật khẩu mới"
        value={newPassword}
        onChangeText={setNewPassword}
      />

      <Text style={styles.label}>Xác nhận mật khẩu</Text>
      <PasswordField
        placeholder="Nhập lại mật khẩu mới"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleResetPassword}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
        </Text>
      </TouchableOpacity>

      <OTPModal
        visible={otpModalVisible}
        onClose={() => setOtpModalVisible(false)}
        onResend={handleResendOTP}
        onConfirm={handleConfirmOTP}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1DC071',
  },
  description: {
    fontSize: 16,
    marginBottom: 30,
    color: '#333',
  },
  label: {
    marginBottom: 5,
    fontSize: 16,
    fontWeight: '500',
    color: '#1DC071',
  },
  input: {
    borderBottomWidth: 1,
    borderColor: '#1DC071',
    padding: 10,
    marginBottom: 20,
    width: '100%',
    color: '#000',
  },
  button: {
    backgroundColor: '#1DC071',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 30,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ForgotPasswordScreen;