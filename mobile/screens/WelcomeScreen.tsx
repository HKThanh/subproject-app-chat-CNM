import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Image, 
  TouchableOpacity,
  SafeAreaView,
  StatusBar
} from 'react-native';

// Define navigation prop type if you're using React Navigation
type WelcomeScreenProps = {
  navigation?: any;
};

const WelcomeScreen = ({ navigation }: WelcomeScreenProps) => {
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Welo Logo */}
      <Text style={styles.logoText}>Welo</Text>
      
      {/* Main Image */}
      <Image 
        source={require('../assets/Welo_image.png')} 
        style={styles.mainImage}
        resizeMode="contain"
      />
        {/* Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.loginButton}
          onPress={() => navigation?.navigate('Login')}
        >
          <Text style={styles.loginButtonText}>Đăng nhập</Text>
        </TouchableOpacity>
          <TouchableOpacity 
          style={styles.grayButton}
          onPress={() => navigation?.navigate('Register')}
        >
          <Text style={styles.grayButtonText}>Đăng ký</Text>
        </TouchableOpacity>
      </View>
      
      {/* Language Selection */}
      <View style={styles.languageContainer}>
        <TouchableOpacity 
          onPress={() => setLanguage('vi')}
          style={styles.languageOption}
        >
          <Text style={[
            styles.languageText, 
            language === 'vi' ? styles.activeLanguage : styles.inactiveLanguage
          ]}>
            Tiếng Việt
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => setLanguage('en')}
          style={styles.languageOption}
        >
          <Text style={[
            styles.languageText, 
            language === 'en' ? styles.activeLanguage : styles.inactiveLanguage
          ]}>
            English
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logoText: {
    fontFamily: 'System',
    fontSize: 28,
    fontWeight: '400',
    color: '#1FAEEB',
    marginBottom: 20,
    position: 'absolute',
    top: 60,
  },
  mainImage: {
    width: '80%',
    height: 200,
    marginBottom: 40,
  },
  registerContainer: {
    marginBottom: 20,
  },
  registerText: {
    fontFamily: 'System',
    fontSize: 15,
    fontWeight: '400',
    color: '#000000',
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 30,
  },
  loginButton: {
    backgroundColor: '#1FAEEB',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 20,
    width: '80%',
    alignItems: 'center',
    marginBottom: 15,
  },
  loginButtonText: {
    fontFamily: 'System',
    fontSize: 15,
    fontWeight: '400',
    color: '#FFFFFF',
  },
  grayButton: {
    backgroundColor: 'rgba(217, 217, 217, 0.5)',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 20,
    width: '80%',
    alignItems: 'center',
  },
  grayButtonText: {
    fontFamily: 'System',
    fontSize: 15,
    fontWeight: '400',
  },
  languageContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 40,
  },
  languageOption: {
    paddingHorizontal: 10,
  },
  languageText: {
    fontFamily: 'System',
    fontSize: 15,
    fontWeight: '400',
  },
  activeLanguage: {
    color: '#000000',
  },
  inactiveLanguage: {
    color: '#9A8888',
  },
});

export default WelcomeScreen;