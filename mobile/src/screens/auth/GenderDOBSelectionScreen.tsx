import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { AuthStackParamList } from '../../navigation/LoginStackNavigator';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../contexts/AuthContext';

type GenderDOBScreenNavigationProp = StackNavigationProp<
  AuthStackParamList,
  'GenderDOBSelectionScreen'
>;

type GenderDOBScreenRouteProp = RouteProp<
  AuthStackParamList,
  'GenderDOBSelectionScreen'
>;

interface GenderDOBSelectionScreenProps {
  navigation: GenderDOBScreenNavigationProp;
  route: GenderDOBScreenRouteProp;
}

const GenderDOBSelectionScreen: React.FC<GenderDOBSelectionScreenProps> = ({
  navigation,
  route,
}) => {
  const [selectedGender, setSelectedGender] = useState<'male' | 'female' | 'other' | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState<Date>(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const { accessToken } = useAuth();

  const onChangeDate = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || dateOfBirth;
    setShowDatePicker(Platform.OS === 'ios');
    setDateOfBirth(currentDate);
  };

  const showDatepicker = () => {
    setShowDatePicker(true);
  };

  const handleContinue = async () => {
    if (!selectedGender) {
      Alert.alert('Lỗi', 'Vui lòng chọn giới tính');
      return;
    }

    // Validate date of birth (user must be at least 13 years old)
    const today = new Date();
    const minAge = 13;
    const minBirthDate = new Date(
      today.getFullYear() - minAge,
      today.getMonth(),
      today.getDate()
    );

    if (dateOfBirth > minBirthDate) {
      Alert.alert('Lỗi', 'Bạn phải đủ 13 tuổi để sử dụng ứng dụng này');
      return;
    }

    try {
      setLoading(true);
      
      // Here you would call an API to update the user profile with gender and DOB
      // For now we'll just simulate success
      
      // Navigate to the main app screens
      // This navigation would typically be handled by your authentication flow
      // But for demonstration, we'll just show a success message
      Alert.alert(
        'Thành công',
        'Thông tin của bạn đã được cập nhật thành công!',
        [
          { 
            text: 'OK', 
            onPress: () => {
              // In a real app, you would navigate to the main app screen here
              // E.g., navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
            } 
          }
        ]
      );
    } catch (error) {
      Alert.alert(
        'Lỗi',
        'Không thể cập nhật thông tin. Vui lòng thử lại sau.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Thông tin cá nhân</Text>
      <Text style={styles.subtitle}>
        Vui lòng cung cấp thông tin của bạn để hoàn tất đăng ký.
      </Text>
      
      <Text style={styles.sectionTitle}>Giới tính</Text>
      <View style={styles.genderOptions}>
        <TouchableOpacity
          style={[
            styles.genderButton,
            selectedGender === 'male' && styles.selectedGender,
          ]}
          onPress={() => setSelectedGender('male')}
        >
          <Text
            style={[
              styles.genderText,
              selectedGender === 'male' && styles.selectedGenderText,
            ]}
          >
            Nam
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.genderButton,
            selectedGender === 'female' && styles.selectedGender,
          ]}
          onPress={() => setSelectedGender('female')}
        >
          <Text
            style={[
              styles.genderText,
              selectedGender === 'female' && styles.selectedGenderText,
            ]}
          >
            Nữ
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.genderButton,
            selectedGender === 'other' && styles.selectedGender,
          ]}
          onPress={() => setSelectedGender('other')}
        >
          <Text
            style={[
              styles.genderText,
              selectedGender === 'other' && styles.selectedGenderText,
            ]}
          >
            Khác
          </Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.sectionTitle}>Ngày sinh</Text>
      <TouchableOpacity style={styles.dateButton} onPress={showDatepicker}>
        <Text style={styles.dateText}>
          {dateOfBirth.toLocaleDateString('vi-VN')}
        </Text>
      </TouchableOpacity>
      
      {showDatePicker && (
        <DateTimePicker
          testID="dateTimePicker"
          value={dateOfBirth}
          mode="date"
          display="default"
          onChange={onChangeDate}
          maximumDate={new Date()}
        />
      )}
      
      <TouchableOpacity
        style={styles.continueButton}
        onPress={handleContinue}
        disabled={loading}
      >
        <Text style={styles.continueButtonText}>
          {loading ? 'Đang xử lý...' : 'Tiếp tục'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1DC071',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1DC071',
    marginBottom: 15,
    marginTop: 10,
  },
  genderOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  genderButton: {
    flex: 1,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginHorizontal: 5,
  },
  selectedGender: {
    backgroundColor: '#1DC071',
    borderColor: '#1DC071',
  },
  genderText: {
    fontSize: 16,
    color: '#333',
  },
  selectedGenderText: {
    color: '#fff',
  },
  dateButton: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    marginBottom: 30,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  continueButton: {
    backgroundColor: '#1DC071',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default GenderDOBSelectionScreen;