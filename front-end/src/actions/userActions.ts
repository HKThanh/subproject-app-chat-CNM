"use client";

/**
 * Cập nhật thông tin cá nhân của người dùng
 */
export async function updateProfile(phone: string, fullname: string, ismale: string, birthday: string, bio: string, token?: string) {
  try {
    // Sử dụng token được truyền vào hoặc lấy từ session/zustand trong component
    if (!token) {
      throw new Error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
    }

    const response = await fetch(`http://localhost:3000/user/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        phone,
        fullname,
        ismale,
        birthday,
        bio
      }),
    });
    console.log("check response in user action>> ", response);
    if (!response.ok) {
      throw new Error('Failed to update profile');
    }

    const data = await response.json();
    console.log("check data in update profile>>> ", data);

    if (data.message === "Cập nhật thông tin thành công") {
        return {
            success: true,
            message: data.message,
            user: {
                ...data.user,
                bio: data.user.bio || '',
                urlavatar: data.user.urlavatar || '',
                coverPhoto: data.user.coverPhoto || '',
                ismale: data.user.ismale === "true" || data.user.ismale === true
            }
        };
    }

    throw new Error('Unexpected response format');
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return {
      success: false,
      error: error.message || 'Failed to update profile'
    };
  }
}

/**
 * Cập nhật avatar của người dùng
 * @param avatarFile File ảnh avatar
 * @param token Token xác thực
 */
export async function updateAvatar(avatarFile: File, token?: string) {
  try {
    // Sử dụng token được truyền vào hoặc lấy từ session/zustand trong component
    if (!token) {
      throw new Error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
    }

    // Tạo FormData để gửi file
    const formData = new FormData();
    formData.append('avatar', avatarFile);

    console.log('Sending avatar with token:', token);

    const response = await fetch(`http://localhost:3000/user/avatar/upload`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    const data = await response.json();
    console.log("check data in update avatar>>> ", data);

    if (!response.ok) {
      throw new Error('Failed to update avatar');
    }


    if (data.message === "Cập nhật avatar thành công") {
      return {
        success: true,
        message: data.message,
        avatarUrl: data.avatarUrl || '',
        user: data.user || null
      };
    }

    throw new Error('Unexpected response format');
  } catch (error: any) {
    console.error('Error updating avatar:', error);
    return {
      success: false,
      error: error.message || 'Failed to update avatar'
    };
  }
}

/**
 * Cập nhật ảnh bìa của người dùng
 * @param coverFile File ảnh bìa
 * @param token Token xác thực
 */
export async function updateCoverPhoto(coverFile: File, token?: string) {
  try {
    // Sử dụng token được truyền vào hoặc lấy từ session/zustand trong component
    if (!token) {
      throw new Error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.');
    }

    // Tạo FormData để gửi file
    const coverPhoto = new FormData();
    coverPhoto.append('coverPhoto', coverFile);

    console.log('Sending cover with token:', token);

    const response = await fetch(`http://localhost:3000/user/cover/upload`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: coverPhoto,
    });

    if (!response.ok) {
      throw new Error('Failed to update cover photo');
    }

    const data = await response.json();
    console.log("check data in update cover>>> ", data);

    if (data.message === "Cập nhật cover photo thành công") {
      return {
        success: true,
        message: data.message,
        coverUrl: data.coverUrl || '',
        user: data.user || null
      };
    }

    throw new Error('Unexpected response format');
  } catch (error: any) {
    console.error('Error updating cover photo:', error);
    return {
      success: false,
      error: error.message || 'Failed to update cover photo'
    };
  }
}