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
    console.log("check response in update profile>>> ", response);
    if (!response.ok) {
      throw new Error('Failed to update profile');
    }

    const data = await response.json();
    
    if (data.message === "Cập nhật thông tin thành công") {
        
      return { 
        success: true, 
        message: data.message,
        user: data.user 
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