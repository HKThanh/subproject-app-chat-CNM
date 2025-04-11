import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Image,
    Keyboard,
    TouchableWithoutFeedback,
<<<<<<< HEAD
=======
    ActivityIndicator,
>>>>>>> main
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Define navigation prop type if you're using React Navigation
type RegisterScreenProps = {
    navigation?: any;
};

const RegisterScreen = ({ navigation }: RegisterScreenProps) => {
    const [phoneNumber, setPhoneNumber] = useState('');
<<<<<<< HEAD
    const [agreedToTerms, setAgreedToTerms] = useState(true);
=======
    const [email, setEmail] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const verifyEmailAndPhone = async () => {
        setIsLoading(true);
        setErrorMessage('');

        try {
            const response = await fetch('http://192.168.0.107:3000/auth/verify-email-and-phone', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email.trim(),
                    phone: phoneNumber.trim()
                }),
            });

            const data = await response.json();

            if (response.ok && data.message === "Email và số điện thoại hợp lệ") {
                // Valid email and phone, navigate to next screen
                navigation.navigate('FormRegisterScreen', {
                    phoneNumber: phoneNumber.trim(),
                    email: email.trim()
                });
            } else {
                // Show error message
                setErrorMessage(data.message || "Đã xảy ra lỗi khi xác thực thông tin");
            }
        } catch (error) {
            setErrorMessage("Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng.");
        } finally {
            setIsLoading(false);
        }
    };

>>>>>>> main
    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="#1FAEEB" />

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation?.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color="#FDF8F8" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Tạo tài khoản</Text>
                </View>

                {/* Main Content */}
                <View style={styles.content}>
                    <View style={styles.instructionContainer}>
                        <Text style={styles.instructionText}>
                            Nhập số điện thoại của bạn để tạo tài khoản mới
                        </Text>
                    </View>

                    {/* Phone Input */}
                    <View style={styles.inputContainer}>
                        <View style={styles.countryCodeContainer}>
                            <Text style={styles.countryCodeText}>VN</Text>
                            <Ionicons name="chevron-down" size={16} color="rgba(0, 0, 0, 0.7)" />
                        </View>
                        <View style={styles.divider} />
                        <TextInput
                            style={styles.phoneInput}
                            placeholder="Số điện thoại"
                            placeholderTextColor="#645C5C"
                            keyboardType="phone-pad"
                            value={phoneNumber}
                            onChangeText={setPhoneNumber}
                        />
                    </View>
                    <View style={styles.phoneLine} />

<<<<<<< HEAD
=======
                    {/* Email Input */}
                    <View style={styles.inputContainer}>
                        <View style={styles.divider} />
                        <TextInput
                            style={styles.phoneInput}
                            placeholder="Email"
                            placeholderTextColor="#645C5C"
                            keyboardType="email-address"
                            value={email}
                            onChangeText={setEmail}
                        />
                    </View>
                    <View style={styles.phoneLine} />

>>>>>>> main
                    {/* Terms and Conditions */}
                    <View style={styles.termsContainer}>
                        <TouchableOpacity
                            style={styles.checkboxContainer}
                            onPress={() => setAgreedToTerms(!agreedToTerms)}
                        >
                            <View style={styles.checkbox}>{agreedToTerms && (
                                <View style={styles.checkboxInner}>
                                    <Text>
                                        <Ionicons name="checkmark" size={12} color="#FDF8F8" />
                                    </Text>
                                </View>
                            )}
                            </View>
                        </TouchableOpacity>
                        <Text style={styles.termsText}>
                            Tiếp tục nghĩa là bạn đồng ý với các{' '}
                            <Text style={styles.termsLink}>điều khoản sử dụng Welo</Text>
                        </Text>
<<<<<<< HEAD
                    </View>

                    {/* Continue Button */}
                    <TouchableOpacity
                        style={[styles.continueButton, !phoneNumber.trim() && styles.disabledButton]}
                        disabled={!phoneNumber.trim()}
                        onPress={() => navigation?.navigate('FormRegisterScreen', { phoneNumber: phoneNumber })}
                    >
                        <View style={styles.buttonRow}>
                            <Text style={styles.continueText}>Tiếp tục</Text>
                            <View style={styles.arrowContainer}>
                                <Text>
                                    <Ionicons name="arrow-forward" size={16} color="#FDF8F8" />
                                </Text>
=======
                    </View>           
                             {/* Error Message */}
                    {errorMessage ? (
                        <Text style={styles.errorMessage}>{errorMessage}</Text>
                    ) : null}

                    {/* Continue Button */}
                    <TouchableOpacity
                        style={[styles.continueButton,
                        (!phoneNumber.trim() || !email.trim() || isLoading) && styles.disabledButton]}
                        disabled={!phoneNumber.trim() || !email.trim() || isLoading}
                        onPress={verifyEmailAndPhone}
                    >
                        <View style={styles.buttonRow}>
                            <Text style={styles.continueText}>
                                {isLoading ? "Đang xác thực..." : "Tiếp tục"}
                            </Text>
                            <View style={styles.arrowContainer}>
                                {isLoading ? (
                                    <ActivityIndicator size="small" color="#FDF8F8" />
                                ) : (
                                    <Text>
                                        <Ionicons name="arrow-forward" size={16} color="#FDF8F8" />
                                    </Text>
                                )}
>>>>>>> main
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    header: {
        backgroundColor: '#1FAEEB',
        paddingTop: 15,
        paddingBottom: 15,
        paddingHorizontal: 15,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 4,
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontFamily: 'System',
        fontSize: 18,
        fontWeight: '400',
        color: '#FDF8F8',
        marginLeft: 20,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    instructionContainer: {
        backgroundColor: '#D9D9D9',
        padding: 15,
        marginBottom: 20,
        marginTop: 10,
    },
    instructionText: {
        fontFamily: 'System',
        fontSize: 12,
        fontWeight: '400',
        color: '#000000',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    countryCodeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
    },
    countryCodeText: {
        fontFamily: 'System',
        fontSize: 12,
        fontWeight: '400',
        color: '#000000',
        marginRight: 5,
    },
    divider: {
        height: 20,
        width: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        marginRight: 10,
    },
    phoneInput: {
        flex: 1,
        fontFamily: 'System',
        fontSize: 12,
        fontWeight: '400',
        color: '#000000',
        paddingVertical: 5,
    },
    phoneLine: {
        height: 1,
        backgroundColor: 'rgba(6, 195, 255, 0.7)',
        marginBottom: 20,
    },
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
    },
    checkboxContainer: {
        marginRight: 10,
    },
    checkbox: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: '#1FAEEB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxInner: {
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#1FAEEB',
        justifyContent: 'center',
        alignItems: 'center',
    },
    termsText: {
        fontFamily: 'System',
        fontSize: 12,
        fontWeight: '400',
        color: '#645C5C',
        flex: 1,
    },
    termsLink: {
        color: '#1FAEEB',
        textDecorationLine: 'underline',
    },
    continueButton: {
        backgroundColor: '#1FAEEB',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 20,
        alignItems: 'center',
        marginTop: 'auto',
    },
    buttonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    continueText: {
        fontFamily: 'System',
        fontSize: 12,
        fontWeight: '400',
        color: '#FFFFFF',
        marginRight: 10,
    },
    arrowContainer: {
        backgroundColor: '#1FAEEB',
        borderRadius: 10,
        padding: 2,
<<<<<<< HEAD
    },
    disabledButton: {
        opacity: 0.7,
    },
=======
    }, disabledButton: {
        opacity: 0.7,
    },
    errorMessage: {
        color: '#FF0000',
        fontSize: 14,
        marginVertical: 10,
        textAlign: 'center',
    },
>>>>>>> main
});

export default RegisterScreen;
