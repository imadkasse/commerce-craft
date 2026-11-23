"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Search, Layout, Globe, FileText } from "lucide-react";
import {
  landingPagesService,
  type LandingPageListItem as LandingPage,
  type Product,
} from "@/services/landing-pages.service";
import {
  GenerateLandingPageDialog,
  LandingPagesPagination,
  LandingPagesTable,
  StatsCard,
} from "./landing-pages-parts";

function formatLandingPageDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function LandingPagesPage() {
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [marketingAnglesInput, setMarketingAnglesInput] = useState<string>("");
  const [generating, setGenerating] = useState(false);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [search]);

  const fetchLandingPages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await landingPagesService.list({
        page,
        limit,
        search: debouncedSearch,
      });
      setPages(data.landingPages);
      setTotal(data.total);
    } catch {
      toast.error("Failed to load landing pages");
    } finally {
      setLoading(false);
    }
  }, [page, limit, debouncedSearch]);

  useEffect(() => {
    fetchLandingPages();
  }, [fetchLandingPages]);

  const fetchProducts = useCallback(async () => {
    setSelectedProductId("");
    setMarketingAnglesInput("");
    setProductsLoading(true);
    try {
      const available = await landingPagesService.listAvailableProducts(pages);
      setProducts(available);
    } catch {
      toast.error("Failed to load products");
    } finally {
      setProductsLoading(false);
    }
  }, [pages]);

  const handleGenerate = async () => {
    if (!selectedProductId) return;
    setGenerating(true);
    const toastId = toast.loading("Generating landing page...");

    try {
      await landingPagesService.generate({
        productId: selectedProductId,
        marketingAngles: marketingAnglesInput,
      });
      toast.success("Landing page generated successfully!", { id: toastId });
      fetchLandingPages();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate landing page", {
        id: toastId,
      });
      return Promise.reject(err);
    } finally {
      setGenerating(false);
    }
  };

  const handlePublishToggle = async (lp: LandingPage) => {
    setPublishingId(lp.id);
    const newStatus = lp.status === "published" ? "draft" : "published";
    try {
      if (newStatus === "published") {
        await landingPagesService.publish(lp.id);
      } else {
        await landingPagesService.unpublish(lp.id);
      }
      setPages((prev) =>
        prev.map((p) => (p.id === lp.id ? { ...p, status: newStatus } : p))
      );
      toast.success(
        newStatus === "published"
          ? "Landing page published!"
          : "Landing page unpublished."
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setPublishingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await landingPagesService.remove(id);
      toast.success("Landing page deleted");
      fetchLandingPages();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const publishedCount = pages.filter((p) => p.status === "published").length;
  const draftCount = pages.filter((p) => p.status === "draft").length;

  const generateDialog = (variant: "default" | "empty") => (
    <GenerateLandingPageDialog
      variant={variant}
      onOpen={fetchProducts}
      products={products}
      productsLoading={productsLoading}
      selectedProductId={selectedProductId}
      marketingAnglesInput={marketingAnglesInput}
      generating={generating}
      onSelectProduct={setSelectedProductId}
      onMarketingAnglesChange={setMarketingAnglesInput}
      onGenerate={handleGenerate}
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-950">Landing Pages</h1>
          <p className="text-gray-500">
            AI-generated landing pages for your products
          </p>
        </div>
        {generateDialog("default")}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          icon={<Layout className="h-5 w-5" />}
          iconClassName="text-indigo-600"
          label="Total Pages"
          value={total}
        />
        <StatsCard
          icon={<Globe className="h-5 w-5" />}
          iconClassName="text-green-600"
          label="Published"
          value={publishedCount}
        />
        <StatsCard
          icon={<FileText className="h-5 w-5" />}
          iconClassName="text-gray-400"
          label="Drafts"
          value={draftCount}
        />
      </div>

      <div className="relative w-72">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search landing pages..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <LandingPagesTable
        pages={pages}
        loading={loading}
        debouncedSearch={debouncedSearch}
        deletingId={deletingId}
        publishingId={publishingId}
        onPublishToggle={handlePublishToggle}
        onDelete={handleDelete}
        formatDate={formatLandingPageDate}
        emptyStateAction={
          !debouncedSearch
            ? generateDialog("empty")
            : undefined
        }
      />

      <LandingPagesPagination
        page={page}
        totalPages={totalPages}
        total={total}
        onPrevious={() => setPage((p) => p - 1)}
        onNext={() => setPage((p) => p + 1)}
      />
    </div>
  );
}
