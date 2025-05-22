"use client";
import { ChevronRight } from "lucide-react";
import Image from "next/image";
import RotatingText from "../components/react-bits/text-animations/RotatingText";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { redirect } from "next/dist/server/api-utils";
export default function Home() {
  const { data: session } = useSession();
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <div className="flex items-center gap-2">
          <span className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 text-transparent bg-clip-text">
            WeLo
          </span>
          <RotatingText
            texts={[
              "Kết nối mọi lúc",
              "Chat nhóm tiện lợi",
              "Chia sẻ tức thì",
              "Luôn bên bạn",
            ]}
            mainClassName="px-4 sm:px-6 md:px-8 bg-gradient-to-r from-blue-500 to-cyan-400 text-white overflow-hidden py-2 sm:py-3 md:py-4 justify-center rounded-xl font-bold text-lg sm:text-xl md:text-2xl"
            staggerFrom={"first"}
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-100%", opacity: 0 }}
            staggerDuration={0.03}
            splitLevelClassName="overflow-hidden pb-1 sm:pb-2"
            transition={{
              type: "spring",
              damping: 20,
              stiffness: 300,
              bounce: 0.3,
            }}
            rotationInterval={3000}
            splitBy="words"
          />
        </div>
        <div className="flex gap-4 items-center flex-col sm:flex-row ">
          <Button
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
            onClick={() => {
                window.location.href = "/chat";
            }}
          >
            chat now
          </Button>

          <ChevronRight />
        </div>
      </main>
    </div>
  );
}
