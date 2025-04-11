"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, ChevronLeft } from "lucide-react";
import type { UserProfile } from "./profile-modal";
import { motion } from "framer-motion";

interface ProfileEditProps {
  profile: UserProfile;
  onUpdate: (profile: UserProfile) => void;
  onCancel: () => void;
}

export default function ProfileEdit({
  profile,
  onUpdate,
  onCancel,
}: ProfileEditProps) {
  const [formData, setFormData] = useState<UserProfile>({ ...profile });

  // Hàm xử lý thay đổi giá trị form
  const handleChange = (field: keyof UserProfile, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  const days = Array.from({ length: 31 }, (_, i) =>
    String(i + 1).padStart(2, "0")
  );
  const months = Array.from({ length: 12 }, (_, i) =>
    String(i + 1).padStart(2, "0")
  );
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => String(currentYear - i));

  return (
    <div className="relative">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="mr-2"
            onClick={onCancel}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold">Cập nhật thông tin cá nhân</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-8 w-8"
          onClick={onCancel}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="name">Tên hiển thị</Label>
          <Input
            id="name"
            value={formData.fullname}
            onChange={(e) => handleChange("fullname", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Input
            id="bio"
            value={formData.bio}
            onChange={(e) => handleChange("bio", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Thông tin cá nhân</Label>
          <RadioGroup
            value={formData.gender}
            onValueChange={(value) =>
              handleChange("gender", value as "Nam" | "Nữ")
            }
            className="flex items-center gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Nam" id="nam" />
              <Label htmlFor="nam">Nam</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Nữ" id="nu" />
              <Label htmlFor="nu">Nữ</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label>Ngày sinh</Label>
          <div className="flex gap-2 z-10">
            <Select
              value={formData.birthDay}
              onValueChange={(value) => handleChange("birthDay", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Ngày" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto">
                {days.map((day) => (
                  <SelectItem key={day} value={day}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={formData.birthMonth}
              onValueChange={(value) => handleChange("birthMonth", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Tháng" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto">
                {months.map((month) => (
                  <SelectItem key={month} value={month}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={formData.birthYear}
              onValueChange={(value) => handleChange("birthYear", value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Năm" />
              </SelectTrigger>
              <SelectContent className="max-h-[200px] overflow-y-auto">
                {years.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Điện thoại</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
          />
        </div>

        <motion.div
          className="flex justify-end gap-2 pt-4 border-t mt-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button type="button" variant="outline" onClick={onCancel}>
              Hủy
            </Button>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button type="submit">Cập nhật</Button>
          </motion.div>
        </motion.div>
      </form>
    </div>
  );
}

