import { Search, User, Users } from "lucide-react";

export default function SearchBar() {
  return (
    <div className="flex items-center justify-between w-full">
      <div className="relative flex-1 mr-4">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="w-4 h-4 text-gray-500" />
        </div>
        <input
          type="text"
          className="w-full py-2 pl-10 pr-4 bg-gray-100 rounded-md text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-300"
          placeholder="Tìm kiếm"
        />
      </div>
      <div className="flex items-center space-x-4">
        <button className="p-1 rounded-full hover:bg-gray-200">
          <User className="w-5 h-5 text-gray-700" />
        </button>
        <button className="p-1 rounded-full hover:bg-gray-200">
          <Users className="w-5 h-5 text-gray-700" />
        </button>
      </div>
    </div>
  );
}
