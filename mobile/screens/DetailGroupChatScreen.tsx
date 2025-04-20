import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Image,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SocketService from '../services/SocketService';
import AuthService from '../services/AuthService';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

// API URL
const API_URL = 'http://192.168.0.103:3000';

// Get device dimensions
const { width, height } = Dimensions.get('window');

// Define props type
type DetailGroupChatScreenProps = {
  navigation?: any;
  route?: any;
};

// Group member type definition
interface GroupMember {
  id: string;
  fullname: string;
  urlavatar?: string;
  isOnline?: boolean;
  phone?: string;
  email?: string;
  bio?: string;
  coverPhoto?: string;
  roles?: {
    isOwner: boolean;
    isCoOwner: boolean;
  };
}

// Group information type definition
interface GroupInfo {
  name: string;
  avatar?: string;
  members?: GroupMember[];
  rules: {
    IDOwner?: string;
    listIDCoOwner: string[];
  };
  owner?: GroupMember;
  coOwners?: GroupMember[];
  regularMembers?: GroupMember[];
  totalMembers?: number;
  userRole?: {
    isOwner: boolean;
    isCoOwner: boolean;
  };
  groupDetails?: {
    groupName: string;
    groupAvatar: string;
    createdAt: string;
  };
}

// Interface for search results
interface SearchUserResult {
  id: string;
  fullname: string;
  urlavatar?: string;
  phone: string;
  isFriend: boolean;
  isSelected?: boolean;
}

const DetailGroupChatScreen: React.FC<DetailGroupChatScreenProps> = ({ navigation, route }) => {
  // Get conversation ID and group info from route params
  const conversationId = route?.params?.conversationId;
  const initialGroupInfo: GroupInfo = route?.params?.groupInfo || {
    name: 'Group Chat',
    rules: {
      listIDCoOwner: []
    }
  };
  // State variables
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [newGroupName, setNewGroupName] = useState(initialGroupInfo.name);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUpdatingGroupInfo, setIsUpdatingGroupInfo] = useState(false);

  // Modal and member management states
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showMemberOptionsModal, setShowMemberOptionsModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<GroupMember | null>(null);

  // Search friends state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<SearchUserResult[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);

  // State for user role
  const [currentUserRole, setCurrentUserRole] = useState({
    isOwner: false,
    isCoOwner: false
  });
  // State for group info
  const [groupInfo, setGroupInfo] = useState<GroupInfo>(initialGroupInfo);

  // State for filtered friends
  const [filteredFriends, setFilteredFriends] = useState<SearchUserResult[]>([]);
  const [members, setMembers] = useState<GroupMember[]>(initialGroupInfo.members || []);

  // State for delete confirmation modal
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showDeleteSuccessMessage, setShowDeleteSuccessMessage] = useState(false);

  // Get instances of services
  const socketService = SocketService.getInstance();
  const authService = AuthService.getInstance();

  // Initialize and load group data
  useEffect(() => {
    // Load complete group information
    loadGroupDetails();
  }, [conversationId]);

  // Load detailed group information
  const loadGroupDetails = async () => {
    try {
      setIsLoading(true);

      // Get current user ID to determine role
      const userData = socketService.getUserData();
      const currentUserId = userData?.id;

      if (!currentUserId) {
        console.error('No user data available');
        setIsLoading(false);
        return;
      }

      const token = await authService.getAccessToken();

      if (!token || !conversationId) {
        console.error('Missing token or conversation ID');
        setIsLoading(false);
        return;
      }      // Fetch group details from API using the endpoint
      const response = await fetch(
        `${API_URL}/conversation/get-member-info`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ IDConversation: conversationId })
        }
      );

      if (!response.ok) {
        console.error('Error fetching group details:', response.status);
        setIsLoading(false);
        return;
      }

      const responseData = await response.json();

      if (responseData.success && responseData.data) {
        const data = responseData.data;
        console.log('Group details fetched:', data);

        // Get owner and co-owner IDs
        const ownerID = data.owner?.id || '';
        const coOwnerIDs = data.coOwners?.map((coOwner: GroupMember) => coOwner.id) || [];

        // Determine current user's role
        const isUserOwner = ownerID === currentUserId;
        const isUserCoOwner = coOwnerIDs.includes(currentUserId);

        setCurrentUserRole({
          isOwner: isUserOwner,
          isCoOwner: isUserCoOwner
        });

        // Prepare all members array from owner, co-owners and regular members
        let allMembers: GroupMember[] = [];

        // Add owner
        if (data.owner) {
          allMembers.push(data.owner);
        }

        // Add co-owners if any
        if (data.coOwners && data.coOwners.length > 0) {
          allMembers = [...allMembers, ...data.coOwners];
        }

        // Add regular members
        if (data.members && data.members.length > 0) {
          allMembers = [...allMembers, ...data.members];
        }

        // Group info with role categorization
        const updatedGroupInfo: GroupInfo = {
          name: data.groupInfo?.groupName || initialGroupInfo.name,
          avatar: data.groupInfo?.groupAvatar,
          rules: {
            IDOwner: ownerID,
            listIDCoOwner: coOwnerIDs
          },
          owner: data.owner,
          coOwners: data.coOwners || [],
          regularMembers: data.members || [],
          totalMembers: data.totalMembers || allMembers.length,
          userRole: {
            isOwner: isUserOwner,
            isCoOwner: isUserCoOwner
          },
          groupDetails: data.groupInfo
        };

        setGroupInfo(updatedGroupInfo);
        setNewGroupName(updatedGroupInfo.name);
        setMembers(allMembers);
      }
    } catch (error) {
      console.error('Error loading group details:', error);
    } finally {
      setIsLoading(false);
    }
  };
  // Load user's friends list for adding members
  const loadFriendsList = async () => {
    try {
      setIsLoadingFriends(true);

      const token = await authService.getAccessToken();
      if (!token) {
        console.error('No auth token available');
        setIsLoadingFriends(false);
        return;
      }

      // Get current user's friends
      const response = await fetch(`${API_URL}/user/friend/get-friends`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error('Error fetching friends:', response.status);
        setIsLoadingFriends(false);
        return;
      }

      const responseData = await response.json();

      if (responseData.code === 0 && responseData.data) {
        console.log('Friends fetched:', responseData.data);

        // Filter out friends who are already members
        const memberIds = new Set(members.map(m => m.id));

        // Convert API response to SearchUserResult
        const friendsNotInGroup = responseData.data
          .filter((friend: any) => !memberIds.has(friend.id))
          .map((friend: any) => ({
            id: friend.id,
            fullname: friend.fullname,
            urlavatar: friend.urlavatar,
            phone: friend.phone || '',
            isFriend: true,
            isSelected: false
          }));

        setFilteredFriends(friendsNotInGroup);
      } else {
        console.error('Error in friends response:', responseData.message);
        setFilteredFriends([]);
      }
    } catch (error) {
      console.error('Error loading friends list:', error);
      setFilteredFriends([]);
    } finally {
      setIsLoadingFriends(false);
    }
  };  // Function to pick image from device gallery
  const pickImage = async () => {
    try {
      // Request permission to access media library
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Cần quyền truy cập', 'Ứng dụng cần quyền truy cập thư viện ảnh để chọn ảnh đại diện nhóm.');
        return;
      }

      // Open image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Set selected image URI
        setSelectedImage(result.assets[0].uri);

        // Upload the image
        uploadGroupAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.');
    }
  };

  // Function to upload group avatar
  const uploadGroupAvatar = async (imageUri: string) => {
    try {
      setIsUploadingImage(true);

      const token = await authService.getAccessToken();
      if (!token) {
        Alert.alert('Lỗi xác thực', 'Không tìm thấy token xác thực');
        setIsUploadingImage(false);
        return;
      }

      // Create form data for image upload
      const formData = new FormData();

      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(imageUri);
      if (!fileInfo.exists) {
        Alert.alert('Lỗi', 'File không tồn tại');
        setIsUploadingImage(false);
        return;
      }

      // Get file name from URI
      const fileName = imageUri.split('/').pop() || `group_avatar_${Date.now()}.jpg`;

      // Add image file to form data
      formData.append('avatar-group', {
        uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
        name: fileName,
        type: 'image/jpeg'
      } as any);

      console.log('Uploading group avatar to:', `${API_URL}/upload/avatar-group`);

      // Upload image to server
      const response = await fetch(`${API_URL}/upload/avatar-group`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData
      });

      const responseData = await response.json();

      if (responseData.success && responseData.fileUrl) {
        console.log('Image uploaded successfully:', responseData.fileUrl);

        // Update group info with new avatar URL
        updateGroupInfo({
          avatar: responseData.fileUrl
        });
      } else {
        console.error('Error uploading image:', responseData);
        Alert.alert('Lỗi', 'Không thể tải lên ảnh đại diện. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Error uploading group avatar:', error);
      Alert.alert('Lỗi', 'Không thể tải lên ảnh đại diện. Vui lòng thử lại.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Function to update group information (name and/or avatar)
  const updateGroupInfo = ({ name, avatar }: { name?: string, avatar?: string }) => {
    // Only allow owners and co-owners to change group info
    if (!currentUserRole.isOwner && !currentUserRole.isCoOwner) {
      Alert.alert('Không được phép', 'Chỉ trưởng nhóm hoặc phó nhóm mới có thể thay đổi thông tin nhóm.');
      return;
    }

    const socket = socketService.getSocket();
    if (!socket) {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối đến máy chủ');
      return;
    }

    const userData = socketService.getUserData();
    if (!userData || !userData.id) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
      return;
    }

    setIsUpdatingGroupInfo(true);

    // Prepare update data
    const updateData = {
      IDConversation: conversationId,
      IDUser: userData.id,
      groupName: name || groupInfo.name,
      groupAvatarUrl: avatar || groupInfo.avatar
    };

    // Send update request via socket
    console.log('Sending update_group_info with:', updateData);
    socket.emit('update_group_info', updateData);

    // Listen for response
    socket.once('update_group_info_response', (response) => {
      console.log('update_group_info_response:', response);
      setIsUpdatingGroupInfo(false);

      if (response.success) {
        // Update local group info
        setGroupInfo(prev => ({
          ...prev,
          name: response.updates?.groupName || prev.name,
          avatar: response.updates?.groupAvatar || prev.avatar
        }));

        // Update newGroupName state if name was updated
        if (response.updates?.groupName) {
          setNewGroupName(response.updates.groupName);
        }

        Alert.alert('Thành công', 'Đã cập nhật thông tin nhóm thành công');

        // Reload group details to ensure all data is updated
        loadGroupDetails();
      } else {
        Alert.alert('Lỗi', response.message || 'Không thể cập nhật thông tin nhóm');
      }
    });

    // Also listen for group_info_updated event for real-time updates
    socket.once('group_info_updated', (response) => {
      console.log('group_info_updated received:', response);
      loadGroupDetails();
    });
  };
  // Function to handle renaming group
  const handleRenameGroup = () => {
    if (newGroupName.trim() === groupInfo.name) {
      setIsEditing(false);
      return;
    }

    if (newGroupName.trim().length === 0) {
      Alert.alert('Lỗi', 'Tên nhóm không được để trống');
      return;
    }

    // Update group with new name
    updateGroupInfo({ name: newGroupName.trim() });

    // Exit edit mode
    setIsEditing(false);
  };
  const toggleFriendSelection = (friend: SearchUserResult) => {
    // Update filtered friends list
    setFilteredFriends(prevFriends =>
      prevFriends.map(f =>
        f.id === friend.id ? { ...f, isSelected: !f.isSelected } : f
      )
    );

    // Update selected friends list
    setSelectedFriends(prevSelected => {
      const isCurrentlySelected = prevSelected.some(f => f.id === friend.id);

      if (isCurrentlySelected) {
        // Remove from selected
        return prevSelected.filter(f => f.id !== friend.id);
      } else {
        // Add to selected
        return [...prevSelected, { ...friend, isSelected: true }];
      }
    });
  };

  const addMembersToGroup = () => {
    if (selectedFriends.length === 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn ít nhất một người bạn để thêm vào nhóm');
      return;
    }

    const socket = socketService.getSocket();
    if (!socket) {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối đến máy chủ');
      return;
    }

    const userData = socketService.getUserData();
    if (!userData || !userData.id) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
      return;
    }

    // Prepare add member data
    const addMemberData = {
      IDUser: userData.id,
      IDConversation: conversationId,
      newGroupMembers: selectedFriends.map(friend => friend.id)
    };

    // Send add member request
    console.log('Sending add_member_to_group with:', addMemberData);
    socket.emit('add_member_to_group', addMemberData);

    // Listen for response
    socket.once('message_from_server', (response) => {
      console.log('add_member_to_group response:', response);

      if (response.success) {
        // Update UI with new members
        loadGroupDetails();
        Alert.alert('Thành công', 'Thêm thành viên thành công');
      } else {
        Alert.alert('Lỗi', response.message || 'Không thể thêm thành viên');
      }
    });

    setShowAddMemberModal(false);
    setSelectedFriends([]);
  };

  const handleRemoveMember = () => {
    if (!selectedMember) {
      setShowMemberOptionsModal(false);
      return;
    }

    const socket = socketService.getSocket();
    if (!socket) {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối đến máy chủ');
      setShowMemberOptionsModal(false);
      setSelectedMember(null);
      return;
    }

    const userData = socketService.getUserData();
    if (!userData || !userData.id) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
      setShowMemberOptionsModal(false);
      setSelectedMember(null);
      return;
    }

    // Check if the user is removing themselves (leaving group)
    const isLeavingGroup = selectedMember.id === userData.id;

    // Prepare data for member removal
    const removeMemberData = {
      IDUser: userData.id,
      IDConversation: conversationId,
      groupMembers: [selectedMember.id]
    };

    // Show confirmation dialog
    Alert.alert(
      isLeavingGroup ? 'Rời nhóm' : 'Xóa thành viên',
      isLeavingGroup
        ? 'Bạn có chắc muốn rời khỏi nhóm không?'
        : `Bạn có chắc muốn xóa ${selectedMember.fullname} khỏi nhóm không?`,
      [
        {
          text: 'Hủy',
          style: 'cancel'
        },
        {
          text: 'Xác nhận',
          style: 'destructive',
          onPress: () => {
            // Set loading state
            setIsLoading(true);

            // Send remove member request
            console.log('Sending remove_member_from_group with:', removeMemberData);
            socket.emit('remove_member_from_group', removeMemberData);

            // Listen for removal response
            socket.once('remove_member_response', (response) => {
              console.log('remove_member_response:', response);
              setIsLoading(false);

              if (response.success) {
                // If the current user is being removed, navigate back
                if (isLeavingGroup) {
                  navigation.goBack();
                  return;
                }

                // Update the group info
                loadGroupDetails();
                Alert.alert('Thành công', 'Đã xóa thành viên khỏi nhóm');
              } else {
                Alert.alert('Lỗi', response.message || 'Không thể xóa thành viên');
              }
            });

            // Also listen for removed_from_group event (in case user is removed)
            socket.once('removed_from_group', (response) => {
              console.log('removed_from_group:', response);
              setIsLoading(false);

              // If the user was removed from the group
              if (response.success) {
                navigation.goBack();
                Alert.alert('Thông báo', response.message || 'Bạn đã bị xóa khỏi nhóm');
              }
            });
          }
        }
      ]
    );

    setShowMemberOptionsModal(false);
    setSelectedMember(null);
  };
  const handleChangeOwner = () => {
    if (!selectedMember) {
      setShowMemberOptionsModal(false);
      return;
    }

    const socket = socketService.getSocket();
    if (!socket) {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối đến máy chủ');
      setShowMemberOptionsModal(false);
      setSelectedMember(null);
      return;
    }

    const userData = socketService.getUserData();
    if (!userData || !userData.id) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
      setShowMemberOptionsModal(false);
      setSelectedMember(null);
      return;
    }

    // Confirm before transferring ownership
    Alert.alert(
      'Chuyển quyền trưởng nhóm',
      `Bạn có chắc chắn muốn chuyển quyền trưởng nhóm cho ${selectedMember.fullname}?`,
      [
        {
          text: 'Hủy',
          style: 'cancel'
        },
        {
          text: 'Xác nhận',
          style: 'default',
          onPress: () => {
            // Set loading state
            setIsLoading(true);

            // Prepare data for ownership transfer
            const changeOwnerData = {
              IDUser: userData.id,
              IDConversation: conversationId,
              IDNewOwner: selectedMember.id
            };

            // Send ownership transfer request
            console.log('Sending change_owner_group with:', changeOwnerData);
            socket.emit('change_owner_group', changeOwnerData);

            // Listen for response
            socket.once('message_from_server', (response) => {
              console.log('change_owner_group response:', response);
              setIsLoading(false);

              if (response.success) {
                // Update the group info
                loadGroupDetails();
                Alert.alert('Thành công', 'Đã chuyển quyền trưởng nhóm thành công');
              } else {
                Alert.alert('Lỗi', response.message || 'Không thể chuyển quyền trưởng nhóm');
              }
            });
          }
        }
      ]
    );

    setShowMemberOptionsModal(false);
    setSelectedMember(null);
  };
  // Function to promote a member to admin (co-owner)
  const handlePromoteToAdmin = () => {
    if (!selectedMember) {
      setShowMemberOptionsModal(false);
      return;
    }

    const socket = socketService.getSocket();
    if (!socket) {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối đến máy chủ');
      setShowMemberOptionsModal(false);
      setSelectedMember(null);
      return;
    }

    const userData = socketService.getUserData();
    if (!userData || !userData.id) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
      setShowMemberOptionsModal(false);
      setSelectedMember(null);
      return;
    }

    // Confirm before promoting
    Alert.alert(
      'Bổ nhiệm phó nhóm',
      `Bạn có chắc chắn muốn bổ nhiệm ${selectedMember.fullname} làm phó nhóm?`,
      [
        {
          text: 'Hủy',
          style: 'cancel'
        },
        {
          text: 'Xác nhận',
          style: 'default',
          onPress: () => {
            // Set loading state
            setIsLoading(true);

            // Prepare data for member promotion
            const promoteMemberData = {
              IDUser: userData.id,
              IDConversation: conversationId,
              IDMemberToPromote: selectedMember.id
            };

            // Send promotion request
            console.log('Sending promote_member_to_admin with:', promoteMemberData);
            socket.emit('promote_member_to_admin', promoteMemberData);

            // Listen for response
            socket.once('promote_member_response', (response) => {
              console.log('promote_member_response:', response);
              setIsLoading(false);

              if (response.success) {
                // Update the group info
                loadGroupDetails();
                Alert.alert('Thành công', 'Đã bổ nhiệm phó nhóm thành công');
              } else {
                Alert.alert('Lỗi', response.message || 'Không thể bổ nhiệm phó nhóm');
              }
            });
          }
        }
      ]
    );

    setShowMemberOptionsModal(false);
    setSelectedMember(null);
  };
  // Function to demote a co-owner to regular member
  const handleDemoteFromAdmin = () => {
    if (!selectedMember) {
      setShowMemberOptionsModal(false);
      return;
    }

    const socket = socketService.getSocket();
    if (!socket) {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối đến máy chủ');
      setShowMemberOptionsModal(false);
      setSelectedMember(null);
      return;
    }

    const userData = socketService.getUserData();
    if (!userData || !userData.id) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
      setShowMemberOptionsModal(false);
      setSelectedMember(null);
      return;
    }

    // Confirm before demoting
    Alert.alert(
      'Thu hồi quyền phó nhóm',
      `Bạn có chắc chắn muốn thu hồi quyền phó nhóm của ${selectedMember.fullname}?`,
      [
        {
          text: 'Hủy',
          style: 'cancel'
        },
        {
          text: 'Xác nhận',
          style: 'default',
          onPress: () => {
            // Set loading state
            setIsLoading(true);

            // Prepare data for member demotion
            const demoteMemberData = {
              IDUser: userData.id,
              IDConversation: conversationId,
              IDMemberToDemote: selectedMember.id
            };

            // Send demotion request
            console.log('Sending demote_member with:', demoteMemberData);
            socket.emit('demote_member', demoteMemberData);

            // Listen for response
            socket.once('demote_member_response', (response) => {
              console.log('demote_member_response:', response);
              setIsLoading(false);

              if (response.success) {
                // Update the group info
                loadGroupDetails();
                Alert.alert('Thành công', 'Đã thu hồi quyền phó nhóm thành công');
              } else {
                Alert.alert('Lỗi', response.message || 'Không thể thu hồi quyền phó nhóm');
              }
            });
          }
        }
      ]
    );

    setShowMemberOptionsModal(false);
    setSelectedMember(null);
  };

  // Function to upload group avatar

  // Function to update group information (name and/or avatar)

  // Function to handle user leaving the group
  const handleLeaveGroup = () => {
    const socket = socketService.getSocket();
    if (!socket) {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối đến máy chủ');
      return;
    }

    const userData = socketService.getUserData();
    if (!userData || !userData.id) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
      return;
    }

    // Show confirmation dialog
    Alert.alert(
      'Rời nhóm',
      'Bạn có chắc chắn muốn rời khỏi nhóm?',
      [
        {
          text: 'Hủy',
          style: 'cancel'
        },
        {
          text: 'Xác nhận',
          style: 'destructive',
          onPress: () => {
            // Set loading state
            setIsLoading(true);

            // Prepare data for leaving group
            const leaveGroupData = {
              IDUser: userData.id,
              IDConversation: conversationId
            };

            // Send leave group request
            console.log('Sending leave_group with:', leaveGroupData);
            socket.emit('leave_group', leaveGroupData);

            // Listen for leave group response
            socket.once('leave_group_response', (response) => {
              console.log('leave_group_response:', response);
              setIsLoading(false);

              if (response.success) {
                // Navigate back to the conversation list
                navigation.navigate('HomeScreen', {
                  reloadConversations: true
                });

                // Show success message
                Alert.alert('Thành công', response.message || 'Bạn đã rời khỏi nhóm thành công');
              } else {
                Alert.alert('Lỗi', response.message || 'Không thể rời khỏi nhóm');
              }
            });

            // Also listen for new_group_conversation event to refresh the conversation list
            socket.once('new_group_conversation', (response) => {
              console.log('new_group_conversation received after leaving group');
              // The HomeScreen should handle the reload based on the navigation params
            });
          }
        }
      ]
    );
  }; const handleDeleteGroup = () => {
    // Only owner can delete the group
    if (!currentUserRole.isOwner) {
      Alert.alert('Thông báo', 'Chỉ có trưởng nhóm mới có quyền xóa nhóm');
      return;
    }

    const socket = socketService.getSocket();
    if (!socket) {
      Alert.alert('Lỗi kết nối', 'Không thể kết nối đến máy chủ');
      return;
    }

    const userData = socketService.getUserData();
    if (!userData || !userData.id) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
      return;
    }

    // Show first confirmation dialog
    Alert.alert(
      'Xóa nhóm',
      'Hành động này không thể hoàn tác. Tất cả tin nhắn và tài liệu sẽ bị xóa vĩnh viễn.',
      [
        {
          text: 'Hủy',
          style: 'cancel'
        },
        {
          text: 'Tiếp tục',
          style: 'destructive',
          onPress: () => {
            // Reset the confirmation text and show the modal
            setDeleteConfirmText('');
            setShowDeleteConfirmModal(true);
          }
        }
      ]
    );
  };
  // Function to handle final delete confirmation
  const handleFinalDeleteConfirmation = () => {
    if (deleteConfirmText !== 'Delete') {
      Alert.alert('Lỗi', 'Xác nhận không đúng. Vui lòng nhập chính xác chữ "Xóa"');
      return;
    }

    const socket = socketService.getSocket();
    const userData = socketService.getUserData();

    if (!socket || !userData || !userData.id) {
      Alert.alert('Lỗi', 'Không thể kết nối đến máy chủ');
      setShowDeleteConfirmModal(false);
      return;
    }

    setShowDeleteConfirmModal(false);
    setIsLoading(true);

    // Prepare delete group data
    const deleteGroupData = {
      IDUser: userData.id,
      IDConversation: conversationId
    };

    // Send delete group request
    console.log('Sending delete_group with:', deleteGroupData);
    socket.emit('delete_group', deleteGroupData);

    // Listen for response
    socket.once('message_from_server', (response) => {
      console.log('delete_group response:', response);
      setIsLoading(false);

      if (response.success) {
        // Hiển thị thông báo xóa nhóm thành công
        setShowDeleteSuccessMessage(true);

        // Chờ 2 giây rồi mới chuyển về màn hình Home
        setTimeout(() => {
          setShowDeleteSuccessMessage(false);
          // Navigate back to home screen with parameters to reload conversations
          navigation.navigate('HomeScreen', {
            reloadConversations: true,
            deletedGroup: true,
            groupName: groupInfo.name
          });
        }, 2000);
      } else {
        Alert.alert('Lỗi', response.message || 'Không thể xóa nhóm');
      }
    });
  };

  // Render a member item
  const renderMemberItem = ({ item }: { item: GroupMember }) => {
    const isOwner = item.id === groupInfo.rules.IDOwner;
    const isCoOwner = groupInfo.rules.listIDCoOwner?.includes(item.id);
    const userData = socketService.getUserData();
    const isCurrentUser = item.id === userData?.id;

    return (
      <TouchableOpacity
        style={styles.memberItem}
        onPress={() => {
          if (isOwner && isCurrentUser) {
            // Don't show options for self if owner
            return;
          }
          // Set selected member and show options
          setSelectedMember(item);
          setShowMemberOptionsModal(true);
        }}
      >
        <Image
          source={item.urlavatar ? { uri: item.urlavatar } : require('../assets/Welo_image.png')}
          style={styles.memberAvatar}
        />
        <View style={styles.memberInfo}>
          <View style={styles.memberNameRow}>
            <Text style={styles.memberName}>{item.fullname}</Text>
            {isCurrentUser && <Text style={styles.currentUserLabel}> (Bạn)</Text>}
          </View>
          <View style={styles.memberRoleRow}>
            {isOwner && (
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>Trưởng nhóm</Text>
              </View>
            )}
            {isCoOwner && (
              <View style={[styles.roleBadge, styles.coOwnerBadge]}>
                <Text style={styles.roleBadgeText}>Phó nhóm</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render a friend item for the add member modal
  const renderFriendItem = ({ item }: { item: SearchUserResult }) => {
    return (
      <TouchableOpacity
        style={[
          styles.friendItem,
          item.isSelected && styles.selectedFriendItem
        ]}
        onPress={() => toggleFriendSelection(item)}
      >
        <Image
          source={item.urlavatar ? { uri: item.urlavatar } : require('../assets/Welo_image.png')}
          style={styles.friendAvatar}
        />
        <View style={styles.friendInfo}>
          <Text style={styles.friendName}>{item.fullname}</Text>
          {item.phone && <Text style={styles.friendPhone}>{item.phone}</Text>}
        </View>
        <View style={[
          styles.checkBox,
          item.isSelected && styles.checkedBox
        ]}>
          {item.isSelected && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1FAEEB" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#FDF8F8" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Thông tin nhóm</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1FAEEB" />
          <Text style={styles.loadingText}>Đang tải thông tin nhóm...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Group Avatar and Name */}
          <View style={styles.groupInfoSection}>
            <View style={styles.avatarContainer}>
              {isUploadingImage ? (
                <View style={[styles.groupAvatar, styles.avatarLoading]}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                </View>
              ) : (
                <Image
                  source={
                    selectedImage
                      ? { uri: selectedImage }
                      : groupInfo.avatar
                        ? { uri: groupInfo.avatar }
                        : require('../assets/Welo_image.png')
                  }
                  style={styles.groupAvatar}
                />
              )}
              {(currentUserRole.isOwner || currentUserRole.isCoOwner) && (
                <TouchableOpacity
                  style={styles.editAvatarButton}
                  onPress={pickImage}
                  disabled={isUploadingImage}
                >
                  <Ionicons name="camera" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>

            {isEditing ? (
              <View style={styles.editNameContainer}>
                <TextInput
                  style={styles.nameInput}
                  value={newGroupName}
                  onChangeText={setNewGroupName}
                  autoFocus
                />
                <View style={styles.editNameButtons}>
                  <TouchableOpacity
                    style={styles.editNameButton}
                    onPress={() => {
                      setNewGroupName(groupInfo.name);
                      setIsEditing(false);
                    }}
                  >
                    <Ionicons name="close" size={24} color="#FF3B30" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.editNameButton}
                    onPress={handleRenameGroup}
                  >
                    <Ionicons name="checkmark" size={24} color="#4CD964" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.groupNameContainer}>
                <Text style={styles.groupName}>{groupInfo.name}</Text>
                {(currentUserRole.isOwner || currentUserRole.isCoOwner) && (
                  <TouchableOpacity
                    style={styles.editNameIcon}
                    onPress={() => setIsEditing(true)}
                  >
                    <Ionicons name="pencil" size={18} color="#1FAEEB" />
                  </TouchableOpacity>
                )}
              </View>
            )}
            <Text style={styles.memberCount}>
              {groupInfo.totalMembers || members.length} thành viên
            </Text>
          </View>

          {/* Members Section */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Thành viên</Text>
              {(currentUserRole.isOwner || currentUserRole.isCoOwner) && (
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => {
                    loadFriendsList();
                    setShowAddMemberModal(true);
                  }}
                >
                  <Text style={styles.addButtonText}>Thêm</Text>
                  <Ionicons name="add-circle" size={16} color="#1FAEEB" />
                </TouchableOpacity>
              )}
            </View>
            {/* Display Owner Section */}
            {groupInfo.owner && (
              <View style={styles.memberSection}>
                <Text style={styles.memberSectionTitle}>Trưởng nhóm</Text>
                {renderMemberItem({ item: groupInfo.owner })}
              </View>
            )}

            {/* Display Co-Owners Section */}
            {groupInfo.coOwners && groupInfo.coOwners.length > 0 && (
              <View style={styles.memberSection}>
                <Text style={styles.memberSectionTitle}>Phó nhóm</Text>
                <FlatList
                  data={groupInfo.coOwners}
                  keyExtractor={item => item.id}
                  renderItem={renderMemberItem}
                  scrollEnabled={false}
                  style={[styles.membersList, styles.nestedList]}
                />
              </View>
            )}

            {/* Display Regular Members Section */}
            {groupInfo.regularMembers && groupInfo.regularMembers.length > 0 && (
              <View style={styles.memberSection}>
                <Text style={styles.memberSectionTitle}>Thành viên</Text>
                <FlatList
                  data={groupInfo.regularMembers}
                  keyExtractor={item => item.id}
                  renderItem={renderMemberItem}
                  scrollEnabled={false}
                  style={[styles.membersList, styles.nestedList]}
                />
              </View>
            )}

            {/* Show empty state if no members */}
            {(!groupInfo.owner && (!groupInfo.regularMembers || groupInfo.regularMembers.length === 0)) && (
              <Text style={styles.emptyListText}>Không có thành viên</Text>
            )}
          </View>

          {/* Group Actions */}
          <View style={styles.actionsContainer}>
            {!currentUserRole.isOwner && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleLeaveGroup}
              >
                <Ionicons name="exit-outline" size={24} color="#FF3B30" />
                <Text style={styles.actionButtonText}>Rời nhóm</Text>
              </TouchableOpacity>
            )}

            {currentUserRole.isOwner && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleDeleteGroup}
              >
                <Ionicons name="trash-outline" size={24} color="#FF3B30" />
                <Text style={styles.actionButtonText}>Xóa nhóm</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      )}

      {/* Add Member Modal */}
      <Modal
        visible={showAddMemberModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddMemberModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm thành viên</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowAddMemberModal(false)}
              >
                <Ionicons name="close" size={24} color="#666666" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#999999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm tên hoặc số điện thoại"
                placeholderTextColor="#999999"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Selected Friends Chips */}
            {selectedFriends.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.selectedFriendsContainer}
                contentContainerStyle={styles.selectedFriendsContent}
              >
                {selectedFriends.map(friend => (
                  <View key={friend.id} style={styles.selectedFriendChip}>
                    <Image
                      source={friend.urlavatar ? { uri: friend.urlavatar } : require('../assets/Welo_image.png')}
                      style={styles.chipAvatar}
                    />
                    <Text style={styles.chipName} numberOfLines={1}>
                      {friend.fullname}
                    </Text>
                    <TouchableOpacity
                      style={styles.chipRemove}
                      onPress={() => toggleFriendSelection(friend)}
                    >
                      <Ionicons name="close-circle" size={16} color="#666666" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Friends List */}
            {isLoadingFriends ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#1FAEEB" />
                <Text style={styles.loadingText}>Đang tải danh sách bạn bè...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredFriends}
                keyExtractor={item => item.id}
                renderItem={renderFriendItem}
                style={styles.friendsList}
                contentContainerStyle={
                  filteredFriends.length === 0 ? styles.emptyListContainer : null
                }
                ListEmptyComponent={
                  <Text style={styles.emptyListText}>
                    {searchQuery ? 'Không tìm thấy kết quả' : 'Bạn không có bạn bè nào hoặc tất cả bạn bè đã trong nhóm'}
                  </Text>
                }
              />
            )}

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.cancelBtn
                ]}
                onPress={() => setShowAddMemberModal(false)}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.addBtn,
                  selectedFriends.length === 0 && styles.disabledBtn
                ]}
                onPress={addMembersToGroup}
                disabled={selectedFriends.length === 0}
              >
                <Text style={styles.addBtnText}>
                  Thêm ({selectedFriends.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Member Options Modal */}
      <Modal
        visible={showMemberOptionsModal && selectedMember !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowMemberOptionsModal(false);
          setSelectedMember(null);
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowMemberOptionsModal(false);
            setSelectedMember(null);
          }}
        >
          <View style={styles.optionsModalContent}>
            {selectedMember && (
              <View style={styles.memberDetailsHeader}>
                <Image
                  source={
                    selectedMember.urlavatar
                      ? { uri: selectedMember.urlavatar }
                      : require('../assets/Welo_image.png')
                  }
                  style={styles.detailsAvatar}
                />
                <Text style={styles.detailsName}>{selectedMember.fullname}</Text>
              </View>
            )}
            {/* Options List */}
            <View style={styles.optionsList}>
              {/* Show transfer ownership option only if current user is owner */}
              {currentUserRole.isOwner &&
                selectedMember &&
                selectedMember.id !== socketService.getUserData()?.id && (
                  <TouchableOpacity
                    style={styles.optionItem}
                    onPress={handleChangeOwner}
                  >
                    <Ionicons name="person-add" size={24} color="#1FAEEB" />
                    <Text style={styles.optionText}>Chuyển quyền trưởng nhóm</Text>
                  </TouchableOpacity>
                )}
              {/* Show promote to admin option only if current user is owner and selected member is not already a co-owner */}
              {currentUserRole.isOwner &&
                selectedMember &&
                selectedMember.id !== socketService.getUserData()?.id &&
                !groupInfo.rules.listIDCoOwner?.includes(selectedMember.id) && (
                  <TouchableOpacity
                    style={styles.optionItem}
                    onPress={handlePromoteToAdmin}
                  >
                    <Ionicons name="shield" size={24} color="#1FAEEB" />
                    <Text style={styles.optionText}>Bổ nhiệm phó nhóm</Text>
                  </TouchableOpacity>
                )}

              {/* Show demote from admin option only if current user is owner and selected member is a co-owner */}
              {currentUserRole.isOwner &&
                selectedMember &&
                selectedMember.id !== socketService.getUserData()?.id &&
                groupInfo.rules.listIDCoOwner?.includes(selectedMember.id) && (
                  <TouchableOpacity
                    style={styles.optionItem}
                    onPress={handleDemoteFromAdmin}
                  >
                    <Ionicons name="shield-outline" size={24} color="#FF8C00" />
                    <Text style={styles.optionText}>Thu hồi quyền phó nhóm</Text>
                  </TouchableOpacity>
                )}

              {/* Show remove option only if user has permission and selected member is not owner */}
              {(currentUserRole.isOwner || currentUserRole.isCoOwner) &&
                selectedMember &&
                selectedMember.id !== groupInfo.rules.IDOwner && (
                  <TouchableOpacity
                    style={styles.optionItem}
                    onPress={handleRemoveMember}
                  >
                    <Ionicons name="person-remove" size={24} color="#FF3B30" />
                    <Text style={[styles.optionText, styles.removeText]}>
                      Xóa khỏi nhóm
                    </Text>
                  </TouchableOpacity>
                )}

              {/* If selected member is current user and not owner */}
              {selectedMember &&
                selectedMember.id === socketService.getUserData()?.id &&
                !currentUserRole.isOwner && (
                  <TouchableOpacity
                    style={styles.optionItem}
                    onPress={handleRemoveMember}
                  >
                    <Ionicons name="exit" size={24} color="#FF3B30" />
                    <Text style={[styles.optionText, styles.removeText]}>
                      Rời nhóm
                    </Text>
                  </TouchableOpacity>
                )}
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelOption}
              onPress={() => {
                setShowMemberOptionsModal(false);
                setSelectedMember(null);
              }}
            >
              <Text style={styles.cancelOptionText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      {/* Delete Confirmation Modal - Cross Platform Solution */}
      <Modal
        visible={showDeleteConfirmModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeleteConfirmModal(false)}
      >
        <View style={styles.modalCenteredOverlay}>
          <View style={styles.deleteModalContent}>
            <View style={styles.deleteModalHeader}>
              <Text style={styles.deleteModalTitle}>Xác nhận xóa nhóm</Text>
            </View>

            <View style={styles.deleteModalBody}>
              <Text style={styles.deleteModalText}>
                Nhập "Delete" để xác nhận xóa nhóm. Hành động này không thể hoàn tác.
              </Text>
              <TextInput
                style={styles.deleteConfirmInput}
                value={deleteConfirmText}
                onChangeText={setDeleteConfirmText}
                placeholder="Nhập Delete để xác nhận"
                autoCapitalize="none"
                autoFocus={true}
              />
            </View>

            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.cancelBtn]}
                onPress={() => setShowDeleteConfirmModal(false)}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  styles.deleteBtn,
                  deleteConfirmText !== 'Delete' && styles.disabledBtn
                ]}
                disabled={deleteConfirmText !== 'Delete'}
                onPress={handleFinalDeleteConfirmation}
              >
                <Text style={styles.deleteBtnText}>Xác nhận</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Message Overlay */}
      {showDeleteSuccessMessage && (
        <View style={styles.successMessageOverlay}>
          <View style={styles.successMessageContainer}>
            <Ionicons name="checkmark-circle" size={60} color="#4CD964" />
            <Text style={styles.successMessageText}>Xóa nhóm thành công</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1FAEEB',
    paddingVertical: 10,
    paddingHorizontal: 15,
    height: 60,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    color: '#FDF8F8',
    fontSize: 18,
    fontWeight: '500',
    marginLeft: 10,
  },
  scrollContent: {
    padding: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666666',
  },
  groupInfoSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  groupAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0F0F0',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1FAEEB',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  groupName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000000',
  },
  editNameIcon: {
    marginLeft: 8,
    padding: 5,
  },
  editNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  nameInput: {
    fontSize: 18,
    fontWeight: '500',
    borderWidth: 1,
    borderColor: '#1FAEEB',
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    width: 200,
  },
  editNameButtons: {
    flexDirection: 'row',
    marginLeft: 10,
  },
  editNameButton: {
    padding: 5,
    marginHorizontal: 5,
  },
  memberCount: {
    fontSize: 14,
    color: '#666666',
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#1FAEEB',
    marginRight: 5,
  }, membersList: {
    maxHeight: 300,
  },
  memberSection: {
    marginBottom: 15,
  },
  memberSectionTitle: {
    fontSize: 14,
    color: '#666666',
    paddingHorizontal: 5,
    paddingVertical: 3,
    marginBottom: 5,
    fontWeight: '500',
  },
  nestedList: {
    maxHeight: null,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F0F0',
  },
  memberInfo: {
    flex: 1,
    marginLeft: 10,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberName: {
    fontSize: 16,
    color: '#000000',
  },
  currentUserLabel: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
  },
  memberRoleRow: {
    flexDirection: 'row',
    marginTop: 5,
  },
  roleBadge: {
    backgroundColor: '#1FAEEB',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 5,
  },
  coOwnerBadge: {
    backgroundColor: '#5AC8FB',
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  actionsContainer: {
    marginTop: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: '#FFF9F9',
    borderRadius: 10,
    marginBottom: 10,
  },
  actionButtonText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#FF3B30',
  },
  emptyListText: {
    textAlign: 'center',
    color: '#999999',
    padding: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: height * 0.8,
    paddingBottom: 34, // Safe area bottom inset
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '500',
  },
  closeButton: {
    padding: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    marginHorizontal: 15,
    marginVertical: 10,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
  },
  selectedFriendsContainer: {
    maxHeight: 50,
    marginHorizontal: 15,
    marginBottom: 10,
  },
  selectedFriendsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
  },
  selectedFriendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 8,
  },
  chipAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 5,
  },
  chipName: {
    fontSize: 14,
    maxWidth: 100,
  },
  chipRemove: {
    marginLeft: 5,
  },
  friendsList: {
    flex: 1,
    marginTop: 10,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedFriendItem: {
    backgroundColor: 'rgba(31, 174, 235, 0.1)',
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  friendInfo: {
    flex: 1,
    marginLeft: 10,
  },
  friendName: {
    fontSize: 16,
    color: '#000000',
  },
  friendPhone: {
    fontSize: 14,
    color: '#666666',
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedBox: {
    backgroundColor: '#1FAEEB',
    borderColor: '#1FAEEB',
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  actionBtn: {
    flex: 1,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginHorizontal: 5,
  },
  cancelBtn: {
    backgroundColor: '#F2F2F2',
  },
  cancelBtnText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '500',
  },
  addBtn: {
    backgroundColor: '#1FAEEB',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledBtn: {
    backgroundColor: '#CCCCCC',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },

  optionsModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Safe area bottom inset
  },
  memberDetailsHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  detailsAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F0F0',
    marginBottom: 10,
  },
  detailsName: {
    fontSize: 18,
    fontWeight: '500',
  },
  optionsList: {
    paddingVertical: 10,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  optionText: {
    fontSize: 16,
    marginLeft: 15,
  },
  removeText: {
    color: '#FF3B30',
  },
  cancelOption: {
    alignItems: 'center',
    paddingVertical: 15,
    marginTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  cancelOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1FAEEB',
  },

  // Modal ở giữa màn hình
  modalCenteredOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  // Style thông báo xóa nhóm thành công
  successMessageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  successMessageContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    width: '80%',
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  successMessageText: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: '500',
    color: '#333333',
    textAlign: 'center',
  },

  // Chỉnh lại style cho modal xóa nhóm
  deleteModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    width: '90%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  deleteModalHeader: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    alignItems: 'center',
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#000000',
  },
  deleteModalBody: {
    padding: 20,
  },
  deleteModalText: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 15,
    textAlign: 'center',
  },
  deleteConfirmInput: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
  },
  deleteModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  deleteBtn: {
    backgroundColor: '#FF3B30',
  },
  deleteBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default DetailGroupChatScreen;
