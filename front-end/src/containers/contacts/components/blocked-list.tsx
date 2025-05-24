"use client";

import { useState, useEffect } from "react";

import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Shield, Search } from "lucide-react";
import { getAuthToken } from "@/utils/auth-utils";

interface BlockedUser {
  id: string;
  fullname: string;
  urlavatar: string;
  email?: string;
  phone?: string;
}

export default function BlockedList() {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [userToUnblock, setUserToUnblock] = useState<BlockedUser | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch danh sách người dùng bị chặn
  const fetchBlockedUsers = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/user/blocked/get-blocked`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const result = await response.json();

      if (result.success) {
        setBlockedUsers(result.data || []);
      } else {
        console.error("Failed to fetch blocked users:", result.message);
        toast.error("Không thể tải danh sách người dùng bị chặn");
      }
    } catch (error) {
      console.error("Error fetching blocked users:", error);
      toast.error("Không thể tải danh sách người dùng bị chặn");
    } finally {
      setLoading(false);
    }
  };

  // Xử lý bỏ chặn người dùng
  const handleUnblockUser = async (userId: string) => {
    try {
      setIsProcessing(true);
      const token = await getAuthToken();

      // Cập nhật UI ngay lập tức (optimistic update)
      setBlockedUsers((prev) => prev.filter((user) => user.id !== userId));

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/user/unblock-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId }),
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success("Đã bỏ chặn người dùng");
      } else {
        // Nếu thất bại, tải lại danh sách
        toast.error(result.message || "Không thể bỏ chặn người dùng");
        fetchBlockedUsers();
      }
    } catch (error) {
      console.error("Error unblocking user:", error);
      toast.error("Đã xảy ra lỗi khi bỏ chặn người dùng");
      fetchBlockedUsers(); // Tải lại danh sách nếu có lỗi
    } finally {
      setIsProcessing(false);
      setConfirmDialogOpen(false);
      setUserToUnblock(null);
    }
  };

  // Lọc danh sách theo searchQuery
  const filteredUsers = blockedUsers.filter((user) =>
    user.fullname.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  return (
    <div className="p-4">
      {/* Blocked users list */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-gray-500">Đang tải danh sách...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {searchQuery
              ? "Không tìm thấy người dùng bị chặn"
              : "Bạn chưa chặn người dùng nào"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50"
            >
              <div className="flex items-center">
                <Avatar className="w-10 h-10 mr-3">
                  <img
                    src={user.urlavatar || "/default-avatar.png"}
                    alt={user.fullname}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "/default-avatar.png";
                    }}
                  />
                </Avatar>
                <div>
                  <div className="font-medium">{user.fullname}</div>
                  <div className="text-sm text-gray-500">
                    {user.email || user.phone || "Không có thông tin liên hệ"}
                  </div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setUserToUnblock(user);
                  setConfirmDialogOpen(true);
                }}
              >
                Bỏ chặn
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Confirm unblock dialog */}
      <AlertDialog
        open={confirmDialogOpen}
        onOpenChange={(open) => {
          setConfirmDialogOpen(open);
          if (!open) {
            setUserToUnblock(null);
            setIsProcessing(false);
          }
        }}
      >
        <AlertDialogContent onEscapeKeyDown={() => setConfirmDialogOpen(false)}>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận bỏ chặn</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn bỏ chặn {userToUnblock?.fullname} không?
              Người này sẽ có thể nhìn thấy bạn và gửi tin nhắn cho bạn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsProcessing(false);
                setUserToUnblock(null);
              }}
            >
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (userToUnblock) {
                  handleUnblockUser(userToUnblock.id);
                }
              }}
              disabled={isProcessing}
            >
              {isProcessing ? "Đang xử lý..." : "Bỏ chặn"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
