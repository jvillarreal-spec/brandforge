"use client";

import { useState, useCallback } from "react";
import * as fabric from "fabric";
import { exportCanvasToImage } from "@/lib/fabric-renderer";
import { api } from "@/lib/api";

export function useExport(pieceId: string) {
  const [exporting, setExporting] = useState<string | null>(null);

  const exportPng = useCallback(
    (canvas: fabric.Canvas) => {
      const zoom = canvas.getZoom();
      canvas.setZoom(1);
      const dataUrl = exportCanvasToImage(canvas, "png");
      canvas.setZoom(zoom);

      const link = document.createElement("a");
      link.download = `design-${pieceId}.png`;
      link.href = dataUrl;
      link.click();
    },
    [pieceId]
  );

  const exportJpg = useCallback(
    (canvas: fabric.Canvas) => {
      const zoom = canvas.getZoom();
      canvas.setZoom(1);
      const dataUrl = exportCanvasToImage(canvas, "jpeg", 0.9);
      canvas.setZoom(zoom);

      const link = document.createElement("a");
      link.download = `design-${pieceId}.jpg`;
      link.href = dataUrl;
      link.click();
    },
    [pieceId]
  );

  const exportServer = useCallback(
    async (format: "html" | "pptx") => {
      setExporting(format);
      try {
        const token = localStorage.getItem("token") || "";
        const res = await api.post<{ export_id: string; status: string }>(
          `/api/export/${pieceId}`,
          { format },
          token
        );

        if (res.status === "completed") {
          const statusRes = await api.get<{ download_url: string }>(
            `/api/export/${res.export_id}/status`,
            token
          );
          if (statusRes.download_url) {
            window.open(statusRes.download_url, "_blank");
          }
        }
      } catch (err: any) {
        console.error("Export failed:", err.message);
      } finally {
        setExporting(null);
      }
    },
    [pieceId]
  );

  return { exporting, exportPng, exportJpg, exportServer };
}
