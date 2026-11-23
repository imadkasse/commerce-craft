"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, XCircle } from "lucide-react";
import {
  landingPagesService,
  type LandingPage,
  type Product,
} from "@/services/landing-pages.service";
import {
  EditorHeader,
  EditorNotification,
  EditorSidebar,
  LandingPageEditorSkeleton,
  PreviewPanel,
} from "./editor-parts";

function buildPreviewHtml({
  baseHtml,
  primaryColor,
  backgroundColor,
  font,
  buttonStyle,
}: {
  baseHtml: string;
  primaryColor: string;
  backgroundColor: string;
  font: string;
  buttonStyle: string;
}) {
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
}

function LandingPageEditor() {
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

    let cancelled = false;

    const loadLandingPage = async () => {
      try {
        const data = await landingPagesService.get(id);
        if (cancelled) return;
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
        if (!cancelled) setError("Landing page not found");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadLandingPage();

    return () => {
      cancelled = true;
    };
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

  const previewSrcDoc = useMemo(
    () =>
      buildPreviewHtml({
        baseHtml: localCode || landingPage?.generatedCode || "",
        primaryColor,
        backgroundColor,
        font,
        buttonStyle,
      }),
    [
      localCode,
      landingPage?.generatedCode,
      primaryColor,
      backgroundColor,
      font,
      buttonStyle,
    ]
  );

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
        prev
          ? {
              ...prev,
              generatedCode: localCode,
              updatedAt: new Date().toISOString(),
            }
          : prev
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

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(localCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <LandingPageEditorSkeleton />;
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
      {notification && <EditorNotification notification={notification} />}

      <EditorHeader
        title={title}
        onTitleChange={setTitle}
        status={landingPage.status}
        productName={product?.name}
        onPublishToggle={handlePublishToggle}
        onSave={handleSave}
        saving={saving}
        slug={landingPage.slug}
      />

      <Separator />

      <div className="grid flex-1 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[1fr_320px]">
        <PreviewPanel srcDoc={previewSrcDoc} />

        <EditorSidebar
          headline={headline}
          onHeadlineChange={setHeadline}
          design={{
            primaryColor,
            onPrimaryColorChange: setPrimaryColor,
            backgroundColor,
            onBackgroundColorChange: setBackgroundColor,
            font,
            onFontChange: setFont,
            buttonStyle,
            onButtonStyleChange: setButtonStyle,
          }}
          localCode={localCode}
          onLocalCodeChange={setLocalCode}
          onCopyCode={handleCopyCode}
          copied={copied}
          savingCode={savingCode}
          onSaveCode={handleSaveCode}
          onRegenerate={handleRegenerate}
          regenerating={regenerating}
          canRegenerate={Boolean(product)}
          onReset={handleReset}
        />
      </div>
    </div>
  );
}

export default function LandingPageEditorPage() {
  return (
    <Suspense fallback={<LandingPageEditorSkeleton />}>
      <LandingPageEditor />
    </Suspense>
  );
}
