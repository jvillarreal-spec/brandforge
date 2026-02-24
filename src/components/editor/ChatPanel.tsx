"use client";

import { useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  messages: Message[];
  onSend: (message: string) => void;
  loading?: boolean;
}

export function ChatPanel({ messages, onSend, loading }: ChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex h-full flex-col border-l">
      <div className="border-b px-4 py-3">
        <h3 className="font-semibold">AI Design Editor</h3>
        <p className="text-xs text-muted-foreground">
          Describe changes to your design
        </p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">
            <p>Start editing your design with AI.</p>
            <p className="mt-1">Try: &quot;Make the title larger&quot;</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={i} role={msg.role} content={msg.content} />
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-muted px-4 py-2 text-sm text-muted-foreground">
              AI is editing your design...
            </div>
          </div>
        )}
      </div>

      <ChatInput onSend={onSend} disabled={loading} />
    </div>
  );
}
