# Socket Events Documentation

## 1. User Online (handleUserOnline)
*Event: "new_user_connect"
input:
{
    "phone": "0342287853"
}
output:
{
    "message": "Connected successfully",
    "socketId": "socket123"
}

## 2. Load Conversations (handleLoadConversation)
*Event: "load_conversations"
input:
{
    "IDUser": "0342287853",
    "lastEvaluatedKey": 0
}
output:
{
    "Items": [
        {
            "idConversation": "conv123",
            "idSender": "0342287853",
            "idReceiver": "0987654321",
            "lastMessage": "Hello",
            "lastChange": "2024-01-07T10:15:30.000Z"
        }
    ],
    "LastEvaluatedKey": 10
}

## 3. Send File (handleSendFile)
*Event: "send_message" (với file)
input:
{
    "IDSender": "0342287853",
    "IDConversation": "conv123",
    "fileList": [
        {
            "mimeType": "image/jpeg",
            "content": "(base64 string)",
            "fileName": "image.jpg"
        }
    ]
}
output:
{
    "IDMessageDetail": "msg124",
    "IDSender": "0342287853",
    "IDConversation": "conv123",
    "type": "file",
    "content": "https://s3.amazonaws.com/imagetintin/image.jpg",
    "dateTime": "2024-01-07T10:16:30.000Z"
}

## 4. Send Message (handleSendMessage)
*Event: "send_message"
input:
{
    "IDSender": "0342287853",
    "IDConversation": "conv123",
    "textMessage": "Hello!"
}
output:
{
    "IDMessageDetail": "msg123",
    "IDSender": "0342287853",
    "IDConversation": "conv123",
    "type": "text",
    "content": "Hello!",
    "dateTime": "2024-01-07T10:15:30.000Z"
}

## 5. Delete Message (handleDeleteMessage)
*Event: "delete_message"
input:
{
    "idMessage": "msg123",
    "idSender": "0342287853"
}
output:
{
    "messageId": "msg123",
    "updatedMessage": {
        "isRemove": true
    }
}

## 6. Recall Message (handleRecallMessage)
*Event: "recallMessage"
input:
{
    "IDMessageDetail": "msg123"
}
output:
{
    "IDMessageDetail": "msg123",
    "isRecall": true,
    "content": "Tin nhắn đã được thu hồi"
}

## 7. Forward Message (handleForwardMessage)
*Event: "forward_message"
input:
{
    "IDMessageDetail": "msg123",
    "IDConversation": "conv456"
}
output:
{
    "IDMessageDetail": "msg125",
    "IDConversation": "conv456",
    "type": "forward",
    "content": "Forwarded message content",
    "originalMessage": {
        "IDMessageDetail": "msg123"
    }
}

## 8. Load Messages (handleLoadMessages)
*Event: "load_messages"
input:
{
    "IDConversation": "conv123",
    "lastMessageId": "msg120",
    "limit": 20
}
output:
{
    "messages": [
        {
            "IDMessageDetail": "msg119",
            "IDSender": "0342287853",
            "content": "Hello!",
            "type": "text",
            "dateTime": "2024-01-07T10:14:30.000Z"
        }
    ],
    "hasMore": true,
    "conversationId": "conv123"
}

## 9. Mark Messages Read (handleMarkMessagesRead)
*Event: "mark_messages_read"
input:
{
    "messageIds": ["msg123", "msg124"],
    "conversationId": "conv123"
}
output:
{
    "success": true,
    "updatedMessages": [
        {
            "IDMessageDetail": "msg123",
            "isRead": true,
            "readAt": "2024-01-07T10:20:30.000Z"
        },
        {
            "IDMessageDetail": "msg124",
            "isRead": true,
            "readAt": "2024-01-07T10:20:30.000Z"
        }
    ]
}

## Lưu ý:
1. Tất cả các events đều có thể emit lỗi với format:
```json
{
    "message": "Mô tả lỗi",
    "error": "ERROR_CODE"
}
```

2. File Upload:
   - Images: jpg, jpeg, png, gif (max: 5MB)
   - Videos: mp4, mov (max: 10MB)
   - Documents: pdf, doc, docx (max: 10MB)

3. Messages:
   - Thu hồi tin nhắn chỉ có thể thực hiện trong vòng 5 phút
   - Forward message giữ nguyên type và content của tin nhắn gốc
   - Load messages sử dụng pagination với limit mặc định là 20