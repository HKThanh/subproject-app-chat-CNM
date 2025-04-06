"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Github, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { Toaster, toast } from "sonner";
import * as z from "zod";

import { signUpUser } from "@/actions/authActions";

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
import { Separator } from "@/components/ui/separator";
import { ShineBorder } from "@/components/magicui/shine-border";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Họ tên phải có ít nhất 2 ký tự.",
  }),
  phone: z.string()
    .min(10, { message: "Số điện thoại không hợp lệ" })
    .max(11, { message: "Số điện thoại không hợp lệ" })
    .regex(/^(0|84|\+84)(3[2-9]|5[689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/, {
      message: "Số điện thoại không hợp lệ",
    }),
  password: z.string().min(6, {
    message: "Mật khẩu phải có ít nhất 6 ký tự.",
  }),
});

export default function RegisterForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);
    const { phone, password, name } = values;
    console.log("Check values>>>> ", values);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate a delay
      const result = await signUpUser(phone, password, name);
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

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative bg-gradient-to-br from-purple-50/30 to-orange-50/30">
      <Toaster richColors position="top-right" />
      <Card className="w-full max-w-md bg-white/20 backdrop-blur-md rounded-xl shadow-lg border-white/30">
      <ShineBorder shineColor={["#A07CFE", "#FE8FB5", "#FFBE7B"]} borderWidth={2} />

        <CardHeader className="text-center pt-8 pb-2">
          <h2 className="text-3xl font-extrabold text-gray-900">
            WeChat - kết nối ngay!
          </h2>
        </CardHeader>
        <CardContent className="pt-6 pb-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="Họ và tên"
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
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="Số điện thoại"
                        type="phone"
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
                          placeholder="Mật khẩu"
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
                        </Button>
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

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full bg-white/30" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white/20 backdrop-blur-sm px-2 text-gray-800 font-semibold">
                Hoặc đăng ký với
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="rounded-lg h-12 border-white/30 bg-white/20 hover:bg-white/30 backdrop-blur-lg transition-all"
              onClick={() => toast.info("Google đăng ký sắp ra mắt")}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            </Button>
            <Button
              variant="outline"
              className="rounded-lg h-12 border-white/30 bg-white/20 hover:bg-white/30 backdrop-blur-lg transition-all"
              onClick={() => toast.info("Facebook đăng ký sắp ra mắt")}
            >
              {/* Facebook SVG remains the same */}
            </Button>
            <Button
              variant="outline"
              className="rounded-lg h-12 border-white/30 bg-white/20 hover:bg-white/30 backdrop-blur-lg transition-all"
              onClick={() => toast.info("GitHub đăng ký sắp ra mắt")}
            >
              <Github className="w-5 h-5" />
            </Button>
          </div>

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
