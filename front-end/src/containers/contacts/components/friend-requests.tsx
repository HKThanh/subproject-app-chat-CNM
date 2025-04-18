import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

import { toast } from "sonner";

import { getAuthToken } from "@/utils/auth-utils";
import { useSocketContext } from "@/socket/SocketContext";

interface FriendRequest {
  id: string;
  sender?: {
    id: string;
    fullname: string;
    urlavatar: string;
  };
  receiver?: {
    id: string;
    fullname: string;
    urlavatar: string;
  };
  createdAt: string;
}

export default function FriendRequests() {
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const { socket } = useSocketContext();

  useEffect(() => {
    fetchFriendRequests();
  }, []);

  const fetchFriendRequests = async () => {
    try {
      const token = await getAuthToken();

      // Fetch received requests
      const receivedResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/user/get-received-friend-requests`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const receivedData = await receivedResponse.json();
      if (receivedData.success) {
        setReceivedRequests(receivedData.data);
      }

      // Fetch sent requests
      const sentResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/user/get-sended-friend-requests`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const sentData = await sentResponse.json();
      if (sentData.success) {
        setSentRequests(sentData.data);
      }
    } catch (error) {
      toast.error("Không thể tải danh sách lời mời kết bạn");
    }
  };

  const handleFriendRequest = async (
    requestId: string,
    action: "ACCEPTED" | "DECLINED"
  ) => {
    try {
      const token = await getAuthToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/user/handle-friend-request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id: requestId, type: action }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success(
          action === "ACCEPTED" ? "Đã chấp nhận lời mời" : "Đã từ chối lời mời"
        );
        fetchFriendRequests(); // Refresh the lists
      }
    } catch (error) {
      toast.error("Không thể xử lý yêu cầu");
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("vi-VN");
  };

  return (
    <div className="h-full bg-gray-50">
      <div className="p-4">
        <h1 className="text-xl font-semibold mb-4">Lời mời kết bạn</h1>

        {/* Incoming requests section */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b">
            <h2 className="font-medium">Lời mời đã nhận</h2>
          </div>

          <div className="p-4 space-y-4">
            {receivedRequests.length === 0 ? (
              <p className="text-gray-500 text-center">Không có lời mời nào</p>
            ) : (
              receivedRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg"
                >
                  <Avatar className="w-10 h-10">
                    <img
                      src={request.sender?.urlavatar}
                      alt={request.sender?.fullname}
                    />
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">
                        {request.sender?.fullname}
                      </h3>
                      <span className="text-sm text-gray-500">
                        {formatTimestamp(request.createdAt)}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="secondary"
                        className="w-24"
                        onClick={() =>
                          handleFriendRequest(request.id, "DECLINED")
                        }
                      >
                        Từ chối
                      </Button>
                      <Button
                        className="w-24"
                        onClick={() =>
                          handleFriendRequest(request.id, "ACCEPTED")
                        }
                      >
                        Đồng ý
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sent requests section */}
        <div className="bg-white rounded-lg shadow-sm mt-4">
          <div className="p-4 border-b">
            <h2 className="font-medium">Lời mời đã gửi</h2>
          </div>
          <div className="p-4 space-y-4">
            {sentRequests.length === 0 ? (
              <p className="text-gray-500 text-center">Chưa gửi lời mời nào</p>
            ) : (
              sentRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg"
                >
                  <Avatar className="w-10 h-10">
                    <img
                      src={request.receiver?.urlavatar}
                      alt={request.receiver?.fullname}
                    />
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">
                        {request.receiver?.fullname}
                      </h3>
                      <span className="text-sm text-gray-500">
                        {formatTimestamp(request.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
