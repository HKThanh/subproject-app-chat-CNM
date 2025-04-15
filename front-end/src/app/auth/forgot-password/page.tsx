import ForgotPasswordForm from "@/components/auth/guest.forgot-password"
import { BackgroundLines } from "@/components/ui/background-lines";

const ForgotPassword = () => {
  return (
    <BackgroundLines className="h-screen">
      <div className="relative z-10 w-full items-center justify-center">
        <ForgotPasswordForm />
      </div>
    </BackgroundLines>
  );
};

export default ForgotPassword;