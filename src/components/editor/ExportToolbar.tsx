"use client";

import { useState } from "react";
import * as fabric from "fabric";
import { Button } from "@/components/ui/button";
import { exportCanvasToImage } from "@/lib/fabric-renderer";
import { designSpecToHtml } from "@/lib/export-html";
import { designSpecToPptx } from "@/lib/export-pptx";
import type { DesignSpec } from "@/lib/design-spec.types";

interface ExportToolbarProps {
  canvas: fabric.Canvas | null;
  pieceId: string;
  spec?: DesignSpec | null;
}

export function ExportToolbar({ canvas, pieceId, spec }: ExportToolbarProps) {
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

  const handleHtmlExport = () => {
    if (!spec) return;
    setExporting("html");
    try {
      const html = designSpecToHtml(spec);
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `design-${pieceId}.html`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("HTML export failed:", err);
    } finally {
      setExporting("");
    }
  };

  const handlePptxExport = async () => {
    if (!spec) return;
    setExporting("pptx");
    try {
      await designSpecToPptx(spec, `design-${pieceId}.pptx`);
    } catch (err) {
      console.error("PPTX export failed:", err);
    } finally {
      setExporting("");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-muted-foreground">Export:</span>
      <Button size="sm" variant="outline" onClick={handlePngExport} disabled={!canvas}>
        PNG
      </Button>
      <Button size="sm" variant="outline" onClick={handleJpgExport} disabled={!canvas}>
        JPG
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handleHtmlExport}
        disabled={!spec || exporting === "html"}
      >
        {exporting === "html" ? "Exportando..." : "HTML"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handlePptxExport}
        disabled={!spec || exporting === "pptx"}
      >
        {exporting === "pptx" ? "Exportando..." : "PPTX"}
      </Button>
    </div>
  );
}
