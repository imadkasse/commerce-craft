"use client";

import { useEffect, useState, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  storesService,
  getStoreErrorMessage,
  type Store,
  type StoreTheme,
} from "@/services/stores.service";
import {
  SettingsMessageBanner,
  StoreDomainCard,
  StoreProfileCard,
  StoresEmptyState,
  StoresLoadErrorState,
  StoresLoadingState,
  StoresSidebarCard,
  StoreThemeCard,
} from "./store-settings-parts";

export default function StoresSettingsPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [domain, setDomain] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [font, setFont] = useState<StoreTheme["font"]>("Inter");
  const [layout, setLayout] = useState<StoreTheme["layout"]>("grid");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const selectedStore = stores.find((s) => s.id === selectedId) ?? null;

  const loadStores = useCallback(async () => {
    try {
      const data = await storesService.list();
      setStores(data);
      setSelectedId((prev) => prev ?? data[0]?.id ?? null);
    } catch {
      setLoadError("Failed to load stores.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  // When the selected store changes, load its values into local state.
  useEffect(() => {
    if (!selectedStore) return;
    setName(selectedStore.name);
    setSlug(selectedStore.slug);
    setDescription(selectedStore.description ?? "");
    setLogoUrl(selectedStore.logoUrl ?? "");
    setDomain(selectedStore.domain ?? "");
    setPrimaryColor(selectedStore.theme?.primaryColor ?? "#6366f1");
    setFont(selectedStore.theme?.font ?? "Inter");
    setLayout(selectedStore.theme?.layout ?? "grid");
    setMessage(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const applyUpdated = useCallback((updated: Store) => {
    setStores((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }, []);

  const handleSaveProfile = async () => {
    if (!selectedStore) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await storesService.update(selectedStore.id, {
        name,
        slug,
        description,
        logoUrl,
      });
      applyUpdated(updated);
      setMessage({ type: "success", text: "Profile updated successfully." });
    } catch (e) {
      setMessage({ type: "error", text: getStoreErrorMessage(e, "Failed to update profile") });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTheme = async () => {
    if (!selectedStore) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await storesService.update(selectedStore.id, {
        theme: { primaryColor, font, layout },
      });
      applyUpdated(updated);
      setMessage({ type: "success", text: "Theme updated successfully." });
    } catch (e) {
      setMessage({ type: "error", text: getStoreErrorMessage(e, "Failed to update theme") });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDomain = async () => {
    if (!selectedStore) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await storesService.update(selectedStore.id, { domain });
      applyUpdated(updated);
      setMessage({ type: "success", text: "Domain updated successfully." });
    } catch (e) {
      setMessage({ type: "error", text: getStoreErrorMessage(e, "Failed to update domain") });
    } finally {
      setSaving(false);
    }
  };

  const retry = () => {
    setLoading(true);
    setLoadError(null);
    loadStores();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-950">Store Settings</h1>
        <p className="text-sm text-gray-500">
          Manage the profile, theme, and domain for every store in your workspace.
        </p>
      </div>

      {loading ? (
        <StoresLoadingState />
      ) : loadError ? (
        <StoresLoadErrorState message={loadError} onRetry={retry} />
      ) : stores.length === 0 ? (
        <StoresEmptyState />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[280px_1fr]">
          {/* Store list */}
          <StoresSidebarCard
            stores={stores}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          {/* Settings editor for the selected store */}
          <div className="min-w-0">
            {message && <SettingsMessageBanner message={message} />}

            {selectedStore && (
              <Tabs defaultValue="profile">
                <TabsList>
                  <TabsTrigger value="profile">Profile</TabsTrigger>
                  <TabsTrigger value="theme">Theme</TabsTrigger>
                  <TabsTrigger value="domain">Domain</TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                  <StoreProfileCard
                    name={name}
                    slug={slug}
                    description={description}
                    logoUrl={logoUrl}
                    saving={saving}
                    onNameChange={setName}
                    onSlugChange={setSlug}
                    onDescriptionChange={setDescription}
                    onLogoUrlChange={setLogoUrl}
                    onSave={handleSaveProfile}
                  />
                </TabsContent>

                <TabsContent value="theme">
                  <StoreThemeCard
                    primaryColor={primaryColor}
                    font={font}
                    layout={layout}
                    saving={saving}
                    onPrimaryColorChange={setPrimaryColor}
                    onFontChange={setFont}
                    onLayoutChange={setLayout}
                    onSave={handleSaveTheme}
                  />
                </TabsContent>

                <TabsContent value="domain">
                  <StoreDomainCard
                    domain={domain}
                    slug={slug}
                    saving={saving}
                    onDomainChange={setDomain}
                    onSave={handleSaveDomain}
                  />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
