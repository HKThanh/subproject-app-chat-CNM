db = db.getSiblingDB("chat-app");
db.dropDatabase(); // Drop the database if it exists
db.createCollection("users");

db.users.insertMany([
    {
        "id": "user001",
        "username": "example@gmail.com",
        "password": "$2a$10$UxRwIISgdFaytqp50HUEFOKShlFU93yyqqJX4jFDiCB4iF4.wJU0m",
        "fullname": "John Doe",
        "ismale": true,
        "isLoggedin": false,
        "isVerified": true,
        "email": "example@gmail.com",
        "bio": "Hello, I am John!",
        "coverPhoto": "",
        "phone": "0912345678",
        "urlavatar": "https://example.com/avatars/john.jpg",
        "birthday": "1990-05-15",
        "bio": "",
        "coverPhoto": "",
        "friendList": ["user003"],
        "createdAt": "2025-04-02T10:00:00Z",
        "updatedAt": "2025-04-02T10:00:00Z"
    },
    {
        "id": "user002",
        "username": "jane.smith@gmail.com",
        "password": "$2a$10$UxRwIISgdFaytqp50HUEFOKShlFU93yyqqJX4jFDiCB4iF4.wJU0m",
        "fullname": "Jane Smith",
        "ismale": false,
        "isLoggedin": true,
        "isVerified": true,
        "email": "jane.smith@example.com",
        "bio": "Loving life and coding!",
        "coverPhoto": "https://example.com/covers/jane.jpg",
        "phone": "0987654321",
        "urlavatar": "https://example.com/avatars/jane.jpg",
        "birthday": "1992-08-25",
        "friendList": ["user003"],
        "createdAt": "2025-04-02T11:00:00Z",
        "updatedAt": "2025-04-02T11:00:00Z"
    },
    {
        "id": "user003",
        "username": "alice.johnson@example.com",
        "password": "$2a$10$UxRwIISgdFaytqp50HUEFOKShlFU93yyqqJX4jFDiCB4iF4.wJU0m",
        "fullname": "Alice Johnson",
        "ismale": false,
        "isLoggedin": false,
        "isVerified": true,
        "email": "alice.johnson@example.com",
        "bio": "Exploring the world one step at a time.",
        "coverPhoto": "https://example.com/covers/alice.jpg",
        "phone": "0933445566",
        "urlavatar": "https://example.com/avatars/alice.jpg",
        "birthday": "1988-12-10",
        "friendList": ["user002", "user001"],
        "createdAt": "2025-04-02T12:00:00Z",
        "updatedAt": "2025-04-02T12:00:00Z"
    }
])

db.createCollection("friendrequests");
db.friendrequests.insertMany([
    {
        "id": "request001",
        "senderId": "user001",
        "receiverId": "user002",
        "status": "PENDING",
        "createdAt": "2025-04-02T10:00:00Z",
        "updatedAt": "2025-04-02T10:00:00Z"
    },
    {
        "id": "request002",
        "senderId": "user002",
        "receiverId": "user003",
        "status": "ACCEPTED",
        "createdAt": "2025-04-02T12:30:00Z",
        "updatedAt": "2025-04-02T12:30:00Z"
    },
    {
        "id": "request003",
        "senderId": "user003",
        "receiverId": "user001",
        "status": "DECLINED",
        "createdAt": "2025-04-02T15:15:00Z",
        "updatedAt": "2025-04-02T15:15:00Z"
    }
])
