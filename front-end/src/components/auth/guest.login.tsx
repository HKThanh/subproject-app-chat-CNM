"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, QrCode, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { Toaster, toast } from "sonner";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loginUser } from "../../actions/authActions";
import { ShineBorder } from "@/components/magicui/shine-border";
import { io } from "socket.io-client";
import useUserStore from "@/stores/useUserStoree";

const formSchema = z.object({
  email: z.string().email({
    message: "Email không hợp lệ.",
  }),
  password: z.string().min(6, {
    message: "Mật khẩu phải có ít nhất 6 ký tự.",
  }),
});

export default function LoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const userStore = useUserStore();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [socket, setSocket] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("email");
  const [qrExpired, setQrExpired] = useState(false);
  const [countdown, setCountdown] = useState<number>(300); // 5 phút = 300 giây
  const [countdownInterval, setCountdownInterval] = useState<NodeJS.Timeout | null>(null);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    // Khởi tạo kết nối socket khi component được mount
    const socketInstance = io(process.env.NEXT_PUBLIC_API_URL);
    setSocket(socketInstance);

    // Lắng nghe sự kiện nhận mã QR
    socketInstance.on("qrCode", (qrURL: string) => {
      setQrCode(qrURL);
      setQrExpired(false);

      // Bắt đầu đếm ngược 5 phút
      setCountdown(300);

      // Xóa interval cũ nếu có
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }

      // Tạo interval mới
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setQrExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      setCountdownInterval(interval);
    });

    // Lắng nghe sự kiện đăng nhập thành công
    socketInstance.on("loginQRSuccess", (data: any) => {
      toast.success(data.message);
      // Lưu token vào localStorage
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);
      // Update user store with login data
      userStore.setUser(data.user, data.accessToken);
      userStore.setTokens(data.accessToken, data.refreshToken);
      // Chuyển hướng đến trang chính
      router.push("/chat");
    });

    // Lắng nghe sự kiện lỗi khi tạo QR
    socketInstance.on("errorCreateQR", (data: any) => {
      toast.error(data.message);
    });

    return () => {
      // Dọn dẹp khi component unmount
      socketInstance.disconnect();
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [router, userStore, countdownInterval]);

  // Yêu cầu tạo mã QR khi chuyển sang tab QR
  useEffect(() => {
    if (activeTab === "qr" && socket) {
      requestQRCode();
    }
    return () => {
      // Xóa interval khi chuyển tab
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [activeTab, socket]);

  const requestQRCode = () => {
    if (socket) {
      socket.emit("getQRCode");
      setQrCode(null); // Reset QR code khi yêu cầu mới
      setQrExpired(false);
    }
  };
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);

    const { email, password } = values;

    try {
      const result = await loginUser(email, password);
      console.log("check result>>> ", result);

      if (result.error) {
        toast.error(result.message);
        setError(result.message);
      } else if (result.success) {
        if (result.redirectTo) {
          router.push(result.redirectTo);
          toast.success(result.message);
        }
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      setError("Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  }

  // Xử lý quên mật khẩu
  const handleForgotPassword = () => {
    const currentEmail = form.getValues().email;
    if (currentEmail) {
      localStorage.setItem('forgotPasswordEmail', currentEmail);
    }

    router.push('/auth/forgot-password');
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative bg-gradient-to-br from-purple-50/30 to-orange-50/30">
      <Toaster richColors position="top-right" />
      <Card className="w-full max-w-md bg-white/20 backdrop-blur-md rounded-xl shadow-lg border-white/30 relative overflow-hidden">
        <ShineBorder
          shineColor={["#A07CFE", "#FE8FB5", "#FFBE7B"]}
          borderWidth={2}
          duration={8}
        />
        <CardHeader className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">
            WeLo - kết nối ngay!
          </h2>
        </CardHeader>
        <CardContent className="pt-6">
          <Tabs defaultValue="email" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 mb-6">
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>Email</span>
              </TabsTrigger>
              <TabsTrigger value="qr" className="flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                <span>Mã QR</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            placeholder="Nhập email"
                            className="rounded-full h-12 px-4 border-white/30 bg-white/30 backdrop-blur-lg focus:bg-white/40 transition-all font-medium text-gray-900 placeholder:text-gray-500"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="font-medium" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Nhập mật khẩu"
                              className="rounded-full h-12 px-4 border-white/30 bg-white/30 backdrop-blur-lg focus:bg-white/40 transition-all pr-10 font-medium text-gray-900 placeholder:text-gray-500"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-white/30"
                              onClick={togglePasswordVisibility}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-700" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-700" />
                              )}
                              <span className="sr-only">
                                {showPassword ? "Hide password" : "Show password"}
                              </span>
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage>
                          <div className="flex justify-end mt-1">
                            <Button
                              type="button"
                              variant="link"
                              className="p-0 h-auto text-sm font-semibold text-gray-800 hover:text-orange-600"
                              onClick={handleForgotPassword}
                            >
                              Quên mật khẩu?
                            </Button>
                          </div>
                        </FormMessage>
                      </FormItem>
                    )}
                  />
                  {error && (
                    <p className="text-red-600 text-sm text-center font-medium">
                      {error}
                    </p>
                  )}
                  <Button
                    type="submit"
                    className="w-full h-12 rounded-full bg-orange-500/90 hover:bg-orange-600 text-white font-semibold backdrop-blur-sm transition-all"
                    disabled={isLoading}
                  >
                    <span className="flex items-center justify-center">
                      {isLoading ? (
                        <>
                          <span className="mr-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </span>
                          <span>Đang xử lý...</span>
                        </>
                      ) : (
                        "Đăng nhập"
                      )}
                    </span>
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="qr">
              <div className="flex flex-col items-center justify-center space-y-6">
                <div className="text-center mb-2">
                  <p className="text-gray-800 font-medium">Quét mã QR bằng ứng dụng WeLo trên điện thoại của bạn</p>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-md w-64 h-64 flex items-center justify-center relative">
                  {qrCode ? (
                    <>
                      <img
                        src={qrCode}
                        alt="QR Code"
                        className={`w-full h-full transition-opacity duration-300 ${qrExpired ? 'opacity-30' : 'opacity-100'}`}
                      />
                      {qrExpired && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70">
                          <p className="text-red-500 font-medium text-center mb-2">Mã QR đã hết hạn</p>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={requestQRCode}
                            className="bg-orange-500 text-white hover:bg-orange-600"
                          >
                            Tạo mã QR mới
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                      <p className="text-sm text-gray-500 mt-2">Đang tạo mã QR...</p>
                    </div>
                  )}
                </div>

                {qrCode && !qrExpired && (
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">
                      Mã QR hết hạn sau: <span className="text-orange-600 font-bold">{formatTime(countdown)}</span>
                    </p>
                  </div>
                )}

                {/* {qrCode && !qrExpired && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={requestQRCode}
                    className="mt-2"
                  >
                    Làm mới mã QR
                  </Button>
                )} */}

                <div className="text-center text-sm text-gray-600 mt-2">
                  <p>Mã QR sẽ tự động hết hạn sau 5 phút</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-8 text-center text-sm">
            <span className="text-gray-800 font-medium">
              Chưa có tài khoản?
            </span>{" "}
            <Button
              variant="link"
              className="p-0 h-auto font-bold text-orange-600 hover:text-orange-700"
              onClick={() => router.push("/auth/register")}
            >
              Đăng kí ngay
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
