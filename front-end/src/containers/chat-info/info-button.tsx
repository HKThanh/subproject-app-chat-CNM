"use client";

import { Info } from "lucide-react";

interface InfoButtonProps {
  onClick: () => void;
  isActive: boolean;
}

export default function InfoButton({ onClick, isActive }: InfoButtonProps) {
  return (
    <button
      className={`w-8 h-8 rounded-full flex items-center justify-center ${
        isActive ? "bg-gray-700" : "bg-gray-800 hover:bg-gray-700"
      }`}
      onClick={onClick}
    >
      <Info className="w-4 h-4 text-gray-300" />
    </button>
  );
}
