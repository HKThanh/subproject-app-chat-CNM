db = db.getSiblingDB("chat-app");

db.createCollection("users");

db.users.insertMany([
    {
        "id": "0912345678",
        "username": "0912345678",
        "password": "$2a$10$UxRwIISgdFaytqp50HUEFOKShlFU93yyqqJX4jFDiCB4iF4.wJU0m",
        "fullname": "John Doe",
        "ismale": true,
        "isLoggedin": false,
        "email": "example@gmail.com",
        "bio": "Hello, I am John!",
        "coverPhoto": "",
        "phone": "0912345678",
        "urlavatar": "https://example.com/avatars/john.jpg",
        "birthday": "1990-05-15",
        "friendList": ["user002", "user003"],
        "createdAt": "2025-04-02T10:00:00Z",
        "updatedAt": "2025-04-02T10:00:00Z"
    },
    {
        "id": "0987654321",
        "username": "0987654321",
        "password": "$2a$10$UxRwIISgdFaytqp50HUEFOKShlFU93yyqqJX4jFDiCB4iF4.wJU0m",
        "fullname": "Jane Doe",
        "ismale": false,
        "isLoggedin": false,
        "email": "example1@gmail.com",
        "bio": "Hello, I am Jane!",
        "coverPhoto": "",
        "phone": "0987654321",
        "urlavatar": "https://example.com/avatars/jane.jpg",
        "birthday": "1992-08-22",
        "friendList": ["user001", "user004"],
        "createdAt": "2025-04-02T12:30:00Z",
        "updatedAt": "2025-04-02T12:30:00Z"
    },
    {
        "id": "0933445566",
        "username": "0933445566",
        "password": "$2a$10$UxRwIISgdFaytqp50HUEFOKShlFU93yyqqJX4jFDiCB4iF4.wJU0m",
        "fullname": "Bob Smith",
        "ismale": true,
        "isLoggedin": false,
        "email": "example2@gmail.com",
        "bio": "Hello, I am Bob!",
        "coverPhoto": "",
        "phone": "0933445566",
        "urlavatar": "https://example.com/avatars/bob.jpg",
        "birthday": "1988-12-01",
        "friendList": ["user001", "user005"],
        "createdAt": "2025-04-02T15:15:00Z",
        "updatedAt": "2025-04-02T15:15:00Z"
    },
    {
        "id": "0977889900",
        "username": "0977889900",
        "password": "$2a$10$UxRwIISgdFaytqp50HUEFOKShlFU93yyqqJX4jFDiCB4iF4.wJU0m",
        "fullname": "Alice Wong",
        "ismale": false,
        "isLoggedin": false,
        "email": "example3@gmail.com",
        "bio": "Hello, I am Alice!",
        "coverPhoto": "",
        "phone": "0977889900",
        "urlavatar": "https://example.com/avatars/alice.jpg",
        "birthday": "1995-03-10",
        "friendList": ["user002"],
        "createdAt": "2025-04-02T09:45:00Z",
        "updatedAt": "2025-04-02T09:45:00Z"
    },
    {
        "id": "0944556677",
        "username": "0944556677",
        "password": "$2a$10$UxRwIISgdFaytqp50HUEFOKShlFU93yyqqJX4jFDiCB4iF4.wJU0m",
        "fullname": "Mike Brown",
        "ismale": true,
        "isLoggedin": false,
        "email": "example4@gmail.com",
        "bio": "Hello, I am Mike!",
        "coverPhoto": "",
        "phone": "0944556677",
        "urlavatar": "https://example.com/avatars/mike.jpg",
        "birthday": "1993-07-25",
        "friendList": ["user003"],
        "createdAt": "2025-04-02T14:20:00Z",
        "updatedAt": "2025-04-02T14:20:00Z"
    }
])

db.createCollection("friendrequests");
db.friendrequests.insertMany([
    {
        "id": "request001",
        "senderId": "0912345678",
        "receiverId": "0987654321",
        "status": "PENDING",
        "createdAt": "2025-04-02T10:00:00Z",
        "updatedAt": "2025-04-02T10:00:00Z"
    },
    {
        "id": "request002",
        "senderId": "0987654321",
        "receiverId": "0933445566",
        "status": "ACCEPTED",
        "createdAt": "2025-04-02T12:30:00Z",
        "updatedAt": "2025-04-02T12:30:00Z"
    },
    {
        "id": "request003",
        "senderId": "0933445566",
        "receiverId": "0977889900",
        "status": "DECLINED",
        "createdAt": "2025-04-02T15:15:00Z",
        "updatedAt": "2025-04-02T15:15:00Z"
    }
])