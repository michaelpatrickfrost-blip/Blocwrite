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

type AssistantProviderId = "openrouter" | "infermatic" | "lmstudio" | "huggingface" | "ollama";

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
  {
    id: "huggingface",
    label: "Hugging Face",
    requiresKey: true,
    defaultBaseUrl: "https://router.huggingface.co/v1",
    defaultModel: "deepseek-ai/DeepSeek-R1",
  },
  {
    id: "ollama",
    label: "Ollama",
    requiresKey: false,
    defaultBaseUrl: "http://127.0.0.1:11434",
    defaultModel: "",
  },
];

type SettingsTab = "general" | "ai" | "account";

function getStoredProvider(): AssistantProviderId {
  if (typeof window === "undefined") return "openrouter";
  try {
    const stored = window.localStorage.getItem("pilotwriter.assistant.provider");
    if (stored && ASSISTANT_PROVIDER_OPTIONS.some((p) => p.id === stored)) {
      return stored as AssistantProviderId;
    }
  } catch { /* ignore */ }
  return "openrouter";
}

function readStoredProviderField(provider: AssistantProviderId, field: "key" | "model" | "baseUrl") {
  if (typeof window === "undefined") return "";
  try {
    const modern = window.localStorage.getItem(`pilotwriter.assistant.${provider}.${field}`) ?? "";
    if (modern) return modern;
    if (provider === "openrouter") {
      if (field === "key") return window.localStorage.getItem("pilotwriter.openrouter.key") ?? "";
      if (field === "model") return window.localStorage.getItem("pilotwriter.openrouter.model") ?? "";
    }
  } catch { /* ignore */ }
  return "";
}

function normalizeClientApiKey(raw: string) {
  const trimmed = raw.trim().replace(/^["']|["']$/g, "");
  return trimmed.replace(/^Bearer\s+/i, "").trim();
}

type ProfilePopupProps = {
  open: boolean;
  onClose: () => void;
  novel?: Novel | null;
  onGrammarLocaleChange?: (code: ProfileLanguageCode) => void;
  onUpdateStoryBible?: (patch: { aiContext?: { maxContextTokens?: number } }) => void;
  onProviderSettingsChange?: (settings: {
    provider: AssistantProviderId;
    key: string;
    model: string;
    baseUrl: string;
  }) => void;
  onAiToggle?: (off: boolean) => void;
  onLogout?: () => void;
  onSettingsChange?: () => void;
  onStartTutorial?: () => void;
  initialTab?: SettingsTab;
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
  onSettingsChange,
  onStartTutorial,
  initialTab,
}: ProfilePopupProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  // Allow parent to control which tab opens
  useEffect(() => {
    if (open && initialTab) setActiveTab(initialTab);
  }, [open, initialTab]);
  const [appLanguage, setAppLanguage] = useState<ProfileLanguageCode>(() => getProfileLanguage());
  const [aiOff, setAiOff] = useState(() => getProfileAiOff());
  const [assistantProvider, setAssistantProvider] = useState<AssistantProviderId>(() => getStoredProvider());
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [assistantBaseUrl, setAssistantBaseUrl] = useState("");
  const [openRouterModel, setOpenRouterModel] = useState("");
  const [openRouterStatus, setOpenRouterStatus] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const [openRouterError, setOpenRouterError] = useState<string | null>(null);
  const [models, setModels] = useState<ModelOption[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Subscription state
  type SubInfo = {
    plan: string | null;
    status: string | null;
    isAdmin: boolean;
    email?: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    trialEnd: string | null;
    daysRemaining: number | null;
  };
  const [subInfo, setSubInfo] = useState<SubInfo | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  // Password change state
  const [pwExpanded, setPwExpanded] = useState(false);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

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
      onSettingsChange?.();
    },
    [onGrammarLocaleChange, onSettingsChange],
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
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 10000);

      if (assistantProvider === "lmstudio" || assistantProvider === "ollama") {
        const isOllama = assistantProvider === "ollama";
        const providerLabel = isOllama ? "Ollama" : "LM Studio";
        const defaultUrl = isOllama ? "http://127.0.0.1:11434" : "http://127.0.0.1:1234/v1";
        const rawBase = (assistantBaseUrl.trim() || defaultUrl).replace(/\/+$/, "");
        const localBaseUrl = isOllama
          ? (rawBase.endsWith("/v1") ? rawBase : `${rawBase}/v1`)
          : rawBase;
        try {
          const localHeaders: Record<string, string> = { "Content-Type": "application/json" };
          const localKey = normalizeClientApiKey(openRouterKey);
          if (localKey) localHeaders["Authorization"] = `Bearer ${localKey}`;
          const res = await fetch(`${localBaseUrl}/chat/completions`, {
            method: "POST",
            headers: localHeaders,
            body: JSON.stringify({
              model: openRouterModel || (isOllama ? "" : "local-model"),
              max_tokens: 2,
              messages: [{ role: "user", content: "hi" }],
              stream: false,
            }),
            signal: controller.signal,
          });
          window.clearTimeout(timeoutId);
          if (res.ok) {
            setOpenRouterStatus("ok");
          } else {
            setOpenRouterError(`${providerLabel} returned status ${res.status}. Make sure a model is ${isOllama ? "pulled and available" : "loaded"}.`);
            setOpenRouterStatus("error");
          }
        } catch (e) {
          window.clearTimeout(timeoutId);
          if (e instanceof DOMException && e.name === "AbortError") {
            setOpenRouterError(`Connection timed out. Make sure ${providerLabel} is running.`);
          } else {
            setOpenRouterError(isOllama
              ? "Could not reach Ollama. Make sure it is running on your computer (run 'ollama serve' in your terminal)."
              : "Could not reach LM Studio. Make sure it is running on your computer with the local server enabled (Developer > Start Server).");
          }
          setOpenRouterStatus("error");
        }
        return;
      }

      // Standard path: test via server proxy for cloud providers
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
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);
      if (res.ok) {
        setOpenRouterStatus("ok");
      } else {
        const data = await res.json().catch(() => ({}));
        setOpenRouterError((data as { error?: string }).error || "Connection failed");
        setOpenRouterStatus("error");
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setOpenRouterError("Connection check timed out. Try again.");
      } else {
        setOpenRouterError(e instanceof Error ? e.message : "Connection failed");
      }
      setOpenRouterStatus("error");
    }
  }, [assistantProvider, openRouterKey, assistantBaseUrl, openRouterModel, selectedProvider.defaultModel]);

  const fetchModels = useCallback(async () => {
    setModelsLoading(true);
    setModelsError(null);
    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 15000);

      // Ollama runs locally — fetch models directly from the browser
      if (assistantProvider === "ollama") {
        const rawBase = (assistantBaseUrl.trim() || "http://127.0.0.1:11434").replace(/\/+$/, "");
        try {
          const ollamaHeaders: Record<string, string> = {};
          const ollamaKey = normalizeClientApiKey(openRouterKey);
          if (ollamaKey) ollamaHeaders["Authorization"] = `Bearer ${ollamaKey}`;
          const res = await fetch(`${rawBase}/api/tags`, {
            method: "GET",
            headers: ollamaHeaders,
            signal: controller.signal,
          });
          window.clearTimeout(timeoutId);
          if (!res.ok) {
            setModelsError(`Ollama returned status ${res.status}. Make sure it is running.`);
            return;
          }
          const payload = (await res.json().catch(() => ({}))) as {
            models?: Array<{ name?: string; model?: string; size?: number; details?: { parameter_size?: string } }>;
          };
          const pulledModels = (payload.models ?? [])
            .filter((m): m is { name: string } => typeof m.name === "string" && m.name.length > 0)
            .map((m) => ({
              id: m.name,
              name: m.name,
              contextLength: null as number | null,
            }));
          const pulledIds = new Set(pulledModels.map((m) => m.id));

          // Verified Ollama cloud models — append any not already pulled
          const OLLAMA_CLOUD_MODELS = [
            "deepseek-v3.1:671b-cloud", "deepseek-v3.2:cloud",
            "gpt-oss:20b-cloud", "gpt-oss:120b-cloud",
            "qwen3-coder:480b-cloud", "qwen3-coder-next:cloud",
            "qwen3.5:cloud", "qwen3-vl:235b-cloud",
            "minimax-m2:cloud", "minimax-m2.1:cloud", "minimax-m2.5:cloud",
            "glm-4.6:cloud", "glm-4.7:cloud", "glm-5:cloud",
            "gemini-3-flash-preview:cloud",
            "kimi-k2.5:cloud", "kimi-k2-thinking:cloud",
          ];
          const cloudExtras = OLLAMA_CLOUD_MODELS
            .filter((id) => !pulledIds.has(id))
            .map((id) => ({ id, name: `${id}`, contextLength: null as number | null }));

          const allModels = [
            ...pulledModels.sort((a, b) => a.name.localeCompare(b.name)),
            ...cloudExtras,
          ];
          setModels(allModels);
          if (allModels.length > 0) setShowModelDropdown(true);
        } catch (e) {
          window.clearTimeout(timeoutId);
          if (e instanceof DOMException && e.name === "AbortError") {
            setModelsError("Model list request timed out. Make sure Ollama is running.");
          } else {
            setModelsError("Could not reach Ollama. Make sure it is running on your computer (run 'ollama serve' in your terminal).");
          }
        }
        return;
      }

      const res = await fetch("/api/openrouter/models", {
        method: "GET",
        headers: {
          "x-provider": assistantProvider,
          "x-provider-key": normalizeClientApiKey(openRouterKey),
          "x-provider-base-url": assistantBaseUrl.trim(),
        },
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);
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
      if (e instanceof DOMException && e.name === "AbortError") {
        setModelsError("Model list request timed out. Try again.");
      } else {
        setModelsError(e instanceof Error ? e.message : "Unable to load models.");
      }
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

  // Auto-fetch models when AI tab is active
  useEffect(() => {
    if (activeTab === "ai" && models.length === 0 && !modelsLoading && !modelsError) {
      void fetchModels();
    }
  }, [activeTab, models.length, modelsLoading, modelsError, fetchModels]);

  // Fetch subscription info when account tab is opened
  useEffect(() => {
    if (activeTab !== "account" || !open) return;
    setSubLoading(true);
    setCancelConfirm(false);
    setCancelError(null);
    setCancelSuccess(false);
    fetch("/api/billing/subscription")
      .then((r) => r.json())
      .then((data: SubInfo) => setSubInfo(data))
      .catch(() => setSubInfo(null))
      .finally(() => setSubLoading(false));
  }, [activeTab, open]);

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

  const TABS: Array<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
    {
      id: "general",
      label: "General",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        </svg>
      ),
    },
    {
      id: "ai",
      label: "AI Provider",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a4 4 0 0 1 4 4v1h1a3 3 0 0 1 3 3v1a3 3 0 0 1-3 3h-1v4a4 4 0 0 1-8 0v-4H7a3 3 0 0 1-3-3v-1a3 3 0 0 1 3-3h1V6a4 4 0 0 1 4-4z" />
          <circle cx="9" cy="13" r="1" />
          <circle cx="15" cy="13" r="1" />
        </svg>
      ),
    },
    {
      id: "account",
      label: "Account",
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
        </svg>
      ),
    },
  ];

  return (
    <div className="pw-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pw-settings-panel" onMouseDown={(e) => e.stopPropagation()}>
        {/* ── Header ── */}
        <div className="pw-settings-head">
          <h3>Settings</h3>
          <button type="button" className="pw-profile-close" onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* ── Tab bar ── */}
        <div className="pw-settings-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`pw-settings-tab${activeTab === tab.id ? " active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="pw-settings-body">

          {/* ─── General tab ─── */}
          {activeTab === "general" && (
            <div className="pw-settings-section">
              <div className="pw-settings-group">
                <div className="pw-settings-group-title">Language</div>
                <p className="pw-settings-hint">Sets the grammar checker and UI language.</p>
                <select
                  className="pw-settings-select"
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

              <div className="pw-settings-group">
                <div className="pw-settings-group-title">AI Assistant</div>
                <p className="pw-settings-hint">Toggle the AI features on or off globally.</p>
                <div className="pw-settings-toggle-row">
                  <label className="pw-settings-toggle">
                    <input
                      type="checkbox"
                      checked={!aiOff}
                      onChange={(e) => {
                        const on = e.target.checked;
                        setProfileAiOff(!on);
                        setAiOff(!on);
                        onSettingsChange?.();
                        onAiToggle?.(!on);
                      }}
                    />
                    <span className="pw-settings-toggle-track" />
                  </label>
                  <span className={`pw-settings-toggle-label ${aiOff ? "off" : "on"}`}>
                    {aiOff ? "Off" : "On"}
                  </span>
                </div>
              </div>

              {novel && onUpdateStoryBible && (
                <div className="pw-settings-group">
                  <div className="pw-settings-group-title">Context Budget</div>
                  <p className="pw-settings-hint">
                    How much Canon context to send with each AI request. Auto works for most models.
                  </p>
                  <select
                    className="pw-settings-select"
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
                    <option value="auto">Auto (recommended)</option>
                    <option value="4096">4K tokens</option>
                    <option value="8192">8K tokens</option>
                    <option value="16384">16K tokens</option>
                    <option value="32768">32K tokens</option>
                    <option value="65536">64K tokens</option>
                    <option value="131072">128K tokens</option>
                  </select>
                </div>
              )}

              {onStartTutorial && (
                <div className="pw-settings-group">
                  <div className="pw-settings-group-title">Tutorial</div>
                  <p className="pw-settings-hint">Walk through every feature step by step.</p>
                  <button
                    type="button"
                    className="pw-tutorial-restart-btn"
                    onClick={() => {
                      try { window.localStorage.removeItem("pilotwriter.tutorial.complete"); } catch { /* ignore */ }
                      onStartTutorial();
                      onClose();
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                    Restart Tutorial
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ─── AI Provider tab ─── */}
          {activeTab === "ai" && (
            <div className="pw-settings-section" data-tutorial="settings-ai">
              <div className="pw-settings-group">
                <div className="pw-settings-group-title">Provider</div>
                <div className="pw-settings-provider-cards">
                  {ASSISTANT_PROVIDER_OPTIONS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`pw-settings-provider-card${assistantProvider === p.id ? " active" : ""}`}
                      onClick={() => handleProviderChange(p.id)}
                    >
                      <span className="pw-settings-provider-name">{p.label}</span>
                      {p.id === "openrouter" && <span className="pw-settings-provider-badge">Popular</span>}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pw-settings-group">
                <div className="pw-settings-group-title">API Key</div>
                <div className="pw-settings-input-row">
                  <input
                    className="pw-settings-input"
                    type="password"
                    placeholder={selectedProvider.requiresKey ? "Enter your API key" : "Optional — needed for cloud models"}
                    value={openRouterKey}
                    onChange={(e) => persistKey(e.target.value)}
                  />
                  <button
                    type="button"
                    className="pw-settings-btn"
                    onClick={() => void checkConnection()}
                    disabled={openRouterStatus === "checking"}
                  >
                    {openRouterStatus === "checking" ? "Testing..." : openRouterStatus === "ok" ? "Connected" : "Test"}
                  </button>
                </div>
                {openRouterStatus === "ok" && (
                  <p className="pw-settings-status ok">Connection successful</p>
                )}
                {openRouterStatus === "error" && openRouterError && (
                  <p className="pw-settings-status error">{openRouterError}</p>
                )}
              </div>

              <div className="pw-settings-group">
                <div className="pw-settings-group-title">Base URL</div>
                <input
                  className="pw-settings-input"
                  type="text"
                  placeholder={selectedProvider.defaultBaseUrl}
                  value={assistantBaseUrl}
                  onChange={(e) => persistBaseUrl(e.target.value)}
                />
              </div>

              <div className="pw-settings-group" ref={modelDropdownRef}>
                <div className="pw-settings-group-title">
                  Model
                  {modelsLoading && <span className="pw-settings-loading"> loading...</span>}
                </div>
                <div className="pw-settings-input-row">
                  <input
                    className="pw-settings-input"
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
                    className="pw-settings-btn"
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
                    title="Browse available models"
                  >
                    {modelsLoading ? "..." : "Browse"}
                  </button>
                </div>
                {modelsError && (
                  <p className="pw-settings-status error">
                    {modelsError}{" "}
                    <button type="button" className="pw-settings-link" onClick={() => void fetchModels()}>Retry</button>
                  </p>
                )}
                {showModelDropdown && models.length > 0 && (
                  <div className="pw-settings-model-dropdown">
                    <input
                      className="pw-settings-model-search"
                      type="text"
                      placeholder="Search models..."
                      value={modelSearch}
                      onChange={(e) => setModelSearch(e.target.value)}
                      autoFocus
                    />
                    <div className="pw-settings-model-list">
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
                          return <div className="pw-settings-model-empty">No models match &ldquo;{modelSearch}&rdquo;</div>;
                        }
                        return filtered.map((m) => {
                          const isCloud = m.id.endsWith("-cloud") || m.id.includes(":cloud");
                          return (
                          <button
                            key={m.id}
                            type="button"
                            className={`pw-settings-model-row${m.id === openRouterModel ? " active" : ""}`}
                            onClick={() => {
                              persistModel(m.id);
                              setShowModelDropdown(false);
                              setModelSearch("");
                            }}
                          >
                            <div className="pw-settings-model-name">
                              {m.name}
                              {isCloud && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 4, background: "rgba(56,189,248,0.15)", color: "#38bdf8" }}>CLOUD</span>}
                            </div>
                            <div className="pw-settings-model-meta">
                              <code>{m.id}</code>
                              {m.contextLength ? ` · ${Math.round(m.contextLength / 1024)}K ctx` : ""}
                            </div>
                          </button>);
                        });
                      })()}
                    </div>
                  </div>
                )}
                <p className="pw-settings-hint" style={{ marginTop: 6 }}>
                  Slower models are given extra time. Free models work but may be less reliable.
                </p>
              </div>
            </div>
          )}

          {/* ─── Account tab ─── */}
          {activeTab === "account" && (
            <div className="pw-settings-section">
              {/* Subscription details */}
              <div className="pw-settings-group">
                <div className="pw-settings-group-title">Subscription</div>

                {subLoading ? (
                  <p className="pw-settings-hint" style={{ padding: "12px 0" }}>Loading subscription details...</p>
                ) : subInfo?.status || subInfo?.isAdmin ? (
                  <div style={{ marginTop: 8 }}>
                    {/* Status card */}
                    <div style={{
                      padding: "16px",
                      borderRadius: 12,
                      background: "var(--pw-bg-hover, rgba(255,255,255,0.04))",
                      border: "1px solid var(--pw-border, rgba(255,255,255,0.08))",
                    }}>
                      {/* Status row */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{
                            display: "inline-block",
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: subInfo.cancelAtPeriodEnd
                              ? "#f59e0b"
                              : subInfo.status === "trialing"
                                ? "#8b5cf6"
                                : "#10b981",
                          }} />
                          <span style={{ fontSize: 14, fontWeight: 700 }}>
                            {subInfo.status === "trialing"
                              ? "Free Trial"
                              : subInfo.cancelAtPeriodEnd
                                ? "Cancelling"
                                : "Active"}
                          </span>
                        </div>
                        {subInfo.plan && (
                          <span style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: 8,
                            background: "var(--pw-bg-card, rgba(255,255,255,0.06))",
                            border: "1px solid var(--pw-border, rgba(255,255,255,0.08))",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}>
                            {subInfo.plan}
                          </span>
                        )}
                      </div>

                      {/* Details */}
                      <div style={{ display: "grid", gap: 8 }}>
                        {subInfo.status === "trialing" && subInfo.trialEnd && (
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                            <span style={{ color: "var(--pw-text-dim)" }}>Trial ends</span>
                            <span style={{ fontWeight: 600 }}>
                              {new Date(subInfo.trialEnd).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          </div>
                        )}

                        {subInfo.currentPeriodEnd && (
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                            <span style={{ color: "var(--pw-text-dim)" }}>
                              {subInfo.cancelAtPeriodEnd ? "Access until" : "Next billing date"}
                            </span>
                            <span style={{ fontWeight: 600 }}>
                              {new Date(subInfo.currentPeriodEnd).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          </div>
                        )}

                        {subInfo.daysRemaining !== null && (
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                            <span style={{ color: "var(--pw-text-dim)" }}>Time remaining</span>
                            <span style={{ fontWeight: 600 }}>
                              {subInfo.daysRemaining === 0
                                ? "Less than a day"
                                : subInfo.daysRemaining === 1
                                  ? "1 day"
                                  : `${subInfo.daysRemaining} days`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Cancel section */}
                    {!subInfo.cancelAtPeriodEnd && (
                      <div style={{ marginTop: 16 }}>
                        {!cancelConfirm ? (
                          <button
                            type="button"
                            className="pw-settings-btn"
                            onClick={() => setCancelConfirm(true)}
                            style={{ color: "var(--pw-text-dim)", fontSize: 13 }}
                          >
                            Cancel subscription
                          </button>
                        ) : (
                          <div style={{
                            padding: "14px 16px",
                            borderRadius: 12,
                            background: "rgba(239,68,68,0.06)",
                            border: "1px solid rgba(239,68,68,0.15)",
                          }}>
                            <p style={{ fontSize: 13, marginBottom: 12, lineHeight: 1.5 }}>
                              Are you sure? Your access will continue until the end of the current billing period. No refund will be issued.
                            </p>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button
                                type="button"
                                className="pw-settings-btn"
                                disabled={cancelLoading}
                                onClick={async () => {
                                  setCancelLoading(true);
                                  setCancelError(null);
                                  try {
                                    const res = await fetch("/api/billing/cancel-subscription", { method: "POST" });
                                    const data = await res.json() as { ok?: boolean; error?: string };
                                    if (res.ok && data.ok) {
                                      setCancelSuccess(true);
                                      setCancelConfirm(false);
                                      // Refresh subscription info
                                      const r2 = await fetch("/api/billing/subscription");
                                      const updated = await r2.json() as SubInfo;
                                      setSubInfo(updated);
                                    } else {
                                      setCancelError(data.error || "Failed to cancel.");
                                    }
                                  } catch {
                                    setCancelError("Network error. Please try again.");
                                  } finally {
                                    setCancelLoading(false);
                                  }
                                }}
                                style={{
                                  background: "rgba(239,68,68,0.15)",
                                  color: "#ef4444",
                                  fontWeight: 600,
                                  fontSize: 13,
                                }}
                              >
                                {cancelLoading ? "Cancelling..." : "Yes, cancel"}
                              </button>
                              <button
                                type="button"
                                className="pw-settings-btn"
                                onClick={() => { setCancelConfirm(false); setCancelError(null); }}
                                style={{ fontSize: 13 }}
                              >
                                Keep subscription
                              </button>
                            </div>
                            {cancelError && (
                              <p style={{ fontSize: 12, color: "#ef4444", marginTop: 8, marginBottom: 0 }}>{cancelError}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Already cancelling message */}
                    {subInfo.cancelAtPeriodEnd && !cancelSuccess && (
                      <p className="pw-settings-hint" style={{ marginTop: 12, color: "#f59e0b" }}>
                        Your subscription is set to cancel. You have full access until the end of your billing period.
                      </p>
                    )}

                    {/* Cancel success message */}
                    {cancelSuccess && (
                      <p className="pw-settings-hint" style={{ marginTop: 12, color: "#10b981" }}>
                        Subscription cancelled. You can continue using Blocwrite until the end of your billing period.
                      </p>
                    )}
                  </div>
                ) : (
                  <div style={{ marginTop: 8 }}>
                    <p className="pw-settings-hint">No active subscription.</p>
                    <a
                      href="/subscribe"
                      className="pw-settings-btn"
                      style={{ display: "inline-block", marginTop: 8, textDecoration: "none", fontWeight: 600 }}
                    >
                      Subscribe
                    </a>
                  </div>
                )}
              </div>

              {/* Email & Password */}
              <div className="pw-settings-group" style={{ borderTop: "1px solid var(--pw-border, rgba(255,255,255,0.08))", paddingTop: 16 }}>
                <div className="pw-settings-group-title">Account Details</div>

                {/* Email display — read only */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 12, color: "var(--pw-text-dim)", marginBottom: 4 }}>Email</label>
                  <input
                    className="pw-settings-input"
                    type="email"
                    value={subInfo?.email ?? ""}
                    disabled
                    readOnly
                    style={{ opacity: 0.55, cursor: "not-allowed" }}
                  />
                </div>

                {/* Password change */}
                {!pwExpanded ? (
                  <button
                    type="button"
                    className="pw-settings-btn"
                    onClick={() => { setPwExpanded(true); setPwError(null); setPwSuccess(false); }}
                    style={{ fontSize: 13 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    Change Password
                  </button>
                ) : (
                  <div style={{
                    padding: "14px 16px",
                    borderRadius: 12,
                    background: "var(--pw-bg-hover, rgba(255,255,255,0.04))",
                    border: "1px solid var(--pw-border, rgba(255,255,255,0.08))",
                  }}>
                    <div style={{ display: "grid", gap: 10 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 12, color: "var(--pw-text-dim)", marginBottom: 4 }}>Current Password</label>
                        <input
                          className="pw-settings-input"
                          type="password"
                          placeholder="Enter current password"
                          value={pwCurrent}
                          onChange={(e) => setPwCurrent(e.target.value)}
                          disabled={pwLoading}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 12, color: "var(--pw-text-dim)", marginBottom: 4 }}>New Password</label>
                        <input
                          className="pw-settings-input"
                          type="password"
                          placeholder="At least 6 characters"
                          value={pwNew}
                          onChange={(e) => setPwNew(e.target.value)}
                          disabled={pwLoading}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 12, color: "var(--pw-text-dim)", marginBottom: 4 }}>Confirm New Password</label>
                        <input
                          className="pw-settings-input"
                          type="password"
                          placeholder="Type new password again"
                          value={pwConfirm}
                          onChange={(e) => setPwConfirm(e.target.value)}
                          disabled={pwLoading}
                        />
                      </div>
                    </div>

                    {pwError && (
                      <p style={{ fontSize: 12, color: "#ef4444", marginTop: 10, marginBottom: 0 }}>{pwError}</p>
                    )}
                    {pwSuccess && (
                      <p style={{ fontSize: 12, color: "#10b981", marginTop: 10, marginBottom: 0 }}>Password changed successfully.</p>
                    )}

                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button
                        type="button"
                        className="pw-settings-btn"
                        disabled={pwLoading}
                        onClick={async () => {
                          setPwError(null);
                          setPwSuccess(false);
                          if (!pwCurrent || !pwNew || !pwConfirm) {
                            setPwError("All fields are required.");
                            return;
                          }
                          if (pwNew.length < 6) {
                            setPwError("New password must be at least 6 characters.");
                            return;
                          }
                          if (pwNew !== pwConfirm) {
                            setPwError("New passwords do not match.");
                            return;
                          }
                          setPwLoading(true);
                          try {
                            const res = await fetch("/api/auth/change-password", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew, confirmPassword: pwConfirm }),
                            });
                            const data = await res.json() as { ok?: boolean; error?: string };
                            if (res.ok && data.ok) {
                              setPwSuccess(true);
                              setPwCurrent("");
                              setPwNew("");
                              setPwConfirm("");
                              setTimeout(() => { setPwExpanded(false); setPwSuccess(false); }, 2000);
                            } else {
                              setPwError(data.error || "Failed to change password.");
                            }
                          } catch {
                            setPwError("Network error. Please try again.");
                          } finally {
                            setPwLoading(false);
                          }
                        }}
                        style={{ fontWeight: 600, fontSize: 13 }}
                      >
                        {pwLoading ? "Saving..." : "Update Password"}
                      </button>
                      <button
                        type="button"
                        className="pw-settings-btn"
                        onClick={() => { setPwExpanded(false); setPwError(null); setPwSuccess(false); setPwCurrent(""); setPwNew(""); setPwConfirm(""); }}
                        style={{ fontSize: 13 }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {onLogout && (
                <div className="pw-settings-group" style={{ borderTop: "1px solid var(--pw-border, rgba(255,255,255,0.08))", paddingTop: 16 }}>
                  <button
                    type="button"
                    className="pw-settings-signout"
                    onClick={onLogout}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <polyline points="16 17 21 12 16 7" />
                      <line x1="21" y1="12" x2="9" y2="12" />
                    </svg>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
