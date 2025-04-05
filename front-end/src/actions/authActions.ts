// actions/login.ts
"use server";

import { redirect } from "next/dist/server/api-utils";

import { auth, signIn } from "@/auth";
// import { authApi } from "@/lib/api/authApi";

// actions/login.ts

// actions/login.ts
const API_URL = process.env.NODE_PUBLIC_API_URL;

export async function loginUser(phone: string, password: string) {
  try {
    // First attempt to sign in
    const result = await signIn("credentials", {
      phone,
      password,
      redirect: false, // Không redirect tự động, xử lý bằng FE
    });
    // If login successful, get session to check user role
    // const session = await auth();
    // // console.log("check session in action>>> ", session);

    // // Redirect based on user role
    // if (session?.user?.role === "ADMIN") {
    //   return {
    //     error: false,
    //     success: true,
    //     message: "Đăng nhập thành công!",
    //     redirectTo: "/admin",
    //     status: 200,
    //   };
    // }

    // Default successful login response
    return {
      error: false,
      success: true,
      message: "Đăng nhập thành công!",
      redirectTo: "/",
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
  phone: string,
  password: string,
  name: string,
) {
  try {
    const result = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone, password, name }),
    }).then(res => res.json());
    console.log("check result in register>>> ", result);
    
    // Nếu thành công, trả về thông tin để FE xử lý chuyển hướng
    if (result.message === "Tài khoản đã có người đăng ký") {
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
