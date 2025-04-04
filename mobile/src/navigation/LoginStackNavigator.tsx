import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { globalScreenOptions } from '../styles/globalStyles';

// Import authentication screens
import AuthenScreen from '../screens/auth/AuthenScreen';
import SignIn from '../screens/auth/SignIn';
import SignUp from '../screens/auth/SignUp';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import GenderDOBSelectionScreen from '../screens/auth/GenderDOBSelectionScreen';

// Define the types for the authentication navigation stack
export type AuthStackParamList = {
  authenNavigation: undefined;
  SignIn: undefined;
  SignUp: undefined;
  ForgotPasswordScreen: undefined;
  GenderDOBSelectionScreen: { accessToken: string };
};

const Stack = createStackNavigator<AuthStackParamList>();

const LoginStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={globalScreenOptions}>
      <Stack.Screen
        name="authenNavigation"
        component={AuthenScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SignIn"
        component={SignIn}
        options={{ title: 'Đăng nhập' }}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUp}
        options={{ title: 'Tạo tài khoản' }}
      />
      <Stack.Screen
        name="ForgotPasswordScreen"
        component={ForgotPasswordScreen}
        options={{ title: 'Quên mật khẩu' }}
      />
      <Stack.Screen
        name="GenderDOBSelectionScreen"
        component={GenderDOBSelectionScreen}
        options={{ title: 'Ngày sinh và giới tính' }}
      />
    </Stack.Navigator>
  );
};

export default LoginStackNavigator;