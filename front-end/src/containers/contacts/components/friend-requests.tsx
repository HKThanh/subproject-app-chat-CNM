import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getAuthToken } from "@/utils/auth-utils";
import { useSocketContext } from "@/socket/SocketContext";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const { socket } = useSocketContext();

  useEffect(() => {
    fetchFriendRequests();
  }, []);

  useEffect(() => {
    if (!socket) return;

    // Lắng nghe khi có yêu cầu kết bạn mới
    socket.on("newFriendRequest", (data) => {
      const newRequest: FriendRequest = {
        id: data.requestId,
        sender: {
          id: data.sender.id,
          fullname: data.sender.fullname,
          urlavatar: data.sender.urlavatar,
        },
        createdAt: new Date().toISOString(),
      };
      setReceivedRequests((prev) => [newRequest, ...prev]);
    });

    // Lắng nghe khi có người hủy lời mời kết bạn
    socket.on("friendRequestCancelled", (response) => {
      if (response.success) {
        if (Array.isArray(response.data)) {
          setReceivedRequests(response.data);
        } else {
          setReceivedRequests((prev) =>
            prev.filter((req) => req.id !== response.data.requestId)
          );
        }
      }
    });

    // Lắng nghe khi có người từ chối lời mời kết bạn
    socket.on("friendRequestDeclined", (response) => {
      if (response.success) {
        setSentRequests((prev) =>
          prev.filter((req) => req.id !== response.data.requestId)
        );
      }
    });

    return () => {
      socket.off("newFriendRequest");
      socket.off("friendRequestCancelled");
      socket.off("friendRequestDeclined");
    };
  }, [socket]);

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
        setSentRequests((prev) =>
          prev.filter((req) => req.id !== sentData.data.requestId)
        );
        // setSentRequests(sentData.data);
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
        `${process.env.NEXT_PUBLIC_API_URL}/user/handle`,
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
        // Cập nhật UI bằng cách xóa request đã được xử lý
        setReceivedRequests((prev) =>
          Array.isArray(prev) ? prev.filter((req) => req.id !== requestId) : []
        );

        setSentRequests((prev) =>
          Array.isArray(prev) ? prev.filter((req) => req.id !== requestId) : []
        );

        if (action === "ACCEPTED") {
          socket?.emit("friendRequestAccepted", {
            success: true,
            data: {
              requestId: requestId,
              senderId: data.data.userId,
              receiverId: data.data.receiverId,
            },
          });

          window.dispatchEvent(new Event("friendRequestAccepted"));

          toast.success("Đã chấp nhận lời mời");
          router.push("/contacts");
        } else {
          // Xử lý khi từ chối
          socket?.emit("friendRequestDeclined", {
            success: true,
            data: {
              requestId: requestId,
              senderId: data.data.userId,
              receiverId: data.data.receiverId,
            },
          });

          window.dispatchEvent(
            new CustomEvent("updateSentRequests", {
              detail: { requestId, action: "DECLINED" },
            })
          );

          toast.success("Đã từ chối lời mời");
        }
      }
    } catch (error) {
      console.error("Error handling friend request:", error);
      toast.error("Không thể xử lý yêu cầu kết bạn");
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      const token = await getAuthToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/user/cancel/${requestId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        // Emit socket event để thông báo cho người nhận
        socket?.emit("friendRequestCancelled", {
          requestId,
          receiverId: data.data.receiverId,
        });

        toast.success("Đã thu hồi lời mời kết bạn");
        // Cập nhật UI ngay lập tức cho người gửi
        setSentRequests((prev) => prev.filter((req) => req.id !== requestId));
      } else {
        toast.error(data.message || "Không thể thu hồi lời mời");
      }
    } catch (error) {
      console.error("Error cancelling friend request:", error);
      toast.error("Không thể thu hồi lời mời kết bạn");
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("vi-VN");
  };

  useEffect(() => {
    // Listen for sent requests updates
    const handleUpdateSentRequests = (event: CustomEvent) => {
      const { requestId, action } = event.detail;

      // Cập nhật danh sách sent requests
      setSentRequests((prev) => {
        if (!Array.isArray(prev)) return [];
        return prev.filter((req) => req.id !== requestId);
      });
    };

    window.addEventListener(
      "updateSentRequests",
      handleUpdateSentRequests as EventListener
    );

    return () => {
      window.removeEventListener(
        "updateSentRequests",
        handleUpdateSentRequests as EventListener
      );
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on("friendRequestAccepted", (response) => {
      if (response.success) {
        // Xóa request khỏi danh sách đã gửi
        setSentRequests((prev) =>
          prev.filter((req) => req.id !== response.data.requestId)
        );

        // Xóa khỏi danh sách đã nhận nếu có
        setReceivedRequests((prev) =>
          prev.filter((req) => req.id !== response.data.requestId)
        );
      }
    });

    socket.on("friendRequestDeclined", (response) => {
      if (response.success) {
        // Xóa request khỏi cả hai danh sách
        setSentRequests((prev) =>
          prev.filter((req) => req.id !== response.data.requestId)
        );
        setReceivedRequests((prev) =>
          prev.filter((req) => req.id !== response.data.requestId)
        );
      }
    });

    return () => {
      socket.off("friendRequestAccepted");
      socket.off("friendRequestDeclined");
    };
  }, [socket]);

  // Thêm effect để lắng nghe sự kiện cập nhật danh sách lời mời đã gửi
  useEffect(() => {
    const handleRefreshSentRequests = (event: CustomEvent) => {
      const updatedRequests = event.detail;
      if (Array.isArray(updatedRequests)) {
        setSentRequests(updatedRequests);
      }
    };

    window.addEventListener(
      "refreshSentRequests",
      handleRefreshSentRequests as EventListener
    );

    return () => {
      window.removeEventListener(
        "refreshSentRequests",
        handleRefreshSentRequests as EventListener
      );
    };
  }, []);

  // Cập nhật effect xử lý updateSentRequests
  useEffect(() => {
    const handleUpdateSentRequests = (event: CustomEvent) => {
      const newRequest = event.detail;
      setSentRequests((prev) => {
        if (!Array.isArray(prev)) return [newRequest];
        return [newRequest, ...prev];
      });
    };

    window.addEventListener(
      "updateSentRequests",
      handleUpdateSentRequests as EventListener
    );

    return () => {
      window.removeEventListener(
        "updateSentRequests",
        handleUpdateSentRequests as EventListener
      );
    };
  }, []);

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
                        onClick={async () => {
                          try {
                            const token = await getAuthToken();
                            const response = await fetch(
                              `${process.env.NEXT_PUBLIC_API_URL}/user/handle`,
                              {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  Authorization: `Bearer ${token}`,
                                },
                                body: JSON.stringify({
                                  id: request.id,
                                  type: "DECLINED",
                                }),
                              }
                            );

                            const data = await response.json();

                            if (data.success) {
                              // Cập nhật UI bên người nhận
                              setReceivedRequests((prev) =>
                                prev.filter((req) => req.id !== request.id)
                              );

                              // Thông báo thành công
                              toast.success("Đã từ chối lời mời");

                              // Emit socket event để thông báo cho người gửi
                              socket?.emit("friendRequestDeclined", {
                                success: true,
                                data: {
                                  requestId: request.id,
                                  senderId: request.sender?.id,
                                  receiverId: data.data.receiverId,
                                },
                              });
                            } else if (data.code === 0) {
                              toast.error("Không tìm thấy yêu cầu kết bạn");
                            } else if (data.code === -2) {
                              toast.error("Loại yêu cầu không hợp lệ");
                            } else {
                              toast.error(
                                data.message || "Không thể xử lý yêu cầu"
                              );
                            }
                          } catch (error) {
                            console.error(
                              "Error declining friend request:",
                              error
                            );
                            toast.error("Không thể từ chối lời mời kết bạn");
                          }
                        }}
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
            {!Array.isArray(sentRequests) || sentRequests.length === 0 ? (
              <p className="text-gray-500 text-center">Chưa gửi lời mời nào</p>
            ) : (
              sentRequests.map((request, index) => (
                <div
                  key={`${request.id}-${index}`}
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
                      <div className="flex flex-col items-end">
                        <span className="text-sm text-gray-500">
                          {formatTimestamp(request.createdAt)}
                        </span>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancelRequest(request.id)}
                          className="w-24 mt-2"
                        >
                          Thu hồi
                        </Button>
                      </div>
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
