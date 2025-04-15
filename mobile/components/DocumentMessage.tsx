import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Linking,
  Alert,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DocumentViewer from './DocumentViewer';

interface DocumentMessageProps {
  uri: string;
  timestamp: string;
}

const getFileExtension = (url: string): string => {
  // Extract filename from URL
  const filename = url.split('/').pop() || '';
  // Get extension
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  return extension;
};

const getDocumentIcon = (extension: string): string => {
  switch (extension) {
    case 'pdf':
      return 'document-text';
    case 'doc':
    case 'docx':
      return 'document';
    case 'xls':
    case 'xlsx':
      return 'document-text';
    case 'ppt':
    case 'pptx':
      return 'document-text';
    default:
      return 'document-outline';
  }
};

const getDocumentColor = (extension: string): string => {
  switch (extension) {
    case 'pdf':
      return '#E74C3C'; // Red for PDF
    case 'doc':
    case 'docx':
      return '#3498DB'; // Blue for Word
    case 'xls':
    case 'xlsx':
      return '#2ECC71'; // Green for Excel
    case 'ppt':
    case 'pptx':
      return '#F39C12'; // Orange for PowerPoint
    default:
      return '#1FAEEB'; // Default blue
  }
};

const getFileDisplayName = (url: string): string => {
  const filename = url.split('/').pop() || 'Document';
  // Decode URI components to handle special characters
  try {
    return decodeURIComponent(filename);
  } catch (e) {
    return filename;
  }
};

const DocumentMessage: React.FC<DocumentMessageProps> = ({ uri, timestamp }) => {
  const extension = getFileExtension(uri);
  const iconName = getDocumentIcon(extension);
  const iconColor = getDocumentColor(extension);
  const fileName = getFileDisplayName(uri);
  const [viewerVisible, setViewerVisible] = useState(false);

  const handlePress = async () => {
    // For PDF, DOC, DOCX - open in the in-app document viewer
    if (extension === 'pdf' || extension === 'doc' || extension === 'docx') {
      setViewerVisible(true);
    } else {
      // Fall back to external viewer for other formats
      try {
        const supported = await Linking.canOpenURL(uri);
        
        if (supported) {
          await Linking.openURL(uri);
        } else {
          Alert.alert(
            'Cannot Open Document',
            'Your device doesn\'t have an app installed that can open this document.',
            [{ text: 'OK' }]
          );
        }
      } catch (error) {
        console.error('Error opening document:', error);
        Alert.alert(
          'Error',
          'Could not open the document. The file might be corrupted or the URL is invalid.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.documentContainer}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={iconName} size={30} color={iconColor} />
          <View style={[styles.fileTypeBadge, { backgroundColor: iconColor }]}>
            <Text style={styles.fileTypeText}>{extension.toUpperCase()}</Text>
          </View>
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={styles.fileName} numberOfLines={2}>
            {fileName}
          </Text>
          <Text style={styles.openText}>Tap to view</Text>
        </View>
      </TouchableOpacity>
      
      <Text style={styles.timestamp}>{timestamp}</Text>
      
      {/* In-app Document Viewer */}
      <DocumentViewer 
        uri={uri} 
        fileName={fileName}
        visible={viewerVisible} 
        onClose={() => setViewerVisible(false)} 
      />
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: width * 0.7,
  },
  documentContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(240, 240, 240, 0.9)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
  },
  iconContainer: {
    position: 'relative',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileTypeBadge: {
    position: 'absolute',
    bottom: -2,
    right: -3,
    paddingHorizontal: 3,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fileTypeText: {
    color: '#FFFFFF',
    fontSize: 6,
    fontWeight: 'bold',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  openText: {
    fontSize: 10,
    color: '#666666',
    marginTop: 3,
  },
  timestamp: {
    fontSize: 10,
    color: '#645C5C',
    alignSelf: 'flex-end',
    marginTop: 2,
  }
});

export default DocumentMessage;
