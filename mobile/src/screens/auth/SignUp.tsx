import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import PasswordField from '../../components/PasswordField';
import OTPModal from '../../components/OTPModal';
import { useAuth } from '../../contexts/AuthContext';
import { requestOTP, verifyOTP } from '../../services/authApi';

type RootStackParamList = {
  SignUp: undefined;
  GenderDOBSelectionScreen: { accessToken: string };
};

type SignUpScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SignUp'>;

interface SignUpProps {
  navigation: SignUpScreenNavigationProp;
}

const SignUp: React.FC<SignUpProps> = ({ navigation }) => {
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [otpModalVisible, setOtpModalVisible] = useState<boolean>(false);
  const { signUp, isLoading } = useAuth();
  const [otpSessionPhone, setOtpSessionPhone] = useState<string>('');

  const handleOpenOTPModal = async () => {
    // Validate inputs
    if (!phoneNumber || !username || !password) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ thông tin');
      return;
    }

    // Validate password strength
    const passwordRegex = 
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    
    if (!passwordRegex.test(password)) {
      Alert.alert(
        'Lỗi',
        'Mật khẩu phải chứa ít nhất 8 ký tự, bao gồm ít nhất một chữ cái viết thường, một chữ cái viết hoa, một số và một ký tự đặc biệt.'
      );
      return;
    }

    try {
      // Request OTP from backend
      await requestOTP(phoneNumber);
      setOtpSessionPhone(phoneNumber);
      setOtpModalVisible(true);
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Lỗi', error.message);
      } else {
        Alert.alert('Lỗi', 'Không thể gửi OTP, vui lòng thử lại sau.');
      }
    }
  };

  const handleResendOTP = async () => {
    try {
      await requestOTP(phoneNumber);
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Lỗi', error.message);
      } else {
        Alert.alert('Lỗi', 'Không thể gửi lại OTP, vui lòng thử lại sau.');
      }
    }
  };

  const handleConfirmOTP = async (otp: string) => {
    try {
      // Verify OTP with backend
      await verifyOTP(otpSessionPhone, otp);
      
      // If OTP verification is successful, proceed with signup
      await signUp(phoneNumber, password, password);
      
      // Close OTP modal
      setOtpModalVisible(false);
      
      // Navigate to the gender/dob selection screen
      // Note: accessToken would normally come from the signUp response
      // but we're getting it from the auth context in a real implementation
      navigation.navigate('GenderDOBSelectionScreen', { 
        accessToken: 'tempToken' // This would be replaced with an actual token
      });
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert('Lỗi', error.message);
      } else {
        Alert.alert('Lỗi', 'Không thể xác thực OTP, vui lòng thử lại.');
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Số điện thoại</Text>
      <TextInput
        onChangeText={setPhoneNumber}
        value={phoneNumber}
        style={styles.phoneInput}
        keyboardType="phone-pad"
        placeholder="Nhập số điện thoại"
      />

      <Text style={styles.label}>Tên đăng nhập</Text>
      <TextInput
        style={styles.textInput}
        placeholder="Gồm 2-40 ký tự"
        onChangeText={setUsername}
        placeholderTextColor="#ccc"
        value={username}
      />

      <Text style={styles.label}>Mật khẩu</Text>
      <PasswordField
        placeholder="Mật khẩu"
        onChangeText={setPassword}
        value={password}
      />

      <TouchableOpacity
        style={styles.confirmButton}
        onPress={handleOpenOTPModal}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Đang xử lý...' : 'Xác nhận'}
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
    justifyContent: 'center',
    alignItems: 'stretch',
    padding: 20,
    backgroundColor: '#fff',
  },
  label: {
    alignSelf: 'flex-start',
    marginBottom: 5,
    color: '#1DC071',
  },
  phoneInput: {
    borderBottomWidth: 1,
    borderColor: '#1DC071',
    padding: 10,
    marginBottom: 20,
    color: '#000',
  },
  textInput: {
    borderBottomWidth: 1,
    borderColor: '#1DC071',
    padding: 10,
    marginBottom: 20,
    color: '#000',
  },
  confirmButton: {
    borderRadius: 10,
    backgroundColor: '#1DC071',
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default SignUp;