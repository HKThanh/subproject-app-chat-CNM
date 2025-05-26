Run Project
1. start docker in back-end
2. start back-end
3. In mobile
    run terminal with "npm start"
4. When it run in terminal will see your computer ip like 192.168.0.103
5. Replace static with your ip in all file (services and screen folder).
6. stop server
7. start it again in terminal with "npm start"

## WebRTC Calling Features

The app now includes audio and video calling between users using WebRTC technology. 

### Required Packages

Make sure to install these packages before testing the call features:
```
npm install react-native-webrtc expo-camera react-native-incall-manager
```

### How It Works

1. Calls are initiated from the chat screen by tapping the call button
2. Socket.io is used for signaling (connecting users)
3. WebRTC is used for the actual audio/video streaming
4. The app handles both incoming and outgoing calls

### Features
- Audio calls
- Video calls
- Mute microphone
- Turn camera on/off
- Switch between speaker and earpiece
- Switch between front and back camera

### Troubleshooting

If you experience issues with calls:
1. Ensure both users have granted camera and microphone permissions
2. Check that both devices are on the same network or can reach each other
3. Verify that the socket connection is working properly
