"use client";

import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { DesignSpec } from "@/lib/design-spec.types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function useEditorChat(pieceId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(
    async (
      message: string,
      onSpecUpdate: (spec: DesignSpec) => void
    ) => {
      setMessages((prev) => [...prev, { role: "user", content: message }]);
      setLoading(true);

      try {
        const token = localStorage.getItem("token") || "";
        const res = await api.post<{
          design_spec: DesignSpec;
          explanation: string;
        }>(`/api/editor/${pieceId}/chat`, { message }, token);

        onSpecUpdate(res.design_spec);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: res.explanation },
        ]);
      } catch (err: any) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error: ${err.message || "Failed to apply changes"}`,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [pieceId]
  );

  return { messages, loading, sendMessage };
}
