"use client";

import React from "react";
import ProfileModal from "./profile-modal";
import { Dialog } from "@/components/ui/dialog";

interface ProfileModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModalWrapper({ isOpen, onClose }: ProfileModalWrapperProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <ProfileModal open={isOpen} onOpenChange={onClose} />
    </Dialog>
  );
}
