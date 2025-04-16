import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface FriendRequest {
  id: string;
  name: string;
  avatar: string;
  message: string;
  timestamp: string;
}

export default function FriendRequests() {
  // Mock data - should be moved to a separate service/hook later
  const incomingRequests: FriendRequest[] = [
    {
      id: "1",
      name: "Tài Phạm",
      avatar: "https://example.com/avatar1.jpg",
      message: "Xin chào, tôi là Tài Phạm",
      timestamp: "16/01",
    },
    {
      id: "2",
      name: "Gió Đà Lạt",
      avatar: "https://example.com/avatar2.jpg",
      message: "",
      timestamp: "Vài giây",
    },
  ];

  return (
    <div className="h-full bg-gray-50">
      <div className="p-4">
        <h1 className="text-xl font-semibold mb-4">Lời mời kết bạn</h1>

        {/* Incoming requests section */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b">
            <h2 className="font-medium">Lời mời đã nhận (1)</h2>
          </div>

          <div className="p-4 space-y-4">
            {incomingRequests.map((request) => (
              <div
                key={request.id}
                className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg"
              >
                <Avatar className="w-10 h-10">
                  <img src={request.avatar} alt={request.name} />
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{request.name}</h3>
                    <span className="text-sm text-gray-500">
                      {request.timestamp}
                    </span>
                  </div>
                  {request.message && (
                    <p className="text-sm text-gray-600 mt-1">
                      {request.message}
                    </p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <Button variant="secondary" className="w-24">
                      Từ chối
                    </Button>
                    <Button className="w-24">Đồng ý</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sent requests section */}
        <div className="bg-white rounded-lg shadow-sm mt-4">
          <div className="p-4 border-b">
            <h2 className="font-medium">Lời mời đã gửi (1)</h2>
          </div>
          {/* Add sent requests content here */}
        </div>

        {/* Suggested friends section */}
        <div className="bg-white rounded-lg shadow-sm mt-4">
          <div className="p-4 border-b">
            <h2 className="font-medium">Gợi ý kết bạn (4)</h2>
          </div>
          {/* Add suggested friends content here */}
        </div>
      </div>
    </div>
  );
}
