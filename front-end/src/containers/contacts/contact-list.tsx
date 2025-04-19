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

      {/* Search bar */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 mb-6">
        <div className="flex items-center flex-1">
          <Search className="w-4 h-4 text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Tìm kiếm"
            className="w-full bg-transparent text-sm focus:outline-none placeholder:text-gray-400"
            value={searchQuery}
            onChange={(e) => {
              const cursorPosition = e.target.selectionStart;
              onSearchChange(e.target.value);
              setTimeout(() => {
                e.target.setSelectionRange(cursorPosition, cursorPosition);
              }, 0);
            }}
          />

          {/* Sort dropdown */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <svg
                className="w-4 h-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16V4m0 0L3 8m4-4l4 4m-4 4v8m0 0l4-4m-4 4l-4-4"
                />
              </svg>
              <select className="border-none bg-transparent pr-8 py-2 text-sm focus:ring-0">
                <option>Tên (A-Z)</option>
                <option>Tên (Z-A)</option>
              </select>
            </div>

            {/* Filter dropdown */}
            <div className="flex items-center gap-1">
              <svg
                className="w-4 h-4 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              <select className="border-none bg-transparent pr-8 py-2 text-sm focus:ring-0">
                <option>Tất cả</option>
                <option>Phân loại</option>
              </select>
            </div>
          </div>
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
