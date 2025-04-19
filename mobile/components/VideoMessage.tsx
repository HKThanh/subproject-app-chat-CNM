import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity,
  Text,
  Dimensions 
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

interface VideoMessageProps {
  uri: string;
  timestamp: string;
}

const VideoMessage: React.FC<VideoMessageProps> = ({ uri, timestamp }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const video = React.useRef(null);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
    }
  };

  const togglePlayback = async () => {
    if (video.current) {
      if (isPlaying) {
        await video.current.pauseAsync();
      } else {
        await video.current.playAsync();
      }
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.videoContainer} 
        onPress={togglePlayback}
        activeOpacity={0.9}
      >
        <Video
          ref={video}
          source={{ uri }}
          style={styles.video}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          isLooping={false}
          onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
          posterStyle={{ resizeMode: 'cover' }}
        />
        
        {!isPlaying && (
          <View style={styles.playButtonContainer}>
            <TouchableOpacity 
              style={styles.playButton}
              onPress={togglePlayback}
            >
              <Ionicons name="play" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
      
      <Text style={styles.timestamp}>{timestamp}</Text>
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  videoContainer: {
    width: 200,
    height: 150,
    borderRadius: 12,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  playButtonContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 10,
    color: '#645C5C',
    alignSelf: 'flex-end',
    marginTop: 2,
  }
});

export default VideoMessage;
