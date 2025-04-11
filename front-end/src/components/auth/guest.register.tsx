"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { Toaster, toast } from "sonner";
import * as z from "zod";

import { sendOtp, signUpUser } from "@/actions/authActions";

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
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@/components/ui/input-otp";
import { Progress } from "@/components/ui/progress";
import { ShineBorder } from "@/components/magicui/shine-border";

const formSchema = z.object({
  fullname: z.string().min(2, {
    message: "Họ tên phải có ít nhất 2 ký tự.",
  }),
  email: z.string().email({
    message: "Email không hợp lệ.",
  }),
  password: z.string().min(6, {
    message: "Mật khẩu phải có ít nhất 6 ký tự.",
  }),
  verificationCode: z.string().min(6, {
    message: "Mã xác thực phải có 6 ký tự.",
  })
    .max(6, {
      message: "Mã xác thực phải có 6 ký tự.",
    })
    .optional(),
});

export default function RegisterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailValid, setIsEmailValid] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0); // 0-100
  const [countdown, setCountdown] = useState(0); // Đếm ngược theo giây
  const [countdownInterval, setCountdownInterval] = useState<NodeJS.Timeout | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullname: "",
      email: "",
      password: "",
      verificationCode: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);
    const { email, password, fullname, verificationCode } = values;
    console.log("Check values>>>> ", values);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate a delay
      const result = await signUpUser(email, password, fullname, verificationCode || "");
      console.log("Check result>>> ", result);

      toast.success("Đăng ký thành công!");
      if (result.error) {
        console.log("Login error>>> ", result.message);
        toast.error(result.message);
        setError(result.message);
      } else if (result.success) {
        if (result.redirectTo) {
          router.push(result.redirectTo);
        }
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      setError("Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.");
      toast.error("An unexpected error occurred. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const password = e.target.value;
    // Đánh giá độ mạnh của mật khẩu
    let strength = 0;
    if (password.length > 0) strength += 20; // Có ký tự
    if (password.length >= 6) strength += 20; // Đủ độ dài tối thiểu
    if (/[A-Z]/.test(password)) strength += 20; // Có chữ hoa
    if (/[0-9]/.test(password)) strength += 20; // Có số
    if (/[^A-Za-z0-9]/.test(password)) strength += 20; // Có ký tự đặc biệt

    setPasswordStrength(strength);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const email = e.target.value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setIsEmailValid(emailRegex.test(email));
  };

  // Hàm dừng đếm ngược
  const stopCountdown = () => {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      setCountdownInterval(null);
    }
    setCountdown(0);
  };

  // Hàm bắt đầu đếm ngược
  const startCountdown = (seconds: number) => {
    // Dừng đếm ngược hiện tại nếu có
    stopCountdown();

    // Thiết lập thời gian đếm ngược
    setCountdown(seconds);

    // Thiết lập interval để giảm thời gian đếm ngược
    const interval = setInterval(() => {
      setCountdown((prevCount) => {
        if (prevCount <= 1) {
          clearInterval(interval);
          setCountdownInterval(null);
          return 0;
        }
        return prevCount - 1;
      });
    }, 1000);

    setCountdownInterval(interval);
  };

  const sendotp = async () => {
    const email = form.getValues('email');
    if (!email || !isEmailValid) {
      toast.error("Vui lòng nhập email hợp lệ");
      return;
    }

    // Nếu đang đếm ngược, không cho gửi lại
    if (countdown > 0) {
      toast.error(`Vui lòng đợi ${countdown} giây trước khi gửi lại mã`);
      return;
    }

    setIsSendingCode(true);
    try {
      // Giả lập gửi mã xác thực
      await new Promise(resolve => setTimeout(resolve, 1500));

      const result = await sendOtp(email);
      if (result.error) {
        toast.error(result.message);
        // Nếu có lỗi, không bật đếm ngược
        return;
      }

      toast.success("Mã xác thực đã được gửi đến email của bạn");
      // Bắt đầu đếm ngược 60 giây
      startCountdown(60);

    } catch (error) {
      toast.error("Không thể gửi mã xác thực. Vui lòng thử lại sau.");
      // Nếu có lỗi, không bật đếm ngược
    } finally {
      setIsSendingCode(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative bg-gradient-to-br from-purple-50/30 to-orange-50/30">
      <Toaster richColors position="top-right" />
      <Card className="w-full max-w-md bg-white/20 backdrop-blur-md rounded-xl shadow-lg border-white/30">
        <ShineBorder shineColor={["#A07CFE", "#FE8FB5", "#FFBE7B"]} borderWidth={2} />

        <CardHeader className="text-center pt-8 pb-2">
          <h2 className="text-3xl font-extrabold text-gray-900">
            WeChat - đăng kí ngay!
          </h2>
        </CardHeader>
        <CardContent className="pt-6 pb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="fullname"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="Họ và tên"
                        className="rounded-full h-12 px-4 border-2 border-gray-300 bg-white/30 backdrop-blur-lg focus:bg-white/40 focus:border-blue-500 transition-all font-medium text-gray-900 placeholder:text-gray-500"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="font-medium" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Nhập email"
                          type="email"
                          className="rounded-full h-12 px-4 border-2 border-gray-300 bg-white/30 backdrop-blur-lg focus:bg-white/40 focus:border-blue-500 transition-all font-medium text-gray-900 placeholder:text-gray-500"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            handleEmailChange(e);
                          }}
                        />
                        <Button
                          type="button"
                          onClick={sendotp}
                          disabled={!isEmailValid || isSendingCode || countdown > 0}
                          className="rounded-full whitespace-nowrap"
                        >
                          {isSendingCode ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : countdown > 0 ? (
                            <span className="text-xs mr-1">{countdown}s</span>
                          ) : (
                            <Mail className="h-4 w-4 mr-2" />
                          )}
                          {countdown > 0 ? "Gửi lại" : "Gửi mã"}
                        </Button>
                      </div>
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
                          placeholder="Mật khẩu"
                          className="rounded-full h-12 px-4 border-2 border-gray-300 bg-white/30 backdrop-blur-lg focus:bg-white/40 focus:border-blue-500 transition-all pr-10 font-medium text-gray-900 placeholder:text-gray-500"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            handlePasswordChange(e);
                          }}
                        />
                        <Progress
                          value={passwordStrength}
                          className="h-1 mt-1"
                          indicatorColor={
                            passwordStrength < 40 ? "bg-red-500" :
                              passwordStrength < 60 ? "bg-yellow-500" :
                                passwordStrength < 80 ? "bg-blue-500" : "bg-green-500"
                          }
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
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage className="font-medium" />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="verificationCode"
                render={({ field: { onChange, value } }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex flex-col items-center space-y-2">
                        <p className="text-sm text-gray-500 mb-1">Nhập mã xác thực</p>
                        <InputOTP
                          maxLength={6}
                          value={value || ""}
                          onChange={(value) => onChange(value)}
                          containerClassName="justify-center"
                          className="bg-white/30 backdrop-blur-lg"
                        >
                          <InputOTPGroup>
                            <InputOTPSlot index={0} className="border-2 border-gray-300 bg-white/30 backdrop-blur-lg focus:bg-white/40 focus:border-blue-500" />
                            <InputOTPSlot index={1} className="border-2 border-gray-300 bg-white/30 backdrop-blur-lg focus:bg-white/40 focus:border-blue-500" />
                            <InputOTPSlot index={2} className="border-2 border-gray-300 bg-white/30 backdrop-blur-lg focus:bg-white/40 focus:border-blue-500" />
                          </InputOTPGroup>
                          <InputOTPSeparator />
                          <InputOTPGroup>
                            <InputOTPSlot index={3} className="border-2 border-gray-300 bg-white/30 backdrop-blur-lg focus:bg-white/40 focus:border-blue-500" />
                            <InputOTPSlot index={4} className="border-2 border-gray-300 bg-white/30 backdrop-blur-lg focus:bg-white/40 focus:border-blue-500" />
                            <InputOTPSlot index={5} className="border-2 border-gray-300 bg-white/30 backdrop-blur-lg focus:bg-white/40 focus:border-blue-500" />
                          </InputOTPGroup>

                        </InputOTP>
                      </div>
                    </FormControl>
                    <FormMessage className="font-medium" />
                  </FormItem>
                )}
              />
              {error && (
                <p className="text-red-600 text-sm text-center font-medium">{error}</p>
              )}
              <Button
                type="submit"
                className="w-full h-12 rounded-full bg-orange-500/90 hover:bg-orange-600 text-white font-semibold backdrop-blur-sm transition-all"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Đăng ký
              </Button>
            </form>
          </Form>

          {/* <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full bg-white/30" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white/20 backdrop-blur-sm px-2 text-gray-800 font-semibold">
                Hoặc đăng ký với
              </span>
            </div>
          </div> */}

          <div className="mt-8 text-center text-sm">
            <span className="text-gray-800 font-medium">Đã có tài khoản?</span>{" "}
            <Button
              variant="link"
              className="p-0 h-auto font-bold text-orange-600 hover:text-orange-700"
              onClick={() => router.push("/auth/login")}
            >
              Đăng nhập
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}