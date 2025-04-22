import React, { useState, useRef, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Image,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    TextInput,
    Modal,
    Animated,
    Dimensions,
    ActivityIndicator,
    Alert,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
type BioScreenProps = {
    navigation?: any;
    route?: {
        params?: {
            user?: any;
            accessToken?: string;
        };
    };
};
const avatarDefaulturi = 'https://static.vecteezy.com/system/resources/previews/009/292/244/non_2x/default-avatar-icon-of-social-media-user-vector.jpg';
const backgroundImageDefaulturi = 'https://cellphones.com.vn/sforum/wp-content/uploads/2023/07/hinh-nen-zalo-23-1.jpg';
const textBioDefault = 'Hãy trở thành 2 con mèo.';
const BioScreen = ({ navigation, route }: BioScreenProps) => {
    const [loading, setLoading] = useState(true);
    const [uploadingCover, setUploadingCover] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [userData, setUserData] = useState<any>(null);
    const [user, setUser] = useState({
        name: '',
        avatar: { uri: avatarDefaulturi },
        bio: textBioDefault,

    });
    const [editBio, setEditBio] = useState(user.bio);
    const [showEditPopup, setShowEditPopup] = useState(false);
    const [showBackgroundMenu, setShowBackgroundMenu] = useState(false);
    const [showAvatarMenu, setShowAvatarMenu] = useState(false); const [showFullScreenImage, setShowFullScreenImage] = useState(false);
    const [showFullAvatarImage, setShowFullAvatarImage] = useState(false);
    const editModalAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
    const avatarSlideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
    const fullScreenImageAnim = useRef(new Animated.Value(0)).current;

    // Function to upload cover photo
    const uploadCoverPhoto = async (imageUri: string) => {
        const accessToken = route?.params?.accessToken;
        if (!accessToken || !userData) {
            console.error('No access token or user data available');
            Alert.alert('Lỗi', 'Không thể tải ảnh lên. Vui lòng đăng nhập lại');
            return;
        }

        try {
            setUploadingCover(true);

            // Create form data for the multipart/form-data request
            const formData = new FormData();

            // Get the file name from the URI
            const uriParts = imageUri.split('/');
            const fileName = uriParts[uriParts.length - 1];

            // Add the image file to form data
            formData.append('coverPhoto', {
                uri: imageUri,
                name: fileName,
                type: 'image/jpeg', // Assume JPEG, but could detect from the fileName extension
            } as any);

            // Add user ID to form data
            formData.append('id', userData.id);

            console.log('Uploading cover photo:', {
                uri: imageUri,
                name: fileName,
                formData: formData
            });

            // Make the API call to upload the cover photo
            const response = await fetch('http://192.168.0.104:3000/user/cover/upload', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'multipart/form-data',
                },
                body: formData,
            });

            const result = await response.json();
            console.log('Cover photo upload response:', result);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            // Update the local state with the new cover photo URL
            setUserData({
                ...userData,
                coverPhoto: result.user.coverPhoto
            });

            Alert.alert('Thành công', 'Cập nhật ảnh bìa thành công');

        } catch (error) {
            console.error('Error uploading cover photo:', error);
            Alert.alert('Lỗi', 'Không thể tải ảnh bìa lên. Vui lòng thử lại sau.');
        } finally {
            setUploadingCover(false);
        }
    };

    // Function to upload avatar photo
    const uploadAvatarPhoto = async (imageUri: string) => {
        const accessToken = route?.params?.accessToken;
        if (!accessToken || !userData) {
            console.error('No access token or user data available');
            Alert.alert('Lỗi', 'Không thể tải ảnh lên. Vui lòng đăng nhập lại');
            return;
        }

        try {
            setUploadingAvatar(true);

            // Create form data for the multipart/form-data request
            const formData = new FormData();

            // Get the file name from the URI
            const uriParts = imageUri.split('/');
            const fileName = uriParts[uriParts.length - 1];

            // Add the image file to form data
            formData.append('avatar', {
                uri: imageUri,
                name: fileName,
                type: 'image/jpeg', // Assume JPEG, but could detect from the fileName extension
            } as any);

            // Add user ID to form data
            formData.append('id', userData.id);

            console.log('Uploading avatar photo:', {
                uri: imageUri,
                name: fileName,
                formData: formData
            });

            // Make the API call to upload the avatar photo
            const response = await fetch('http://192.168.0.104:3000/user/avatar/upload', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'multipart/form-data',
                },
                body: formData,
            });

            const result = await response.json();
            console.log('Avatar photo upload response:', result);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            // Update the local state with the new avatar URL
            setUserData({
                ...userData,
                urlavatar: result.user.urlavatar
            });

            // Update user avatar in state
            setUser({
                ...user,
                avatar: { uri: result.user.urlavatar }
            });

            Alert.alert('Thành công', 'Cập nhật ảnh đại diện thành công');

        } catch (error) {
            console.error('Error uploading avatar photo:', error);
            Alert.alert('Lỗi', 'Không thể tải ảnh đại diện lên. Vui lòng thử lại sau.');
        } finally {
            setUploadingAvatar(false);
        }
    };

    // Animation for edit popup
    useEffect(() => {
        if (showEditPopup) {
            setEditBio(user.bio);
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
    }, [showEditPopup, user.bio]);

    // Animation for background menu
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
    }, [showBackgroundMenu]);

    // Animation for avatar menu
    useEffect(() => {
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
    }, [showAvatarMenu]);    // Fetch user data from API
    useEffect(() => {
        const fetchUserData = async () => {
            const accessToken = route?.params?.accessToken;
            if (!accessToken) {
                console.log('No access token provided');
                setLoading(false);
                return;
            }

            try {
                console.log('Fetching user data with token:', accessToken);
                const response = await fetch('http://192.168.0.104:3000/user', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                const responseText = await response.text();
                console.log('Raw API Response:', responseText);

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}, Response: ${responseText}`);
                }

                // Parse the response text as JSON
                let data;
                try {
                    data = JSON.parse(responseText);
                    console.log('API Response Data:', data);
                } catch (e) {
                    console.error('Failed to parse JSON:', e);
                    setLoading(false);
                    return;
                }

                setUserData(data);

                // Update the user state with fetched data and fallbacks for null values
                setUser({
                    name: data.fullname || 'User',
                    avatar: data.urlavatar && data.urlavatar !== "" ? { uri: data.urlavatar } : { uri: avatarDefaulturi },
                    bio: data.bio && data.bio !== "" ? data.bio : textBioDefault
                });

                console.log('Updated user state:', {
                    name: data.fullname || 'User',
                    avatar: data.urlavatar && data.urlavatar !== "" ? data.urlavatar : avatarDefaulturi,
                    bio: data.bio && data.bio !== "" ? data.bio : textBioDefault
                });

                setLoading(false);
            } catch (error) {
                console.error('Error fetching user data:', error);
                setLoading(false);
            }
        };

        fetchUserData();
    }, [route?.params?.accessToken]);

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

                <TouchableOpacity
                    style={styles.menuButton}
                    onPress={() => navigation?.navigate('DetailInfoScreen')}
                >
                    <Ionicons name="ellipsis-horizontal" size={24} color="#FFFFFF" />
                </TouchableOpacity>
            </View>
            {/* Loading Indicator */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#1FAEEB" />
                </View>
            ) : (
                <>
                    {/* Profile Section with Background and Avatar */}
                    <View style={styles.profileSection}>

                        <TouchableOpacity
                            style={styles.backgroundContainer}
                            activeOpacity={0.9}
                            onPress={() => setShowBackgroundMenu(true)}
                        >
                            <Image
                                source={{ uri: userData?.coverPhoto || backgroundImageDefaulturi }}
                                style={styles.backgroundImage}
                                onError={(e) => console.log('Background image error:', e.nativeEvent.error)}
                            />
                            {uploadingCover && (
                                <View style={styles.uploadingOverlay}>
                                    <ActivityIndicator size="large" color="#FFFFFF" />
                                    <Text style={styles.uploadingText}>Đang tải ảnh lên...</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        <View style={styles.avatarContainer}>
                            <TouchableOpacity
                                onPress={() => setShowAvatarMenu(true)}
                                activeOpacity={0.9}
                            >
                                <Image
                                    source={{ uri: userData?.urlavatar || avatarDefaulturi }}
                                    style={styles.profileImage}
                                    onError={(e) => console.log('Avatar image error:', e.nativeEvent.error)}
                                />
                                {uploadingAvatar && (
                                    <View style={styles.avatarUploadingOverlay}>
                                        <ActivityIndicator size="small" color="#FFFFFF" />
                                    </View>
                                )}
                            </TouchableOpacity>
                            <View style={styles.profileNameContainer}>
                                <Text style={styles.profileName}>{user.name}</Text>
                            </View>
                        </View>
                    </View>
                </>
            )}
            {/* Bio Section */}
            {!loading && (
                <View style={styles.bioSection}>
                    <View style={styles.bioContainer}>
                        <Text style={styles.bioText}>{user.bio}</Text>
                        <TouchableOpacity
                            style={styles.editBioButton}
                            onPress={() => setShowEditPopup(true)}
                        >
                            <Ionicons name="pencil" size={18} color="#0C71E8" />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Edit Bio Modal */}
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
                        style={styles.editModalContainer}
                    >
                        <Animated.View
                            style={[

                                styles.editModal,
                                {
                                    opacity: editModalAnim,
                                    transform: [{
                                        scale: editModalAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.9, 1]
                                        })
                                    }]
                                }
                            ]}
                        >
                            <View style={styles.editModalHeader}>
                                <Text style={styles.editModalTitle}>Chỉnh sửa tiểu sử</Text>
                                <TouchableOpacity onPress={() => setShowEditPopup(false)}>
                                    <Ionicons name="close" size={24} color="#000000" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.editFormContainer}>
                                <TextInput
                                    style={styles.editInput}
                                    value={editBio}
                                    onChangeText={setEditBio}
                                    multiline
                                    placeholder="Nhập tiểu sử của bạn"
                                    placeholderTextColor="#645C5C"
                                    maxLength={100}
                                />
                                <Text style={styles.charCount}>
                                    {editBio.length}/100
                                </Text>
                            </View>

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
                                            // Show loading or disable the button

                                            const accessToken = route?.params?.accessToken;
                                            if (!accessToken || !userData) {
                                                console.error('No access token or user data available');
                                                return;
                                            }

                                            // Make the API call to update bio
                                            const response = await fetch('http://192.168.0.104:3000/user/bio', {
                                                method: 'PUT',
                                                headers: {
                                                    'Authorization': `Bearer ${accessToken}`,
                                                    'Content-Type': 'application/json'
                                                },
                                                body: JSON.stringify({
                                                    id: userData.id,
                                                    bio: editBio
                                                })
                                            });

                                            const result = await response.json();
                                            console.log('Bio update response:', result);

                                            if (!response.ok) {
                                                throw new Error(`HTTP error! Status: ${response.status}`);
                                            }

                                            // Update the local state with the response data
                                            setUser({ ...user, bio: result.user.bio });

                                            // Update the userData state as well to keep it in sync
                                            setUserData({
                                                ...userData,
                                                bio: result.user.bio
                                            });

                                            // Close the modal
                                            setShowEditPopup(false);

                                        } catch (error) {
                                            console.error('Error updating bio:', error);
                                            // Here you could show an error message to the user
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

            {/* Background Menu Bottom Sheet */}
            <Modal
                visible={showBackgroundMenu}
                transparent={true}
                animationType="none"
                onRequestClose={() => setShowBackgroundMenu(false)}
            >
                <TouchableOpacity
                    style={styles.bottomSheetOverlay}
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
                                    // View background image in full screen
                                    if (userData?.coverPhoto) {
                                        setShowFullScreenImage(true);
                                    } else {
                                        Alert.alert('Thông báo', 'Ảnh bìa mặc định. Vui lòng thêm ảnh bìa!');
                                    }
                                }}>
                                    <Ionicons name="eye-outline" size={24} color="#000000" />
                                    <Text style={styles.menuOptionText}>Xem ảnh bìa</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.menuOption} onPress={() => {
                                    setShowBackgroundMenu(false);
                                    // Sử dụng Alert để yêu cầu người dùng chọn cách thức
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
                                                    // Sử dụng Promise với timeout để tránh treo ứng dụng
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
                                                                [
                                                                    { text: 'OK' }
                                                                ]
                                                            );
                                                            return;
                                                        }

                                                        console.log('Opening camera with timeout...');
                                                        // Tạo promise với timeout cho camera
                                                        const cameraPromise = Promise.race([
                                                            ImagePicker.launchCameraAsync({
                                                                quality: 0.8,
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
                                                            uploadCoverPhoto(result.assets[0].uri);
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
                                    setShowBackgroundMenu(false);
                                    // Sử dụng Alert để yêu cầu người dùng chọn cách thức
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
                                                    // Sử dụng Promise với timeout để tránh treo ứng dụng
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
                                                                [
                                                                    { text: 'OK' }
                                                                ]
                                                            );
                                                            return;
                                                        }

                                                        console.log('Opening image library with timeout...');
                                                        // Tạo promise với timeout cho thư viện ảnh
                                                        const imageLibraryPromise = Promise.race([
                                                            ImagePicker.launchImageLibraryAsync({
                                                                quality: 0.8,
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
                                                            uploadCoverPhoto(result.assets[0].uri);
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
            {/* Full Screen Image Modal */}
            <Modal
                visible={showFullScreenImage}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowFullScreenImage(false)}
            >
                <View style={styles.fullScreenImageContainer}>
                    <TouchableOpacity
                        style={styles.fullScreenCloseButton}
                        onPress={() => setShowFullScreenImage(false)}
                    >
                        <Ionicons name="close-circle" size={36} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Image
                        source={{ uri: userData?.coverPhoto }}
                        style={styles.fullScreenImage}
                        resizeMode="contain"
                    />
                </View>
            </Modal>

            {/* Full Screen Avatar Image Modal */}
            <Modal
                visible={showFullAvatarImage}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowFullAvatarImage(false)}
            >
                <View style={styles.fullScreenImageContainer}>
                    <TouchableOpacity
                        style={styles.fullScreenCloseButton}
                        onPress={() => setShowFullAvatarImage(false)}
                    >
                        <Ionicons name="close-circle" size={36} color="#FFFFFF" />
                    </TouchableOpacity>
                    <Image
                        source={{ uri: userData?.urlavatar }}
                        style={styles.fullScreenImage}
                        resizeMode="contain"
                    />
                </View>
            </Modal>

            {/* Avatar Menu Bottom Sheet */}
            <Modal
                visible={showAvatarMenu}
                transparent={true}
                animationType="none"
                onRequestClose={() => setShowAvatarMenu(false)}
            >
                <TouchableOpacity
                    style={styles.bottomSheetOverlay}
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
                            </View>
                            <View style={styles.menuOptions}>
                                <TouchableOpacity style={styles.menuOption} onPress={() => {
                                    setShowAvatarMenu(false);
                                    // View avatar in full screen
                                    if (userData?.urlavatar) {
                                        setShowFullAvatarImage(true);
                                    } else {
                                        Alert.alert('Thông báo', 'Ảnh đại diện mặc định. Vui lòng thêm ảnh đại diện!');
                                    }
                                }}>
                                    <Ionicons name="eye-outline" size={24} color="#000000" />
                                    <Text style={styles.menuOptionText}>Xem ảnh đại diện</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.menuOption} onPress={() => {
                                    setShowAvatarMenu(false);
                                    // Sử dụng Alert để yêu cầu người dùng chọn cách thức
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
                                                    // Sử dụng Promise với timeout để tránh treo ứng dụng
                                                    try {
                                                        console.log('Requesting camera permission for avatar with timeout...');

                                                        // Tạo promise với timeout
                                                        const permissionPromise = Promise.race([
                                                            ImagePicker.requestMediaLibraryPermissionsAsync(),
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
                                                                [
                                                                    { text: 'OK' }
                                                                ]
                                                            );
                                                            return;
                                                        }

                                                        console.log('Opening camera with timeout...');
                                                        // Tạo promise với timeout cho camera
                                                        const cameraPromise = Promise.race([
                                                            ImagePicker.launchCameraAsync({
                                                                quality: 0.8,
                                                                allowsEditing: true,
                                                                aspect: [1, 1], // Square aspect ratio for avatar
                                                            }),
                                                            new Promise((_, reject) =>
                                                                setTimeout(() => reject(new Error('Camera launch timeout')), 10000)
                                                            )
                                                        ]);

                                                        // Chờ kết quả từ promise camera
                                                        const result = await cameraPromise as any;

                                                        console.log('Camera result for avatar:', result);
                                                        if (!result.canceled && result.assets && result.assets.length > 0) {
                                                            console.log('Selected avatar image:', result.assets[0].uri);
                                                            uploadAvatarPhoto(result.assets[0].uri);
                                                        }
                                                    } catch (error) {
                                                        console.error('Error taking avatar photo:', error);
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
                                    // Sử dụng Alert để yêu cầu người dùng chọn cách thức
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
                                                    // Sử dụng Promise với timeout để tránh treo ứng dụng
                                                    try {
                                                        console.log('Requesting media library permission for avatar with timeout...');

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
                                                                [
                                                                    { text: 'OK' }
                                                                ]
                                                            );
                                                            return;
                                                        }

                                                        console.log('Opening image library for avatar with timeout...');
                                                        // Tạo promise với timeout cho thư viện ảnh
                                                        const imageLibraryPromise = Promise.race([
                                                            ImagePicker.launchImageLibraryAsync({
                                                                quality: 0.8,
                                                                allowsEditing: true,
                                                                aspect: [1, 1], // Square aspect ratio for avatar
                                                            }),
                                                            new Promise((_, reject) =>
                                                                setTimeout(() => reject(new Error('Image library launch timeout')), 10000)
                                                            )
                                                        ]);

                                                        // Chờ kết quả từ promise thư viện ảnh
                                                        const result = await imageLibraryPromise as any;

                                                        console.log('Image library result for avatar:', result);
                                                        if (!result.canceled && result.assets && result.assets.length > 0) {
                                                            console.log('Selected avatar image:', result.assets[0].uri);
                                                            uploadAvatarPhoto(result.assets[0].uri);
                                                        }
                                                    } catch (error) {
                                                        console.error('Error selecting avatar photo:', error);
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
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: 'transparent',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
    menuButton: {
        padding: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 20,
    },
    profileSection: {
        height: 260,
        position: 'relative',
    }, backgroundContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
        width: '100%',
        height: '100%',
    },
    backgroundImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    avatarContainer: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 1,
    },
    profileImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: '#FFFFFF',
        marginBottom: 10,
    },
    profileNameContainer: {
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        paddingVertical: 5,
        paddingHorizontal: 15,
        borderRadius: 20,
    },
    profileName: {
        fontSize: 18,
        fontWeight: '500',
        color: 'white',
        textAlign: 'center',
    },
    bioSection: {
        padding: 20,
    },
    bioContainer: {
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    bioText: {
        fontSize: 15,
        color: '#333333',
        flex: 1,
        lineHeight: 22,
    },
    editBioButton: {
        padding: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bottomSheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
    },
    editModalContainer: {
        width: '90%',
        maxWidth: 400,
    },
    editModal: {
        backgroundColor: 'white',
        borderRadius: 12,
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
        position: 'relative',
    },
    editInput: {
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        backgroundColor: '#F8F8F8',
        minHeight: 100,
        textAlignVertical: 'top',
        paddingBottom: 30,
    },
    charCount: {
        position: 'absolute',
        bottom: 26,
        right: 26,
        fontSize: 12,
        color: '#645C5C',
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
    }, saveButtonText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: '500',
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
    },
    bottomSheetHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        paddingHorizontal: 10,
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
    },
    menuOptionText: {
        fontSize: 16,
        color: '#000000',
        marginLeft: 16,
    }, uploadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    avatarUploadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 40,
    },
    uploadingText: {
        color: '#FFFFFF',
        marginTop: 10,
        fontSize: 16,
    },
    fullScreenImageContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullScreenImage: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height,
    },
    fullScreenCloseButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 10,
        padding: 10,
    },
});

export default BioScreen;
