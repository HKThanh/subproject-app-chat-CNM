import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as authApi from '../services/authApi';

interface User {
  phone: string;
  username?: string;
  fullname?: string;
  urlavatar?: string;
  birthday?: Date;
  friendList?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isSignout: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  signIn: (phone: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (phone: string, password: string, repassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSignout, setIsSignout] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  // Check if user is already logged in on app start
  useEffect(() => {
    const bootstrapAsync = async () => {
      setIsLoading(true);
      try {
        // Retrieve stored tokens
        const storedAccessToken = await AsyncStorage.getItem('accessToken');
        const storedRefreshToken = await AsyncStorage.getItem('refreshToken');
        const storedUser = await AsyncStorage.getItem('user');

        if (storedAccessToken && storedRefreshToken && storedUser) {
          setAccessToken(storedAccessToken);
          setRefreshToken(storedRefreshToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error('Failed to restore authentication state:', e);
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const signIn = async (phone: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await authApi.login({ phone, password });
      
      // Store tokens
      await AsyncStorage.setItem('accessToken', response.accessToken);
      await AsyncStorage.setItem('refreshToken', response.refreshToken);
      
      // Set user data
      const userData: User = {
        phone,
        // Other user data will be set when we get the profile
      };
      
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      
      // Update state
      setAccessToken(response.accessToken);
      setRefreshToken(response.refreshToken);
      setUser(userData);
      setIsSignout(false);
      
      // TODO: Fetch user profile and update user data
      
    } catch (error) {
      console.error('Sign in failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      
      if (user?.phone && accessToken) {
        await authApi.logout(user.phone, accessToken);
      }
      
      // Clear stored data
      await AsyncStorage.removeItem('accessToken');
      await AsyncStorage.removeItem('refreshToken');
      await AsyncStorage.removeItem('user');
      
      // Update state
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
      setIsSignout(true);
      
    } catch (error) {
      console.error('Sign out failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (phone: string, password: string, repassword: string) => {
    try {
      setIsLoading(true);
      await authApi.register(phone, password, repassword);
      
      // Auto sign-in after successful registration
      await signIn(phone, password);
      
    } catch (error) {
      console.error('Sign up failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isSignout,
    accessToken,
    refreshToken,
    signIn,
    signOut,
    signUp
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};