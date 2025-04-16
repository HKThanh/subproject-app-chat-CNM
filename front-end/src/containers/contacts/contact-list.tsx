"use client";

import { MoreHorizontal, Search, ChevronDown, Filter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Input } from "@heroui/input";

interface Contact {
  id: string;
  name: string;
  avatar: string;
  initials: string;
}

interface ContactListProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export default function ContactList({
  searchQuery,
  onSearchChange,
}: ContactListProps) {
  // Mock data - replace with real data later
  const contacts = [
    {
      letter: "A",
      contacts: [
        {
          id: "1",
          name: "Anh thư",
          avatar: "https://example.com/avatar1.jpg",
          initials: "AT",
        },
        {
          id: "2",
          name: "An Nhiên",
          avatar: "https://example.com/avatar2.jpg",
          initials: "AN",
        },
      ],
    },
    {
      letter: "B",
      contacts: [
        {
          id: "3",
          name: "Bảo Nam",
          avatar: "https://example.com/avatar3.jpg",
          initials: "BN",
        },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full p-4">
      {/* Friend count */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Bạn bè (379)</h2>
      </div>

      {/* Search bar and filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1 relative">
          <div className="flex items-center w-full bg-gray-100 rounded-lg">
            <div className="pl-3 pr-2">
              <Search className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Tìm bạn"
              className="flex-1 py-2 bg-transparent text-sm focus:outline-none placeholder:text-gray-400"
              value={searchQuery}
              onChange={(e) => {
                const cursorPosition = e.target.selectionStart;
                onSearchChange(e.target.value);
                setTimeout(() => {
                  e.target.setSelectionRange(cursorPosition, cursorPosition);
                }, 0);
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 px-3 py-2 text-sm hover:bg-gray-100 rounded-lg">
                Tên (A-Z)
                <ChevronDown className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuItem>Tên (A-Z)</DropdownMenuItem>
              <DropdownMenuItem>Tên (Z-A)</DropdownMenuItem>
              <DropdownMenuItem>Thời gian kết bạn (Mới nhất)</DropdownMenuItem>
              <DropdownMenuItem>Thời gian kết bạn (Cũ nhất)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 px-3 py-2 text-sm hover:bg-gray-100 rounded-lg">
                Tất cả
                <Filter className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuItem>Tất cả bạn bè</DropdownMenuItem>
              <DropdownMenuItem>Mới truy cập gần đây</DropdownMenuItem>
              <DropdownMenuItem>Mới kết bạn</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Contact list */}
      <div className="flex-1 overflow-y-auto">
        {contacts.map((section) => (
          <div key={section.letter} className="mb-6">
            <div className="text-sm mb-2">{section.letter}</div>
            <div className="space-y-1">
              {section.contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between py-2 px-2 hover:bg-gray-100 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-200 rounded-full flex items-center justify-center text-sm">
                      {contact.initials}
                    </div>
                    <span>{contact.name}</span>
                  </div>
                  <button className="p-2 hover:bg-gray-200 rounded-full">
                    <MoreHorizontal className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
