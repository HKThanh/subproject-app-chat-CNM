import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import FormRegisterScreen from './screens/FormRegisterScreen';
import OTPScreen from './screens/OTPScreen';
import HomeScreen from './screens/HomeScreen';
import InfoScreen from './screens/InfoScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="WelcomeScreen"
        screenOptions={{
          headerShown: false
        }}
      >
        <Stack.Screen name="WelcomeScreen" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="FormRegisterScreen" component={FormRegisterScreen} />
        <Stack.Screen name="OTPScreen" component={OTPScreen} />
        <Stack.Screen name="HomeScreen" component={HomeScreen} />
        <Stack.Screen name="InfoScreen" component={InfoScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
