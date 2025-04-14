import React, { useState } from 'react';
import { 
  View, 
  Modal, 
  StyleSheet, 
  TouchableOpacity, 
  Text, 
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Dimensions
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';

interface DocumentViewerProps {
  uri: string;
  fileName: string;
  visible: boolean;
  onClose: () => void;
}

const getFileExtension = (url: string): string => {
  const fileName = url.split('/').pop() || '';
  return fileName.split('.').pop()?.toLowerCase() || '';
};

const getViewerUrl = (fileUrl: string): string => {
  const extension = getFileExtension(fileUrl);
  const encodedUrl = encodeURIComponent(fileUrl);
  
  // Google Docs Viewer works for PDF, DOC, DOCX, and more
  return `https://docs.google.com/viewer?url=${encodedUrl}&embedded=true`;
};

const DocumentViewer: React.FC<DocumentViewerProps> = ({ uri, fileName, visible, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const viewerUrl = getViewerUrl(uri);
  const extension = getFileExtension(uri);

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{fileName || `Document.${extension}`}</Text>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="share-outline" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="download-outline" size={24} color="#000" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.viewerContainer}>
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#1FAEEB" />
              <Text style={styles.loadingText}>Loading document...</Text>
            </View>
          )}
          
          <WebView
            source={{ uri: viewerUrl }}
            style={styles.webView}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            allowsInlineMediaPlayback={true}
            scalesPageToFit={true}
            bounces={false}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  closeButton: {
    padding: 5,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
    color: '#000',
  },
  actionButton: {
    padding: 5,
    marginLeft: 10,
  },
  viewerContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 10,
    color: '#1FAEEB',
    fontSize: 16,
  }
});

export default DocumentViewer;
