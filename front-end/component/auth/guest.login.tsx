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

const formSchema = z.object({
  sdt: z.string()
    .min(10, { message: "Số điện thoại không hợp lệ" })
    .max(11, { message: "Số điện thoại không hợp lệ" })
    .regex(/^(0|84|\+84)(3[2-9]|5[689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/, {
      message: "Số điện thoại không hợp lệ",
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
      sdt: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);

    const { sdt, password } = values;
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <Toaster richColors position="top-right" />
      <Card className="w-full max-w-md bg-white/30 backdrop-blur-sm rounded-xl shadow-lg border-white/50">
        <CardHeader className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">
            WeChat - kết nối ngay!
          </h2>
        </CardHeader>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="sdt"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="Nhập số điện thoại"
                        className="rounded-full h-12 px-4 border-white/50 bg-white/50 backdrop-blur-sm focus:bg-white/70 transition-all"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
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
                          placeholder="Passcode"
                          className="rounded-full h-12 px-4 border-white/50 bg-white/50 backdrop-blur-sm focus:bg-white/70 transition-all pr-10"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                          onClick={togglePasswordVisibility}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="sr-only">
                            {showPassword ? "Hide password" : "Show password"}
                          </span>
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage>
                      <a
                        href="#"
                        className="ml-auto text-sm underline-offset-2 hover:underline text-gray-700"
                      >
                        Forgot your password?
                      </a>
                    </FormMessage>
                  </FormItem>
                )}
              />
              {/* <div className="text-center">
                <Button
                  variant="link"
                  className="text-sm text-muted-foreground p-0 h-auto"
                >
                  Having trouble in sign in?
                </Button>
              </div> */}
              {error && (
                <p className="text-destructive text-sm text-center">{error}</p>
              )}
              <Button
                type="submit"
                className="w-full h-12 rounded-full bg-orange-500/80 hover:bg-orange-500 text-white backdrop-blur-sm transition-all"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Đăng nhập
              </Button>
            </form>
          </Form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full bg-white/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white/30 backdrop-blur-sm px-2 text-gray-700">
                Or continue with
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="rounded-lg h-12 border-white/50 bg-white/30 hover:bg-white/50 backdrop-blur-sm transition-all"
              onClick={() => {
                toast.info("Google login coming soon");
              }}
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
              className="rounded-lg h-12 border-input hover:bg-main-50"
              onClick={() => {
                // Add Facebook OAuth logic
                toast.info("Facebook login coming soon");
              }}
            >
              <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 12-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
              </svg>
            </Button>
            <Button
              variant="outline"
              className="rounded-lg h-12 border-input hover:bg-main-50"
              onClick={() => {
                // Add GitHub OAuth logic
                toast.info("GitHub login coming soon");
              }}
            >
              <Github className="w-5 h-5" />
            </Button>
          </div>
          {/* Add the new account request section */}
          <div className="mt-8 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Button
              variant="link"
              className="p-0 h-auto font-semibold text-main-900 hover:text-main-800"
              onClick={() => router.push("/auth/register")}
            >
              Request Now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
