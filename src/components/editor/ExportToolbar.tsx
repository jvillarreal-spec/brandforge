"use client";

import { useState } from "react";
import * as fabric from "fabric";
import { Button } from "@/components/ui/button";
import { exportCanvasToImage } from "@/lib/fabric-renderer";
import { api } from "@/lib/api";

interface ExportToolbarProps {
  canvas: fabric.Canvas | null;
  pieceId: string;
}

export function ExportToolbar({ canvas, pieceId }: ExportToolbarProps) {
  const [exporting, setExporting] = useState("");

  const handlePngExport = () => {
    if (!canvas) return;
    const zoom = canvas.getZoom();
    canvas.setZoom(1);
    const dataUrl = exportCanvasToImage(canvas, "png");
    canvas.setZoom(zoom);

    const link = document.createElement("a");
    link.download = `design-${pieceId}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleJpgExport = () => {
    if (!canvas) return;
    const zoom = canvas.getZoom();
    canvas.setZoom(1);
    const dataUrl = exportCanvasToImage(canvas, "jpeg", 0.9);
    canvas.setZoom(zoom);

    const link = document.createElement("a");
    link.download = `design-${pieceId}.jpg`;
    link.href = dataUrl;
    link.click();
  };

  const handleServerExport = async (format: "html" | "pptx") => {
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
      setExporting("");
    }
  };

  return (
    <div className="flex items-center gap-2 border-b px-4 py-2">
      <span className="text-sm font-medium text-muted-foreground">Export:</span>
      <Button size="sm" variant="outline" onClick={handlePngExport}>
        PNG
      </Button>
      <Button size="sm" variant="outline" onClick={handleJpgExport}>
        JPG
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleServerExport("html")}
        disabled={exporting === "html"}
      >
        {exporting === "html" ? "Exporting..." : "HTML"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={() => handleServerExport("pptx")}
        disabled={exporting === "pptx"}
      >
        {exporting === "pptx" ? "Exporting..." : "PPTX"}
      </Button>
    </div>
  );
}
