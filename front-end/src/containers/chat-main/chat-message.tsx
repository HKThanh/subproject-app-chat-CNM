import { ThumbsUp, FileText, Download, Image as ImageIcon, Video } from "lucide-react";
import Image from "next/image";

interface ChatMessageProps {
  message: string;
  timestamp: string;
  isOwn?: boolean;
  type?: "text" | "image" | "video" | "document" | "file";
  fileUrl?: string;
}

export default function ChatMessage({ 
  message, 
  timestamp, 
  isOwn = false, 
  type = "text",
  fileUrl
}: ChatMessageProps) {
  
  // Render content based on message type
  const renderContent = () => {
    switch (type) {
      case "image":
        return (
          <div className="relative">
            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
              <img 
                src={fileUrl} 
                alt={message} 
                className="rounded-md max-h-60 max-w-full object-contain"
              />
            </a>
            <div className="mt-2 flex items-center">
              <ImageIcon className="w-4 h-4 mr-1" />
              <span className="text-sm">{message}</span>
            </div>
          </div>
        );
      
      case "video":
        return (
          <div>
            <video 
              src={fileUrl} 
              controls 
              className="rounded-md max-h-60 max-w-full"
            />
            <div className="mt-2 flex items-center">
              <Video className="w-4 h-4 mr-1" />
              <span className="text-sm">{message}</span>
            </div>
          </div>
        );
      
      case "document":
      case "file":
        // Extract filename from URL or use message as filename
        let fileName = "Tài liệu";
        
        // Try to extract filename from URL
        if (fileUrl) {
          try {
            // First try to get the filename from the URL path
            const urlParts = fileUrl.split('/');
            const rawFileName = urlParts[urlParts.length - 1];
            
            // Check if there's a query string and remove it
            const fileNameParts = rawFileName.split('?');
            fileName = decodeURIComponent(fileNameParts[0]);
            
            // If filename contains unusual characters, use a default name
            if (!fileName || fileName.length > 100) {
              fileName = "Tài liệu đính kèm";
            }
          } catch (e) {
            console.error("Error parsing filename:", e);
            fileName = "Tài liệu đính kèm";
          }
        } else if (message && !message.includes("http")) {
          // If no fileUrl but we have a message that's not a URL, use it as filename
          fileName = message;
        }
        
        return (
          <div className="flex flex-col w-full">
            <div className={`flex items-center rounded-md p-2 ${isOwn ? 'bg-blue-400' : 'bg-gray-200'}`}>
              <FileText className={`w-8 h-8 mr-2 text-gray-700`} />
              <div className="flex-1 overflow-hidden">
                <p className={`text-sm font-medium truncate text-gray-800`}>
                  {fileName}
                </p>
                <p className={"text-xs text-gray-600"}>
                  Đã gửi một tệp đính kèm
                </p>
              </div>
              <a 
                href={fileUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className={`ml-2 p-1 rounded-full ${isOwn ? 'bg-blue-200 hover:bg-blue-300' : 'bg-gray-300 hover:bg-gray-400'}`}
                download
              >
                <Download className={`w-5 h-5 text-gray-700`} />
              </a>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="whitespace-pre-wrap break-words">
            {message}
          </div>
        );
    }
  };

  return (
    <div className={`mb-4 ${isOwn ? 'flex justify-end' : ''}`}>
      <div
        className={`rounded-lg p-3 ${
          type !== 'text' 
            ? 'bg-transparent'
            : isOwn
              ? 'bg-[#4285F4] text-white max-w-xs md:max-w-md lg:max-w-lg'
              : 'bg-gray-100 text-gray-800 inline-block'
        }`}
        style={{
          backgroundColor: type !== 'text' ? 'transparent' : isOwn ? '#4285F4' : '',
          color: type !== 'text' ? (isOwn ? 'white' : 'black') : isOwn ? 'white' : '',
          maxWidth: !isOwn ? '80%' : '' // Giới hạn độ rộng tối đa cho tin nhắn của người nhận
        }}
      >
        {renderContent()}
        
        {/* Chỉ hiển thị timestamp khi message có giá trị */}
        {message && message.trim() !== "" && (
          <div className="text-xs mt-1 opacity-70 text-right">
            {timestamp !== "Invalid Date" ? timestamp : "Bây giờ"}
          </div>
        )}
      </div>
      {!isOwn && (
        <div className="flex items-center mt-1 ml-2">
          <button className="p-1 rounded-full hover:bg-gray-200">
            <ThumbsUp className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      )}
    </div>
  );
}
