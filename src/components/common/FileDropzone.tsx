"use client";

import { useCallback, useState } from "react";

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  maxFiles?: number;
  className?: string;
}

export function FileDropzone({
  onFilesSelected,
  accept = "image/*,.pdf,.pptx",
  maxFiles = 10,
  className = "",
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files).slice(0, maxFiles);
      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [maxFiles, onFilesSelected]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []).slice(0, maxFiles);
      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [maxFiles, onFilesSelected]
  );

  return (
    <div
      className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50"
      } ${className}`}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept={accept}
        multiple={maxFiles > 1}
        onChange={handleFileInput}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
      <div className="space-y-2">
        <div className="text-4xl">&#128193;</div>
        <p className="text-sm font-medium">
          Drag & drop files here, or click to browse
        </p>
        <p className="text-xs text-muted-foreground">
          Supports images, PDFs, and PPTX files (max {maxFiles})
        </p>
      </div>
    </div>
  );
}
