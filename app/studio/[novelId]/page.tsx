"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  countChapterWords,
  countNovelWords,
  countWords,
  createChapter,
  loadNovels,
  saveNovels,
  saveNovelsWithSync,
  flushServerSave,
  loadNovelsFromServer,
  saveNovelsToServer,
  loadSettingsFromServer,
  applySettings,
  gatherSettings,
  saveSettingsToServer,
  enforceNovelIntegrity,
  type Novel,
  type Relationship,
  type Bolton,
  type BoltonCategory,
} from "../studio-store";
import { ProfileButton } from "../components/ProfileButton";
import { ProfilePopup } from "../components/ProfilePopup";
import { TheEditor, type EditorMode, type TargetedFocus, type EditorResult, type EditorChange, type EditorialIssue } from "../components/TheEditor";
import { getProfileAiOff, getProfileLanguage, PROFILE_LANGUAGE_OPTIONS, type ProfileLanguageCode } from "@/lib/profile-store";

type ExportFormat = "docx" | "epub";
type PendingChapterDelete = { id: string; title: string } | null;
const GRAMMAR_LOCALES = [
  { code: "en-US", label: "United States (US)" },
  { code: "en-GB", label: "United Kingdom (UK)" },
  { code: "en-CA", label: "Canada (CA)" },
  { code: "en-AU", label: "Australia (AU)" },
  { code: "en-NZ", label: "New Zealand (NZ)" },
  { code: "en-ZA", label: "South Africa (ZA)" },
] as const;
type OpenRouterModelOption = {
  id: string;
  name: string;
  contextLength: number | null;
  pricing: {
    prompt: string | null;
    completion: string | null;
  };
};
type AssistantProviderId = "openrouter" | "infermatic" | "lmstudio";
type AssistantProviderOption = {
  id: AssistantProviderId;
  label: string;
  requiresKey: boolean;
  defaultBaseUrl: string;
  defaultModel: string;
};
type SummaryAiField = "synopsis" | "palette" | "conflict";
type SummaryAiMenuTarget = "events";
type EventsAiFocus = "balanced" | "character" | "twists" | "romance" | "mystery" | "action";
type CharacterAiMode = "profile" | "voice" | "psyche";
type PlanChapter = NonNullable<Novel["storyBible"]["bookPlan"]["chapters"][number]>;
type PlanAiChapterTarget = number; // 1-15, user-selected
type PlanChapterDraft = {
  title?: string;
  synopsis?: string;
  characters?: string[];
  locations?: string[];
  events?: string[];
};
type StoryBibleContextMode = "default" | "plan" | "planCompact" | "characterCompact" | "micro";
type StoryBibleContextTask =
  | "summary"
  | "events"
  | "lore"
  | "locations"
  | "characters"
  | "plan"
  | "default";

type GrammarMatch = {
  message: string;
  shortMessage?: string;
  offset: number;
  length: number;
  replacements?: { value: string }[];
  rule?: { id: string; category?: { id: string; name?: string } };
  context?: { text: string; offset: number; length: number };
};

type ProofreadCategoryId = "spelling" | "vocabulary" | "readability" | "grammar";
type ProofreadCategory = {
  id: ProofreadCategoryId;
  title: string;
  subtitle: string;
  chip: string;
};

function getMatchKey(match: GrammarMatch): string {
  return `${match.offset}:${match.length}:${match.message}`;
}

function categorizeMatch(match: GrammarMatch): ProofreadCategoryId {
  const catId = match.rule?.category?.id ?? "";
  if (catId === "TYPOS" || catId === "SPELLING" || catId.startsWith("SPELL")) return "spelling";
  if (catId === "CONFUSED_WORDS" || catId === "SEMANTICS" || catId === "REDUNDANCY") return "vocabulary";
  if (catId === "STYLE" || catId === "PLAIN_ENGLISH" || catId === "WORDINESS" || catId === "TYPOGRAPHY" || catId === "PUNCTUATION") return "readability";
  return "grammar";
}

const SMALL_CONTEXT_THRESHOLD = 24000;
const MICRO_CONTEXT_THRESHOLD = 8000;
const CHARACTER_ROLE_OPTIONS = [
  "Protagonist",
  "Antagonist",
  "Supporting",
  "Minor",
  "Love Interest",
  "Type",
  "Custom",
] as const;
type CharacterRole = (typeof CHARACTER_ROLE_OPTIONS)[number];
const POV_OPTIONS = [
  { value: "first", label: "First person (I)" },
  { value: "first-multiple", label: "First person, multiple narrators" },
  { value: "third-limited", label: "Third person limited" },
  { value: "third-omniscient", label: "Third person omniscient" },
  { value: "second", label: "Second person (you)" },
  { value: "epistolary", label: "Epistolary / documents" },
];
const TENSE_OPTIONS = [
  { value: "past", label: "Past" },
  { value: "present", label: "Present" },
  { value: "future", label: "Future" },
];
const GENRE_OPTIONS = [
  "Literary Fiction",
  "Commercial Fiction",
  "Contemporary",
  "Romance",
  "Romantic Comedy",
  "Dark Romance",
  "Fantasy",
  "Epic Fantasy",
  "Urban Fantasy",
  "Romantasy",
  "Science Fiction",
  "Space Opera",
  "Cyberpunk",
  "Dystopian",
  "Post-Apocalyptic",
  "Mystery",
  "Thriller",
  "Psychological Thriller",
  "Crime",
  "Horror",
  "Gothic Horror",
  "Historical Fiction",
  "Young Adult",
  "New Adult",
  "Coming-of-Age",
  "Adventure",
  "Action",
  "War",
  "Speculative Fiction",
  "Magical Realism",
  "Cozy Mystery",
  "Family Saga",
  "Satire",
  "Western",
] as const;
const PLAN_CHAPTER_PRESETS = [3, 5, 8, 10, 12, 15] as const;
const PLAN_CHAPTER_MAX = 40;
const BOLTON_LIBRARY_KEY = "pilotwriter.boltons.library.v1";
const BOLTON_PLUGIN_CATEGORIES: Array<{ id: BoltonCategory; label: string; hint: string }> = [
  { id: "voice-style", label: "Voice & Style", hint: "Diction, rhythm, sentence style." },
  { id: "pacing-tension", label: "Pacing & Tension", hint: "Scene speed, suspense, urgency." },
  { id: "dialogue-subtext", label: "Dialogue & Subtext", hint: "Dialogue goals and hidden meaning." },
  { id: "description-sensory", label: "Description", hint: "Sensory detail and visual clarity." },
  { id: "emotion-psychology", label: "Emotion", hint: "Interiority and emotional beats." },
  { id: "plot-structure", label: "Plot & Structure", hint: "Cause-effect, escalation, outcomes." },
  { id: "world-atmosphere", label: "World & Atmosphere", hint: "Setting mood, cultural detail." },
  { id: "custom", label: "Custom", hint: "Any custom creative constraint." },
];
const ASSISTANT_PROVIDER_OPTIONS: AssistantProviderOption[] = [
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

function getProviderOption(id: AssistantProviderId) {
  return ASSISTANT_PROVIDER_OPTIONS.find((provider) => provider.id === id) ?? ASSISTANT_PROVIDER_OPTIONS[0];
}

function getStoredProvider() {
  if (typeof window === "undefined") return "openrouter" as AssistantProviderId;
  const stored = window.localStorage.getItem("pilotwriter.assistant.provider");
  if (stored && ASSISTANT_PROVIDER_OPTIONS.some((provider) => provider.id === stored)) {
    return stored as AssistantProviderId;
  }
  return "openrouter" as AssistantProviderId;
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
const CHARACTER_AI_MODE_COPY: Record<CharacterAiMode, { label: string; description: string }> = {
  profile: {
    label: "Full Profile",
    description: "Builds appearance, personality, goals, fears, and backstory from your Canon.",
  },
  voice: {
    label: "Voice & Style",
    description: "Crafts how they speak — accent, rhythm, vocabulary — matched to your author style.",
  },
  psyche: {
    label: "Inner World",
    description: "Deepens their psychology — hidden secrets, stress reactions, and subtle reader foreshadowing.",
  },
};
// ── Common English words that should NEVER be treated as character names ──
// This blocklist catches words that appear capitalised at sentence starts.
// The extraction function also skips sentence-initial words, so this is a safety net.
const SUMMARY_NAME_BLOCKLIST = new Set([
  // Articles, determiners, pronouns
  "the","a","an","this","that","these","those","my","your","his","her","its","our","their",
  "he","she","they","them","him","her","who","whom","what","which","each","every","both",
  "few","many","much","some","any","all","most","none","other","another","either","neither",
  // Common verbs & auxiliaries
  "is","are","was","were","has","had","have","been","being","would","could","should","might",
  "will","shall","may","can","must","does","did","let","got","get","set","put","run","ran",
  "but","and","yet","nor","for","not","now","then","when","where","here","there","how","why",
  // Conjunctions, prepositions, adverbs
  "however","although","despite","meanwhile","throughout","furthermore","moreover",
  "nevertheless","nonetheless","perhaps","eventually","ultimately","suddenly","finally",
  "initially","before","after","during","between","through","against","without","within",
  "around","beneath","beyond","behind","together","already","almost","because","whether",
  "therefore","otherwise","several","also","just","only","very","still","often","never",
  "always","sometimes","soon","later","once","while","since","until","upon","about","above",
  "across","along","below","under","toward","towards","into","onto","from","over","with",
  // Common sentence starters
  "slowly","quickly","gently","deeply","strongly","quietly","loudly","softly","barely",
  "merely","simply","truly","really","actually","certainly","clearly","definitely",
  "absolutely","completely","entirely","exactly","hardly","nearly","probably","possibly",
  "apparently","evidently","obviously","presumably","supposedly","fortunately","unfortunately",
  "interestingly","surprisingly","importantly","significantly","increasingly","gradually",
  // Narrative / structural words
  "chapter","act","scene","prologue","epilogue","summary","premise","synopsis","genre",
  "tone","theme","conflict","stakes","story","novel","book","part",
  // Time words
  "day","week","month","year","morning","evening","night","afternoon","dawn","dusk",
  "today","yesterday","tomorrow","tonight",
  // Emotion / abstract words
  "love","fear","hope","anger","grief","pain","loss","truth","lies","death","life","fate",
  "power","honor","shame","guilt","trust","doubt","peace","war","home","work",
  // Role-like words
  "anonymous","stranger","blackmailer","killer","victim","witness","detective","inspector",
  "doctor","nurse","teacher","soldier","captain","sergeant","king","queen","prince","princess",
  "lord","lady","father","mother","brother","sister","uncle","aunt","cousin","friend","enemy",
  // Place-related
  "city","town","village","county","street","road","park","church","school","hospital",
  "station","house","estate","forest","castle","palace","market","bridge","square",
  "north","south","east","west","central","country","world","land","island","river","lake",
  "mountain","valley","coast","harbour","harbor","port",
]);
const CHARACTER_SURNAME_FALLBACKS = [
  "Hale",
  "Mercer",
  "Quinn",
  "Bennett",
  "Rowan",
  "Harper",
  "Hayes",
  "Calloway",
  "Sinclair",
  "Monroe",
  "Keating",
  "West",
] as const;

const ROLE_ALIAS_TOKENS = [
  "anonymous",
  "stranger",
  "blackmailer",
  "killer",
  "informant",
  "witness",
  "caller",
  "sender",
  "hacker",
  "stalker",
] as const;

function isRoleLikeCharacterLabel(value: string) {
  const lower = value.trim().toLowerCase();
  if (!lower) return false;
  return ROLE_ALIAS_TOKENS.some((token) => lower.includes(token));
}

function isLikelyHumanName(name: string) {
  const cleaned = name.trim();
  if (!cleaned) return false;
  if (isRoleLikeCharacterLabel(cleaned)) return false;
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 3) return false;
  if (/^(new character|character \d+|unknown|unnamed|n\/a|the )/i.test(cleaned)) return false;
  return words.every((word) => /^[A-Z][a-zA-Z'-]{1,24}$/.test(word));
}

const PROOFREAD_CATEGORIES: ProofreadCategory[] = [
  {
    id: "spelling",
    title: "Catch typos and spelling errors",
    subtitle: "Unknown words and misspellings",
    chip: "Spelling",
  },
  {
    id: "vocabulary",
    title: "Improve vocabulary",
    subtitle: "Confused words and weak choices",
    chip: "Vocabulary",
  },
  {
    id: "readability",
    title: "Improve flow and readability",
    subtitle: "Wordy or awkward phrasing",
    chip: "Readability",
  },
  {
    id: "grammar",
    title: "Avoid grammar mistakes",
    subtitle: "Grammar and punctuation fixes",
    chip: "Grammar",
  },
];

const STORY_BIBLE_LIMITS = {
  summary: {
    premise: 1200,
    synopsisShort: 3000,
    stakes: 1200,
    listItem: 48,
    listCount: 16,
  },
  styleVoice: {
    pov: 48,
    tense: 24,
    voiceRules: 1200,
    compItem: 64,
    compCount: 10,
    bannedWord: 40,
    bannedCount: 60,
  },
  character: {
    name: 80,
    role: 24,
    pronouns: 40,
    groups: 140,
    otherNames: 220,
    logline: 320,
    appearance: 900,
    personality: 1200,
    goals: 900,
    fears: 900,
    backstory: 1800,
    secrets: 900,
    readerSecretHint: 700,
    accent: 80,
    speakingStyle: 900,
    reactionPattern: 900,
    voiceNotes: 900,
    tag: 32,
    tagCount: 20,
    relationshipType: 50,
    relationshipDescription: 220,
    relationshipCount: 25,
  },
  location: {
    name: 120,
    type: 80,
    description: 1800,
    sensoryDetails: 900,
    rules: 900,
    significance: 900,
    tag: 36,
    tagCount: 16,
  },
  lore: {
    title: 120,
    content: 1800,
    constraint: 160,
    constraintCount: 20,
  },
  timeline: {
    name: 120,
    when: 120,
    summary: 900,
  },
  worldbuilding: 4000,
  aiContextMaxTokens: 131072,
} as const;

const SUMMARY_LIST_INPUT_MAX = STORY_BIBLE_LIMITS.summary.listCount * (STORY_BIBLE_LIMITS.summary.listItem + 2);
const CHARACTER_TAG_INPUT_MAX =
  STORY_BIBLE_LIMITS.character.tagCount * (STORY_BIBLE_LIMITS.character.tag + 2);
const LORE_CONSTRAINT_INPUT_MAX =
  STORY_BIBLE_LIMITS.lore.constraintCount * (STORY_BIBLE_LIMITS.lore.constraint + 2);
const BANNED_WORDS_INPUT_MAX =
  STORY_BIBLE_LIMITS.styleVoice.bannedCount * (STORY_BIBLE_LIMITS.styleVoice.bannedWord + 2);

function NovelWorkspacePage() {
  const params = useParams<{ novelId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [novels, setNovels] = useState<Novel[]>(() => loadNovels());
  const [novelSyncDone, setNovelSyncDone] = useState(false);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("epub");
  const [exportScope, setExportScope] = useState<"all" | "selected">("all");
  const [selectedExportChapterIds, setSelectedExportChapterIds] = useState<string[]>([]);
  const [exportingFile, setExportingFile] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editorResult, setEditorResult] = useState<EditorResult | null>(null);
  const [editorLoadingPhase, setEditorLoadingPhase] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [editorOriginalParagraphs, setEditorOriginalParagraphs] = useState<string[]>([]);
  const [pendingChapterDelete, setPendingChapterDelete] = useState<PendingChapterDelete>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editorInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [assistantProvider, setAssistantProvider] = useState<AssistantProviderId>(() => getStoredProvider());
  const [openRouterKey, setOpenRouterKey] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const provider = getStoredProvider();
    return readStoredProviderField(provider, "key");
  });
  const [assistantBaseUrl, setAssistantBaseUrl] = useState<string>(() => {
    const provider = getStoredProvider();
    const stored = readStoredProviderField(provider, "baseUrl");
    return stored || getProviderOption(provider).defaultBaseUrl;
  });
  const [openRouterStatus, setOpenRouterStatus] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const [openRouterError, setOpenRouterError] = useState<string | null>(null);
  const [openRouterModel, setOpenRouterModel] = useState<string>(() => {
    if (typeof window === "undefined") return "openai/gpt-4o-mini";
    const provider = getStoredProvider();
    const stored = readStoredProviderField(provider, "model");
    return stored || getProviderOption(provider).defaultModel;
  });
  const [openRouterModels, setOpenRouterModels] = useState<OpenRouterModelOption[]>([]);
  const [openRouterModelsLoading, setOpenRouterModelsLoading] = useState(false);
  const [openRouterModelsError, setOpenRouterModelsError] = useState<string | null>(null);
  const [openRouterModelSearch, setOpenRouterModelSearch] = useState("");
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showStoryBibleModal, setShowStoryBibleModal] = useState(false);
  const [bibleSection, setBibleSection] = useState<
    "summary" | "characters" | "locations" | "worldbuilding" | "styleVoice" | "boltons"
  >(
    "summary",
  );
  const [selectedV2CharacterId, setSelectedV2CharacterId] = useState<string | null>(null);
  const [storyAiBusyAction, setStoryAiBusyAction] = useState<string | null>(null);
  const [storyAiBusyElapsedSec, setStoryAiBusyElapsedSec] = useState(0);
  const [boltonCategoryFilter, setBoltonCategoryFilter] = useState<"all" | BoltonCategory>("all");
  const [boltonLibraryCount, setBoltonLibraryCount] = useState(0);
  const [storyAiError, setStoryAiError] = useState<string | null>(null);
  const [aiOff, setAiOff] = useState(() => getProfileAiOff());
  const profileLangCode = getProfileLanguage();
  const profileLangLabel = PROFILE_LANGUAGE_OPTIONS.find((o) => o.code === profileLangCode)?.label || "English";
  const [styleAuthorDraft, setStyleAuthorDraft] = useState("");
  const [summaryAutofillPrompt, setSummaryAutofillPrompt] = useState("");
  const [openSummaryAiMenu, setOpenSummaryAiMenu] = useState<SummaryAiMenuTarget | null>(null);
  const [summaryGenreDraft, setSummaryGenreDraft] = useState<string>(GENRE_OPTIONS[0]);
  const [summaryCustomGenreDraft, setSummaryCustomGenreDraft] = useState("");
  const [summaryAiMode, setSummaryAiMode] = useState<{
    synopsis: "improve" | "tighten" | "expand" | "blurb" | "beats";
    palette: "classify" | "refresh" | "blend" | "audience";
    conflict: "improve" | "intensify" | "moral" | "pressure";
  }>({
    synopsis: "improve",
    palette: "classify",
    conflict: "improve",
  });
  const [eventsAiCount, setEventsAiCount] = useState<6 | 8 | 10 | 12>(8);
  const [focusBlockIndex, setFocusBlockIndex] = useState<number | null>(null);
  const [blockProseDrafts, setBlockProseDrafts] = useState<Record<string, string>>({});
  const [collapsedBeats, setCollapsedBeats] = useState<Set<number>>(new Set());
  const [editorFontFamily, setEditorFontFamily] = useState<string>("serif");
  const blockProseRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  const EDITOR_FONT_OPTIONS = [
    { id: "serif", label: "Serif", font: "Georgia, 'Times New Roman', serif" },
    { id: "sans", label: "Sans", font: "var(--font-sans), 'Inter', system-ui, sans-serif" },
    { id: "mono", label: "Mono", font: "var(--font-mono), ui-monospace, 'Cascadia Code', monospace" },
  ];
  const [characterAiMode, setCharacterAiMode] = useState<CharacterAiMode>("profile");
  const [locationLookupBusyId, setLocationLookupBusyId] = useState<string | null>(null);
  const [locationLookupMessage, setLocationLookupMessage] = useState<string | null>(null);
  const [locationLookupCache, setLocationLookupCache] = useState<Record<string, string>>({});
  const [autosaveStatus, setAutosaveStatus] = useState<{
    status: "idle" | "ok" | "error";
    message: string;
    at?: string;
  }>({ status: "idle", message: "" });
  const [planError, setPlanError] = useState<string | null>(null);
  const [showPlanGenerateModal, setShowPlanGenerateModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingGoalWords, setEditingGoalWords] = useState<string | null>(null);
  const [hideBlocks, setHideBlocks] = useState(false);
  const [chapterBoltonByChapterId, setChapterBoltonByChapterId] = useState<Record<string, string>>({});
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<"dark" | "light">("dark");
  const sidebarHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize theme from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("bw-theme") as "dark" | "light" | null;
    if (stored) setCurrentTheme(stored);
  }, []);

  function toggleTheme() {
    const next = currentTheme === "dark" ? "light" : "dark";
    setCurrentTheme(next);
    localStorage.setItem("bw-theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }

  useEffect(() => {
    if (!storyAiBusyAction) {
      setStoryAiBusyElapsedSec(0);
      return;
    }
    const started = Date.now();
    setStoryAiBusyElapsedSec(0);
    const timerId = window.setInterval(() => {
      setStoryAiBusyElapsedSec(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [storyAiBusyAction]);

  useEffect(() => {
    if (!showStoryBibleModal || bibleSection !== "boltons") return;
    setBoltonLibraryCount(readBoltonLibrary().length);
  }, [showStoryBibleModal, bibleSection]);

  useEffect(() => {
    setBlockProseDrafts({});
  }, [activeChapterId]);

  function handleSidebarEnter() {
    if (sidebarPinned) return;
    if (sidebarHoverTimer.current) clearTimeout(sidebarHoverTimer.current);
    setSidebarCollapsed(false);
  }

  function handleSidebarLeave() {
    if (sidebarPinned) return;
    sidebarHoverTimer.current = setTimeout(() => setSidebarCollapsed(true), 300);
  }

  function toggleSidebarPin() {
    setSidebarPinned((prev) => {
      const next = !prev;
      setSidebarCollapsed(!next);
      return next;
    });
  }
  const [planGenerateCustomCount, setPlanGenerateCustomCount] = useState("8");
  const [planGeneratePacingMode, setPlanGeneratePacingMode] = useState<"balanced" | "slow-burn" | "fast">("balanced");
  const [planGenerateProgressIdx, setPlanGenerateProgressIdx] = useState<number | null>(null);
  const [planGenerateTotal, setPlanGenerateTotal] = useState(0);
  const [grammarMatches, setGrammarMatches] = useState<GrammarMatch[]>([]);
  const [grammarChecking, setGrammarChecking] = useState(false);
  const [grammarError, setGrammarError] = useState<string | null>(null);
  const [grammarLocale, setGrammarLocale] = useState<string>("en-US");
  const [lastCheckedContent, setLastCheckedContent] = useState<string | null>(null);
  const [ignoredMatchKeys, setIgnoredMatchKeys] = useState<string[]>([]);
  const [proofreadFilter, setProofreadFilter] = useState<ProofreadCategoryId | "all">("all");
  const [proofreadOpen, setProofreadOpen] = useState(false);

  const novelId = params?.novelId;

  const novel = useMemo(
    () => novels.find((item) => item.id === novelId) ?? null,
    [novels, novelId],
  );
  const activeChapter = useMemo(
    () => (novel ? novel.chapters.find((chapter) => chapter.id === activeChapterId) ?? null : null),
    [novel, activeChapterId],
  );
  const storyCharacters = useMemo(() => novel?.storyBible.characters ?? [], [novel]);
  const storyLocations = useMemo(() => novel?.storyBible.locations ?? [], [novel]);
  const storyTimelineEvents = useMemo(() => novel?.storyBible.timeline ?? [], [novel]);
  const planChapters = useMemo(() => novel?.storyBible.bookPlan?.chapters ?? [], [novel]);
  const chapterBoltonId = activeChapter ? (chapterBoltonByChapterId[activeChapter.id] ?? "") : "";
  useEffect(() => {
    if (!activeChapter) return;
    const { blocks, hasBlocks } = parseChapterBlocks(activeChapter.content);
    if (!hasBlocks || blocks.length === 0) return;
    const normalizedNotes = blocks.map((block) => block.notes.trim());
    const unique = new Set(normalizedNotes);
    if (unique.size !== 1) return;
    const only = normalizedNotes[0] || "";
    setChapterBoltonByChapterId((current) => {
      const existing = current[activeChapter.id] ?? "";
      if (existing === only) return current;
      const next = { ...current };
      if (only) next[activeChapter.id] = only;
      else delete next[activeChapter.id];
      return next;
    });
  }, [activeChapter?.id, activeChapter?.content]);
  const hasSummaryForCharacterAi = useMemo(() => {
    if (!novel) return false;
    const summary = novel.storyBible.summary;
    return Boolean(summary.synopsisShort.trim() || summary.stakes.trim());
  }, [novel]);
  const filteredOpenRouterModels = useMemo(() => {
    const query = openRouterModelSearch.trim().toLowerCase();
    if (!query) return openRouterModels;
    return openRouterModels.filter((model) => {
      return model.id.toLowerCase().includes(query) || model.name.toLowerCase().includes(query);
    });
  }, [openRouterModelSearch, openRouterModels]);
  const selectedOpenRouterModel = useMemo(
    () => openRouterModels.find((model) => model.id === openRouterModel) ?? null,
    [openRouterModels, openRouterModel],
  );
  const selectedProviderOption = useMemo(
    () => getProviderOption(assistantProvider),
    [assistantProvider],
  );



  useEffect(() => {
    setActiveChapterId(null);
    setShowEditorModal(false);
    setEditorResult(null);
    setEditorError(null);
    setShowExportModal(false);
    setProfileOpen(false);
    setSelectedExportChapterIds([]);
    setExportError(null);
    setOpenRouterStatus("idle");
    setOpenRouterError(null);
    setStoryAiBusyAction(null);
    setStoryAiError(null);
    setStyleAuthorDraft("");
    setSummaryAutofillPrompt("");
    setOpenSummaryAiMenu(null);
    setSummaryGenreDraft(GENRE_OPTIONS[0]);
    setSummaryCustomGenreDraft("");
    setSummaryAiMode({
      synopsis: "improve",
      palette: "classify",
      conflict: "improve",
    });
    setEventsAiCount(8);
    setCharacterAiMode("profile");
    setLocationLookupBusyId(null);
    setLocationLookupMessage(null);
    setLocationLookupCache({});
    setPlanError(null);
    setShowPlanGenerateModal(false);
    setPlanGenerateCustomCount("8");
    setPlanGeneratePacingMode("balanced");
  }, [novelId]);

  useEffect(() => {
    if (!activeChapterId || !novel) return;
    const exists = novel.chapters.some((chapter) => chapter.id === activeChapterId);
    if (!exists) {
      setActiveChapterId(null);
      setShowEditorModal(false);
      setEditorResult(null);
      setEditorError(null);
    }
  }, [activeChapterId, novel]);

  useEffect(() => {
    setShowEditorModal(false);
    setEditorResult(null);
    setEditorError(null);
  }, [activeChapterId, novel]);

  useEffect(() => {
    if (!novel) return;
    const allowed = new Set(novel.chapters.map((chapter) => chapter.id));
    setSelectedExportChapterIds((current) => {
      const filtered = current.filter((id) => allowed.has(id));
      if (filtered.length === current.length) return current;
      return filtered;
    });
  }, [novel, novel?.chapters]);

  useEffect(() => {
    setActiveChapterId((current) => current);
  }, [novelId]);

  useEffect(() => {
    if (storyCharacters.length === 0) {
      if (selectedV2CharacterId !== null) setSelectedV2CharacterId(null);
      return;
    }
    const exists = storyCharacters.some((character) => character.id === selectedV2CharacterId);
    if (!exists) {
      setSelectedV2CharacterId(storyCharacters[0].id);
    }
  }, [storyCharacters, selectedV2CharacterId]);

  useEffect(() => {
    if (!novel) return;
    const plan = novel.storyBible.bookPlan?.chapters ?? [];
    const chapters = novel.chapters ?? [];
    if (chapters.length === 0) return;

    const chapterByTitle = new Map(chapters.map((chapter) => [chapter.title.trim().toLowerCase(), chapter]));
    const linkedChapterIds = new Set<string>();
    let needsUpdate = false;

    for (const planChapter of plan) {
      const linkedId = (planChapter.manuscriptChapterId || "").trim();
      const linkedChapterExists = linkedId && chapters.some((chapter) => chapter.id === linkedId);
      if (linkedChapterExists) {
        linkedChapterIds.add(linkedId);
        continue;
      }

      const titleKey = (planChapter.title || "").trim().toLowerCase();
      const titleMatch = titleKey ? chapterByTitle.get(titleKey) : undefined;
      if (!titleMatch || linkedChapterIds.has(titleMatch.id)) continue;

      needsUpdate = true;
      linkedChapterIds.add(titleMatch.id);
    }

    const missingChapters = chapters.filter((chapter) => !linkedChapterIds.has(chapter.id));
    if (!needsUpdate && missingChapters.length === 0) return;

    mutateNovel((current) => {
      const now = new Date().toISOString();
      const currentPlan = current.storyBible.bookPlan?.chapters ?? [];
      const currentChapterByTitle = new Map(
        current.chapters.map((chapter) => [chapter.title.trim().toLowerCase(), chapter]),
      );
      const usedChapterIds = new Set<string>();
      const relinkedCurrentPlan = currentPlan.map((planChapter) => {
        const linkedId = (planChapter.manuscriptChapterId || "").trim();
        const linkedChapterExists = linkedId && current.chapters.some((chapter) => chapter.id === linkedId);
        if (linkedChapterExists && !usedChapterIds.has(linkedId)) {
          usedChapterIds.add(linkedId);
          return planChapter;
        }
        const titleKey = (planChapter.title || "").trim().toLowerCase();
        const titleMatch = titleKey ? currentChapterByTitle.get(titleKey) : undefined;
        if (!titleMatch || usedChapterIds.has(titleMatch.id)) return planChapter;
        usedChapterIds.add(titleMatch.id);
        return { ...planChapter, manuscriptChapterId: titleMatch.id };
      });
      const currentMissing = current.chapters.filter((chapter) => !usedChapterIds.has(chapter.id));
      return {
        ...current,
        storyBible: {
          ...current.storyBible,
          bookPlan: {
            ...(current.storyBible.bookPlan ?? {
              chapters: [],
              aiChapterTarget: 8,
              updatedAt: now,
            }),
            chapters: [
              ...relinkedCurrentPlan,
              ...currentMissing.map((chapter, index) =>
                createPlanChapterFromManuscript(chapter, relinkedCurrentPlan.length + index),
              ),
            ],
            updatedAt: now,
          },
          updatedAt: now,
        },
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [novel]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("pilotwriter.assistant.provider", assistantProvider);
    const providerOption = getProviderOption(assistantProvider);
    const storedKey = readStoredProviderField(assistantProvider, "key");
    const storedModel = readStoredProviderField(assistantProvider, "model");
    const storedBaseUrl = readStoredProviderField(assistantProvider, "baseUrl");
    setOpenRouterKey(normalizeClientApiKey(storedKey));
    setOpenRouterModel(storedModel || providerOption.defaultModel);
    setAssistantBaseUrl(storedBaseUrl || providerOption.defaultBaseUrl);
    setOpenRouterModels([]);
    setOpenRouterModelSearch("");
    setShowModelDropdown(false);
    setOpenRouterStatus("idle");
    setOpenRouterError(null);
    void saveSettingsToServer(gatherSettings());
  }, [assistantProvider]);


  function persistOpenRouterKey(key: string) {
    const normalized = normalizeClientApiKey(key);
    setOpenRouterKey(normalized);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`pilotwriter.assistant.${assistantProvider}.key`, normalized);
      void saveSettingsToServer(gatherSettings());
    }
  }

  function persistOpenRouterModel(model: string) {
    setOpenRouterModel(model);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`pilotwriter.assistant.${assistantProvider}.model`, model);
      void saveSettingsToServer(gatherSettings());
    }
  }

  function persistAssistantBaseUrl(baseUrl: string) {
    setAssistantBaseUrl(baseUrl);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`pilotwriter.assistant.${assistantProvider}.baseUrl`, baseUrl);
      void saveSettingsToServer(gatherSettings());
    }
  }

  const loadOpenRouterModels = useCallback(async () => {
    setOpenRouterModelsLoading(true);
    setOpenRouterModelsError(null);
    try {
      const response = await fetch("/api/openrouter/models", {
        method: "GET",
        headers: {
          "x-provider": assistantProvider,
          "x-provider-key": normalizeClientApiKey(openRouterKey),
          "x-provider-base-url": assistantBaseUrl.trim(),
        },
      });
      const payload = (await response.json()) as {
        models?: OpenRouterModelOption[];
        error?: string;
      };
      if (!response.ok) {
        setOpenRouterModelsError(payload.error || "Unable to load models.");
        return;
      }
      const models = Array.isArray(payload.models) ? payload.models : [];
      setOpenRouterModels(models);
    } catch (error) {
      setOpenRouterModelsError(
        error instanceof Error ? error.message : "Unable to load models for this provider.",
      );
    } finally {
      setOpenRouterModelsLoading(false);
    }
  }, [assistantProvider, openRouterKey, assistantBaseUrl]);

  useEffect(() => {
    if (!profileOpen) return;
    if (openRouterModels.length > 0) return;
    void loadOpenRouterModels();
  }, [profileOpen, openRouterModels.length, loadOpenRouterModels]);

  useEffect(() => {
    if (profileOpen) return;
    setShowModelDropdown(false);
    setOpenRouterModelSearch("");
  }, [profileOpen]);

  // Load novels from server on mount — merge with local to prevent race conditions.
  // When a novel is just created, it might exist locally but not yet on the server.
  useEffect(() => {
    void (async () => {
      const localNovels = loadNovels();
      const serverNovels = await loadNovelsFromServer();

      if (serverNovels !== null && serverNovels.length > 0) {
        // Merge: use server data as base, but keep any local novels that aren't on the server
        // (e.g. a novel that was just created and saved before navigation)
        const serverIds = new Set(serverNovels.map((n) => n.id));
        const localOnly = localNovels.filter((n) => !serverIds.has(n.id));
        const merged = [...localOnly, ...serverNovels];
        setNovels(merged);
        saveNovels(merged); // cache merged result locally
        // If there were local-only novels, push the merged list to the server
        if (localOnly.length > 0) {
          void saveNovelsToServer(merged);
        }
      } else if (serverNovels !== null && serverNovels.length === 0) {
        // Server empty — push local data up
        if (localNovels.length > 0) {
          void saveNovelsToServer(localNovels);
        }
      }
      // Also sync settings
      const serverSettings = await loadSettingsFromServer();
      if (serverSettings && Object.keys(serverSettings).length > 0) {
        applySettings(serverSettings);
      }
      setNovelSyncDone(true);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const flushNow = () => {
      saveNovels(novels);
      flushServerSave();
    };
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") flushNow();
    };

    window.addEventListener("beforeunload", flushNow);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("beforeunload", flushNow);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [novels]);

  useEffect(() => {
    if (!profileOpen) return;
    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
    };
  }, [profileOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (pendingChapterDelete) {
        setPendingChapterDelete(null);
        return;
      }
      if (showPlanGenerateModal) {
        setShowPlanGenerateModal(false);
        return;
      }
      if (showExportModal) {
        setShowExportModal(false);
        return;
      }
      if (showPlanModal) {
        setShowPlanModal(false);
        return;
      }
      if (showEditorModal) {
        setShowEditorModal(false);
        return;
      }
      if (showStoryBibleModal) {
        setShowStoryBibleModal(false);
        return;
      }
      if (profileOpen) {
        setProfileOpen(false);
        return;
      }
      if (focusBlockIndex !== null) {
        setFocusBlockIndex(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    pendingChapterDelete,
    showPlanGenerateModal,
    showExportModal,
    showPlanModal,
    showEditorModal,
    showStoryBibleModal,
    profileOpen,
    focusBlockIndex,
  ]);

  useEffect(() => {
    setOpenSummaryAiMenu(null);
  }, [bibleSection]);

  useEffect(() => {
    if (showStoryBibleModal && novelId && novels.length > 0) {
      const ok = saveNovelsWithSync(novels);
      setAutosaveStatus((prev) =>
        ok
          ? { ...prev, status: "ok", message: "Saved", at: new Date().toISOString() }
          : { ...prev, status: "error", message: "Save failed", at: new Date().toISOString() },
      );
    }
  }, [bibleSection, showStoryBibleModal, novelId, novels]);

  useEffect(() => {
    if (!openSummaryAiMenu) return;
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target) return;
      if (target.closest(".pw-bible-field-ai-menu-wrap")) return;
      setOpenSummaryAiMenu(null);
    };
    window.addEventListener("mousedown", handleOutsideClick);
    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [openSummaryAiMenu]);

  async function checkOpenRouterKey() {
    const normalizedApiKey = normalizeClientApiKey(openRouterKey);
    if (selectedProviderOption.requiresKey && !normalizedApiKey) {
      setOpenRouterStatus("error");
      setOpenRouterError("Add an API key first.");
      return;
    }
    if (!assistantBaseUrl.trim()) {
      setOpenRouterStatus("error");
      setOpenRouterError("Add a base URL first.");
      return;
    }
    setOpenRouterStatus("checking");
    setOpenRouterError(null);
    try {
      const response = await fetch("/api/openrouter/check", {
        method: "POST",
        headers: {
          "x-provider": assistantProvider,
          "x-provider-key": normalizedApiKey,
          "x-provider-base-url": assistantBaseUrl.trim(),
        },
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setOpenRouterStatus("error");
        setOpenRouterError(payload.error || "Key check failed.");
        return;
      }
      setOpenRouterStatus("ok");
      void loadOpenRouterModels();
    } catch (error) {
      setOpenRouterStatus("error");
      setOpenRouterError(
        error instanceof Error
          ? error.message
          : `Unable to reach ${selectedProviderOption.label}. Please try again.`,
      );
    }
  }

  function createEntityId(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function parseStringList(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }

  function parseCharacterRowsFromText(raw: string) {
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^[-*]\s+/, "").replace(/^\d+\.\s+/, ""))
      .map((line) => line.split("|").map((part) => part.trim()))
      .filter((parts) => parts.length >= 2)
      .map((parts) => ({
        name: parts[0] ?? "",
        role: parts[1] ?? "",
        logline: parts[2] ?? "",
        pronouns: parts[3] ?? "",
        accent: parts[4] ?? "",
        speakingStyle: parts[5] ?? "",
        goals: parts[6] ?? "",
        fears: parts[7] ?? "",
      }))
      .filter((character) => isLikelyHumanName(character.name.trim()));
  }

  function clampText(value: unknown, maxLength: number) {
    if (typeof value !== "string") return "";
    return value.slice(0, maxLength);
  }

  function clampTextList(value: unknown, maxCount: number, maxItemLength: number) {
    const source = Array.isArray(value) ? value : [];
    const unique = new Set<string>();
    const next: string[] = [];
    for (const item of source) {
      if (typeof item !== "string") continue;
      const normalized = item.trim().slice(0, maxItemLength);
      if (!normalized) continue;
      const key = normalized.toLowerCase();
      if (unique.has(key)) continue;
      unique.add(key);
      next.push(normalized);
      if (next.length >= maxCount) break;
    }
    return next;
  }

  function clampAiContextTokens(value: unknown) {
    if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
    const rounded = Math.round(value);
    if (rounded <= 0) return undefined;
    return Math.min(rounded, STORY_BIBLE_LIMITS.aiContextMaxTokens);
  }

  function sanitizeSummarySection(summary: Novel["storyBible"]["summary"]): Novel["storyBible"]["summary"] {
    return {
      premise: clampText(summary.premise, STORY_BIBLE_LIMITS.summary.premise),
      synopsisShort: clampText(summary.synopsisShort, STORY_BIBLE_LIMITS.summary.synopsisShort),
      themes: clampTextList(
        summary.themes,
        STORY_BIBLE_LIMITS.summary.listCount,
        STORY_BIBLE_LIMITS.summary.listItem,
      ),
      genre: clampTextList(
        summary.genre,
        STORY_BIBLE_LIMITS.summary.listCount,
        STORY_BIBLE_LIMITS.summary.listItem,
      ),
      tone: clampTextList(
        summary.tone,
        STORY_BIBLE_LIMITS.summary.listCount,
        STORY_BIBLE_LIMITS.summary.listItem,
      ),
      stakes: clampText(summary.stakes, STORY_BIBLE_LIMITS.summary.stakes),
    };
  }

  function sanitizeStyleVoiceSection(styleVoice: Novel["storyBible"]["styleVoice"]): Novel["storyBible"]["styleVoice"] {
    return {
      pov: clampText(styleVoice.pov ?? "", STORY_BIBLE_LIMITS.styleVoice.pov),
      povCharacterId: clampText(styleVoice.povCharacterId ?? "", 120),
      tense: clampText(styleVoice.tense ?? "", STORY_BIBLE_LIMITS.styleVoice.tense),
      comps: clampTextList(
        styleVoice.comps ?? [],
        STORY_BIBLE_LIMITS.styleVoice.compCount,
        STORY_BIBLE_LIMITS.styleVoice.compItem,
      ),
      bannedWords: clampTextList(
        styleVoice.bannedWords ?? [],
        STORY_BIBLE_LIMITS.styleVoice.bannedCount,
        STORY_BIBLE_LIMITS.styleVoice.bannedWord,
      ),
      voiceRules: clampText(styleVoice.voiceRules ?? "", STORY_BIBLE_LIMITS.styleVoice.voiceRules),
    };
  }

  function sanitizeCharacterEntry(character: Novel["storyBible"]["characters"][number]): Novel["storyBible"]["characters"][number] {
    const normalizedRole =
      typeof character.role === "string" &&
      (CHARACTER_ROLE_OPTIONS as readonly string[]).includes(character.role)
        ? (character.role as CharacterRole)
        : "Supporting";
    const relationships = Array.isArray(character.relationships)
      ? character.relationships
          .slice(0, STORY_BIBLE_LIMITS.character.relationshipCount)
          .map((relationship) => ({
            targetCharacterId: clampText(relationship.targetCharacterId ?? "", 120),
            type: clampText(relationship.type ?? "", STORY_BIBLE_LIMITS.character.relationshipType),
            description: clampText(
              relationship.description ?? "",
              STORY_BIBLE_LIMITS.character.relationshipDescription,
            ),
          }))
      : [];
    return {
      ...character,
      name: clampText(character.name, STORY_BIBLE_LIMITS.character.name),
      role: normalizedRole,
      pronouns: clampText(character.pronouns ?? "", STORY_BIBLE_LIMITS.character.pronouns),
      groups: clampText(character.groups ?? "", STORY_BIBLE_LIMITS.character.groups),
      otherNames: clampText(character.otherNames ?? "", STORY_BIBLE_LIMITS.character.otherNames),
      logline: clampText(character.logline, STORY_BIBLE_LIMITS.character.logline),
      appearance: clampText(character.appearance ?? "", STORY_BIBLE_LIMITS.character.appearance),
      personality: clampText(character.personality ?? "", STORY_BIBLE_LIMITS.character.personality),
      goals: clampText(character.goals ?? "", STORY_BIBLE_LIMITS.character.goals),
      fears: clampText(character.fears ?? "", STORY_BIBLE_LIMITS.character.fears),
      backstory: clampText(character.backstory ?? "", STORY_BIBLE_LIMITS.character.backstory),
      secrets: clampText(character.secrets ?? "", STORY_BIBLE_LIMITS.character.secrets),
      readerSecretHint: clampText(character.readerSecretHint ?? "", STORY_BIBLE_LIMITS.character.readerSecretHint),
      accent: clampText(character.accent ?? "", STORY_BIBLE_LIMITS.character.accent),
      speakingStyle: clampText(character.speakingStyle ?? "", STORY_BIBLE_LIMITS.character.speakingStyle),
      reactionPattern: clampText(character.reactionPattern ?? "", STORY_BIBLE_LIMITS.character.reactionPattern),
      voiceNotes: clampText(character.voiceNotes ?? "", STORY_BIBLE_LIMITS.character.voiceNotes),
      tags: clampTextList(
        character.tags ?? [],
        STORY_BIBLE_LIMITS.character.tagCount,
        STORY_BIBLE_LIMITS.character.tag,
      ),
      relationships,
    };
  }

  function sanitizeLocationEntry(location: Novel["storyBible"]["locations"][number]): Novel["storyBible"]["locations"][number] {
    return {
      ...location,
      name: clampText(location.name, STORY_BIBLE_LIMITS.location.name),
      type: clampText(location.type ?? "", STORY_BIBLE_LIMITS.location.type),
      description: clampText(location.description, STORY_BIBLE_LIMITS.location.description),
      sensoryDetails: clampText(location.sensoryDetails ?? "", STORY_BIBLE_LIMITS.location.sensoryDetails),
      rules: clampText(location.rules ?? "", STORY_BIBLE_LIMITS.location.rules),
      significance: clampText(location.significance ?? "", STORY_BIBLE_LIMITS.location.significance),
      tags: clampTextList(location.tags ?? [], STORY_BIBLE_LIMITS.location.tagCount, STORY_BIBLE_LIMITS.location.tag),
    };
  }

  function sanitizeLoreEntry(entry: Novel["storyBible"]["lore"][number]): Novel["storyBible"]["lore"][number] {
    return {
      ...entry,
      title: clampText(entry.title, STORY_BIBLE_LIMITS.lore.title),
      content: clampText(entry.content, STORY_BIBLE_LIMITS.lore.content),
      constraints: clampTextList(
        entry.constraints ?? [],
        STORY_BIBLE_LIMITS.lore.constraintCount,
        STORY_BIBLE_LIMITS.lore.constraint,
      ),
    };
  }

  function sanitizeTimelineEntry(event: Novel["storyBible"]["timeline"][number]): Novel["storyBible"]["timeline"][number] {
    return {
      ...event,
      name: clampText(event.name, STORY_BIBLE_LIMITS.timeline.name),
      when: clampText(event.when, STORY_BIBLE_LIMITS.timeline.when),
      summary: clampText(event.summary, STORY_BIBLE_LIMITS.timeline.summary),
      chapterId: clampText(event.chapterId ?? "", 120),
    };
  }

  function sanitizePlanChapterEntry(planChapter: PlanChapter): PlanChapter {
    return {
      ...planChapter,
      title: clampText(planChapter.title, 120),
      synopsis: clampText(planChapter.synopsis, 1600),
      characterIds: clampTextList(planChapter.characterIds, 40, 120),
      locationIds: clampTextList(planChapter.locationIds, 40, 120),
      manuscriptChapterId: clampText(planChapter.manuscriptChapterId ?? "", 120),
    };
  }

  function extractApiErrorMessage(payload: unknown): string | null {
    if (!payload || typeof payload !== "object") return null;
    const record = payload as Record<string, unknown>;

    const pickMessage = (value: unknown) => {
      if (typeof value === "string" && value.trim()) return value.trim();
      if (value && typeof value === "object") {
        const message = (value as Record<string, unknown>).message;
        if (typeof message === "string" && message.trim()) return message.trim();
      }
      return null;
    };

    const parseJsonMessage = (value: string | null) => {
      if (!value) return null;
      const trimmed = value.trim();
      if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return trimmed;
      try {
        const parsed = JSON.parse(trimmed) as { error?: string; detail?: string; message?: string };
        return (
          (typeof parsed.error === "string" && parsed.error.trim()) ||
          (typeof parsed.detail === "string" && parsed.detail.trim()) ||
          (typeof parsed.message === "string" && parsed.message.trim()) ||
          trimmed
        );
      } catch {
        return trimmed;
      }
    };

    return parseJsonMessage(
      pickMessage(record.error) ??
      pickMessage(record.detail) ??
      pickMessage(record.message) ??
      (Array.isArray(record.detail) ? record.detail.map((item) => String(item)).join("; ").trim() : null),
    );
  }

  function normalizeCharacterRole(value: unknown): CharacterRole {
    if (typeof value !== "string") return "Supporting";
    const role = value.trim();
    if ((CHARACTER_ROLE_OPTIONS as readonly string[]).includes(role)) {
      return role as CharacterRole;
    }
    const normalized = role.toLowerCase();
    if (normalized.includes("protagonist") || normalized.includes("hero")) return "Protagonist";
    if (normalized.includes("antagonist") || normalized.includes("villain")) return "Antagonist";
    if (normalized.includes("love")) return "Love Interest";
    if (normalized.includes("minor")) return "Minor";
    if (normalized.includes("support")) return "Supporting";
    return "Supporting";
  }

  function hashText(value: string) {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function ensureFullCharacterName(rawName: string, fallbackSeed = 0) {
    const cleaned = rawName
      .trim()
      .replace(/\s+/g, " ")
      .replace(/["'`]/g, "")
      .replace(/^[^A-Za-z]+|[^A-Za-z-]+$/g, "");
    if (!cleaned) return "";
    const parts = cleaned.split(" ").filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]} ${parts.slice(1).join(" ")}`.slice(0, STORY_BIBLE_LIMITS.character.name);
    }
    const firstName = parts[0];
    const surnameIndex = (hashText(`${firstName}-${fallbackSeed}`) + fallbackSeed) % CHARACTER_SURNAME_FALLBACKS.length;
    return `${firstName} ${CHARACTER_SURNAME_FALLBACKS[surnameIndex]}`.slice(0, STORY_BIBLE_LIMITS.character.name);
  }

  function addSummaryGenre(genre: string) {
    if (!novel) return;
    const trimmed = genre.trim();
    if (!trimmed) return;
    const current = novel.storyBible.summary.genre ?? [];
    if (current.some((item) => item.toLowerCase() === trimmed.toLowerCase())) return;
    updateStoryBible({
      summary: {
        ...novel.storyBible.summary,
        genre: [...current, trimmed],
      },
    });
  }

  function removeSummaryGenre(genre: string) {
    if (!novel) return;
    updateStoryBible({
      summary: {
        ...novel.storyBible.summary,
        genre: (novel.storyBible.summary.genre ?? []).filter(
          (item) => item.toLowerCase() !== genre.toLowerCase(),
        ),
      },
    });
  }

  function extractSummaryNameHints() {
    if (!novel) return [] as string[];
    const source = [novel.storyBible.summary.synopsisShort, novel.storyBible.summary.stakes]
      .filter(Boolean)
      .join("\n");
    if (!source.trim()) return [] as string[];

    // ── Strategy: only pick capitalised words that appear MID-SENTENCE ──
    // Words at the start of a sentence are capitalised by grammar, not because
    // they're proper nouns. We split into sentences, then only consider words
    // that are NOT the first word of any sentence.

    // Place-name suffixes to filter out (Yorkshire, Wakefield, etc.)
    const PLACE_SUFFIXES = /(?:shire|field|burg|berg|holm|wick|wich|ford|land|dale|wood|pool|port|mouth|town|stead|bury|polis|grad|stan|minster|ville|vale|cester|chester)$/i;

    // Split text into sentences (on . ! ? followed by space+capital or end)
    const sentences = source.split(/(?<=[.!?])\s+/);

    // Collect capitalised words that appear in non-first position within sentences.
    // Also accept capitalised words after commas (", Sarah,") as those are names.
    const midSentenceCapitals = new Set<string>();

    for (const sentence of sentences) {
      // Find all capitalised words in this sentence with their position
      const wordMatches = [...sentence.matchAll(/\b([A-Z][a-z]{2,})\b/g)];
      for (let i = 0; i < wordMatches.length; i++) {
        const word = wordMatches[i][0];
        const matchIndex = wordMatches[i].index ?? 0;

        // Skip the very first capitalised word in the sentence (grammar capitalisation)
        if (i === 0 && matchIndex < 3) continue;

        // Accept: this word appears mid-sentence, so it's likely a proper noun
        midSentenceCapitals.add(word);
      }
    }

    // Also look for words after commas (", David,") which are almost always names
    const afterCommaPattern = /,\s+([A-Z][a-z]{2,})/g;
    for (const m of source.matchAll(afterCommaPattern)) {
      midSentenceCapitals.add(m[1]);
    }

    // Now filter the candidates
    const unique: string[] = [];
    const seen = new Set<string>();

    for (const candidate of midSentenceCapitals) {
      if (!candidate) continue;
      const lower = candidate.toLowerCase();
      // Check blocklist (case-insensitive)
      if (SUMMARY_NAME_BLOCKLIST.has(lower)) continue;
      if (isRoleLikeCharacterLabel(candidate)) continue;
      if (candidate.length > 20) continue;
      // Filter out place names based on suffix
      if (PLACE_SUFFIXES.test(candidate)) continue;
      // Filter out words that look like common English words (adjectives, adverbs, etc.)
      if (/(?:ly|ness|ment|tion|sion|ful|less|ous|ive|able|ible|ally|erly|ward|wise|ght|ism|ist|ity|ance|ence|dom|ship|ened|ated|ized|ised|eous|ious|ical|ing)$/i.test(lower) && lower.length > 5) continue;
      if (seen.has(lower)) continue;
      seen.add(lower);
      unique.push(candidate);
      if (unique.length >= 12) break;
    }
    return unique;
  }

  function clampPromptText(value: string, maxChars: number) {
    const clean = value.replace(/\s+/g, " ").trim();
    if (!clean) return "";
    if (clean.length <= maxChars) return clean;
    return `${clean.slice(0, Math.max(0, maxChars - 1)).trimEnd()}...`;
  }

  function normalizeBoltonCategory(value: unknown): BoltonCategory {
    const valid = new Set<string>(BOLTON_PLUGIN_CATEGORIES.map((category) => category.id));
    if (typeof value !== "string" || !valid.has(value)) return "custom";
    return value as BoltonCategory;
  }

  function getBoltonCategoryMeta(category?: string) {
    return BOLTON_PLUGIN_CATEGORIES.find((item) => item.id === category) ?? BOLTON_PLUGIN_CATEGORIES[BOLTON_PLUGIN_CATEGORIES.length - 1];
  }

  function getBoltonDirectiveText(bolton: Bolton) {
    const raw = bolton.prompt?.trim() || bolton.description?.trim() || "";
    return clampPromptText(raw, 500);
  }

  function readBoltonLibrary(): Array<Pick<Bolton, "title" | "description" | "prompt" | "category">> {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(BOLTON_LIBRARY_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const record = item as Record<string, unknown>;
          const title = typeof record.title === "string" ? record.title.trim().slice(0, 40) : "";
          const description = typeof record.description === "string" ? record.description.trim().slice(0, 500) : "";
          const prompt = typeof record.prompt === "string" ? record.prompt.trim().slice(0, 500) : "";
          if (!title && !description && !prompt) return null;
          return {
            title,
            description,
            prompt,
            category: normalizeBoltonCategory(record.category),
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
    } catch {
      return [];
    }
  }

  /** Strips thinking/reasoning blocks from model output (o1, o3, Claude thinking, etc.). Returns only book text. */
  function stripThinkingBlocks(text: string): string {
    if (!text || typeof text !== "string") return text;
    let out = text;
    out = out.replace(/<think>[\s\S]*?<\/think>/gi, "");
    out = out.replace(/<thought>[\s\S]*?<\/thought>/gi, "");
    out = out.replace(/\[thinking\][\s\S]*?\[\/thinking\]/gi, "");
    const unclosedIdx = out.search(/<think>/i);
    if (unclosedIdx !== -1) out = out.slice(0, unclosedIdx);
    return out.trim();
  }

  /** Cleans prose output — strips thinking blocks, meta-text, word counts, scene labels, separators, etc. */
  function cleanProseOutput(raw: string): string {
    let out = stripThinkingBlocks(raw);
    // Remove word count annotations like "*Word count: 1000*", "Word count: 1000", "(Word count: 1000)", "[Word count: 1000]"
    out = out.replace(/[\*\[\(]*\s*word\s*count\s*[:=]\s*\d+\s*[\*\]\)]*/gi, "");
    // Remove scene/chapter labels like "Scene 1", "Scene 2:", "## Scene 2", "**Scene 2**", "Chapter 3"
    out = out.replace(/^[\s]*(?:#{1,4}\s*)?(?:\*{1,2})?(?:Scene|Chapter|Part|Section|Bloc)\s*\d+[:\.\-—]?\s*(?:\*{1,2})?.*$/gim, "");
    // Remove horizontal rules: ---, ***, ___, ===, or more
    out = out.replace(/^\s*[-*_=]{3,}\s*$/gm, "");
    // Remove lines that are just "---" surrounded by blank lines
    out = out.replace(/\n\s*---\s*\n/g, "\n");
    // Remove "[Continued]", "[Continue]", "[End]", "[END OF SCENE]" etc.
    out = out.replace(/\[\s*(?:continued|continue|end|end of scene|end of chapter|to be continued)\s*\]/gi, "");
    // Remove "Note:", "Author's note:", "A/N:" lines
    out = out.replace(/^\s*(?:Note|Author'?s?\s*note|A\/N)\s*[:]\s*.*$/gim, "");
    // Remove trailing metadata like "(1000 words)", "[1023 words]"
    out = out.replace(/[\(\[]\s*\d+\s*words?\s*[\)\]]/gi, "");
    // Remove "WORD COUNT:" or "Total:" lines
    out = out.replace(/^\s*(?:WORD COUNT|Total|Count)\s*[:=]\s*\d+.*$/gim, "");
    // Collapse 3+ newlines into 2
    out = out.replace(/\n{3,}/g, "\n\n");
    return out.trim();
  }

  function buildBoundedSection<T>(
    title: string,
    items: T[],
    maxItems: number,
    formatter: (item: T, index: number) => string,
  ) {
    if (!items.length) return `${title}: none yet.`;
    const shown = items.slice(0, maxItems).map((item, index) => formatter(item, index)).filter(Boolean);
    const omitted = items.length - shown.length;
    return `${title}:\n${shown.join("\n")}${omitted > 0 ? `\n...and ${omitted} more not shown.` : ""}`;
  }

  function getEffectiveContextTokens(): number | null {
    const modelCtx = selectedOpenRouterModel?.contextLength ?? null;
    const userCtx = novel?.storyBible.aiContext?.maxContextTokens;
    if (modelCtx == null && userCtx == null) return null;
    const modelVal = modelCtx ?? Number.POSITIVE_INFINITY;
    const userVal = typeof userCtx === "number" && Number.isFinite(userCtx) ? userCtx : Number.POSITIVE_INFINITY;
    return Math.min(modelVal, userVal);
  }

  function getContextModeForTask(task: StoryBibleContextTask): StoryBibleContextMode {
    const effectiveTokens = getEffectiveContextTokens();
    if (effectiveTokens == null) return "plan";
    if (effectiveTokens <= MICRO_CONTEXT_THRESHOLD) return "micro";
    if (effectiveTokens <= SMALL_CONTEXT_THRESHOLD) {
      const compactTasks = ["characters", "summary", "events", "lore", "locations"];
      return compactTasks.includes(task) ? "characterCompact" : "planCompact";
    }
    if (effectiveTokens <= 64000) return "plan";
    if (effectiveTokens <= 128000) return "plan";
    return "default";
  }

  function buildStoryBibleContext(modeOrTask?: StoryBibleContextMode | StoryBibleContextTask, opts?: { excludeLocations?: boolean }) {
    if (!novel) return "";
    const mode: StoryBibleContextMode =
      modeOrTask === "micro" ||
      modeOrTask === "characterCompact" ||
      modeOrTask === "planCompact" ||
      modeOrTask === "plan" ||
      modeOrTask === "default"
        ? (modeOrTask as StoryBibleContextMode)
        : getContextModeForTask((modeOrTask as StoryBibleContextTask) ?? "default");

    const summary = novel.storyBible.summary;
    const styleVoice = novel.storyBible.styleVoice;
    const timeline = novel.storyBible.timeline ?? [];
    const chapters = novel.chapters ?? [];
    const characters = novel.storyBible.characters ?? [];
    const locations = novel.storyBible.locations ?? [];
    const lore = novel.storyBible.lore ?? [];
    const povCharacterName =
      styleVoice.povCharacterId &&
      characters.find((c) => c.id === styleVoice.povCharacterId)?.name;

    const limits =
      mode === "micro"
        ? {
            totalChars: 2400,
            synopsisChars: 320,
            stakesChars: 120,
            voiceChars: 100,
            eventCount: 3,
            eventChars: 60,
            characterCount: 4,
            characterChars: 65,
            locationCount: 3,
            locationChars: 55,
            loreCount: 2,
            loreChars: 70,
          }
        : mode === "characterCompact"
        ? {
            totalChars: 3600,
            synopsisChars: 420,
            stakesChars: 180,
            voiceChars: 180,
            eventCount: 4,
            eventChars: 90,
            characterCount: 6,
            characterChars: 90,
            locationCount: 5,
            locationChars: 80,
            loreCount: 4,
            loreChars: 90,
          }
        : mode === "planCompact"
        ? {
            totalChars: 5600,
            synopsisChars: 680,
            stakesChars: 260,
            voiceChars: 300,
            eventCount: 8,
            eventChars: 110,
            characterCount: 8,
            characterChars: 120,
            locationCount: 8,
            locationChars: 110,
            loreCount: 6,
            loreChars: 120,
          }
        : mode === "plan"
          ? {
              totalChars: 12000,
              synopsisChars: 1400,
              stakesChars: 480,
              voiceChars: 700,
              eventCount: 14,
              eventChars: 180,
              characterCount: 14,
              characterChars: 210,
              locationCount: 14,
              locationChars: 170,
              loreCount: 12,
              loreChars: 210,
            }
          : {
              totalChars: 22000,
              synopsisChars: 2200,
              stakesChars: 900,
              voiceChars: 1400,
              eventCount: 22,
              eventChars: 230,
              characterCount: 18,
              characterChars: 270,
              locationCount: 18,
              locationChars: 220,
              loreCount: 16,
              loreChars: 250,
            };

    const modelContext = selectedOpenRouterModel?.contextLength ?? null;
    const modelCharBudget = modelContext ? Math.max(3600, Math.floor(modelContext * 3.4)) : null;
    const aiContextTokenBudget = novel.storyBible.aiContext?.maxContextTokens;
    const configuredCharBudget =
      typeof aiContextTokenBudget === "number" && Number.isFinite(aiContextTokenBudget)
        ? Math.max(3600, Math.floor(aiContextTokenBudget * 4))
        : null;
    const totalBudget = Math.min(
      limits.totalChars,
      modelCharBudget ?? Number.POSITIVE_INFINITY,
      configuredCharBudget ?? Number.POSITIVE_INFINITY,
    );

    const eventsSection = buildBoundedSection(
      "Current key events",
      timeline,
      limits.eventCount,
      (event, index) => {
        const chapterLabel =
          chapters.find((chapter) => chapter.id === event.chapterId)?.title || event.when || "Any chapter";
        return `${index + 1}. ${clampPromptText(event.name || "Untitled event", 60)} (${clampPromptText(chapterLabel, 40)}) - ${clampPromptText(event.summary || "", limits.eventChars)}`;
      },
    );

    const charactersSection = buildBoundedSection(
      "Characters",
      characters,
      limits.characterCount,
      (character, index) => {
        const relationshipSummary = (character.relationships ?? [])
          .slice(0, 4)
          .map((relationship) => {
            const targetName =
              characters.find((candidate) => candidate.id === relationship.targetCharacterId)?.name ??
              relationship.targetCharacterId;
            if (!targetName) return "";
            if (relationship.type?.trim()) return `${relationship.type.trim()} -> ${targetName}`;
            return `linked -> ${targetName}`;
          })
          .filter(Boolean)
          .join(", ");
        const traits = [
          character.role ? `role ${character.role}` : "",
          character.logline ? `hook ${character.logline}` : "",
          character.accent ? `accent ${character.accent}` : "",
          character.speakingStyle ? `speech ${character.speakingStyle}` : "",
          character.reactionPattern ? `react ${character.reactionPattern}` : "",
          character.readerSecretHint ? `hint ${character.readerSecretHint}` : "",
          character.secrets ? `author-only secret ${character.secrets}` : "",
          relationshipSummary ? `relationships ${relationshipSummary}` : "",
        ]
          .filter(Boolean)
          .join(" | ");
        return `${index + 1}. ${clampPromptText(character.name || "Unnamed", 54)} - ${clampPromptText(traits, limits.characterChars)}`;
      },
    );

    const locationsSection = buildBoundedSection(
      "Locations",
      locations,
      limits.locationCount,
      (location, index) =>
        `${index + 1}. ${clampPromptText(location.name || "Unnamed", 56)} - ${clampPromptText(location.description || "No description yet.", limits.locationChars)}`,
    );

    const loreSection = buildBoundedSection(
      "Worldbuilding lore",
      lore,
      limits.loreCount,
      (entry, index) => {
        const constraints = (entry.constraints ?? []).filter(Boolean).slice(0, 3).join(", ");
        const detail = `${entry.content}${constraints ? ` | Constraints: ${constraints}` : ""}`;
        return `${index + 1}. ${clampPromptText(entry.title || "Untitled", 52)} [${entry.category}] - ${clampPromptText(detail, limits.loreChars)}`;
      },
    );

    const sections = [
      `Novel title: ${novel.title || "Untitled Novel"}`,
      summary.synopsisShort ? `Synopsis: ${clampPromptText(summary.synopsisShort, limits.synopsisChars)}` : "",
      summary.genre.length ? `Genre: ${summary.genre.slice(0, 10).join(", ")}` : "",
      summary.tone.length ? `Tone: ${summary.tone.slice(0, 10).join(", ")}` : "",
      summary.themes.length ? `Themes: ${summary.themes.slice(0, 12).join(", ")}` : "",
      summary.stakes ? `Conflict/Stakes: ${clampPromptText(summary.stakes, limits.stakesChars)}` : "",
      styleVoice.pov ? `POV: ${styleVoice.pov}` : "",
      styleVoice.tense ? `Tense: ${styleVoice.tense}` : "",
      povCharacterName ? `Narrating character: ${povCharacterName}` : "",
      styleVoice.voiceRules ? `Writing style rules: ${clampPromptText(styleVoice.voiceRules, limits.voiceChars)}` : "",
      eventsSection,
      `${charactersSection}\nImportant: author-only secrets are private and must not be exposed in reader-facing prose unless explicitly asked.`,
      opts?.excludeLocations ? "" : locationsSection,
      loreSection,
    ]
      .filter(Boolean)
      .join("\n");

    if (sections.length <= totalBudget) return sections;
    return `${sections.slice(0, Math.max(0, totalBudget - 64)).trimEnd()}\n...\n[Context condensed due model limits.]`;
  }

  function isLikelyContextOverflowError(message: string) {
    const normalized = message.toLowerCase();
    return (
      normalized.includes("context") ||
      normalized.includes("token") ||
      normalized.includes("prompt") ||
      normalized.includes("too long") ||
      normalized.includes("too large") ||
      normalized.includes("max length") ||
      normalized.includes("maximum length") ||
      normalized.includes("exceed")
    );
  }

  function isRetryableCharacterGenerationError(message: string) {
    const normalized = message.toLowerCase();
    return (
      normalized.includes("timed out") ||
      normalized.includes("valid json") ||
      normalized.includes("bad request") ||
      normalized.includes("rejected this request") ||
      isLikelyContextOverflowError(message)
    );
  }

  function buildPlanGenerationPrompt(
    context: string,
    planTarget: PlanAiChapterTarget,
    timelineNameList: string,
    isCompact: boolean,
  ) {
    return [
      "You are outlining a novel using the Canon context.",
      "Return a complete chapter plan with ordered chapters plus synchronized Canon entities.",
      "Keep continuity: no duplicate chapter purpose, maintain cause and effect, and respect characters, locations, style, and timeline canon.",
      isCompact
        ? "The context is condensed for model limits. Prioritize canon consistency over adding extra detail."
        : "",
      "Return JSON only in this shape:",
      `{
  "characters": [{
    "name": "string",
    "role": "Protagonist|Antagonist|Supporting|Minor|Love Interest|Type|Custom",
    "logline": "string"
  }],
  "locations": [{
    "name": "string",
    "type": "string",
    "description": "string"
  }],
  "lore": [{
    "title": "string",
    "category": "Magic|Tech|Culture|History|Religion|Politics|Other",
    "content": "string",
    "constraints": ["string"]
  }],
  "events": [{
    "name": "string",
    "when": "string",
    "summary": "string",
    "chapterTitle": "string"
  }],
  "chapters": [{
    "title": "string",
    "synopsis": "2-5 sentence chapter synopsis",
    "characters": ["character names used in chapter"],
    "locations": ["location names used in chapter"],
    "events": ["timeline event names used in chapter"]
  }]
}`,
      "Rules:",
      `- Return exactly ${planTarget} chapters.`,
      "- Titles must be unique and non-repeating.",
      "- Each chapter synopsis must be specific and non-repetitive.",
      "- Reuse existing Canon entities when available; only add new ones when missing.",
      "- Timeline events must match the chapter flow and be non-duplicative.",
      "- Respect any existing timeline events and keep ordering coherent.",
      "- Do NOT invent new facts that contradict the Canon.",
      timelineNameList
        ? `Allowed timeline event names: ${timelineNameList}`
        : "No timeline events exist yet. Create useful events that match chapter progression.",
      `Story context:\n${context}`,
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  /* ─── Two-phase plan generation helpers ─── */

  function buildPhase1OutlineContext(): string {
    if (!novel) return "";
    const sb = novel.storyBible;
    const summary = sb.summary;
    const styleVoice = sb.styleVoice;
    const characters = sb.characters ?? [];
    const locations = sb.locations ?? [];
    const lore = sb.lore ?? [];
    const timeline = sb.timeline ?? [];
    const povName = styleVoice.povCharacterId
      ? characters.find((c) => c.id === styleVoice.povCharacterId)?.name
      : undefined;
    // Compact character list: Name (Role) — logline
    const charList = characters.slice(0, 10)
      .map((c) => `${c.name || "?"} (${c.role || "Supporting"})${c.logline ? `: ${clampPromptText(c.logline, 40)}` : ""}`)
      .join("; ");
    const locList = locations.slice(0, 8)
      .map((l) => `${l.name || "?"}${l.type ? ` [${l.type}]` : ""}`)
      .join(", ");
    // Lore: title + constraints only (content is verbose)
    const loreList = lore.slice(0, 8)
      .map((e) => `${e.title}${e.constraints?.length ? `: ${e.constraints.slice(0, 2).join("; ")}` : ""}`)
      .join("; ");
    const eventList = timeline.slice(0, 8)
      .map((e) => `${e.name}${e.when ? ` (${e.when})` : ""}`)
      .join("; ");
    const contextParts = [
      `Title: ${novel.title || "Untitled"}`,
      summary.synopsisShort ? `Synopsis: ${clampPromptText(summary.synopsisShort, 500)}` : "",
      summary.genre.length ? `Genre: ${summary.genre.join(", ")}` : "",
      summary.stakes ? `Stakes: ${clampPromptText(summary.stakes, 150)}` : "",
      styleVoice.pov ? `POV: ${styleVoice.pov}${povName ? ` (${povName})` : ""}` : "",
      charList ? `Characters: ${charList}` : "",
      locList ? `Locations: ${locList}` : "",
      loreList ? `Lore: ${loreList}` : "",
      eventList ? `Events: ${eventList}` : "",
    ].filter(Boolean).join("\n");

    // Cap at 5000 chars — titles don't need huge context
    if (contextParts.length > 5000) {
      return `${contextParts.slice(0, 4900).trimEnd()}\n[condensed]`;
    }
    return contextParts;
  }

  function buildPhase1TitlesPrompt(count: number): string {
    const context = buildPhase1OutlineContext();
    const pacingMode = novel?.storyBible.bookPlan?.pacingMode ?? "balanced";
    const pacingHint =
      pacingMode === "slow-burn"
        ? "Pacing is slow-burn: early titles should signal gradual escalation, character depth, and atmosphere."
        : pacingMode === "fast"
          ? "Pacing is fast: titles should signal momentum and high story progression."
          : "Pacing is balanced: titles should imply measured progression with steady escalation.";
    return [
      `Create ${count} chapter titles for this novel. Return JSON: { "titles": ["Title 1", "Title 2", ...] }`,
      `Exactly ${count} unique titles reflecting the story arc. Use Canon names.`,
      pacingHint,
      `\nCanon:\n${context}`,
    ].join("\n");
  }

  function buildPhase1Prompt(planTarget: PlanAiChapterTarget): string {
    const context = buildPhase1OutlineContext();
    const pacingMode = novel?.storyBible.bookPlan?.pacingMode ?? "balanced";
    const pacingRule =
      pacingMode === "slow-burn"
        ? "- Pacing: slow-burn. Let early chapters build character, atmosphere, and stakes gradually before major escalations."
        : pacingMode === "fast"
          ? "- Pacing: fast. Start with a strong hook and keep momentum high while preserving clarity."
          : "- Pacing: balanced. Begin with grounded setup and tension-building before larger turns.";
    return [
      "Using the Canon below, create a chapter-by-chapter INTERNAL drafting outline for this novel.",
      "This outline is used by AI to generate blocs/prose, so be explicit about what happens in each chapter.",
      "Return JSON only in this exact shape:",
      `{ "chapters": [{ "title": "string", "summary": "3-5 sentence concrete chapter plan" }] }`,
      "",
      "Rules:",
      `- Return exactly ${planTarget} chapters.`,
      "- Each chapter must advance the plot. No filler.",
      "- Titles must be unique.",
      "- Summaries must mention character names, locations, and key events by name so they can be cross-referenced.",
      "- Do NOT write teaser blurbs. State concrete story actions and outcomes clearly.",
      "- LOCATION RULE: Each chapter should use only ONE primary location unless absolutely necessary for the plot. Keeping chapters grounded in a single place prevents the story feeling scattered.",
      pacingRule,
      "- Early chapters must not rush to major payoffs. Build progression naturally like a published novel.",
      "- Weave in worldbuilding/lore naturally — if the Canon has magic systems, cultures, technology, etc., integrate them into the chapter flow.",
      "- Maintain cause-and-effect between chapters.",
      "- Respect all Canon — do not contradict characters, locations, lore, worldbuilding constraints, or timeline.",
      "",
      `Canon:\n${context}`,
    ].join("\n");
  }

  function buildPhase2ChapterContext(
    chapterTitle: string,
    chapterSummary: string,
    chapterIndex: number,
    allChapterTitles: string[],
    prevSummary: string,
    nextTitle: string,
  ): string {
    if (!novel) return "";
    const sb = novel.storyBible;
    const summary = sb.summary;
    const characters = sb.characters ?? [];
    const locations = sb.locations ?? [];
    const lore = sb.lore ?? [];
    const searchText = `${chapterTitle} ${chapterSummary}`.toLowerCase();

    // Compact story header — genre/tone/stakes on one line each
    const storyLines = [
      summary.synopsisShort ? `Story: ${clampPromptText(summary.synopsisShort, 250)}` : "",
      summary.genre?.length ? `Genre: ${summary.genre.slice(0, 4).join(", ")}` : "",
      summary.stakes ? `Stakes: ${clampPromptText(summary.stakes, 120)}` : "",
    ].filter(Boolean).join("\n");

    // Relevant characters — compact format, one line each
    const relevantChars = characters.filter((c) => {
      if (c.role === "Protagonist" || c.role === "Antagonist") return true;
      const name = (c.name || "").toLowerCase();
      return name.length > 1 && searchText.includes(name);
    });
    const charSection = relevantChars.length > 0 ? relevantChars : characters.slice(0, 3);
    const charLines = charSection.map((c) => {
      const parts = [`${c.name} (${c.role || "Supporting"})`];
      if (c.logline) parts.push(clampPromptText(c.logline, 50));
      if (c.goals) parts.push(`goals: ${clampPromptText(c.goals, 40)}`);
      if (c.secrets) parts.push(`secret: ${clampPromptText(c.secrets, 40)}`);
      return `  ${parts.join(" — ")}`;
    }).join("\n");

    // Locations — one line each
    const relevantLocs = locations.filter((l) => {
      const name = (l.name || "").toLowerCase();
      return name.length > 1 && searchText.includes(name);
    });
    const locLines = (relevantLocs.length > 0 ? relevantLocs : locations.slice(0, 2))
      .map((l) => `  ${l.name}${l.type ? ` [${l.type}]` : ""}`)
      .join(", ");

    // Lore — title + constraints only (content is too verbose for per-chapter context)
    const loreLines = lore.slice(0, 6).map((e) =>
      `  ${e.title}${e.constraints?.length ? `: ${e.constraints.slice(0, 2).join("; ")}` : ""}`
    ).join("\n");

    // Compact chapter outline — just numbers and titles, no details
    const outlineSlice = allChapterTitles.length <= 12
      ? allChapterTitles.map((t, i) => `${i + 1}. ${t}`).join(", ")
      : [
          ...allChapterTitles.slice(0, chapterIndex).map((t, i) => `${i + 1}. ${t}`),
          `→ ${chapterIndex + 1}. ${chapterTitle}`,
          ...allChapterTitles.slice(chapterIndex + 1, chapterIndex + 3).map((t, i) => `${chapterIndex + 2 + i}. ${t}`),
          allChapterTitles.length > chapterIndex + 3 ? `...(${allChapterTitles.length} total)` : "",
        ].filter(Boolean).join(", ");

    // All available names (one line for cross-referencing)
    const allNames = [
      ...characters.map((c) => c.name),
      ...locations.map((l) => l.name),
    ].filter(Boolean);

    const contextParts = [
      storyLines,
      `Outline: ${outlineSlice}`,
      `Chapter ${chapterIndex + 1}: ${chapterTitle}`,
      chapterSummary ? `Brief: ${chapterSummary}` : "",
      prevSummary ? `Previous chapter: ${clampPromptText(prevSummary, 150)}` : "",
      nextTitle ? `Next: ${nextTitle}` : "This is the final chapter.",
      charLines ? `Characters:\n${charLines}` : "",
      locLines ? `Locations: ${locLines}` : "",
      loreLines ? `Lore:\n${loreLines}` : "",
      allNames.length > 0 ? `Names: ${allNames.join(", ")}` : "",
    ].filter(Boolean).join("\n");

    // Safety budget: cap at 4000 chars for speed with slow models
    if (contextParts.length > 4000) {
      return `${contextParts.slice(0, 3900).trimEnd()}\n[condensed]`;
    }
    return contextParts;
  }

  /**
   * Build Canon context for bloc synopsis generation.
   * Focused: characters, locations, lore constraints. Skips full plan list for speed.
   */
  function buildChapterBlocksContext(chapterTitle: string, chapterSynopsis: string, planCharIds?: string[], planLocIds?: string[]): string {
    if (!novel) return "";
    const sb = novel.storyBible;
    const summary = sb.summary;
    const characters = sb.characters ?? [];
    const locations = sb.locations ?? [];
    const lore = sb.lore ?? [];
    const searchText = `${chapterTitle} ${chapterSynopsis}`.toLowerCase();

    const planLinkedChars = (planCharIds ?? []).length > 0
      ? characters.filter((c) => planCharIds!.includes(c.id))
      : [];
    const textMatchedChars = characters.filter((c) => {
      if (c.role === "Protagonist" || c.role === "Antagonist") return true;
      const name = (c.name || "").toLowerCase();
      return name.length > 1 && searchText.includes(name);
    });
    const relevantChars = planLinkedChars.length > 0
      ? [...new Map([...planLinkedChars, ...textMatchedChars].map((c) => [c.id, c])).values()]
      : textMatchedChars;
    const charList = (relevantChars.length > 0 ? relevantChars : characters.slice(0, 4))
      .map((c) => {
        const alias = c.otherNames?.trim() ? ` | aliases: ${clampPromptText(c.otherNames, 40)}` : "";
        return `${c.name} (${c.role || "Supporting"})${c.logline ? `: ${clampPromptText(c.logline, 40)}` : ""}${alias}`;
      })
      .join("\n  ");

    const planLinkedLocs = (planLocIds ?? []).length > 0
      ? locations.filter((l) => planLocIds!.includes(l.id))
      : [];
    const textMatchedLocs = locations.filter((l) => {
      const name = (l.name || "").toLowerCase();
      return name.length > 1 && searchText.includes(name);
    });
    const relevantLocs = planLinkedLocs.length > 0
      ? [...new Map([...planLinkedLocs, ...textMatchedLocs].map((l) => [l.id, l])).values()]
      : textMatchedLocs;
    const locList = (relevantLocs.length > 0 ? relevantLocs : locations.slice(0, 3))
      .map((l) => `${l.name}${l.type ? ` [${l.type}]` : ""}`)
      .join(", ");

    const relevantLore = lore.filter((e) => {
      const title = (e.title || "").toLowerCase();
      return title.length > 1 && searchText.includes(title) && (e.constraints ?? []).length > 0;
    });
    const loreSection = relevantLore.slice(0, 3)
      .map((e) => `${e.title}: ${e.constraints!.slice(0, 2).join("; ")}`)
      .join("\n  ");

    const parts = [
      `Novel: ${novel.title || "Untitled"}`,
      summary.synopsisShort ? `Story: ${clampPromptText(summary.synopsisShort, 200)}` : "",
      summary.genre?.length ? `Genre: ${summary.genre.slice(0, 5).join(", ")}` : "",
      summary.tone?.length ? `Tone: ${summary.tone.slice(0, 5).join(", ")}` : "",
      charList ? `Characters:\n  ${charList}` : "",
      locList ? `Locations: ${locList}` : "",
      loreSection ? `Lore rules:\n  ${loreSection}` : "",
    ].filter(Boolean).join("\n");

    return parts.length > 2500 ? `${parts.slice(0, 2400).trimEnd()}\n[condensed]` : parts;
  }

  /**
   * Build Canon context for prose generation.
   * Includes style/voice + relevant characters/locations/lore. No plan list, no redundancy.
   */
  function buildProseContext(blockSynopsis: string, planChapterSynopsis: string, planCharIds: string[], planLocIds: string[]): string {
    if (!novel) return "";
    const sb = novel.storyBible;
    const summary = sb.summary;
    const styleVoice = sb.styleVoice;
    const characters = sb.characters ?? [];
    const locations = sb.locations ?? [];
    const lore = sb.lore ?? [];
    const searchText = `${blockSynopsis} ${planChapterSynopsis}`.toLowerCase();

    const relevantChars = planCharIds.length > 0
      ? characters.filter((c) => planCharIds.includes(c.id))
      : characters.filter((c) => {
          if (c.role === "Protagonist" || c.role === "Antagonist") return true;
          const name = (c.name || "").toLowerCase();
          return name.length > 1 && searchText.includes(name);
        });
    const charList = (relevantChars.length > 0 ? relevantChars : characters.slice(0, 3))
      .slice(0, 5)
      .map((c) => {
        const alias = c.otherNames?.trim() ? ` | aliases: ${clampPromptText(c.otherNames, 40)}` : "";
        return `${c.name} (${c.role || "Supporting"})${c.logline ? `: ${clampPromptText(c.logline, 40)}` : ""}${alias}`;
      })
      .join("\n  ");

    const relevantLocs = planLocIds.length > 0
      ? locations.filter((l) => planLocIds.includes(l.id))
      : locations.filter((l) => {
          const name = (l.name || "").toLowerCase();
          return name.length > 1 && searchText.includes(name);
        });
    const locList = (relevantLocs.length > 0 ? relevantLocs : locations.slice(0, 2))
      .slice(0, 3)
      .map((l) => `${l.name}: ${clampPromptText(l.description || "", 50)}`)
      .join("\n  ");

    const relevantLore = lore.filter((e) => {
      const title = (e.title || "").toLowerCase();
      return title.length > 1 && searchText.includes(title) && (e.constraints ?? []).length > 0;
    });
    const loreRules = relevantLore.slice(0, 2)
      .map((e) => `${e.title}: ${e.constraints!.slice(0, 2).join("; ")}`)
      .join("\n  ");

    const povCharName = styleVoice.povCharacterId
      ? characters.find((c) => c.id === styleVoice.povCharacterId)?.name
      : undefined;
    const povLine = styleVoice.pov && povCharName
      ? `POV: ${styleVoice.pov} — narrate from ${povCharName}'s perspective`
      : styleVoice.pov
        ? `POV: ${styleVoice.pov}`
        : povCharName
          ? `Narrating character: ${povCharName}`
          : "";

    const parts = [
      `Language: ${profileLangLabel} (spelling, grammar, punctuation)`,
      summary.synopsisShort ? `Story: ${clampPromptText(summary.synopsisShort, 150)}` : "",
      summary.genre?.length ? `Genre: ${summary.genre.slice(0, 4).join(", ")}` : "",
      povLine,
      styleVoice.tense ? `Tense: ${styleVoice.tense}` : "",
      styleVoice.comps?.length ? `Style: ${styleVoice.comps.slice(0, 3).join(", ")}` : "",
      styleVoice.voiceRules ? `Voice: ${clampPromptText(styleVoice.voiceRules, 300)}` : "",
      styleVoice.bannedWords?.length ? `Never use: ${styleVoice.bannedWords.slice(0, 10).join(", ")}` : "",
      charList ? `Characters:\n  ${charList}` : "",
      locList ? `Locations:\n  ${locList}` : "",
      loreRules ? `Rules:\n  ${loreRules}` : "",
    ].filter(Boolean).join("\n");

    return parts.length > 1800 ? `${parts.slice(0, 1700).trimEnd()}\n[condensed]` : parts;
  }

  function inferCanonIdsFromText(text: string) {
    if (!novel) return { characterIds: [] as string[], locationIds: [] as string[], loreIds: [] as string[] };
    const haystack = text.toLowerCase();
    const characterIds = (novel.storyBible.characters ?? [])
      .filter((character) => {
        const name = character.name.trim().toLowerCase();
        return name.length > 1 && haystack.includes(name);
      })
      .map((character) => character.id);
    const locationIds = (novel.storyBible.locations ?? [])
      .filter((location) => {
        const name = location.name.trim().toLowerCase();
        return name.length > 1 && haystack.includes(name);
      })
      .map((location) => location.id);
    const loreIds = (novel.storyBible.lore ?? [])
      .filter((entry) => {
        const title = entry.title.trim().toLowerCase();
        return title.length > 1 && haystack.includes(title);
      })
      .map((entry) => entry.id);
    return { characterIds, locationIds, loreIds };
  }

  function getAdjacentChapterSynopses(chapterId: string) {
    if (!novel) return { previousChapterSynopsis: "", nextChapterSynopsis: "" };
    const chapterIndex = novel.chapters.findIndex((chapter) => chapter.id === chapterId);
    if (chapterIndex < 0) return { previousChapterSynopsis: "", nextChapterSynopsis: "" };
    const previousChapter = chapterIndex > 0 ? novel.chapters[chapterIndex - 1] : null;
    const nextChapter = chapterIndex + 1 < novel.chapters.length ? novel.chapters[chapterIndex + 1] : null;
    const previousPlan = previousChapter
      ? planChapters.find((chapter) => chapter.manuscriptChapterId === previousChapter.id)
      : null;
    const nextPlan = nextChapter
      ? planChapters.find((chapter) => chapter.manuscriptChapterId === nextChapter.id)
      : null;
    return {
      previousChapterSynopsis: previousPlan?.synopsis?.trim() || previousChapter?.subtitle?.trim() || "",
      nextChapterSynopsis: nextPlan?.synopsis?.trim() || nextChapter?.subtitle?.trim() || "",
    };
  }

  function getChapterStoryPosition(chapterId: string) {
    if (!novel) return { chapterIndex: -1, chapterNumber: 0, totalChapters: 0, arcGuidance: "" };
    const chapterIndex = novel.chapters.findIndex((chapter) => chapter.id === chapterId);
    const totalChapters = novel.chapters.length;
    if (chapterIndex < 0 || totalChapters <= 0) {
      return { chapterIndex: -1, chapterNumber: 0, totalChapters, arcGuidance: "" };
    }
    return {
      chapterIndex,
      chapterNumber: chapterIndex + 1,
      totalChapters,
      arcGuidance: buildChapterArcGuidance(chapterIndex, totalChapters),
    };
  }


  function buildChapterArcGuidance(chapterIndex: number, totalChapters: number) {
    const pacingMode = novel?.storyBible.bookPlan?.pacingMode ?? "balanced";
    const chapterNumber = chapterIndex + 1;
    const openingCut = Math.max(2, Math.ceil(totalChapters * 0.25));
    const endingCut = Math.max(openingCut + 1, totalChapters - Math.max(2, Math.ceil(totalChapters * 0.2)));
    if (chapterNumber <= openingCut) {
      return pacingMode === "fast"
        ? "- Arc stage: opening. Hook quickly, but do NOT spend major endgame reveals yet."
        : "- Arc stage: opening. Establish character, stakes, and world with controlled escalation. Do NOT jump to endgame beats.";
    }
    if (chapterNumber >= endingCut) {
      return "- Arc stage: closing movement. Escalate toward resolution while paying off earlier setups.";
    }
    return "- Arc stage: middle movement. Build complications, deepen consequences, and set up later payoffs.";
  }

  function buildPhase2Prompt(chapterContext: string, chapterIndex: number, totalChapters: number): string {
    const pacingMode = novel?.storyBible.bookPlan?.pacingMode ?? "balanced";
    const pacingRule =
      pacingMode === "slow-burn"
        ? "- Pace this chapter as slow-burn: deepen character motives and setting texture before major reveals."
        : pacingMode === "fast"
          ? "- Pace this chapter tightly: immediate tension, crisp progression, minimal drag."
          : "- Pace this chapter with balanced progression: setup, development, and movement.";
    const arcGuidance = buildChapterArcGuidance(chapterIndex, totalChapters);
    return [
      "Expand this chapter into an INTERNAL WRITER PLAN used to generate scene blocs and prose. Use Canon names exactly.",
      "This is NOT reader-facing copy. Do not write teaser blurbs or marketing language.",
      `Return JSON: { "synopsis": "5-9 sentences with concrete events", "characters": ["names"], "locations": ["names"], "events": ["key moments"], "lore": ["relevant lore titles"] }`,
      "Synopsis must clearly state what happens, in order, so another AI can split it into blocs.",
      "Include concrete beats: setup, goal, conflict/escalation, turning point, and chapter outcome.",
      "The synopsis is an internal production note for AI, not reader copy.",
      "Use explicit nouns and actions, not vague language.",
      "Use one primary location for this chapter unless transition is absolutely story-critical.",
      "- Maintain continuity with previous and next chapters.",
      pacingRule,
      arcGuidance,
      "- Respect all worldbuilding constraints — if a lore entry has rules (e.g. \"magic costs life force\"), the synopsis must not violate them.",
      "- Do NOT contradict the Canon. Author-only secrets must not appear in reader-facing content.",
      "- Characters must be real human names (First Last). Never output role labels, abstract words, or placeholders as characters.",
      "- Prefer existing Canon characters/locations. Only add a new character if a clear real person name is present.",
      "- Arrays must align with synopsis details: characters/locations/events listed must actually appear in the synopsis.",
      "",
      chapterContext,
    ].join("\n");
  }

  function evaluateOperationalPlanResult(
    result: { synopsis?: string; characters?: string[]; locations?: string[]; events?: string[] } | null,
  ) {
    const synopsis = typeof result?.synopsis === "string" ? result.synopsis.trim() : "";
    const characters = parseStringList(result?.characters);
    const locations = parseStringList(result?.locations);
    const events = parseStringList(result?.events);
    const sentenceCount = synopsis ? synopsis.split(/(?<=[.!?])\s+/).filter(Boolean).length : 0;
    const hasOutcomeCue = /\b(therefore|as a result|by the end|ultimately|forcing|which leads to|sets up)\b/i.test(synopsis);
    const ok =
      synopsis.length >= 150 &&
      sentenceCount >= 4 &&
      events.length >= 1 &&
      (characters.length >= 1 || locations.length >= 1) &&
      hasOutcomeCue;
    return { ok, synopsis, characters, locations, events, sentenceCount };
  }

  function evaluateBlocSynopsisResult(
    synopsis: string,
    _index: number,
    _isLast: boolean,
  ) {
    const text = synopsis.trim();
    const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const sentenceCount = text ? text.split(/(?<=[.!?])\s+/).filter(Boolean).length : 0;
    // Relaxed gate: only reject truly garbage results. Let creative variety through.
    const ok =
      wordCount >= 10 &&
      sentenceCount >= 1 &&
      sentenceCount <= 6;
    return { ok, text, sentenceCount, wordCount };
  }

  async function repairBlocSynopsisResult(args: {
    chapterSynopsis: string;
    previousChapterSynopsis: string;
    nextChapterSynopsis: string;
    previousSynopses: string;
    currentSynopsis: string;
    blocNumber: number;
    totalBlocs: number;
    isLast: boolean;
    systemMsg: string;
  }) {
    const repairPrompt = [
      "Your bloc synopsis is too weak or vague for reliable prose generation.",
      "Rewrite it with concrete events and clear continuity.",
      `Return JSON only: { "synopsis": "1-3 sentences with explicit actions" }`,
      "Requirements:",
      "- explicit actions and conflict, no vague phrasing",
      "- keep continuity with previous and next chapter context",
      "- do not force a location change just because this is a new bloc",
      args.isLast ? "- this is the final bloc: include chapter outcome/setup cue" : "",
      "",
      `Bloc ${args.blocNumber} of ${args.totalBlocs}`,
      `Chapter synopsis: ${args.chapterSynopsis}`,
      args.previousChapterSynopsis ? `Previous chapter: ${args.previousChapterSynopsis}` : "",
      args.nextChapterSynopsis ? `Next chapter: ${args.nextChapterSynopsis}` : "",
      args.previousSynopses ? `Previous blocs:\n${args.previousSynopses}` : "",
      `Current weak synopsis:\n${args.currentSynopsis}`,
    ].filter(Boolean).join("\n");
    return requestOpenRouterJson<{ synopsis?: string }>(repairPrompt, 320, {
      timeoutMs: 180000,
      systemMessage: args.systemMsg,
    });
  }

  function evaluateProseResult(
    prose: string,
    args: { targetWords: number; minAcceptable: number; useBestFit: boolean; previousProse: string },
  ) {
    const text = prose.trim();
    const wc = countWords(text);
    const paragraphCount = text ? text.split(/\n{2,}/).filter(Boolean).length : 0;
    const hasForbiddenMeta = /\b(word count\s*:|scene\s*\d+\s*:|chapter\s*\d+\s*:)\b/i.test(text);
    const prevTail = args.previousProse.trim().slice(-220);
    const appearsDuplicatedTail = Boolean(prevTail) && text.startsWith(prevTail);
    const minByMode = args.useBestFit ? Math.max(220, Math.round(args.targetWords * 0.62)) : args.minAcceptable;
    const maxByMode = args.useBestFit ? Math.round(args.targetWords * 1.3) : Math.round(args.targetWords * 1.12);
    const ok =
      wc >= minByMode &&
      wc <= maxByMode &&
      paragraphCount >= 1 &&
      !hasForbiddenMeta &&
      !appearsDuplicatedTail;
    return { ok, wc, text };
  }

  async function repairGeneratedProse(args: {
    prose: string;
    sceneSynopsis: string;
    chapterSynopsis: string;
    previousChapterSynopsis: string;
    nextChapterSynopsis: string;
    targetWords: number;
    useBestFit: boolean;
    systemMsg: string;
    canon: string;
  }) {
    const repairPrompt = [
      args.useBestFit
        ? `Rewrite this prose so it best fits the scene at around ${args.targetWords} words.`
        : `Rewrite this prose to exactly ${args.targetWords} words while preserving scene events.`,
      "Keep POV, tense, and chapter voice consistent. Keep continuity with adjacent chapters.",
      "Return ONLY prose paragraphs. No metadata, labels, or notes.",
      `Scene synopsis: ${args.sceneSynopsis}`,
      args.chapterSynopsis ? `Chapter synopsis: ${args.chapterSynopsis}` : "",
      args.previousChapterSynopsis ? `Previous chapter synopsis: ${args.previousChapterSynopsis}` : "",
      args.nextChapterSynopsis ? `Next chapter synopsis: ${args.nextChapterSynopsis}` : "",
      args.canon ? `Canon:\n${args.canon}` : "",
      `Draft to repair:\n${args.prose.slice(0, 6000)}`,
    ].filter(Boolean).join("\n\n");
    return requestOpenRouterText(repairPrompt, Math.min(10000, Math.max(1800, Math.round(args.targetWords * 2.5))), 240000, args.systemMsg, false);
  }

  async function repairPhase2ChapterResult(
    chapterContext: string,
    chapterIndex: number,
    totalChapters: number,
    prior: { synopsis?: string; characters?: string[]; locations?: string[]; events?: string[]; lore?: string[] },
    systemMsg: string,
  ) {
    const repairPrompt = [
      "Your previous chapter plan was too vague or incomplete for scene-block generation.",
      "Rewrite it as a concrete INTERNAL drafting plan.",
      `Return JSON: { "synopsis": "5-9 sentences with explicit events", "characters": ["names"], "locations": ["names"], "events": ["key moments"], "lore": ["relevant lore titles"] }`,
      "Requirements:",
      "- clear sequence of what happens",
      "- explicit conflict/escalation and chapter outcome",
      "- arrays must match synopsis mentions",
      "- one primary location unless absolutely necessary",
      "",
      `Current draft JSON:\n${JSON.stringify(prior)}`,
      "",
      `Canonical context:\n${chapterContext}`,
      "",
      `Arc guidance:\n${buildChapterArcGuidance(chapterIndex, totalChapters)}`,
    ].join("\n");
    return requestOpenRouterJson<{
      synopsis?: string;
      characters?: string[];
      locations?: string[];
      events?: string[];
      lore?: string[];
    }>(repairPrompt, 700, { timeoutMs: 240000, systemMessage: systemMsg });
  }

  async function runConcurrent<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
    const results: T[] = new Array(tasks.length);
    let nextIndex = 0;
    async function worker() {
      while (nextIndex < tasks.length) {
        const i = nextIndex++;
        results[i] = await tasks[i]();
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker()));
    return results;
  }

  /* ─── End two-phase helpers ─── */

  /** Trims character data to only the fields relevant for the AI mode to save tokens. */
  function trimCharacterForAiMode(
    character: NonNullable<Novel["storyBible"]["characters"][number]>,
    mode: CharacterAiMode,
  ): Record<string, unknown> {
    const base: Record<string, unknown> = {
      name: character.name,
      role: character.role,
      logline: character.logline,
      pronouns: character.pronouns,
    };
    if (mode === "voice") {
      return { ...base, personality: character.personality, accent: character.accent, speakingStyle: character.speakingStyle, voiceNotes: character.voiceNotes };
    }
    if (mode === "psyche") {
      return { ...base, personality: character.personality, fears: character.fears, backstory: character.backstory, reactionPattern: character.reactionPattern, secrets: character.secrets, readerSecretHint: character.readerSecretHint };
    }
    // "profile" mode — send everything
    return character;
  }

  function ensureStoryAiReady() {
    if (selectedProviderOption.requiresKey && !normalizeClientApiKey(openRouterKey)) {
      setStoryAiError(`Add your ${selectedProviderOption.label} API key in Settings before using assistant tools.`);
      setProfileOpen(true);
      return false;
    }
    if (!assistantBaseUrl.trim()) {
      setStoryAiError(`Add a ${selectedProviderOption.label} base URL in Settings before using assistant tools.`);
      setProfileOpen(true);
      return false;
    }
    if (!openRouterModel.trim()) {
      setStoryAiError(`Choose a ${selectedProviderOption.label} model in Settings before using assistant tools.`);
      setProfileOpen(true);
      return false;
    }
    return true;
  }

  /* ─── Block delimiters and types ─── */
  const BLOCK_DELIM = "<<<BLOCK>>>";
  const PROSE_DELIM = "<<<PROSE>>>";
  const END_BLOCK = "<<<ENDBLOCK>>>";
  const META_DELIM = "<<<META>>>";

  type ChapterBlock = {
    synopsis: string;
    prose: string;
    wordTarget: number;
    preset: string;
    notes: string;
    regenConstraint: string;
    lengthMode: "strict" | "best-fit";
  };

  const DEFAULT_BLOCK: ChapterBlock = {
    synopsis: "",
    prose: "",
    wordTarget: 600,
    preset: "default",
    notes: "",
    regenConstraint: "",
    lengthMode: "strict",
  };

  function parseChapterBlocks(content: string): { blocks: ChapterBlock[]; hasBlocks: boolean } {
    if (!content.includes(BLOCK_DELIM)) return { blocks: [], hasBlocks: false };
    const parts = content.split(BLOCK_DELIM).filter(Boolean);
    const blocks: ChapterBlock[] = [];
    for (const part of parts) {
      const proseIdx = part.indexOf(PROSE_DELIM);
      const endIdx = part.indexOf(END_BLOCK);
      if (proseIdx === -1 || endIdx === -1) continue;
      let header = part.slice(0, proseIdx).replace(/\n+$/, "").trim();
      const prose = part.slice(proseIdx + PROSE_DELIM.length, endIdx).replace(/^\n+/, "").replace(/\n+$/, "").trim();
      let synopsis = header;
      let wordTarget = DEFAULT_BLOCK.wordTarget;
      let preset = DEFAULT_BLOCK.preset;
      let notes = DEFAULT_BLOCK.notes;
      let regenConstraint = DEFAULT_BLOCK.regenConstraint;
      let lengthMode = DEFAULT_BLOCK.lengthMode;
      if (header.startsWith(META_DELIM)) {
        const firstNewline = header.indexOf("\n");
        const metaLine = firstNewline >= 0 ? header.slice(META_DELIM.length, firstNewline) : header.slice(META_DELIM.length);
        synopsis = firstNewline >= 0 ? header.slice(firstNewline + 1).trim() : "";
        const metaParts = metaLine.split("|");
        if (metaParts.length >= 1) wordTarget = Math.max(200, Math.min(2000, parseInt(metaParts[0], 10) || DEFAULT_BLOCK.wordTarget));
        if (metaParts.length >= 2) preset = metaParts[1] || DEFAULT_BLOCK.preset;
        if (metaParts.length >= 3) notes = metaParts[2] ?? DEFAULT_BLOCK.notes;
        if (metaParts.length >= 4) regenConstraint = metaParts[3] ?? DEFAULT_BLOCK.regenConstraint;
        if (metaParts.length >= 5) {
          lengthMode = metaParts[4] === "best-fit" ? "best-fit" : "strict";
        }
      }
      blocks.push({ synopsis, prose, wordTarget, preset, notes, regenConstraint, lengthMode });
    }
    return { blocks, hasBlocks: blocks.length > 0 };
  }

  function serializeChapterBlocks(blocks: ChapterBlock[]): string {
    return blocks
      .map((b) => {
        const meta = `${META_DELIM}${b.wordTarget}|${b.preset}|${b.notes}|${b.regenConstraint}|${b.lengthMode}\n`;
        return `${BLOCK_DELIM}\n${meta}${b.synopsis}\n${PROSE_DELIM}\n${b.prose}\n${END_BLOCK}`;
      })
      .join("\n\n");
  }

  function insertBlockAt(blocks: ChapterBlock[], atIndex: number, position: "before" | "after") {
    if (!activeChapter) return;
    const insertIdx = position === "after" ? atIndex + 1 : atIndex;
    const newBlock = { ...DEFAULT_BLOCK };
    const next = [...blocks.slice(0, insertIdx), newBlock, ...blocks.slice(insertIdx)];
    updateChapter(activeChapter.id, { content: serializeChapterBlocks(next) });
  }

  function deleteBlockAt(blocks: ChapterBlock[], atIndex: number) {
    if (!activeChapter) return;
    const next = blocks.filter((_, i) => i !== atIndex);
    updateChapter(activeChapter.id, { content: next.length > 0 ? serializeChapterBlocks(next) : "" });
    if (focusBlockIndex === atIndex) setFocusBlockIndex(null);
    else if (focusBlockIndex !== null && focusBlockIndex > atIndex) setFocusBlockIndex(focusBlockIndex - 1);
  }

  function addBlockFromPlainContent(content: string) {
    if (!activeChapter) return;
    const trimmed = content.trim();
    const blocks: ChapterBlock[] = trimmed
      ? [
          { ...DEFAULT_BLOCK, prose: trimmed },
          { ...DEFAULT_BLOCK },
        ]
      : [{ ...DEFAULT_BLOCK }];
    updateChapter(activeChapter.id, {
      content: serializeChapterBlocks(blocks),
    });
  }

  function applyRawFormatting(
    wrapper: { open: string; close: string },
    content: string,
  ) {
    const textarea = editorInputRef.current;
    if (!textarea || !activeChapter) return;
    const { selectionStart, selectionEnd } = textarea;
    const before = content.slice(0, selectionStart);
    const selected = content.slice(selectionStart, selectionEnd);
    const after = content.slice(selectionEnd);
    let newValue: string;
    if (selected.length > 0) {
      newValue = before + wrapper.open + selected + wrapper.close + after;
    } else {
      newValue = before + wrapper.open + wrapper.close + after;
    }
    updateChapter(activeChapter.id, { content: newValue });
    requestAnimationFrame(() => {
      if (selected.length > 0) {
        textarea.setSelectionRange(
          selectionStart,
          selectionStart + wrapper.open.length + selected.length + wrapper.close.length,
        );
      } else {
        const pos = selectionStart + wrapper.open.length;
        textarea.setSelectionRange(pos, pos);
      }
      textarea.focus();
    });
  }

  function applyBlockFormatting(
    blockIndex: number,
    blocks: ChapterBlock[],
    wrapper: { open: string; close: string },
  ) {
    const textarea = blockProseRefs.current[blockIndex];
    if (!textarea || !activeChapter) return;
    const { selectionStart, selectionEnd, value } = textarea;
    const before = value.slice(0, selectionStart);
    const selected = value.slice(selectionStart, selectionEnd);
    const after = value.slice(selectionEnd);
    let newValue: string;
    let newStart: number;
    let newEnd: number;
    if (selected.length > 0) {
      newValue = before + wrapper.open + selected + wrapper.close + after;
      newStart = selectionStart;
      newEnd = selectionEnd + wrapper.open.length + wrapper.close.length;
    } else {
      newValue = before + wrapper.open + wrapper.close + after;
      newStart = selectionEnd + wrapper.open.length;
      newEnd = newStart;
    }
    const next = [...blocks];
    next[blockIndex] = { ...blocks[blockIndex], prose: newValue };
    updateChapter(activeChapter.id, { content: serializeChapterBlocks(next) });
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(newStart, newEnd);
    });
  }

  async function runGenerateChapterBlocks() {
    if (!novel || !activeChapter || !ensureStoryAiReady()) return;
    const targetChapterId = activeChapter.id;
    const chapterLevelBolton = chapterBoltonByChapterId[targetChapterId]?.trim() ?? "";
    const { previousChapterSynopsis, nextChapterSynopsis } = getAdjacentChapterSynopses(targetChapterId);
    const storyPosition = getChapterStoryPosition(targetChapterId);
    const planChapter = planChapters.find((p) => p.manuscriptChapterId === targetChapterId);
    const chapterSynopsis = (planChapter?.synopsis || activeChapter.subtitle || "").trim();
    if (!chapterSynopsis) {
      setStoryAiError("Add a chapter synopsis in the Book Plan first, or a subtitle above.");
      return;
    }

    const BLOC_COUNT = 4;
    const context = buildChapterBlocksContext(activeChapter.title, chapterSynopsis, planChapter?.characterIds, planChapter?.locationIds);
    const systemMsg = `Novel outliner. Write in ${profileLangLabel}. Return ONLY valid JSON.`;

    setStoryAiBusyAction(`chapter-blocks-${targetChapterId}`);
    setStoryAiError(null);

    try {
      /* ══════════════════════════════════════════════════════════════
       * SINGLE BATCH CALL — generate all bloc synopses at once.
       * Replaces the old 4 sequential calls (each with 5 retries +
       * repair calls = up to 24 API calls) with ONE call.
       * ══════════════════════════════════════════════════════════════ */

      type BatchBlocResult = { blocs?: Array<{ synopsis?: string }> };

      const batchPrompt = [
        `Split this chapter into exactly ${BLOC_COUNT} scene blocs. Each bloc is a continuous scene that will be turned into prose.`,
        `Return JSON: { "blocs": [{ "synopsis": "1-3 sentences" }, { "synopsis": "1-3 sentences" }, ...] }`,
        "",
        "RULES:",
        `- Return EXACTLY ${BLOC_COUNT} blocs.`,
        "- Each synopsis must be 1-3 concrete sentences describing what HAPPENS in the scene.",
        "- Use character names from the Canon below. Do not invent new characters.",
        "- All blocs share ONE primary location unless a transition is essential for the plot.",
        "- Bloc 1 opens the chapter. The final bloc resolves or closes the chapter.",
        "- Each bloc flows naturally into the next — no jumps.",
        "- Be specific: name characters, describe actions, state emotional shifts and consequences.",
        "- This is an internal drafting plan, NOT reader-facing copy.",
        "",
        storyPosition.chapterNumber > 0
          ? `Story position: Chapter ${storyPosition.chapterNumber} of ${storyPosition.totalChapters}.`
          : "",
        storyPosition.arcGuidance,
        `Chapter: ${activeChapter.title}`,
        `Chapter synopsis: ${chapterSynopsis}`,
        previousChapterSynopsis ? `Previous chapter: ${clampPromptText(previousChapterSynopsis, 200)}` : "",
        nextChapterSynopsis ? `Next chapter: ${clampPromptText(nextChapterSynopsis, 200)}` : "",
        "",
        context,
      ].filter(Boolean).join("\n");

      let batchBlocs: Array<{ synopsis?: string }> = [];

      // Attempt batch call (with 2 retries max)
      for (let attempt = 0; attempt < 3 && batchBlocs.length < BLOC_COUNT; attempt++) {
        try {
          const raw = await requestOpenRouterText(
            batchPrompt,
            800,
            240000,
            systemMsg,
            false,
            0.3,
          );
          let parsed = parseJsonFromAi<BatchBlocResult | Array<{ synopsis?: string }>>(raw);
          if (!parsed) {
            const repaired = attemptCloseTruncatedJson(raw.trim());
            if (repaired) try { parsed = JSON.parse(repaired) as BatchBlocResult; } catch { /* ignore */ }
          }
          if (Array.isArray(parsed)) {
            batchBlocs = parsed;
          } else if (parsed && typeof parsed === "object") {
            const obj = parsed as Record<string, unknown>;
            if (Array.isArray(obj.blocs)) {
              batchBlocs = obj.blocs as Array<{ synopsis?: string }>;
            } else if (Array.isArray(obj.blocks)) {
              batchBlocs = obj.blocks as Array<{ synopsis?: string }>;
            } else if (Array.isArray(obj.scenes)) {
              batchBlocs = obj.scenes as Array<{ synopsis?: string }>;
            } else {
              // Try any array value
              for (const key of Object.keys(obj)) {
                if (Array.isArray(obj[key])) { batchBlocs = obj[key] as Array<{ synopsis?: string }>; break; }
              }
            }
          }
          // Validate entries
          batchBlocs = batchBlocs.filter((b) => {
            const syn = typeof b?.synopsis === "string" ? b.synopsis.trim() : "";
            return syn.length >= 10;
          });
          if (batchBlocs.length >= BLOC_COUNT) break;
        } catch {
          // retry
        }
      }

      // ── Build blocks from batch results ──
      const blocks: ChapterBlock[] = [];
      for (let i = 0; i < Math.min(BLOC_COUNT, batchBlocs.length); i++) {
        const synopsis = (typeof batchBlocs[i]?.synopsis === "string" ? batchBlocs[i].synopsis!.trim() : "");
        if (synopsis.length >= 10) {
          blocks.push({ ...DEFAULT_BLOCK, synopsis, notes: chapterLevelBolton });
        }
      }

      // ── Quick repair: fill any missing blocs individually ──
      if (blocks.length < BLOC_COUNT && blocks.length > 0) {
        for (let i = blocks.length; i < BLOC_COUNT; i++) {
          const isLast = i === BLOC_COUNT - 1;
          const previousSynopses = blocks.map((b, idx) => `Bloc ${idx + 1}: ${b.synopsis}`).join("\n");
          const repairPrompt = [
            `Write a 1-3 sentence synopsis for scene bloc ${i + 1} of ${BLOC_COUNT} in this chapter.`,
            `Return JSON: { "synopsis": "your synopsis" }`,
            `Chapter: ${activeChapter.title}`,
            `Chapter synopsis: ${chapterSynopsis}`,
            previousSynopses ? `Previous blocs:\n${previousSynopses}` : "",
            isLast ? "This is the FINAL bloc — close the chapter." : "",
          ].filter(Boolean).join("\n");
          try {
            const data = await requestOpenRouterJson<{ synopsis?: string }>(
              repairPrompt,
              300,
              { timeoutMs: 120000, systemMessage: "Return ONLY valid JSON." },
            );
            const syn = (typeof data.synopsis === "string" ? data.synopsis : "").trim();
            if (syn.length >= 10) {
              blocks.push({ ...DEFAULT_BLOCK, synopsis: syn, notes: chapterLevelBolton });
            }
          } catch { /* skip */ }
        }
      }

      if (blocks.length === 0) {
        throw new Error("Could not generate blocs. Try again or use a different model.");
      }

      // Update the chapter with all blocs at once
      updateChapter(targetChapterId, { content: serializeChapterBlocks(blocks) });

      // Link generated bloc names back to Canon IDs for this chapter plan.
      if (planChapter) {
        const linked = inferCanonIdsFromText([chapterSynopsis, ...blocks.map((b) => b.synopsis)].join("\n"));
        const mergedCharacterIds = Array.from(new Set([...(planChapter.characterIds ?? []), ...linked.characterIds]));
        const mergedLocationIds = Array.from(new Set([...(planChapter.locationIds ?? []), ...linked.locationIds]));
        const mergedLoreIds = Array.from(new Set([...(planChapter.loreIds ?? []), ...linked.loreIds]));
        updateStoryBible({
          bookPlan: {
            ...(novel.storyBible.bookPlan ?? {
              chapters: [],
              aiChapterTarget: "auto" as const,
              updatedAt: new Date().toISOString(),
            }),
            chapters: planChapters.map((chapter) =>
              chapter.id === planChapter.id
                ? {
                    ...chapter,
                    characterIds: mergedCharacterIds,
                    locationIds: mergedLocationIds,
                    loreIds: mergedLoreIds,
                  }
                : chapter,
            ),
          },
        });
      }
    } catch (error) {
      setStoryAiError(error instanceof Error ? error.message : "Block generation failed.");
    } finally {
      setStoryAiBusyAction(null);
    }
  }

  const BLOCK_REGENERATE_PRESETS: Array<{ id: string; label: string; instruction: string }> = [
    { id: "more-dialogue", label: "More dialogue", instruction: "Add more dialogue, keep narration lean." },
    { id: "increase-tension", label: "Increase tension", instruction: "Raise the tension and suspense." },
    { id: "internal-thoughts", label: "More internal thoughts", instruction: "Add more of the POV character's inner thoughts and reactions." },
    { id: "tighten", label: "Tighten/shorten", instruction: "Tighten the prose; cut flab, keep it punchy." },
    { id: "expand", label: "Expand/sensory", instruction: "Expand with more sensory detail and atmosphere." },
  ];

  async function runGenerateBlockProse(blockIndex: number, regenerateInstruction?: string) {
    if (!novel || !activeChapter || !ensureStoryAiReady()) return;
    const targetChapterId = activeChapter.id;
    const { blocks, hasBlocks } = parseChapterBlocks(activeChapter.content);
    if (!hasBlocks || blockIndex < 0 || blockIndex >= blocks.length) return;

    const block = blocks[blockIndex];
    if (!block.synopsis?.trim()) {
      setStoryAiError("Add a synopsis to this bloc first.");
      return;
    }

    const nextBlockSynopses = blocks.slice(blockIndex + 1).map((b) => b.synopsis).filter(Boolean);
    const prevProse = blockIndex > 0 ? blocks[blockIndex - 1].prose : "";
    const isRegenerate = Boolean(block.prose?.trim());

    const planChapter = planChapters.find((p) => p.manuscriptChapterId === targetChapterId);
    const planChapterSynopsis = planChapter?.synopsis?.trim() || "";
    const inferredCanon = inferCanonIdsFromText(`${planChapterSynopsis}\n${block.synopsis}`);
    const planCharIds = Array.from(new Set([...(planChapter?.characterIds ?? []), ...inferredCanon.characterIds]));
    const planLocIds = Array.from(new Set([...(planChapter?.locationIds ?? []), ...inferredCanon.locationIds]));
    const { previousChapterSynopsis, nextChapterSynopsis } = getAdjacentChapterSynopses(targetChapterId);
    const storyPosition = getChapterStoryPosition(targetChapterId);

    setStoryAiBusyAction(`block-${targetChapterId}-${blockIndex}`);
    setStoryAiError(null);
    try {
      const wt = block.wordTarget;
      const useBestFit = block.lengthMode === "best-fit";
      const minAcceptable = useBestFit ? Math.round(wt * 0.72) : Math.round(wt * 0.95);

      // Build lean canon context — keep it short for speed
      const canon = buildProseContext(block.synopsis, planChapterSynopsis, planCharIds, planLocIds);
      const activeBoltonId = chapterBoltonId || block.notes.trim();
      const activeBolton = activeBoltonId ? (novel.storyBible.boltons ?? []).find((b) => b.id === activeBoltonId) : null;
      const boltonLine = activeBolton
        ? `Bolt-On rule (priority, max 500 chars): ${getBoltonDirectiveText(activeBolton)}`
        : "";
      const constraint = (regenerateInstruction || block.regenConstraint)?.trim();

      // Build system message with Canon style/voice baked in so the model can't ignore it
      const sv = novel.storyBible.styleVoice;
      const storyCharacters = novel.storyBible.characters ?? [];
      const povCharName = sv.povCharacterId
        ? storyCharacters.find((c) => c.id === sv.povCharacterId)?.name
        : undefined;
      const styleRules: string[] = [];
      if (sv.pov && povCharName) {
        styleRules.push(`POV: ${sv.pov} — narrating character is ${povCharName}. Write from ${povCharName}'s perspective at all times`);
      } else if (sv.pov) {
        styleRules.push(`POV: ${sv.pov}`);
      } else if (povCharName) {
        styleRules.push(`Narrating character: ${povCharName}. Write from ${povCharName}'s perspective`);
      }
      if (sv.tense) styleRules.push(`Tense: ${sv.tense}`);
      if (sv.comps?.length) styleRules.push(`Style like: ${sv.comps.slice(0, 3).join(", ")}`);
      if (sv.voiceRules) styleRules.push(`Voice: ${clampPromptText(sv.voiceRules, 200)}`);
      if (sv.bannedWords?.length) styleRules.push(`Never use these words: ${sv.bannedWords.slice(0, 10).join(", ")}`);
      const styleDirective = styleRules.length > 0
        ? ` MANDATORY STYLE RULES — follow exactly: ${styleRules.join(". ")}.`
        : "";
      const lengthRule = useBestFit
        ? `Write the best-fit scene length around ${wt} words. You may choose the most natural length between ${Math.round(wt * 0.75)} and ${Math.round(wt * 1.15)} words.`
        : `YOU MUST WRITE ${wt} WORDS — NOT 200, NOT 300, EXACTLY ${wt}. If you finish the scene early, expand with dialogue, action, interiority, and sensory detail until you reach ${wt} words.`;
      const systemMsg = `Write prose in ${profileLangLabel}. ${lengthRule}${styleDirective} STRICT OUTPUT RULES: Return ONLY prose paragraphs. NEVER include: word counts, "Word count:", scene labels, "Scene 1", "Scene 2", chapter headings, separators (---), asterisks for metadata, thinking, notes, or any non-prose text. Keep one continuous chapter voice and POV, and never break story continuity.`;
      const novelistQualityRule = `Grammar and prose quality are non-negotiable: use correct ${profileLangLabel} spelling, punctuation, paragraphing, and sentence structure like a published novelist.`;

      // Build concise prompt — word count hammered at top, middle, and bottom
      const wcReminder = useBestFit
        ? `[TARGET LENGTH: Best fit around ${wt} words, allowed range ${Math.round(wt * 0.75)}-${Math.round(wt * 1.15)}.]`
        : `[MANDATORY: Your response MUST be ${wt} words long. Do NOT stop at 200 words. Keep writing until you reach ${wt} words.]`;
      const prompt = isRegenerate
        ? [
            wcReminder,
            `Rewrite this scene. Same story beats, fresh prose. ${useBestFit ? `Best-fit target: around ${wt} words.` : `TARGET: ${wt} words.`}`,
            novelistQualityRule,
            boltonLine,
            constraint ? `Change: ${constraint}` : "",
            storyPosition.chapterNumber > 0
              ? `Story position: Chapter ${storyPosition.chapterNumber} of ${storyPosition.totalChapters}.`
              : "",
            storyPosition.arcGuidance,
            `Scene: ${block.synopsis}`,
            previousChapterSynopsis ? `Previous chapter synopsis: ${clampPromptText(previousChapterSynopsis, 220)}` : "",
            nextChapterSynopsis ? `Next chapter synopsis: ${clampPromptText(nextChapterSynopsis, 220)}` : "",
            `Current:\n${block.prose!.slice(0, 1500)}`,
            "Continuity rule: preserve character placement, POV, and location continuity unless explicitly transitioning scenes.",
            "A new bloc is not an automatic location change.",
            canon ? `Canon:\n${canon}` : "",
            wcReminder,
          ].filter(Boolean).join("\n")
        : [
            wcReminder,
            useBestFit
              ? `Write this scene with best-fit length around ${wt} words. Prioritize narrative fit and continuity over exact count.`
              : `Write ${wt} words of prose for this scene. If you finish the scene, add more detail — describe the setting, deepen character thoughts, extend dialogue — until you have ${wt} words.`,
            novelistQualityRule,
            boltonLine,
            storyPosition.chapterNumber > 0
              ? `Story position: Chapter ${storyPosition.chapterNumber} of ${storyPosition.totalChapters}.`
              : "",
            storyPosition.arcGuidance,
            `Scene: ${block.synopsis}`,
            planChapterSynopsis ? `Chapter: ${clampPromptText(planChapterSynopsis, 150)}` : "",
            previousChapterSynopsis ? `Previous chapter synopsis: ${clampPromptText(previousChapterSynopsis, 220)}` : "",
            nextChapterSynopsis ? `Next chapter synopsis: ${clampPromptText(nextChapterSynopsis, 220)}` : "",
            prevProse ? `Previous scene ended: "${prevProse.slice(-150)}"` : "",
            blocks[blockIndex - 1]?.synopsis ? `Previous bloc summary: ${clampPromptText(blocks[blockIndex - 1].synopsis, 120)}` : "",
            nextBlockSynopses.length > 0 ? `Next scenes: ${nextBlockSynopses.slice(0, 2).join("; ")}` : "",
            "Continuity rule: keep character placement, POV, and location continuity coherent with the previous bloc unless a clear transition is written.",
            "Do not force a new location just because this is a new bloc.",
            canon ? `Canon:\n${canon}` : "",
            wcReminder,
          ].filter(Boolean).join("\n");

      // Token budget: ~2.5 tokens per word — generous to ensure model doesn't cut off
      const scaledMaxTokens = Math.min(10000, Math.max(2000, Math.round(wt * 2.5)));
      // Timeout: minimum 4 minutes, scales aggressively for slow models
      const scaledTimeoutMs = Math.max(240000, Math.round(wt * 320));

      let prose = "";

      // Helper: save current prose to the chapter so the user can see it live
      function saveProseProgress(text: string) {
        const progressBlocks = [...blocks];
        progressBlocks[blockIndex] = { ...block, prose: text };
        updateChapter(targetChapterId, { content: serializeChapterBlocks(progressBlocks) });
      }

      // ── Attempt 1: full prompt ──
      try {
        const raw = await requestOpenRouterText(prompt, scaledMaxTokens, scaledTimeoutMs, systemMsg, false);
        prose = cleanProseOutput(raw);
      } catch {
        // Will try simplified prompt
      }

      // ── Attempt 2: simplified prompt if first failed or empty ──
      if (!prose) {
        const simplePrompt = [
          `[MANDATORY: Write exactly ${wt} words. Do NOT stop early.]`,
          `Write ${wt} words of prose for this scene. Keep writing until you reach ${wt} words.`,
          `Scene: ${block.synopsis}`,
          prevProse ? `Continue from: "${prevProse.slice(-100)}"` : "",
          `You MUST write ${wt} words of prose. If you finish the scene, add detail, description, and dialogue to reach ${wt} words.`,
        ].filter(Boolean).join("\n\n");
        try {
          const raw2 = await requestOpenRouterText(simplePrompt, scaledMaxTokens, scaledTimeoutMs, systemMsg, false);
          prose = cleanProseOutput(raw2);
        } catch {
          // fall through
        }
      }

      if (!prose) {
        throw new Error("No prose returned. Try again or use a different model.");
      }

      // Show prose to the user immediately after initial generation
      saveProseProgress(prose);

      // ── Word count enforcement: auto-continue only when strict mode needs more coverage ──
      let wc = countWords(prose);
      const MAX_CONTINUES = 8; // More continuation attempts for slower/shorter models
      let continues = 0;
      while (!useBestFit && wc < minAcceptable && continues < MAX_CONTINUES) {
        continues++;
        const deficit = wt - wc;
        // Ask for manageable chunks — max 500 words per continuation to help weaker models
        const chunkTarget = Math.min(450, deficit);
        const continueSystemMsg = `You are a novelist continuing a scene. Write exactly ${chunkTarget} words in ${profileLangLabel}. Grammar, punctuation, and sentence structure must be publication-quality in ${profileLangLabel}. Return ONLY prose paragraphs — no word counts, no scene labels, no "---", no metadata, no notes. Continue seamlessly from where the text left off.`;
        const continuePrompt = [
          `WORD COUNT: ${chunkTarget} words.`,
          `Continue this scene. Write ${chunkTarget} more words.`,
          `Scene: ${block.synopsis}`,
          `Text so far ends with:\n"${prose.slice(-800)}"`,
          `Write ${chunkTarget} words. Continue the story seamlessly. Prose only — no labels, no repetition of what came before.`,
        ].join("\n");
        const continueTokens = Math.min(2000, Math.max(600, Math.round(chunkTarget * 2.5)));
        try {
          const raw = await requestOpenRouterText(continuePrompt, continueTokens, scaledTimeoutMs, continueSystemMsg, false);
          const extra = cleanProseOutput(raw);
          if (extra && countWords(extra) > 15) {
            prose = prose + "\n\n" + extra;
            wc = countWords(prose);
            saveProseProgress(prose);
          } else {
            break; // Model returned nothing useful — stop
          }
        } catch {
          break;
        }
      }

      let quality = evaluateProseResult(prose, {
        targetWords: wt,
        minAcceptable,
        useBestFit,
        previousProse: prevProse,
      });
      if (!quality.ok) {
        try {
          const repairedRaw = await repairGeneratedProse({
            prose,
            sceneSynopsis: block.synopsis,
            chapterSynopsis: planChapterSynopsis,
            previousChapterSynopsis,
            nextChapterSynopsis,
            targetWords: wt,
            useBestFit,
            systemMsg,
            canon,
          });
          const repaired = cleanProseOutput(repairedRaw);
          const repairedQuality = evaluateProseResult(repaired, {
            targetWords: wt,
            minAcceptable,
            useBestFit,
            previousProse: prevProse,
          });
          if (repairedQuality.ok) {
            prose = repaired;
            quality = repairedQuality;
            saveProseProgress(prose);
          }
        } catch {
          // keep the best available prose
        }
      }

      if (!quality.ok && quality.wc < Math.max(160, Math.round(wt * 0.5))) {
        throw new Error("Generated prose was too short for a reliable scene. Try again or switch model.");
      }

      const trimmed = quality.text;

      const nextBlocks = [...blocks];
      nextBlocks[blockIndex] = { ...block, prose: trimmed };
      updateChapter(targetChapterId, { content: serializeChapterBlocks(nextBlocks) });
    } catch (error) {
      setStoryAiError(error instanceof Error ? error.message : "Bloc prose generation failed.");
    } finally {
      setStoryAiBusyAction(null);
    }
  }

  function getAiLatencyProfile(modelId: string, provider: AssistantProviderId) {
    const model = modelId.toLowerCase();
    const slowPattern = /(reason|thinking|r1|qwq|o1|o3|sonnet|opus|grok-4|deepseek\/deepseek-r1|gemini-2\.5-pro)/i;
    const fastPattern = /(mini|flash|haiku|8b|7b|small)/i;
    if (slowPattern.test(model)) {
      return { timeoutMultiplier: 1.8, minTotalMs: 240000, attemptWeights: [0.52, 0.30, 0.18] as const };
    }
    if (provider === "openrouter" && model.includes(":free")) {
      return { timeoutMultiplier: 1.5, minTotalMs: 220000, attemptWeights: [0.55, 0.28, 0.17] as const };
    }
    if (fastPattern.test(model)) {
      return { timeoutMultiplier: 1.0, minTotalMs: 120000, attemptWeights: [0.62, 0.23, 0.15] as const };
    }
    return { timeoutMultiplier: 1.25, minTotalMs: 180000, attemptWeights: [0.58, 0.25, 0.17] as const };
  }

  async function requestOpenRouterText(prompt: string, maxTokens = 700, timeoutMs = 180000, systemMessage?: string, jsonMode = false, temperature?: number) {
    const normalizedApiKey = normalizeClientApiKey(openRouterKey);
    const startMs = Date.now();
    const latencyProfile = getAiLatencyProfile(openRouterModel, assistantProvider);
    const totalBudgetMs = Math.max(
      timeoutMs,
      Math.round(timeoutMs * latencyProfile.timeoutMultiplier),
      latencyProfile.minTotalMs,
    );
    const firstBudget = Math.max(12000, Math.floor(totalBudgetMs * latencyProfile.attemptWeights[0]));
    const secondPlannedBudget = Math.max(9000, Math.floor(totalBudgetMs * latencyProfile.attemptWeights[1]));
    const thirdPlannedBudget = Math.max(8000, Math.floor(totalBudgetMs * latencyProfile.attemptWeights[2]));

    // Pre-build request body once (avoid re-serializing on retry)
    const requestBody = JSON.stringify({
      provider: assistantProvider,
      apiKey: normalizedApiKey,
      baseUrl: assistantBaseUrl.trim(),
      model: openRouterModel,
      prompt,
      system: systemMessage || "",
      maxTokens,
      jsonMode,
      ...(temperature != null ? { temperature } : {}),
    });

    async function singleAttempt(attemptTimeoutMs: number): Promise<{ ok: boolean; status: number; text: string; apiError?: string }> {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), attemptTimeoutMs);
      let response: Response;
      try {
        response = await fetch("/api/openrouter/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
          signal: controller.signal,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return { ok: false, status: 0, text: "", apiError: "timeout" };
        }
        throw error;
      } finally {
        window.clearTimeout(timeoutId);
      }
      const payload = (await response.json().catch(() => null)) as unknown;
      const text =
        payload && typeof payload === "object" && typeof (payload as Record<string, unknown>).text === "string"
          ? ((payload as Record<string, unknown>).text as string)
          : "";
      const apiError = extractApiErrorMessage(payload);
      return { ok: response.ok, status: response.status, text: text.trim(), apiError: apiError || undefined };
    }

    // First attempt
    const first = await singleAttempt(firstBudget);

    // If we got a non-empty successful response, return it
    if (first.ok && first.text) return first.text;

    // Determine if retry is worthwhile
    const elapsed = Date.now() - startMs;
    const remaining = totalBudgetMs - elapsed;
    const isAuthError = first.apiError?.includes("API key") || first.status === 401 || first.status === 402;
    const isTransient = first.text === "" || first.status === 500 || first.status === 502 || first.status === 503;

    if (!isAuthError && isTransient && remaining > 12000) {
      // Quality-first: allow up to two retries when models are slow/unreliable.
      await new Promise((r) => window.setTimeout(r, 600));
      const secondBudget = Math.max(6000, Math.min(secondPlannedBudget, remaining - 600));
      const second = await singleAttempt(secondBudget);
      if (second.ok && second.text) return second.text;

      const elapsedAfterSecond = Date.now() - startMs;
      const remainingAfterSecond = totalBudgetMs - elapsedAfterSecond;
      const secondTransient = second.text === "" || second.status === 500 || second.status === 502 || second.status === 503;
      if (secondTransient && remainingAfterSecond > 8000) {
        await new Promise((r) => window.setTimeout(r, 800));
        const thirdBudget = Math.max(6000, Math.min(thirdPlannedBudget, remainingAfterSecond - 800));
        const third = await singleAttempt(thirdBudget);
        if (third.ok && third.text) return third.text;
        const bestError = third.apiError || second.apiError || first.apiError;
        if (bestError) throw new Error(bestError);
      } else {
        const bestError = second.apiError || first.apiError;
        if (bestError) throw new Error(bestError);
      }
    }

    // Report the failure
    if (first.apiError === "timeout") {
      throw new Error("Request timed out. This model is slow but can still work—retrying often helps. You can also try again with the same settings.");
    }
    if (first.apiError) throw new Error(first.apiError);
    if (!first.ok && first.status === 400) {
      throw new Error(`${selectedProviderOption.label} rejected this request. Check your model and connection settings, then try again.`);
    }
    if (first.text === "") {
      throw new Error("Model returned an empty response. Try again or switch to a different model.");
    }
    throw new Error("Assistant request failed.");
  }

  function stripJsonMarkdownFence(text: string) {
    return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }

  function sanitizeJsonCandidate(text: string) {
    return text
      .trim()
      .replace(/^\uFEFF/, "")
      .replace(/^json\s*\n/i, "")
      .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
      .replace(/\u00A0/g, " ")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/([}\]"0-9])\s*\n\s*(["{[])/g, "$1,$2");
  }

  function attemptCloseTruncatedJson(text: string): string {
    const trimmed = text.trim();
    if (!trimmed) return "";
    const stack: string[] = [];
    let inString = false;
    let isEscaped = false;
    for (let i = 0; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (inString) {
        if (isEscaped) { isEscaped = false; continue; }
        if (ch === "\\") { isEscaped = true; continue; }
        if (ch === '"') { inString = false; }
        continue;
      }
      if (ch === '"') { inString = true; continue; }
      if (ch === "{" || ch === "[") { stack.push(ch); continue; }
      if (ch === "}" || ch === "]") { stack.pop(); continue; }
    }
    if (stack.length === 0) return "";
    let repaired = trimmed;
    if (inString) repaired += '"';
    repaired = repaired.replace(/,\s*$/, "");
    while (stack.length > 0) {
      const opener = stack.pop();
      repaired += opener === "{" ? "}" : "]";
    }
    return repaired;
  }

  function extractBalancedJsonBlock(text: string) {
    let start = -1;
    const stack: string[] = [];
    let inString = false;
    let isEscaped = false;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      if (start === -1) {
        if (char === "{" || char === "[") {
          start = index;
          stack.push(char);
        }
        continue;
      }
      if (inString) {
        if (isEscaped) {
          isEscaped = false;
        } else if (char === "\\") {
          isEscaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }
      if (char === '"') {
        inString = true;
        continue;
      }
      if (char === "{" || char === "[") {
        stack.push(char);
        continue;
      }
      if (char === "}" || char === "]") {
        const last = stack[stack.length - 1];
        const closesLast = (last === "{" && char === "}") || (last === "[" && char === "]");
        if (!closesLast) continue;
        stack.pop();
        if (stack.length === 0 && start !== -1) {
          return text.slice(start, index + 1).trim();
        }
      }
    }
    return "";
  }

  function parseJsonFromAi<T>(rawText: string): T | null {
    // Strip thinking blocks first — models like Infermatic wrap output in <think>...</think>
    const cleaned = stripThinkingBlocks(rawText).trim();
    if (!cleaned) return null;
    const attempts: string[] = [];
    const pushAttempt = (value: string) => {
      const normalized = sanitizeJsonCandidate(value);
      if (!normalized || attempts.includes(normalized)) return;
      attempts.push(normalized);
    };
    pushAttempt(cleaned);
    pushAttempt(stripJsonMarkdownFence(cleaned));
    const extractedFromRaw = extractBalancedJsonBlock(cleaned);
    if (extractedFromRaw) pushAttempt(extractedFromRaw);
    const stripped = stripJsonMarkdownFence(cleaned);
    const extractedFromStripped = extractBalancedJsonBlock(stripped);
    if (extractedFromStripped) pushAttempt(extractedFromStripped);
    // Attempt to close truncated JSON (model ran out of tokens)
    const truncationRepair = attemptCloseTruncatedJson(stripped || cleaned);
    if (truncationRepair) pushAttempt(truncationRepair);
    for (const candidate of attempts) {
      try {
        return JSON.parse(candidate) as T;
      } catch {
        // continue
      }
    }
    return null;
  }

  async function requestOpenRouterJson<T>(
    prompt: string,
    maxTokens = 900,
    options?: { timeoutMs?: number; systemMessage?: string },
  ) {
    const totalBudgetMs = options?.timeoutMs ?? 240000;
    const sysMsg = options?.systemMessage;
    // Do NOT use jsonMode (response_format) — many providers (Infermatic/vLLM) don't support it.
    const startMs = Date.now();
    const firstPass = await requestOpenRouterText(prompt, maxTokens, totalBudgetMs, sysMsg, false, 0.3);
    const firstParsed = parseJsonFromAi<T>(firstPass);
    if (firstParsed) return firstParsed;

    // Try to repair the output locally first (free, no API call)
    const repairSource = stripThinkingBlocks(firstPass).trim();
    const truncationRepair = attemptCloseTruncatedJson(repairSource);
    if (truncationRepair) {
      try { return JSON.parse(truncationRepair) as T; } catch { /* fall through */ }
    }

    // Only retry if we have enough time budget left
    const remainingMs = totalBudgetMs - (Date.now() - startMs);
    if (remainingMs < 18000) {
      throw new Error("Assistant response was not valid JSON. Try a different model or run again.");
    }

    // Retry with strict prompt while preserving more context for accuracy.
    const retryPrompt = `Your previous response was not valid JSON. Respond with ONLY the JSON object requested. No explanation.\n\nOriginal request (respond with JSON only):\n${prompt.slice(0, 4000)}`;
    const retryMaxTokens = Math.max(450, Math.min(maxTokens, 900));
    const secondPass = await requestOpenRouterText(retryPrompt, retryMaxTokens, remainingMs, "Return ONLY valid JSON. No markdown, no text.", false, 0.1);
    const secondParsed = parseJsonFromAi<T>(secondPass);
    if (secondParsed) return secondParsed;

    // Last chance: repair retry output
    const retryRepair = attemptCloseTruncatedJson(stripThinkingBlocks(secondPass).trim() || repairSource);
    if (retryRepair) {
      try { return JSON.parse(retryRepair) as T; } catch { /* fall through */ }
    }

    // Third pass: tiny schema lock to salvage slower models that drift.
    const remainingAfterSecond = totalBudgetMs - (Date.now() - startMs);
    if (remainingAfterSecond > 12000) {
      const thirdPrompt = [
        "Return ONLY valid JSON that exactly matches the requested shape.",
        "No prose, no explanation, no markdown.",
        "If unsure, still return best-effort JSON object with the required keys.",
        `Original request:\n${prompt.slice(0, 2500)}`,
      ].join("\n\n");
      const thirdPass = await requestOpenRouterText(
        thirdPrompt,
        Math.max(450, Math.min(maxTokens, 850)),
        remainingAfterSecond,
        "Strict JSON mode. Output one JSON object only.",
        false,
        0,
      );
      const thirdParsed = parseJsonFromAi<T>(thirdPass);
      if (thirdParsed) return thirdParsed;
      const thirdRepair = attemptCloseTruncatedJson(stripThinkingBlocks(thirdPass).trim());
      if (thirdRepair) {
        try { return JSON.parse(thirdRepair) as T; } catch { /* fall through */ }
      }
    }

    throw new Error("Assistant response was not valid JSON. Try a different model or run again.");
  }

  function mapChapterHintToId(chapterHint: string) {
    if (!novel || !chapterHint.trim()) return "";
    const normalized = chapterHint.trim().toLowerCase();
    const exactId = novel.chapters.find((chapter) => chapter.id.toLowerCase() === normalized);
    if (exactId) return exactId.id;
    const exactTitle = novel.chapters.find((chapter) => chapter.title.trim().toLowerCase() === normalized);
    if (exactTitle) return exactTitle.id;
    const partial = novel.chapters.find((chapter) => chapter.title.toLowerCase().includes(normalized));
    return partial?.id ?? "";
  }

  async function runSummaryAutofillFromPrompt() {
    if (!novel || !ensureStoryAiReady()) return;
    const userPrompt = summaryAutofillPrompt.trim();
    if (!userPrompt) {
      setStoryAiError("Describe your story idea first so the assistant can fill the Summary section.");
      return;
    }

    setStoryAiBusyAction("summary-autofill");
    setStoryAiError(null);
    try {
      const sysMsg = "Novel planning assistant. Return valid JSON only.";

      const prompt = [
        `Story idea: ${userPrompt}`,
        `Create a novel summary. Return JSON:`,
        `{"synopsis":"140-260 word synopsis","themes":["2-5 themes"],"genre":["2-4 genres"],"tone":["2-4 tones"],"coreConflict":"1-3 sentences of central tension"}`,
      ].join("\n\n");

      type SummaryResult = {
        synopsis?: string;
        themes?: string[];
        genre?: string[];
        tone?: string[];
        coreConflict?: string;
      };

      let data: SummaryResult | null = null;

      // Attempt 1: direct call
      try {
        const raw = await requestOpenRouterText(prompt, 800, 180000, sysMsg, false, 0.7);
        data = parseJsonFromAi<SummaryResult>(raw);
      } catch { /* continue */ }

      // Attempt 2: stricter
      if (!data || !data.synopsis) {
        try {
          const retryPrompt = prompt + "\n\nReturn ONLY valid JSON. No commentary, no markdown.";
          const raw2 = await requestOpenRouterText(retryPrompt, 800, 180000, sysMsg, false, 0.4);
          data = parseJsonFromAi<SummaryResult>(raw2);
        } catch { /* continue */ }
      }

      if (!data || !data.synopsis) {
        throw new Error("Summary generation failed. Try again or use a different model.");
      }

      updateStoryBible({
        summary: {
          ...novel.storyBible.summary,
          synopsisShort:
            typeof data.synopsis === "string" ? data.synopsis.trim() : novel.storyBible.summary.synopsisShort,
          themes: parseStringList(data.themes).length ? parseStringList(data.themes) : novel.storyBible.summary.themes,
          genre: parseStringList(data.genre).length ? parseStringList(data.genre) : novel.storyBible.summary.genre,
          tone: parseStringList(data.tone).length ? parseStringList(data.tone) : novel.storyBible.summary.tone,
          stakes:
            typeof data.coreConflict === "string"
              ? data.coreConflict.trim()
              : novel.storyBible.summary.stakes,
        },
      });
    } catch (error) {
      setStoryAiError(error instanceof Error ? error.message : "Unable to autofill summary from prompt.");
    } finally {
      setStoryAiBusyAction(null);
    }
  }

  async function runGenerateKeyEventsFromSummary(focus: EventsAiFocus = "balanced", count = 8) {
    if (!novel || !ensureStoryAiReady()) return;
    setStoryAiBusyAction("events-generate");
    setStoryAiError(null);
    try {
      const context = buildStoryBibleContext("events");
      const chapterNames = novel.chapters.map((chapter, index) => `${index + 1}. ${chapter.title}`).join("\n") || "No chapters yet.";
      const focusInstruction =
        focus === "twists"
          ? "Favor reversals, surprises, and escalating complications."
          : focus === "character"
            ? "Favor character turning points and emotional progression."
            : focus === "romance"
              ? "Favor emotional chemistry, relationship tension, and intimacy turns."
              : focus === "mystery"
                ? "Favor clues, reveals, red herrings, and escalating uncertainty."
                : focus === "action"
                  ? "Favor momentum, danger, tactical decisions, and consequence."
                  : "Balance plot progression, conflict, and character change.";
      const systemMsg = "Story architect. Return only valid JSON.";
      const prompt = [
        `Generate ${count} plot events. ${focusInstruction}`,
        `Return JSON: { "events": [{"name":"string","summary":"string","chapterHint":"string"}] }`,
        `Canon:\n${context}`,
        `Chapters:\n${chapterNames}`,
      ].join("\n\n");

      const data = await requestOpenRouterJson<{
        events?: Array<{ name?: string; summary?: string; chapterHint?: string }>;
      }>(prompt, 600, { systemMessage: systemMsg });

      const events = Array.isArray(data.events) ? data.events : [];
      const mapped = events
        .map((event, index) => {
          const name = typeof event.name === "string" ? event.name.trim() : "";
          const summary = typeof event.summary === "string" ? event.summary.trim() : "";
          if (!name && !summary) return null;
          const chapterHint = typeof event.chapterHint === "string" ? event.chapterHint : "";
          return {
            id: createEntityId("event"),
            name: name || `Key Event ${index + 1}`,
            summary,
            when: chapterHint,
            chapterId: mapChapterHintToId(chapterHint),
          };
        })
        .filter((event): event is NonNullable<typeof event> => event !== null);

      if (!mapped.length) {
        throw new Error("Assistant did not return usable events.");
      }
      updateStoryBible({
        timeline: [...(novel.storyBible.timeline ?? []), ...mapped],
      });
    } catch (error) {
      setStoryAiError(error instanceof Error ? error.message : "Unable to generate key events.");
    } finally {
      setStoryAiBusyAction(null);
    }
  }

  async function runDescribeWriterStyle() {
    if (!novel || !ensureStoryAiReady()) return;
    if (!styleAuthorDraft.trim()) {
      setStoryAiError("Enter a writer name first.");
      return;
    }
    setStoryAiBusyAction("style-author");
    setStoryAiError(null);
    try {
      const context = buildStoryBibleContext("characterCompact");
      const systemMsg = "Writing style analyst. Return only valid JSON.";
      const prompt = [
        `Describe ${styleAuthorDraft.trim()}'s writing style. Return JSON:`,
        `{ "voiceRules": "practical style rules (max 800 chars): sentence structure, vocabulary, pacing, dialogue", "toneTags": ["tone1"], "styleComparables": ["similar author"] }`,
        `Novel context:\n${context}`,
      ].join("\n\n");
      const data = await requestOpenRouterJson<{
        voiceRules?: string;
        toneTags?: string[];
        styleComparables?: string[];
      }>(prompt, 350, { systemMessage: systemMsg });

      const currentComps = novel.storyBible.styleVoice.comps ?? [];
      const aiComps = parseStringList(data.styleComparables);
      const mergedComps = Array.from(new Set([...currentComps, styleAuthorDraft.trim(), ...aiComps]));

      updateStoryBible({
        styleVoice: {
          ...novel.storyBible.styleVoice,
          voiceRules:
            typeof data.voiceRules === "string" && data.voiceRules.trim()
              ? data.voiceRules.trim()
              : novel.storyBible.styleVoice.voiceRules ?? "",
          comps: mergedComps,
        },
        summary: {
          ...novel.storyBible.summary,
          tone: parseStringList(data.toneTags).length
            ? Array.from(new Set([...(novel.storyBible.summary.tone ?? []), ...parseStringList(data.toneTags)]))
            : novel.storyBible.summary.tone,
        },
      });
    } catch (error) {
      setStoryAiError(error instanceof Error ? error.message : "Unable to describe writer style.");
    } finally {
      setStoryAiBusyAction(null);
    }
  }

  async function runGenerateCharactersFromSummary() {
    if (!novel || !ensureStoryAiReady()) return;
    const hasSummaryInput =
      Boolean(novel.storyBible.summary.synopsisShort.trim()) || Boolean(novel.storyBible.summary.stakes.trim());
    if (!hasSummaryInput) {
      setStoryAiError(
        "Your Summary is still empty. Add synopsis or core conflict first so generated characters stay canon-safe and story-specific.",
      );
      return;
    }

    setStoryAiBusyAction("characters-generate");
    setStoryAiError(null);
    try {
      const summaryNameHints = extractSummaryNameHints();
      if (summaryNameHints.length === 0) {
        throw new Error("No clear person names were found in the synopsis. Add real character names first.");
      }
      const existingNames = storyCharacters.map((c) => c.name).filter(Boolean).join(", ") || "none";
      const summaryNamesText = summaryNameHints.length ? summaryNameHints.join(", ") : "";
      const sb = novel.storyBible;
      const genre = (sb.summary.genre ?? []).slice(0, 4).join(", ") || "fiction";
      const synopsis = sb.summary.synopsisShort?.trim() || "";
      const requestedCount = Math.min(6, Math.max(2, summaryNameHints.length));

      // ── Name validation ──
      const allKnownLocations = new Set<string>(
        (novel.storyBible.locations ?? []).map((l) => l.name?.trim().toLowerCase()).filter(Boolean),
      );
      const allKnownLore = new Set<string>(
        (novel.storyBible.lore ?? []).map((l) => l.title?.trim().toLowerCase()).filter(Boolean),
      );
      const NEVER_A_NAME = new Set([
        "despite","although","because","before","after","during","against","between","through",
        "without","within","around","among","behind","beneath","beside","beyond","another",
        "either","neither","every","several","already","always","perhaps","whether","however",
        "moreover","therefore","otherwise","meanwhile","together","toward","towards",
        "about","above","across","along","below","under","until","upon","while","since","often",
        "never","still","almost","rather","quite","further","where","there","whose","which",
        "other","these","those","their","would","could","should","might","being","having",
        "broken","forgotten","hidden","golden","wooden","fallen","chosen","frozen","spoken",
        "stolen","woven","driven","risen","taken","shaken","forsaken","molten","rotten","sunken",
        "written","sacred","cursed","blessed","damned","haunted","ruined","twisted","scarred",
        "lost","found","silent","gentle","bitter","wicked","lonely","savage","hollow","ancient",
        "eternal","divine","mortal","phantom","shadow","spectral","mystic","arcane","celestial",
        "crimson","scarlet","midnight","obsidian","emerald","azure","amber","onyx","ivory",
      ]);
      const NAME_OK = new Set(["ashley","beverly","courtney","emily","holly","kelly","lily","molly","sally","shelley","shirley","stanley","timothy","anthony","brittany","destiny","harmony","melody","charity","trinity","felicity","dorothy","kimberly","audrey","avery","henry","harry","perry","terry","jerry","barry","gary","danny","jimmy","kenny","billy","bobby","tommy","jenny","penny","mary","betty","jeffrey","geoffrey","gregory","zachary","hillary","mallory","rory","ivory","emery","valery","rosemary","florence","grace","pierce","lance","chance","vince","bruce","joyce","wayne","shane","blaine","claire","blake","drake","luke","june","rose","hope","jade","eve","skye","brooke","paige"]);
      const PLACE_WORDS = new Set(["city","town","village","kingdom","castle","forest","mountain","river","lake","temple","palace","tower","tavern","inn","market","arena","ruins","island","realm","empire","port","harbor","bridge","gate","academy","school","library","cathedral","church","guild","order","council","faction","manor","estate","dungeon","fortress","citadel","desert","oasis","coast","canyon","continent","province","district","sea","ocean","bay","peninsula","valley","monastery","abbey","chapel","shrine","museum","theatre","theater","stadium","settlement","colony","garrison","abyss","wilderness","house"]);

      function looksLikeRealName(word: string): boolean {
        if (!word || word.length < 2 || word.length > 20) return false;
        if (!/^[A-Z]/.test(word)) return false;
        if (!/[aeiouAEIOU]/.test(word)) return false;
        const lw = word.toLowerCase();
        if (NEVER_A_NAME.has(lw)) return false;
        if (!NAME_OK.has(lw)) {
          if (/(?:ly|ness|ment|tion|sion|ful|less|ous|ive|able|ible|ally|erly|ward|wise|ght|ism|ist|ity|ety|ance|ence|dom|ship|ened|ated|ized|ised|eous|ious|ical|shire|holm|burg|berg|wich|wick|ford|land|dale|wood|field|pool|port|mouth|town|stead|bury|polis|grad|stan)$/.test(lw)) return false;
          if (/(?:ing|ful|less|ness|ment|tion|sion|ous|ive|ble|ish|ise|ize|ude|ade|ite|ete|ose|ure|age|ual|ial|ght|nce|tch|dge)$/.test(lw) && lw.length > 5) return false;
        }
        if (/^(un|dis|over|under|out|mis|pre|non|anti|counter|super|semi|sub|trans|inter|multi|ultra|extra|mega|auto|self|home|some|any|every|no)/.test(lw) && lw.length > 6) return false;
        return true;
      }

      function isValidName(name: string): boolean {
        if (!name || name.length < 3) return false;
        const words = name.split(/\s+/).filter(Boolean);
        if (words.length < 2) return false;
        for (const w of words) {
          if (!looksLikeRealName(w)) return false;
          const wl = w.toLowerCase();
          if (allKnownLocations.has(wl) || allKnownLore.has(wl) || PLACE_WORDS.has(wl)) return false;
        }
        if (/^(new character|character \d|unknown|unnamed|n\/a|the )/i.test(name)) return false;
        if (/\bof the\b/i.test(name)) return false;
        return true;
      }

      // ═══════════════════════════════════════════════════════════════
      // FAST — names + roles only. User clicks "Run: Full Profile" per character.
      // ═══════════════════════════════════════════════════════════════
      type RosterEntry = { name?: string; role?: string; logline?: string };

      const prompt = [
        `${genre} novel synopsis: ${clampPromptText(synopsis, 400)}`,
        summaryNamesText ? `Person names identified in the synopsis: ${summaryNamesText}` : "",
        existingNames !== "none" ? `Already created (skip these): ${existingNames}` : "",
        "IMPORTANT: Only create characters for ACTUAL PERSON NAMES from the synopsis above. Ignore any common English words that are not real person names.",
        "For each real person name, generate a full name (first + last). Choose a surname that fits the story's setting, era, and culture.",
        "Give each character a role (Protagonist, Antagonist, Supporting, or Minor) and a one-sentence hook that fits the synopsis.",
        `Return up to ${requestedCount} characters as JSON only: [{"name":"First Last","role":"Protagonist","logline":"one sentence hook"}]`,
      ].filter(Boolean).join("\n");

      let roster: RosterEntry[] = [];

      try {
        const raw = await requestOpenRouterText(prompt, 300, 180000, "Return JSON array only.", false, 0.7);
        const parsed = parseJsonFromAi<RosterEntry[] | { characters?: RosterEntry[] }>(raw);
        if (Array.isArray(parsed)) {
          roster = parsed;
        } else if (parsed && typeof parsed === "object") {
          const obj = parsed as Record<string, unknown>;
          for (const key of Object.keys(obj)) {
            if (Array.isArray(obj[key])) { roster = obj[key] as RosterEntry[]; break; }
          }
        }
      } catch { /* continue */ }

      // Retry if empty
      if (roster.length === 0) {
        try {
          const raw2 = await requestOpenRouterText(
            `List 4 characters for a ${genre} novel: ${clampPromptText(synopsis, 300)}\nJSON array: [{"name":"First Last","role":"Protagonist","logline":"one sentence"}]`,
            300, 60000, "Return JSON array only.", false, 0.5,
          );
          const parsed2 = parseJsonFromAi<RosterEntry[] | { characters?: RosterEntry[] }>(raw2);
          if (Array.isArray(parsed2)) roster = parsed2;
          else if (parsed2 && typeof parsed2 === "object") {
            const obj2 = parsed2 as Record<string, unknown>;
            for (const key of Object.keys(obj2)) {
              if (Array.isArray(obj2[key])) { roster = obj2[key] as RosterEntry[]; break; }
            }
          }
        } catch { /* continue */ }
      }

      // Build a set of first-name tokens from summary hints for flexible matching.
      // This allows "Sarah" (hint) to match "Sarah Thompson" (AI-generated full name).
      const hintFirstNames = new Set(
        summaryNameHints.map((h) => h.trim().toLowerCase().split(/\s+/)[0]).filter(Boolean),
      );
      const hintFullNames = new Set(
        summaryNameHints.map((h) => h.trim().toLowerCase()),
      );

      // Filter roster: reject nonsense, accept real names
      roster = roster.filter((r) => {
        if (typeof r.name !== "string" || !r.name.trim()) return false;
        const name = r.name.trim();
        const words = name.split(/\s+/).filter(Boolean);
        if (words.length === 0) return false;
        // Safety: reject any character whose first name is a common English word
        const firstLower = words[0].toLowerCase();
        if (SUMMARY_NAME_BLOCKLIST.has(firstLower)) return false;
        if (NEVER_A_NAME.has(firstLower)) return false;
        // Single-word name: accept if it matches a summary hint
        if (words.length === 1) {
          return hintFirstNames.has(name.toLowerCase());
        }
        // Multi-word name: accept if valid OR first name matches a hint
        return isValidName(name) || hintFirstNames.has(firstLower);
      });

      // Keep only characters whose name overlaps with summary hints (by first name)
      roster = roster.filter((r) => {
        const firstName = (r.name || "").trim().toLowerCase().split(/\s+/)[0] || "";
        const fullName = (r.name || "").trim().toLowerCase();
        return hintFirstNames.has(firstName) || hintFullNames.has(fullName);
      });

      // Add any summary name hints not yet in roster
      const rosterFirstNames = new Set(
        roster.map((r) => (r.name ?? "").trim().toLowerCase().split(/\s+/)[0]).filter(Boolean),
      );
      const existingNamesSet = new Set(storyCharacters.map((c) => c.name.trim().toLowerCase()));
      const existingFirstNames = new Set(
        storyCharacters.map((c) => c.name.trim().toLowerCase().split(/\s+/)[0]).filter(Boolean),
      );

      summaryNameHints.forEach((hint) => {
        const firstName = hint.trim().toLowerCase().split(/\s+/)[0] || "";
        if (
          firstName &&
          !rosterFirstNames.has(firstName) &&
          !existingFirstNames.has(firstName) &&
          !existingNamesSet.has(hint.trim().toLowerCase())
        ) {
          // Accept single first names from the synopsis — they're real character names
          roster.push({ name: hint.trim(), role: roster.length === 0 ? "Protagonist" : "Supporting" });
          rosterFirstNames.add(firstName);
        }
      });

      if (roster.length === 0) {
        throw new Error("Could not generate characters. Try a different model or add more synopsis detail.");
      }

      // Build character shells (name + role + logline only)
      const nextCharacters = [...storyCharacters];
      const nameIndex = new Map<string, number>();
      const firstNameIndex = new Set<string>();
      nextCharacters.forEach((c, i) => {
        const k = c.name.trim().toLowerCase();
        if (k) {
          nameIndex.set(k, i);
          const firstName = k.split(/\s+/)[0];
          if (firstName) firstNameIndex.add(firstName);
        }
      });

      let addedCount = 0;
      roster.forEach((entry) => {
        const name = (entry.name ?? "").trim();
        if (!name) return;
        const fullName = name;
        if (!fullName) return;
        const k = fullName.trim().toLowerCase();
        const firstName = k.split(/\s+/)[0] ?? "";
        // Skip if exact full name already exists
        if (nameIndex.has(k) || existingNamesSet.has(k)) return;
        // Skip if first name already used (prevents "Liam Fletcher" + "Liam Thompson" dupes)
        if (firstName && firstNameIndex.has(firstName)) return;

        nextCharacters.push({
          id: createEntityId("charv2"),
          name: fullName,
          role: normalizeCharacterRole(entry.role),
          logline: typeof entry.logline === "string" ? entry.logline.trim() : "",
          appearance: "",
          personality: "",
          goals: "",
          fears: "",
          backstory: "",
          secrets: "",
          readerSecretHint: "",
          accent: "",
          speakingStyle: "",
          reactionPattern: "",
          voiceNotes: "",
          tags: [],
          pronouns: "",
          groups: "",
          otherNames: "",
          relationships: [],
        });
        nameIndex.set(k, nextCharacters.length - 1);
        if (firstName) firstNameIndex.add(firstName);
        addedCount++;
      });

      if (addedCount === 0) {
        throw new Error("No new characters to add. They may already exist.");
      }

      updateStoryBible({ characters: nextCharacters });
      if (!selectedV2CharacterId && nextCharacters[0]) {
        setSelectedV2CharacterId(nextCharacters[0].id);
      }
    } catch (error) {
      setStoryAiError(error instanceof Error ? error.message : "Unable to generate characters.");
    } finally {
      setStoryAiBusyAction(null);
    }
  }

  async function runCharacterAiForSelected() {
    if (!novel || !ensureStoryAiReady()) return;
    if (!selectedV2CharacterId) {
      setStoryAiError("Select a character first.");
      return;
    }
    const character = storyCharacters.find((item) => item.id === selectedV2CharacterId);
    if (!character) {
      setStoryAiError("Select a valid character first.");
      return;
    }

    setStoryAiBusyAction(`character-${characterAiMode}`);
    setStoryAiError(null);
    try {
      const context = buildStoryBibleContext("characters");
      const summaryNameHints = extractSummaryNameHints();
      const summaryNamesText = summaryNameHints.length ? summaryNameHints.join(", ") : "none detected";
      const existingOtherNames = storyCharacters
        .filter((item) => item.id !== character.id)
        .map((item) => item.name.trim().toLowerCase())
        .filter(Boolean);
      const hasPlaceholderName =
        !character.name.trim() ||
        character.name.trim().toLowerCase() === "new character" ||
        /^character\s+\d+$/i.test(character.name.trim());
      const focusInstruction =
        characterAiMode === "voice"
          ? "Focus on how this character speaks — accent, dialect, vocabulary, sentence rhythm, speech patterns, and voice notes. Reference the author's style from Canon to make dialogue feel authentic."
          : characterAiMode === "psyche"
            ? "Focus on inner psychology — hidden secrets, how they react under stress/conflict/betrayal, subconscious fears, and a reader-safe foreshadowing hint that does not spoil the secret."
            : "Build a full character profile — appearance, personality, goals, fears, and backstory. Make them vivid and grounded in the Canon.";
      const systemMsg = characterAiMode === "voice"
        ? "You are a dialogue and voice specialist. Craft how characters speak based on the author's style rules in Canon. Return only valid JSON."
        : characterAiMode === "psyche"
          ? "You are a character psychologist. Build rich inner worlds — secrets, stress responses, and subtle foreshadowing. Return only valid JSON."
          : "You are a character development specialist. Build vivid, Canon-consistent profiles for novel drafting. Return only valid JSON.";
      const prompt = [
        `Refine this character: ${character.name}`,
        focusInstruction,
        "Anchor everything to Summary canon only. Do not invent unrelated storylines.",
        "Return JSON only in this shape:",
        `{
  "name": "string",
  "role": "Protagonist|Antagonist|Supporting|Minor|Love Interest|Type|Custom",
  "logline": "string",
  "appearance": "string",
  "personality": "string",
  "goals": "string",
  "fears": "string",
  "backstory": "string",
  "accent": "string",
  "speakingStyle": "string",
  "reactionPattern": "string",
  "voiceNotes": "string",
  "secrets": "string",
  "readerSecretHint": "string",
  "tags": ["string"]
}`,
        "Rules:",
        "- Always return a valid name and role.",
        "- Name must be full first and last name.",
        "- If only one name token is available, keep it as first name and add a fitting last name.",
        "- If this character is one of the summary-mentioned full names, keep exact spelling.",
        "Important: readerSecretHint must remain spoiler-safe and cannot reveal the secret directly.",
        `Summary-mentioned names: ${summaryNamesText}`,
        `Current character:\n${JSON.stringify(trimCharacterForAiMode(character, characterAiMode), null, 2)}`,
        `Story context:\n${context}`,
      ].join("\n\n");

      const data = await requestOpenRouterJson<{
        name?: string;
        role?: string;
        logline?: string;
        appearance?: string;
        personality?: string;
        goals?: string;
        fears?: string;
        backstory?: string;
        accent?: string;
        speakingStyle?: string;
        reactionPattern?: string;
        voiceNotes?: string;
        secrets?: string;
        readerSecretHint?: string;
        tags?: string[];
      }>(prompt, 850, { systemMessage: systemMsg });

      const patch: Partial<NonNullable<Novel["storyBible"]["characters"][number]>> = {};
      const aiName = typeof data.name === "string" ? data.name.trim() : "";
      if (aiName) {
        const aiFullName = ensureFullCharacterName(aiName, storyCharacters.length);
        const aiNameKey = aiFullName.toLowerCase();
        const currentNameKey = character.name.trim().toLowerCase();
        if (aiNameKey === currentNameKey || !existingOtherNames.includes(aiNameKey)) {
          patch.name = aiFullName;
        }
      }

      if (typeof data.role === "string" && data.role.trim()) {
        patch.role = normalizeCharacterRole(data.role);
      } else if (!character.role || character.role === "Type") {
        patch.role = "Supporting";
      }

      if (typeof data.logline === "string" && data.logline.trim()) patch.logline = data.logline.trim();
      if (typeof data.appearance === "string" && data.appearance.trim()) patch.appearance = data.appearance.trim();
      if (typeof data.personality === "string" && data.personality.trim()) patch.personality = data.personality.trim();
      if (typeof data.goals === "string" && data.goals.trim()) patch.goals = data.goals.trim();
      if (typeof data.fears === "string" && data.fears.trim()) patch.fears = data.fears.trim();
      if (typeof data.backstory === "string" && data.backstory.trim()) patch.backstory = data.backstory.trim();
      if (typeof data.accent === "string" && data.accent.trim()) patch.accent = data.accent.trim();
      if (typeof data.speakingStyle === "string" && data.speakingStyle.trim()) {
        patch.speakingStyle = data.speakingStyle.trim();
      }
      if (typeof data.reactionPattern === "string" && data.reactionPattern.trim()) {
        patch.reactionPattern = data.reactionPattern.trim();
      }
      if (typeof data.voiceNotes === "string" && data.voiceNotes.trim()) patch.voiceNotes = data.voiceNotes.trim();
      if (typeof data.secrets === "string" && data.secrets.trim()) patch.secrets = data.secrets.trim();
      if (typeof data.readerSecretHint === "string" && data.readerSecretHint.trim()) {
        patch.readerSecretHint = data.readerSecretHint.trim();
      }
      const aiTags = parseStringList(data.tags);
      if (aiTags.length) patch.tags = Array.from(new Set([...(character.tags ?? []), ...aiTags]));

      if (!patch.name && hasPlaceholderName) {
        const availableSummaryName =
          summaryNameHints.find((name) => !existingOtherNames.includes(name.trim().toLowerCase())) ??
          summaryNameHints[0] ??
          "";
        if (availableSummaryName) {
          patch.name = ensureFullCharacterName(availableSummaryName, storyCharacters.length);
        } else {
          patch.name = ensureFullCharacterName("Alex", storyCharacters.length + 1);
        }
      }

      updateV2Character(character.id, patch);
    } catch (error) {
      setStoryAiError(error instanceof Error ? error.message : "Unable to run character assistant.");
    } finally {
      setStoryAiBusyAction(null);
    }
  }

  async function runSummaryFieldAi(target: SummaryAiField, mode: string) {
    if (!novel) return;
    if (!ensureStoryAiReady()) {
      console.warn("[runSummaryFieldAi] AI not ready — check Settings for API key, base URL, and model.");
      return;
    }
    setStoryAiBusyAction(`summary-field-${target}`);
    setStoryAiError(null);
    try {
      const context = buildStoryBibleContext("summary");
      const summarySystemMsg = "Canon refinement specialist. Return only valid JSON.";

      if (target === "synopsis") {
        const currentSynopsis = novel.storyBible.summary.synopsisShort || "";
        if (!currentSynopsis.trim()) {
          setStoryAiError("Write a synopsis first before using AI tools on it. Describe your story idea in the synopsis box above.");
          return;
        }
        const prompt = [
          "Refine a novel synopsis for planning and drafting.",
          mode === "tighten"
            ? "Tighten this synopsis to be concise, vivid, and clear (110-170 words)."
            : mode === "expand"
              ? "Expand this synopsis with richer narrative detail, emotional depth, and causality (190-320 words). Add texture about setting, character motivations, and consequences."
              : mode === "blurb"
                ? "Rewrite this as compelling back-cover copy while preserving canon facts."
                : mode === "beats"
                  ? "Rewrite this synopsis as a chapter-ready arc summary with clear progression."
                  : "Improve clarity, pacing, tension, and emotional pull while preserving canon.",
          "Return JSON only: {\"synopsis\":\"string\"}",
          `Current synopsis:\n${currentSynopsis}`,
          `Core conflict:\n${novel.storyBible.summary.stakes || "(not set yet)"}`,
          `Story context:\n${context}`,
        ].join("\n\n");
        const data = await requestOpenRouterJson<Record<string, unknown>>(prompt, 700, { systemMessage: summarySystemMsg });
        // Accept multiple possible key names the AI might use
        let newSynopsis = "";
        for (const key of ["synopsis", "result", "text", "refined_synopsis", "improved_synopsis", "synopsisShort", "content", "output"]) {
          const val = data[key];
          if (typeof val === "string" && val.trim().length > 20) {
            newSynopsis = val.trim();
            break;
          }
        }
        // Fallback: grab the first string value that's long enough
        if (!newSynopsis) {
          for (const val of Object.values(data)) {
            if (typeof val === "string" && val.trim().length > 20) {
              newSynopsis = val.trim();
              break;
            }
          }
        }
        if (newSynopsis) {
          updateStoryBible({
            summary: { ...novel.storyBible.summary, synopsisShort: newSynopsis },
          });
        } else {
          setStoryAiError("AI returned an empty or too-short result. Try again or switch model.");
        }
      }

      if (target === "palette") {
        const allowedGenres = GENRE_OPTIONS.join(", ");
        const prompt = [
          "Classify and improve story metadata.",
          mode === "refresh"
            ? "Refresh genre/tone/themes with sharper alternatives based on context."
            : mode === "blend"
              ? "Suggest genre blend positioning and matching tone/theme tags."
              : mode === "audience"
                ? "Optimize genre/tone/themes for clear target audience positioning."
            : "Classify the story into fitting genre, tone, and theme tags.",
          "Return JSON only:",
          `{
  "genre": ["string"],
  "tone": ["string"],
  "themes": ["string"]
}`,
          `Genre choices (prefer from this list): ${allowedGenres}`,
          "Return 1-3 genres, 2-5 tone tags, and 2-5 theme tags.",
          `Story context:\n${context}`,
        ].join("\n\n");
        const data = await requestOpenRouterJson<{
          genre?: string[];
          tone?: string[];
          themes?: string[];
        }>(prompt, 350, { systemMessage: summarySystemMsg });
        const genre = parseStringList(data.genre);
        const tone = parseStringList(data.tone);
        const themes = parseStringList(data.themes);
        updateStoryBible({
          summary: {
            ...novel.storyBible.summary,
            genre: genre.length ? genre : novel.storyBible.summary.genre,
            tone: tone.length ? tone : novel.storyBible.summary.tone,
            themes: themes.length ? themes : novel.storyBible.summary.themes,
          },
        });
      }

      if (target === "conflict") {
        const prompt = [
          "Refine the core conflict and stakes statement for a novel.",
          mode === "intensify"
            ? "Increase urgency and consequence while staying plausible."
            : mode === "moral"
              ? "Add a moral dilemma and difficult trade-off to the core conflict."
              : mode === "pressure"
                ? "Strengthen antagonist pressure and ticking-clock tension."
            : "Improve clarity and impact of the conflict/stakes statement.",
          "Return JSON only: {\"conflictAndStakes\":\"string\"}",
          `Current conflict/stakes:\n${novel.storyBible.summary.stakes || "(empty)"}`,
          `Current synopsis:\n${novel.storyBible.summary.synopsisShort || "(empty)"}`,
          `Story context:\n${context}`,
        ].join("\n\n");
        const data = await requestOpenRouterJson<{ conflictAndStakes?: string }>(prompt, 400, { systemMessage: summarySystemMsg });
        if (typeof data.conflictAndStakes === "string" && data.conflictAndStakes.trim()) {
          updateStoryBible({
            summary: { ...novel.storyBible.summary, stakes: data.conflictAndStakes.trim() },
          });
        }
      }
    } catch (error) {
      console.error("[runSummaryFieldAi] Error:", error);
      setStoryAiError(error instanceof Error ? error.message : "Unable to run assistant action. Check the browser console for details.");
    } finally {
      setStoryAiBusyAction(null);
    }
  }

  function toggleSummaryAiMenu(target: SummaryAiMenuTarget) {
    setOpenSummaryAiMenu((current) => (current === target ? null : target));
  }

  function runEventsAiAndClose(focus: EventsAiFocus) {
    setOpenSummaryAiMenu(null);
    void runGenerateKeyEventsFromSummary(focus, eventsAiCount);
  }

  function updateBookPlan(patch: Partial<NonNullable<Novel["storyBible"]["bookPlan"]>>) {
    if (!novel) return;
    updateStoryBible({
      bookPlan: {
        ...(novel.storyBible.bookPlan ?? {
          chapters: [],
          aiChapterTarget: 8,
          updatedAt: new Date().toISOString(),
        }),
        ...patch,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  function updatePlanChapter(chapterId: string, patch: Partial<PlanChapter>) {
    if (!novel) return;
    const shouldInferReferences = typeof patch.title === "string" || typeof patch.synopsis === "string";
    updateBookPlan({
      chapters: (novel.storyBible.bookPlan?.chapters ?? []).map((chapter) =>
        chapter.id === chapterId
          ? shouldInferReferences
            ? inferPlanReferences({ ...chapter, ...patch }, novel)
            : { ...chapter, ...patch }
          : chapter,
      ),
    });
    // Sync plan synopsis → manuscript chapter subtitle
    if (typeof patch.synopsis === "string") {
      const planChapter = (novel.storyBible.bookPlan?.chapters ?? []).find((c) => c.id === chapterId);
      if (planChapter?.manuscriptChapterId) {
        mutateNovel((current) => ({
          ...current,
          chapters: current.chapters.map((ch) =>
            ch.id === planChapter.manuscriptChapterId
              ? { ...ch, subtitle: patch.synopsis!.slice(0, 140), updatedAt: new Date().toISOString() }
              : ch,
          ),
        }));
      }
    }
  }

  function createPlanChapterFromManuscript(chapter: Novel["chapters"][number], index: number): PlanChapter {
    const outlineSeed = (chapter.subtitle || chapter.content || "").trim();
    return {
      id: createEntityId("plan"),
      title: chapter.title || `Chapter ${index + 1}`,
      synopsis: outlineSeed.slice(0, 320),
      characterIds: [],
      locationIds: [],
      loreIds: [],
      manuscriptChapterId: chapter.id,
    };
  }

  function buildPlanChapterDetails(plan: PlanChapter, sourceNovel: Novel) {
    // Synopsis stays in the plan only; AI references it from plan context. Do not add it to chapter content.
    const characterNames = (plan.characterIds ?? [])
      .map((id) => sourceNovel.storyBible.characters.find((character) => character.id === id)?.name)
      .filter(Boolean) as string[];
    const locationNames = (plan.locationIds ?? [])
      .map((id) => sourceNovel.storyBible.locations.find((location) => location.id === id)?.name)
      .filter(Boolean) as string[];
    const parts = [
      characterNames.length ? `Characters in this chapter:\n- ${characterNames.join("\n- ")}` : "",
      locationNames.length ? `Locations in this chapter:\n- ${locationNames.join("\n- ")}` : "",
    ].filter(Boolean);
    return parts.length ? parts.join("\n\n") : "";
  }

  function normalizeLookup(value: string) {
    return value.trim().toLowerCase();
  }

  function escapeForRegex(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function mergeUniqueIds(...groups: Array<string[] | undefined>) {
    const seen = new Set<string>();
    const merged: string[] = [];
    groups.forEach((group) => {
      (group ?? []).forEach((value) => {
        if (!value || seen.has(value)) return;
        seen.add(value);
        merged.push(value);
      });
    });
    return merged;
  }

  function inferEntityIdsFromText(
    text: string,
    candidates: Array<{ id: string; name: string; aliases?: string[] }>,
  ) {
    const source = normalizeLookup(text || "");
    if (!source) return [] as string[];
    return candidates
      .filter((candidate) => {
        const candidateNames = [
          (candidate.name || "").trim(),
          ...((candidate.aliases ?? []).map((alias) => alias.trim()).filter(Boolean)),
        ].filter(Boolean);
        if (!candidateNames.length) return false;
        return candidateNames.some((candidateName) => {
          const pattern = new RegExp(`\\b${escapeForRegex(candidateName.toLowerCase())}\\b`, "i");
          return pattern.test(source);
        });
      })
      .map((candidate) => candidate.id);
  }

  function inferPlanReferences(plan: PlanChapter, sourceNovel: Novel): PlanChapter {
    const text = `${plan.title || ""}\n${plan.synopsis || ""}`.trim();
    const inferredCharacterIds = inferEntityIdsFromText(
      text,
      (sourceNovel.storyBible.characters ?? []).map((character) => ({
        id: character.id,
        name: character.name || "",
        aliases: (character.otherNames || "")
          .split(/[;,]/)
          .map((alias) => alias.trim())
          .filter(Boolean),
      })),
    );
    const inferredLocationIds = inferEntityIdsFromText(
      text,
      (sourceNovel.storyBible.locations ?? []).map((location) => ({
        id: location.id,
        name: location.name || "",
      })),
    );
    const inferredLoreIds = inferEntityIdsFromText(
      text,
      (sourceNovel.storyBible.lore ?? []).map((entry) => ({
        id: entry.id,
        name: entry.title || "",
      })),
    );
    return {
      ...plan,
      characterIds: mergeUniqueIds(plan.characterIds, inferredCharacterIds),
      locationIds: mergeUniqueIds(plan.locationIds, inferredLocationIds),
      loreIds: mergeUniqueIds(plan.loreIds, inferredLoreIds),
    };
  }

  function normalizePlanTarget(value: unknown): PlanAiChapterTarget {
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.max(1, Math.min(PLAN_CHAPTER_MAX, Math.round(value)));
    }
    return 8;
  }

  function clearAllPlanChapters() {
    if (!novel) return;
    mutateNovel((current) => {
      const now = new Date().toISOString();
      return {
        ...current,
        chapters: [],
        storyBible: {
          ...current.storyBible,
          bookPlan: {
            ...(current.storyBible.bookPlan ?? { chapters: [], aiChapterTarget: 8, updatedAt: now }),
            chapters: [],
            updatedAt: now,
          },
        },
      };
    });
    setActiveChapterId(null);
  }

  function openPlanGenerationModal() {
    if (!novel) return;
    const target = normalizePlanTarget(novel.storyBible.bookPlan?.aiChapterTarget);
    setPlanGenerateCustomCount(String(target));
    setPlanGeneratePacingMode(novel.storyBible.bookPlan?.pacingMode ?? "balanced");
    setShowPlanGenerateModal(true);
  }

  function confirmPlanGeneration() {
    if (!novel) return;
    const manualCount = Number(planGenerateCustomCount);
    const target = Number.isFinite(manualCount) ? normalizePlanTarget(manualCount) : null;
    if (target === null || target < 1) {
      setPlanError(`Enter a valid chapter count (1 to ${PLAN_CHAPTER_MAX}).`);
      return;
    }
    if (planChapters.length > 0) {
      const ok = window.confirm(
        `This will remove your existing ${planChapters.length} chapter${planChapters.length === 1 ? "" : "s"} from the plan. Do you want to continue?`
      );
      if (!ok) return;
    }
    setShowPlanGenerateModal(false);
    updateBookPlan({ aiChapterTarget: target, pacingMode: planGeneratePacingMode });
    void runGeneratePlan(target);
  }

  function applyPlanToChapters(
    sourcePlanChapters?: PlanChapter[],
    options?: {
      activateFirst?: boolean;
      storyBiblePatch?: Partial<Novel["storyBible"]>;
    },
  ) {
    if (!novel) return;
    const incomingPlanChapters = sourcePlanChapters && sourcePlanChapters.length ? sourcePlanChapters : planChapters;
    if (incomingPlanChapters.length === 0) {
      setPlanError("Generate or edit a plan first.");
      return;
    }
    setPlanError(null);

    let firstChapterId: string | null = null;
    mutateNovel((current) => {
      const now = new Date().toISOString();
      const existingById = new Map(current.chapters.map((chapter) => [chapter.id, chapter]));
      const existingByTitle = new Map(
        current.chapters.map((chapter) => [chapter.title.trim().toLowerCase(), chapter]),
      );

      const normalizedIncomingPlans = incomingPlanChapters.map((plan) => inferPlanReferences(plan, current));
      const nextChapters = normalizedIncomingPlans.map((plan, index) => {
        const linked = plan.manuscriptChapterId ? existingById.get(plan.manuscriptChapterId) : undefined;
        const titleKey = (plan.title || "").trim().toLowerCase();
        const titleMatch = !linked && titleKey ? existingByTitle.get(titleKey) : undefined;
        const existing = linked ?? titleMatch;
        return {
          id: existing?.id ?? createEntityId("chapter"),
          title: plan.title || existing?.title || `Chapter ${index + 1}`,
          subtitle: (plan.synopsis || existing?.subtitle || "").slice(0, 140),
          content: existing?.content?.trim() ? existing.content : "",
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        };
      });

      const normalizedPlanChapters = normalizedIncomingPlans.map((plan, index) => ({
        ...plan,
        title: nextChapters[index]?.title || plan.title || `Chapter ${index + 1}`,
        synopsis: plan.synopsis || "",
        characterIds: Array.isArray(plan.characterIds) ? plan.characterIds : [],
        locationIds: Array.isArray(plan.locationIds) ? plan.locationIds : [],
        manuscriptChapterId: nextChapters[index]?.id || plan.manuscriptChapterId || "",
      }));
      const patchedStoryBible = options?.storyBiblePatch ?? {};
      const baseTimeline = Array.isArray(patchedStoryBible.timeline)
        ? (patchedStoryBible.timeline as Novel["storyBible"]["timeline"])
        : (current.storyBible.timeline ?? []);
      const nextTimeline = baseTimeline;

      firstChapterId = nextChapters[0]?.id ?? null;

      return {
        ...current,
        chapters: nextChapters,
        storyBible: {
          ...current.storyBible,
          ...patchedStoryBible,
          timeline: nextTimeline,
          bookPlan: {
            ...(current.storyBible.bookPlan ?? {
              chapters: [],
              aiChapterTarget: 8,
              updatedAt: now,
            }),
            chapters: normalizedPlanChapters,
            updatedAt: now,
          },
          updatedAt: now,
        },
      };
    });

    if (options?.activateFirst !== false && firstChapterId) {
      setActiveChapterId(firstChapterId);
    }
  }

  function addPlanChapter() {
    if (!novel) return;
    mutateNovel((current) => {
      const now = new Date().toISOString();
      const newChapter = createChapter(current.chapters.length);
      const newPlanChapter: PlanChapter = {
        id: createEntityId("plan"),
        title: newChapter.title,
        synopsis: "",
        characterIds: [],
        locationIds: [],
        loreIds: [],
        manuscriptChapterId: newChapter.id,
      };
      return {
        ...current,
        chapters: [...current.chapters, newChapter],
        storyBible: {
          ...current.storyBible,
          bookPlan: {
            ...(current.storyBible.bookPlan ?? {
              chapters: [],
              aiChapterTarget: 8,
              updatedAt: now,
            }),
            chapters: [...(current.storyBible.bookPlan?.chapters ?? []), newPlanChapter],
            updatedAt: now,
          },
          updatedAt: now,
        },
      };
    });
    setPlanError(null);
  }

  function removePlanChapter(chapterId: string) {
    if (!novel) return;
    let removedManuscriptChapterId = "";
    mutateNovel((current) => {
      const now = new Date().toISOString();
      const target = (current.storyBible.bookPlan?.chapters ?? []).find((chapter) => chapter.id === chapterId);
      removedManuscriptChapterId = target?.manuscriptChapterId || "";
      const remainingPlanChapters = (current.storyBible.bookPlan?.chapters ?? []).filter(
        (chapter) => chapter.id !== chapterId,
      );
      const remainingManuscriptChapters = removedManuscriptChapterId
        ? current.chapters.filter((chapter) => chapter.id !== removedManuscriptChapterId)
        : current.chapters;
      return {
        ...current,
        chapters: remainingManuscriptChapters,
        storyBible: {
          ...current.storyBible,
          bookPlan: {
            ...(current.storyBible.bookPlan ?? {
              chapters: [],
              aiChapterTarget: 8,
              updatedAt: now,
            }),
            chapters: remainingPlanChapters,
            updatedAt: now,
          },
          updatedAt: now,
        },
      };
    });
    if (removedManuscriptChapterId && activeChapterId === removedManuscriptChapterId) {
      setActiveChapterId(null);
    }
  }

  function togglePlanReference(
    chapterId: string,
    key: "characterIds" | "locationIds",
    value: string,
  ) {
    if (!value) return;
    const planChapter = planChapters.find((chapter) => chapter.id === chapterId);
    if (!planChapter) return;
    const currentList = planChapter[key] ?? [];
    const nextList = currentList.includes(value)
      ? currentList.filter((item) => item !== value)
      : [...currentList, value];
    updatePlanChapter(chapterId, { [key]: nextList });
  }

  async function runGeneratePlan(targetOverride?: PlanAiChapterTarget) {
    if (!novel || !ensureStoryAiReady()) return;
    if (!novel.storyBible.summary.synopsisShort.trim()) {
      setPlanError("Add a synopsis first so the assistant can plan your book.");
      return;
    }
    setStoryAiBusyAction("plan-generate");
    setPlanError(null);
    setPlanGenerateProgressIdx(null);
    setPlanGenerateTotal(0);
    try {
      const planTarget = targetOverride ?? normalizePlanTarget(novel.storyBible.bookPlan?.aiChapterTarget);
      const systemMsg = "Novel outliner. Respect all Canon. Return only valid JSON.";
      const context = buildPhase1OutlineContext();
      const pacingMode = novel.storyBible.bookPlan?.pacingMode ?? "balanced";
      const pacingHint =
        pacingMode === "slow-burn"
          ? "Pacing: slow-burn. Let early chapters build character depth, atmosphere, and stakes gradually."
          : pacingMode === "fast"
            ? "Pacing: fast. Start with a strong hook and keep momentum high."
            : "Pacing: balanced. Grounded setup with steady escalation.";

      // Collect all existing Canon names for the prompt
      const existingCharNames = (novel.storyBible.characters ?? []).map((c) => c.name).filter(Boolean);
      const existingLocNames = (novel.storyBible.locations ?? []).map((l) => l.name).filter(Boolean);
      const canonNames = [...existingCharNames, ...existingLocNames].join(", ");

      /* ══════════════════════════════════════════════════════════════
       * SINGLE BATCH CALL — generate titles + full details at once.
       * This replaces the old N+1 sequential calls (1 for titles, then
       * 1 per chapter) with ONE call. Massively faster.
       * ══════════════════════════════════════════════════════════════ */

      type BatchChapter = {
        title?: string;
        synopsis?: string;
        characters?: string[];
        locations?: string[];
        events?: string[];
      };
      type BatchResult = { chapters?: BatchChapter[] };

      const batchPrompt = [
        `Create a detailed ${planTarget}-chapter outline for this novel.`,
        `Return JSON: { "chapters": [{ "title": "string", "synopsis": "string", "characters": ["First Last"], "locations": ["Place"], "events": ["key moment"] }] }`,
        "",
        "RULES:",
        `- Return EXACTLY ${planTarget} chapters.`,
        "- Each synopsis must be 5-8 detailed sentences describing WHAT HAPPENS in order.",
        "- Synopses are internal drafting notes for AI, NOT reader-facing blurbs.",
        "- State concrete actions, dialogue beats, emotional shifts, and consequences.",
        "- Name specific characters (First Last) who appear in each chapter.",
        "- Name the specific location where each chapter takes place.",
        "- Each chapter should primarily use ONE location.",
        "- Include at least 1-2 key events per chapter.",
        "- Maintain strict cause-and-effect between chapters.",
        "- Use Canon character and location names EXACTLY as given.",
        canonNames ? `- Canon names to use: ${canonNames}` : "",
        pacingHint,
        "- Early chapters must build naturally, not rush to payoffs.",
        "- The final chapter must resolve the central conflict.",
        "- Do NOT use vague language. Be specific about what happens.",
        "",
        `Canon:\n${context}`,
      ].filter(Boolean).join("\n");

      // Token budget scales with chapter count (more chapters = more tokens needed)
      const tokenBudget = Math.min(4000, Math.max(1200, planTarget * 180));

      let batchChapters: BatchChapter[] = [];
      try {
        const raw = await requestOpenRouterText(batchPrompt, tokenBudget, 300000, systemMsg, false, 0.3);
        let parsed = parseJsonFromAi<BatchResult | BatchChapter[]>(raw);
        if (!parsed) {
          const repaired = attemptCloseTruncatedJson(raw.trim());
          if (repaired) try { parsed = JSON.parse(repaired) as BatchResult | BatchChapter[]; } catch { /* ignore */ }
        }
        if (Array.isArray(parsed)) {
          batchChapters = parsed;
        } else if (parsed && typeof parsed === "object") {
          // Accept { chapters: [...] } or any key that holds an array
          const obj = parsed as Record<string, unknown>;
          if (Array.isArray(obj.chapters)) {
            batchChapters = obj.chapters as BatchChapter[];
          } else {
            for (const key of Object.keys(obj)) {
              if (Array.isArray(obj[key])) { batchChapters = obj[key] as BatchChapter[]; break; }
            }
          }
        }
      } catch { /* will fall back */ }

      // Validate and clean up batch results
      batchChapters = batchChapters
        .filter((ch) => ch && typeof ch === "object")
        .slice(0, planTarget);

      // If batch returned too few chapters, pad with defaults
      while (batchChapters.length < planTarget) {
        batchChapters.push({ title: `Chapter ${batchChapters.length + 1}`, synopsis: "", characters: [], locations: [], events: [] });
      }

      const allTitles = batchChapters.map((ch, i) =>
        (typeof ch.title === "string" ? ch.title.trim() : "") || `Chapter ${i + 1}`,
      );

      /* ── Show skeleton plan immediately so user sees titles ── */
      type Phase2Result = {
        synopsis?: string;
        characters?: string[];
        locations?: string[];
        events?: string[];
        lore?: string[];
      };

      const planChapterIds = allTitles.map(() => createEntityId("plan"));
      const skeletonChapters: PlanChapter[] = allTitles.map((title, i) => ({
        id: planChapterIds[i],
        title,
        synopsis: "",
        characterIds: [],
        locationIds: [],
        loreIds: [],
        manuscriptChapterId: "",
      }));
      applyPlanToChapters(skeletonChapters, { activateFirst: true });
      setPlanGenerateTotal(allTitles.length);

      /* ── Resolve entities from batch results ── */
      const characterByName = new Map<string, Novel["storyBible"]["characters"][number]>();
      const mergedCharacters = [...(novel.storyBible.characters ?? [])];
      mergedCharacters.forEach((character) => {
        const key = normalizeLookup(character.name || "");
        if (key) characterByName.set(key, character);
        (character.otherNames || "")
          .split(/[;,]/)
          .map((alias) => normalizeLookup(alias))
          .filter(Boolean)
          .forEach((aliasKey) => characterByName.set(aliasKey, character));
      });
      const findExistingCharacterIdByName = (rawName: string) => {
        const key = normalizeLookup(rawName);
        if (!key) return "";
        const direct = characterByName.get(key);
        if (direct) return direct.id;
        const first = key.split(/\s+/)[0];
        const firstMatches = mergedCharacters.filter((c) => normalizeLookup(c.name || "").split(/\s+/)[0] === first);
        if (firstMatches.length === 1) return firstMatches[0].id;
        return "";
      };
      const ensureCharacterId = (rawName: string) => {
        const name = rawName.trim();
        if (!name) return "";
        if (isRoleLikeCharacterLabel(name)) return "";
        if (!isLikelyHumanName(name)) return "";
        const fuzzyExistingId = findExistingCharacterIdByName(name);
        if (fuzzyExistingId) return fuzzyExistingId;
        const key = normalizeLookup(name);
        const existing = characterByName.get(key);
        if (existing) return existing.id;
        const created: Novel["storyBible"]["characters"][number] = {
          id: createEntityId("char"),
          name,
          role: "Supporting",
          logline: "",
          appearance: "",
          personality: "",
          goals: "",
          fears: "",
          backstory: "",
          secrets: "",
          readerSecretHint: "",
          accent: "",
          speakingStyle: "",
          reactionPattern: "",
          relationships: [],
          voiceNotes: "",
          tags: [],
          pronouns: "",
          groups: "",
          otherNames: "",
        };
        mergedCharacters.push(created);
        characterByName.set(key, created);
        return created.id;
      };

      const locationByName = new Map<string, Novel["storyBible"]["locations"][number]>();
      const mergedLocations = [...(novel.storyBible.locations ?? [])];
      mergedLocations.forEach((location) => {
        const key = normalizeLookup(location.name || "");
        if (key) locationByName.set(key, location);
      });
      const ensureLocationId = (rawName: string) => {
        const name = rawName.trim();
        if (!name) return "";
        const key = normalizeLookup(name);
        const existing = locationByName.get(key);
        if (existing) return existing.id;
        const created: Novel["storyBible"]["locations"][number] = {
          id: createEntityId("loc"),
          name,
          type: "",
          description: "",
          sensoryDetails: "",
          rules: "",
          significance: "",
          tags: [],
        };
        mergedLocations.push(created);
        locationByName.set(key, created);
        return created.id;
      };

      const mergedEvents = [...(novel.storyBible.timeline ?? [])];
      const eventByName = new Map<string, Novel["storyBible"]["timeline"][number]>();
      mergedEvents.forEach((event) => {
        const key = normalizeLookup(event.name || "");
        if (key) eventByName.set(key, event);
      });
      const ensureEventId = (rawName: string, chapterTitle: string, chapterSynopsis: string, chapterIndex: number) => {
        const name = rawName.trim();
        if (!name) return "";
        const key = normalizeLookup(name);
        const existing = eventByName.get(key);
        if (existing) return existing.id;
        const created: Novel["storyBible"]["timeline"][number] = {
          id: createEntityId("event"),
          name,
          when: `Chapter ${chapterIndex + 1}`,
          summary: chapterSynopsis || "Key event linked to this chapter.",
          chapterId: "",
          affectedEntities: [],
        };
        mergedEvents.push(created);
        eventByName.set(key, created);
        return created.id;
      };

      const mergedLore = [...(novel.storyBible.lore ?? [])];
      const loreByTitle = new Map(mergedLore.map((e) => [normalizeLookup(e.title || ""), e]));
      const resolveLoreId = (rawTitle: string): string => {
        const key = normalizeLookup(rawTitle);
        return key ? (loreByTitle.get(key)?.id ?? "") : "";
      };

      // ── Process each batch chapter and resolve entity IDs ──
      // Stagger visual updates so user sees chapters fill in one-by-one
      const STAGGER_MS = 350; // delay between each chapter appearing
      const emptyChapterIndices: number[] = [];
      for (let index = 0; index < allTitles.length; index++) {
        setPlanGenerateProgressIdx(index);
        const batchCh = batchChapters[index];
        const synopsis = (typeof batchCh?.synopsis === "string" ? batchCh.synopsis.trim() : "");

        // Track chapters with empty/too-short synopses for a quick repair pass
        if (!synopsis || synopsis.length < 80) {
          emptyChapterIndices.push(index);
        }

        const chapterTitle = allTitles[index];
        const rawCharacterNames = parseStringList(batchCh?.characters);
        const resolvedCharacterIds = rawCharacterNames.map(ensureCharacterId).filter(Boolean);

        const chapterCharacterIds = mergeUniqueIds(
          resolvedCharacterIds,
          inferEntityIdsFromText(`${chapterTitle}\n${synopsis}`, mergedCharacters.map((c) => ({
            id: c.id,
            name: c.name || "",
            aliases: (c.otherNames || "").split(/[;,]/).map((alias) => alias.trim()).filter(Boolean),
          }))),
        );
        const chapterLocationIds = mergeUniqueIds(
          parseStringList(batchCh?.locations).map(ensureLocationId).filter(Boolean),
          inferEntityIdsFromText(`${chapterTitle}\n${synopsis}`, mergedLocations.map((l) => ({
            id: l.id, name: l.name || "",
          }))),
        );
        const chapterLoreIds = mergeUniqueIds(
          parseStringList(batchCh?.events).map(resolveLoreId).filter(Boolean),
          inferEntityIdsFromText(`${chapterTitle}\n${synopsis}`, mergedLore.map((e) => ({
            id: e.id, name: e.title || "",
          }))),
        );
        parseStringList(batchCh?.events).forEach((ev) => ensureEventId(ev, chapterTitle, synopsis, index));

        // Live UI update
        mutateNovel((current) => {
          const plan = current.storyBible.bookPlan;
          if (!plan) return current;
          const updatedPlanChapters = [...plan.chapters];
          if (updatedPlanChapters[index]) {
            updatedPlanChapters[index] = {
              ...updatedPlanChapters[index],
              synopsis: synopsis || `Outline for ${chapterTitle}.`,
              characterIds: chapterCharacterIds,
              locationIds: chapterLocationIds,
              loreIds: chapterLoreIds,
            };
          }
          const updatedChapters = [...current.chapters];
          if (updatedChapters[index]) {
            updatedChapters[index] = {
              ...updatedChapters[index],
              subtitle: (synopsis || `Outline for ${chapterTitle}.`).slice(0, 140),
              updatedAt: new Date().toISOString(),
            };
          }
          return {
            ...current,
            chapters: updatedChapters,
            storyBible: {
              ...current.storyBible,
              characters: [...mergedCharacters],
              locations: [...mergedLocations],
              timeline: [...mergedEvents],
              lore: [...mergedLore],
              bookPlan: { ...plan, chapters: updatedPlanChapters, updatedAt: new Date().toISOString() },
            },
          };
        }, { skipSync: index < allTitles.length - 1 });

        // Stagger so user sees each chapter fill in
        if (index < allTitles.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, STAGGER_MS));
        }
      }
      setPlanGenerateProgressIdx(null);

      /* ── Quick repair pass for any chapters that got truncated/empty ── */
      if (emptyChapterIndices.length > 0 && emptyChapterIndices.length <= 6) {
        for (const idx of emptyChapterIndices) {
          try {
            const prevSyn = idx > 0 ? (batchChapters[idx - 1]?.synopsis || "") : "";
            const nextTitle = idx < allTitles.length - 1 ? allTitles[idx + 1] : "";
            const repairPrompt = [
              `Write a detailed 5-8 sentence synopsis for Chapter ${idx + 1}: "${allTitles[idx]}" of this novel.`,
              `Return JSON: { "synopsis": "...", "characters": ["First Last"], "locations": ["Place"], "events": ["key moment"] }`,
              `This is an internal writer plan, not reader copy. Be specific about what happens.`,
              canonNames ? `Canon names: ${canonNames}` : "",
              prevSyn ? `Previous chapter: ${clampPromptText(prevSyn, 200)}` : "",
              nextTitle ? `Next chapter: ${nextTitle}` : "This is the final chapter.",
              `Story: ${clampPromptText(novel.storyBible.summary.synopsisShort || "", 200)}`,
            ].filter(Boolean).join("\n");

            const raw = await requestOpenRouterText(repairPrompt, 400, 120000, systemMsg, false, 0.3);
            let parsed = parseJsonFromAi<Phase2Result>(raw);
            if (!parsed) {
              const repaired = attemptCloseTruncatedJson(raw.trim());
              if (repaired) try { parsed = JSON.parse(repaired) as Phase2Result; } catch { /* skip */ }
            }
            if (parsed?.synopsis && parsed.synopsis.trim().length > 60) {
              const synopsis = parsed.synopsis.trim();
              const charIds = parseStringList(parsed.characters).map(ensureCharacterId).filter(Boolean);
              const locIds = parseStringList(parsed.locations).map(ensureLocationId).filter(Boolean);
              parseStringList(parsed.events).forEach((ev) => ensureEventId(ev, allTitles[idx], synopsis, idx));

              mutateNovel((current) => {
                const plan = current.storyBible.bookPlan;
                if (!plan) return current;
                const updatedPlanChapters = [...plan.chapters];
                if (updatedPlanChapters[idx]) {
                  updatedPlanChapters[idx] = {
                    ...updatedPlanChapters[idx],
                    synopsis,
                    characterIds: mergeUniqueIds(charIds, updatedPlanChapters[idx].characterIds ?? []),
                    locationIds: mergeUniqueIds(locIds, updatedPlanChapters[idx].locationIds ?? []),
                  };
                }
                const updatedChapters = [...current.chapters];
                if (updatedChapters[idx]) {
                  updatedChapters[idx] = { ...updatedChapters[idx], subtitle: synopsis.slice(0, 140), updatedAt: new Date().toISOString() };
                }
                return {
                  ...current,
                  chapters: updatedChapters,
                  storyBible: {
                    ...current.storyBible,
                    characters: [...mergedCharacters],
                    locations: [...mergedLocations],
                    timeline: [...mergedEvents],
                    bookPlan: { ...plan, chapters: updatedPlanChapters, updatedAt: new Date().toISOString() },
                  },
                };
              });
            }
          } catch { /* skip repair for this chapter */ }
        }
      }
    } catch (error) {
      setPlanError(error instanceof Error ? error.message : "Unable to generate plan.");
    } finally {
      setStoryAiBusyAction(null);
      setPlanGenerateProgressIdx(null);
      setPlanGenerateTotal(0);
    }
  }

  async function runRegenPlanChapter(chapterIndex: number) {
    if (!novel || !ensureStoryAiReady()) return;
    const plan = novel.storyBible.bookPlan;
    if (!plan || !plan.chapters[chapterIndex]) return;
    const allTitles = plan.chapters.map((c) => c.title);
    const title = allTitles[chapterIndex];

    setStoryAiBusyAction(`plan-regen-${chapterIndex}`);
    setPlanError(null);
    try {
      const systemMsg = "Novel outliner. Respect all Canon. Return only valid JSON.";
      const prevSynopsis = chapterIndex > 0 ? (plan.chapters[chapterIndex - 1]?.synopsis ?? "") : "";
      const nextTitle = chapterIndex < allTitles.length - 1 ? allTitles[chapterIndex + 1] : "";
      const chapterContext = buildPhase2ChapterContext(title, "", chapterIndex, allTitles, prevSynopsis, nextTitle);
      const prompt = buildPhase2Prompt(chapterContext, chapterIndex, allTitles.length);

      type Phase2Result = { synopsis?: string; characters?: string[]; locations?: string[]; events?: string[]; lore?: string[] };
      let result: Phase2Result | null = null;
        for (let attempt = 0; attempt < 4 && !result; attempt++) {
        try {
          const raw = await requestOpenRouterText(prompt, 500, 240000, systemMsg, false, 0.25);
          let parsed = parseJsonFromAi<Phase2Result>(raw);
          if (!parsed) {
            const repaired = attemptCloseTruncatedJson(raw.trim());
            if (repaired) try { parsed = JSON.parse(repaired) as Phase2Result; } catch { /* ignore */ }
          }
          const quality = evaluateOperationalPlanResult(parsed ?? null);
          if (quality.ok) {
            result = parsed;
          } else if (parsed?.synopsis) {
            try {
              const repaired = await repairPhase2ChapterResult(
                chapterContext,
                chapterIndex,
                allTitles.length,
                parsed,
                systemMsg,
              );
              if (evaluateOperationalPlanResult(repaired).ok) {
                result = repaired;
              }
            } catch {
              // keep retry loop alive
            }
          }
        } catch { /* retry */ }
      }
      if (!result) {
        setPlanError(`Failed to regenerate chapter ${chapterIndex + 1}. Try again or use a different model.`);
        return;
      }

      const synopsis = (typeof result.synopsis === "string" ? result.synopsis.trim() : "") || `Outline for ${title}.`;
      const characters = novel.storyBible.characters ?? [];
      const locations = novel.storyBible.locations ?? [];
      const lore = novel.storyBible.lore ?? [];

      const charIds = mergeUniqueIds(
        parseStringList(result.characters).map((n) => {
          const key = normalizeLookup(n);
          return characters.find((c) => normalizeLookup(c.name || "") === key)?.id ?? "";
        }).filter(Boolean),
        inferEntityIdsFromText(
          `${title}\n${synopsis}`,
          characters.map((c) => ({
            id: c.id,
            name: c.name || "",
            aliases: (c.otherNames || "").split(/[;,]/).map((alias) => alias.trim()).filter(Boolean),
          })),
        ),
      );
      const locIds = mergeUniqueIds(
        parseStringList(result.locations).map((n) => {
          const key = normalizeLookup(n);
          return locations.find((l) => normalizeLookup(l.name || "") === key)?.id ?? "";
        }).filter(Boolean),
        inferEntityIdsFromText(`${title}\n${synopsis}`, locations.map((l) => ({ id: l.id, name: l.name || "" }))),
      );
      const loreIds = mergeUniqueIds(
        parseStringList(result.lore).map((n) => {
          const key = normalizeLookup(n);
          return lore.find((e) => normalizeLookup(e.title || "") === key)?.id ?? "";
        }).filter(Boolean),
        inferEntityIdsFromText(`${title}\n${synopsis}`, lore.map((e) => ({ id: e.id, name: e.title || "" }))),
      );

      mutateNovel((current) => {
        const curPlan = current.storyBible.bookPlan;
        if (!curPlan) return current;
        const updatedPlanChapters = [...curPlan.chapters];
        if (updatedPlanChapters[chapterIndex]) {
          updatedPlanChapters[chapterIndex] = {
            ...updatedPlanChapters[chapterIndex],
            synopsis,
            characterIds: charIds,
            locationIds: locIds,
            loreIds: loreIds,
          };
        }
        const updatedChapters = [...current.chapters];
        if (updatedChapters[chapterIndex]) {
          updatedChapters[chapterIndex] = {
            ...updatedChapters[chapterIndex],
            subtitle: synopsis.slice(0, 140),
            updatedAt: new Date().toISOString(),
          };
        }
        return {
          ...current,
          chapters: updatedChapters,
          storyBible: {
            ...current.storyBible,
            bookPlan: { ...curPlan, chapters: updatedPlanChapters, updatedAt: new Date().toISOString() },
          },
        };
      });
    } catch (error) {
      setPlanError(error instanceof Error ? error.message : "Failed to regenerate chapter.");
    } finally {
      setStoryAiBusyAction(null);
    }
  }

  function autoSizeEditorInput(input: HTMLTextAreaElement | null) {
    if (!input) return;
    const minimumHeight = 520;
    input.style.height = "auto";
    input.style.height = `${Math.max(input.scrollHeight, minimumHeight)}px`;
  }

  useEffect(() => {
    autoSizeEditorInput(editorInputRef.current);
  }, [activeChapter?.id, activeChapter?.content]);

  function mutateNovel(mutator: (current: Novel) => Novel, options?: { skipSync?: boolean }) {
    if (!novelId) return;
    setNovels((current) => {
      let changed = false;
      const next = current.map((item) => {
        if (item.id !== novelId) return item;
        changed = true;
        const mutated = enforceNovelIntegrity(mutator(item));
        return {
          ...mutated,
          updatedAt: new Date().toISOString(),
        };
      });

      if (changed && !options?.skipSync) {
        const savedAt = new Date().toISOString();
        const ok = saveNovelsWithSync(next);
        setAutosaveStatus(
          ok
            ? { status: "ok", message: "Saved", at: savedAt }
            : {
                status: "error",
                message: "Autosave failed. Check browser storage (quota or privacy mode).",
                at: savedAt,
              },
        );
      }
      return next;
    });
  }

  function updateNovel(patch: Partial<Novel>) {
    mutateNovel((current) => ({
      ...current,
      ...patch,
    }));
  }

  function updateStoryBible(patch: Partial<Novel["storyBible"]>) {
    if (!novelId) return;
    mutateNovel((current) => {
      const now = new Date().toISOString();
      const mergedSummary = patch.summary
        ? { ...current.storyBible.summary, ...patch.summary }
        : current.storyBible.summary;
      const mergedStyleVoice = patch.styleVoice
        ? { ...current.storyBible.styleVoice, ...patch.styleVoice }
        : current.storyBible.styleVoice;
      const mergedAiContext = patch.aiContext
        ? { ...current.storyBible.aiContext, ...patch.aiContext }
        : current.storyBible.aiContext;
      const mergedBookPlan = patch.bookPlan
        ? {
            ...(current.storyBible.bookPlan ?? {
              chapters: [],
              aiChapterTarget: 8 as const,
              updatedAt: now,
            }),
            ...patch.bookPlan,
            chapters: patch.bookPlan.chapters ?? (current.storyBible.bookPlan?.chapters ?? []),
          }
        : current.storyBible.bookPlan;
      const nextBookPlan = mergedBookPlan
        ? {
            ...mergedBookPlan,
            aiChapterTarget: normalizePlanTarget(mergedBookPlan.aiChapterTarget),
            chapters: (mergedBookPlan.chapters ?? []).map(sanitizePlanChapterEntry),
            updatedAt: now,
          }
        : mergedBookPlan;
      const mergedCharacters = patch.characters ?? current.storyBible.characters ?? [];
      const mergedLocations = patch.locations ?? current.storyBible.locations ?? [];
      const mergedLore = patch.lore ?? current.storyBible.lore ?? [];
      const mergedTimeline = patch.timeline ?? current.storyBible.timeline ?? [];
      const mergedWorldbuilding =
        typeof patch.worldbuilding === "string"
          ? patch.worldbuilding
          : (current.storyBible.worldbuilding ?? "");

      return {
        ...current,
        storyBible: {
          ...current.storyBible,
          ...patch,
          summary: sanitizeSummarySection(mergedSummary),
          styleVoice: sanitizeStyleVoiceSection(mergedStyleVoice),
          aiContext: {
            ...mergedAiContext,
            defaultModel: clampText(mergedAiContext.defaultModel, 140),
            maxContextTokens: clampAiContextTokens(mergedAiContext.maxContextTokens),
          },
          characters: mergedCharacters.map(sanitizeCharacterEntry),
          locations: mergedLocations.map(sanitizeLocationEntry),
          lore: mergedLore.map(sanitizeLoreEntry),
          timeline: mergedTimeline.map(sanitizeTimelineEntry),
          worldbuilding: clampText(mergedWorldbuilding, STORY_BIBLE_LIMITS.worldbuilding),
          bookPlan: nextBookPlan,
          updatedAt: now,
        },
      };
    });
  }

  function clearBibleSection(section: typeof bibleSection) {
    if (!confirm(`Clear this section? This cannot be undone.`)) return;
    switch (section) {
      case "summary":
        updateStoryBible({
          summary: {
            premise: "",
            synopsisShort: "",
            themes: [],
            genre: [],
            tone: [],
            stakes: "",
          },
        });
        setSummaryGenreDraft(GENRE_OPTIONS[0]);
        setSummaryCustomGenreDraft("");
        break;
      case "styleVoice":
        updateStoryBible({
          styleVoice: {
            pov: "",
            povCharacterId: "",
            tense: "",
            comps: [],
            bannedWords: [],
            voiceRules: "",
          },
        });
        setStyleAuthorDraft("");
        break;
      case "characters":
        updateStoryBible({ characters: [] });
        setSelectedV2CharacterId(null);
        break;
      case "locations":
        updateStoryBible({ locations: [] });
        break;
      case "worldbuilding":
        updateStoryBible({ worldbuilding: "", lore: [] });
        break;
    }
  }

  function updateChapter(
    chapterId: string,
    patch: { title?: string; subtitle?: string; content?: string; goalWords?: number },
  ) {
    mutateNovel((current) => {
      const now = new Date().toISOString();
      const nextChapters = current.chapters.map((chapter) =>
        chapter.id === chapterId
          ? {
              ...chapter,
              ...patch,
              updatedAt: now,
            }
          : chapter,
      );
      const nextPlanChapters = (current.storyBible.bookPlan?.chapters ?? []).map((planChapter) => {
        if (planChapter.manuscriptChapterId !== chapterId) return planChapter;
        return {
          ...planChapter,
          title: typeof patch.title === "string" ? patch.title : planChapter.title,
          synopsis:
            typeof patch.subtitle === "string"
              ? patch.subtitle
              : planChapter.synopsis,
        };
      });
      return {
        ...current,
        chapters: nextChapters,
        storyBible: {
          ...current.storyBible,
          bookPlan: {
            ...(current.storyBible.bookPlan ?? {
              chapters: [],
              aiChapterTarget: 8,
              updatedAt: now,
            }),
            chapters: nextPlanChapters,
            updatedAt: now,
          },
          updatedAt: now,
        },
      };
    });
  }

  function handleCreateChapter() {
    if (!novel) return;
    let createdChapterId = "";
    mutateNovel((current) => {
      const now = new Date().toISOString();
      const chapter = createChapter(current.chapters.length);
      createdChapterId = chapter.id;
      const newPlanChapter = createPlanChapterFromManuscript(chapter, current.chapters.length);
      return {
        ...current,
        chapters: [...current.chapters, chapter],
        storyBible: {
          ...current.storyBible,
          bookPlan: {
            ...(current.storyBible.bookPlan ?? {
              chapters: [],
              aiChapterTarget: 8,
              updatedAt: now,
            }),
            chapters: [...(current.storyBible.bookPlan?.chapters ?? []), newPlanChapter],
            updatedAt: now,
          },
          updatedAt: now,
        },
      };
    });
    setPlanError(null);
    if (createdChapterId) setActiveChapterId(createdChapterId);
  }

  function confirmDeleteChapter() {
    if (!pendingChapterDelete) return;
    mutateNovel((current) => {
      const now = new Date().toISOString();
      return {
        ...current,
        chapters: current.chapters.filter((chapter) => chapter.id !== pendingChapterDelete.id),
        storyBible: {
          ...current.storyBible,
          bookPlan: {
            ...(current.storyBible.bookPlan ?? {
              chapters: [],
              aiChapterTarget: 8,
              updatedAt: now,
            }),
            chapters: (current.storyBible.bookPlan?.chapters ?? []).filter(
              (chapter) => chapter.manuscriptChapterId !== pendingChapterDelete.id,
            ),
            updatedAt: now,
          },
          updatedAt: now,
        },
      };
    });
    if (activeChapterId === pendingChapterDelete.id) {
      setActiveChapterId(null);
    }
    setPendingChapterDelete(null);
  }

  function handleCoverUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      updateNovel({ coverImage: reader.result });
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  /* ─── The Editor: chunked-burst approach (5 paragraphs per call) ─── */

  const EDITOR_CHUNK = 5; // paragraphs per AI call — small = fast, no timeouts

  function getEditorContext() {
    if (!activeChapter || !novel) return null;
    const baseContent = contentForExport(activeChapter.content);
    const paragraphs = baseContent.split(/\n\n+/).filter((p) => p.trim());
    const summary = novel.storyBible.summary;
    const genreStr = (summary.genre ?? []).join(", ") || "Fiction";
    const planChapters = novel.storyBible.bookPlan?.chapters ?? [];
    const ci = novel.chapters.findIndex((c) => c.id === activeChapter.id);
    const planCh = planChapters.find((pc) => pc.manuscriptChapterId === activeChapter.id) ?? planChapters[ci];
    const synopsis = planCh?.synopsis?.trim() || activeChapter.subtitle?.trim() || "";
    const lower = baseContent.toLowerCase();
    const chars = (novel.storyBible.characters ?? [])
      .filter((c) => c.name && lower.includes(c.name.toLowerCase()))
      .map((c) => `${c.name} (${c.role || ""})`.trim()).join(", ");
    /* 3-line context — kept tiny so every chunk call stays fast */
    const brief = [
      `${genreStr} novel. Chapter: ${activeChapter.title || "Untitled"}.`,
      synopsis ? `Synopsis: ${synopsis.slice(0, 200)}` : "",
      chars ? `Characters: ${chars}` : "",
    ].filter(Boolean).join(" ");
    return { paragraphs, brief, genreStr };
  }

  /** Process a small chunk of paragraphs (one fast AI call) */
  async function editorChunkCall(
    paragraphs: string[],
    startIdx: number,
    sysMsg: string,
    taskLine: string,
  ): Promise<EditorChange[]> {
    const numbered = paragraphs.map((p, i) => `[${startIdx + i}] ${p}`).join("\n\n");
    const prompt = [
      `${taskLine}`,
      "Return ONLY changed paragraphs as JSON:",
      `{"edits":[{"p":0,"text":"revised paragraph","reason":"why"}]}`,
      "Omit unchanged paragraphs. If none need changes return {\"edits\":[]}",
      "",
      numbered,
    ].join("\n");

    const maxTokens = Math.min(1200, Math.max(300, paragraphs.length * 120));
    const data = await requestOpenRouterJson<{
      edits?: Array<{ p?: number; text?: string; reason?: string }>;
    }>(prompt, maxTokens, { timeoutMs: 180000, systemMessage: sysMsg });

    const edits = Array.isArray(data?.edits) ? data.edits : [];
    const changes: EditorChange[] = [];
    for (const e of edits) {
      const idx = typeof e.p === "number" ? e.p : -1;
      const text = typeof e.text === "string" ? e.text.trim() : "";
      const localIdx = idx - startIdx;
      if (localIdx < 0 || localIdx >= paragraphs.length || !text) continue;
      if (text === paragraphs[localIdx].trim()) continue;
      changes.push({
        paragraphIndex: idx,
        original: paragraphs[localIdx],
        revised: text,
        reason: typeof e.reason === "string" ? e.reason : "Improvement",
        accepted: null,
      });
    }
    return changes;
  }

  async function runEditorPass(mode: EditorMode, targetedFocus?: TargetedFocus) {
    if (!activeChapter || !novel || !ensureStoryAiReady()) return;
    const baseContent = contentForExport(activeChapter.content);
    if (!baseContent.trim()) {
      setEditorResult(null);
      setEditorError("Write some text first before using The Editor.");
      return;
    }
    const ctx = getEditorContext();
    if (!ctx) return;

    setEditorError(null);
    setEditorResult(null);
    setEditorOriginalParagraphs(ctx.paragraphs);

    const totalParas = ctx.paragraphs.length;
    const totalChunks = Math.ceil(totalParas / EDITOR_CHUNK);

    try {
      if (mode === "report") {
        /* ═══ REPORT — also chunked for large chapters ═══ */
        const sysMsg = `Professional ${ctx.genreStr} editor. ${ctx.brief} Flag real issues only. JSON.`;
        const allIssues: EditorialIssue[] = [];

        for (let c = 0; c < totalChunks; c++) {
          const start = c * EDITOR_CHUNK;
          const slice = ctx.paragraphs.slice(start, start + EDITOR_CHUNK);
          const numbered = slice.map((p, i) => `[${start + i}] ${p}`).join("\n\n");
          setEditorLoadingPhase(`Scanning ${c + 1}/${totalChunks}...`);

          const prompt = [
            "Return ONLY valid JSON:",
            `{"issues":[{"severity":"high|medium|low","category":"Consistency|Character|Continuity|Placement|Repetition|Prose|Genre","quote":"excerpt","issue":"desc","suggestion":"fix"}]}`,
            "Max 4 issues for this section. Evidence-based only.",
            "Flag character-placement and location-transition breaks (for example, a character is suddenly in a new place without transition).",
            "",
            numbered,
          ].join("\n");

          try {
            const data = await requestOpenRouterJson<{ issues?: EditorialIssue[] }>(
              prompt, 500, { timeoutMs: 180000, systemMessage: sysMsg },
            );
            if (Array.isArray(data?.issues)) allIssues.push(...data.issues);
          } catch {
            /* If one chunk fails, continue with the rest */
          }
        }

        setEditorResult({
          mode: "report",
          issues: allIssues,
          summary: allIssues.length > 0 ? `Found ${allIssues.length} issue(s) across ${totalChunks} section(s).` : "No issues found.",
        });

      } else {
        /* ═══ QUICK FIX / TARGETED — chunked bursts ═══ */
        const focusMap: Record<TargetedFocus, string> = {
          pacing: "tighten pacing/transitions",
          dialogue: "sharpen dialogue/voices",
          tension: "increase tension/suspense",
          exposition: "reduce exposition, show don't tell",
          action: "clarify action/choreography",
        };
        const isTargeted = mode === "targeted";
        const focus = isTargeted ? focusMap[targetedFocus ?? "pacing"] : "";

        const sysMsg = isTargeted
          ? `Professional ${ctx.genreStr} editor. ${ctx.brief} TARGETED: ${focus}. Preserve voice. Never invent plot.`
          : `Professional ${ctx.genreStr} editor. ${ctx.brief} Quick polish: fix continuity, repetition, tighten prose, and catch scene-placement continuity errors (character location jumps without transitions). Preserve voice. Never invent plot.`;

        const taskLine = isTargeted
          ? `Focus: ${focus}. Change ONLY paragraphs where this applies.`
          : "Fix continuity, repetition, weak prose, dialogue, and location/placement inconsistencies between adjacent blocs. Do NOT add plot/characters.";

        const allChanges: EditorChange[] = [];

        for (let c = 0; c < totalChunks; c++) {
          const start = c * EDITOR_CHUNK;
          const slice = ctx.paragraphs.slice(start, start + EDITOR_CHUNK);
          setEditorLoadingPhase(`Editing ${c + 1}/${totalChunks}...`);

          try {
            const chunkChanges = await editorChunkCall(slice, start, sysMsg, taskLine);
            allChanges.push(...chunkChanges);
            /* Progressive update — show results as they come in */
            setEditorResult({
              mode,
              changes: [...allChanges],
              summary: `Processed ${Math.min((c + 1) * EDITOR_CHUNK, totalParas)}/${totalParas} paragraphs — ${allChanges.length} edit(s) so far...`,
            });
          } catch {
            /* If one chunk fails, continue with the rest */
          }
        }

        setEditorResult({
          mode,
          changes: allChanges,
          summary: allChanges.length > 0
            ? `${allChanges.length} edit(s) across ${totalParas} paragraphs.`
            : "No changes needed. Chapter looks clean.",
        });
      }
    } catch (err) {
      setEditorResult(null);
      setEditorError(err instanceof Error ? err.message : "The Editor failed. Try again.");
    } finally {
      setEditorLoadingPhase(null);
    }
  }

  /** Report → Fix bridge — also chunked */
  async function runEditorFixIssues(issues: EditorialIssue[]) {
    if (!activeChapter || !novel || !ensureStoryAiReady()) return;
    const ctx = getEditorContext();
    if (!ctx) return;

    setEditorError(null);
    setEditorResult(null);
    setEditorOriginalParagraphs(ctx.paragraphs);

    const totalParas = ctx.paragraphs.length;
    const totalChunks = Math.ceil(totalParas / EDITOR_CHUNK);

    const issueList = issues.map((iss, i) =>
      `${i + 1}. [${iss.severity}] ${iss.issue}${iss.quote ? ` ("${iss.quote}")` : ""}`
    ).join("\n");

    const sysMsg = `Professional ${ctx.genreStr} editor. Fix ONLY listed issues. Preserve voice.`;
    const allChanges: EditorChange[] = [];

    try {
      for (let c = 0; c < totalChunks; c++) {
        const start = c * EDITOR_CHUNK;
        const slice = ctx.paragraphs.slice(start, start + EDITOR_CHUNK);
        const numbered = slice.map((p, i) => `[${start + i}] ${p}`).join("\n\n");
        setEditorLoadingPhase(`Fixing ${c + 1}/${totalChunks}...`);

        const prompt = [
          "Fix ONLY these issues in the paragraphs below. Return JSON:",
          `{"edits":[{"p":0,"text":"revised","reason":"which issue"}]}`,
          "Omit unchanged. If none affected return {\"edits\":[]}",
          "",
          `Issues: ${issueList}`,
          "",
          numbered,
        ].join("\n");

        try {
          const data = await requestOpenRouterJson<{
            edits?: Array<{ p?: number; text?: string; reason?: string }>;
          }>(prompt, 600, { timeoutMs: 180000, systemMessage: sysMsg });

          const edits = Array.isArray(data?.edits) ? data.edits : [];
          for (const e of edits) {
            const idx = typeof e.p === "number" ? e.p : -1;
            const text = typeof e.text === "string" ? e.text.trim() : "";
            const localIdx = idx - start;
            if (localIdx < 0 || localIdx >= slice.length || !text) continue;
            if (text === slice[localIdx].trim()) continue;
            allChanges.push({
              paragraphIndex: idx, original: slice[localIdx], revised: text,
              reason: typeof e.reason === "string" ? e.reason : "Issue fix",
              accepted: null,
            });
          }

          setEditorResult({
            mode: "quick-fix",
            changes: [...allChanges],
            summary: `Fixing... ${c + 1}/${totalChunks} sections checked.`,
          });
        } catch { /* continue */ }
      }

      setEditorResult({
        mode: "quick-fix",
        changes: allChanges,
        summary: allChanges.length > 0
          ? `Fixed ${allChanges.length} paragraph(s).`
          : "No paragraphs needed changes for these issues.",
      });
    } catch (err) {
      setEditorResult(null);
      setEditorError(err instanceof Error ? err.message : "Failed to fix issues. Try again.");
    } finally {
      setEditorLoadingPhase(null);
    }
  }

  function addV2Character() {
    if (!novel) return;
    const newChar = {
      id: `charv2-${Date.now()}`,
      name: "New Character",
      role: "Protagonist" as CharacterRole,
      logline: "",
      appearance: "",
      personality: "",
      goals: "",
      fears: "",
      backstory: "",
      secrets: "",
      readerSecretHint: "",
      accent: "",
      speakingStyle: "",
      reactionPattern: "",
      relationships: [],
      voiceNotes: "",
      tags: [],
      pronouns: "",
      groups: "",
      otherNames: "",
    };
    updateStoryBible({ characters: [...(novel.storyBible.characters || []), newChar] });
    setSelectedV2CharacterId(newChar.id);
  }

  function updateV2Character(id: string, patch: Partial<NonNullable<Novel["storyBible"]["characters"][number]>>) {
    if (!novel) return;
    updateStoryBible({
      characters: (novel.storyBible.characters || []).map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  }

  function removeV2Character(id: string) {
    if (!novel) return;
    updateStoryBible({
      characters: (novel.storyBible.characters || []).filter((c) => c.id !== id),
    });
    if (selectedV2CharacterId === id) setSelectedV2CharacterId(null);
  }

  function addCharacterRelationship(characterId: string) {
    if (!novel) return;
    const character = storyCharacters.find((item) => item.id === characterId);
    if (!character) return;
    const firstTargetId = storyCharacters.find((item) => item.id !== characterId)?.id ?? "";
    const nextRelationships = [...(character.relationships ?? []), { targetCharacterId: firstTargetId, type: "" }];
    updateV2Character(characterId, { relationships: nextRelationships });
  }

  function updateCharacterRelationship(
    characterId: string,
    relationshipIndex: number,
    patch: Partial<Relationship>,
  ) {
    if (!novel) return;
    const character = storyCharacters.find((item) => item.id === characterId);
    if (!character) return;
    const relationships = [...(character.relationships ?? [])];
    if (!relationships[relationshipIndex]) return;
    relationships[relationshipIndex] = {
      ...relationships[relationshipIndex],
      ...patch,
    };
    updateV2Character(characterId, { relationships });
  }

  function removeCharacterRelationship(characterId: string, relationshipIndex: number) {
    if (!novel) return;
    const character = storyCharacters.find((item) => item.id === characterId);
    if (!character) return;
    const relationships = [...(character.relationships ?? [])].filter((_, index) => index !== relationshipIndex);
    updateV2Character(characterId, { relationships });
  }

  function addLocation() {
    if (!novel) return;
    const nextIndex = (novel.storyBible.locations?.length ?? 0) + 1;
    const newLocation = {
      id: createEntityId("loc"),
      name: `Location ${nextIndex}`,
      description: "",
      type: "",
      sensoryDetails: "",
      rules: "",
      significance: "",
      tags: [],
    };
    updateStoryBible({
      locations: [...(novel.storyBible.locations ?? []), newLocation],
    });
  }

  function updateLocation(
    locationId: string,
    patch: Partial<NonNullable<Novel["storyBible"]["locations"][number]>>,
  ) {
    if (!novel) return;
    updateStoryBible({
      locations: (novel.storyBible.locations ?? []).map((location) =>
        location.id === locationId ? { ...location, ...patch } : location,
      ),
    });
  }

  function updateLocationName(locationId: string, name: string) {
    updateLocation(locationId, { name });
    setLocationLookupCache((current) => {
      if (!(locationId in current)) return current;
      const next = { ...current };
      delete next[locationId];
      return next;
    });
  }

  function removeLocation(locationId: string) {
    if (!novel) return;
    updateStoryBible({
      locations: (novel.storyBible.locations ?? []).filter((location) => location.id !== locationId),
    });
    setLocationLookupCache((current) => {
      if (!(locationId in current)) return current;
      const next = { ...current };
      delete next[locationId];
      return next;
    });
    if (locationLookupBusyId === locationId) setLocationLookupBusyId(null);
  }

  function addLoreEntry() {
    if (!novel) return;
    const nextIndex = (novel.storyBible.lore?.length ?? 0) + 1;
    const newEntry = {
      id: createEntityId("lore"),
      title: `Lore Entry ${nextIndex}`,
      category: "Other" as const,
      content: "",
      constraints: [],
    };
    updateStoryBible({
      lore: [...(novel.storyBible.lore ?? []), newEntry],
    });
  }

  function updateLoreEntry(
    loreId: string,
    patch: Partial<NonNullable<Novel["storyBible"]["lore"][number]>>,
  ) {
    if (!novel) return;
    updateStoryBible({
      lore: (novel.storyBible.lore ?? []).map((entry) => (entry.id === loreId ? { ...entry, ...patch } : entry)),
    });
  }

  function removeLoreEntry(loreId: string) {
    if (!novel) return;
    updateStoryBible({
      lore: (novel.storyBible.lore ?? []).filter((entry) => entry.id !== loreId),
    });
  }

  // ── Bolt-On plugins ──
  function addBolton(category: BoltonCategory = "custom") {
    if (!novel) return;
    const existing = novel.storyBible.boltons ?? [];
    if (existing.length >= 10) return;
    const categoryMeta = getBoltonCategoryMeta(category);
    const newBolton: Bolton = {
      id: createEntityId("bolton"),
      title: category === "custom" ? "" : `${categoryMeta.label} Plugin`,
      category,
      description: "",
      prompt: "",
      createdAt: new Date().toISOString(),
    };
    updateStoryBible({ boltons: [...existing, newBolton] });
  }

  function updateBolton(boltonId: string, patch: Partial<Bolton>) {
    if (!novel) return;
    const nextPatch: Partial<Bolton> = { ...patch };
    if ("category" in nextPatch) {
      nextPatch.category = normalizeBoltonCategory(nextPatch.category);
    }
    if ("prompt" in nextPatch && typeof nextPatch.prompt === "string") {
      nextPatch.prompt = clampPromptText(nextPatch.prompt, 500);
    }
    if ("description" in nextPatch && typeof nextPatch.description === "string") {
      // Don't clamp while typing — only enforce max length.
      // clampPromptText trims trailing spaces, which prevents spacebar from working.
      nextPatch.description = nextPatch.description.slice(0, 500);
    }
    updateStoryBible({
      boltons: (novel.storyBible.boltons ?? []).map((b) =>
        b.id === boltonId ? { ...b, ...nextPatch } : b,
      ),
    });
  }

  function removeBolton(boltonId: string) {
    if (!novel) return;
    setChapterBoltonByChapterId((current) => {
      const next: Record<string, string> = {};
      for (const [chapterId, selectedId] of Object.entries(current)) {
        if (selectedId !== boltonId) next[chapterId] = selectedId;
      }
      return next;
    });
    updateStoryBible({
      boltons: (novel.storyBible.boltons ?? []).filter((b) => b.id !== boltonId),
    });
  }

  function setChapterBoltonForActiveChapter(nextBoltonId: string) {
    if (!activeChapter) return;
    const normalized = nextBoltonId.trim();
    setChapterBoltonByChapterId((current) => {
      const next = { ...current };
      if (normalized) next[activeChapter.id] = normalized;
      else delete next[activeChapter.id];
      return next;
    });
    const { blocks, hasBlocks } = parseChapterBlocks(activeChapter.content);
    if (!hasBlocks || blocks.length === 0) return;
    const aligned = blocks.map((block) => ({ ...block, notes: normalized }));
    updateChapter(activeChapter.id, { content: serializeChapterBlocks(aligned) });
  }

  async function saveBoltonLibrary() {
    if (!novel || typeof window === "undefined") return;
    const source = (novel.storyBible.boltons ?? [])
      .map((bolton) => ({
        title: clampText(bolton.title, 40),
        description: clampPromptText(bolton.description || "", 500),
        prompt: clampPromptText(bolton.prompt || "", 500),
        category: normalizeBoltonCategory(bolton.category),
      }))
      .filter((item) => item.title || item.description || item.prompt);
    window.localStorage.setItem(BOLTON_LIBRARY_KEY, JSON.stringify(source));
    setBoltonLibraryCount(source.length);
    const syncOk = await saveSettingsToServer(gatherSettings());
    const now = new Date().toISOString();
    setAutosaveStatus({
      status: syncOk ? "ok" : "error",
      message: syncOk
        ? `Saved ${source.length} bolt-on plugin${source.length === 1 ? "" : "s"}`
        : "Saved locally, but cloud sync failed.",
      at: now,
    });
  }

  function loadBoltonLibrary() {
    if (!novel) return;
    const library = readBoltonLibrary();
    setBoltonLibraryCount(library.length);
    if (library.length === 0) return;

    const existing = novel.storyBible.boltons ?? [];
    const seen = new Set(existing.map((item) => `${item.title.trim().toLowerCase()}|${item.description.trim().toLowerCase()}`));
    const merged = [...existing];

    for (const item of library) {
      if (merged.length >= 10) break;
      const key = `${item.title.trim().toLowerCase()}|${item.description.trim().toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push({
        id: createEntityId("bolton"),
        title: item.title || "Imported Plugin",
        category: normalizeBoltonCategory(item.category),
        description: item.description || "",
        prompt: item.prompt || "",
        createdAt: new Date().toISOString(),
      });
    }

    updateStoryBible({ boltons: merged });
  }

  async function sharpenBolton(boltonId: string) {
    if (!novel || !ensureStoryAiReady()) return;
    const bolton = (novel.storyBible.boltons ?? []).find((b) => b.id === boltonId);
    if (!bolton || !bolton.description.trim()) return;
    setStoryAiBusyAction(`bolton-${boltonId}`);
    setStoryAiError(null);
    try {
      const genre = novel.storyBible.summary.genre.join(", ") || "not set";
      const tone = novel.storyBible.summary.tone.join(", ") || "not set";
      const styleRules = novel.storyBible.styleVoice?.voiceRules?.slice(0, 300) || "";
      const pov = novel.storyBible.styleVoice?.pov || "";
      const categoryMeta = getBoltonCategoryMeta(bolton.category);
      const systemMsg = "You are a creative writing AI director. You convert author instructions into sharp prose directives that a text-generation AI can follow precisely. Return only valid JSON.";
      const prompt = [
        "Turn this user instruction into a short directive that will be injected into chapter/bloc generation.",
        "Output must be a single actionable instruction under 500 characters.",
        "Prioritize clear verbs, explicit constraints, and the highest-impact writing behavior.",
        "The directive must help the AI prioritize this plugin while still respecting canon and scene continuity.",
        "Return JSON only: { \"prompt\": \"the sharpened directive\" }",
        "",
        `User instruction: ${bolton.description}`,
        bolton.title ? `Context label: ${bolton.title}` : "",
        `Plugin category: ${categoryMeta.label}`,
        "",
        `Novel genre: ${genre}`,
        `Novel tone: ${tone}`,
        pov ? `POV: ${pov}` : "",
        styleRules ? `Style rules: ${styleRules}` : "",
      ].filter(Boolean).join("\n");
      const data = await requestOpenRouterJson<{ prompt?: string }>(prompt, 300, { systemMessage: systemMsg });
      if (typeof data.prompt === "string" && data.prompt.trim()) {
        updateBolton(boltonId, { prompt: clampPromptText(data.prompt, 500) });
      }
    } catch (error) {
      setStoryAiError(error instanceof Error ? error.message : "Unable to sharpen Bolt-On.");
    } finally {
      setStoryAiBusyAction(null);
    }
  }

  async function runGenerateWorldbuildingFromStoryBible() {
    if (!novel || !ensureStoryAiReady()) return;
    setStoryAiBusyAction("worldbuilding-generate");
    setStoryAiError(null);
    try {
      const sb = novel.storyBible;
      const synopsis = sb.summary.synopsisShort?.trim() || "";
      const stakes = sb.summary.stakes?.trim() || "";
      const genre = sb.summary.genre.slice(0, 4).join(", ") || "fiction";
      const tone = sb.summary.tone.slice(0, 3).join(", ") || "";
      const themes = (sb.summary.themes ?? []).slice(0, 5).join(", ");
      const charNames = (sb.characters ?? []).map((c) => c.name).filter(Boolean).join(", ") || "none";
      const locNames = storyLocations.map((l) => l.name).filter(Boolean).join(", ") || "none";
      const existingLoreNames = (sb.lore ?? []).map((e) => e.title).filter(Boolean).join(", ") || "none";

      const synopsisBlock = [synopsis, stakes ? `Stakes: ${stakes}` : "", themes ? `Themes: ${themes}` : ""].filter(Boolean).join("\n");

      const sysMsg = "Worldbuilding architect. Create ONLY lore (rules, systems, culture, history). NO characters or locations. Return valid JSON.";

      const userPrompt = [
        `${genre} novel${tone ? ` (${tone})` : ""}. ${synopsisBlock}`,
        existingLoreNames !== "none" ? `Existing (skip): ${existingLoreNames}` : "",
        `Create 4-8 lore entries. Return JSON:`,
        `{"entries":[{"title":"Name","category":"Magic|Tech|Culture|History|Religion|Politics|Other","content":"2-4 sentences","constraints":["rule the story must follow"]}]}`,
      ].filter(Boolean).join("\n");

      // ── Call WITHOUT jsonMode — works with any model ──
      type LoreGenResult = {
        entries?: Array<{
          title?: string;
          category?: "Magic" | "Tech" | "Culture" | "History" | "Religion" | "Politics" | "Other";
          content?: string;
          constraints?: string[];
        }>;
      };

      let data: LoreGenResult | null = null;

      try {
        const raw = await requestOpenRouterText(userPrompt, 800, 180000, sysMsg, false, 0.7);
        data = parseJsonFromAi<LoreGenResult>(raw);
      } catch { /* continue */ }

      if (!data || !Array.isArray(data.entries) || data.entries.length === 0) {
        try {
          const retryPrompt = userPrompt + "\n\nReturn ONLY valid JSON.";
          const raw2 = await requestOpenRouterText(retryPrompt, 800, 180000, sysMsg, false, 0.4);
          data = parseJsonFromAi<LoreGenResult>(raw2);
        } catch { /* continue */ }
      }

      if (!data || !Array.isArray(data.entries) || data.entries.length === 0) {
        throw new Error("Worldbuilding generation failed. Try a different model or add more detail to your synopsis.");
      }

      const VALID_CATEGORIES = new Set(["Magic", "Tech", "Culture", "History", "Religion", "Politics", "Other"]);

      const charNamesLowerLore = new Set((sb.characters ?? []).map((c) => c.name.trim().toLowerCase()).filter(Boolean));
      const locNamesLowerLore = new Set(storyLocations.map((l) => l.name.trim().toLowerCase()).filter(Boolean));

      function isNotLore(entry: { title?: string; content?: string; category?: string }): boolean {
        const title = (entry.title ?? "").trim();
        if (!title) return true;
        const lower = title.toLowerCase();
        // Matches a character name — it's a character bio, not lore
        if (charNamesLowerLore.has(lower)) return true;
        for (const cn of charNamesLowerLore) {
          if (cn && lower === cn) return true;
        }
        // Matches a location name — it's a place description, not lore
        if (locNamesLowerLore.has(lower)) return true;
        for (const ln of locNamesLowerLore) {
          if (ln && lower === ln) return true;
        }
        // Placeholder titles
        if (/^(lore \d|entry \d|lore entry|new entry|unnamed|unknown|n\/a|worldbuilding \d)/i.test(title)) return true;
        // Content describes a person, not a world rule
        const content = (entry.content ?? "").toLowerCase();
        if (content && /^(a |an |the )?(young |old |brave |wise )?(man|woman|boy|girl|warrior|knight|mage|wizard) (who|that|with)\b/i.test(content)) return true;
        // Content describes a physical place, not lore
        if (content && /^(a |an |the )?(sprawling|vast|hidden|remote|ancient|small|large|fortified) (city|town|village|forest|mountain|castle|fortress|temple|palace|tower)\b/i.test(content)) return true;
        return false;
      }

      const generated = data.entries
        .map((item) => {
          const title = typeof item.title === "string" ? item.title.trim() : "";
          const content = typeof item.content === "string" ? item.content.trim() : "";
          if (!title || !content) return null;
          if (isNotLore(item)) return null;
          const cat = VALID_CATEGORIES.has(item.category ?? "") ? item.category! : "Other";
          return {
            id: createEntityId("lore"),
            title,
            category: cat,
            content,
            constraints: parseStringList(item.constraints),
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      if (!generated.length) {
        throw new Error("Assistant did not return usable lore entries.");
      }

      const existing = sb.lore ?? [];
      const byTitle = new Map(existing.map((entry, index) => [entry.title.trim().toLowerCase(), index]));
      const merged = [...existing];
      for (const entry of generated) {
        const key = entry.title.trim().toLowerCase();
        if (!key) continue;
        const existingIndex = byTitle.get(key);
        if (existingIndex === undefined) {
          merged.push(entry);
          byTitle.set(key, merged.length - 1);
        } else {
          const current = merged[existingIndex];
          merged[existingIndex] = {
            ...current,
            category: current.category || entry.category,
            content: current.content.trim() ? current.content : entry.content,
            constraints:
              (current.constraints?.length ?? 0) > 0
                ? current.constraints
                : entry.constraints,
          };
        }
      }
      updateStoryBible({ lore: merged });
    } catch (error) {
      setStoryAiError(error instanceof Error ? error.message : "Unable to generate worldbuilding.");
    } finally {
      setStoryAiBusyAction(null);
    }
  }

  async function runEnhanceLoreEntry(loreId: string) {
    if (!novel || !ensureStoryAiReady()) return;
    const entry = (novel.storyBible.lore ?? []).find((item) => item.id === loreId);
    if (!entry) return;
    setStoryAiBusyAction(`lore-${loreId}`);
    setStoryAiError(null);
    try {
      const context = buildStoryBibleContext("lore");
      // Gather constraints from related lore entries to preserve cross-references
      const relatedConstraints = (novel.storyBible.lore ?? [])
        .filter((e) => e.id !== loreId && (e.constraints ?? []).length > 0)
        .slice(0, 5)
        .map((e) => `${e.title}: ${e.constraints!.join("; ")}`)
        .join("\n");
      const systemMsg = "You are a worldbuilding editor. Refine lore entries for clarity and drafting use while preserving all established constraints and cross-references. Return only valid JSON.";
      const prompt = [
        "Refine this worldbuilding entry for clarity and practical drafting use.",
        "Preserve existing constraints and ensure consistency with related lore entries.",
        "Return JSON only in this shape:",
        `{
  "title": "string",
  "category": "Magic|Tech|Culture|History|Religion|Politics|Other",
  "content": "string",
  "constraints": ["string"]
}`,
        "Keep this entry consistent with Canon. Do not remove existing constraints unless they directly contradict Canon.",
        `Entry title: ${entry.title}`,
        `Entry category: ${entry.category}`,
        `Entry content:\n${entry.content || "(empty)"}`,
        `Entry constraints: ${(entry.constraints ?? []).join(", ") || "(none)"}`,
        relatedConstraints ? `Related lore constraints (preserve cross-references):\n${relatedConstraints}` : "",
        `Story context:\n${context}`,
      ].filter(Boolean).join("\n\n");

      const data = await requestOpenRouterJson<{
        title?: string;
        category?: "Magic" | "Tech" | "Culture" | "History" | "Religion" | "Politics" | "Other";
        content?: string;
        constraints?: string[];
      }>(prompt, 650, { systemMessage: systemMsg });

      updateLoreEntry(loreId, {
        title: typeof data.title === "string" && data.title.trim() ? data.title.trim() : entry.title,
        category: data.category ?? entry.category,
        content: typeof data.content === "string" && data.content.trim() ? data.content.trim() : entry.content,
        constraints: parseStringList(data.constraints),
      });
    } catch (error) {
      setStoryAiError(error instanceof Error ? error.message : "Unable to improve lore entry.");
    } finally {
      setStoryAiBusyAction(null);
    }
  }

  async function lookupLocationFromRealWorld(locationId: string, force = true) {
    if (!novel) return;
    const location = storyLocations.find((item) => item.id === locationId);
    if (!location) return;

    const locationName = location.name.trim();
    if (!locationName) {
      setStoryAiError("Enter a location name first.");
      return;
    }

    const normalizedName = locationName.toLowerCase();
    if (!force && locationLookupCache[locationId] === normalizedName) {
      return;
    }

    setLocationLookupBusyId(locationId);
    setLocationLookupMessage(null);
    setStoryAiError(null);
    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 30000);
      const response = await fetch("/api/location/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: locationName }),
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);
      const payload = (await response.json().catch(() => null)) as
        | {
            found?: boolean;
            summary?: string;
            type?: string;
            name?: string;
            displayName?: string;
            source?: string;
            error?: string;
          }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error || "Location lookup failed.");
      }

      if (!payload?.found || !payload.summary?.trim()) {
        setLocationLookupCache((current) => ({ ...current, [locationId]: normalizedName }));
        setStoryAiError(payload?.error || `No real-world location match was found for "${locationName}".`);
        return;
      }

      updateLocation(locationId, {
        description: payload.summary.trim(),
        type: location.type?.trim() ? location.type : payload.type ?? location.type ?? "",
      });
      setLocationLookupCache((current) => ({ ...current, [locationId]: normalizedName }));
      const sourceLabel = payload.source ? ` (${payload.source})` : "";
      const matchedName = payload.name?.trim() || locationName;
      setLocationLookupMessage(`Loaded real-world reference for ${matchedName}${sourceLabel}.`);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStoryAiError("Location lookup timed out. Please try again.");
      } else {
        setStoryAiError(error instanceof Error ? error.message : "Unable to look up this location.");
      }
    } finally {
      setLocationLookupBusyId(null);
    }
  }

  async function runGenerateLocationsFromStoryBible() {
    if (!novel || !ensureStoryAiReady()) return;
    setStoryAiBusyAction("locations-generate");
    setStoryAiError(null);
    setLocationLookupMessage(null);

    try {
      const sb = novel.storyBible;
      const synopsis = sb.summary.synopsisShort?.trim() || "";
      const stakes = sb.summary.stakes?.trim() || "";
      const genre = sb.summary.genre.slice(0, 4).join(", ") || "fiction";
      const tone = sb.summary.tone.slice(0, 3).join(", ") || "";
      const themes = (sb.summary.themes ?? []).slice(0, 5).join(", ");
      const charNames = (sb.characters ?? []).map((c) => c.name).filter(Boolean).join(", ") || "none";
      const existingLocNames = storyLocations.map((l) => l.name.trim()).filter(Boolean).join(", ") || "none";

      const synopsisBlock = [synopsis, stakes ? `Stakes: ${stakes}` : "", themes ? `Themes: ${themes}` : ""].filter(Boolean).join("\n");

      const sysMsg = "Location designer. Create ONLY physical places. NO characters, factions, or lore. Return valid JSON.";

      const userPrompt = [
        `${genre} novel${tone ? ` (${tone})` : ""}. ${synopsisBlock}`,
        existingLocNames !== "none" ? `Existing (skip): ${existingLocNames}` : "",
        `Create 4-8 locations. Return JSON:`,
        `{"locations":[{"name":"Place Name","description":"2-3 sentences","type":"City|Building|Wilderness|Region|Residence|Other"}]}`,
      ].filter(Boolean).join("\n");

      // ── Call WITHOUT jsonMode — works with any model ──
      type LocGenResult = {
        locations?: Array<{ name?: string; description?: string; type?: string }>;
      };

      let data: LocGenResult | null = null;

      try {
        const raw = await requestOpenRouterText(userPrompt, 700, 180000, sysMsg, false, 0.7);
        data = parseJsonFromAi<LocGenResult>(raw);
      } catch { /* continue */ }

      if (!data || !Array.isArray(data.locations) || data.locations.length === 0) {
        try {
          const retryPrompt = userPrompt + "\n\nReturn ONLY valid JSON.";
          const raw2 = await requestOpenRouterText(retryPrompt, 700, 180000, sysMsg, false, 0.4);
          data = parseJsonFromAi<LocGenResult>(raw2);
        } catch { /* continue */ }
      }

      if (!data || !Array.isArray(data.locations) || data.locations.length === 0) {
        throw new Error("Location generation failed. Try a different model or add more detail to your synopsis.");
      }

      // Filter: reject characters, organisations, lore masquerading as locations
      const charNamesLower = new Set((sb.characters ?? []).map((c) => c.name.trim().toLowerCase()).filter(Boolean));
      // Also build first-name and last-name sets for partial matching
      const charNameParts = new Set<string>();
      for (const c of sb.characters ?? []) {
        for (const part of c.name.trim().toLowerCase().split(/\s+/)) {
          if (part.length > 2) charNameParts.add(part);
        }
      }
      const loreNamesLower = new Set((sb.lore ?? []).map((l) => l.title?.trim().toLowerCase()).filter(Boolean));

      function isNotALocation(entry: { name?: string; description?: string; type?: string }): boolean {
        const name = (entry.name ?? "").trim();
        if (!name) return true;
        const lower = name.toLowerCase();
        const words = lower.split(/\s+/).filter(Boolean);
        // Exact match with a character name
        if (charNamesLower.has(lower)) return true;
        // Partial match — if the location name IS a character's first or last name
        if (words.length <= 2 && words.every((w) => charNameParts.has(w))) return true;
        // Matches a lore entry
        if (loreNamesLower.has(lower)) return true;
        // Placeholder names
        if (/^(location \d|new location|place \d|unnamed|unknown|n\/a|lore \d|entry \d)/i.test(name)) return true;
        // Description sounds like a person bio
        const desc = (entry.description ?? "").toLowerCase();
        if (desc && /^(a |an |the )?(young |old |brave |wise |cunning |fierce |gentle |quiet |tall |short )?(man|woman|boy|girl|warrior|knight|mage|wizard|witch|queen|king|prince|princess|thief|assassin|priest|priestess|healer|merchant|farmer|soldier|captain|general|lord|lady|duke|duchess|orphan|scholar|blacksmith|bard|ranger|druid|paladin|monk|rogue|sorcerer|sorceress|necromancer|alchemist|detective|spy|hunter|sailor|pirate|noble|servant|slave|gladiator|chef|artist|poet|musician|inventor|scientist|doctor|nurse|teacher|student|child|elder|chief|warden|guardian|sentinel|champion)\b/.test(desc)) return true;
        // Description sounds like lore/rules
        if (desc && /^(a |an |the )?(system|rule|law|custom|tradition|belief|magic|spell|ritual|prophecy|legend|myth|code|pact|treaty|curse|blessing|practice|philosophy|covenant|doctrine|mandate|edict|decree|tenet|principle|creed|ideology|movement|rebellion|revolution|conspiracy)\b/.test(desc)) return true;
        // Type field is suspicious
        const type = (entry.type ?? "").toLowerCase();
        if (/\b(person|character|faction|guild|order|organisation|organization|alliance|council|rule|system|magic|lore|creature|beast|monster|spirit|deity|god|goddess)\b/.test(type)) return true;
        return false;
      }

      const generatedLocations = data.locations
        .map((item) => {
          const name = typeof item.name === "string" ? item.name.trim() : "";
          const description = typeof item.description === "string" ? item.description.trim() : "";
          if (!name || !description) return null;
          if (isNotALocation(item)) return null;
          return {
            id: createEntityId("loc"),
            name,
            description,
            type: typeof item.type === "string" ? item.type.trim() : "",
            sensoryDetails: "",
            rules: "",
            significance: "",
            tags: [],
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      if (generatedLocations.length === 0) {
        throw new Error("Assistant did not return usable locations.");
      }

      const nextLocations = [...storyLocations];
      const byName = new Map<string, number>();
      nextLocations.forEach((location, index) => {
        const key = location.name.trim().toLowerCase();
        if (key) byName.set(key, index);
      });

      generatedLocations.forEach((generatedLocation) => {
        const key = generatedLocation.name.trim().toLowerCase();
        if (!key) return;
        const existingIndex = byName.get(key);
        if (existingIndex === undefined) {
          nextLocations.push(generatedLocation);
          byName.set(key, nextLocations.length - 1);
          return;
        }
        const current = nextLocations[existingIndex];
        nextLocations[existingIndex] = {
          ...current,
          description: current.description.trim() ? current.description : generatedLocation.description,
          type: current.type?.trim() ? current.type : generatedLocation.type,
        };
      });

      updateStoryBible({ locations: nextLocations });
      setLocationLookupMessage(
        `Generated ${generatedLocations.length} location${generatedLocations.length === 1 ? "" : "s"} from your Canon.`,
      );
    } catch (error) {
      setStoryAiError(error instanceof Error ? error.message : "Unable to generate locations.");
    } finally {
      setStoryAiBusyAction(null);
    }
  }

  function addKeyEvent() {
    if (!novel) return;
    const nextIndex = (novel.storyBible.timeline?.length ?? 0) + 1;
    updateStoryBible({
      timeline: [
        ...(novel.storyBible.timeline ?? []),
        {
          id: createEntityId("event"),
          name: `Key Event ${nextIndex}`,
          summary: "",
          when: "",
          chapterId: "",
        },
      ],
    });
  }

  function updateKeyEvent(
    eventId: string,
    patch: Partial<NonNullable<Novel["storyBible"]["timeline"][number]>>,
  ) {
    if (!novel) return;
    updateStoryBible({
      timeline: (novel.storyBible.timeline ?? []).map((event) =>
        event.id === eventId ? { ...event, ...patch } : event,
      ),
    });
  }

  function removeKeyEvent(eventId: string) {
    if (!novel) return;
    updateStoryBible({
      timeline: (novel.storyBible.timeline ?? []).filter((event) => event.id !== eventId),
    });
  }

  function contentForExport(content: string): string {
    const { blocks, hasBlocks } = parseChapterBlocks(content);
    if (!hasBlocks || blocks.length === 0) {
      // No bloc delimiters — strip any stray delimiters just in case
      return content
        .replace(/<<<BLOCK>>>/g, "").replace(/<<<PROSE>>>/g, "")
        .replace(/<<<ENDBLOCK>>>/g, "").replace(/<<<META>>>/g, "")
        .replace(/<<<SYNOPSIS>>>/g, "").trim();
    }
    // Only return prose — never return raw bloc content
    return blocks.map((b) => b.prose).filter(Boolean).join("\n\n\n");
  }

  function getChaptersForExport(currentNovel: Novel) {
    if (exportScope === "all") return currentNovel.chapters;
    const selected = new Set(selectedExportChapterIds);
    return currentNovel.chapters.filter((chapter) => selected.has(chapter.id));
  }

  function openExportModal() {
    if (!novel) return;
    setExportFormat("epub");
    setExportScope("selected");
    setSelectedExportChapterIds(novel.chapters.map((chapter) => chapter.id));
    setExportError(null);
    setShowExportModal(true);
  }

  function toggleExportChapter(chapterId: string) {
    setSelectedExportChapterIds((current) => {
      if (current.includes(chapterId)) {
        return current.filter((id) => id !== chapterId);
      }
      return [...current, chapterId];
    });
  }

  async function exportNovel() {
    if (!novel || exportingFile) return;

    const chaptersToExport = getChaptersForExport(novel);
    if (chaptersToExport.length === 0) {
      setExportError("Select at least one chapter to export.");
      return;
    }

    setExportingFile(true);
    setExportError(null);

    try {
      const response = await fetch("/api/studio/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          format: exportFormat,
          novelTitle: novel.title,
          authorName: novel.authorName?.trim() || "",
          coverImage: exportFormat === "epub" ? novel.coverImage : null,
          chapters: chaptersToExport.map((chapter) => ({
            id: chapter.id,
            title: chapter.title,
            content: contentForExport(chapter.content),
          })),
        }),
      });

      if (!response.ok) {
        let message = "Export could not complete. Please try again.";
        if (response.status === 413) {
          message = "Export payload is too large. Try a smaller cover image.";
        }
        try {
          const payload = (await response.json()) as { error?: string };
          if (typeof payload.error === "string" && payload.error.trim()) {
            message = payload.error;
          }
        } catch {
          // No-op: keep fallback message.
        }
        setExportError(message);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const slug = novel.title.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "novel";
      link.href = url;
      link.download = `${slug}.${exportFormat}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setShowExportModal(false);
    } catch {
      setExportError("Export request failed. Please retry. If it still fails, try a smaller cover image.");
    } finally {
      setExportingFile(false);
    }
  }

  if (!novel) {
    // While server sync is in progress, show a loading state instead of "not found"
    if (!novelSyncDone) {
      return (
        <div className="pw-wallpaper">
          <div className="pw-window">
            <aside className="pw-sidebar">
              <div className="pw-logo">
                <img src="/blocwrite-main-dark.png" alt="Blocwrite" className="pw-logo-full" />
              </div>
              <div className="pw-sidebar-foot">Loading...</div>
            </aside>
            <section className="pw-home-main">
              <div className="pw-empty">
                <p className="pw-empty-title" style={{ opacity: 0.5 }}>Opening novel...</p>
              </div>
            </section>
          </div>
        </div>
      );
    }
    return (
      <div className="pw-wallpaper">
        <div className="pw-window">
          <aside className="pw-sidebar">
            <div className="pw-logo">
              <img src="/blocwrite-main-dark.png" alt="Blocwrite" className="pw-logo-full" />
            </div>
            <div className="pw-sidebar-foot">Novel not found.</div>
          </aside>
          <section className="pw-home-main">
            <div className="pw-empty">
              <p className="pw-empty-title">This novel does not exist.</p>
              <button type="button" className="btn btn-primary" onClick={() => router.push("/studio")}>
                Back to novels
              </button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  const totalWords = countNovelWords(novel);
  const chapterWords = activeChapter ? countChapterWords(activeChapter) : 0;
  const selectedChapterCount =
    exportScope === "all" ? novel.chapters.length : selectedExportChapterIds.length;
  const progress = Math.min(100, Math.round((totalWords / Math.max(novel.goalWords || 1, 1)) * 100));
  const grammarIsStale =
    !!activeChapter && !!lastCheckedContent && activeChapter.content !== lastCheckedContent;
  const visibleMatches = grammarMatches.filter((match) => {
    const key = getMatchKey(match);
    return !ignoredMatchKeys.includes(key);
  });
  const actionableMatchesCount = visibleMatches.filter(
    (match) => match.replacements && match.replacements.length > 0,
  ).length;
  const actionableInCurrentFilterCount = visibleMatches.filter(
    (match) =>
      (proofreadFilter === "all" || categorizeMatch(match) === proofreadFilter) &&
      match.replacements &&
      match.replacements.length > 0,
  ).length;
  const suggestionsPerThousandWords = Math.round((visibleMatches.length / Math.max(chapterWords, 1)) * 1000);
  const proofreadScore = Math.max(0, Math.min(100, Math.round(100 - suggestionsPerThousandWords * 3)));
  const autosaveLabel =
    autosaveStatus.status === "error"
      ? autosaveStatus.message
      : autosaveStatus.at
        ? `Saved ${new Date(autosaveStatus.at).toLocaleTimeString()}`
        : "Autosaving";
  const aiBusyLabel = (() => {
    if (!storyAiBusyAction) return null;
    if (storyAiBusyAction === "plan-generate") return "Building your chapter plan";
    if (storyAiBusyAction.startsWith("plan-regen-")) return "Regenerating chapter plan";
    if (storyAiBusyAction.startsWith("chapter-blocks-")) return "Generating chapter blocs";
    if (storyAiBusyAction.startsWith("block-")) return "Writing prose";
    if (storyAiBusyAction === "events-generate") return "Generating key events";
    if (storyAiBusyAction === "characters-generate") return "Generating characters";
    if (storyAiBusyAction === "locations-generate") return "Generating locations";
    if (storyAiBusyAction === "worldbuilding-generate") return "Generating lore";
    return "Working with AI";
  })();
  const aiBusyDuration =
    storyAiBusyElapsedSec < 60
      ? `${storyAiBusyElapsedSec}s`
      : `${Math.floor(storyAiBusyElapsedSec / 60)}m ${storyAiBusyElapsedSec % 60}s`;
  const allBoltons = novel?.storyBible.boltons ?? [];
  const visibleBoltons =
    boltonCategoryFilter === "all"
      ? allBoltons
      : allBoltons.filter((bolton) => normalizeBoltonCategory(bolton.category) === boltonCategoryFilter);
  const proofreadBuckets: Record<ProofreadCategoryId, Array<{ key: string; match: GrammarMatch }>> = {
    spelling: [],
    vocabulary: [],
    readability: [],
    grammar: [],
  };
  visibleMatches.forEach((match) => {
    const key = getMatchKey(match);
    const category = categorizeMatch(match);
    proofreadBuckets[category].push({ key, match });
  });
  const displayedCategories =
    proofreadFilter === "all"
      ? PROOFREAD_CATEGORIES
      : PROOFREAD_CATEGORIES.filter((category) => category.id === proofreadFilter);

  return (
    <div className="pw-wallpaper">
      <div className={`pw-window ${sidebarCollapsed ? "pw-sidebar-collapsed" : ""}`}>
        <aside className="pw-sidebar" onMouseEnter={handleSidebarEnter} onMouseLeave={handleSidebarLeave}>
          <div className="pw-logo">
            <div className="pw-logo-swap">
              <img src="/blocwrite-main-dark.png" alt="Blocwrite" className="pw-logo-full" />
              <img src={currentTheme === "dark" ? "/blocwrite-icon-dark.png" : "/blocwrite-icon-light.png"} alt="Bw" className="pw-logo-icon-img" />
            </div>
            <button type="button" className={`pw-collapse-btn ${sidebarPinned ? "pw-pin-active" : ""}`} onClick={toggleSidebarPin} title={sidebarPinned ? "Unpin sidebar" : "Pin sidebar open"}>
              <span style={{ fontWeight: 300, fontSize: 16, fontStyle: "italic", lineHeight: 1 }}>/</span>
            </button>
          </div>
          <Link href="/studio" className="pw-back-link">
            <span>← Back to novels</span>
          </Link>

          <div className="pw-section-title">MANUSCRIPT</div>
          <div className="pw-list">
            {novel.chapters.length === 0 ? (
              <div className="pw-item">
                <span>No chapters yet</span>
              </div>
            ) : (
              novel.chapters.map((chapter, idx) => (
                <div key={chapter.id} className="pw-chapter-row">
                  <button
                    type="button"
                    className={`pw-chapter-open ${activeChapterId === chapter.id ? "active" : ""}`}
                    data-num={String(idx + 1)}
                    onClick={() => setActiveChapterId(chapter.id)}
                  >
                    {chapter.title || "Untitled chapter"}
                  </button>
                  <button
                    type="button"
                    className="pw-chapter-delete"
                    onClick={() =>
                      setPendingChapterDelete({
                        id: chapter.id,
                        title: chapter.title || "Untitled chapter",
                      })
                    }
                    aria-label={`Delete ${chapter.title || "chapter"}`}
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>

          <button type="button" className="pw-item pw-new-chapter" onClick={handleCreateChapter}>
            + New chapter
          </button>

          <div className="pw-sidebar-foot">
            <span>{activeChapter ? "Editing chapter" : "Novel overview"}</span>
          </div>
        </aside>

        <div className="pw-topbar">
          <div className="pw-toolbar">
            <span className="pw-project-title">{novel.title || "Untitled Novel"}</span>
            <span className="pw-dot" />
            <button type="button" className="pw-mode-btn" onClick={() => setActiveChapterId(null)}>
              Overview
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="pw-theme-toggle" onClick={toggleTheme} title={`Switch to ${currentTheme === "dark" ? "light" : "dark"} mode`}>
              <span className="pw-theme-icon">{currentTheme === "dark" ? "☀" : "☽"}</span>
              <span style={{ fontSize: 12 }}>{currentTheme === "dark" ? "Light" : "Dark"}</span>
            </button>
            <div className="pw-pill">{totalWords.toLocaleString()} words</div>
            {!aiOff && (
            <button
              type="button"
              className="btn pw-proofread-btn"
              disabled={!activeChapter}
              onClick={() => activeChapter && setShowEditorModal(true)}
            >
              The Editor
            </button>
            )}
            <button type="button" className="btn btn-primary" onClick={() => setShowPlanModal(true)}>
              The Plan
            </button>
            <ProfileButton onClick={() => setProfileOpen(true)} />
            <Link
              href="/admin"
              className="pw-admin-link"
              title="Admin Hub"
              style={{
                fontSize: 11,
                padding: "5px 10px",
                borderRadius: 6,
                border: "1px solid var(--pw-border-light)",
                color: "var(--pw-text-dim)",
                textDecoration: "none",
                fontWeight: 500,
                transition: "color 0.15s, border-color 0.15s",
              }}
            >
              Admin
            </Link>
          </div>
        </div>

        <section className="pw-workspace-main">
          <div style={{ padding: "10px 20px 0", display: "grid", gap: 8 }}>
            <div
              style={{
                fontSize: 12,
                color: autosaveStatus.status === "error" ? "var(--pw-danger, #ef4444)" : "var(--pw-text-dim)",
              }}
            >
              {autosaveLabel}
            </div>
            {!showStoryBibleModal && !aiOff && storyAiBusyAction && aiBusyLabel && (
              <div style={{ fontSize: 12, color: "var(--pw-text-dim)" }}>
                {aiBusyLabel} - {aiBusyDuration} elapsed. Slow models get extra time automatically.
              </div>
            )}
            {!showStoryBibleModal && !aiOff && storyAiError && (
              <div className="pw-ora-error" style={{ margin: 0 }}>
                {storyAiError}
              </div>
            )}
          </div>
          {activeChapter ? (
            <div className="pw-editor-area">
              <div className="pw-editor-card">
                <input
                  className="pw-title w-full bg-transparent border-none focus:outline-none"
                  value={activeChapter.title}
                  onChange={(event) => updateChapter(activeChapter.id, { title: event.target.value })}
                  placeholder="Chapter title"
                  dir="ltr"
                />
                {(() => {
                  const ci = novel.chapters.findIndex((c) => c.id === activeChapter.id);
                  const pc = planChapters.find((p) => p.manuscriptChapterId === activeChapter.id) ?? planChapters[ci];
                  const overview = activeChapter.subtitle || pc?.synopsis || "";
                  if (!overview) return null;
                  return (
                    <span
                      className="pw-subtitle"
                      title={overview}
                      dir="ltr"
                    >
                      {overview}
                    </span>
                  );
                })()}
                <div className="pw-toolbar-row">
                  {!aiOff && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={storyAiBusyAction === `chapter-blocks-${activeChapter.id}`}
                    onClick={() => void runGenerateChapterBlocks()}
                  >
                    {storyAiBusyAction === `chapter-blocks-${activeChapter.id}` ? "Generating…" : "✦ Generate blocs"}
                  </button>
                  )}
                  {(() => {
                    const chIdx = novel.chapters.findIndex((c) => c.id === activeChapter.id);
                    const pc = planChapters.find((p) => p.manuscriptChapterId === activeChapter.id) ?? planChapters[chIdx];
                    const charIds = pc?.characterIds ?? [];
                    const locIds = pc?.locationIds ?? [];
                    const chars = charIds.map((id) => storyCharacters.find((c) => c.id === id)).filter(Boolean);
                    const locs = locIds.map((id) => storyLocations.find((l) => l.id === id)).filter(Boolean);
                    if (chars.length === 0 && locs.length === 0) return null;
                    return (
                      <div className="pw-entity-bar">
                        {chars.length > 0 && (
                          <div className="pw-entity-dot">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            <span className="pw-entity-dot-num">{chars.length}</span>
                            <div className="pw-entity-tip">
                              <div className="pw-entity-tip-head">Characters</div>
                              {chars.map((c) => (
                                <div key={c!.id} className="pw-entity-tip-row">
                                  <span className="pw-entity-tip-name">{c!.name}</span>
                                  {c!.role ? <span className="pw-entity-tip-tag">{c!.role}</span> : null}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {locs.length > 0 && (
                          <div className="pw-entity-dot">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            <span className="pw-entity-dot-num">{locs.length}</span>
                            <div className="pw-entity-tip">
                              <div className="pw-entity-tip-head">Locations</div>
                              {locs.map((l) => (
                                <div key={l!.id} className="pw-entity-tip-row">
                                  <span className="pw-entity-tip-name">{l!.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                    {(novel.storyBible.boltons ?? []).length > 0 && (
                      <div className="pw-chapter-bolton-wrap">
                        <button
                          type="button"
                          className={`pw-chapter-bolton-trigger ${chapterBoltonId ? "pw-bolton-active" : ""}`}
                          onClick={(e) => {
                            const dd = e.currentTarget.parentElement?.querySelector(".pw-block-bolton-dropdown");
                            if (dd) dd.classList.toggle("open");
                          }}
                          title={chapterBoltonId ? (() => { const bo = (novel.storyBible.boltons ?? []).find((b) => b.id === chapterBoltonId); return bo ? `Bolt-On: ${bo.title}\n${bo.prompt || bo.description || "No description"}` : "Bolt-On"; })() : "Apply Bolt-On to chapter"}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill={chapterBoltonId ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                          {chapterBoltonId && <span className="pw-chapter-bolton-name">{(novel.storyBible.boltons ?? []).find((b) => b.id === chapterBoltonId)?.title || "Bolt-On"}</span>}
                        </button>
                        <div className="pw-block-bolton-dropdown">
                          <div className="pw-bolton-dropdown-head">Chapter Bolt-On</div>
                          <button type="button" className={`pw-block-bolton-option ${!chapterBoltonId ? "active" : ""}`} onClick={(e) => { setChapterBoltonForActiveChapter(""); e.currentTarget.closest(".pw-block-bolton-dropdown")?.classList.remove("open"); }}>
                            <span className="pw-block-bolton-option-title">None</span>
                          </button>
                          {(novel.storyBible.boltons ?? []).map((b, i) => (
                            <button key={b.id} type="button" className={`pw-block-bolton-option ${chapterBoltonId === b.id ? "active" : ""}`} onClick={(e) => { setChapterBoltonForActiveChapter(b.id); e.currentTarget.closest(".pw-block-bolton-dropdown")?.classList.remove("open"); }}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                              <span className="pw-block-bolton-option-title">{`[${getBoltonCategoryMeta(b.category).label}] ${b.title || `Bolt-On ${i + 1}`}`}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                      <label className="pw-profile-toggle">
                        <input
                          type="checkbox"
                          checked={!hideBlocks}
                          onChange={() => setHideBlocks((v) => !v)}
                        />
                        <span className="pw-profile-toggle-slider" />
                        <span className="pw-profile-toggle-label">{hideBlocks ? "Blocs hidden" : "Blocs"}</span>
                      </label>
                      {hideBlocks && (
                        <span style={{ fontSize: 10, color: "var(--pw-text-dim)", maxWidth: 180, textAlign: "right", lineHeight: 1.3 }}>
                          Editing prose or running the editor will replace bloc structure
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {(() => {
                  const { blocks, hasBlocks } = parseChapterBlocks(activeChapter.content);
                  if (hasBlocks && blocks.length > 0) {
                    return (
                      <>
                      <div className="pw-editor-toolbar">
                        <select
                          className="pw-toolbar-font-select"
                          value={editorFontFamily}
                          onChange={(e) => setEditorFontFamily(e.target.value)}
                          title="Font"
                        >
                          {EDITOR_FONT_OPTIONS.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className={`pw-chapter-blocks ${hideBlocks ? "pw-blocks-hidden" : ""}`} dir="ltr">
                        {blocks.map((block, idx) => (
                          <div key={idx} className="pw-block-wrap">
                          <div className="pw-block-card">
                            <div className="pw-block-header">
                              <div className="pw-block-label-row">
                                <span className="pw-block-icon" aria-hidden>〰</span>
                                <span className="pw-block-title">
                                  BLOC {idx + 1}
                                  {collapsedBeats.has(idx) && block.synopsis && (
                                    <span className="pw-block-preview"> — {block.synopsis.slice(0, 50)}{block.synopsis.length > 50 ? "…" : ""}</span>
                                  )}
                                </span>
                              </div>
                              <div className="pw-block-header-actions">
                                <button
                                  type="button"
                                  className="pw-block-header-btn"
                                  title="Hide"
                                  onClick={() =>
                                    setCollapsedBeats((s) => {
                                      const next = new Set(s);
                                      if (next.has(idx)) next.delete(idx);
                                      else next.add(idx);
                                      return next;
                                    })
                                  }
                                >
                                  {collapsedBeats.has(idx) ? "Show" : "Hide"}
                                </button>
                                <button
                                  type="button"
                                  className="pw-block-header-btn pw-block-delete"
                                  title="Delete bloc"
                                  onClick={() => deleteBlockAt(blocks, idx)}
                                  aria-label="Delete bloc"
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                </button>
                              </div>
                            </div>
                            {!collapsedBeats.has(idx) && (
                              <>
                                <input
                                  className="pw-block-synopsis"
                                  placeholder="Bloc synopsis..."
                                  value={block.synopsis}
                                  onChange={(e) => {
                                    const next = [...blocks];
                                    next[idx] = { ...block, synopsis: e.target.value };
                                    updateChapter(activeChapter.id, {
                                      content: serializeChapterBlocks(next),
                                    });
                                  }}
                                />
                                <div className="pw-block-toolbar">
                                  <div className="pw-block-toolbar-left">
                                    <div className="pw-block-word-pills">
                                      {[400, 600, 800, 1000].map((n) => (
                                        <button
                                          key={n}
                                          type="button"
                                          className={`pw-word-pill ${block.wordTarget === n ? "active" : ""}`}
                                          onClick={() => {
                                            const next = [...blocks];
                                            next[idx] = { ...block, wordTarget: n };
                                            updateChapter(activeChapter.id, { content: serializeChapterBlocks(next) });
                                          }}
                                          title={`Target ${n} words`}
                                        >
                                          {n}
                                        </button>
                                      ))}
                                    </div>
                                    <div className="pw-block-word-pills">
                                      <button
                                        type="button"
                                        className={`pw-word-pill ${block.lengthMode === "strict" ? "active" : ""}`}
                                        onClick={() => {
                                          const next = [...blocks];
                                          next[idx] = { ...block, lengthMode: "strict" };
                                          updateChapter(activeChapter.id, { content: serializeChapterBlocks(next) });
                                        }}
                                        title="Exact word target"
                                      >
                                        Exact
                                      </button>
                                      <button
                                        type="button"
                                        className={`pw-word-pill ${block.lengthMode === "best-fit" ? "active" : ""}`}
                                        onClick={() => {
                                          const next = [...blocks];
                                          next[idx] = { ...block, lengthMode: "best-fit" };
                                          updateChapter(activeChapter.id, { content: serializeChapterBlocks(next) });
                                        }}
                                        title="AI chooses best fit around target"
                                      >
                                        Best fit
                                      </button>
                                    </div>
                                    {(novel.storyBible.boltons ?? []).length > 0 && (
                                      chapterBoltonId ? (
                                        <div className="pw-block-bolton-wrap pw-block-bolton-hover" title={`Chapter Bolt-On: ${(novel.storyBible.boltons ?? []).find((b) => b.id === chapterBoltonId)?.title || "Bolt-On"}`}>
                                          <span className="pw-block-bolton-trigger pw-bolton-active pw-bolton-locked">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                                          </span>
                                        </div>
                                      ) : (
                                        <div className="pw-block-bolton-wrap pw-block-bolton-hover">
                                          <button
                                            type="button"
                                            className={`pw-block-bolton-trigger ${block.notes ? "pw-bolton-active" : ""}`}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const wrap = e.currentTarget.parentElement;
                                              wrap?.classList.toggle("pw-bolton-open");
                                            }}
                                            title={block.notes ? `Bolt-On: ${(novel.storyBible.boltons ?? []).find((b) => b.id === block.notes)?.title || ""}` : "Attach a Bolt-On"}
                                          >
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill={block.notes ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                                          </button>
                                          <div className="pw-block-bolton-dropdown">
                                            <div className="pw-bolton-dropdown-head">Bloc Bolt-On</div>
                                            <button
                                              type="button"
                                              className={`pw-block-bolton-option ${!block.notes ? "active" : ""}`}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                e.currentTarget.closest(".pw-block-bolton-wrap")?.classList.remove("pw-bolton-open");
                                                const next = [...blocks];
                                                next[idx] = { ...block, notes: "" };
                                                updateChapter(activeChapter.id, { content: serializeChapterBlocks(next) });
                                              }}
                                            >
                                              <span className="pw-block-bolton-option-title">None</span>
                                            </button>
                                            {(novel.storyBible.boltons ?? []).map((b, i) => (
                                              <button
                                                key={b.id}
                                                type="button"
                                                className={`pw-block-bolton-option ${block.notes === b.id ? "active" : ""}`}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  e.currentTarget.closest(".pw-block-bolton-wrap")?.classList.remove("pw-bolton-open");
                                                  const next = [...blocks];
                                                  next[idx] = { ...block, notes: b.id };
                                                  updateChapter(activeChapter.id, { content: serializeChapterBlocks(next) });
                                                }}
                                              >
                                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                                                <span className="pw-block-bolton-option-title">{`[${getBoltonCategoryMeta(b.category).label}] ${b.title || `Bolt-On ${i + 1}`}`}</span>
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      )
                                    )}
                                  </div>
                                  <div className="pw-block-toolbar-right">
                                    {block.prose && (
                                      <select
                                        className="pw-block-regen-btn"
                                        value={
                                          BLOCK_REGENERATE_PRESETS.find((p) => p.instruction === block.regenConstraint)?.id ?? ""
                                        }
                                        onChange={(e) => {
                                          const preset = BLOCK_REGENERATE_PRESETS.find((p) => p.id === e.target.value);
                                          const next = [...blocks];
                                          next[idx] = { ...block, regenConstraint: preset?.instruction ?? "" };
                                          updateChapter(activeChapter.id, { content: serializeChapterBlocks(next) });
                                        }}
                                        title="Regenerate with"
                                      >
                                        <option value="">Regenerate</option>
                                        {BLOCK_REGENERATE_PRESETS.map((p) => (
                                          <option key={p.id} value={p.id}>
                                            {p.label}
                                          </option>
                                        ))}
                                      </select>
                                    )}
                                    <button
                                      type="button"
                                      className={`pw-block-btn ${block.prose ? "pw-block-btn-regenerate" : "pw-block-btn-generate"}`}
                                      title={!block.synopsis?.trim() ? "Add a synopsis first" : block.prose ? "Regenerate prose" : "Generate prose"}
                                      disabled={storyAiBusyAction === `block-${activeChapter.id}-${idx}` || !block.synopsis?.trim()}
                                      onClick={() =>
                                        void runGenerateBlockProse(
                                          idx,
                                          block.prose ? (block.regenConstraint.trim() || undefined) : undefined,
                                        )
                                      }
                                    >
                                      {storyAiBusyAction === `block-${activeChapter.id}-${idx}` ? "…" : block.prose ? "↻" : "✦ Generate"}
                                    </button>
                                    {block.prose && (
                                      <button
                                        type="button"
                                        className="pw-block-btn pw-block-btn-focus"
                                        title="Focus mode"
                                        onClick={() => setFocusBlockIndex(idx)}
                                      >
                                        ⊞
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      className="pw-block-btn pw-block-btn-clear"
                                      title="Clear prose"
                                      disabled={!block.prose}
                                      onClick={() => {
                                        const next = [...blocks];
                                        next[idx] = { ...block, prose: "" };
                                        updateChapter(activeChapter.id, {
                                          content: serializeChapterBlocks(next),
                                        });
                                      }}
                                    >
                                      Clear
                                    </button>
                                    <button
                                      type="button"
                                      className="pw-block-btn"
                                      title="New bloc below"
                                      onClick={() => insertBlockAt(blocks, idx, "after")}
                                    >
                                      /
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                          {(() => {
                            const isGenerating = storyAiBusyAction === `block-${activeChapter.id}-${idx}`;
                            const proseDraftKey = `${activeChapter.id}:${idx}`;
                            const proseValue = blockProseDrafts[proseDraftKey] ?? block.prose;
                            const proseWordCount = proseValue ? countWords(proseValue) : 0;
                            return (
                              <div style={{ position: "relative" }}>
                                <textarea
                                  className="pw-block-freewrite"
                                  ref={(el) => {
                                    blockProseRefs.current[idx] = el;
                                    if (el) {
                                      // Measure correct height without collapsing — avoids scroll jump
                                      el.style.overflow = "hidden";
                                      el.style.height = "0px";
                                      const h = el.scrollHeight;
                                      el.style.height = h + "px";
                                    }
                                  }}
                                  style={{
                                    fontFamily:
                                      EDITOR_FONT_OPTIONS.find((f) => f.id === editorFontFamily)
                                        ?.font ?? "Georgia, serif",
                                    overflow: "hidden",
                                    ...(isGenerating ? { opacity: 0.55, pointerEvents: "none" as const } : {}),
                                  }}
                                  placeholder="Continue writing..."
                                  value={proseValue}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setBlockProseDrafts((current) => ({ ...current, [proseDraftKey]: val }));
                                  }}
                                  onBlur={(e) => {
                                    const val = e.target.value;
                                    setBlockProseDrafts((current) => {
                                      if (!(proseDraftKey in current)) return current;
                                      const next = { ...current };
                                      delete next[proseDraftKey];
                                      return next;
                                    });
                                    if (val !== block.prose) {
                                      const next = [...blocks];
                                      next[idx] = { ...block, prose: val };
                                      updateChapter(activeChapter.id, { content: serializeChapterBlocks(next) });
                                    }
                                  }}
                                  onInput={(e) => {
                                    const el = e.currentTarget;
                                    // Shrink to 0 then expand — overflow:hidden prevents layout shift
                                    el.style.height = "0px";
                                    el.style.height = el.scrollHeight + "px";
                                  }}
                                />
                                {/* Minimal word count — no bar, just a quiet counter */}
                                {proseWordCount > 0 && (
                                  <div style={{ display: "flex", justifyContent: "flex-end", padding: "4px 6px 0", fontSize: 11, color: "var(--pw-text-dim, #777)", opacity: 0.6 }}>
                                    {proseWordCount}/{block.wordTarget} words
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                          </div>
                        ))}
                      </div>
                      </>
                    );
                  }
                  return (
                    <>
                      <div className="pw-editor-toolbar">
                        <button
                          type="button"
                          className="pw-toolbar-btn"
                          title="Bold"
                          onClick={() =>
                            applyRawFormatting(
                              { open: "**", close: "**" },
                              activeChapter.content,
                            )
                          }
                        >
                          <b>B</b>
                        </button>
                        <button
                          type="button"
                          className="pw-toolbar-btn"
                          title="Italic"
                          onClick={() =>
                            applyRawFormatting(
                              { open: "*", close: "*" },
                              activeChapter.content,
                            )
                          }
                        >
                          <i>I</i>
                        </button>
                        <button
                          type="button"
                          className="pw-toolbar-btn"
                          title="Strikethrough"
                          onClick={() =>
                            applyRawFormatting(
                              { open: "~~", close: "~~" },
                              activeChapter.content,
                            )
                          }
                        >
                          <s>S</s>
                        </button>
                        <span className="pw-toolbar-sep" />
                        <select
                          className="pw-toolbar-font-select"
                          value={editorFontFamily}
                          onChange={(e) => setEditorFontFamily(e.target.value)}
                          title="Font"
                        >
                          {EDITOR_FONT_OPTIONS.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                        <span className="pw-toolbar-sep" />
                        <button
                          type="button"
                          className="pw-toolbar-btn"
                          title="Add bloc (or type /)"
                          onClick={() => addBlockFromPlainContent(activeChapter.content)}
                        >
                          /
                        </button>
                      </div>
                      <textarea
                        ref={editorInputRef}
                        data-pw-plain-editor
                        className="pw-editor-input"
                        style={{
                          fontFamily:
                            EDITOR_FONT_OPTIONS.find((f) => f.id === editorFontFamily)?.font ??
                            "Georgia, serif",
                        }}
                        dir="ltr"
                        spellCheck
                        value={activeChapter.content}
                        onInput={(event) => autoSizeEditorInput(event.currentTarget)}
                        onChange={(event) => {
                          const newVal = event.target.value;
                          const prevVal = activeChapter.content;
                          if (
                            newVal.length === prevVal.length + 1 &&
                            newVal.endsWith("/") &&
                            newVal.slice(0, -1) === prevVal
                          ) {
                            addBlockFromPlainContent(prevVal);
                            return;
                          }
                          updateChapter(activeChapter.id, { content: newVal });
                        }}
                        onKeyDown={(e) => {
                          const isSlash =
                            e.key === "/" || e.key === "Slash" || e.code === "Slash";
                          if (
                            isSlash &&
                            !e.ctrlKey &&
                            !e.metaKey &&
                            !e.altKey
                          ) {
                            e.preventDefault();
                            e.stopPropagation();
                            addBlockFromPlainContent(activeChapter.content);
                          }
                        }}
                        placeholder="Start writing... Type / to add a bloc"
                      />
                    </>
                  );
                })()}
              </div>


              {focusBlockIndex !== null &&
                activeChapter &&
                (() => {
                  const { blocks, hasBlocks } = parseChapterBlocks(activeChapter.content);
                  const block = hasBlocks && focusBlockIndex >= 0 && focusBlockIndex < blocks.length ? blocks[focusBlockIndex] : null;
                  if (!block) return null;
                  return (
                    <div
                      className="pw-focus-overlay"
                      role="dialog"
                      aria-modal="true"
                      aria-label="Bloc focus mode"
                    >
                      <div className="pw-focus-backdrop" onClick={() => setFocusBlockIndex(null)} />
                      <div className="pw-focus-content">
                        <div className="pw-focus-header">
                          <input
                            className="pw-focus-synopsis-input"
                            placeholder="Bloc synopsis..."
                            value={block.synopsis}
                            onChange={(e) => {
                              const next = [...blocks];
                              next[focusBlockIndex] = { ...block, synopsis: e.target.value };
                              updateChapter(activeChapter.id, {
                                content: serializeChapterBlocks(next),
                              });
                            }}
                          />
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => setFocusBlockIndex(null)}
                            aria-label="Exit focus mode"
                          >
                            ✕ Close
                          </button>
                        </div>
                        <div className="pw-focus-toolbar-wrap">
                          <div className="pw-editor-toolbar">
                            <button
                              type="button"
                              className="pw-toolbar-btn"
                              title="Bold"
                              onClick={() =>
                                applyBlockFormatting(focusBlockIndex, blocks, {
                                  open: "**",
                                  close: "**",
                                })
                              }
                            >
                              <b>B</b>
                            </button>
                            <button
                              type="button"
                              className="pw-toolbar-btn"
                              title="Italic"
                              onClick={() =>
                                applyBlockFormatting(focusBlockIndex, blocks, {
                                  open: "*",
                                  close: "*",
                                })
                              }
                            >
                              <i>I</i>
                            </button>
                            <button
                              type="button"
                              className="pw-toolbar-btn"
                              title="Strikethrough"
                              onClick={() =>
                                applyBlockFormatting(focusBlockIndex, blocks, {
                                  open: "~~",
                                  close: "~~",
                                })
                              }
                            >
                              <s>S</s>
                            </button>
                            <span className="pw-toolbar-sep" />
                            <select
                              className="pw-toolbar-font-select"
                              value={editorFontFamily}
                              onChange={(e) => setEditorFontFamily(e.target.value)}
                              title="Font"
                            >
                              {EDITOR_FONT_OPTIONS.map((f) => (
                                <option key={f.id} value={f.id}>
                                  {f.label}
                                </option>
                              ))}
                            </select>
                            <span className="pw-toolbar-sep" />
                            <button
                              type="button"
                              className="pw-toolbar-btn"
                              title="New bloc below"
                              onClick={() => {
                                insertBlockAt(blocks, focusBlockIndex, "after");
                                setFocusBlockIndex(null);
                              }}
                            >
                              /
                            </button>
                          </div>
                        </div>
                        <div className="pw-focus-prose-wrap">
                          <textarea
                            ref={(el) => {
                              blockProseRefs.current[focusBlockIndex] = el;
                            }}
                            className="pw-editor-input pw-focus-textarea"
                            style={{
                              fontFamily:
                                EDITOR_FONT_OPTIONS.find((f) => f.id === editorFontFamily)?.font ??
                                "Georgia, serif",
                            }}
                            value={block.prose}
                            onChange={(e) => {
                              const newVal = e.target.value;
                              const prevVal = block.prose;
                              if (
                                newVal.length === prevVal.length + 1 &&
                                newVal.endsWith("/") &&
                                newVal.slice(0, -1) === prevVal
                              ) {
                                insertBlockAt(blocks, focusBlockIndex, "after");
                                setFocusBlockIndex(null);
                                return;
                              }
                              const next = [...blocks];
                              next[focusBlockIndex] = { ...block, prose: newVal };
                              updateChapter(activeChapter.id, {
                                content: serializeChapterBlocks(next),
                              });
                            }}
                            onKeyDown={(e) => {
                              const isSlash =
                                e.key === "/" || e.key === "Slash" || e.code === "Slash";
                              if (
                                isSlash &&
                                !e.ctrlKey &&
                                !e.metaKey &&
                                !e.altKey
                              ) {
                                e.preventDefault();
                                e.stopPropagation();
                                insertBlockAt(blocks, focusBlockIndex, "after");
                                setFocusBlockIndex(null);
                              }
                            }}
                            placeholder="Prose... Type / for new bloc"
                            rows={24}
                            spellCheck
                          />
                        </div>
                        <div className="pw-focus-footer">
                          <button
                            type="button"
                            className="btn btn-primary"
                            disabled={storyAiBusyAction === `block-${activeChapter.id}-${focusBlockIndex}`}
                            onClick={() =>
                              void runGenerateBlockProse(
                                focusBlockIndex,
                                block.regenConstraint.trim() || undefined,
                              )
                            }
                          >
                            {storyAiBusyAction === `block-${activeChapter.id}-${focusBlockIndex}`
                              ? "Regenerating..."
                              : "✦ Regenerate"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

            </div>
          ) : (
            <div className="pw-overview">
              <div className="pw-overview-hero">
                <div className="pw-overview-cover-wrap" onClick={() => fileInputRef.current?.click()} style={{ cursor: "pointer" }}>
                  <div
                    className="pw-overview-cover"
                    style={novel.coverImage ? { backgroundImage: `url(${novel.coverImage})` } : undefined}
                  >
                    {!novel.coverImage && (
                      <span style={{ color: "var(--pw-text-dim)", fontSize: 13 }}>Click to upload</span>
                    )}
                  </div>
                  {novel.coverImage && (
                    <button type="button" className="pw-cover-remove-x" onClick={(e) => { e.stopPropagation(); updateNovel({ coverImage: null }); }} title="Remove cover">×</button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    className="pw-hidden-file"
                  />
                </div>

                <div className="pw-overview-headline">
                  <input
                    className="pw-overview-title"
                    value={novel.title}
                    onChange={(event) => updateNovel({ title: event.target.value })}
                    placeholder="Novel title"
                  />
                  <input
                    className="pw-overview-author"
                    value={novel.authorName}
                    onChange={(event) => updateNovel({ authorName: event.target.value })}
                    placeholder="Author name"
                  />
                  <textarea
                    className="pw-overview-synopsis"
                    value={novel.synopsis}
                    onChange={(event) => updateNovel({ synopsis: event.target.value })}
                    placeholder="Add synopsis..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Canon */}
              <div className="pw-overview-grid" style={{ gridTemplateColumns: "1fr" }}>
                <div className="pw-overview-card pw-bible-card">
                  <div className="pw-overview-card-head">
                    <div>
                      <h3>Canon</h3>
                      <p className="pw-overview-sub">Your story&apos;s source of truth — characters, world, and voice.</p>
                    </div>
                    <button type="button" className="btn btn-primary" onClick={() => setShowStoryBibleModal(true)}>
                      Open Canon
                    </button>
                  </div>
                  <div className="pw-bible-summary">
                    <div>
                      <div className="pw-bible-summary-number">
                        {(novel.storyBible.characters?.length || 0) +
                          (novel.storyBible.charactersList?.length || 0)}
                      </div>
                      <p>Characters</p>
                    </div>
                    <div>
                      <div className="pw-bible-summary-number">{novel.storyBible.locations?.length || 0}</div>
                      <p>Locations</p>
                    </div>
                    <div>
                      <div className="pw-bible-summary-number">{novel.storyBible.lore?.length || 0}</div>
                      <p>Lore entries</p>
                    </div>
                    <div className="pw-bible-summary-wide">
                      <p className="pw-overview-sub">
                        {novel.storyBible.summary?.synopsisShort
                          ? novel.storyBible.summary.synopsisShort.slice(0, 140) +
                            (novel.storyBible.summary.synopsisShort.length > 140 ? "…" : "")
                          : "Add a synopsis to start your canon."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dashboard */}
              <div className="pw-overview-grid" style={{ gridTemplateColumns: "1fr" }}>
                <div className="pw-overview-card">
                  <div className="pw-overview-card-head">
                    <h3>Dashboard</h3>
                  </div>

                  <div className="pw-bible-summary">
                    <div>
                      <div className="pw-bible-summary-number">{totalWords.toLocaleString()}</div>
                      <p>Total words</p>
                    </div>
                    <div>
                      <div className="pw-bible-summary-number">{novel.chapters.length}</div>
                      <p>Chapters</p>
                    </div>
                    <div>
                      <div className="pw-bible-summary-number">
                        {novel.chapters.length > 0
                          ? Math.round(totalWords / novel.chapters.length).toLocaleString()
                          : "0"}
                      </div>
                      <p>Avg / chapter</p>
                    </div>
                    <div>
                      <div className="pw-bible-summary-number">{Math.ceil(totalWords / 250).toLocaleString()}</div>
                      <p>Est. pages</p>
                    </div>

                    <div className="pw-bible-summary-wide pw-dash-goal-row">
                      <div className="pw-dash-goal-top">
                        <div className="pw-dash-goal-left">
                          <span className="pw-dash-goal-title">Word goal</span>
                          {editingGoalWords !== null ? (
                            <input
                              autoFocus
                              type="number"
                              className="pw-dash-goal-input"
                              value={editingGoalWords}
                              onChange={(e) => setEditingGoalWords(e.target.value === "" ? "" : e.target.value)}
                              onBlur={() => {
                                const val = parseInt(String(editingGoalWords), 10);
                                if (!isNaN(val) && val > 0) updateNovel({ goalWords: val });
                                setEditingGoalWords(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                                if (e.key === "Escape") setEditingGoalWords(null);
                              }}
                            />
                          ) : (
                            <button
                              type="button"
                              className="pw-dash-goal-btn"
                              onClick={() => setEditingGoalWords(String(novel.goalWords || 80000))}
                              title="Click to change goal"
                            >
                              {(novel.goalWords || 80000).toLocaleString()}
                            </button>
                          )}
                        </div>
                        <span className="pw-dash-goal-pct">
                          {totalWords >= (novel.goalWords || 80000)
                            ? `${(totalWords - (novel.goalWords || 80000)).toLocaleString()} over`
                            : `${((novel.goalWords || 80000) - totalWords).toLocaleString()} to go`}
                        </span>
                      </div>
                      <div className="pw-dash-goal-bar">
                        <span style={{ width: `${Math.min(progress, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* ── The Plan Modal ── */}
      {showPlanModal && (
        <div className="pw-modal-overlay" onClick={() => setShowPlanModal(false)}>
          <div
            className="pw-plan-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="pw-plan-modal-header">
              <div>
                <h2 className="pw-plan-modal-title">The Plan</h2>
                <p className="pw-plan-modal-subtitle">Build chapter-by-chapter structure from your Canon.</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {!aiOff && (
                <button
                  type="button"
                  className="btn"
                  onClick={openPlanGenerationModal}
                  disabled={storyAiBusyAction === "plan-generate" || planChapters.length > 0}
                  style={{ gap: "6px" }}
                  title={planChapters.length > 0 ? "Clear all chapters first to regenerate" : ""}
                >
                  {storyAiBusyAction === "plan-generate" ? (
                    <>
                      <span className="pw-plan-spinner" />
                      Generating...
                    </>
                  ) : (
                    <>&#10022; AI Generate</>
                  )}
                </button>
                )}
                {planChapters.length > 0 && (
                  <button
                    type="button"
                    className="btn"
                    onClick={clearAllPlanChapters}
                    disabled={storyAiBusyAction !== null}
                    style={{ color: "var(--color-danger, #e55)", gap: "4px" }}
                    title="Clear all chapters to start fresh"
                  >
                    Clear All
                  </button>
                )}
                <button type="button" className="btn" onClick={addPlanChapter}>
                  + Add chapter
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => applyPlanToChapters()}
                  disabled={planChapters.length === 0}
                >
                  Sync to manuscript
                </button>
                <button
                  type="button"
                  className="pw-plan-modal-close"
                  onClick={() => setShowPlanModal(false)}
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="pw-plan-modal-body">
              {/* Stats bar */}
              {planChapters.length > 0 && (
                <div className="pw-plan-stats" style={{ marginBottom: "16px" }}>
                  <div className="pw-plan-stat">
                    <span className="pw-plan-stat-value">{planChapters.length}</span>
                    <span className="pw-plan-stat-label">Chapters</span>
                  </div>
                  <div className="pw-plan-stat">
                    <span className="pw-plan-stat-value">
                      {planChapters.reduce((sum, ch) => sum + new Set(ch.characterIds ?? []).size, 0)}
                    </span>
                    <span className="pw-plan-stat-label">Character refs</span>
                  </div>
                  <div className="pw-plan-stat">
                    <span className="pw-plan-stat-value">
                      {planChapters.reduce((sum, ch) => sum + new Set(ch.locationIds ?? []).size, 0)}
                    </span>
                    <span className="pw-plan-stat-label">Location refs</span>
                  </div>
                </div>
              )}

              {/* Synopsis */}
              <div style={{ marginBottom: "16px" }}>
                <label className="pw-plan-modal-label">Master Synopsis</label>
                <textarea
                  className="pw-bible-input"
                  rows={3}
                  value={novel.storyBible.summary.synopsisShort}
                  placeholder="Write or paste your story synopsis here. This drives the AI plan generation."
                  onChange={(event) =>
                    updateStoryBible({
                      summary: { ...novel.storyBible.summary, synopsisShort: event.target.value },
                    })
                  }
                  style={{ marginBottom: 0, width: "100%" }}
                />
              </div>

              {planError && (
                <div className="pw-plan-error-banner" style={{ marginBottom: "12px" }}>
                  <span style={{ fontWeight: 700 }}>Error:</span> {planError}
                </div>
              )}

              {/* Plan generation progress bar + slow model warning */}
              {storyAiBusyAction === "plan-generate" && (
                <div
                  style={{
                    marginBottom: 14,
                    padding: "12px 16px",
                    borderRadius: 10,
                    background: "rgba(var(--pw-accent-rgb, 134,239,172), 0.08)",
                    border: "1px solid rgba(var(--pw-accent-rgb, 134,239,172), 0.18)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--pw-text)" }}>
                      {planGenerateProgressIdx === null
                        ? "Generating chapter plan..."
                        : `Filling in chapter ${planGenerateProgressIdx + 1} of ${planGenerateTotal}...`}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--pw-text-dim)" }}>
                      {aiBusyDuration}
                    </span>
                  </div>
                  {/* Progress bar */}
                  {planGenerateTotal > 0 && (
                    <div
                      style={{
                        width: "100%",
                        height: 4,
                        borderRadius: 2,
                        background: "rgba(255,255,255,0.06)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 2,
                          background: "var(--pw-accent, #86efac)",
                          width: `${Math.round(((planGenerateProgressIdx ?? 0) + 1) / planGenerateTotal * 100)}%`,
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                  )}
                  {storyAiBusyElapsedSec >= 15 && (
                    <p style={{ fontSize: 11, color: "var(--pw-text-dim)", margin: "8px 0 0" }}>
                      Some models are slower than others — this is normal. The plan is being built in a single request for speed.
                    </p>
                  )}
                </div>
              )}

              {planChapters.length === 0 ? (
                <div className="pw-plan-empty">
                  <div className="pw-plan-empty-icon">&#128214;</div>
                  <p className="pw-plan-empty-title">No chapters planned yet</p>
                  <p className="pw-plan-empty-desc">
                    Add chapters manually or use AI Generate to build a full chapter plan from your synopsis and Canon.
                  </p>
                </div>
              ) : (
                <div className="pw-plan-timeline">
                  {planChapters.map((plan, index) => {
                    const charCount = (plan.characterIds ?? []).length;
                    const locCount = (plan.locationIds ?? []).length;
                    const isGenerating = storyAiBusyAction === "plan-generate";
                    const isFilled = !isGenerating || (planGenerateProgressIdx !== null && index <= planGenerateProgressIdx);
                    const isCurrentlyFilling = isGenerating && planGenerateProgressIdx === index;
                    return (
                      <div
                        key={plan.id}
                        className="pw-plan-chapter"
                        style={{
                          opacity: isGenerating && !isFilled ? 0.35 : 1,
                          transition: "opacity 0.35s ease",
                        }}
                      >
                        <div className="pw-plan-connector">
                          <div
                            className="pw-plan-dot"
                            style={isCurrentlyFilling ? { background: "var(--pw-accent, #86efac)", boxShadow: "0 0 6px var(--pw-accent, #86efac)" } : isFilled && isGenerating ? { background: "var(--pw-accent, #86efac)" } : {}}
                          />
                          {index < planChapters.length - 1 && <div className="pw-plan-line" />}
                        </div>
                        <div className="pw-plan-chapter-body">
                          <div className="pw-plan-chapter-header">
                            <span className="pw-plan-chapter-num">Ch. {index + 1}</span>
                            <input
                              className="pw-plan-chapter-title-input"
                              value={plan.title}
                              onChange={(e) => updatePlanChapter(plan.id, { title: e.target.value })}
                              placeholder="Chapter title..."
                            />
                            {!aiOff && <button
                              type="button"
                              className="pw-plan-regen-btn"
                              onClick={() => void runRegenPlanChapter(index)}
                              disabled={storyAiBusyAction !== null}
                              title="Regenerate this chapter"
                              style={{
                                background: "none",
                                border: "none",
                                cursor: storyAiBusyAction !== null ? "not-allowed" : "pointer",
                                opacity: storyAiBusyAction === `plan-regen-${index}` ? 0.5 : 0.7,
                                padding: "2px 4px",
                                fontSize: "14px",
                                lineHeight: 1,
                                color: "var(--color-text-secondary, #999)",
                                transition: "opacity 0.15s",
                              }}
                              onMouseEnter={(e) => { if (!storyAiBusyAction) (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = storyAiBusyAction === `plan-regen-${index}` ? "0.5" : "0.7"; }}
                            >
                              {storyAiBusyAction === `plan-regen-${index}` ? (
                                <span className="pw-plan-spinner" style={{ width: "12px", height: "12px" }} />
                              ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                              )}
                            </button>}
                            <button
                              type="button"
                              className="pw-plan-remove-btn"
                              onClick={() => removePlanChapter(plan.id)}
                              title="Remove chapter"
                            >
                              &times;
                            </button>
                          </div>
                          <textarea
                            className="pw-plan-synopsis-input"
                            rows={3}
                            value={plan.synopsis}
                            placeholder="What happens in this chapter..."
                            onChange={(e) => updatePlanChapter(plan.id, { synopsis: e.target.value })}
                          />
                          <div className="pw-plan-refs">
                            <div className="pw-plan-ref-group">
                              <div className="pw-plan-ref-header">
                                <span className="pw-plan-ref-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
                                <span className="pw-plan-ref-label">Characters</span>
                                <select
                                  className="pw-plan-ref-add"
                                  value=""
                                  onChange={(event) => {
                                    if (!event.target.value) return;
                                    togglePlanReference(plan.id, "characterIds", event.target.value);
                                  }}
                                >
                                  <option value="">+ Add</option>
                                  {storyCharacters.map((character) => (
                                    <option key={character.id} value={character.id}>
                                      {character.name || "Unnamed"}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="pw-plan-ref-tags">
                                {charCount === 0 ? (
                                  <span className="pw-plan-ref-empty">None linked</span>
                                ) : (
                                  plan.characterIds.map((characterId) => {
                                    const character = storyCharacters.find((item) => item.id === characterId);
                                    if (!character) return null;
                                    return (
                                      <button
                                        key={`${plan.id}-char-${characterId}`}
                                        type="button"
                                        className="pw-plan-tag pw-plan-tag-char"
                                        onClick={() => togglePlanReference(plan.id, "characterIds", characterId)}
                                      >
                                        {character.name || "Unnamed"}
                                        <span className="pw-plan-tag-x">&times;</span>
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                            <div className="pw-plan-ref-group">
                              <div className="pw-plan-ref-header">
                                <span className="pw-plan-ref-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg></span>
                                <span className="pw-plan-ref-label">Locations</span>
                                <select
                                  className="pw-plan-ref-add"
                                  value=""
                                  onChange={(event) => {
                                    if (!event.target.value) return;
                                    togglePlanReference(plan.id, "locationIds", event.target.value);
                                  }}
                                >
                                  <option value="">+ Add</option>
                                  {storyLocations.map((location) => (
                                    <option key={location.id} value={location.id}>
                                      {location.name || "Unnamed"}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="pw-plan-ref-tags">
                                {locCount === 0 ? (
                                  <span className="pw-plan-ref-empty">None linked</span>
                                ) : (
                                  plan.locationIds.map((locationId) => {
                                    const location = storyLocations.find((item) => item.id === locationId);
                                    if (!location) return null;
                                    return (
                                      <button
                                        key={`${plan.id}-loc-${locationId}`}
                                        type="button"
                                        className="pw-plan-tag pw-plan-tag-loc"
                                        onClick={() => togglePlanReference(plan.id, "locationIds", locationId)}
                                      >
                                        {location.name || "Unnamed"}
                                        <span className="pw-plan-tag-x">&times;</span>
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="pw-plan-chapter-meta">
                            {charCount > 0 && <span>{charCount} character{charCount !== 1 ? "s" : ""}</span>}
                            {locCount > 0 && <span>{locCount} location{locCount !== 1 ? "s" : ""}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="pw-modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="pw-modal pw-export-modal" onClick={(event) => event.stopPropagation()}>
            <div className="pw-export-header">
              <div className="pw-delete-modal-title">Export Project</div>
              <p className="pw-delete-modal-copy">
                Choose a format, then export the full book or only selected chapters.
              </p>
            </div>

            <div className="pw-export-section">
              <p className="pw-export-label">Format</p>
              <div className="pw-export-format-row">
                {(["epub", "docx"] as ExportFormat[]).map((format) => (
                  <button
                    key={format}
                    type="button"
                    className={`pw-export-format ${exportFormat === format ? "active" : ""}`}
                    onClick={() => setExportFormat(format)}
                  >
                    {format.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="pw-export-section">
              <p className="pw-export-label">Scope</p>
              <div className="pw-export-scope-row">
                <button
                  type="button"
                  className={`pw-export-scope-option ${exportScope === "all" ? "active" : ""}`}
                  onClick={() => setExportScope("all")}
                >
                  Entire book
                  <span>{novel.chapters.length} chapter(s)</span>
                </button>
                <button
                  type="button"
                  className={`pw-export-scope-option ${exportScope === "selected" ? "active" : ""}`}
                  onClick={() => setExportScope("selected")}
                >
                  Select chapters
                  <span>{selectedExportChapterIds.length} selected</span>
                </button>
              </div>
            </div>

            <div className="pw-export-section">
              <div className="pw-export-chapter-tools">
                <span>
                  Chapters {selectedExportChapterIds.length}/{novel.chapters.length}
                </span>
                <div className="pw-export-tool-actions">
                  <button
                    type="button"
                    className="pw-export-tool-btn"
                    onClick={() => setSelectedExportChapterIds(novel.chapters.map((chapter) => chapter.id))}
                    disabled={exportScope === "all"}
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    className="pw-export-tool-btn"
                    onClick={() => setSelectedExportChapterIds([])}
                    disabled={exportScope === "all"}
                  >
                    Clear
                  </button>
                </div>
              </div>
              {exportScope === "all" && (
                <p className="pw-export-help">Switch to &quot;Select chapters&quot; to choose individual chapters.</p>
              )}

              <div className={`pw-export-chapter-list ${exportScope === "all" ? "pw-export-disabled" : ""}`}>
                {novel.chapters.length === 0 ? (
                  <p className="pw-export-help">No chapters available yet.</p>
                ) : (
                  novel.chapters.map((chapter, index) => {
                    const checked = selectedExportChapterIds.includes(chapter.id);
                    return (
                      <label key={chapter.id} className="pw-export-chapter-item">
                        <input
                          type="checkbox"
                          className="pw-checkbox"
                          checked={checked}
                          onChange={() => toggleExportChapter(chapter.id)}
                          disabled={exportScope === "all"}
                          aria-label={`Include ${chapter.title || `Chapter ${index + 1}`}`}
                        />
                        <span className="pw-export-chapter-meta">
                          <strong>{chapter.title || `Chapter ${index + 1}`}</strong>
                          <small>{countChapterWords(chapter).toLocaleString()} words</small>
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <p className="pw-export-help">
              {exportFormat === "epub"
                ? `EPUB includes linked chapter navigation${
                    novel.coverImage ? " and uses your current novel cover." : "."
                  }`
                : "DOCX creates a Microsoft Word document for your selected content."}
            </p>

            {novel.chapters.length === 0 && (
              <p className="pw-export-error">Add at least one chapter before exporting.</p>
            )}

            {exportError && <p className="pw-export-error">{exportError}</p>}

            <div className="pw-delete-modal-actions">
              <button type="button" className="btn pw-cancel-btn" onClick={() => setShowExportModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void exportNovel()}
                disabled={
                  exportingFile ||
                  novel.chapters.length === 0 ||
                  (exportScope === "selected" && selectedExportChapterIds.length === 0)
                }
              >
                {exportingFile
                  ? "Exporting..."
                  : exportScope === "all"
                    ? `Export full book as ${exportFormat.toUpperCase()}`
                    : `Export ${selectedChapterCount} chapter(s) as ${exportFormat.toUpperCase()}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditorModal && activeChapter && (
        <TheEditor
          open={showEditorModal}
          onClose={() => { setShowEditorModal(false); setEditorResult(null); setEditorError(null); setEditorLoadingPhase(null); }}
          chapterTitle={activeChapter.title || "Untitled chapter"}
          loadingPhase={editorLoadingPhase}
          error={editorError}
          result={editorResult}
          originalParagraphs={editorOriginalParagraphs}
          onRun={runEditorPass}
          onResultUpdate={setEditorResult}
          onFixIssues={runEditorFixIssues}
          onApply={(revisedText) => {
            if (!activeChapter) return;
            updateChapter(activeChapter.id, { content: revisedText });
            /* Update original paragraphs so further edits work on the new text */
            setEditorOriginalParagraphs(revisedText.split(/\n\n+/).filter(Boolean));
          }}
        />
      )}

      {showStoryBibleModal && novel && (
        <div className="pw-modal-overlay" onClick={() => setShowStoryBibleModal(false)}>
          <div className="pw-bible-modal" onClick={(event) => event.stopPropagation()}>
            <div className="pw-bible-modal-head">
              <div>
                <p className="pw-bible-modal-kicker">Novel Overview</p>
                <h2>Canon</h2>
                <p className="pw-bible-modal-sub">Your story&apos;s source of truth — characters, world, and voice.</p>
                <p className="pw-field-help">Field limits keep autosave and assistant actions stable.</p>
              </div>
              <div className="pw-bible-modal-actions">
                {!aiOff && <span className="pw-pill">Model: {openRouterModel}</span>}
                <button type="button" className="pw-link-btn" onClick={() => setProfileOpen(true)}>
                  Settings
                </button>
                <button type="button" className="pw-bible-close" onClick={() => setShowStoryBibleModal(false)} aria-label="Close">
                  ×
                </button>
              </div>
            </div>

            <div className="pw-bible-modal-body">
              <aside className="pw-bible-nav">
                {(
                  [
                    { id: "styleVoice", label: "Style & Voice" },
                    { id: "summary", label: "Summary" },
                    { id: "characters", label: "Characters" },
                    { id: "locations", label: "Locations" },
                    { id: "worldbuilding", label: "Worldbuilding" },
                    { id: "boltons", label: "Bolt-Ons" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`pw-bible-nav-btn ${bibleSection === item.id ? "active" : ""}`}
                    onClick={() => setBibleSection(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
                <div className="pw-bible-nav-foot">
                  {autosaveStatus.status === "error"
                    ? autosaveStatus.message
                    : autosaveStatus.at
                      ? `Saved ${new Date(autosaveStatus.at).toLocaleTimeString()}`
                      : "Autosaves and syncs"}
                </div>
              </aside>

              <section className="pw-bible-panel">
                {bibleSection === "summary" && (
                  <div className="pw-bible-section">
                    <div className="pw-bible-flex-head">
                      <h3>Story Summary</h3>
                      <button
                        type="button"
                        className="pw-bible-clear-btn"
                        onClick={() => clearBibleSection("summary")}
                        title="Clear this section"
                      >
                        Clear this section
                      </button>
                    </div>
                    <p className="pw-bible-section-note">
                      Shape your book direction here: synopsis, themes, and core conflict.
                    </p>
                    {!aiOff && (
                    <div className="pw-bible-autofill-row">
                      <input
                        className="pw-bible-input pw-bible-autofill-input"
                        placeholder="Create me a story about..."
                        value={summaryAutofillPrompt}
                        maxLength={1200}
                        onChange={(event) => setSummaryAutofillPrompt(event.target.value)}
                        disabled={storyAiBusyAction !== null}
                      />
                      <button
                        type="button"
                        className="pw-ai-mini-btn"
                        onClick={() => void runSummaryAutofillFromPrompt()}
                        disabled={storyAiBusyAction !== null}
                      >
                        {storyAiBusyAction === "summary-autofill" ? "Building..." : "✦ Build Summary"}
                      </button>
                    </div>
                    )}
                    <div className="pw-bible-field-head">
                      <label>Synopsis</label>
                      {!aiOff && <div className="pw-bible-field-ai">
                        <select
                          className="pw-bible-input pw-bible-field-select"
                          value={summaryAiMode.synopsis}
                          onChange={(event) =>
                            setSummaryAiMode((current) => ({
                              ...current,
                              synopsis: event.target.value as typeof current.synopsis,
                            }))
                          }
                        >
                          <option value="improve">Improve clarity + flow</option>
                          <option value="tighten">Tighten and trim</option>
                          <option value="expand">Expand with detail</option>
                          <option value="blurb">Back-cover blurb version</option>
                          <option value="beats">Chapter-arc version</option>
                        </select>
                        <button
                          type="button"
                          className="pw-ai-mini-btn pw-bible-field-btn"
                          disabled={storyAiBusyAction !== null}
                          onClick={() => void runSummaryFieldAi("synopsis", summaryAiMode.synopsis)}
                        >
                          {storyAiBusyAction === "summary-field-synopsis" ? "Running..." : "Run Assistant"}
                        </button>
                      </div>}
                    </div>
                    <textarea
                      className="pw-bible-input"
                      rows={6}
                      maxLength={STORY_BIBLE_LIMITS.summary.synopsisShort}
                      value={novel.storyBible.summary.synopsisShort}
                      placeholder="Write the core synopsis of your story. This is the canon source the assistant should follow."
                      onChange={(event) =>
                        updateStoryBible({ summary: { ...novel.storyBible.summary, synopsisShort: event.target.value } })
                      }
                    />
                    <p className="pw-field-help">
                      {novel.storyBible.summary.synopsisShort.length}/{STORY_BIBLE_LIMITS.summary.synopsisShort}
                    </p>
                    {!aiOff && storyAiError && storyAiBusyAction === null && (
                      <p className="pw-ora-error pw-bible-ai-error">{storyAiError}</p>
                    )}
                    <div className="pw-bible-grid-3">
                      <div>
                        <label>Themes (comma separated)</label>
                        <input
                          className="pw-bible-input"
                          maxLength={SUMMARY_LIST_INPUT_MAX}
                          value={novel.storyBible.summary.themes.join(", ")}
                          onChange={(event) =>
                            updateStoryBible({
                              summary: {
                                ...novel.storyBible.summary,
                                themes: event.target.value
                                  .split(",")
                                  .map((s) => s.trim())
                                  .filter(Boolean),
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="pw-bible-field-head">
                      <label>Core conflict (what can be lost?)</label>
                      {!aiOff && <div className="pw-bible-field-ai">
                        <select
                          className="pw-bible-input pw-bible-field-select"
                          value={summaryAiMode.conflict}
                          onChange={(event) =>
                            setSummaryAiMode((current) => ({
                              ...current,
                              conflict: event.target.value as typeof current.conflict,
                            }))
                          }
                        >
                          <option value="improve">Improve clarity</option>
                          <option value="intensify">Intensify consequence</option>
                          <option value="moral">Add moral dilemma</option>
                          <option value="pressure">Add antagonist pressure</option>
                        </select>
                        <button
                          type="button"
                          className="pw-ai-mini-btn pw-bible-field-btn"
                          disabled={storyAiBusyAction !== null}
                          onClick={() => void runSummaryFieldAi("conflict", summaryAiMode.conflict)}
                        >
                          {storyAiBusyAction === "summary-field-conflict" ? "Running..." : "Run Assistant"}
                        </button>
                      </div>}
                    </div>
                    <textarea
                      className="pw-bible-input"
                      rows={2}
                      maxLength={STORY_BIBLE_LIMITS.summary.stakes}
                      value={novel.storyBible.summary.stakes}
                      placeholder="Example: If they fail, the colony collapses and the family is exposed."
                      onChange={(event) =>
                        updateStoryBible({ summary: { ...novel.storyBible.summary, stakes: event.target.value } })
                      }
                    />
                    <p className="pw-field-help">
                      {novel.storyBible.summary.stakes.length}/{STORY_BIBLE_LIMITS.summary.stakes}
                    </p>
                    {!aiOff && storyAiError && <p className="pw-ora-error pw-bible-ai-error">{storyAiError}</p>}
                  </div>
                )}

                {bibleSection === "characters" && (
                  <div className="pw-bible-section">
                    <div className="pw-bible-flex-head">
                      <div>
                        <h3>Characters</h3>
                        <p className="pw-bible-section-note">
                          Auto generate from Summary or build each character manually from scratch.
                        </p>
                        {!hasSummaryForCharacterAi && (
                          <p className="pw-bible-warning-note">
                            Summary is empty. Assistant-generated characters may drift from your story. Add synopsis or core conflict
                            first for stronger canon-safe results.
                          </p>
                        )}
                      </div>
                      <div className="pw-bible-inline-actions">
                        <button
                          type="button"
                          className="pw-bible-clear-btn"
                          onClick={() => clearBibleSection("characters")}
                          title="Clear this section"
                        >
                          Clear this section
                        </button>
                        {!aiOff && (
                        <button
                          type="button"
                          className="pw-ai-mini-btn"
                          onClick={() => void runGenerateCharactersFromSummary()}
                          disabled={storyAiBusyAction !== null}
                        >
                          {storyAiBusyAction === "characters-generate"
                            ? "Generating..."
                            : "Auto generate characters from summary"}
                        </button>
                        )}
                        <button type="button" className="btn btn-primary" onClick={addV2Character}>
                          + Add Character
                        </button>
                      </div>
                    </div>
                    {!aiOff && storyAiError && <p className="pw-ora-error pw-bible-ai-error">{storyAiError}</p>}

                    <div className="pw-bible-characters-layout">
                      <div className="pw-bible-characters-list">
                        {storyCharacters.length === 0 ? (
                          <p className="pw-overview-empty">
                            No characters yet. Use Generate from Summary or add one manually.
                          </p>
                        ) : (
                          storyCharacters.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              className={`pw-bible-char-chip ${selectedV2CharacterId === c.id ? "active" : ""}`}
                              onClick={() => setSelectedV2CharacterId(c.id)}
                            >
                              <span className="pw-char-name">{c.name || "Untitled"}</span>
                              <span className="pw-char-role">
                                {c.role}
                                {c.accent ? ` • ${c.accent}` : ""}
                              </span>
                            </button>
                          ))
                        )}
                      </div>

                      <div className="pw-bible-char-detail">
                        {!selectedV2CharacterId && <p>Select a character to edit details.</p>}
                        {selectedV2CharacterId && (
                          (() => {
                            const character = storyCharacters.find((c) => c.id === selectedV2CharacterId);
                            if (!character) return <p>Not found.</p>;
                            const characterAiModeCopy = CHARACTER_AI_MODE_COPY[characterAiMode];
                            const availableRelationshipTargets = storyCharacters.filter(
                              (candidate) => candidate.id !== character.id,
                            );
                            return (
                              <div className="pw-character-editor">
                                <div className="pw-character-panel-head">
                                  <div>
                                    <h4>{character.name || "Character Profile"}</h4>
                                    <p className="pw-character-panel-sub">
                                      Define voice, appearance, behavior, and spoiler-safe secret handling.
                                    </p>
                                  </div>
                                  {!aiOff && (
                                  <div className="pw-character-ai-controls">
                                    <div className="pw-character-ai-mode-grid" role="radiogroup" aria-label="Character assistant mode">
                                      {(Object.entries(CHARACTER_AI_MODE_COPY) as Array<
                                        [CharacterAiMode, { label: string; description: string }]
                                      >).map(([mode, copy]) => (
                                        <button
                                          key={mode}
                                          type="button"
                                          className={`pw-character-ai-mode-btn ${characterAiMode === mode ? "active" : ""}`}
                                          onClick={() => setCharacterAiMode(mode)}
                                          disabled={storyAiBusyAction !== null}
                                          aria-pressed={characterAiMode === mode}
                                          title={copy.description}
                                        >
                                          {copy.label}
                                        </button>
                                      ))}
                                    </div>
                                    <p className="pw-character-ai-help">{characterAiModeCopy.description}</p>
                                    <button
                                      type="button"
                                      className="pw-ai-mini-btn"
                                      onClick={() => void runCharacterAiForSelected()}
                                      disabled={storyAiBusyAction !== null}
                                    >
                                      {storyAiBusyAction?.startsWith("character-")
                                        ? "Applying..."
                                        : `Run: ${characterAiModeCopy.label}`}
                                    </button>
                                  </div>
                                  )}
                                </div>

                                <div className="pw-char-row">
                                  <div className="pw-char-col">
                                    <label>Name</label>
                                    <input
                                      className="pw-bible-input"
                                      maxLength={STORY_BIBLE_LIMITS.character.name}
                                      value={character.name}
                                      onChange={(event) => updateV2Character(character.id, { name: event.target.value })}
                                    />
                                  </div>
                                  <div className="pw-char-col">
                                    <label>Role</label>
                                    <select
                                      className="pw-bible-input"
                                      value={character.role}
                                      onChange={(event) =>
                                        updateV2Character(character.id, {
                                          role: event.target.value as CharacterRole,
                                        })
                                      }
                                    >
                                      {CHARACTER_ROLE_OPTIONS.map((role) => (
                                        <option key={role} value={role}>
                                          {role}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="pw-char-col">
                                    <label>Pronouns</label>
                                    <input
                                      className="pw-bible-input"
                                      maxLength={STORY_BIBLE_LIMITS.character.pronouns}
                                      value={character.pronouns ?? ""}
                                      onChange={(event) => updateV2Character(character.id, { pronouns: event.target.value })}
                                    />
                                  </div>
                                </div>

                                <div className="pw-character-section-card">
                                  <h4>Core Identity</h4>
                                  <label>Logline</label>
                                  <p className="pw-field-help">
                                    One-sentence character hook: who they are, what they want, and what blocks them.
                                  </p>
                                  <textarea
                                    className="pw-bible-input"
                                    rows={2}
                                    maxLength={STORY_BIBLE_LIMITS.character.logline}
                                    value={character.logline}
                                    onChange={(event) => updateV2Character(character.id, { logline: event.target.value })}
                                  />
                                  <div className="pw-bible-grid-2">
                                    <div>
                                      <label>Personality</label>
                                      <textarea
                                        className="pw-bible-input"
                                        rows={2}
                                        maxLength={STORY_BIBLE_LIMITS.character.personality}
                                        value={character.personality ?? ""}
                                        onChange={(event) =>
                                          updateV2Character(character.id, { personality: event.target.value })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <label>Backstory</label>
                                      <textarea
                                        className="pw-bible-input"
                                        rows={2}
                                        maxLength={STORY_BIBLE_LIMITS.character.backstory}
                                        value={character.backstory ?? ""}
                                        onChange={(event) =>
                                          updateV2Character(character.id, { backstory: event.target.value })
                                        }
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="pw-character-section-card">
                                  <h4>Voice and Presence</h4>
                                  <div>
                                    <label>Appearance</label>
                                    <textarea
                                      className="pw-bible-input"
                                      rows={2}
                                      maxLength={STORY_BIBLE_LIMITS.character.appearance}
                                      value={character.appearance ?? ""}
                                      onChange={(event) => updateV2Character(character.id, { appearance: event.target.value })}
                                    />
                                  </div>
                                  <div className="pw-bible-grid-2">
                                    <div>
                                      <label>Accent</label>
                                      <input
                                        className="pw-bible-input"
                                        maxLength={STORY_BIBLE_LIMITS.character.accent}
                                        value={character.accent ?? ""}
                                        placeholder="e.g. Soft Yorkshire, Lagos urban English"
                                        onChange={(event) => updateV2Character(character.id, { accent: event.target.value })}
                                      />
                                    </div>
                                    <div>
                                      <label>Speaking style</label>
                                      <textarea
                                        className="pw-bible-input"
                                        rows={2}
                                        maxLength={STORY_BIBLE_LIMITS.character.speakingStyle}
                                        value={character.speakingStyle ?? ""}
                                        placeholder="How they phrase, rhythm, vocabulary, cadence."
                                        onChange={(event) =>
                                          updateV2Character(character.id, { speakingStyle: event.target.value })
                                        }
                                      />
                                    </div>
                                  </div>
                                  <label>Voice notes</label>
                                  <textarea
                                    className="pw-bible-input"
                                    rows={2}
                                    maxLength={STORY_BIBLE_LIMITS.character.voiceNotes}
                                    value={character.voiceNotes ?? ""}
                                    placeholder="Signature lines, filler words, sarcasm level, humor style."
                                    onChange={(event) => updateV2Character(character.id, { voiceNotes: event.target.value })}
                                  />
                                </div>

                                <div className="pw-character-section-card">
                                  <h4>Behavior Engine</h4>
                                  <div className="pw-bible-grid-2">
                                    <div>
                                      <label>Goals</label>
                                      <textarea
                                        className="pw-bible-input"
                                        rows={2}
                                        maxLength={STORY_BIBLE_LIMITS.character.goals}
                                        value={character.goals ?? ""}
                                        onChange={(event) => updateV2Character(character.id, { goals: event.target.value })}
                                      />
                                    </div>
                                    <div>
                                      <label>Fears</label>
                                      <textarea
                                        className="pw-bible-input"
                                        rows={2}
                                        maxLength={STORY_BIBLE_LIMITS.character.fears}
                                        value={character.fears ?? ""}
                                        onChange={(event) => updateV2Character(character.id, { fears: event.target.value })}
                                      />
                                    </div>
                                  </div>
                                  <label>Reaction pattern</label>
                                  <textarea
                                    className="pw-bible-input"
                                    rows={2}
                                    maxLength={STORY_BIBLE_LIMITS.character.reactionPattern}
                                    placeholder="How they react when cornered, betrayed, or under stress."
                                    value={character.reactionPattern ?? ""}
                                    onChange={(event) =>
                                      updateV2Character(character.id, { reactionPattern: event.target.value })
                                    }
                                  />
                                </div>

                                <div className="pw-character-section-card">
                                  <h4>Secrets and Reveal Control</h4>
                                  <p className="pw-character-secret-note">
                                    Author-only secrets stay private. Use reader hint only for subtle foreshadowing.
                                  </p>
                                  <div className="pw-bible-grid-2">
                                    <div>
                                      <label>Author-only secret</label>
                                      <textarea
                                        className="pw-bible-input"
                                        rows={2}
                                        maxLength={STORY_BIBLE_LIMITS.character.secrets}
                                        value={character.secrets ?? ""}
                                        onChange={(event) => updateV2Character(character.id, { secrets: event.target.value })}
                                      />
                                    </div>
                                    <div>
                                      <label>Reader-visible hint (safe)</label>
                                      <textarea
                                        className="pw-bible-input"
                                        rows={2}
                                        maxLength={STORY_BIBLE_LIMITS.character.readerSecretHint}
                                        value={character.readerSecretHint ?? ""}
                                        onChange={(event) =>
                                          updateV2Character(character.id, { readerSecretHint: event.target.value })
                                        }
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="pw-character-section-card">
                                  <h4>Metadata</h4>
                                  <div className="pw-bible-grid-3">
                                    <div>
                                      <label>Groups</label>
                                      <input
                                        className="pw-bible-input"
                                        maxLength={STORY_BIBLE_LIMITS.character.groups}
                                        value={character.groups ?? ""}
                                        onChange={(event) => updateV2Character(character.id, { groups: event.target.value })}
                                      />
                                    </div>
                                    <div>
                                      <label>Other Names</label>
                                      <input
                                        className="pw-bible-input"
                                        maxLength={STORY_BIBLE_LIMITS.character.otherNames}
                                        value={character.otherNames ?? ""}
                                        onChange={(event) =>
                                          updateV2Character(character.id, { otherNames: event.target.value })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <label>Tags (comma separated)</label>
                                      <input
                                        className="pw-bible-input"
                                        maxLength={CHARACTER_TAG_INPUT_MAX}
                                        value={(character.tags ?? []).join(", ")}
                                        onChange={(event) =>
                                          updateV2Character(character.id, {
                                            tags: event.target.value
                                              .split(",")
                                              .map((s) => s.trim())
                                              .filter(Boolean),
                                          })
                                        }
                                      />
                                    </div>
                                  </div>
                                  <div className="pw-bible-flex-head">
                                    <label>Relationships</label>
                                    <button
                                      type="button"
                                      className="pw-ai-mini-btn pw-bible-field-btn"
                                      onClick={() => addCharacterRelationship(character.id)}
                                      disabled={availableRelationshipTargets.length === 0}
                                    >
                                      + Add link
                                    </button>
                                  </div>
                                  {availableRelationshipTargets.length === 0 ? (
                                    <p className="pw-character-relationship-empty">
                                      Add at least two characters to connect relationships.
                                    </p>
                                  ) : (character.relationships ?? []).length === 0 ? (
                                    <p className="pw-character-relationship-empty">
                                      No relationship links yet.
                                    </p>
                                  ) : (
                                    <div className="pw-character-rel-list">
                                      {(character.relationships ?? []).map((relationship, index) => (
                                        <div key={`${character.id}-rel-${index}`} className="pw-character-rel-row">
                                          <select
                                            className="pw-bible-input"
                                            value={relationship.targetCharacterId}
                                            onChange={(event) =>
                                              updateCharacterRelationship(character.id, index, {
                                                targetCharacterId: event.target.value,
                                              })
                                            }
                                          >
                                            <option value="">Select character</option>
                                            {availableRelationshipTargets.map((targetCharacter) => (
                                              <option key={targetCharacter.id} value={targetCharacter.id}>
                                                {targetCharacter.name || "Unnamed character"}
                                              </option>
                                            ))}
                                          </select>
                                          <input
                                            className="pw-bible-input"
                                            maxLength={STORY_BIBLE_LIMITS.character.relationshipType}
                                            placeholder="Type (rival, sibling, mentor)"
                                            value={relationship.type ?? ""}
                                            onChange={(event) =>
                                              updateCharacterRelationship(character.id, index, {
                                                type: event.target.value,
                                              })
                                            }
                                          />
                                          <input
                                            className="pw-bible-input"
                                            maxLength={STORY_BIBLE_LIMITS.character.relationshipDescription}
                                            placeholder="Short note (optional)"
                                            value={relationship.description ?? ""}
                                            onChange={(event) =>
                                              updateCharacterRelationship(character.id, index, {
                                                description: event.target.value,
                                              })
                                            }
                                          />
                                          <button
                                            type="button"
                                            className="pw-character-delete"
                                            onClick={() => removeCharacterRelationship(character.id, index)}
                                          >
                                            Remove
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <div className="pw-char-footer">
                                  <div>
                                    <button
                                      type="button"
                                      className="pw-character-delete"
                                      onClick={() => removeV2Character(character.id)}
                                    >
                                      Remove character
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })()
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {bibleSection === "locations" && (
                  <div className="pw-bible-section">
                    <div className="pw-bible-flex-head">
                      <div>
                        <h3>Locations</h3>
                        <p className="pw-bible-section-note">
                          Add a location name and short description. If it is a real-world place, we can pull a compact
                          reference paragraph automatically.
                        </p>
                      </div>
                      <div className="pw-bible-inline-actions">
                        <button
                          type="button"
                          className="pw-bible-clear-btn"
                          onClick={() => clearBibleSection("locations")}
                          title="Clear this section"
                        >
                          Clear this section
                        </button>
                        {!aiOff && (
                        <button
                          type="button"
                          className="pw-ai-mini-btn"
                          onClick={() => void runGenerateLocationsFromStoryBible()}
                          disabled={storyAiBusyAction !== null}
                        >
                          {storyAiBusyAction === "locations-generate"
                            ? "Generating..."
                            : "Generate locations from Canon"}
                        </button>
                        )}
                        <button type="button" className="btn btn-primary" onClick={addLocation}>
                          + Add Location
                        </button>
                      </div>
                    </div>

                    {locationLookupMessage && <p className="pw-ora-muted pw-bible-ai-error">{locationLookupMessage}</p>}
                    {!aiOff && storyAiError && <p className="pw-ora-error pw-bible-ai-error">{storyAiError}</p>}

                    {storyLocations.length === 0 ? (
                      <p className="pw-overview-empty">
                        No locations yet. Add one manually or generate from Canon.
                      </p>
                    ) : (
                      <div className="pw-bible-events-list">
                        {storyLocations.map((location) => (
                          <div key={location.id} className="pw-bible-event-card">
                            <div className="pw-location-card-head">
                              <div className="pw-location-name-wrap">
                                <label>Location name</label>
                                <input
                                  className="pw-bible-input"
                                  maxLength={STORY_BIBLE_LIMITS.location.name}
                                  value={location.name}
                                  placeholder="e.g. Harrogate"
                                  onChange={(event) => updateLocationName(location.id, event.target.value)}
                                  onBlur={() => {
                                    if (!location.name.trim()) return;
                                    void lookupLocationFromRealWorld(location.id, false);
                                  }}
                                />
                              </div>
                              <div className="pw-location-actions">
                                {!aiOff && (
                                <button
                                  type="button"
                                  className="pw-ai-mini-btn"
                                  onClick={() => void lookupLocationFromRealWorld(location.id, true)}
                                  disabled={locationLookupBusyId === location.id}
                                >
                                  {locationLookupBusyId === location.id ? "Looking up..." : "Find real location"}
                                </button>
                                )}
                                <button
                                  type="button"
                                  className="pw-character-delete"
                                  onClick={() => removeLocation(location.id)}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>

                            <label>Description</label>
                            <textarea
                              className="pw-bible-input"
                              rows={3}
                              maxLength={STORY_BIBLE_LIMITS.location.description}
                              placeholder="Describe this location for story consistency and assistant context."
                              value={location.description}
                              onChange={(event) => updateLocation(location.id, { description: event.target.value })}
                            />
                            <p className="pw-field-help">
                              {location.description.length}/{STORY_BIBLE_LIMITS.location.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {bibleSection === "worldbuilding" && (
                  <div className="pw-bible-section">
                    <div className="pw-bible-flex-head">
                      <div>
                        <h3>Worldbuilding & Lore</h3>
                        <p className="pw-bible-section-note">
                          Keep your world rules, systems, culture, and canon constraints in one clean place.
                        </p>
                      </div>
                      <div className="pw-bible-inline-actions">
                        <button
                          type="button"
                          className="pw-bible-clear-btn"
                          onClick={() => clearBibleSection("worldbuilding")}
                          title="Clear this section"
                        >
                          Clear this section
                        </button>
                        {!aiOff && (
                        <button
                          type="button"
                          className="pw-ai-mini-btn"
                          onClick={() => void runGenerateWorldbuildingFromStoryBible()}
                          disabled={storyAiBusyAction !== null}
                        >
                          {storyAiBusyAction === "worldbuilding-generate" ? "Generating..." : "Generate lore"}
                        </button>
                        )}
                        <button type="button" className="btn" onClick={addLoreEntry}>
                          + Add lore entry
                        </button>
                      </div>
                    </div>

                    <label>Worldbuilding notes</label>
                    <textarea
                      className="pw-bible-input"
                      rows={4}
                      maxLength={STORY_BIBLE_LIMITS.worldbuilding}
                      placeholder="High-level world notes, atmosphere, broad setting guidance."
                      value={novel.storyBible.worldbuilding ?? ""}
                      onChange={(event) => updateStoryBible({ worldbuilding: event.target.value })}
                    />
                    <p className="pw-field-help">
                      {(novel.storyBible.worldbuilding ?? "").length}/{STORY_BIBLE_LIMITS.worldbuilding}
                    </p>

                    {!aiOff && storyAiError && <p className="pw-ora-error pw-bible-ai-error">{storyAiError}</p>}

                    {(novel.storyBible.lore ?? []).length === 0 ? (
                      <p className="pw-overview-empty">
                        No lore entries yet. Add entries manually or generate lore from Canon.
                      </p>
                    ) : (
                      <div className="pw-bible-events-list">
                        {(novel.storyBible.lore ?? []).map((entry) => (
                          <div key={entry.id} className="pw-bible-event-card">
                            <div className="pw-bible-grid-3">
                              <div>
                                <label>Title</label>
                                <input
                                  className="pw-bible-input"
                                  maxLength={STORY_BIBLE_LIMITS.lore.title}
                                  value={entry.title}
                                  onChange={(event) => updateLoreEntry(entry.id, { title: event.target.value })}
                                />
                              </div>
                              <div>
                                <label>Category</label>
                                <select
                                  className="pw-bible-input"
                                  value={entry.category}
                                  onChange={(event) =>
                                    updateLoreEntry(entry.id, {
                                      category:
                                        event.target.value as NonNullable<
                                          Novel["storyBible"]["lore"][number]["category"]
                                        >,
                                    })
                                  }
                                >
                                  <option value="Magic">Magic</option>
                                  <option value="Tech">Tech</option>
                                  <option value="Culture">Culture</option>
                                  <option value="History">History</option>
                                  <option value="Religion">Religion</option>
                                  <option value="Politics">Politics</option>
                                  <option value="Other">Other</option>
                                </select>
                              </div>
                              <div className="pw-char-footer">
                                {!aiOff && (
                                <button
                                  type="button"
                                  className="pw-ai-mini-btn"
                                  onClick={() => void runEnhanceLoreEntry(entry.id)}
                                  disabled={storyAiBusyAction !== null}
                                >
                                  {storyAiBusyAction === `lore-${entry.id}` ? "Improving..." : "Improve entry"}
                                </button>
                                )}
                                <button
                                  type="button"
                                  className="pw-character-delete"
                                  onClick={() => removeLoreEntry(entry.id)}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                            <label>Description</label>
                            <textarea
                              className="pw-bible-input"
                              rows={3}
                              maxLength={STORY_BIBLE_LIMITS.lore.content}
                              placeholder="Canon description, world rule, or setting detail."
                              value={entry.content}
                              onChange={(event) => updateLoreEntry(entry.id, { content: event.target.value })}
                            />
                            <p className="pw-field-help">
                              {entry.content.length}/{STORY_BIBLE_LIMITS.lore.content}
                            </p>
                            <label>Constraints (comma separated)</label>
                            <input
                              className="pw-bible-input"
                              maxLength={LORE_CONSTRAINT_INPUT_MAX}
                              value={(entry.constraints ?? []).join(", ")}
                              placeholder="Hard rules the assistant must not break"
                              onChange={(event) =>
                                updateLoreEntry(entry.id, {
                                  constraints: event.target.value
                                    .split(",")
                                    .map((item) => item.trim())
                                    .filter(Boolean),
                                })
                              }
                            />
                          </div>
                        ))}
                      </div>
                    )}

                  </div>
                )}

                {bibleSection === "boltons" && (
                  <div className="pw-bible-section">
                    {/* ── Top bar: title + actions ── */}
                    <div className="pw-bible-flex-head">
                      <div>
                        <h3>Bolt-Ons</h3>
                        <p className="pw-bible-section-note">
                          Steer the AI with reusable instructions. Describe what you want in plain English, then build it into a focused prompt.
                        </p>
                      </div>
                      <div className="pw-bible-inline-actions">
                        <button
                          type="button"
                          className="pw-bolton-add-btn pw-bolton-save-btn"
                          disabled={allBoltons.length === 0}
                          onClick={() => void saveBoltonLibrary()}
                          title="Save all bolt-ons so they're available in new projects"
                        >
                          Save All
                        </button>
                        <button
                          type="button"
                          className="pw-bolton-add-btn"
                          disabled={boltonLibraryCount === 0 || allBoltons.length >= 10}
                          onClick={loadBoltonLibrary}
                          title={boltonLibraryCount > 0 ? `Load ${boltonLibraryCount} saved bolt-on(s)` : "No saved bolt-ons yet"}
                        >
                          Load Saved {boltonLibraryCount > 0 ? `(${boltonLibraryCount})` : ""}
                        </button>
                        <button
                          type="button"
                          className="pw-bible-clear-btn"
                          onClick={() => clearBibleSection("boltons")}
                          title="Clear all bolt-ons"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* ── Quick-add by category ── */}
                    <div className="pw-bolton-quick-cats">
                      <span className="pw-bolton-quick-label">Quick add:</span>
                      {BOLTON_PLUGIN_CATEGORIES.filter((category) => category.id !== "custom").map((category) => (
                        <button
                          key={category.id}
                          type="button"
                          className="pw-bolton-quick-cat-btn"
                          disabled={allBoltons.length >= 10}
                          onClick={() => addBolton(category.id)}
                          title={category.hint}
                        >
                          + {category.label}
                        </button>
                      ))}
                      {allBoltons.length < 10 && (
                        <button
                          type="button"
                          className="pw-bolton-quick-cat-btn pw-bolton-quick-custom"
                          onClick={() => addBolton()}
                        >
                          + Custom
                        </button>
                      )}
                    </div>

                    {/* ── Filter tabs ── */}
                    {allBoltons.length > 0 && (
                    <div className="pw-bolton-filter-row">
                      <button
                        type="button"
                        className={`pw-bolton-filter-btn ${boltonCategoryFilter === "all" ? "active" : ""}`}
                        onClick={() => setBoltonCategoryFilter("all")}
                      >
                        All ({allBoltons.length})
                      </button>
                      {BOLTON_PLUGIN_CATEGORIES.map((category) => {
                        const count = allBoltons.filter((bolton) => normalizeBoltonCategory(bolton.category) === category.id).length;
                        if (count === 0) return null;
                        return (
                          <button
                            key={category.id}
                            type="button"
                            className={`pw-bolton-filter-btn ${boltonCategoryFilter === category.id ? "active" : ""}`}
                            onClick={() => setBoltonCategoryFilter(category.id)}
                            title={category.hint}
                          >
                            {category.label} ({count})
                          </button>
                        );
                      })}
                    </div>
                    )}

                    {!aiOff && storyAiError && <p className="pw-ora-error pw-bible-ai-error">{storyAiError}</p>}

                    {allBoltons.length === 0 ? (
                      <div className="pw-bolton-empty">
                        <div className="pw-bolton-empty-icon">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                        </div>
                        <p style={{ fontWeight: 500, marginBottom: 4 }}>No bolt-ons yet</p>
                        <p style={{ fontSize: 12, opacity: 0.6 }}>Click a category above to add your first bolt-on. Describe what you want in plain English and the AI will build a focused prompt.</p>
                      </div>
                    ) : visibleBoltons.length === 0 ? (
                      <div className="pw-bolton-empty">
                        <p>No bolt-ons in this category.</p>
                      </div>
                    ) : (
                      <div className="pw-bolton-grid">
                        {visibleBoltons.map((bolton, idx) => (
                          <div key={bolton.id} className={`pw-bolton-card ${bolton.prompt ? "pw-bolton-card-ready" : ""}`}>
                            <div className="pw-bolton-card-head">
                              <div className="pw-bolton-card-num">{idx + 1}</div>
                              <input
                                className="pw-bolton-card-title"
                                placeholder="Name this bolt-on..."
                                maxLength={40}
                                value={bolton.title}
                                onChange={(e) => updateBolton(bolton.id, { title: e.target.value })}
                              />
                              <select
                                className="pw-bolton-category-select"
                                value={normalizeBoltonCategory(bolton.category)}
                                onChange={(event) =>
                                  updateBolton(bolton.id, { category: normalizeBoltonCategory(event.target.value) })
                                }
                              >
                                {BOLTON_PLUGIN_CATEGORIES.map((category) => (
                                  <option key={category.id} value={category.id}>
                                    {category.label}
                                  </option>
                                ))}
                              </select>
                              <button type="button" className="pw-bolton-remove" onClick={() => removeBolton(bolton.id)} title="Delete bolt-on">×</button>
                            </div>

                            {/* Step 1: User describes what they want */}
                            <div className="pw-bolton-step">
                              <span className="pw-bolton-step-label">{bolton.prompt ? "Your instruction" : "Step 1 — Describe what you want"}</span>
                              <textarea
                                className="pw-bolton-desc"
                                rows={3}
                                maxLength={500}
                                placeholder="Example: Push subtext in dialogue, end scenes with unresolved tension, and keep descriptions sparse and atmospheric."
                                value={bolton.description}
                                onChange={(e) => updateBolton(bolton.id, { description: e.target.value })}
                                onKeyDown={(e) => e.stopPropagation()}
                              />
                              <div className="pw-bolton-card-foot">
                                <span className="pw-bolton-char-count">{bolton.description.length}/500</span>
                                {!aiOff && (
                                <button
                                  type="button"
                                  className="pw-bolton-sharpen-btn"
                                  disabled={storyAiBusyAction !== null || !bolton.description.trim()}
                                  onClick={() => void sharpenBolton(bolton.id)}
                                >
                                  {storyAiBusyAction === `bolton-${bolton.id}` ? "Building prompt..." : bolton.prompt ? "Rebuild prompt" : "Build AI prompt"}
                                </button>
                                )}
                              </div>
                            </div>

                            {/* Step 2: AI-built prompt preview */}
                            {bolton.prompt && (
                              <div className="pw-bolton-step pw-bolton-prompt-preview">
                                <span className="pw-bolton-step-label pw-bolton-step-ready">AI prompt ready ({getBoltonDirectiveText(bolton).length}/500)</span>
                                <p className="pw-bolton-prompt-text">{getBoltonDirectiveText(bolton)}</p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {bibleSection === "styleVoice" && (
                  <div className="pw-bible-section">
                    <div className="pw-bible-flex-head">
                      <h3>Style & Voice</h3>
                      <button
                        type="button"
                        className="pw-bible-clear-btn"
                        onClick={() => clearBibleSection("styleVoice")}
                        title="Clear this section"
                      >
                        Clear this section
                      </button>
                    </div>
                    <div className="pw-bible-grid-3">
                      <div>
                        <label>POV</label>
                        <select
                          className="pw-bible-input"
                          value={novel.storyBible.styleVoice.pov ?? ""}
                          onChange={(event) =>
                            updateStoryBible({
                              styleVoice: { ...novel.storyBible.styleVoice, pov: event.target.value },
                            })
                          }
                        >
                          <option value="">Select POV</option>
                          {POV_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label>Tense</label>
                        <select
                          className="pw-bible-input"
                          value={novel.storyBible.styleVoice.tense ?? ""}
                          onChange={(event) =>
                            updateStoryBible({
                              styleVoice: { ...novel.storyBible.styleVoice, tense: event.target.value },
                            })
                          }
                        >
                          <option value="">Select tense</option>
                          {TENSE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label>Narrating character (optional)</label>
                        <select
                          className="pw-bible-input"
                          value={novel.storyBible.styleVoice.povCharacterId ?? ""}
                          onChange={(event) =>
                            updateStoryBible({
                              styleVoice: { ...novel.storyBible.styleVoice, povCharacterId: event.target.value },
                            })
                          }
                        >
                          <option value="">None selected</option>
                          {storyCharacters.map((character) => (
                            <option key={character.id} value={character.id}>
                              {character.name || "Unnamed character"}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="pw-bible-field-head">
                      <label>Genre &amp; Tone</label>
                      {!aiOff && <div className="pw-bible-field-ai">
                        <select
                          className="pw-bible-input pw-bible-field-select"
                          value={summaryAiMode.palette}
                          onChange={(event) =>
                            setSummaryAiMode((current) => ({
                              ...current,
                              palette: event.target.value as typeof current.palette,
                            }))
                          }
                        >
                          <option value="classify">Classify from synopsis</option>
                          <option value="refresh">Refresh alternatives</option>
                          <option value="blend">Suggest genre blend</option>
                          <option value="audience">Align for target audience</option>
                        </select>
                        <button
                          type="button"
                          className="pw-ai-mini-btn pw-bible-field-btn"
                          disabled={storyAiBusyAction !== null}
                          onClick={() => void runSummaryFieldAi("palette", summaryAiMode.palette)}
                        >
                          {storyAiBusyAction === "summary-field-palette" ? "Running..." : "Run Assistant"}
                        </button>
                      </div>}
                    </div>
                    <div className="pw-bible-genre-picker">
                      <select
                        className="pw-bible-input pw-bible-field-select"
                        value={summaryGenreDraft}
                        onChange={(event) => setSummaryGenreDraft(event.target.value)}
                      >
                        {GENRE_OPTIONS.map((genreOption) => (
                          <option key={genreOption} value={genreOption}>
                            {genreOption}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="pw-ai-mini-btn pw-bible-field-btn"
                        onClick={() => addSummaryGenre(summaryGenreDraft)}
                      >
                        Add genre
                      </button>
                      <input
                        className="pw-bible-input pw-bible-field-select"
                        value={summaryCustomGenreDraft}
                        maxLength={STORY_BIBLE_LIMITS.summary.listItem}
                        placeholder="Custom genre"
                        onChange={(event) => setSummaryCustomGenreDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter") return;
                          event.preventDefault();
                          addSummaryGenre(summaryCustomGenreDraft);
                          setSummaryCustomGenreDraft("");
                        }}
                      />
                      <button
                        type="button"
                        className="pw-ai-mini-btn pw-bible-field-btn"
                        onClick={() => {
                          addSummaryGenre(summaryCustomGenreDraft);
                          setSummaryCustomGenreDraft("");
                        }}
                      >
                        Add custom
                      </button>
                    </div>
                    <div className="pw-bible-tag-list">
                      {(novel.storyBible.summary.genre ?? []).length === 0 ? (
                        <p className="pw-overview-empty">No genres selected yet.</p>
                      ) : (
                        novel.storyBible.summary.genre.map((genreTag) => (
                          <button
                            key={genreTag}
                            type="button"
                            className="pw-bible-tag-chip"
                            onClick={() => removeSummaryGenre(genreTag)}
                            title="Remove genre"
                          >
                            {genreTag} x
                          </button>
                        ))
                      )}
                    </div>
                    <label>Tone (comma separated)</label>
                    <input
                      className="pw-bible-input"
                      maxLength={SUMMARY_LIST_INPUT_MAX}
                      value={novel.storyBible.summary.tone.join(", ")}
                      onChange={(event) =>
                        updateStoryBible({
                          summary: {
                            ...novel.storyBible.summary,
                            tone: event.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          },
                        })
                      }
                    />
                    {!aiOff && (
                    <>
                    <label>What&apos;s your style?</label>
                    <div className="pw-ai-assist-row">
                      <input
                        className="pw-bible-input pw-ai-assist-select"
                        maxLength={STORY_BIBLE_LIMITS.styleVoice.compItem}
                        placeholder="Describe or enter a style..."
                        value={styleAuthorDraft}
                        onChange={(event) => setStyleAuthorDraft(event.target.value)}
                      />
                      <button
                        type="button"
                        className="pw-ai-mini-btn"
                        onClick={() => void runDescribeWriterStyle()}
                        disabled={storyAiBusyAction !== null}
                      >
                        {storyAiBusyAction === "style-author" ? "Analyzing..." : "Analyze Style"}
                      </button>
                    </div>
                    </>
                    )}
                    <label>Voice rules</label>
                    <textarea
                      className="pw-bible-input"
                      rows={3}
                      maxLength={STORY_BIBLE_LIMITS.styleVoice.voiceRules}
                      value={novel.storyBible.styleVoice.voiceRules ?? ""}
                      onChange={(event) =>
                        updateStoryBible({
                          styleVoice: { ...novel.storyBible.styleVoice, voiceRules: event.target.value },
                        })
                      }
                    />
                    <p className="pw-field-help">
                      {(novel.storyBible.styleVoice.voiceRules ?? "").length}/{STORY_BIBLE_LIMITS.styleVoice.voiceRules}
                    </p>
                    <label>Banned words (comma separated)</label>
                    <input
                      className="pw-bible-input"
                      maxLength={BANNED_WORDS_INPUT_MAX}
                      value={(novel.storyBible.styleVoice.bannedWords ?? []).join(", ")}
                      onChange={(event) =>
                        updateStoryBible({
                          styleVoice: {
                            ...novel.storyBible.styleVoice,
                            bannedWords: event.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter(Boolean),
                          },
                        })
                      }
                    />
                    <p className="pw-field-help">
                      {(novel.storyBible.styleVoice.bannedWords ?? []).join(", ").length}/{BANNED_WORDS_INPUT_MAX}
                    </p>
                    {!aiOff && storyAiError && <p className="pw-ora-error pw-bible-ai-error">{storyAiError}</p>}
                  </div>
                )}

              </section>
            </div>
          </div>
        </div>
      )}

      {showPlanGenerateModal && (
        <div className="pw-modal-overlay" onClick={() => setShowPlanGenerateModal(false)}>
          <div className="pw-modal pw-plan-generate-modal" onClick={(event) => event.stopPropagation()}>
            <div style={{ textAlign: "center", marginBottom: "4px" }}>
              <div style={{ fontSize: "28px", marginBottom: "6px" }}>✦</div>
              <div className="pw-delete-modal-title" style={{ fontSize: "18px", fontWeight: 800 }}>
                AI Chapter Generation
              </div>
            </div>
            <p className="pw-delete-modal-copy" style={{ textAlign: "center", margin: "0 0 16px", lineHeight: "1.5" }}>
              Generate chapters one at a time from your synopsis and Canon. Each chapter builds on the last to save tokens.
            </p>

            {planChapters.length > 0 && (
              <div className="pw-plan-gen-warning">
                ⚠️ This will remove your existing {planChapters.length} chapter{planChapters.length === 1 ? "" : "s"}. You will be asked to confirm before generating.
              </div>
            )}

            <div className="pw-plan-gen-custom">
              <label style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--pw-text-dim)", marginBottom: "6px", display: "block" }}>
                Number of chapters
              </label>
              <p style={{ fontSize: 11, color: "var(--pw-text-dim)", margin: "0 0 6px" }}>
                Pick a preset or type any number up to {PLAN_CHAPTER_MAX}.
              </p>
              <input
                className="pw-plan-gen-number-input"
                type="number"
                min={1}
                max={PLAN_CHAPTER_MAX}
                value={planGenerateCustomCount}
                onChange={(event) => setPlanGenerateCustomCount(event.target.value)}
                placeholder="Chapters"
              />
              <div className="pw-plan-gen-presets">
                {PLAN_CHAPTER_PRESETS.map((n) => (
                  <button
                    key={`preset-${n}`}
                    type="button"
                    className={`pw-plan-gen-preset-btn ${planGenerateCustomCount === String(n) ? "active" : ""}`}
                    onClick={() => setPlanGenerateCustomCount(String(n))}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: "12px" }}>
                <label
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--pw-text-dim)",
                    marginBottom: "6px",
                    display: "block",
                  }}
                >
                  Story pacing
                </label>
                <select
                  className="pw-select"
                  value={planGeneratePacingMode}
                  onChange={(event) => setPlanGeneratePacingMode(event.target.value as "balanced" | "slow-burn" | "fast")}
                >
                  <option value="balanced">Balanced novel pacing</option>
                  <option value="slow-burn">Slow-burn (gradual build)</option>
                  <option value="fast">Fast-paced (quicker progression)</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
              <button
                type="button"
                className="btn pw-cancel-btn"
                style={{ flex: 1 }}
                onClick={() => setShowPlanGenerateModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 2 }}
                onClick={confirmPlanGeneration}
              >
                ✦ Generate Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingChapterDelete && (
        <div className="pw-modal-overlay" onClick={() => setPendingChapterDelete(null)}>
          <div className="pw-modal" onClick={(event) => event.stopPropagation()}>
            <div className="pw-delete-modal-title">Delete chapter?</div>
            <p className="pw-delete-modal-copy">
              This will permanently remove <strong>{pendingChapterDelete.title}</strong>.
            </p>
            <div className="pw-delete-modal-actions">
              <button type="button" className="btn pw-cancel-btn" onClick={() => setPendingChapterDelete(null)}>
                Cancel
              </button>
              <button type="button" className="btn pw-danger-btn" onClick={confirmDeleteChapter}>
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}

      <ProfilePopup
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        novel={novel}
        onGrammarLocaleChange={(code) => setGrammarLocale(code)}
        onUpdateStoryBible={(patch) => {
          mutateNovel((current) => ({
            ...current,
            storyBible: {
              ...current.storyBible,
              ...patch,
              aiContext: {
                ...current.storyBible.aiContext,
                ...(patch.aiContext ?? {}),
              },
            },
          }));
        }}
        onProviderSettingsChange={(settings) => {
          setAssistantProvider(settings.provider);
          setOpenRouterKey(settings.key);
          setOpenRouterModel(settings.model);
          setAssistantBaseUrl(settings.baseUrl);
        }}
        onAiToggle={(off) => setAiOff(off)}
        onLogout={async () => {
          try {
            await fetch("/api/auth/logout", { method: "POST" });
          } catch { /* ignore */ }
          window.location.href = "/";
        }}
        onSettingsChange={() => void saveSettingsToServer(gatherSettings())}
      />
    </div>
  );
}

export default dynamic(() => Promise.resolve(NovelWorkspacePage), {
  ssr: false,
});
