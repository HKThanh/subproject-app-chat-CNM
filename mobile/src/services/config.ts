// API connection configuration

// Base URLs for development and production environments
const DEV_API_URL = 'http://localhost:3000/api';
const PROD_API_URL = 'https://wavechat-api.example.com/api'; // Replace with your actual production API URL

// API version
const API_VERSION = '';  // Add version if needed, e.g. 'v1'

// Get current environment
const isDevelopment = process.env.NODE_ENV === 'development' || true;

// Determine which base URL to use
export const API_BASE_URL = isDevelopment ? DEV_API_URL : PROD_API_URL;

// Default request timeout (in milliseconds)
export const REQUEST_TIMEOUT = 15000;

// Endpoint paths
export const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REQUEST_OTP: '/auth/request-otp',
    VERIFY_OTP: '/auth/verify-otp',
    REFRESH_TOKEN: '/auth/refresh-token',
    LOGOUT: '/auth/logout',
  },
  USER: {
    PROFILE: '/user/profile',
    UPDATE_PROFILE: '/user/update',
    CHANGE_PASSWORD: '/user/change-password',
    SEARCH: '/user/search',
  },
  FRIEND: {
    LIST: '/friend/list',
    REQUEST: '/friend/request',
    ACCEPT: '/friend/accept',
    REJECT: '/friend/reject',
    CANCEL: '/friend/cancel',
    BLOCK: '/friend/block',
    UNBLOCK: '/friend/unblock',
  },
  MESSAGE: {
    SEND: '/message/send',
    LIST: '/message/list',
    READ: '/message/read',
    DELETE: '/message/delete',
  },
};

// Auth token configuration
export const TOKEN_CONFIG = {
  ACCESS_TOKEN_KEY: 'accessToken',
  REFRESH_TOKEN_KEY: 'refreshToken',
  USER_INFO_KEY: 'userInfo',
};