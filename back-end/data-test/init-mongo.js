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
        "blockedUsers": [""],
        "createdAt": "2025-04-02T10:00:00Z",
        "updatedAt": "2025-04-02T10:00:00Z"
    },
    {
        "id": "user002",
        "username": "jane.smith@example.com",
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
        "blockedUsers": ["user001"],
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
        "blockedUsers": [""],
        "createdAt": "2025-04-02T12:00:00Z",
        "updatedAt": "2025-04-02T12:00:00Z"
    },
    {
        "id": "user004",
        "username": "test4@example.com",
        "password": "$2a$10$UxRwIISgdFaytqp50HUEFOKShlFU93yyqqJX4jFDiCB4iF4.wJU0m",
        "fullname": "Alice Johnson",
        "ismale": false,
        "isLoggedin": false,
        "isVerified": true,
        "email": "test4@example.com",
        "bio": "Exploring the world one step at a time.",
        "coverPhoto": "https://example.com/covers/alice.jpg",
        "phone": "0933445566",
        "urlavatar": "https://example.com/avatars/alice.jpg",
        "birthday": "1988-12-10",
        "friendList": [""],
        "blockedUsers": [""],
        "createdAt": "2025-04-02T12:00:00Z",
        "updatedAt": "2025-04-02T12:00:00Z"
    },
    {
        "id": "user005",
        "username": "example5@gmail.com",
        "password": "$2a$10$UxRwIISgdFaytqp50HUEFOKShlFU93yyqqJX4jFDiCB4iF4.wJU0m",
        "fullname": "Nguyễn Văn Thành",
        "ismale": true,
        "isLoggedin": false,
        "isVerified": true,
        "email": "example5@gmail.com",
        "bio": "Kỹ sư phần mềm tại Sài Gòn",
        "coverPhoto": "https://example.com/covers/thanh.jpg",
        "phone": "0912345679",
        "urlavatar": "https://example.com/avatars/thanh.jpg",
        "birthday": "1992-06-15",
        "friendList": ["user001", "user003"],
        "blockedUsers": ["user002"],
        "createdAt": "2025-04-04T10:00:00Z",
        "updatedAt": "2025-04-04T10:00:00Z"
    },
    {
        "id": "user006",
        "username": "example6@gmail.com",
        "password": "$2a$10$UxRwIISgdFaytqp50HUEFOKShlFU93yyqqJX4jFDiCB4iF4.wJU0m",
        "fullname": "Trần Thị Hương",
        "ismale": false,
        "isLoggedin": true,
        "isVerified": true,
        "email": "example6@gmail.com",
        "bio": "Giáo viên tiếng Anh tại Hà Nội",
        "coverPhoto": "https://example.com/covers/huong.jpg",
        "phone": "0987654322",
        "urlavatar": "https://example.com/avatars/huong.jpg",
        "birthday": "1994-09-25",
        "friendList": ["user002", "user004"],
        "blockedUsers": ["user001"],
        "createdAt": "2025-04-04T11:00:00Z",
        "updatedAt": "2025-04-04T11:00:00Z"
    },
    {
        "id": "user007",
        "username": "example7@gmail.com",
        "password": "$2a$10$UxRwIISgdFaytqp50HUEFOKShlFU93yyqqJX4jFDiCB4iF4.wJU0m",
        "fullname": "Lê Minh Hoàng",
        "ismale": true,
        "isLoggedin": false,
        "isVerified": true,
        "email": "example7@gmail.com",
        "bio": "Nhiếp ảnh gia chuyên nghiệp tại Đà Nẵng",
        "coverPhoto": "https://example.com/covers/hoang.jpg",
        "phone": "0933445567",
        "urlavatar": "https://example.com/avatars/hoang.jpg",
        "birthday": "1989-12-12",
        "friendList": ["user001", "user005"],
        "blockedUsers": ["user003"],
        "createdAt": "2025-04-04T12:00:00Z",
        "updatedAt": "2025-04-04T12:00:00Z"
    },
    {
        "id": "user008",
        "username": "example8@gmail.com",
        "password": "$2a$10$UxRwIISgdFaytqp50HUEFOKShlFU93yyqqJX4jFDiCB4iF4.wJU0m",
        "fullname": "Phạm Thị Mai Anh",
        "ismale": false,
        "isLoggedin": true,
        "isVerified": true,
        "email": "example8@gmail.com",
        "bio": "Chuyên viên marketing tại TP HCM",
        "coverPhoto": "https://example.com/covers/maianh.jpg",
        "phone": "0977889911",
        "urlavatar": "https://example.com/avatars/maianh.jpg",
        "birthday": "1995-03-08",
        "friendList": ["user006", "user002"],
        "blockedUsers": ["user004"],
        "createdAt": "2025-04-04T13:00:00Z",
        "updatedAt": "2025-04-04T13:00:00Z"
    },
    {
        "id": "user009",
        "username": "example9@gmail.com",
        "password": "$2a$10$UxRwIISgdFaytqp50HUEFOKShlFU93yyqqJX4jFDiCB4iF4.wJU0m",
        "fullname": "Vũ Đức Minh",
        "ismale": true,
        "isLoggedin": false,
        "isVerified": true,
        "email": "example9@gmail.com",
        "bio": "Kỹ sư cầu đường tại Hải Phòng",
        "coverPhoto": "https://example.com/covers/minh.jpg",
        "phone": "0911223344",
        "urlavatar": "https://example.com/avatars/minh.jpg",
        "birthday": "1991-07-20",
        "friendList": ["user005", "user007"],
        "blockedUsers": ["user002", "user008"],
        "createdAt": "2025-04-04T14:00:00Z",
        "updatedAt": "2025-04-04T14:00:00Z"
    },
    {
        "id": "user010",
        "username": "example10@gmail.com",
        "password": "$2a$10$UxRwIISgdFaytqp50HUEFOKShlFU93yyqqJX4jFDiCB4iF4.wJU0m",
        "fullname": "Hoàng Thị Lan",
        "ismale": false,
        "isLoggedin": true,
        "isVerified": true,
        "email": "example10@gmail.com",
        "bio": "Bác sĩ tại bệnh viện Bạch Mai, Hà Nội",
        "coverPhoto": "https://example.com/covers/lan.jpg",
        "phone": "0966778899",
        "urlavatar": "https://example.com/avatars/lan.jpg",
        "birthday": "1988-11-12",
        "friendList": ["user003", "user008", "user004"],
        "blockedUsers": ["user009"],
        "createdAt": "2025-04-04T15:00:00Z",
        "updatedAt": "2025-04-04T15:00:00Z"
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
    },
    {
        "id": "request004",
        "senderId": "user005",
        "receiverId": "user004",
        "status": "PENDING",
        "createdAt": "2025-04-04T10:30:00Z",
        "updatedAt": "2025-04-04T10:30:00Z"
    },
    {
        "id": "request005",
        "senderId": "user007",
        "receiverId": "user006",
        "status": "ACCEPTED",
        "createdAt": "2025-04-04T11:45:00Z",
        "updatedAt": "2025-04-04T12:15:00Z"
    },
    {
        "id": "request006",
        "senderId": "user004",
        "receiverId": "user009",
        "status": "DECLINED",
        "createdAt": "2025-04-04T13:20:00Z",
        "updatedAt": "2025-04-04T14:05:00Z"
    },
    {
        "id": "request007",
        "senderId": "user008",
        "receiverId": "user007",
        "status": "PENDING",
        "createdAt": "2025-04-05T09:10:00Z",
        "updatedAt": "2025-04-05T09:10:00Z"
    },
    {
        "id": "request008",
        "senderId": "user006",
        "receiverId": "user005",
        "status": "ACCEPTED",
        "createdAt": "2025-04-05T10:25:00Z",
        "updatedAt": "2025-04-05T11:00:00Z"
    },
    {
        "id": "request009",
        "senderId": "user010",
        "receiverId": "user001",
        "status": "PENDING",
        "createdAt": "2025-04-05T13:40:00Z",
        "updatedAt": "2025-04-05T13:40:00Z"
    },
    {
        "id": "request010",
        "senderId": "user009",
        "receiverId": "user010",
        "status": "DECLINED",
        "createdAt": "2025-04-06T08:15:00Z",
        "updatedAt": "2025-04-06T09:30:00Z"
    },
    {
        "id": "request011",
        "senderId": "user001",
        "receiverId": "user008",
        "status": "PENDING",
        "createdAt": "2025-04-06T14:25:00Z",
        "updatedAt": "2025-04-06T14:25:00Z"
    },
    {
        "id": "request012",
        "senderId": "user003",
        "receiverId": "user007",
        "status": "ACCEPTED",
        "createdAt": "2025-04-07T10:50:00Z",
        "updatedAt": "2025-04-07T11:20:00Z"
    },
    {
        "id": "request013",
        "senderId": "user008",
        "receiverId": "user003",
        "status": "PENDING",
        "createdAt": "2025-04-10T09:15:00Z",
        "updatedAt": "2025-04-10T09:15:00Z"
    },
    {
        "id": "request014",
        "senderId": "user004",
        "receiverId": "user007",
        "status": "ACCEPTED",
        "createdAt": "2025-04-11T15:30:00Z",
        "updatedAt": "2025-04-11T16:05:00Z"
    },
    {
        "id": "request015",
        "senderId": "user005",
        "receiverId": "user010",
        "status": "DECLINED",
        "createdAt": "2025-04-12T11:20:00Z",
        "updatedAt": "2025-04-12T13:40:00Z"
    }
])
