"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { api } from "@/lib/api";
import type { BrandProfile } from "@/lib/design-spec.types";

export default function BrandPage() {
  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token") || "";
      const res = await api.get<{ brand_profile: BrandProfile }>(
        "/api/brand/profile",
        token
      );
      setProfile(res.brand_profile);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("token") || "";
      await api.put("/api/brand/profile", { status: "confirmed" }, token);
      setProfile({ ...profile, status: "confirmed" });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleColorChange = async (key: string, value: string) => {
    if (!profile) return;
    const newColors = { ...profile.colors, [key]: value };
    setProfile({ ...profile, colors: newColors });
  };

  const handleSaveColors = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("token") || "";
      await api.put("/api/brand/profile", { colors: profile.colors }, token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner className="h-64" />;

  if (!profile) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Brand Profile</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="mb-4 text-muted-foreground">
              No brand profile found. Start by uploading your brand assets.
            </p>
            <Link href="/brand/onboarding">
              <Button>Start Brand Onboarding</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{profile.name}</h1>
          <Badge variant={profile.status === "confirmed" ? "default" : "secondary"}>
            {profile.status}
          </Badge>
        </div>
        {profile.status === "draft" && (
          <Button onClick={handleConfirm} disabled={saving}>
            {saving ? "Confirming..." : "Confirm Profile"}
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Colors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(profile.colors).map(([key, value]) => (
              <div key={key} className="flex items-center gap-3">
                <input
                  type="color"
                  value={value}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="h-8 w-8 cursor-pointer rounded border"
                />
                <Label className="w-28 text-sm">{key}</Label>
                <Input
                  value={value}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="h-8 w-24 font-mono text-xs"
                />
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveColors}
              disabled={saving}
            >
              Save Colors
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Typography</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm text-muted-foreground">Heading Font</Label>
              <p className="text-lg font-semibold">{profile.typography.heading}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Body Font</Label>
              <p className="text-lg">{profile.typography.body}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Style</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-sm text-muted-foreground">Mood</Label>
              <p>{profile.style.mood}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Keywords</Label>
              <div className="flex flex-wrap gap-2">
                {profile.style.keywords.map((kw) => (
                  <Badge key={kw} variant="outline">
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Border Radius</Label>
              <p>{profile.style.borderRadius}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Shadow Style</Label>
              <p>{profile.style.shadowStyle}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
