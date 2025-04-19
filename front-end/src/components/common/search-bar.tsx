import { Users, UsersRound } from "lucide-react";

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export default function SearchBar({ searchQuery, onSearchChange }: SearchBarProps) {
  return (
    <div className="relative flex items-center">
      <input
        type="text"
        placeholder="Tìm kiếm"
        className="w-full px-4 py-2 bg-gray-200 rounded-full text-sm focus:outline-none"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <div className="absolute right-3 flex items-center gap-2">
        <button className="p-1 hover:bg-gray-300 rounded-full">
          <Users className="w-5 h-5 text-gray-500" />
        </button>
        <button className="p-1 hover:bg-gray-300 rounded-full">
          <UsersRound className="w-5 h-5 text-gray-500" />
        </button>
      </div>
    </div>
  );
}