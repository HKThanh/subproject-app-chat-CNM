import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import { Alert, Platform } from 'react-native';

export interface PermissionResult {
  granted: boolean;
  canAskAgain: boolean;
  message?: string;
}

export class PermissionService {
  
  /**
   * Request camera permission
   */
  static async requestCameraPermission(): Promise<PermissionResult> {
    try {
      console.log('[PermissionService] Requesting camera permission...');
      
      const { status, canAskAgain } = await Camera.requestCameraPermissionsAsync();
      
      console.log('[PermissionService] Camera permission result:', { status, canAskAgain });
      
      if (status === 'granted') {
        return { granted: true, canAskAgain };
      } else {
        return { 
          granted: false, 
          canAskAgain,
          message: 'Quyền truy cập camera bị từ chối. Vui lòng cấp quyền trong cài đặt để thực hiện cuộc gọi video.'
        };
      }
    } catch (error) {
      console.error('[PermissionService] Error requesting camera permission:', error);
      return { 
        granted: false, 
        canAskAgain: false,
        message: 'Lỗi khi yêu cầu quyền camera.'
      };
    }
  }

  /**
   * Request microphone permission
   */
  static async requestMicrophonePermission(): Promise<PermissionResult> {
    try {
      console.log('[PermissionService] Requesting microphone permission...');
      
      const { status, canAskAgain } = await Audio.requestPermissionsAsync();
      
      console.log('[PermissionService] Microphone permission result:', { status, canAskAgain });
      
      if (status === 'granted') {
        return { granted: true, canAskAgain };
      } else {
        return { 
          granted: false, 
          canAskAgain,
          message: 'Quyền truy cập microphone bị từ chối. Vui lòng cấp quyền trong cài đặt để thực hiện cuộc gọi.'
        };
      }
    } catch (error) {
      console.error('[PermissionService] Error requesting microphone permission:', error);
      return { 
        granted: false, 
        canAskAgain: false,
        message: 'Lỗi khi yêu cầu quyền microphone.'
      };
    }
  }

  /**
   * Request both camera and microphone permissions for video calls
   */
  static async requestVideoCallPermissions(): Promise<{
    camera: PermissionResult;
    microphone: PermissionResult;
    allGranted: boolean;
  }> {
    console.log('[PermissionService] Requesting video call permissions...');
    
    const [cameraResult, microphoneResult] = await Promise.all([
      this.requestCameraPermission(),
      this.requestMicrophonePermission()
    ]);

    const allGranted = cameraResult.granted && microphoneResult.granted;
    
    console.log('[PermissionService] Video call permissions result:', {
      camera: cameraResult.granted,
      microphone: microphoneResult.granted,
      allGranted
    });

    return {
      camera: cameraResult,
      microphone: microphoneResult,
      allGranted
    };
  }

  /**
   * Request microphone permission for audio calls
   */
  static async requestAudioCallPermissions(): Promise<{
    microphone: PermissionResult;
    allGranted: boolean;
  }> {
    console.log('[PermissionService] Requesting audio call permissions...');
    
    const microphoneResult = await this.requestMicrophonePermission();

    console.log('[PermissionService] Audio call permissions result:', {
      microphone: microphoneResult.granted,
      allGranted: microphoneResult.granted
    });

    return {
      microphone: microphoneResult,
      allGranted: microphoneResult.granted
    };
  }

  /**
   * Check if camera permission is already granted
   */
  static async checkCameraPermission(): Promise<boolean> {
    try {
      const { status } = await Camera.getCameraPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('[PermissionService] Error checking camera permission:', error);
      return false;
    }
  }

  /**
   * Check if microphone permission is already granted
   */
  static async checkMicrophonePermission(): Promise<boolean> {
    try {
      const { status } = await Audio.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('[PermissionService] Error checking microphone permission:', error);
      return false;
    }
  }

  /**
   * Show permission denied alert with settings redirect option
   */
  static showPermissionDeniedAlert(message: string, onOpenSettings?: () => void) {
    Alert.alert(
      'Quyền truy cập bị từ chối',
      message,
      [
        {
          text: 'Hủy',
          style: 'cancel',
        },
        ...(onOpenSettings ? [{
          text: 'Mở cài đặt',
          onPress: onOpenSettings,
        }] : [])
      ]
    );
  }

  /**
   * Handle permission request with user-friendly alerts
   */
  static async handlePermissionRequest(
    permissionType: 'video' | 'audio',
    onSuccess: () => void,
    onFailure?: (message: string) => void
  ) {
    try {
      let result;
      
      if (permissionType === 'video') {
        result = await this.requestVideoCallPermissions();
        
        if (!result.allGranted) {
          const messages = [];
          if (!result.camera.granted) {
            messages.push('camera');
          }
          if (!result.microphone.granted) {
            messages.push('microphone');
          }
          
          const message = `Cần quyền truy cập ${messages.join(' và ')} để thực hiện cuộc gọi video.`;
          
          if (onFailure) {
            onFailure(message);
          } else {
            this.showPermissionDeniedAlert(message);
          }
          return;
        }
      } else {
        result = await this.requestAudioCallPermissions();
        
        if (!result.allGranted) {
          const message = 'Cần quyền truy cập microphone để thực hiện cuộc gọi âm thanh.';
          
          if (onFailure) {
            onFailure(message);
          } else {
            this.showPermissionDeniedAlert(message);
          }
          return;
        }
      }
      
      // All permissions granted
      onSuccess();
      
    } catch (error) {
      console.error('[PermissionService] Error handling permission request:', error);
      const message = 'Lỗi khi yêu cầu quyền truy cập. Vui lòng thử lại.';
      
      if (onFailure) {
        onFailure(message);
      } else {
        Alert.alert('Lỗi', message);
      }
    }
  }
}
