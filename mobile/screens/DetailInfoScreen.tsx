import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Image,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ScrollView,
    TextInput,
    Modal,
    Animated,
    Dimensions,
    Alert,
    Platform,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

const avatarDefaulturi = 'https://static.vecteezy.com/system/resources/previews/009/292/244/non_2x/default-avatar-icon-of-social-media-user-vector.jpg';
const backgroundImageDefaulturi = 'https://cellphones.com.vn/sforum/wp-content/uploads/2023/07/hinh-nen-zalo-23-1.jpg';

// API endpoint
const API_URL = 'http://192.168.0.104:3000/user';

type DetailInfoScreenProps = {
    navigation?: any;
    route?: {
        params?: {
            user?: any;
            accessToken?: string;
        };
    };
};

type UserData = {
    id: string;
    email: string;
    fullname: string;
    urlavatar: string | null;
    birthday: string;
    bio: string;
    phone: string;
    coverPhoto: string | null;
    ismale: boolean;
    createdAt: string;
    updatedAt: string;
};

const DetailInfoScreen = ({ navigation, route }: DetailInfoScreenProps) => {
    // Sử dụng accessToken từ route params hoặc từ biến global nếu có
    const accessToken = route?.params?.accessToken || global.accessToken || '';
    const [isLoading, setIsLoading] = useState(true);
    const [apiUserData, setApiUserData] = useState<UserData | null>(null);
    // Additional states for cover photo
    const [coverPhoto, setCoverPhoto] = useState(backgroundImageDefaulturi);
    const [isUploading, setIsUploading] = useState(false);
    const [showFullScreenImage, setShowFullScreenImage] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);

    // Upload Cover Photo lên server
    const uploadCoverPhoto = async (imageUri: string) => {
        if (!accessToken || !apiUserData?.id) {
            Alert.alert('Lỗi', 'Không thể xác thực người dùng');
            return;
        }

        setUploadingCover(true);

        try {
            // Tạo form data
            const formData = new FormData();

            // Lấy extension của file
            const filename = imageUri.split('/').pop() || 'photo.jpg';
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : 'image/jpeg';

            console.log('Uploading cover photo:', {
                uri: imageUri,
                name: filename,
                type: type
            });

            // @ts-ignore
            formData.append('coverPhoto', {
                uri: imageUri,
                name: filename,
                type: type,
            });

            formData.append('id', apiUserData.id);

            // Gửi request
            const response = await fetch('http://192.168.0.104:3000/user/cover/upload', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'multipart/form-data',
                },
                body: formData
            });

            const data = await response.json();
            console.log('Cover photo upload response:', data);

            if (data.user && data.user.coverPhoto) {
                // Cập nhật cover photo trong state
                setCoverPhoto(data.user.coverPhoto);

                // Cập nhật API user data
                if (apiUserData) {
                    setApiUserData({
                        ...apiUserData,
                        coverPhoto: data.user.coverPhoto
                    });
                }

                Alert.alert('Thành công', 'Cập nhật ảnh bìa thành công');
            } else {
                Alert.alert('Lỗi', data.message || 'Không thể cập nhật ảnh bìa');
            }
        } catch (error) {
            console.error('Upload cover photo error:', error);
            Alert.alert('Lỗi', 'Có lỗi xảy ra khi tải ảnh bìa lên');
        } finally {
            setUploadingCover(false);
            setShowBackgroundMenu(false);
        }
    };

    // Upload avatar lên server
    const uploadAvatar = async (imageUri: string) => {
        if (!accessToken || !apiUserData?.id) {
            Alert.alert('Lỗi', 'Không thể xác thực người dùng');
            return;
        }

        setUploadingAvatar(true);

        try {
            // Tạo form data
            const formData = new FormData();

            // Lấy extension của file
            const filename = imageUri.split('/').pop() || 'photo.jpg';
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : 'image/jpeg';

            console.log('Uploading avatar:', {
                uri: imageUri,
                name: filename,
                type: type
            });

            // @ts-ignore
            formData.append('avatar', {
                uri: imageUri,
                name: filename,
                type: type,
            });

            formData.append('id', apiUserData.id);

            // Gửi request
            const response = await fetch('http://192.168.0.104:3000/user/avatar/upload', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'multipart/form-data',
                },
                body: formData
            });

            const data = await response.json();
            console.log('Avatar upload response:', data);

            if (data.user && data.user.urlavatar) {
                // Cập nhật avatar trong state
                setUser({
                    ...user,
                    avatar: { uri: data.user.urlavatar }
                });

                // Cập nhật API user data
                if (apiUserData) {
                    setApiUserData({
                        ...apiUserData,
                        urlavatar: data.user.urlavatar
                    });
                }

                Alert.alert('Thành công', 'Cập nhật avatar thành công');
            } else {
                Alert.alert('Lỗi', data.message || 'Không thể cập nhật avatar');
            }
        } catch (error) {
            console.error('Upload error:', error);
            Alert.alert('Lỗi', 'Có lỗi xảy ra khi tải ảnh lên');
        } finally {
            setUploadingAvatar(false);
            setShowAvatarMenu(false);
        }
    };

    // Modified user state to handle conversion between API data and UI format
    const [user, setUser] = useState({
        name: '',
        avatar: { uri: avatarDefaulturi },
        phone: '',
        email: '',
        birthday: '',
        gender: '',
    });

    // Fetch user data from API
    const fetchUserData = async () => {
        try {
            setIsLoading(true);
            const response = await fetch(API_URL, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user data');
            }

            const data: UserData = await response.json();
            setApiUserData(data);

            // Set cover photo with fallback to default if null
            setCoverPhoto(data.coverPhoto || backgroundImageDefaulturi);

            // Convert API data to UI format
            setUser({
                name: data.fullname,
                avatar: { uri: data.urlavatar || avatarDefaulturi },
                phone: data.phone,
                email: data.email,
                birthday: formatDateFromAPI(data.birthday),
                gender: data.ismale ? 'Nam' : 'Nữ',
            });
        } catch (error) {
            console.error('Error fetching user data:', error);
            Alert.alert('Error', 'Failed to load user data. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Format date from API (YYYY-MM-DD) to display format (DD/MM/YYYY)
    const formatDateFromAPI = (dateString: string) => {
        if (!dateString) return '';

        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();

        return `${day}/${month}/${year}`;
    };

    useEffect(() => {
        if (accessToken) {
            fetchUserData();
        }
    }, [accessToken]);

    const [editUser, setEditUser] = useState({ ...user });
    const [showEditPopup, setShowEditPopup] = useState(false);
    const [showBackgroundMenu, setShowBackgroundMenu] = useState(false);
    const [showAvatarMenu, setShowAvatarMenu] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showDatePickerModal, setShowDatePickerModal] = useState(false);
    const [date, setDate] = useState(new Date());
    const [tempDate, setTempDate] = useState(new Date());
    const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
    const avatarSlideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
    const datePickerAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
    const editModalAnim = useRef(new Animated.Value(0)).current;

    // Function to check if there are unsaved changes in the edit form
    const hasUnsavedChanges = () => {
        return editUser.name !== user.name ||
            editUser.birthday !== user.birthday ||
            editUser.gender !== user.gender;
    };

    // Parse the date string in dd/mm/yyyy format to a Date object
    const parseDate = (dateString: string) => {
        if (!dateString) return new Date();

        const parts = dateString.split('/');
        if (parts.length === 3) {
            // Parts are in day/month/year format
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in Date
            const year = parseInt(parts[2], 10);
            return new Date(year, month, day);
        }
        return new Date();
    };

    // Format the Date object to a dd/mm/yyyy string
    const formatDate = (date: Date) => {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed in Date
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };    // Handle date change from the date picker
    const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        // On Android, the picker is dismissed automatically after selection
        if (Platform.OS === 'android') {
            setShowDatePickerModal(false);
            if (selectedDate) {
                setTempDate(selectedDate);
                setDate(selectedDate);
                setEditUser({ ...editUser, birthday: formatDate(selectedDate) });
            }
        } else {
            // On iOS, the picker stays open
            if (selectedDate) {
                setTempDate(selectedDate);
            }
        }
    };// Define minimum and maximum dates for the date picker
    const minDate = new Date(1900, 0, 1);  // January 1, 1900
    const maxDate = new Date(2050, 11, 31);  // December 31, 2050

    useEffect(() => {
        // Initialize the date picker with the current birthday or default to a reasonable date
        if (user.birthday) {
            const parsedDate = parseDate(user.birthday);
            // Ensure the parsed date is within allowed range
            if (parsedDate >= minDate && parsedDate <= maxDate) {
                setDate(parsedDate);
            } else {
                // If outside range, set to a default valid date
                setDate(new Date(1990, 0, 1));  // Default to January 1, 1990
            }
        } else {
            setDate(new Date(1990, 0, 1));  // Default to January 1, 1990
        }
    }, [user.birthday]);

    useEffect(() => {
        if (showBackgroundMenu) {
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                bounciness: 0
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: Dimensions.get('window').height,
                duration: 250,
                useNativeDriver: true
            }).start();
        }
    }, [showBackgroundMenu]); useEffect(() => {
        if (showAvatarMenu) {
            Animated.spring(avatarSlideAnim, {
                toValue: 0,
                useNativeDriver: true,
                bounciness: 0
            }).start();
        } else {
            Animated.timing(avatarSlideAnim, {
                toValue: Dimensions.get('window').height,
                duration: 250,
                useNativeDriver: true
            }).start();
        }
    }, [showAvatarMenu]);

    useEffect(() => {
        if (showDatePickerModal) {
            // Khởi tạo tempDate bằng ngày của user khi mở datepicker
            setTempDate(parseDate(editUser.birthday));

            Animated.spring(datePickerAnim, {
                toValue: 0,
                useNativeDriver: true,
                bounciness: 0
            }).start();
        } else {
            Animated.timing(datePickerAnim, {
                toValue: Dimensions.get('window').height,
                duration: 250,
                useNativeDriver: true
            }).start();
        }
    }, [showDatePickerModal]);

    useEffect(() => {
        if (showEditPopup) {
            setEditUser({ ...user });
            Animated.timing(editModalAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(editModalAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [showEditPopup, user]);

    const handleTabPress = (tabName: 'messages' | 'contacts' | 'explore' | 'diary' | 'profile') => {
        if (tabName === 'messages') {
            navigation?.navigate('HomeScreen');
        } else if (tabName === 'profile') {
            navigation?.navigate('InfoScreen');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation?.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            <View style={styles.contentContainer} >
                {/* showsVerticalScrollIndicator={false}> */}
                {/* Profile Header */}
                <View style={styles.profileSection}>             
                           <TouchableOpacity
                    style={styles.backgroundContainer}
                    onPress={() => setShowBackgroundMenu(true)}
                >
                    <Image
                        source={{ uri: coverPhoto }}
                        style={styles.backgroundImage}
                    />
                    {uploadingCover && (
                        <View style={styles.loadingOverlay}>
                            <ActivityIndicator size="large" color="#FFFFFF" />
                            <Text style={styles.loadingText}>Đang tải lên...</Text>
                        </View>
                    )}
                </TouchableOpacity>
                <View style={styles.avatarAndNameContainer}>
                        <TouchableOpacity
                            onPress={() => setShowAvatarMenu(true)}
                        >
                            <Image
                                source={user.avatar}
                                style={styles.profileImage}
                            />
                            {uploadingAvatar && (
                                <View style={styles.avatarLoadingOverlay}>
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                </View>
                            )}
                        </TouchableOpacity>
                        <View style={styles.profileNameContainer}>
                            <Text style={styles.profileName}>{user.name}</Text>
                        </View>
                    </View>
                </View>

                {/* Personal Information Section */}
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
                    </View>
                    {/* Phone Number */}
                    <View style={styles.infoItem}>
                        <Ionicons name="call-outline" size={22} color="#0C71E8" style={styles.infoIcon} />
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Điện thoại</Text>
                            <Text style={styles.infoValue}>{user.phone}</Text>
                            <Text style={styles.infoNote}>
                                Số điện thoại chỉ hiển thị với người có lưu số bạn trong danh bạ máy
                            </Text>
                        </View>
                    </View>

                    {/* Email */}
                    <View style={styles.infoItem}>
                        <Ionicons name="mail-outline" size={22} color="#0C71E8" style={styles.infoIcon} />
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Email</Text>
                            <Text style={styles.infoValue}>{user.email}</Text>
                        </View>
                    </View>

                    {/* Birth Date */}
                    <View style={styles.infoItem}>
                        <Ionicons name="calendar-outline" size={22} color="#0C71E8" style={styles.infoIcon} />
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Ngày sinh</Text>
                            <Text style={styles.infoValue}>{user.birthday}</Text>
                        </View>
                    </View>

                    {/* Gender */}
                    <View style={styles.infoItem}>
                        <Ionicons name="person-outline" size={22} color="#0C71E8" style={styles.infoIcon} />
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Giới tính</Text>
                            <Text style={styles.infoValue}>{user.gender}</Text>
                        </View>
                    </View>
                </View>
                {/* Edit Button */}
                <View style={styles.editButtonWrapper}>
                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => setShowEditPopup(true)}
                    >
                        <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                        <Text style={styles.editButtonText}>Chỉnh sửa</Text>
                    </TouchableOpacity>
                </View>
            </View>
            {/* Footer */}
            {/* Background Menu Bottom Sheet */}
            <Modal
                visible={showBackgroundMenu}
                transparent={true}
                animationType="none"
                onRequestClose={() => setShowBackgroundMenu(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowBackgroundMenu(false)}
                >
                    <Animated.View
                        style={[
                            styles.bottomSheetContainer,
                            { transform: [{ translateY: slideAnim }] }
                        ]}
                    >
                        <View style={styles.bottomSheet}>
                            <View style={styles.bottomSheetHeader}>
                                <View style={styles.bottomSheetIndicator} />
                                <Text style={styles.bottomSheetTitle}>Ảnh bìa</Text>
                                <TouchableOpacity onPress={() => setShowBackgroundMenu(false)}>
                                    <Ionicons name="close" size={24} color="#000000" />
                                </TouchableOpacity>
                            </View>                  
                                      <View style={styles.menuOptions}>                           
                                     <TouchableOpacity style={styles.menuOption} onPress={() => {
                                setShowBackgroundMenu(false);
                                // Kiểm tra nếu coverPhoto không phải ảnh mặc định thì hiển thị ảnh toàn màn hình
                                if (coverPhoto !== backgroundImageDefaulturi) {
                                    setTimeout(() => {
                                        setShowFullScreenImage(true);
                                    }, 300); // Thêm độ trễ nhỏ để đảm bảo menu đã đóng hoàn toàn
                                } else {
                                    Alert.alert('Thông báo', 'Ảnh bìa mặc định. Vui lòng thêm ảnh bìa!');
                                }
                            }}>
                                <Ionicons name="eye-outline" size={24} color="#000000" />
                                <Text style={styles.menuOptionText}>Xem ảnh bìa</Text>
                            </TouchableOpacity>
                                <TouchableOpacity style={styles.menuOption} onPress={() => {
                                    setShowBackgroundMenu(false);
                                    // Sử dụng Alert để yêu cầu người dùng xác nhận
                                    Alert.alert(
                                        'Chụp ảnh mới',
                                        'Bạn có muốn chụp ảnh mới cho ảnh bìa?',
                                        [
                                            {
                                                text: 'Hủy',
                                                style: 'cancel',
                                            },
                                            {
                                                text: 'Chụp ảnh',
                                                onPress: async () => {
                                                    try {
                                                        console.log('Requesting camera permission with timeout...');

                                                        // Tạo promise với timeout
                                                        const permissionPromise = Promise.race([
                                                            ImagePicker.requestCameraPermissionsAsync(),
                                                            new Promise((_, reject) =>
                                                                setTimeout(() => reject(new Error('Permission request timeout')), 5000)
                                                            )
                                                        ]);

                                                        // Chờ kết quả từ promise
                                                        const { status } = await permissionPromise as { status: string };
                                                        console.log('Camera permission status:', status);

                                                        if (status !== 'granted') {
                                                            console.log('Camera permission denied');
                                                            Alert.alert(
                                                                'Quyền truy cập',
                                                                'Cần cấp quyền truy cập camera để chụp ảnh. Vui lòng cấp quyền trong cài đặt thiết bị.',
                                                                [{ text: 'OK' }]
                                                            );
                                                            return;
                                                        }

                                                        console.log('Opening camera with timeout...');
                                                        // Tạo promise với timeout cho camera
                                                        const cameraPromise = Promise.race([
                                                            ImagePicker.launchCameraAsync({
                                                                quality: 0.8,
                                                                allowsEditing: true,
                                                                aspect: [16, 9], // Tỷ lệ khung hình phù hợp cho ảnh bìa
                                                            }),
                                                            new Promise((_, reject) =>
                                                                setTimeout(() => reject(new Error('Camera launch timeout')), 50000)
                                                            )
                                                        ]);

                                                        // Chờ kết quả từ promise camera
                                                        const result = await cameraPromise as any;

                                                        console.log('Camera result for cover:', result);
                                                        if (!result.canceled && result.assets && result.assets.length > 0) {
                                                            console.log('Selected cover image:', result.assets[0].uri);
                                                            uploadCoverPhoto(result.assets[0].uri);
                                                        }
                                                    } catch (error) {
                                                        console.error('Error taking cover photo:', error);
                                                        Alert.alert(
                                                            'Lỗi',
                                                            'Không thể chụp ảnh. ' + (error instanceof Error ? error.message : 'Vui lòng thử lại sau.')
                                                        );
                                                    }
                                                }
                                            }
                                        ]
                                    );
                                }}>
                                    <Ionicons name="camera-outline" size={24} color="#000000" />
                                    <Text style={styles.menuOptionText}>Chụp ảnh mới</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.menuOption} onPress={() => {
                                    setShowBackgroundMenu(false);
                                    // Sử dụng Alert để yêu cầu người dùng xác nhận
                                    Alert.alert(
                                        'Chọn ảnh từ thư viện',
                                        'Bạn có muốn chọn ảnh từ thư viện cho ảnh bìa?',
                                        [
                                            {
                                                text: 'Hủy',
                                                style: 'cancel',
                                            },
                                            {
                                                text: 'Chọn ảnh',
                                                onPress: async () => {
                                                    try {
                                                        console.log('Requesting media library permission with timeout...');

                                                        // Tạo promise với timeout
                                                        const permissionPromise = Promise.race([
                                                            ImagePicker.requestMediaLibraryPermissionsAsync(),
                                                            new Promise((_, reject) =>
                                                                setTimeout(() => reject(new Error('Permission request timeout')), 5000)
                                                            )
                                                        ]);

                                                        // Chờ kết quả từ promise
                                                        const { status } = await permissionPromise as { status: string };
                                                        console.log('Media library permission status:', status);

                                                        if (status !== 'granted') {
                                                            console.log('Media library permission denied');
                                                            Alert.alert(
                                                                'Quyền truy cập',
                                                                'Cần cấp quyền truy cập thư viện ảnh để chọn ảnh. Vui lòng cấp quyền trong cài đặt thiết bị.',
                                                                [{ text: 'OK' }]
                                                            );
                                                            return;
                                                        }

                                                        console.log('Opening image library with timeout...');
                                                        // Tạo promise với timeout cho thư viện ảnh
                                                        const imageLibraryPromise = Promise.race([
                                                            ImagePicker.launchImageLibraryAsync({
                                                                quality: 0.8,
                                                                allowsEditing: true,
                                                                aspect: [16, 9], // Tỷ lệ khung hình phù hợp cho ảnh bìa
                                                            }),
                                                            new Promise((_, reject) =>
                                                                setTimeout(() => reject(new Error('Image library launch timeout')), 50000)
                                                            )
                                                        ]);

                                                        // Chờ kết quả từ promise thư viện ảnh
                                                        const result = await imageLibraryPromise as any;

                                                        console.log('Image library result for cover:', result);
                                                        if (!result.canceled && result.assets && result.assets.length > 0) {
                                                            console.log('Selected cover image:', result.assets[0].uri);
                                                            uploadCoverPhoto(result.assets[0].uri);
                                                        }
                                                    } catch (error) {
                                                        console.error('Error selecting cover photo:', error);
                                                        Alert.alert(
                                                            'Lỗi',
                                                            'Không thể chọn ảnh. ' + (error instanceof Error ? error.message : 'Vui lòng thử lại sau.')
                                                        );
                                                    }
                                                }
                                            }
                                        ]
                                    );
                                }}>
                                    <Ionicons name="images-outline" size={24} color="#000000" />
                                    <Text style={styles.menuOptionText}>Chọn ảnh trên máy</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Animated.View>
                </TouchableOpacity>
            </Modal>
            {/* Avatar Menu Bottom Sheet */}
            <Modal
                visible={showAvatarMenu}
                transparent={true}
                animationType="none"
                onRequestClose={() => setShowAvatarMenu(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowAvatarMenu(false)}
                >
                    <Animated.View
                        style={[
                            styles.bottomSheetContainer,
                            { transform: [{ translateY: avatarSlideAnim }] }
                        ]}
                    >
                        <View style={styles.bottomSheet}>
                            <View style={styles.bottomSheetHeader}>
                                <View style={styles.bottomSheetIndicator} />
                                <Text style={styles.bottomSheetTitle}>Ảnh đại diện</Text>
                                <TouchableOpacity onPress={() => setShowAvatarMenu(false)}>
                                    <Ionicons name="close" size={24} color="#000000" />
                                </TouchableOpacity>
                            </View>                            <View style={styles.menuOptions}>
                                <TouchableOpacity style={styles.menuOption} onPress={() => {
                                    setShowAvatarMenu(false);
                                    // Sử dụng Alert để yêu cầu người dùng xác nhận
                                    Alert.alert(
                                        'Chụp ảnh mới',
                                        'Bạn có muốn chụp ảnh mới cho ảnh đại diện?',
                                        [
                                            {
                                                text: 'Hủy',
                                                style: 'cancel',
                                            },
                                            {
                                                text: 'Chụp ảnh',
                                                onPress: async () => {
                                                    try {
                                                        console.log('Requesting camera permission with timeout...');

                                                        // Tạo promise với timeout
                                                        const permissionPromise = Promise.race([
                                                            ImagePicker.requestCameraPermissionsAsync(),
                                                            new Promise((_, reject) =>
                                                                setTimeout(() => reject(new Error('Permission request timeout')), 5000)
                                                            )
                                                        ]);

                                                        // Chờ kết quả từ promise
                                                        const { status } = await permissionPromise as { status: string };
                                                        console.log('Camera permission status:', status);

                                                        if (status !== 'granted') {
                                                            console.log('Camera permission denied');
                                                            Alert.alert(
                                                                'Quyền truy cập',
                                                                'Cần cấp quyền truy cập camera để chụp ảnh. Vui lòng cấp quyền trong cài đặt thiết bị.',
                                                                [{ text: 'OK' }]
                                                            );
                                                            return;
                                                        }

                                                        console.log('Opening camera with timeout...');
                                                        // Tạo promise với timeout cho camera
                                                        const cameraPromise = Promise.race([
                                                            ImagePicker.launchCameraAsync({
                                                                quality: 0.8,
                                                                allowsEditing: true,
                                                                aspect: [1, 1], // Tỷ lệ khung hình vuông cho avatar
                                                            }),
                                                            new Promise((_, reject) =>
                                                                setTimeout(() => reject(new Error('Camera launch timeout')), 50000)
                                                            )
                                                        ]);

                                                        // Chờ kết quả từ promise camera
                                                        const result = await cameraPromise as any;

                                                        console.log('Camera result:', result);
                                                        if (!result.canceled && result.assets && result.assets.length > 0) {
                                                            console.log('Selected image:', result.assets[0].uri);
                                                            uploadAvatar(result.assets[0].uri);
                                                        }
                                                    } catch (error) {
                                                        console.error('Error taking photo:', error);
                                                        Alert.alert(
                                                            'Lỗi',
                                                            'Không thể chụp ảnh. ' + (error instanceof Error ? error.message : 'Vui lòng thử lại sau.')
                                                        );
                                                    }
                                                }
                                            }
                                        ]
                                    );
                                }}>
                                    <Ionicons name="camera-outline" size={24} color="#000000" />
                                    <Text style={styles.menuOptionText}>Chụp ảnh mới</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.menuOption} onPress={() => {
                                    setShowAvatarMenu(false);
                                    // Sử dụng Alert để yêu cầu người dùng xác nhận
                                    Alert.alert(
                                        'Chọn ảnh từ thư viện',
                                        'Bạn có muốn chọn ảnh từ thư viện cho ảnh đại diện?',
                                        [
                                            {
                                                text: 'Hủy',
                                                style: 'cancel',
                                            },
                                            {
                                                text: 'Chọn ảnh',
                                                onPress: async () => {
                                                    try {
                                                        console.log('Requesting media library permission with timeout...');

                                                        // Tạo promise với timeout
                                                        const permissionPromise = Promise.race([
                                                            ImagePicker.requestMediaLibraryPermissionsAsync(),
                                                            new Promise((_, reject) =>
                                                                setTimeout(() => reject(new Error('Permission request timeout')), 5000)
                                                            )
                                                        ]);

                                                        // Chờ kết quả từ promise
                                                        const { status } = await permissionPromise as { status: string };
                                                        console.log('Media library permission status:', status);

                                                        if (status !== 'granted') {
                                                            console.log('Media library permission denied');
                                                            Alert.alert(
                                                                'Quyền truy cập',
                                                                'Cần cấp quyền truy cập thư viện ảnh để chọn ảnh. Vui lòng cấp quyền trong cài đặt thiết bị.',
                                                                [{ text: 'OK' }]
                                                            );
                                                            return;
                                                        }

                                                        console.log('Opening image library with timeout...');
                                                        // Tạo promise với timeout cho thư viện ảnh
                                                        const imageLibraryPromise = Promise.race([
                                                            ImagePicker.launchImageLibraryAsync({
                                                                quality: 0.8,
                                                                allowsEditing: true,
                                                                aspect: [1, 1], // Tỷ lệ khung hình vuông cho avatar
                                                            }),
                                                            new Promise((_, reject) =>
                                                                setTimeout(() => reject(new Error('Image library launch timeout')), 50000)
                                                            )
                                                        ]);

                                                        // Chờ kết quả từ promise thư viện ảnh
                                                        const result = await imageLibraryPromise as any;

                                                        console.log('Image library result:', result);
                                                        if (!result.canceled && result.assets && result.assets.length > 0) {
                                                            console.log('Selected image:', result.assets[0].uri);
                                                            uploadAvatar(result.assets[0].uri);
                                                        }
                                                    } catch (error) {
                                                        console.error('Error selecting photo:', error);
                                                        Alert.alert(
                                                            'Lỗi',
                                                            'Không thể chọn ảnh. ' + (error instanceof Error ? error.message : 'Vui lòng thử lại sau.')
                                                        );
                                                    }
                                                }
                                            }
                                        ]
                                    );
                                }}>
                                    <Ionicons name="images-outline" size={24} color="#000000" />
                                    <Text style={styles.menuOptionText}>Chọn ảnh trên máy</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Animated.View>
                </TouchableOpacity>
            </Modal>

            {/* Edit Profile Modal */}
            <Modal
                visible={showEditPopup}
                transparent={true}
                animationType="none"
                onRequestClose={() => setShowEditPopup(false)}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setShowEditPopup(false)}
                >
                    <TouchableOpacity
                        activeOpacity={1}
                        style={[
                            styles.editModalContainer,
                        ]}
                    >
                        <Animated.View
                            style={[
                                styles.editModal,
                                { opacity: editModalAnim, transform: [{ scale: editModalAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }
                            ]}
                        >
                            <View style={styles.editModalHeader}>
                                <Text style={styles.editModalTitle}>Chỉnh sửa thông tin</Text>
                                <TouchableOpacity onPress={() => setShowEditPopup(false)}>
                                    <Ionicons name="close" size={24} color="#000000" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.editFormContainer}>
                                {/* Edit Avatar */}
                                <View style={styles.editAvatarContainer}>
                                    <TouchableOpacity
                                        style={styles.editAvatar}
                                        onPress={() => {
                                            // Check if there are unsaved changes
                                            if (hasUnsavedChanges()) {
                                                // Show confirmation dialog
                                                Alert.alert(
                                                    "Xác nhận",
                                                    "Bạn có muốn thoát chỉnh sửa để cập nhật ảnh đại diện không?",
                                                    [
                                                        {
                                                            text: "Không",
                                                            style: "cancel"
                                                        },
                                                        {
                                                            text: "Có",
                                                            onPress: () => {
                                                                // Close edit popup and show avatar menu
                                                                setShowEditPopup(false);
                                                                setTimeout(() => {
                                                                    setShowAvatarMenu(true);
                                                                }, 300);
                                                            }
                                                        }
                                                    ]
                                                );
                                            } else {
                                                // No unsaved changes, directly show avatar menu
                                                setShowEditPopup(false);
                                                setTimeout(() => {
                                                    setShowAvatarMenu(true);
                                                }, 300);
                                            }
                                        }}
                                    >
                                        <Image
                                            source={editUser.avatar}
                                            style={styles.editAvatarImage}
                                        />
                                        <View style={styles.editAvatarOverlay}>
                                            <Ionicons name="camera" size={24} color="#FFFFFF" />
                                        </View>
                                    </TouchableOpacity>
                                </View>

                                {/* Name Field */}
                                <View style={styles.editField}>
                                    <Text style={styles.editFieldLabel}>Tên hiển thị</Text>
                                    <TextInput
                                        style={styles.editInput}
                                        value={editUser.name}
                                        onChangeText={(text) => setEditUser({ ...editUser, name: text })}
                                    />
                                </View>

                                {/* Birthday Field */}
                                <View style={styles.editField}>
                                    <Text style={styles.editFieldLabel}>Ngày sinh</Text>
                                    <TouchableOpacity
                                        style={styles.datePickerButton}
                                        onPress={() => setShowDatePickerModal(true)}
                                    >
                                        <Text style={styles.dateText}>{editUser.birthday}</Text>
                                        <Ionicons name="calendar-outline" size={18} color="#0C71E8" />
                                    </TouchableOpacity>                              
                                          {/* Render DatePicker differently based on platform */}
                                    {Platform.OS === 'android' ? (
                                        /* For Android, show the date picker directly when button is pressed */
                                        showDatePickerModal && (
                                            <DateTimePicker
                                                value={tempDate}
                                                mode="date"
                                                display="default"
                                                onChange={onDateChange}
                                                minimumDate={minDate}
                                                maximumDate={maxDate}
                                            />
                                        )
                                    ) : (
                                        /* For iOS, show the custom modal with the date picker inside */
                                        <Modal
                                            visible={showDatePickerModal}
                                            transparent={true}
                                            animationType="none"
                                            onRequestClose={() => setShowDatePickerModal(false)}
                                        >
                                            <TouchableOpacity
                                                style={styles.modalOverlay}
                                                activeOpacity={1}
                                                onPress={() => setShowDatePickerModal(false)}
                                            >
                                                <Animated.View
                                                    style={[
                                                        styles.bottomSheetContainer,
                                                        { transform: [{ translateY: datePickerAnim }] }
                                                    ]}
                                                >
                                                    <View style={styles.bottomSheet}>
                                                        <View style={styles.bottomSheetHeader}>
                                                            <TouchableOpacity
                                                                style={styles.headerButton}
                                                                onPress={() => setShowDatePickerModal(false)}
                                                            >
                                                                <Text style={styles.headerButtonTextCancel}>Hủy</Text>
                                                            </TouchableOpacity>
                                                            <View style={styles.bottomSheetIndicator} />
                                                            <TouchableOpacity
                                                                style={styles.headerButton}
                                                                onPress={() => {
                                                                    setDate(tempDate);
                                                                    setEditUser({ ...editUser, birthday: formatDate(tempDate) });
                                                                    setShowDatePickerModal(false);
                                                                }}
                                                            >
                                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                                    <Ionicons name="checkmark" size={20} color="#1FAEEB" />
                                                                    <Text style={styles.headerButtonTextDone}>Xong</Text>
                                                                </View>
                                                            </TouchableOpacity>
                                                        </View>
                                                        <View style={styles.datePickerCenterContainer}>
                                                            <DateTimePicker
                                                                value={tempDate}
                                                                mode="date"
                                                                display="spinner"
                                                                onChange={onDateChange}
                                                                minimumDate={minDate}
                                                                maximumDate={maxDate}
                                                                textColor="#000000"
                                                                themeVariant="light" style={styles.centeredDatePicker}
                                                            />
                                                        </View>
                                                    </View>
                                                </Animated.View>
                                            </TouchableOpacity>
                                        </Modal>
                                    )}
                                </View>

                                {/* Gender Field */}
                                <View style={styles.editField}>
                                    <Text style={styles.editFieldLabel}>Giới tính</Text>
                                    <View style={styles.genderOptions}>
                                        <TouchableOpacity
                                            style={[

                                                styles.genderOption,
                                                editUser.gender === 'Nam' && styles.genderOptionSelected
                                            ]}
                                            onPress={() => setEditUser({ ...editUser, gender: 'Nam' })}
                                        >
                                            <Text style={[

                                                styles.genderOptionText,
                                                editUser.gender === 'Nam' && styles.genderOptionTextSelected
                                            ]}>Nam</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[

                                                styles.genderOption,
                                                editUser.gender === 'Nữ' && styles.genderOptionSelected
                                            ]}
                                            onPress={() => setEditUser({ ...editUser, gender: 'Nữ' })}
                                        >
                                            <Text style={[

                                                styles.genderOptionText,
                                                editUser.gender === 'Nữ' && styles.genderOptionTextSelected
                                            ]}>Nữ</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[

                                                styles.genderOption,
                                                editUser.gender !== 'Nam' && editUser.gender !== 'Nữ' && styles.genderOptionSelected
                                            ]}
                                            onPress={() => setEditUser({ ...editUser, gender: 'Khác' })}
                                        >
                                            <Text style={[

                                                styles.genderOptionText,
                                                editUser.gender !== 'Nam' && editUser.gender !== 'Nữ' && styles.genderOptionTextSelected
                                            ]}>Khác</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </ScrollView>

                            <View style={styles.editButtonsContainer}>
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={() => setShowEditPopup(false)}
                                >
                                    <Text style={styles.cancelButtonText}>Hủy</Text>
                                </TouchableOpacity>                     
                                           <TouchableOpacity
                                    style={styles.saveButton}
                                    onPress={async () => {
                                        try {
                                            // Check if there are any changes
                                            if (
                                                editUser.name !== user.name ||
                                                editUser.birthday !== user.birthday ||
                                                editUser.gender !== user.gender
                                            ) {
                                                // Convert date from dd/mm/yyyy to yyyy-mm-dd for API
                                                const birthdayParts = editUser.birthday.split('/');
                                                const apiFormattedDate = `${birthdayParts[2]}-${birthdayParts[1]}-${birthdayParts[0]}`;

                                                // Create request body
                                                const requestBody = {
                                                    fullname: editUser.name,
                                                    ismale: editUser.gender === 'Nam',
                                                    birthday: apiFormattedDate
                                                };

                                                // Make API call
                                                const response = await fetch('http://192.168.0.104:3000/user/profile', {
                                                    method: 'PUT',
                                                    headers: {
                                                        'Authorization': `Bearer ${accessToken}`,
                                                        'Content-Type': 'application/json'
                                                    },
                                                    body: JSON.stringify(requestBody)
                                                });

                                                const result = await response.json();

                                                if (response.ok) {
                                                    console.log('Profile update response:', result);

                                                    // Update the user data with response data
                                                    setUser({
                                                        ...user,
                                                        name: result.user.fullname,
                                                        birthday: formatDateFromAPI(result.user.birthday),
                                                        gender: result.user.ismale ? 'Nam' : 'Nữ'
                                                    });

                                                    // Update API user data to keep it in sync
                                                    if (apiUserData) {
                                                        setApiUserData({
                                                            ...apiUserData,
                                                            fullname: result.user.fullname,
                                                            birthday: result.user.birthday,
                                                            ismale: result.user.ismale
                                                        });
                                                    }

                                                    Alert.alert('Thành công', 'Cập nhật thông tin thành công');
                                                } else {
                                                    Alert.alert('Lỗi', result.message || 'Không thể cập nhật thông tin');
                                                }
                                            } else {
                                                // No changes, just close the popup
                                                console.log('No changes detected, skipping API call');
                                            }

                                            // Close the edit popup
                                            setShowEditPopup(false);
                                        } catch (error) {
                                            console.error('Error updating profile:', error);
                                            Alert.alert('Lỗi', 'Có lỗi xảy ra khi cập nhật thông tin');
                                        }
                                    }}
                                >
                                    <Text style={styles.saveButtonText}>Lưu</Text>
                                </TouchableOpacity>
                            </View>
                        </Animated.View>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>     
                   {/* Full Screen Cover Image Modal */}
            <Modal
                visible={showFullScreenImage}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowFullScreenImage(false)}
            >
                <TouchableOpacity
                    style={styles.fullScreenImageContainer}
                    activeOpacity={1}
                    onPress={() => setShowFullScreenImage(false)}
                >
                    <TouchableOpacity
                        style={styles.fullScreenCloseButton}
                        onPress={() => setShowFullScreenImage(false)}
                    >
                        <Ionicons name="close-circle" size={36} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Image
                        source={{ uri: coverPhoto }}
                        style={styles.fullScreenImage}
                        resizeMode="contain"
                    />
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#D9D9D9',
    }, backgroundContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '120%',
        height: '150%',
        zIndex: 0,
        overflow: 'hidden',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
    },
    bottomSheetContainer: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        minHeight: 300,
        width: '100%',
    },
    bottomSheet: {
        padding: 16,
    }, bottomSheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        paddingHorizontal: 10,
    },
    headerButton: {
        padding: 8,
    },
    headerButtonTextCancel: {
        fontSize: 16,
        color: '#000000',
        fontWeight: '500',
    },
    headerButtonTextDone: {
        fontSize: 16,
        color: '#1FAEEB',
        fontWeight: '500',
        marginLeft: 4,
    },
    bottomSheetIndicator: {
        width: 40,
        height: 5,
        backgroundColor: '#E0E0E0',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 8,
    },
    bottomSheetTitle: {
        fontSize: 18,
        fontWeight: '500',
        color: '#000000',
        flex: 1,
        textAlign: 'center',
    },
    menuOptions: {
        marginTop: 8,
    },
    menuOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: '#E0E0E0',
    }, menuOptionText: {
        fontSize: 16,
        color: '#000000',
        marginLeft: 16,
    },
    editModalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    editModal: {
        backgroundColor: 'white',
        borderRadius: 12,
        width: '100%',
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    editModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    editModalTitle: {
        fontSize: 18,
        fontWeight: '500',
        color: '#000000',
    },
    editFormContainer: {
        padding: 16,
        maxHeight: 450,
    },
    editAvatarContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    editAvatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        position: 'relative',
    },
    editAvatarImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    editAvatarOverlay: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: 'rgba(31, 174, 235, 0.8)',
        width: 30,
        height: 30,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    editField: {
        marginBottom: 16,
    },
    editFieldLabel: {
        fontSize: 14,
        color: '#645C5C',
        marginBottom: 6,
    },
    editInput: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 16,
        backgroundColor: '#F8F8F8',
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#F8F8F8',
    },
    dateText: {
        fontSize: 16,
        color: '#000000',
    },
    genderOptions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    genderOption: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        marginHorizontal: 4,
        alignItems: 'center',
    },
    genderOptionSelected: {
        backgroundColor: '#1FAEEB',
        borderColor: '#1FAEEB',
    },
    genderOptionText: {
        fontSize: 16,
        color: '#000000',
    },
    genderOptionTextSelected: {
        color: '#FFFFFF',
    },
    editButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    cancelButton: {
        flex: 1,
        paddingVertical: 12,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        color: '#000000',
    },
    saveButton: {
        flex: 1,
        paddingVertical: 12,
        marginLeft: 8,
        backgroundColor: '#1FAEEB',
        borderRadius: 8,
        alignItems: 'center',
    },
    saveButtonText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: '500',
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: 'transparent',
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 40,
        paddingVertical: 12,
        paddingHorizontal: 15,
        zIndex: 10,
    },
    backButton: {
        padding: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 20,
    },
    contentContainer: {
        flex: 1,
    }, profileSection: {
        backgroundColor: '#FFFFFF',
        padding: 20,
        paddingTop: 40,
        paddingBottom: 40,
        marginBottom: 0,
        position: 'relative',
        overflow: 'hidden',
        height: 260, // Tăng chiều cao thêm 20% từ 220px
    },
    backgroundImage: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        resizeMode: 'cover',
    },
    avatarAndNameContainer: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 2,
    },
    profileImage: {
        width: 60,
        height: 60,
        borderRadius: 40,
        backgroundColor: '#D9D9D9', // Fallback color
        zIndex: 1,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    profileNameContainer: {
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        paddingVertical: 5,
        paddingHorizontal: 12,
        borderRadius: 20,
        marginLeft: 10,


    },
    profileName: {
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'Inter',
        color: 'white',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    sectionContainer: {
        backgroundColor: '#FFFFFF',
        marginBottom: 10,
    },
    sectionHeader: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    },
    sectionTitle: {
        fontSize: 14,
        fontFamily: 'Inter',
        fontWeight: '500',
        color: '#000000',
    },
    infoItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    },
    infoIcon: {
        marginRight: 12,
        marginTop: 2,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        fontFamily: 'Inter',
        fontWeight: '400',
        color: '#645C5C',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 14,
        fontFamily: 'Inter',
        fontWeight: '400',
        color: '#000000',
    },
    infoNote: {
        fontSize: 12,
        fontFamily: 'Inter',
        fontWeight: '400',
        color: '#645C5C',
        marginTop: 4,
        lineHeight: 16,
    },
    editButtonWrapper: {
        padding: 20,
        alignItems: 'center',
    },
    editButton: {
        backgroundColor: '#1FAEEB',
        borderRadius: 20,
        paddingVertical: 12,
        paddingHorizontal: 140,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    editButtonText: {
        fontSize: 14,
        fontWeight: '500',
        fontFamily: 'Inter',
        color: '#FFFFFF',
        width: 100,
        textAlign: 'center',

        marginLeft: 8,
    },
    datePickerModalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    datePickerModal: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        width: '100%',
        alignItems: 'center',
    },
    datePickerButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        width: '100%',
    },
    datePickerCancelButton: {
        flex: 1,
        paddingVertical: 10,
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        alignItems: 'center',
    },
    datePickerCancelButtonText: {
        fontSize: 16,
        color: '#000000',
    },
    datePickerDoneButton: {
        flex: 1,
        paddingVertical: 10,
        marginLeft: 10,
        backgroundColor: '#1FAEEB',
        borderRadius: 8,
        alignItems: 'center',
    }, datePickerDoneButtonText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: '500',
    },
    datePickerCenterContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 200,
        paddingVertical: 20,
    },
    centeredDatePicker: {
        width: '100%',
        backgroundColor: 'white',
        alignSelf: 'center',
    },
    fullScreenImageContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'black',
    },
    fullScreenImage: {
        width: '100%',
        height: '100%',
    },
    fullScreenCloseButton: {
        position: 'absolute',
        top: 40,
        right: 20,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#FFFFFF',
        marginTop: 10,
        fontWeight: '500',
    },
    avatarLoadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 30,
    },
});

export default DetailInfoScreen;
