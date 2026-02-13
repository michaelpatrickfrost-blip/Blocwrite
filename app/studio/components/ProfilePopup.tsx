"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getProfileAiOff,
  getProfileLanguage,
  PROFILE_LANGUAGE_OPTIONS,
  setProfileAiOff,
  setProfileLanguage,
  type ProfileLanguageCode,
} from "@/lib/profile-store";
import type { Novel } from "../studio-store";

type ModelOption = {
  id: string;
  name: string;
  contextLength: number | null;
};

type AssistantProviderId = "openrouter" | "infermatic" | "lmstudio";

const ASSISTANT_PROVIDER_OPTIONS: Array<{
  id: AssistantProviderId;
  label: string;
  requiresKey: boolean;
  defaultBaseUrl: string;
  defaultModel: string;
}> = [
  {
    id: "openrouter",
    label: "OpenRouter",
    requiresKey: true,
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openai/gpt-4o-mini",
  },
  {
    id: "infermatic",
    label: "Infermatic",
    requiresKey: true,
    defaultBaseUrl: "https://api.totalgpt.ai/v1",
    defaultModel: "Mixtral-8x7B-Instruct-v0.1",
  },
  {
    id: "lmstudio",
    label: "LM Studio",
    requiresKey: false,
    defaultBaseUrl: "http://127.0.0.1:1234/v1",
    defaultModel: "local-model",
  },
];

function getStoredProvider(): AssistantProviderId {
  if (typeof window === "undefined") return "openrouter";
  const stored = window.localStorage.getItem("pilotwriter.assistant.provider");
  if (stored && ASSISTANT_PROVIDER_OPTIONS.some((p) => p.id === stored)) {
    return stored as AssistantProviderId;
  }
  return "openrouter";
}

function readStoredProviderField(provider: AssistantProviderId, field: "key" | "model" | "baseUrl") {
  if (typeof window === "undefined") return "";
  const modern = window.localStorage.getItem(`pilotwriter.assistant.${provider}.${field}`) ?? "";
  if (modern) return modern;
  if (provider === "openrouter") {
    if (field === "key") return window.localStorage.getItem("pilotwriter.openrouter.key") ?? "";
    if (field === "model") return window.localStorage.getItem("pilotwriter.openrouter.model") ?? "";
  }
  return "";
}

function normalizeClientApiKey(raw: string) {
  const trimmed = raw.trim().replace(/^["']|["']$/g, "");
  return trimmed.replace(/^Bearer\s+/i, "").trim();
}

type ProfilePopupProps = {
  open: boolean;
  onClose: () => void;
  /** When provided, shows Context Budget and syncs grammar locale */
  novel?: Novel | null;
  onGrammarLocaleChange?: (code: ProfileLanguageCode) => void;
  onUpdateStoryBible?: (patch: { aiContext?: { maxContextTokens?: number } }) => void;
  /** Called when provider, key, model, or baseUrl change so the parent can sync state */
  onProviderSettingsChange?: (settings: {
    provider: AssistantProviderId;
    key: string;
    model: string;
    baseUrl: string;
  }) => void;
  /** Called when AI toggle changes */
  onAiToggle?: (off: boolean) => void;
  /** Called when user clicks Sign out */
  onLogout?: () => void;
};

export function ProfilePopup({
  open,
  onClose,
  novel,
  onGrammarLocaleChange,
  onUpdateStoryBible,
  onProviderSettingsChange,
  onAiToggle,
  onLogout,
}: ProfilePopupProps) {
  const [appLanguage, setAppLanguage] = useState<ProfileLanguageCode>(() => getProfileLanguage());
  const [aiOff, setAiOff] = useState(() => getProfileAiOff());
  const [assistantProvider, setAssistantProvider] = useState<AssistantProviderId>(() => getStoredProvider());
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [assistantBaseUrl, setAssistantBaseUrl] = useState("");
  const [openRouterModel, setOpenRouterModel] = useState("");
  const [openRouterStatus, setOpenRouterStatus] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const [openRouterError, setOpenRouterError] = useState<string | null>(null);
  const [showAiSection, setShowAiSection] = useState(false);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setAppLanguage(getProfileLanguage());
    setAiOff(getProfileAiOff());
    setAssistantProvider(getStoredProvider());
    setOpenRouterKey(readStoredProviderField(getStoredProvider(), "key"));
    setAssistantBaseUrl(readStoredProviderField(getStoredProvider(), "baseUrl") || ASSISTANT_PROVIDER_OPTIONS.find((p) => p.id === getStoredProvider())?.defaultBaseUrl || "");
    setOpenRouterModel(readStoredProviderField(getStoredProvider(), "model") || ASSISTANT_PROVIDER_OPTIONS.find((p) => p.id === getStoredProvider())?.defaultModel || "");
  }, [open]);

  const selectedProvider = ASSISTANT_PROVIDER_OPTIONS.find((p) => p.id === assistantProvider) ?? ASSISTANT_PROVIDER_OPTIONS[0];

  const handleLanguageChange = useCallback(
    (code: ProfileLanguageCode) => {
      setProfileLanguage(code);
      setAppLanguage(code);
      onGrammarLocaleChange?.(code);
    },
    [onGrammarLocaleChange],
  );

  const handleProviderChange = useCallback((id: AssistantProviderId) => {
    setAssistantProvider(id);
    window.localStorage.setItem("pilotwriter.assistant.provider", id);
    const opt = ASSISTANT_PROVIDER_OPTIONS.find((p) => p.id === id);
    const newKey = readStoredProviderField(id, "key");
    const newBaseUrl = readStoredProviderField(id, "baseUrl") || opt?.defaultBaseUrl || "";
    const newModel = readStoredProviderField(id, "model") || opt?.defaultModel || "";
    setOpenRouterKey(newKey);
    setAssistantBaseUrl(newBaseUrl);
    setOpenRouterModel(newModel);
    onProviderSettingsChange?.({ provider: id, key: newKey, model: newModel, baseUrl: newBaseUrl });
  }, [onProviderSettingsChange]);

  const persistKey = useCallback((key: string) => {
    const normalized = normalizeClientApiKey(key);
    setOpenRouterKey(normalized);
    window.localStorage.setItem(`pilotwriter.assistant.${assistantProvider}.key`, normalized);
    onProviderSettingsChange?.({ provider: assistantProvider, key: normalized, model: openRouterModel, baseUrl: assistantBaseUrl });
  }, [assistantProvider, openRouterModel, assistantBaseUrl, onProviderSettingsChange]);

  const persistBaseUrl = useCallback((url: string) => {
    setAssistantBaseUrl(url);
    window.localStorage.setItem(`pilotwriter.assistant.${assistantProvider}.baseUrl`, url);
    onProviderSettingsChange?.({ provider: assistantProvider, key: openRouterKey, model: openRouterModel, baseUrl: url });
  }, [assistantProvider, openRouterKey, openRouterModel, onProviderSettingsChange]);

  const persistModel = useCallback((model: string) => {
    setOpenRouterModel(model);
    window.localStorage.setItem(`pilotwriter.assistant.${assistantProvider}.model`, model);
    onProviderSettingsChange?.({ provider: assistantProvider, key: openRouterKey, model, baseUrl: assistantBaseUrl });
  }, [assistantProvider, openRouterKey, assistantBaseUrl, onProviderSettingsChange]);

  const checkConnection = useCallback(async () => {
    setOpenRouterStatus("checking");
    setOpenRouterError(null);
    try {
      const res = await fetch("/api/openrouter/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: assistantProvider,
          apiKey: normalizeClientApiKey(openRouterKey),
          baseUrl: assistantBaseUrl.trim(),
          model: openRouterModel || selectedProvider.defaultModel,
          prompt: "hi",
          maxTokens: 2,
        }),
      });
      if (res.ok) {
        setOpenRouterStatus("ok");
      } else {
        const data = await res.json().catch(() => ({}));
        setOpenRouterError((data as { error?: string }).error || "Connection failed");
        setOpenRouterStatus("error");
      }
    } catch (e) {
      setOpenRouterError(e instanceof Error ? e.message : "Connection failed");
      setOpenRouterStatus("error");
    }
  }, [assistantProvider, openRouterKey, assistantBaseUrl, openRouterModel, selectedProvider.defaultModel]);

  const fetchModels = useCallback(async () => {
    setModelsLoading(true);
    setModelsError(null);
    try {
      const res = await fetch("/api/openrouter/models", {
        method: "GET",
        headers: {
          "x-provider": assistantProvider,
          "x-provider-key": normalizeClientApiKey(openRouterKey),
          "x-provider-base-url": assistantBaseUrl.trim(),
        },
      });
      const payload = (await res.json().catch(() => ({}))) as {
        models?: ModelOption[];
        error?: string;
      };
      if (!res.ok) {
        setModelsError(payload.error || "Unable to load models.");
        return;
      }
      const list = Array.isArray(payload.models) ? payload.models : [];
      setModels(list);
      if (list.length > 0) setShowModelDropdown(true);
    } catch (e) {
      setModelsError(e instanceof Error ? e.message : "Unable to load models.");
    } finally {
      setModelsLoading(false);
    }
  }, [assistantProvider, openRouterKey, assistantBaseUrl]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showModelDropdown) return;
    function handleClick(e: MouseEvent) {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showModelDropdown]);

  // Auto-fetch models when AI section is expanded
  useEffect(() => {
    if (showAiSection && models.length === 0 && !modelsLoading && !modelsError) {
      void fetchModels();
    }
  }, [showAiSection, models.length, modelsLoading, modelsError, fetchModels]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const contextTokens = novel?.storyBible?.aiContext?.maxContextTokens;
  const contextValue = typeof contextTokens === "number" ? String(contextTokens) : "auto";

  return (
    <div className="pw-modal-overlay" onClick={onClose}>
      <div className="pw-profile-popup" onClick={(e) => e.stopPropagation()}>
        <div className="pw-profile-popup-head">
          <h3>Profile</h3>
          <button type="button" className="pw-profile-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="pw-profile-popup-body">
          <div className="pw-profile-row">
            <label>Language</label>
            <select
              className="pw-profile-input"
              value={appLanguage}
              onChange={(e) => handleLanguageChange(e.target.value as ProfileLanguageCode)}
            >
              {PROFILE_LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="pw-profile-row pw-profile-row-inline">
            <label>AI</label>
            <label className="pw-profile-toggle">
              <input
                type="checkbox"
                checked={!aiOff}
                onChange={(e) => {
                  const on = e.target.checked;
                  setProfileAiOff(!on);
                  setAiOff(!on);
                  onAiToggle?.(!on);
                }}
              />
              <span className="pw-profile-toggle-slider" />
              <span className="pw-profile-toggle-label">{aiOff ? "Off" : "On"}</span>
            </label>
          </div>

          <div className="pw-profile-divider" />

          <button
            type="button"
            className="pw-profile-expand"
            onClick={() => setShowAiSection((s) => !s)}
            aria-expanded={showAiSection}
          >
            <span>AI Provider</span>
            <span style={{ opacity: 0.6, fontSize: 12 }}>{showAiSection ? "▲" : "▼"}</span>
          </button>

          {showAiSection && (
            <>
              <div className="pw-profile-row">
                <label>Provider</label>
                <select
                  className="pw-profile-input"
                  value={assistantProvider}
                  onChange={(e) => handleProviderChange(e.target.value as AssistantProviderId)}
                >
                  {ASSISTANT_PROVIDER_OPTIONS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pw-profile-row">
                <label>API Key</label>
                <div className="pw-profile-input-group">
                  <input
                    className="pw-profile-input"
                    type="password"
                    placeholder={selectedProvider.requiresKey ? "Required" : "Optional"}
                    value={openRouterKey}
                    onChange={(e) => persistKey(e.target.value)}
                    disabled={!selectedProvider.requiresKey}
                  />
                  <button
                    type="button"
                    className="pw-profile-btn-sm"
                    onClick={() => void checkConnection()}
                    disabled={openRouterStatus === "checking"}
                  >
                    {openRouterStatus === "checking" ? "…" : "Test"}
                  </button>
                </div>
              </div>

              <div className="pw-profile-row">
                <label>Base URL</label>
                <input
                  className="pw-profile-input"
                  type="text"
                  placeholder={selectedProvider.defaultBaseUrl}
                  value={assistantBaseUrl}
                  onChange={(e) => persistBaseUrl(e.target.value)}
                />
              </div>

              <div className="pw-profile-row" ref={modelDropdownRef}>
                <label>Model {modelsLoading && <span style={{ fontWeight: 400, opacity: 0.6 }}> — loading models…</span>}</label>
                <div className="pw-profile-input-group">
                  <input
                    className="pw-profile-input"
                    type="text"
                    placeholder={selectedProvider.defaultModel}
                    value={openRouterModel}
                    onChange={(e) => persistModel(e.target.value)}
                    onFocus={() => {
                      if (models.length > 0 && !showModelDropdown) setShowModelDropdown(true);
                    }}
                  />
                  <button
                    type="button"
                    className="pw-profile-btn-sm"
                    onClick={() => {
                      if (showModelDropdown) {
                        setShowModelDropdown(false);
                      } else if (models.length > 0) {
                        setShowModelDropdown(true);
                      } else {
                        void fetchModels();
                      }
                    }}
                    disabled={modelsLoading}
                    title="Fetch available models"
                  >
                    {modelsLoading ? "…" : showModelDropdown ? "▲" : "▼"}
                  </button>
                </div>
                {modelsError && (
                  <p className="pw-profile-status pw-profile-status-error" style={{ marginTop: 4 }}>
                    {modelsError}{" "}
                    <button type="button" style={{ color: "var(--pw-accent)", background: "none", border: "none", cursor: "pointer", fontSize: "inherit", textDecoration: "underline" }} onClick={() => void fetchModels()}>Retry</button>
                  </p>
                )}
                {!modelsLoading && !modelsError && models.length > 0 && !showModelDropdown && (
                  <p style={{ fontSize: 12, color: "var(--pw-text-dim)", margin: "4px 0 0" }}>
                    {models.length} models available — click ▼ or focus the input to browse
                  </p>
                )}
                {showModelDropdown && models.length > 0 && (
                  <div className="pw-model-dropdown" style={{ marginTop: 6 }}>
                    <input
                      className="pw-model-dropdown-search"
                      type="text"
                      placeholder="Search models…"
                      value={modelSearch}
                      onChange={(e) => setModelSearch(e.target.value)}
                      autoFocus
                    />
                    <div className="pw-model-list">
                      {(() => {
                        const q = modelSearch.toLowerCase().trim();
                        const filtered = q
                          ? models.filter(
                              (m) =>
                                m.id.toLowerCase().includes(q) ||
                                m.name.toLowerCase().includes(q),
                            )
                          : models;
                        if (filtered.length === 0) {
                          return <div className="pw-model-empty">No models match &ldquo;{modelSearch}&rdquo;</div>;
                        }
                        return filtered.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            className={`pw-model-row${m.id === openRouterModel ? " active" : ""}`}
                            onClick={() => {
                              persistModel(m.id);
                              setShowModelDropdown(false);
                              setModelSearch("");
                            }}
                          >
                            <div className="pw-model-name">{m.name}</div>
                            <div className="pw-model-meta">
                              <code>{m.id}</code>
                              {m.contextLength ? ` · ${Math.round(m.contextLength / 1024)}K ctx` : ""}
                            </div>
                          </button>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {openRouterStatus === "ok" && (
                <p className="pw-profile-status pw-profile-status-ok">Connected</p>
              )}
              {openRouterStatus === "error" && openRouterError && (
                <p className="pw-profile-status pw-profile-status-error">{openRouterError}</p>
              )}
            </>
          )}

          {novel && onUpdateStoryBible && (
            <>
              <div className="pw-profile-divider" />
              <div className="pw-profile-row">
                <label>Context</label>
                <select
                  className="pw-profile-input"
                  value={contextValue}
                  onChange={(e) => {
                    const raw = e.target.value;
                    const val = raw === "auto" ? undefined : parseInt(raw, 10);
                    onUpdateStoryBible({
                      aiContext: {
                        ...novel.storyBible.aiContext,
                        maxContextTokens: Number.isFinite(val) ? val : undefined,
                      },
                    });
                  }}
                >
                  <option value="auto">Auto</option>
                  <option value="4096">4K</option>
                  <option value="8192">8K</option>
                  <option value="16384">16K</option>
                  <option value="32768">32K</option>
                  <option value="65536">64K</option>
                  <option value="131072">128K</option>
                </select>
              </div>
            </>
          )}

          {onLogout && (
            <>
              <div className="pw-profile-divider" />
              <button
                type="button"
                onClick={onLogout}
                style={{
                  width: "100%",
                  padding: "8px 0",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--pw-text-muted, #888)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  borderRadius: "var(--pw-radius-sm, 8px)",
                  transition: "color 0.15s, background 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--pw-coral, #ff6b6b)";
                  e.currentTarget.style.background = "var(--pw-coral-light, rgba(255,107,107,0.08))";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--pw-text-muted, #888)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
