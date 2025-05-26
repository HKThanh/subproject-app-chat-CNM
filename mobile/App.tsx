import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from './screens/WelcomeScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import FormRegisterScreen from './screens/FormRegisterScreen';
import OTPScreen from './screens/OTPScreen';
import HomeScreen from './screens/HomeScreen';
import InfoScreen from './screens/InfoScreen';
import DetailInfoScreen from './screens/DetailInfoScreen';
import BioScreen from './screens/BioScreen';
import ResetPassScreen from './screens/ResetPassScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen';
import ChatScreen from './screens/ChatScreen';
import SearchUserScreen from './screens/SearchUserScreen';
import SocketService from './services/SocketService';
import ForwardMessageScreen from './screens/ForwardMessageScreen';
import GroupChatScreen from './screens/GroupChatScreen';
import DetailGroupChatScreen from './screens/DetailGroupChatScreen';
import CallScreen from './screens/CallScreen';
import IncomingCallHandler from './components/IncomingCallHandler';
const Stack = createNativeStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState<string>("WelcomeScreen");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeApp = async () => {
      // Initialize socket service and check for stored user credentials
      const socketService = SocketService.getInstance();
      const isAuthenticated = await socketService.initialize();

      // If user is authenticated, start from HomeScreen
      if (isAuthenticated) {
        setInitialRoute("HomeScreen");
      }

      setIsLoading(false);
    };

    initializeApp();
  }, []);

  if (isLoading) {
    // You could add a splash screen or loading indicator here
    return null;
  }  return (
    
    <NavigationContainer>
      <>
      <Stack.Navigator 
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false
        }}
      >
        <Stack.Screen name="WelcomeScreen" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="FormRegisterScreen" component={FormRegisterScreen} />
        <Stack.Screen name="OTPScreen" component={OTPScreen} />
        <Stack.Screen name="ResetPassScreen" component={ResetPassScreen} />
        <Stack.Screen name="HomeScreen" component={HomeScreen} />
        <Stack.Screen name="InfoScreen" component={InfoScreen} />
        <Stack.Screen name="BioScreen" component={BioScreen} />
        <Stack.Screen name="ChatScreen" component={ChatScreen} />
        <Stack.Screen name="ForwardMessageScreen" component={ForwardMessageScreen} />
        <Stack.Screen name="ChangePasswordScreen" component={ChangePasswordScreen} />
        <Stack.Screen name="GroupChatScreen" component={GroupChatScreen} />  
              <Stack.Screen name="DetailGroupChatScreen" component={DetailGroupChatScreen} />
        <Stack.Screen name="DetailInfoScreen" component={DetailInfoScreen} />
        <Stack.Screen name="CallScreen" component={CallScreen} />
        <Stack.Screen
          name="SearchUserScreen"
          component={SearchUserScreen}
          options={{ headerShown: false }}        />
      </Stack.Navigator>
      <IncomingCallHandler />
      </> 
      </NavigationContainer>
      
  );
}
