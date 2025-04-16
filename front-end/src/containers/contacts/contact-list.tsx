"use client";

import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { MoreHorizontal } from "lucide-react";

interface Contact {
  id: string;
  name: string;
  avatar: string;
}

interface ContactListProps {
  searchQuery: string;
}

export default function ContactList({ searchQuery }: ContactListProps) {
  // Mock data - replace with real API call
  const contacts: Contact[] = [
    { id: "1", name: "A 2", avatar: "/avatars/a2.jpg" },
    { id: "2", name: "Ahnthuw", avatar: "/avatars/ahnthuw.jpg" },
    { id: "3", name: "An", avatar: "/avatars/an.jpg" },
    { id: "4", name: "Anh", avatar: "/avatars/anh.jpg" },
    { id: "5", name: "Anh Ngo", avatar: "/avatars/anhngo.jpg" },
    { id: "6", name: "Anh Phim", avatar: "/avatars/anhphim.jpg" },
    { id: "7", name: "Anh Thu", avatar: "/avatars/anhthu.jpg" },
    { id: "8", name: "Anh Tuyết", avatar: "/avatars/anhtuyet.jpg" },
  ];

  const filteredContacts = contacts.filter((contact) =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group contacts by first letter
  const groupedContacts = filteredContacts.reduce((groups, contact) => {
    const firstLetter = contact.name[0].toUpperCase();
    if (!groups[firstLetter]) {
      groups[firstLetter] = [];
    }
    groups[firstLetter].push(contact);
    return groups;
  }, {} as Record<string, Contact[]>);

  return (
    <div className="px-4">
      {Object.entries(groupedContacts).map(([letter, contacts]) => (
        <div key={letter} className="mb-4">
          <h3 className="text-base font-medium mb-2">{letter}</h3>
          <div className="space-y-1">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between py-2 px-1 hover:bg-gray-50 rounded-lg group"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={contact.avatar} alt={contact.name} />
                  </Avatar>
                  <span className="text-sm">{contact.name}</span>
                </div>
                <button className="p-1 hover:bg-gray-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
