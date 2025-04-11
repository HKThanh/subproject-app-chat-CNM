# Chat Application API Documentation

## Authentication Endpoints

### 1. Request OTP
- **Endpoint:** `POST /auth/request-otp`
- **Description:** Gửi yêu cầu mã OTP để xác thực số điện thoại
- **Body:**
  ```json
  {
    "phone": "0123456789"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "OTP sent successfully"
  }
  ```
- **Usage:** Dùng khi user đăng ký/đăng nhập lần đầu

### 2. Verify OTP
- **Endpoint:** `POST /auth/verify-otp`
- **Body:**
  ```json
  {
    "phone": "0123456789",
    "otp": "123456"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "verified": true
  }
  ```
- **Usage:** Xác thực OTP người dùng nhập vào

### 3. Register
- **Endpoint:** `POST /auth/register`
- **Body:**
  ```json
  {
    "phone": "0123456789",
    "password": "hashedPassword",
    "name": "User Name"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "user": {
      "id": "uuid",
      "phone": "0123456789",
      "name": "User Name"
    }
  }
  ```
- **Usage:** Đăng ký tài khoản mới

## User Management

### 1. Update Profile
- **Endpoint:** `PUT /user/:phone/profile`
- **Body:**
  ```json
  {
    "name": "New Name",
    "bio": "User bio"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "user": {
      "phone": "0123456789",
      "name": "New Name",
      "bio": "User bio"
    }
  }
  ```
- **Usage:** Cập nhật thông tin cá nhân

### 2. Upload Avatar
- **Endpoint:** `PUT /user/:phone/avatar/upload`
- **Body:** FormData with 'avatar' file
- **Response:**
  ```json
  {
    "success": true,
    "avatarUrl": "https://s3-url/avatar.jpg"
  }
  ```
- **Usage:** Upload ảnh đại diện

## Message Management

### 1. Send Text Message
- **Socket Event:** `send_message`
- **Payload:**
  ```json
  {
    "IDSender": "sender_phone",
    "IDReceiver": "receiver_phone",
    "textMessage": "Hello!"
  }
  ```
- **Response Event:** `receive_message`
- **Usage:** Gửi tin nhắn văn bản

### 2. Send File Message
- **Socket Event:** `send_file`
- **Payload:**
  ```json
  {
    "idSender": "sender_phone",
    "idConversation": "conv_id",
    "file": {
      "type": "image/jpeg",
      "content": "base64_content",
      "fileName": "image.jpg"
    }
  }
  ```
- **Response Event:** `receive_message`
- **Usage:** Gửi file (ảnh, video, document)

### 3. Delete Message
- **Socket Event:** `delete_message`
- **Payload:**
  ```json
  {
    "idMessage": "message_id",
    "idSender": "sender_phone"
  }
  ```
- **Response Event:** `message_deleted`
- **Usage:** Xóa tin nhắn (chỉ xóa ở phía người xóa)

## Conversation Management

### 1. Get Conversations
- **Socket Event:** `load_conversations`
- **Payload:**
  ```json
  {
    "phone": "user_phone",
    "page": 1,
    "limit": 20
  }
  ```
- **Response Event:** `load_conversations_response`
- **Usage:** Lấy danh sách cuộc trò chuyện có phân trang

### 2. Create Group Chat
- **Socket Event:** `create_group`
- **Payload:**
  ```json
  {
    "idOwner": "owner_phone",
    "groupName": "Group Name",
    "groupAvatar": "base64_image",
    "members": ["phone1", "phone2"]
  }
  ```
- **Response Event:** `group_created`
- **Usage:** Tạo nhóm chat mới

### 3. Update Group Info
- **Socket Event:** `update_group`
- **Payload:**
  ```json
  {
    "idConversation": "conv_id",
    "updates": {
      "groupName": "New Name",
      "groupAvatar": "new_avatar_url"
    }
  }
  ```
- **Response Event:** `group_updated`
- **Usage:** Cập nhật thông tin nhóm

## File Storage (AWS S3)

### 1. File Upload Service
- **Description:** Dịch vụ upload file lên AWS S3
- **Supported Types:**
  - Images: jpg, jpeg, png, gif
  - Videos: mp4, mov
  - Documents: pdf, doc, docx
- **Size Limits:**
  - Avatar: 5MB
  - Message Files: 10MB
- **Bucket Structure:**
  - imagetintin: Lưu ảnh
  - videotintin: Lưu video
  - documenttintin: Lưu tài liệu

## Real-time Features

### 1. Online Status
- **Socket Event:** `new_user_connect`
- **Usage:** Theo dõi trạng thái online của users

### 2. Typing Indicator
- **Socket Events:**
  - `typing_start`
  - `typing_end`
- **Usage:** Hiển thị trạng thái đang nhập của users

## Error Handling

### Common Error Responses
```json
{
  "error": true,
  "message": "Error message",
  "code": "ERROR_CODE"
}
```

### Error Codes
- `AUTH_001`: Authentication failed
- `FILE_001`: File upload failed
- `MSG_001`: Message sending failed
- `CONV_001`: Conversation operation failed

## Notes
1. Tất cả timestamps sử dụng timezone Asia/Ho_Chi_Minh
2. File uploads được xử lý qua AWS S3
3. Real-time features sử dụng Socket.IO
4. Authentication sử dụng JWT tokens