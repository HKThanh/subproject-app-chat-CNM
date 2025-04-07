import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import PasswordField from '../../components/PasswordField';
import { useAuth } from '../../contexts/AuthContext';

type RootStackParamList = {
  SignIn: undefined;
  ForgotPasswordScreen: undefined;
};

type SignInScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SignIn'>;

interface SignInProps {
  navigation: SignInScreenNavigationProp;
}

const SignIn: React.FC<SignInProps> = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const { signIn, isLoading } = useAuth();

  const handleSignIn = async () => {
    if (!phone || !password) {
      setErrorMessage('Hãy nhập cả số điện thoại và mật khẩu');
      return;
    }

    try {
      setErrorMessage('');
      await signIn(phone, password);
      // Navigation to main app screens will be handled by the authentication flow
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Đã xảy ra lỗi khi đăng nhập');
      }
    }
  };

  const navigateToForgotPassword = () => {
    navigation.navigate('ForgotPasswordScreen');
  };

  return (
    <View style={styles.container}>
      <TextInput
        onChangeText={setPhone}
        value={phone}
        style={styles.phoneInput}
        placeholder="Số điện thoại"
        keyboardType="phone-pad"
      />
      <PasswordField
        style={{ width: '90%' }}
        placeholder="Mật khẩu"
        onChangeText={setPassword}
        value={password}
      />
      <TouchableOpacity
        style={styles.button}
        onPress={handleSignIn}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Đang xử lý...' : 'Xác nhận'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={navigateToForgotPassword}
      >
        <Text style={styles.buttonText}>Quên mật khẩu?</Text>
      </TouchableOpacity>
      {errorMessage !== '' && (
        <Text style={styles.errorMessage}>{errorMessage}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: '10%',
  },
  phoneInput: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderColor: '#1DC071',
    color: '#000',
    padding: 10,
    width: '100%',
  },
  button: {
    borderRadius: 10,
    marginTop: 20,
    width: '80%',
    backgroundColor: '#1DC071',
    padding: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  errorMessage: {
    color: 'red',
    marginTop: 10,
  },
});

export default SignIn;