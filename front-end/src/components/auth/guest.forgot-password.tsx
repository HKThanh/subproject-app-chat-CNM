"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader, Loader2, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { Toaster, toast } from "sonner";
import * as z from "zod";

import { requestPasswordReset, resetPassword } from "@/actions/authActions";

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
import { ShineBorder } from "@/components/magicui/shine-border";

// Schema for email step
const emailSchema = z.object({
  email: z.string().email({
    message: "Email không hợp lệ.",
  }),
});

// Schema for OTP and new password step
const resetSchema = z.object({
  verificationCode: z.string().length(6, {
    message: "Mã xác thực phải có 6 ký tự.",
  }),
  password: z.string().min(6, {
    message: "Mật khẩu phải có ít nhất 6 ký tự.",
  }),
  confirmPassword: z.string().min(6, {
    message: "Mật khẩu phải có ít nhất 6 ký tự.",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu không khớp",
  path: ["confirmPassword"],
});

export default function ForgotPasswordForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [countdownInterval, setCountdownInterval] = useState<NodeJS.Timeout | null>(null);
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [resetId, setResetId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [passwordStrength, setPasswordStrength] = useState(0);
  useEffect(() => {
    // Check if there's a stored email from the login page
    const storedEmail = localStorage.getItem('forgotPasswordEmail');
    if (storedEmail) {
      emailForm.setValue('email', storedEmail);
      // Optionally clear the storage after using it
      localStorage.removeItem('forgotPasswordEmail');
    }
  }, []);
  // Form for email step
  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

  // Form for reset step
  const resetForm = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      verificationCode: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Handle email submission
  async function onEmailSubmit(values: z.infer<typeof emailSchema>) {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await requestPasswordReset(values.email);
      
      if (result.error) {
        toast.error(result.message);
        setError(result.message);
      } else {
        toast.success("Mã xác thực đã được gửi đến email của bạn");
        setUserEmail(values.email);
        setResetId(result.id);
        setStep('reset');
        startCountdown(60);
      }
    } catch (error) {
      console.error("Error requesting password reset:", error);
      setError("Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.");
      toast.error("Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  }

  // Handle reset submission
  async function onResetSubmit(values: z.infer<typeof resetSchema>) {
    if (!resetId) {
      toast.error("Phiên làm việc đã hết hạn, vui lòng thử lại");
      setStep('email');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const result = await resetPassword(
        resetId,
        values.verificationCode,
        values.password
      );
      
      if (result.error) {
        toast.error(result.message);
        setError(result.message);
      } else {
        toast.success("Đặt lại mật khẩu thành công!");
        setTimeout(() => {
          router.push('/auth/login');
        }, 2000);
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      setError("Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.");
      toast.error("Đã xảy ra lỗi không xác định. Vui lòng thử lại sau.");
    } finally {
      setIsLoading(false);
    }
  }

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Handle password strength
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

  // Countdown functions
  const stopCountdown = () => {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      setCountdownInterval(null);
    }
    setCountdown(0);
  };

  const startCountdown = (seconds: number) => {
    stopCountdown();
    setCountdown(seconds);

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

  // Resend OTP
  const resendOTP = async () => {
    if (countdown > 0) {
      toast.error(`Vui lòng đợi ${countdown} giây trước khi gửi lại mã`);
      return;
    }

    setIsSendingCode(true);
    try {
      const result = await requestPasswordReset(userEmail);
      
      if (result.error) {
        toast.error(result.message);
      } else {
        toast.success("Mã xác thực đã được gửi lại đến email của bạn");
        setResetId(result.id);
        startCountdown(60);
      }
    } catch (error) {
      toast.error("Không thể gửi lại mã xác thực. Vui lòng thử lại sau.");
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
            {step === 'email' ? 'Quên mật khẩu' : 'Đặt lại mật khẩu'}
          </h2>
          <p className="text-gray-600 mt-2">
            {step === 'email' 
              ? 'Nhập email của bạn để nhận mã xác thực' 
              : 'Nhập mã xác thực và mật khẩu mới của bạn'}
          </p>
        </CardHeader>
        <CardContent className="pt-6 pb-8">
          {step === 'email' ? (
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-5">
                <FormField
                  control={emailForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          placeholder="Nhập email"
                          type="email"
                          className="rounded-full h-12 px-4 border-2 border-gray-300 bg-white/30 backdrop-blur-lg focus:bg-white/40 focus:border-blue-500 transition-all font-medium text-gray-900 placeholder:text-gray-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="font-medium" />
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
                  {isLoading ? (
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Gửi mã xác thực
                </Button>
                
                <div className="text-center">
                  <Button
                    type="button" // Changed from default to explicitly set type="button"
                    variant="link"
                    className="text-gray-600 hover:text-gray-900"
                    onClick={(e) => {
                      e.preventDefault(); // Prevent any default form behavior
                      router.push('/auth/login');
                    }}
                  >
                    Quay lại đăng nhập
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <Form {...resetForm}>
              <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-5">
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Mã xác thực đã được gửi đến email: <span className="font-medium">{userEmail}</span>
                  </p>
                  <FormField
                    control={resetForm.control}
                    name="verificationCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <InputOTP maxLength={6} {...field}>
                            <InputOTPGroup>
                              <InputOTPSlot index={0} />
                              <InputOTPSlot index={1} />
                              <InputOTPSlot index={2} />
                            </InputOTPGroup>
                            <InputOTPSeparator />
                            <InputOTPGroup>
                              <InputOTPSlot index={3} />
                              <InputOTPSlot index={4} />
                              <InputOTPSlot index={5} />
                            </InputOTPGroup>
                          </InputOTP>
                        </FormControl>
                        <FormMessage className="font-medium" />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end mt-2">
                    <Button
                      type="button"
                      variant="link"
                      className="text-sm text-blue-600 hover:text-blue-800"
                      onClick={resendOTP}
                      disabled={countdown > 0 || isSendingCode}
                    >
                      {isSendingCode ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : null}
                      {countdown > 0 ? `Gửi lại sau (${countdown}s)` : "Gửi lại mã"}
                    </Button>
                  </div>
                </div>
                
                <FormField
                  control={resetForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="Mật khẩu mới"
                            className="rounded-full h-12 px-4 border-2 border-gray-300 bg-white/30 backdrop-blur-lg focus:bg-white/40 focus:border-blue-500 transition-all font-medium text-gray-900 placeholder:text-gray-500"
                            {...field}
                            onChange={(e) => {
                              field.onChange(e);
                              handlePasswordChange(e);
                            }}
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
                      <div className="mt-2">
                        <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              passwordStrength < 40
                                ? "bg-red-500"
                                : passwordStrength < 80
                                ? "bg-yellow-500"
                                : "bg-green-500"
                            }`}
                            style={{ width: `${passwordStrength}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {passwordStrength < 40
                            ? "Mật khẩu yếu"
                            : passwordStrength < 80
                            ? "Mật khẩu trung bình"
                            : "Mật khẩu mạnh"}
                        </p>
                      </div>
                      <FormMessage className="font-medium" />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={resetForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Xác nhận mật khẩu"
                            className="rounded-full h-12 px-4 border-2 border-gray-300 bg-white/30 backdrop-blur-lg focus:bg-white/40 focus:border-blue-500 transition-all font-medium text-gray-900 placeholder:text-gray-500"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-white/30"
                            onClick={toggleConfirmPasswordVisibility}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-700" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-700" />
                            )}
                            <span className="sr-only">
                              {showConfirmPassword ? "Hide password" : "Show password"}
                            </span>
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage className="font-medium" />
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
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Đặt lại mật khẩu
                </Button>
                
                <div className="text-center">
                  <Button
                    variant="link"
                    className="text-gray-600 hover:text-gray-900"
                    onClick={() => setStep('email')}
                  >
                    Quay lại
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}