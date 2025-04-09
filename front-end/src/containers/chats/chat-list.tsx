import SearchIcon from "@/assets/common/icon-search";
import UserAddIcon from "@/assets/common/icon-user-add";
import GroupAddIcon from "@/assets/common/icon-user-group";
import { Input } from "@heroui/input";
import Image from "next/image";
import Avatar from "@/assets/images/user-avatar.png";

const ChatList = () => {
  return (
    <div className="flex flex-col w-full p-4">
      <div className="flex flex-row w-1/4 items-center gap-2">
        <Input
          placeholder="Tìm kiếm..."
          variant="faded"
          startContent={
            <div className="flex items-center justify-center w-5 h-5 text-gray-400">
              <SearchIcon width={15} />
            </div>
          }
          classNames={{
            inputWrapper:
              "border border-gray-300 rounded-lg bg-white px-3 py-2 focus-within:border-blue-500 transition-colors",
            input:
              "bg-transparent placeholder:text-gray-400 text-sm outline-none",
          }}
        />

        <div className="flex flex-row gap-4 w-1/5">
          <UserAddIcon width={20} />
          <GroupAddIcon width={27} />
        </div>
      </div>
      <div className="flex flex-row w-full items-center">
        <div>
          <Image width={40} height={40} alt="avatar" src={Avatar} />
        </div>
        <div>
          <div>Room name</div>
          <div>Last Message</div>
        </div>
      </div>
    </div>
  );
};

export default ChatList;
