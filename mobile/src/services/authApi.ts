import axios from 'axios';
import { API_BASE_URL, ENDPOINTS, REQUEST_TIMEOUT } from './config';

// Create an axios instance with default configuration
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  }
});

interface LoginResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
}

interface LoginRequest {
  phone: string;
  password: string;
}

export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  try {
    const response = await apiClient.post<LoginResponse>(
      ENDPOINTS.AUTH.LOGIN, 
      credentials
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Login failed');
    }
    throw new Error('Network error occurred');
  }
};

export const requestOTP = async (phone: string): Promise<{ message: string; otp?: string }> => {
  try {
    const response = await apiClient.post(ENDPOINTS.AUTH.REQUEST_OTP, { phone });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Failed to request OTP');
    }
    throw new Error('Network error occurred');
  }
};

export const verifyOTP = async (phone: string, otp: string): Promise<{ message: string; phone: string }> => {
  try {
    const response = await apiClient.post(ENDPOINTS.AUTH.VERIFY_OTP, { phone, otp });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Failed to verify OTP');
    }
    throw new Error('Network error occurred');
  }
};

export const register = async (
  phone: string, 
  password: string,
  repassword: string
): Promise<{ phone: string }> => {
  try {
    const response = await apiClient.post(ENDPOINTS.AUTH.REGISTER, {
      phone,
      password,
      repassword
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Registration failed');
    }
    throw new Error('Network error occurred');
  }
};

export const logout = async (phone: string, token: string): Promise<{ message: string }> => {
  try {
    const response = await apiClient.post(
      ENDPOINTS.AUTH.LOGOUT,
      { phone },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Logout failed');
    }
    throw new Error('Network error occurred');
  }
};

export const refreshToken = async (refreshToken: string): Promise<{ accessToken: string }> => {
  try {
    const response = await apiClient.post(ENDPOINTS.AUTH.REFRESH_TOKEN, { refreshToken });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      throw new Error(error.response.data.message || 'Token refresh failed');
    }
    throw new Error('Network error occurred');
  }
};