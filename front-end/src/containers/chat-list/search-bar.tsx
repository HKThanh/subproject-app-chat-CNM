import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";

export default function SearchBar({
  onSearch,
  activeTab = "DIRECT",
}: {
  onSearch: (term: string) => void;
  activeTab?: "DIRECT" | "GROUPS";
}) {
  const [searchTerm, setSearchTerm] = useState("");

  // When search term changes, notify parent component
  useEffect(() => {
    onSearch(searchTerm);
  }, [searchTerm, onSearch]);

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        placeholder="Tìm kiếm..."
        className="pl-10 bg-white"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
    </div>
  );
}
