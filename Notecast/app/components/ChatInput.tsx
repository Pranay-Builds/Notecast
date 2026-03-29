import { Send } from "lucide-react";
import React from "react";

const ChatInput = React.memo(function ChatInput({ onSend, placeholder }: { onSend: (message: string) => void; placeholder?: string }) {
  const [localMessage, setLocalMessage] = React.useState("");

  const handleSend = () => {
    if (!localMessage.trim()) return;
    onSend(localMessage);
    setLocalMessage(""); // clear after send
  };

  return (
    <div className="px-4 pb-6 pt-2">
      <div className="flex items-center gap-3 bg-black rounded-lg px-4">
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
            bg-[#181818]
            border border-zinc-700
            px-3 py-2
            rounded-lg
            text-sm text-white
            placeholder-zinc-500
            resize-none
            outline-none
            transition-all duration-200
            focus:border-zinc-500
            focus:ring-2 focus:ring-zinc-600/40
            hover:border-zinc-600
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