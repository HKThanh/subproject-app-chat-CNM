import ChatHeader from "./chat-header";
import ChatInput from "./chat-input";
import ChatMessage from "./chat-message";

interface ChatDetailProps {
  onToggleInfo: () => void;
  showChatInfo: boolean;
}

export default function ChatDetail({
  onToggleInfo,
  showChatInfo,
}: ChatDetailProps) {
  const codeMessage = `
/>
<Path
  d="M15.7083 7.69141L15.1667 16.0831C15.075 17.3914 15 18.4081 12.675 18.4081H7.32499C4.99999 18.4081 4.92499 17.3914 4.83332 16.0831L4.29166 7.69141"
  stroke={color}
  strokeWidth={1.5}
  strokeLinecap="round"
  strokeLinejoin="round"
/>
<Path
  d="M8.60834 13.8252H11.3833"
  stroke={color}
  strokeWidth={1.5}
  strokeLinecap="round"
  strokeLinejoin="round"
/>
<Path
  d="M7.91666 10.4922H12.0833"
  stroke={color}
  strokeWidth={1.5}
  strokeLinecap="round"
  strokeLinejoin="round"
/>
</Svg>
};
16:37
  `;

  return (
    <div className="flex flex-col h-full">
      <ChatHeader onToggleInfo={onToggleInfo} showChatInfo={showChatInfo} />
      <div className="flex-1 overflow-y-auto p-4 bg-gray-900">
        <ChatMessage message={codeMessage} timestamp="16:37" />
      </div>
      <ChatInput />
    </div>
  );
}
