"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to BrandForge</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Brand Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Set up your brand identity by uploading assets and letting AI
              analyze your visual style.
            </p>
            <Link href="/brand">
              <Button variant="outline" className="w-full">
                Manage Brand
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Generate AI-powered design templates for Instagram, emails, and
              presentations.
            </p>
            <Link href="/templates">
              <Button variant="outline" className="w-full">
                View Templates
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Start</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              1. Upload brand assets<br />
              2. Review AI analysis<br />
              3. Generate templates<br />
              4. Edit with AI chat
            </p>
            <Link href="/brand/onboarding">
              <Button className="w-full">Get Started</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
