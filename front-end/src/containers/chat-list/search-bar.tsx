import { useState } from "react";
import { Search } from "lucide-react";
import { getAuthToken } from "@/utils/auth-utils";

interface SearchBarProps {
  onSelectConversation: (id: string) => void;
}

interface SearchResult {
  id: string;
  fullname: string;
  email: string;
  urlavatar: string;
}

export default function SearchBar({ onSelectConversation }: SearchBarProps) {
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);

  const END_POINT_URL = process.env.NODE_PUBLIC_API_URL || "http://localhost:3000";

  const handleSearch = async (value: string) => {
    setSearchText(value);
    setLoading(true);

    try {
      const token = await getAuthToken();
      const response = await fetch(`${END_POINT_URL}/user/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: value }),
      });

      const data = await response.json();
      if (data.code === 1) {
        setSearchResults(data.data);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex-1 mr-4">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <Search className="absolute w-4 h-4 text-gray-500" />
      </div>
      <input
        type="text"
        value={searchText}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => setShowResults(true)}
        className="w-full py-2 pl-10 pr-4 bg-gray-100 rounded-md text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-300"
        placeholder="Tìm kiếm"
      />

      {/* Search Results Overlay */}
      {showResults && (
        <div className="absolute top-full left-0 w-full bg-white border border-gray-200 shadow-lg mt-2 rounded-md z-50">
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                Đang tìm kiếm...
              </div>
            ) : searchResults.length > 0 ? (
              <ul>
                {searchResults.map((result) => (
                  <li
                    key={result.id}
                    className="flex items-center p-3 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      onSelectConversation(result.id);
                      setShowResults(false);
                      setSearchText("");
                    }}
                  >
                    <img
                      src={result.urlavatar || "https://via.placeholder.com/40"}
                      alt={result.fullname}
                      className="w-10 h-10 rounded-full mr-3"
                    />
                    <div>
                      <div className="font-medium">{result.fullname}</div>
                      <div className="text-sm text-gray-500">
                        {result.email}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : searchText ? (
              <div className="p-4 text-center text-gray-500">
                Không tìm thấy kết quả
              </div>
            ) : null}
          </div>

          {/* Close button at bottom */}
          <div className="p-2 border-t">
            <button
              className="w-full py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
              onClick={() => {
                setShowResults(false);
                setSearchText("");
              }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Backdrop for closing results */}
      {showResults && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowResults(false)}
        />
      )}
    </div>
  );
}
