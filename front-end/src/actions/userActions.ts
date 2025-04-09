"use server";

const API_URL = process.env.NODE_PUBLIC_API_URL;

export async function updateProfile(phone: string, fullname: string, ismale: string, birthday: string) {
  try {
    const response = await fetch(`http://localhost:3000/user/${phone}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fullname,
        ismale,
        birthday,
      }),
    });
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