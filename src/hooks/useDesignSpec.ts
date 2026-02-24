"use client";

import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import type { DesignSpec } from "@/lib/design-spec.types";

export function useDesignSpec(pieceId: string) {
  const [spec, setSpec] = useState<DesignSpec | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSpec = useCallback(async () => {
    try {
      const token = localStorage.getItem("token") || "";
      const res = await api.get<{ template: { design_spec: DesignSpec } }>(
        `/api/templates/${pieceId}`,
        token
      );
      setSpec(res.template.design_spec);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [pieceId]);

  return { spec, setSpec, loading, error, refetch: fetchSpec };
}
