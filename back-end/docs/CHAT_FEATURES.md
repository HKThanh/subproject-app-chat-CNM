# Chat Application Features Documentation

## Socket Controller Features (socketController.js)

### 1. Quản lý User Online
```javascript
handleUserOnline(socket)
```
- **Socket Event:** `new_user_connect`
- **Payload:** 
  ```json
  {
    "phone": "user_phone"
  }
  ```
- **Usage:** Theo dõi trạng thái online của user, lưu socketId

### 2. Gửi Tin Nhắn Text
```javascript
handleSendMessage(io, socket)
```
- **Socket Event:** `send_message`
- **Payload:**
  ```json
  {
    "IDSender": "sender_phone",
    "IDConversation": "conversation_id", 
    "textMessage": "Nội dung tin nhắn"
  }
  ```
- **Response Event:** `receive_message`
- **Usage:** Xử lý gửi tin nhắn text giữa 2 user

### 3. Thu Hồi Tin Nhắn
```javascript
handleChangeStateMessage(io, socket)
```
- **Socket Event:** `recallMessage`
- **Payload:**
  ```json
  {
    "IDMessageDetail": "message_id"
  }
  ```
- **Response Event:** `changeStateMessage`
- **Usage:** Thu hồi tin nhắn đã gửi

### 4. Trả Lời Tin Nhắn
```javascript
handleReplyMessage(io, socket)
```
- **Socket Event:** `reply_message`
- **Payload:**
  ```json
  {
    "IDConversation": "conversation_id",
    "IDUser": "user_id",
    "IDReplyMessage": "message_id_being_replied",
    "content": "Nội dung trả lời"
  }
  ```
- **Response Event:** `receive_message`
- **Usage:** Trả lời một tin nhắn cụ thể

## Message Detail Controller (MessageDetailController.js)

### 1. Tạo Tin Nhắn Mới
```javascript
createNewMessage(messageData)
```
- **Input:** Object chứa thông tin tin nhắn (IDSender, IDConversation, content, type)
- **Output:** Object tin nhắn mới được tạo
- **Usage:** Tạo bản ghi tin nhắn mới trong database

### 2. Lấy Chi Tiết Tin Nhắn
```javascript
getMessagesDetailByID(IDMessageDetail)
```
- **Input:** ID của tin nhắn
- **Output:** Thông tin chi tiết của tin nhắn
- **Usage:** Lấy thông tin một tin nhắn cụ thể

## Bucket Message Controller (BucketMessageController.js)

### 1. Quản Lý Bucket Tin Nhắn
```javascript
createNewMessageBucket()
```
- **Output:** 
  ```json
  {
    "IDMessageBucket": "uuid",
    "listIDMessageDetail": [],
    "IDNextBucket": ""
  }
  ```
- **Usage:** Tạo bucket mới để lưu trữ tin nhắn

### 2. Cập Nhật Bucket
```javascript
updateMessageBucket(bucket)
```
- **Input:** Object bucket cần update
- **Output:** Bucket đã được cập nhật
- **Usage:** Cập nhật thông tin bucket tin nhắn

## Lưu ý Quan Trọng

1. **Cấu Trúc Tin Nhắn:**
   - Mỗi tin nhắn có một ID duy nhất (UUID)
   - Lưu trữ theo bucket để tối ưu hiệu suất
   - Hỗ trợ các loại tin nhắn: text, reply

2. **Real-time Communication:**
   - Sử dụng Socket.IO cho real-time messaging
   - Mỗi user được track qua socketId
   - Tự động join vào room tương ứng với conversation

3. **Xử Lý Tin Nhắn:**
   - Tin nhắn được lưu vào database trước khi gửi
   - Hỗ trợ thu hồi tin nhắn (recall)
   - Có thể trả lời tin nhắn cụ thể

4. **Performance:**
   - Sử dụng bucket để phân trang tin nhắn
   - Mỗi bucket chứa một số lượng tin nhắn nhất định
   - Liên kết các bucket qua IDNextBucket