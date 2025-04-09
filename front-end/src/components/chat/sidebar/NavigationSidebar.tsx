"use client"

import { useState } from "react"
import ProfileModalWrapper from "@/components/user/profile-modal-wrapper"
import { Avatar, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  MessageSquare,
  Users,
  Cloud,
  CheckSquare,
  FolderOpen,
  Settings,
  User,
  LogOut,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import useUserStore from "@/stores/useUserStoree"

export default function NavigationSidebar() {
  const [activeItem, setActiveItem] = useState('messages')
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const user = useUserStore((state) => state.user)

  const navigationItems = [
    { id: 'messages', icon: MessageSquare, label: 'Tin nhắn', badge: 5 },
    { id: 'contacts', icon: Users, label: 'Danh bạ' },
    { id: 'tasks', icon: CheckSquare, label: 'Công việc' },
    { id: 'cloud', icon: Cloud, label: 'Cloud' },
    { id: 'documents', icon: FolderOpen, label: 'Tài liệu' },
  ]

  return (
    <>
      <div className="fixed left-0 top-0 h-screen w-[70px] bg-[#2563eb] flex flex-col items-center py-4">
        {/* Avatar */}
        <div className="mb-8">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-10 w-10 border-2 border-white hover:opacity-90 transition-opacity cursor-pointer">
                <AvatarImage
                  src={user?.urlavatar?.toString() || `https://ui-avatars.com/api/?name=${user?.fullname || 'User'}`}
                  alt="Avatar"
                />
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <div className="p-2">
                <p className="font-semibold">{user?.fullname}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsProfileModalOpen(true)}>
                <User className="mr-2 h-4 w-4" />
                Trang cá nhân
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Cài đặt
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Navigation Items */}
        <div className="flex flex-col gap-4">
          <TooltipProvider>
            {navigationItems.map((item) => (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <button
                    className={`relative p-3 rounded-lg hover:bg-[#1d4ed8] transition-colors ${
                      activeItem === item.id ? 'bg-[#1d4ed8]' : ''
                    }`}
                    onClick={() => setActiveItem(item.id)}
                  >
                    <item.icon className="h-6 w-6 text-white" />
                    {item.badge && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>
      </div>

      {/* Profile Modal */}
      {isProfileModalOpen && (
        <ProfileModalWrapper
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}
    </>
  )
}
