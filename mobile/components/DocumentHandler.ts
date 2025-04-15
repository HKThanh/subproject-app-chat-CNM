import * as DocumentPicker from 'expo-document-picker';
import { Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';

// Define file types interface
interface FileInfo {
  uri: string;
  name: string;
  type: string;
  fileType: 'image' | 'video' | 'document';
  size?: number;
}

// Document file picker with improved handling
export const pickDocument = async (): Promise<FileInfo[]> => {
  try {
    console.log('Opening document picker...');
    
    // Configure and launch document picker with more file type support
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        // Document types
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        // Accept all types as fallback
        'application/octet-stream',
        '*/*'
      ],
      multiple: true,
      copyToCacheDirectory: true
    });

    console.log('Document picker result:', result);

    if (result.canceled === false && result.assets && result.assets.length > 0) {
      // Process selected files
      const newFiles: FileInfo[] = await Promise.all(
        result.assets.map(async (asset) => {
          // Detect mime type from extension if not provided
          let mimeType = asset.mimeType || 'application/octet-stream';
          const fileExt = asset.name?.split('.').pop()?.toLowerCase() || '';
          
          // Force correct MIME type based on extension
          if (fileExt === 'pdf') {
            mimeType = 'application/pdf';
          } else if (fileExt === 'doc') {
            mimeType = 'application/msword';
          } else if (fileExt === 'docx') {
            mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
          }
          
          console.log(`Selected document: ${asset.name}, size: ${asset.size}, type: ${mimeType}`);
          
          // Get file size if not provided
          let fileSize = asset.size;
          if (!fileSize && FileSystem.documentDirectory) {
            try {
              const fileInfo = await FileSystem.getInfoAsync(asset.uri);
              if (fileInfo.exists) {
                fileSize = fileInfo.size;
              }
            } catch (err) {
              console.error('Error getting file info:', err);
            }
          }
          
          return {
            uri: asset.uri,
            name: asset.name || `document_${Date.now()}.${fileExt || 'pdf'}`,
            type: mimeType,
            fileType: 'document',
            size: fileSize || 0
          };
        })
      );
      
      return newFiles;
    }
    
    return [];
  } catch (error) {
    console.error('Error picking document:', error);
    Alert.alert('Error', 'Failed to select document. Please try again.');
    return [];
  }
};

// Get document icon based on file extension
export const getDocumentIcon = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  
  switch (ext) {
    case 'pdf':
      return 'document-text';
    case 'doc':
    case 'docx':
      return 'document-text';
    case 'xls':
    case 'xlsx':
      return 'document-text';
    case 'ppt':
    case 'pptx':
      return 'document-text';
    case 'txt':
      return 'document-text';
    default:
      return 'document-text';
  }
};

// Helper function to create document file data for FormData
export const createDocumentFileData = (file: FileInfo) => {
  // Handle file URI format differences between iOS and Android
  const fileUri = Platform.OS === 'android' ? file.uri : file.uri.replace('file://', '');
  
  return {
    uri: fileUri,
    name: file.name,
    type: file.type
  };
};
