"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import * as fabric from "fabric";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DesignCanvas } from "@/components/editor/DesignCanvas";
import { ChatPanel } from "@/components/editor/ChatPanel";
import { ExportToolbar } from "@/components/editor/ExportToolbar";
import { VersionHistory } from "@/components/editor/VersionHistory";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { api } from "@/lib/api";
import type { DesignSpec } from "@/lib/design-spec.types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Edit {
  id: string;
  user_message: string;
  ai_explanation: string;
  created_at: string | null;
}

export default function EditorPage() {
  const params = useParams();
  const pieceId = params.id as string;

  const [spec, setSpec] = useState<DesignSpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [edits, setEdits] = useState<Edit[]>([]);
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTemplate();
    fetchHistory();
  }, [pieceId]);

  const fetchTemplate = async () => {
    try {
      const token = localStorage.getItem("token") || "";
      const res = await api.get<{ template: any }>(
        `/api/templates/${pieceId}`,
        token
      );
      setSpec(res.template.design_spec);
      setTemplateName(res.template.name || res.template.piece_type);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem("token") || "";
      const res = await api.get<{ edits: Edit[] }>(
        `/api/editor/${pieceId}/history`,
        token
      );
      setEdits(res.edits);
    } catch {
      // no history yet
    }
  };

  const handleSendMessage = useCallback(
    async (message: string) => {
      setMessages((prev) => [...prev, { role: "user", content: message }]);
      setChatLoading(true);
      setError("");

      try {
        const token = localStorage.getItem("token") || "";
        const res = await api.post<{
          design_spec: DesignSpec;
          explanation: string;
        }>(`/api/editor/${pieceId}/chat`, { message }, token);

        setSpec(res.design_spec);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: res.explanation },
        ]);
        await fetchHistory();
      } catch (err: any) {
        const errMsg = err.message || "Failed to apply changes";
        let userMessage = errMsg;

        // Friendly messages for common errors
        if (errMsg.includes("Failed to fetch") || errMsg.includes("timeout") || errMsg.includes("NetworkError")) {
          userMessage = "⏱️ La solicitud tardó demasiado. La API de IA puede estar saturada. Espera 1 minuto e intenta de nuevo.";
        } else if (errMsg.includes("rate_limit") || errMsg.includes("429") || errMsg.includes("Rate limit")) {
          userMessage = "⏳ Límite de uso alcanzado. Espera 1 minuto antes de enviar otro mensaje.";
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: userMessage,
          },
        ]);
      } finally {
        setChatLoading(false);
      }
    },
    [pieceId]
  );

  const handleRevert = async (editId: string) => {
    try {
      const token = localStorage.getItem("token") || "";
      const res = await api.post<{ design_spec: DesignSpec }>(
        `/api/editor/${pieceId}/revert/${editId}`,
        {},
        token
      );
      setSpec(res.design_spec);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Reverted to previous version." },
      ]);
      await fetchHistory();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <h2 className="text-lg font-semibold">{templateName}</h2>
        <ExportToolbar canvas={canvas} pieceId={pieceId} />
      </div>

      {error && (
        <div className="mx-4 mt-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1">
          <DesignCanvas spec={spec} onCanvasReady={setCanvas} />
        </div>

        <div className="w-96">
          <Tabs defaultValue="chat" className="flex h-full flex-col">
            <TabsList className="mx-4 mt-2">
              <TabsTrigger value="chat">Chat</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="chat" className="flex-1 overflow-hidden">
              <ChatPanel
                messages={messages}
                onSend={handleSendMessage}
                loading={chatLoading}
              />
            </TabsContent>
            <TabsContent value="history" className="flex-1 overflow-auto">
              <VersionHistory edits={edits} onRevert={handleRevert} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
