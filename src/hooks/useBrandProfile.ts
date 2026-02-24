"use client";

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import type { BrandProfile } from "@/lib/design-spec.types";

export function useBrandProfile() {
  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem("token") || "";
      const res = await api.get<{ brand_profile: BrandProfile }>(
        "/api/brand/profile",
        token
      );
      setProfile(res.brand_profile);
      setError(null);
    } catch (err: any) {
      setProfile(null);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, error, refetch: fetchProfile };
}
