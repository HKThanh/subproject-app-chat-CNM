"use client";

import type React from "react";
import { useState, useCallback, useMemo, useRef } from "react";
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
// Remove motion import if not needed for performance
// import { motion } from "framer-motion";

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
  const fullnameRef = useRef<HTMLInputElement>(null);
  const bioRef = useRef<HTMLInputElement>(null);
  const [fullname, setFullname] = useState(profile.fullname || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [gender, setGender] = useState(profile.gender || '');
  const [birthDay, setBirthDay] = useState(profile.birthDay || '');
  const [birthMonth, setBirthMonth] = useState(profile.birthMonth || '');
  const [birthYear, setBirthYear] = useState(profile.birthYear || '');
  // const [phone, setPhone] = useState(profile.phone || '');

  // Thêm debounce để giảm số lần cập nhật state
  const debounce = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  // Memoize these arrays to prevent unnecessary recalculations
  const days = useMemo(() =>
    Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0")),
    []
  );

  const months = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")),
    []
  );

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 100 }, (_, i) => String(currentYear - i));
  }, []);
  // Sử dụng useCallback để tránh tạo lại hàm mỗi khi render
  const debouncedSetFullname = useCallback(
    debounce((value: string) => setFullname(value), 100),
    []
  );

  const debouncedSetBio = useCallback(
    debounce((value: string) => setBio(value), 100),
    []
  );
  // Optimize form submission
  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    // Lấy giá trị trực tiếp từ input thay vì state để đảm bảo dữ liệu mới nhất
    const currentFullname = fullnameRef.current?.value || fullname;
    const currentBio = bioRef.current?.value || bio;
    
    onUpdate({
      ...profile,
      fullname: currentFullname,
      bio: currentBio,
      gender: gender as "Nam" | "Nữ",
      birthDay,
      birthMonth,
      birthYear,
      // phone,
      id: profile.id,
    });
  }, [fullname, bio, gender, birthDay, birthMonth, birthYear, onUpdate, profile]);

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
            defaultValue={fullname}
            ref={fullnameRef}
            onChange={(e) => debouncedSetFullname(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Input
            id="bio"
            defaultValue={bio}
            ref={bioRef}
            onChange={(e) => debouncedSetBio(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <Label>Thông tin cá nhân</Label>
          <RadioGroup
            value={gender}
            onValueChange={(value) => setGender(value as "Nam" | "Nữ")}
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
          <div className="flex gap-2">
            <Select
              value={birthDay}
              onValueChange={setBirthDay}
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
              value={birthMonth}
              onValueChange={setBirthMonth}
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
              value={birthYear}
              onValueChange={setBirthYear}
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

        {/* <div className="space-y-2">
          <Label htmlFor="phone">Điện thoại</Label>
          <Input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="off"
          />
        </div> */}

        <div className="flex justify-end gap-2 pt-4 border-t mt-6">
          <Button type="button" variant="outline" onClick={onCancel}>
            Hủy
          </Button>
          <Button type="submit">
            Cập nhật
          </Button>
        </div>
      </form>
    </div>
  );
}

