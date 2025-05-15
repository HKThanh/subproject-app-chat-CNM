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
import { Ionicons } from '@expo/vector-icons';

type ChangePasswordScreenProps = {
  navigation?: any;
  route?: {
    params?: {
      userData?: any;
      accessToken?: string;
    };
  };
};

const ChangePasswordScreen = ({ navigation, route }: ChangePasswordScreenProps) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const userData = route?.params?.userData;
  const accessToken = route?.params?.accessToken || global.accessToken;

  const handleChangePassword = async () => {
    // Validate inputs
    if (!oldPassword) {
      Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu cũ');
      return;
    }

    if (!newPassword) {
      Alert.alert('Lỗi', 'Vui lòng nhập mật khẩu mới');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu mới không khớp với nhau');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('http://192.168.0.104:3000/auth/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': accessToken ? `Bearer ${accessToken}` : '',
        },
        body: JSON.stringify({
          id: userData?.id,
          oldPassword: oldPassword,
          newPassword: newPassword
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        Alert.alert('Thành công', data.message || 'Cập nhật mật khẩu thành công', [
          { text: 'OK', onPress: () => navigation?.goBack() }
        ]);
      } else {
        Alert.alert('Thất bại', data.message || 'Không thể đổi mật khẩu');
      }
    } catch (error) {
      console.error('Change password error:', error);
      Alert.alert('Lỗi kết nối', 'Không thể kết nối đến máy chủ');
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
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Đổi mật khẩu</Text>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          <Text style={styles.instructionText}>
            Để thay đổi mật khẩu, vui lòng nhập mật khẩu cũ và mật khẩu mới
          </Text>

          {/* Old Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Mật khẩu cũ</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={oldPassword}
                onChangeText={setOldPassword}
                secureTextEntry={!showOldPassword}
                placeholder="Nhập mật khẩu cũ"
                placeholderTextColor="rgba(100, 92, 92, 0.5)"
              />
              <TouchableOpacity onPress={() => setShowOldPassword(!showOldPassword)}>
                <Text style={styles.showHideText}>
                  {showOldPassword ? 'ẨN' : 'HIỆN'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputLine} />
          </View>

          {/* New Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Mật khẩu mới</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
                placeholder="Nhập mật khẩu mới"
                placeholderTextColor="rgba(100, 92, 92, 0.5)"
              />
              <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                <Text style={styles.showHideText}>
                  {showNewPassword ? 'ẨN' : 'HIỆN'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputLine} />
          </View>

          {/* Confirm New Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Xác nhận mật khẩu mới</Text>
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
            onPress={handleChangePassword}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Xác nhận</Text>
            )}
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
    marginTop: 30,
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
});

export default ChangePasswordScreen;
