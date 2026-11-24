"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  ExternalLink,
  Save,
  Globe,
  GlobeOff,
  Sparkles,
  RotateCcw,
  Loader2,
  CheckCircle,
  XCircle,
  Palette,
  Type,
  Layout,
  Copy,
  Check,
  Eye,
  PenLine,
} from "lucide-react";

// GrapesJS needs `window`; load it client-side only.
const GrapesjsEditor = dynamic(
  () => import("@/components/landing-pages/grapesjs-editor"),
  { ssr: false },
);

export function LandingPageEditorSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-[600px] rounded-xl lg:col-span-2" />
        <Skeleton className="h-[600px] rounded-xl" />
      </div>
    </div>
  );
}

function ColorField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-9 cursor-pointer rounded-md border border-gray-300 bg-white p-0.5"
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 font-mono text-sm"
        />
      </div>
    </div>
  );
}

export function EditorNotification({
  notification,
}: {
  notification: { type: "success" | "error"; message: string };
}) {
  return (
    <div
      className={`fixed right-4 top-4 z-50 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg ${
        notification.type === "success"
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {notification.type === "success" ? (
        <CheckCircle className="h-4 w-4 shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 shrink-0" />
      )}
      {notification.message}
    </div>
  );
}

export function EditorHeader({
  title,
  onTitleChange,
  status,
  productName,
  onPublishToggle,
  onSave,
  saving,
  slug,
}: {
  title: string;
  onTitleChange: (value: string) => void;
  status: "published" | "draft";
  productName?: string;
  onPublishToggle: () => void;
  onSave: () => void;
  saving: boolean;
  slug: string;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <Link
          href="/landing-pages"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-300 bg-white shadow-sm text-gray-900 transition-colors hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <Input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="h-8 w-64 border-0 bg-transparent p-0 text-xl font-bold text-gray-950 focus-visible:ring-0"
            />
            <Badge variant={status === "published" ? "default" : "secondary"}>
              {status === "published" ? "Published" : "Draft"}
            </Badge>
          </div>
          <p className="mt-0.5 text-sm text-gray-500">
            {productName ? `For: ${productName}` : "Landing page editor"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onPublishToggle}>
          {status === "published" ? (
            <>
              <GlobeOff className="mr-1.5 h-4 w-4" />
              Unpublish
            </>
          ) : (
            <>
              <Globe className="mr-1.5 h-4 w-4" />
              Publish
            </>
          )}
        </Button>
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-1.5 h-4 w-4" />
              Save
            </>
          )}
        </Button>
        {status === "published" && (
          <a
            href={`/lp/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            <ExternalLink className="h-4 w-4" />
            View Live
          </a>
        )}
      </div>
    </div>
  );
}

export function PreviewPanel({ srcDoc }: { srcDoc: string }) {
  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden">
      <CardHeader className="flex shrink-0 flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-medium">Preview</CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 p-0">
        <iframe
          sandbox="allow-scripts"
          srcDoc={srcDoc}
          className="h-full w-full border-0"
          title="Landing page preview"
        />
      </CardContent>
    </Card>
  );
}

function ContentPanel({
  headline,
  onHeadlineChange,
}: {
  headline: string;
  onHeadlineChange: (value: string) => void;
}) {
  return (
    <TabsContent value="content" className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="headline">Headline</Label>
        <Input
          id="headline"
          value={headline}
          onChange={(e) => onHeadlineChange(e.target.value)}
          placeholder="Main headline"
        />
      </div>
    </TabsContent>
  );
}

export interface DesignPanelProps {
  primaryColor: string;
  onPrimaryColorChange: (value: string) => void;
  backgroundColor: string;
  onBackgroundColorChange: (value: string) => void;
  font: string;
  onFontChange: (value: string) => void;
  buttonStyle: string;
  onButtonStyleChange: (value: string) => void;
}

function DesignPanel({
  primaryColor,
  onPrimaryColorChange,
  backgroundColor,
  onBackgroundColorChange,
  font,
  onFontChange,
  buttonStyle,
  onButtonStyleChange,
}: DesignPanelProps) {
  return (
    <TabsContent value="design" className="space-y-4 pt-4">
      <ColorField
        id="primaryColor"
        label="Primary Color"
        value={primaryColor}
        onChange={onPrimaryColorChange}
      />

      <ColorField
        id="backgroundColor"
        label="Background Color"
        value={backgroundColor}
        onChange={onBackgroundColorChange}
      />

      <div className="space-y-2">
        <Label htmlFor="font">Font Family</Label>
        <Select
          id="font"
          value={font}
          onChange={(e) => onFontChange(e.target.value)}
        >
          <option value="Inter, sans-serif">Inter</option>
          <option value="Roboto, sans-serif">Roboto</option>
          <option value="'Playfair Display', serif">Playfair Display</option>
          <option value="'Open Sans', sans-serif">Open Sans</option>
          <option value="'Montserrat', sans-serif">Montserrat</option>
          <option value="'Poppins', sans-serif">Poppins</option>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="buttonStyle">Button Style</Label>
        <Select
          id="buttonStyle"
          value={buttonStyle}
          onChange={(e) => onButtonStyleChange(e.target.value)}
        >
          <option value="rounded">Rounded</option>
          <option value="square">Square</option>
          <option value="pill">Pill</option>
        </Select>
      </div>
    </TabsContent>
  );
}

export type EditorView = "preview" | "editor";

export function EditorViewToggle({
  view,
  onViewChange,
}: {
  view: EditorView;
  onViewChange: (view: EditorView) => void;
}) {
  return (
    <div className="inline-flex shrink-0 items-center gap-0.5 self-start rounded-lg border border-line bg-surface p-0.5 shadow-sm">
      <Button
        variant={view === "preview" ? "default" : "ghost"}
        size="sm"
        className="h-7 gap-1.5 px-3"
        onClick={() => onViewChange("preview")}
      >
        <Eye className="h-3.5 w-3.5" />
        Preview
      </Button>
      <Button
        variant={view === "editor" ? "default" : "ghost"}
        size="sm"
        className="h-7 gap-1.5 px-3"
        onClick={() => onViewChange("editor")}
      >
        <PenLine className="h-3.5 w-3.5" />
        Visual Editor
      </Button>
    </div>
  );
}

export function VisualEditorPanel({
  localCode,
  onLocalCodeChange,
  onCopyCode,
  copied,
  savingCode,
  onSaveCode,
}: {
  localCode: string;
  onLocalCodeChange: (value: string) => void;
  onCopyCode: () => void;
  copied: boolean;
  savingCode: boolean;
  onSaveCode: () => void;
}) {
  return (
    <Card className="flex h-full min-h-0 flex-col overflow-hidden">
      <CardHeader className="flex shrink-0 flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="text-sm font-medium">Visual Editor</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={onCopyCode}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-500" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy
              </>
            )}
          </Button>
          <Button
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={onSaveCode}
            disabled={savingCode}
          >
            {savingCode ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Save Code
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 p-0">
        <GrapesjsEditor
          initialHtml={localCode}
          onHtmlChange={onLocalCodeChange}
        />
      </CardContent>
    </Card>
  );
}

function ActionsPanel({
  onRegenerate,
  regenerating,
  canRegenerate,
  onReset,
}: {
  onRegenerate: () => void;
  regenerating: boolean;
  canRegenerate: boolean;
  onReset: () => void;
}) {
  return (
    <TabsContent value="actions" className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label>Regenerate with AI</Label>
        <p className="text-xs text-gray-500">
          Re-generate the landing page content using AI based on the linked
          product.
        </p>
        <Button
          variant="default"
          className="w-full"
          onClick={onRegenerate}
          disabled={!canRegenerate || regenerating}
        >
          {regenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Regenerating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Regenerate with AI
            </>
          )}
        </Button>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label>Reset Customizations</Label>
        <p className="text-xs text-gray-500">
          Revert all colors, fonts, and styles back to defaults.
        </p>
        <Button variant="outline" className="w-full" onClick={onReset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to Generated
        </Button>
      </div>
    </TabsContent>
  );
}

export function EditorSidebar({
  headline,
  onHeadlineChange,
  design,
  onRegenerate,
  regenerating,
  canRegenerate,
  onReset,
}: {
  headline: string;
  onHeadlineChange: (value: string) => void;
  design: DesignPanelProps;
  onRegenerate: () => void;
  regenerating: boolean;
  canRegenerate: boolean;
  onReset: () => void;
}) {
  return (
    <Card className="flex min-h-0 flex-col overflow-hidden">
      <CardContent className="flex-1 overflow-y-auto p-4">
        <Tabs defaultValue="content">
          <TabsList className="grid w-full grid-cols-3 gap-0 p-0.5">
            <TabsTrigger value="content" className="gap-1 px-1 text-xs">
              <Type className="h-3 w-3 shrink-0" />
              Content
            </TabsTrigger>
            <TabsTrigger value="design" className="gap-1 px-1 text-xs">
              <Palette className="h-3 w-3 shrink-0" />
              Design
            </TabsTrigger>
            <TabsTrigger value="actions" className="gap-1 px-1 text-xs">
              <Layout className="h-3 w-3 shrink-0" />
              Actions
            </TabsTrigger>
          </TabsList>

          <ContentPanel
            headline={headline}
            onHeadlineChange={onHeadlineChange}
          />

          <DesignPanel {...design} />

          <ActionsPanel
            onRegenerate={onRegenerate}
            regenerating={regenerating}
            canRegenerate={canRegenerate}
            onReset={onReset}
          />
        </Tabs>
      </CardContent>
    </Card>
  );
}