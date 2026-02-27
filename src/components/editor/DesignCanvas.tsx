"use client";

import { useEffect, useRef, useCallback } from "react";
import * as fabric from "fabric";
import { renderDesignSpec } from "@/lib/fabric-renderer";
import type { DesignSpec } from "@/lib/design-spec.types";

interface DesignCanvasProps {
  spec: DesignSpec | null;
  onCanvasReady?: (canvas: fabric.Canvas) => void;
}

export function DesignCanvas({ spec, onCanvasReady }: DesignCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fit the canvas into the container
  const fitCanvas = useCallback(() => {
    if (!fabricRef.current || !spec || !containerRef.current) return;

    const container = containerRef.current;
    const canvasWidth = spec.canvas.width;
    const canvasHeight = spec.canvas.height;

    // Use actual rendered size of container (minus padding)
    const containerWidth = container.clientWidth - 32;
    const containerHeight = container.clientHeight - 32;

    if (containerWidth <= 0 || containerHeight <= 0) return;

    const scale = Math.min(
      containerWidth / canvasWidth,
      containerHeight / canvasHeight,
      1 // never zoom beyond 100%
    );

    fabricRef.current.setZoom(scale);
    fabricRef.current.setDimensions({
      width: Math.round(canvasWidth * scale),
      height: Math.round(canvasHeight * scale),
    });
  }, [spec]);

  // Initialize canvas once
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new fabric.Canvas(canvasRef.current, {
      selection: true,
      preserveObjectStacking: true,
    });

    fabricRef.current = canvas;
    onCanvasReady?.(canvas);

    return () => {
      canvas.dispose();
      fabricRef.current = null;
    };
  }, []);

  // Render spec when it changes
  useEffect(() => {
    if (!fabricRef.current || !spec) return;

    const assetResolver = async (src: string) => src;

    renderDesignSpec(fabricRef.current, spec, assetResolver).then(() => {
      fitCanvas();
    });
  }, [spec, fitCanvas]);

  // Re-fit on window resize
  useEffect(() => {
    const handleResize = () => fitCanvas();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [fitCanvas]);

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full items-center justify-center overflow-hidden bg-muted/30 p-4"
    >
      <div className="shadow-lg">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
