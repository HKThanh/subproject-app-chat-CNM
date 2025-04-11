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
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      // Thêm thuộc tính modal để đảm bảo focus trap và khắc phục vấn đề aria-hidden
      modal={true}
    >
      <ProfileModal />
    </Dialog>
  );
}

