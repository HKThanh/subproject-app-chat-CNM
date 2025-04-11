import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PasswordFieldProps extends TextInputProps {
  style?: StyleProp<ViewStyle>;
}

const PasswordField: React.FC<PasswordFieldProps> = ({
  style,
  placeholder = 'Password',
  ...props
}) => {
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  const toggleSecureEntry = () => {
    setSecureTextEntry(!secureTextEntry);
  };

  return (
    <View style={[styles.container, style]}>
      <TextInput
        style={styles.input}
        secureTextEntry={secureTextEntry}
        placeholder={placeholder}
        placeholderTextColor="#666"
        {...props}
      />
      <TouchableOpacity
        style={styles.iconContainer}
        onPress={toggleSecureEntry}
      >
        <Ionicons
          name={secureTextEntry ? 'eye-off' : 'eye'}
          size={24}
          color="#1DC071"
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#1DC071',
    marginBottom: 20,
    width: '100%',
  },
  input: {
    flex: 1,
    height: 50,
    color: '#000',
    padding: 10,
  },
  iconContainer: {
    padding: 10,
  },
});

export default PasswordField;