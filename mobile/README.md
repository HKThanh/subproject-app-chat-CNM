# WaveChat Mobile App

This is a React Native Expo mobile application for WaveChat, implemented using TypeScript. The app includes a complete authentication flow that connects to the WaveChat backend API.

## Features

- Welcome/authentication screen
- Phone number and password login
- User registration with OTP verification
- Password reset functionality
- Gender and date of birth selection during registration
- Backend API integration for all authentication flows

## Project Structure

- `src/assets/img/` - Image assets including background and app icon
- `src/components/` - Reusable UI components
- `src/contexts/` - Context providers for state management
- `src/navigation/` - Navigation configuration
- `src/screens/auth/` - Authentication-related screens
- `src/services/` - API service and configuration
- `src/styles/` - Global styles

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Expo CLI

### Installation

1. Install dependencies:

```bash
npm install
```

2. Start the Expo development server:

```bash
npm start
```

3. Use the Expo Go app on your mobile device to scan the QR code or use an emulator.

## Backend Integration

The app is configured to connect to the WaveChat backend API. By default, it connects to the development server running at http://localhost:5000/api.

To change the API URL for production:
1. Update the `PROD_API_URL` in `src/services/config.ts`
2. Set the environment to production when building the app

## Design

The app's design is 100% identical to the mobile-old version, maintaining the same colors, layouts, and user experience. The primary app color is #1DC071.

## Authentication Flow

1. **Welcome Screen**: User can choose to sign in or sign up
2. **Sign In**: Log in with phone number and password
3. **Sign Up**: Register with phone number, username, and password
4. **OTP Verification**: Verify phone number via OTP for new registrations
5. **Gender & DOB**: Set user profile details after successful registration