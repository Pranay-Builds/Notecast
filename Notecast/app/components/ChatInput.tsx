import { Send } from "lucide-react";
import React from "react";

const ChatInput = React.memo(function ChatInput({
  onSend,
  placeholder,
}: {
  onSend: (message: string) => void;
  placeholder?: string;
}) {
  const [localMessage, setLocalMessage] = React.useState("");

  const handleSend = () => {
    if (!localMessage.trim()) return;
    onSend(localMessage);
    setLocalMessage(""); 
  };

  return (
    <div className="px-4 pb-6 pt-2">
      <div className="flex items-center gap-3 bg-[#181818] rounded-lg border border-zinc-800 px-3 py-2 ">
        <textarea
          value={localMessage}
          onChange={(e) => setLocalMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault(); // stop newline
              handleSend();
            }
          }}
          placeholder={placeholder || "Message AI..."}
          className="
  w-full
  bg-transparent
  border-none
  px-2 py-2
  text-sm text-white
  placeholder-zinc-500
  resize-none
  outline-none
"
        />

        <button
          onClick={handleSend}
          className="text-zinc-400 hover:text-zinc-200 transition p-1 rounded"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
});

export default ChatInput;
