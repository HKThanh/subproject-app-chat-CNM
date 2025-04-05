import RegisterForm from "@/component/auth/guest.register";
import { BackgroundLines } from "@/components/ui/background-lines";

const Register = () => {
  return (
    <BackgroundLines className="h-screen">
      <div className="relative z-10 w-full items-center justify-center">
        <RegisterForm />
      </div>
    </BackgroundLines>
  );
};

export default Register;
