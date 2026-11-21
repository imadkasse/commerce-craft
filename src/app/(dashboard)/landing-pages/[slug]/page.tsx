"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
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
  Code2,
  Copy,
  Check,
} from "lucide-react";
import {
  landingPagesService,
  type LandingPage,
  type Product,
} from "@/services/landing-pages.service";

export default function LandingPageEditorPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = params.slug as string;
  const id = searchParams.get("id");

  const [landingPage, setLandingPage] = useState<LandingPage | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [title, setTitle] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#4f46e5");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [font, setFont] = useState("Inter, sans-serif");
  const [buttonStyle, setButtonStyle] = useState("rounded");
  const [headline, setHeadline] = useState("");
  const [localCode, setLocalCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [savingCode, setSavingCode] = useState(false);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => {
    if (!id) {
      setError("No landing page ID provided");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const loadLandingPage = async () => {
      try {
        const data = await landingPagesService.get(id);
        setLandingPage(data.landingPage);
        setProduct(data.product);
        setTitle(data.landingPage.title || "");
        setHeadline(data.landingPage.title || "");
        setLocalCode(data.landingPage.generatedCode || "");
        const cust = data.landingPage.customizations || {};
        setPrimaryColor(cust.colors?.primary || "#4f46e5");
        setBackgroundColor(cust.colors?.background || "#ffffff");
        setFont(cust.font || "Inter, sans-serif");
      } catch {
        setError("Landing page not found");
      } finally {
        setLoading(false);
      }
    };

    loadLandingPage();
  }, [id]);

  const customizationsPayload = useMemo(
    () => ({
      font,
      colors: {
        primary: primaryColor,
        background: backgroundColor,
      },
      buttonStyle,
    }),
    [font, primaryColor, backgroundColor, buttonStyle]
  );

  const getPreviewHtml = useCallback(() => {
    const baseHtml = localCode || landingPage?.generatedCode || "";
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          :root {
            --primary: ${primaryColor};
            --primary-dark: ${primaryColor}dd;
            --bg: ${backgroundColor};
            --text: #111827;
          }
          body {
            font-family: ${font};
            background-color: var(--bg);
            color: var(--text);
            margin: 0;
            padding: 0;
          }
          .btn-primary {
            background-color: var(--primary);
            color: white;
            border: none;
            border-radius: ${
              buttonStyle === "square"
                ? "0"
                : buttonStyle === "pill"
                  ? "9999px"
                  : "8px"
            };
            padding: 0.75rem 1.5rem;
            font-weight: 600;
            cursor: pointer;
            transition: opacity 0.2s;
          }
          .btn-primary:hover { opacity: 0.9; }
        </style>
      </head>
      <body>
        ${baseHtml}
      </body>
      </html>
    `;
  }, [landingPage?.generatedCode, primaryColor, backgroundColor, font, buttonStyle]);

  const previewSrcDoc = useMemo(() => getPreviewHtml(), [getPreviewHtml]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await landingPagesService.update(id, {
        title: title.trim(),
        generatedCode: localCode || landingPage?.generatedCode,
        customizations: customizationsPayload,
      });
      showNotification("success", "Changes saved successfully");
    } catch (err: any) {
      showNotification("error", err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handlePublishToggle = async () => {
    if (!id || !landingPage) return;
    const newStatus = landingPage.status === "published" ? "draft" : "published";
    try {
      if (newStatus === "published") {
        await landingPagesService.publish(id);
      } else {
        await landingPagesService.unpublish(id);
      }
      setLandingPage((prev) => (prev ? { ...prev, status: newStatus } : prev));
      showNotification(
        "success",
        newStatus === "published"
          ? "Landing page published!"
          : "Landing page unpublished."
      );
    } catch (err: any) {
      showNotification("error", err.message || "Failed to update status");
    }
  };

  const handleRegenerate = async () => {
    if (!product) return;
    setRegenerating(true);
    try {
      const data = await landingPagesService.generate({
        productId: product.id,
      });
      if (data.landingPage?.generatedCode) {
        setLandingPage((prev) =>
          prev
            ? {
                ...prev,
                generatedCode: data.landingPage.generatedCode,
                updatedAt: data.landingPage.updatedAt,
              }
            : prev
        );
      }
      showNotification("success", "Landing page regenerated!");
    } catch (err: any) {
      showNotification("error", err.message || "Failed to regenerate");
    } finally {
      setRegenerating(false);
    }
  };

  const handleSaveCode = async () => {
    if (!id) return;
    setSavingCode(true);
    try {
      await landingPagesService.update(id, { generatedCode: localCode });
      setLandingPage((prev) =>
        prev ? { ...prev, generatedCode: localCode, updatedAt: new Date().toISOString() } : prev
      );
      showNotification("success", "HTML code saved to database");
    } catch (err: any) {
      showNotification("error", err.message || "Failed to save code");
    } finally {
      setSavingCode(false);
    }
  };

  const handleReset = () => {
    setPrimaryColor("#4f46e5");
    setBackgroundColor("#ffffff");
    setFont("Inter, sans-serif");
    setButtonStyle("rounded");
    showNotification("success", "Customizations reset to defaults");
  };

  if (loading) {
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <XCircle className="mb-4 h-12 w-12 text-red-400" />
        <h2 className="mb-2 text-lg font-semibold text-gray-900">
          Failed to load landing page
        </h2>
        <p className="mb-6 text-sm text-gray-500">{error}</p>
        <Button variant="outline" onClick={() => router.push("/landing-pages")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Landing Pages
        </Button>
      </div>
    );
  }

  if (!landingPage) return null;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 overflow-hidden">
      {notification && (
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
      )}

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
                onChange={(e) => setTitle(e.target.value)}
                className="h-8 w-64 border-0 bg-transparent p-0 text-xl font-bold text-gray-950 focus-visible:ring-0"
              />
              <Badge
                variant={
                  landingPage.status === "published" ? "default" : "secondary"
                }
              >
                {landingPage.status === "published" ? "Published" : "Draft"}
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-gray-500">
              {product ? `For: ${product.name}` : "Landing page editor"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePublishToggle}
          >
            {landingPage.status === "published" ? (
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
          <Button size="sm" onClick={handleSave} disabled={saving}>
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
          {landingPage.status === "published" && (
            <a
              href={`/lp/${landingPage.slug}`}
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

      <Separator />

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[1fr_320px]">
        <Card className="flex min-h-0 flex-col overflow-hidden">
          <CardHeader className="flex shrink-0 flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium">Preview</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <iframe
              sandbox="allow-scripts"
              srcDoc={previewSrcDoc}
              className="h-full w-full border-0"
              title="Landing page preview"
            />
          </CardContent>
        </Card>

        <Card className="flex min-h-0 flex-col overflow-hidden">
          <CardContent className="flex-1 overflow-y-auto p-4">
            <Tabs defaultValue="content">
              <TabsList className="grid w-full grid-cols-4 gap-0 p-0.5">
                <TabsTrigger value="content" className="gap-1 px-1 text-xs">
                  <Type className="h-3 w-3 shrink-0" />
                  Content
                </TabsTrigger>
                <TabsTrigger value="design" className="gap-1 px-1 text-xs">
                  <Palette className="h-3 w-3 shrink-0" />
                  Design
                </TabsTrigger>
                <TabsTrigger value="code" className="gap-1 px-1 text-xs">
                  <Code2 className="h-3 w-3 shrink-0" />
                  Code
                </TabsTrigger>
                <TabsTrigger value="actions" className="gap-1 px-1 text-xs">
                  <Layout className="h-3 w-3 shrink-0" />
                  Actions
                </TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="headline">Headline</Label>
                  <Input
                    id="headline"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Main headline"
                  />
                </div>
              </TabsContent>

              <TabsContent value="design" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="primaryColor"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-9 w-9 cursor-pointer rounded-md border border-gray-300 bg-white p-0.5"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backgroundColor">Background Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="backgroundColor"
                      type="color"
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="h-9 w-9 cursor-pointer rounded-md border border-gray-300 bg-white p-0.5"
                    />
                    <Input
                      value={backgroundColor}
                      onChange={(e) => setBackgroundColor(e.target.value)}
                      className="flex-1 font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="font">Font Family</Label>
                  <Select
                    id="font"
                    value={font}
                    onChange={(e) => setFont(e.target.value)}
                  >
                    <option value="Inter, sans-serif">Inter</option>
                    <option value="Roboto, sans-serif">Roboto</option>
                    <option value="'Playfair Display', serif">
                      Playfair Display
                    </option>
                    <option value="'Open Sans', sans-serif">Open Sans</option>
                    <option value="'Montserrat', sans-serif">
                      Montserrat
                    </option>
                    <option value="'Poppins', sans-serif">Poppins</option>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="buttonStyle">Button Style</Label>
                  <Select
                    id="buttonStyle"
                    value={buttonStyle}
                    onChange={(e) => setButtonStyle(e.target.value)}
                  >
                    <option value="rounded">Rounded</option>
                    <option value="square">Square</option>
                    <option value="pill">Pill</option>
                  </Select>
                </div>
              </TabsContent>

              <TabsContent value="code" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="code-editor">HTML Code</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{localCode.split("\n").length} lines</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1.5 text-xs"
                        onClick={async () => {
                          await navigator.clipboard.writeText(localCode);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
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
                    </div>
                  </div>
                  <textarea
                    id="code-editor"

                    value={localCode}
                    onChange={(e) => setLocalCode(e.target.value)}
                    className="min-h-[400px] w-full resize-y rounded-lg border border-gray-300 bg-gray-950 px-3 py-2 font-mono text-sm leading-relaxed text-green-400 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    spellCheck={false}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="w-full gap-1.5"
                      onClick={handleSaveCode}
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
                          Save Code to Database
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="actions" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Regenerate with AI</Label>
                  <p className="text-xs text-gray-500">
                    Re-generate the landing page content using AI based on the
                    linked product.
                  </p>
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={handleRegenerate}
                    disabled={!product || regenerating}
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
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleReset}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset to Generated
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}