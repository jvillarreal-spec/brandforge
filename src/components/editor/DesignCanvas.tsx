"use client";

import { useEffect, useRef, useCallback } from "react";
import * as fabric from "fabric";
import { renderDesignSpec, exportCanvasToImage } from "@/lib/fabric-renderer";
import type { DesignSpec } from "@/lib/design-spec.types";

interface DesignCanvasProps {
  spec: DesignSpec | null;
  onCanvasReady?: (canvas: fabric.Canvas) => void;
}

export function DesignCanvas({ spec, onCanvasReady }: DesignCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!fabricRef.current || !spec) return;

    const assetResolver = async (src: string) => src;

    renderDesignSpec(fabricRef.current, spec, assetResolver).then(() => {
      if (fabricRef.current && containerRef.current) {
        const container = containerRef.current;
        const canvasWidth = spec.canvas.width;
        const canvasHeight = spec.canvas.height;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        const scale = Math.min(
          containerWidth / canvasWidth,
          containerHeight / canvasHeight,
          1
        );

        fabricRef.current.setZoom(scale);
        fabricRef.current.setDimensions({
          width: canvasWidth * scale,
          height: canvasHeight * scale,
        });
      }
    });
  }, [spec]);

  return (
    <div
      ref={containerRef}
      className="flex h-full items-center justify-center overflow-auto bg-muted/30 p-4"
    >
      <div className="shadow-lg">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
