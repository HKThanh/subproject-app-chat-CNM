// actions/login.ts
"use server";

import { redirect } from "next/dist/server/api-utils";

import { auth, signIn } from "@/auth";
// import { authApi } from "@/lib/api/authApi";

// actions/login.ts

// actions/login.ts
const API_URL = process.env.NODE_PUBLIC_API_URL;

export async function loginUser(email: string, password: string) {
  try {
    // First attempt to sign in
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false, // Không redirect tự động, xử lý bằng FE
    });

    // Default successful login response
    return {
      error: false,
      success: true,
      message: "Đăng nhập thành công!",
      redirectTo: "/chat",
      status: 200,
    };
  } catch (error: any) {

    // Handle specific error types
    if (error.name === "AccountNotActivatedError") {
      // Try to get user ID from error or response
      const userId = error.userId || error._id;
      return {
        error: true,
        success: false,
        message:
          "Tài khoản chưa được kích hoạt. Vui lòng xác thực email của bạn.",
        status: 401,
        redirectTo: `/verify/${userId}`,
      };
    } else if (error.name === "InvalidPhonePasswordError") {

      return {
        error: true,
        success: false,
        message: "Email hoặc mật khẩu không chính xác.",
        status: 400,
      };
    }

    // Generic error response
    return {
      error: true,
      success: false,
      message: "Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.",
      status: 500,
    };
  }
}

export async function signUpUser(
  email: string,
  password: string,
  fullname: string,
  otp: string,
) {
  try {
    const result = await fetch(`${API_URL}/auth/register-web`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, fullname, otp }),
    }).then(res => res.json());
    console.log("check result in register>>> ", result);

    // Nếu thành công, trả về thông tin để FE xử lý chuyển hướng
    if (result.message === "Người dùng đã tồn tại") {
        return {
          error: true,
          success: false,
          message: result.message,
          status: 400,
        };
    }
    if(result.message === 'OTP đã hết hạn'){
      return {
        error: true,
        success: false,
        message: result.message,
        status: 400,
      }
    }
    if (result.message === "OTP không hợp lệ") {
      return {
        error: true,
        success: false,
        message: result.message,
        status: 400,
      };
    }
    return {
      error: false,
      success: true,
      message: "",
      // redirectTo: `/verify/${result.data._id}`,
      redirectTo: `/auth/login`,
      data: result.data,
      status: 200,
    };
  } catch (error) {
    console.error("Sign up error:", error)
    return {
      error: true,
      success: false,
      message: "Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.",
      status: 500,
    };
  }
}
export async function sendOtp(email: string) {
  try {
    const result = await fetch(`${API_URL}/auth/request-otp-web`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    }).then(res => res.json());
    console.log("check result in send otp>>> ", result);
    if (result.message === 'Người dùng đã tồn tại'){
      return {
        error: true,
        success: false,
        message: result.message,
        status: 400,
      };
    }
    return result;
  } catch (error) {
    console.error("Send OTP error:", error);
    return {
      error: true,
      success: false,
      message: "Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.",
      status: 500,
    };
  }
}
// export async function verifyUser(id: string, otp: string) {
//   try {
//     const result = await authApi.verifyOTP(id, otp);

//     // Nếu thành công, trả về thông tin để FE xử lý chuyển hướng
//     if (result.error) {
//       if (result.statusCode === 400) {
//         return result;
//       }
//       return result;
//     }
//     return {
//       error: false,
//       success: true,
//       message: "Xác thực thành công!",
//       redirectTo: `/auth/login`,
//       data: result.data,
//       status: 200,
//     };
//   } catch (error) {
//     return {
//       error: true,
//       success: false,
//       message: "Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.",
//       status: 500,
//     };
//   }
// }
// export async function RefreshOTPUser(id: string) {
//   try {
//     const result = await authApi.refreshOTP(id);
//     // Nếu thành công, trả về thông tin để FE xử lý chuyển hướng
//     if (result.error) {
//       if (result.statusCode === 400) {
//         return {
//           error: true,
//           success: false,
//           message: result.message,
//           status: 400,
//         };
//       }
//       return {
//         error: true,
//         success: false,
//         message: "Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.",
//         status: 500,
//       };
//     }
//     return {
//       error: false,
//       success: true,
//       message: result.message,
//       data: result.data,
//       status: 200,
//     };
//   } catch (error) {
//     return {
//       error: true,
//       success: false,
//       message: "Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.",
//       status: 500,
//     };
//   }
// }
// export async function getDashboardData(
//   query: string = "",
//   current: number = 1,
//   pageSize: number = 10,
// ) {
//   try {
//     const session = await auth();

//     const accessToken = session?.accessToken;

//     const result = await authApi.getData(
//       accessToken || "",
//       query,
//       current,
//       pageSize,
//     );
//     console.log("check result in action >>>", result);

//     if (result.error) {
//       return {
//         error: true,
//         success: false,
//         message: result.message,
//         status: result.statusCode,
//       };
//     }

//     return {
//       error: false,
//       success: true,
//       message: "Lấy dữ liệu thành công",
//       data: result.data,
//       status: 200,
//     };
//   } catch (error) {
//     console.error("Dashboard data fetch error:", error);
//     return {
//       error: true,
//       success: false,
//       message: "Đã xảy ra lỗi khi lấy dữ liệu dashboard. Vui lòng thử lại sau.",
//       status: 500,
//     };
//   }
// }

export async function logoutUser(accessToken: string) {
  try {
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Đăng xuất thất bại');
    }

    const result = await response.json();

    return {
      error: false,
      success: true,
      message: result.message || "Đăng xuất thành công!",
      status: 200,
    };
  } catch (error) {
    console.error("Logout error:", error);
    return {
      error: true,
      success: false,
      message: "Đã xảy ra lỗi khi đăng xuất. Vui lòng thử lại sau.",
      status: 500,
    };
  }
}
