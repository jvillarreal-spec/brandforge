"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileDropzone } from "@/components/common/FileDropzone";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { api } from "@/lib/api";

type Step = "upload" | "analyzing" | "review";

export default function BrandOnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<any>(null);

  const handleUploadAndAnalyze = async () => {
    if (files.length === 0) {
      setError("Please upload at least one file");
      return;
    }

    setError("");
    setStep("analyzing");

    try {
      const token = localStorage.getItem("token") || "";
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      if (url) formData.append("url", url);

      const uploadRes = await api.upload<{ asset_ids: string[] }>(
        "/api/brand/upload-assets",
        formData,
        token
      );

      const analyzeRes = await api.post<{ brand_profile: any; _debug?: any }>(
        "/api/brand/analyze",
        { asset_ids: uploadRes.asset_ids, company_url: url || undefined },
        token
      );

      // Log debug info to console
      if (analyzeRes._debug) {
        console.log("[Brand Analysis Debug]", analyzeRes._debug);
        if (!analyzeRes._debug.usedAI) {
          console.warn("AI analysis was NOT used. Reason:", analyzeRes._debug.aiError || "No API key or no images");
        }
      }

      setProfile(analyzeRes.brand_profile);
      setStep("review");
    } catch (err: any) {
      setError(err.message || "Analysis failed");
      setStep("upload");
    }
  };

  const handleConfirm = async () => {
    try {
      const token = localStorage.getItem("token") || "";
      await api.put("/api/brand/profile", { status: "confirmed" }, token);
      router.push("/brand");
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (step === "analyzing") {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-24">
        <LoadingSpinner />
        <p className="text-lg font-medium">Analyzing your brand assets...</p>
        <p className="text-sm text-muted-foreground">
          AI is extracting colors, typography, and style from your files
        </p>
      </div>
    );
  }

  if (step === "review" && profile) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Review Brand Profile</h1>
          <p className="text-muted-foreground">
            AI has analyzed your assets. Review and confirm your brand identity.
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{profile.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-sm font-medium">Colors</Label>
              <div className="mt-2 flex flex-wrap gap-3">
                {Object.entries(profile.colors || {}).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div
                      className="h-8 w-8 rounded border"
                      style={{ backgroundColor: val as string }}
                    />
                    <span className="text-xs text-muted-foreground">{key}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Typography</Label>
              <p className="mt-1">
                Heading: <strong>{profile.typography?.heading}</strong> | Body:{" "}
                <strong>{profile.typography?.body}</strong>
              </p>
            </div>

            <div>
              <Label className="text-sm font-medium">Style</Label>
              <p className="mt-1 text-sm">
                Mood: {profile.style?.mood} | Shadow: {profile.style?.shadowStyle}
              </p>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleConfirm}>Confirm Profile</Button>
              <Button variant="outline" onClick={() => router.push("/brand")}>
                Edit First
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Brand Onboarding</h1>
        <p className="text-muted-foreground">
          Upload your brand assets and let AI extract your visual identity
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Upload Brand Assets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FileDropzone
            onFilesSelected={(newFiles) =>
              setFiles((prev) => [...prev, ...newFiles])
            }
          />

          {files.length > 0 && (
            <div className="space-y-1">
              <Label className="text-sm">Selected files:</Label>
              {files.map((f, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded bg-muted px-3 py-1 text-sm"
                >
                  <span>{f.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setFiles(files.filter((_, j) => j !== i))}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="url">Company Website URL (optional)</Label>
            <Input
              id="url"
              placeholder="https://your-company.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>

          <Button
            onClick={handleUploadAndAnalyze}
            className="w-full"
            disabled={files.length === 0}
          >
            Analyze Brand Assets
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
