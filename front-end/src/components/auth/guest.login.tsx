"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Github, Loader2 } from "lucide-react";
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
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { loginUser } from "../../actions/authActions";
import { ShineBorder } from "@/components/magicui/shine-border";

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
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);

    const { email, password } = values;

    try {
      const result = await loginUser(email, password);
      console.log("check result>>> ", result);

      if (result.error) {
        toast.error(result.message);
        setError(result.message);
        // Remove the automatic redirect when there's an error
        // Only redirect if explicitly needed for specific cases
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

  // Add a new function to handle forgot password navigation
  const handleForgotPassword = () => {
    // Store the current email in localStorage if available
    const currentEmail = form.getValues().email;
    if (currentEmail) {
      localStorage.setItem('forgotPasswordEmail', currentEmail);
    }
    
    // Navigate to forgot password page
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
                      <div className="flex justify-end">
                        <Button
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
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Đăng nhập
              </Button>
            </form>
          </Form>

          {/* <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full bg-white/30" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white/20 backdrop-blur-sm px-2 text-gray-800 font-semibold">
                Or continue with
              </span>
            </div>
          </div> */}

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
