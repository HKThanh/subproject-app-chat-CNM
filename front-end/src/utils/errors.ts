/* eslint-disable @typescript-eslint/no-explicit-any */
import { AuthError } from "next-auth";

export class CustomAuthError extends AuthError {
  static type: string;

  constructor(message?: any) {
    super();

    this.type = message;
  }
}

export class InvalidPhonePasswordError extends AuthError {
  static type = "phone/Password không hợp lệ";
}
export class AccountIsLoggedError extends AuthError {
  static type = "Tài khoản đang đăng nhập";
}
export class AccountNotActivatedError extends AuthError {
  static type = "Tài khoản chưa được kích hoạt";
  _id: string;

  constructor(_id: string = "") {
    super("Account not activated");
    this.name = "AccountNotActivatedError";
    this._id = _id;
  }
}
export class ServerError extends AuthError {
  static type = "Đã xảy ra lỗi từ server";
}
export class PhoneAlreadyExistsError extends AuthError {
  static type = "Phone đã tồn tại";
}
