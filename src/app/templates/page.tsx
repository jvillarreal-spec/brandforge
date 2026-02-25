"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { api } from "@/lib/api";
import type { PieceType } from "@/lib/design-spec.types";
import { TemplatePreview } from "@/components/templates/TemplatePreview";

const PIECE_TYPES: { value: PieceType; label: string }[] = [
  { value: "instagram_post", label: "Instagram Post" },
  { value: "instagram_story", label: "Instagram Story" },
  { value: "instagram_carousel", label: "Instagram Carousel" },
  { value: "email_header", label: "Email Header" },
  { value: "email_full", label: "Email Full" },
  { value: "presentation_slide", label: "Presentation Slide" },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedType, setSelectedType] = useState<PieceType>("instagram_post");
  const [filterType, setFilterType] = useState<string>("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTemplates();
  }, [filterType]);

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem("token") || "";
      const query = filterType ? `?piece_type=${filterType}` : "";
      const res = await api.get<{ templates: any[]; total: number }>(
        `/api/templates${query}`,
        token
      );
      setTemplates(res.templates);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setError("");
    setGenerating(true);
    try {
      const token = localStorage.getItem("token") || "";
      await api.post(
        "/api/templates/generate",
        { piece_type: selectedType },
        token
      );
      await fetchTemplates();
    } catch (err: any) {
      setError(err.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem("token") || "";
      await api.delete(`/api/templates/${id}`, token);
      setTemplates(templates.filter((t) => t.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Templates</h1>
          <p className="text-muted-foreground">
            Generate and manage AI-powered design templates
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Generate New Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <select
              className="rounded-md border bg-background px-3 py-2 text-sm"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as PieceType)}
            >
              {PIECE_TYPES.map((pt) => (
                <option key={pt.value} value={pt.value}>
                  {pt.label}
                </option>
              ))}
            </select>
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? "Generating 4 variations..." : "Generate Templates"}
            </Button>
          </div>
          {generating && (
            <div className="mt-4">
              <LoadingSpinner />
              <p className="mt-2 text-center text-sm text-muted-foreground">
                AI is creating 4 design variations. This may take a minute...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button
          variant={filterType === "" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterType("")}
        >
          All
        </Button>
        {PIECE_TYPES.map((pt) => (
          <Button
            key={pt.value}
            variant={filterType === pt.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType(pt.value)}
          >
            {pt.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner className="h-64" />
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No templates yet. Generate your first templates above.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {templates.map((t) => (
            <Card key={t.id} className="overflow-hidden">
              {t.design_spec && typeof t.design_spec === "object" && t.design_spec.canvas ? (
                <TemplatePreview
                  designSpec={t.design_spec}
                  className="aspect-square"
                />
              ) : (
                <div className="aspect-square bg-muted flex items-center justify-center text-xs text-muted-foreground p-4">
                  <div className="text-center">
                    <p className="font-medium">{t.piece_type}</p>
                    <p>{t.variation_style}</p>
                  </div>
                </div>
              )}
              <CardContent className="p-3">
                <p className="truncate text-sm font-medium">
                  {t.name || t.piece_type}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {t.variation_style}
                  </Badge>
                  <div className="flex gap-1">
                    <Link href={`/editor/${t.id}`}>
                      <Button size="sm" variant="default">
                        Edit
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(t.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
