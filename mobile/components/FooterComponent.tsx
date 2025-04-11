import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Define types for our props
interface FooterComponentProps {
  activeTab: 'messages' | 'contacts' | 'explore' | 'diary' | 'profile';
  onTabPress: (tab: 'messages' | 'contacts' | 'explore' | 'diary' | 'profile') => void;
}

const FooterComponent: React.FC<FooterComponentProps> = ({ activeTab, onTabPress }) => {
  return (
    <View style={styles.footer}>
      <TouchableOpacity 
        style={styles.tabItem} 
        onPress={() => onTabPress('messages')}
      >
        <Ionicons 
          name="chatbubble-outline" 
          size={24} 
          color={activeTab === 'messages' ? '#0C71E8' : 'rgba(100, 92, 92, 0.7)'} 
          style={activeTab === 'messages' ? styles.activeIcon : {}}
        />
        <Text 
          style={[
            styles.tabText, 
            activeTab === 'messages' ? styles.activeTabText : {}
          ]}
        >
          Tin nhắn
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.tabItem} 
        onPress={() => onTabPress('contacts')}
      >
        <Ionicons 
          name="people-outline" 
          size={24} 
          color={activeTab === 'contacts' ? '#0C71E8' : 'rgba(100, 92, 92, 0.7)'} 
          style={activeTab === 'contacts' ? styles.activeIcon : {}}
        />
        <Text 
          style={[
            styles.tabText, 
            activeTab === 'contacts' ? styles.activeTabText : {}
          ]}
        >
          Danh bạ
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.tabItem} 
        onPress={() => onTabPress('explore')}
      >
        <Ionicons 
          name="compass-outline" 
          size={24} 
          color={activeTab === 'explore' ? '#0C71E8' : 'rgba(100, 92, 92, 0.7)'} 
          style={activeTab === 'explore' ? styles.activeIcon : {}}
        />
        <Text 
          style={[
            styles.tabText, 
            activeTab === 'explore' ? styles.activeTabText : {}
          ]}
        >
          Khám phá
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.tabItem} 
        onPress={() => onTabPress('diary')}
      >
        <Ionicons 
          name="time-outline" 
          size={24} 
          color={activeTab === 'diary' ? '#0C71E8' : 'rgba(100, 92, 92, 0.7)'} 
          style={activeTab === 'diary' ? styles.activeIcon : {}}
        />
        <Text 
          style={[
            styles.tabText, 
            activeTab === 'diary' ? styles.activeTabText : {}
          ]}
        >
          Nhật kí
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.tabItem} 
        onPress={() => onTabPress('profile')}
      >
        <Ionicons 
          name="person-outline" 
          size={24} 
          color={activeTab === 'profile' ? '#0C71E8' : 'rgba(100, 92, 92, 0.7)'} 
          style={activeTab === 'profile' ? styles.activeIcon : {}}
        />
        <Text 
          style={[
            styles.tabText, 
            activeTab === 'profile' ? styles.activeTabText : {}
          ]}
        >
          Cá nhân
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    height: 60,
    backgroundColor: '#FAEFEF', // Match the Figma color fill_Y7D6BR
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingBottom: 5,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabText: {
    fontSize: 10,
    fontFamily: 'Inter',
    fontWeight: '400',
    color: '#645C5C', // Match the Figma color fill_CQHVQY
    marginTop: 2,
  },
  activeTabText: {
    color: '#0C71E8', // Match the Figma color fill_9Q60KB
  },
  activeIcon: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4, // For Android
  }
});

export default FooterComponent;
