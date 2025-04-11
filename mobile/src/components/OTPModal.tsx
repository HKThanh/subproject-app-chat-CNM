import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';

interface OTPModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (otp: string) => void;
  onResend: () => void;
}

const OTPModal: React.FC<OTPModalProps> = ({
  visible,
  onClose,
  onConfirm,
  onResend,
}) => {
  const [otp, setOtp] = useState<string>('');
  const [timer, setTimer] = useState<number>(60);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      setTimer(60);
      startTimer();
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setOtp('');
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [visible]);

  const startTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      setTimer((prevTimer) => {
        if (prevTimer <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          return 0;
        }
        return prevTimer - 1;
      });
    }, 1000);
  };

  const handleConfirm = () => {
    if (!otp || otp.length < 6) {
      Alert.alert('Lỗi', 'Vui lòng nhập đủ mã OTP');
      return;
    }
    onConfirm(otp);
  };

  const handleResend = () => {
    onResend();
    setTimer(60);
    startTimer();
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <Text style={styles.modalTitle}>Xác thực OTP</Text>
          <Text style={styles.modalText}>
            Vui lòng nhập mã OTP được gửi đến điện thoại của bạn
          </Text>
          
          <TextInput
            style={styles.otpInput}
            placeholder="Nhập mã OTP"
            keyboardType="number-pad"
            onChangeText={setOtp}
            value={otp}
            maxLength={6}
          />
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={handleConfirm}
            >
              <Text style={styles.textStyle}>Xác nhận</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.button,
                styles.resendButton,
                timer > 0 && { opacity: 0.5 },
              ]}
              onPress={handleResend}
              disabled={timer > 0}
            >
              <Text style={styles.textStyle}>
                {timer > 0 ? `Gửi lại (${timer}s)` : 'Gửi lại OTP'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.textStyle}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
  },
  modalTitle: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1DC071',
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  otpInput: {
    height: 50,
    borderWidth: 1,
    padding: 10,
    width: '100%',
    borderRadius: 5,
    borderColor: '#1DC071',
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 18,
  },
  buttonContainer: {
    width: '100%',
  },
  button: {
    borderRadius: 10,
    padding: 10,
    elevation: 2,
    marginVertical: 5,
  },
  confirmButton: {
    backgroundColor: '#1DC071',
  },
  resendButton: {
    backgroundColor: '#5E5E5E',
  },
  cancelButton: {
    backgroundColor: '#ff4d4d',
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default OTPModal;