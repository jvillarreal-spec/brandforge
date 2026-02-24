"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DesignCanvas } from "@/components/editor/DesignCanvas";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { api } from "@/lib/api";
import type { DesignSpec } from "@/lib/design-spec.types";

export default function TemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;

  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTemplate();
  }, [templateId]);

  const fetchTemplate = async () => {
    try {
      const token = localStorage.getItem("token") || "";
      const res = await api.get<{ template: any }>(
        `/api/templates/${templateId}`,
        token
      );
      setTemplate(res.template);
    } catch {
      router.push("/templates");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner className="h-64" />;
  if (!template) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{template.name || template.piece_type}</h1>
          <div className="mt-1 flex gap-2">
            <Badge>{template.piece_type}</Badge>
            <Badge variant="outline">{template.variation_style}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/editor/${templateId}`}>
            <Button>Open in Editor</Button>
          </Link>
          <Link href="/templates">
            <Button variant="outline">Back to Templates</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="h-[600px]">
            <DesignCanvas spec={template.design_spec} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
