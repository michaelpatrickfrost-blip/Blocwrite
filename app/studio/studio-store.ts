export type SceneBlock = {
  synopsis: string;       // scene beat description (location, POV, goal, conflict, turning point, outcome)
  wordTarget: number;     // prose pacing target (400/600/800/1000)
  focus: string;          // "default" | "dialogue" | "action" | "introspection" | "atmosphere"
  notes: string;          // optional user notes
};

export type Chapter = {
  id: string;
  title: string;
  subtitle: string;
  content: string;            // chapter body (prose only — the actual novel text)
  sceneBlocks?: SceneBlock[]; // planning blocks (not exported, not counted in word count)
  goalWords?: number;
  createdAt: string;
  updatedAt: string;
};

export type StoryCharacter = {
  id: string;
  name: string;
  role: string;
  pronouns: string;
  notes: string;
  groups: string;
  otherNames: string;
  personality: string;
  background: string;
  appearance: string;
};

export type SummarySection = {
  premise: string;
  synopsisShort: string;
  themes: string[];
  genre: string[];
  tone: string[];
  stakes: string;
};

export type Relationship = {
  targetCharacterId: string;
  type: string;
  description?: string;
};

export type Character = {
  id: string;
  name: string;
  role: "Protagonist" | "Antagonist" | "Supporting" | "Minor" | "Love Interest" | "Custom" | "Type";
  logline: string;
  appearance?: string;
  personality?: string;
  goals?: string;
  fears?: string;
  backstory?: string;
  secrets?: string;
  readerSecretHint?: string;
  accent?: string;
  speakingStyle?: string;
  reactionPattern?: string;
  relationships?: Relationship[];
  voiceNotes?: string;
  tags?: string[];
  pronouns?: string;
  groups?: string;
  otherNames?: string;
};

export type Location = {
  id: string;
  name: string;
  type?: string;
  description: string;
  sensoryDetails?: string;
  rules?: string;
  significance?: string;
  tags?: string[];
};

export type LoreEntry = {
  id: string;
  title: string;
  category: "Magic" | "Tech" | "Culture" | "History" | "Religion" | "Politics" | "Other";
  content: string;
  constraints?: string[];
};

export type Faction = {
  id: string;
  name: string;
  ideology?: string;
  goals?: string;
  hierarchy?: string;
  relationships?: string;
};

export type Item = {
  id: string;
  name: string;
  description: string;
  origin?: string;
  powersOrUse?: string;
  limitations?: string;
};

export type TimelineEvent = {
  id: string;
  name: string;
  when: string;
  summary: string;
  chapterId?: string;
  affectedEntities?: { type: "Character" | "Location" | "Faction" | "Item"; id: string }[];
};

export type GlossaryTerm = {
  id: string;
  term: string;
  pronunciation?: string;
  definition: string;
};

export type BoltonCategory =
  | "voice-style"
  | "pacing-tension"
  | "dialogue-subtext"
  | "description-sensory"
  | "emotion-psychology"
  | "plot-structure"
  | "world-atmosphere"
  | "custom";

export type Bolton = {
  id: string;
  title: string;
  category?: BoltonCategory;
  description: string;
  prompt: string;
  createdAt: string;
};

export type StyleVoiceSection = {
  pov?: string;
  povCharacterId?: string;
  tense?: string;
  comps?: string[];
  bannedWords?: string[];
  voiceRules?: string;
};

export type AIContextSettings = {
  defaultModel: string;
  strictCanon: boolean;
  includeSummaryByDefault: boolean;
  includeStyleByDefault: boolean;
  maxContextTokens?: number;
};

export type BookPlanChapter = {
  id: string;
  title: string;
  synopsis: string;
  characterIds: string[];
  locationIds: string[];
  loreIds: string[];
  manuscriptChapterId?: string;
};

/** Arc Intelligence Engine — narrative arc analysis per plan */
export type ArcDimension =
  | "goal-evolution"
  | "flaw-growth"
  | "stagnation"
  | "midpoint-shift"
  | "third-act-escalation";

export type ArcIssue = {
  dimension: ArcDimension;
  chapter?: number;       // 1-based chapter number (null = overall)
  severity: "info" | "warning" | "critical";
  message: string;
  suggestion: string;
};

export type ArcScore = {
  dimension: ArcDimension;
  score: number;  // 1–10
  label: string;
  summary: string;
};

export type ArcAnalysis = {
  scores: ArcScore[];
  issues: ArcIssue[];
  overall: number;        // 1–10 average
  generatedAt: string;
};

export type BookPlan = {
  chapters: BookPlanChapter[];
  aiChapterTarget: "auto" | number;
  pacingMode?: "balanced" | "slow-burn" | "fast";
  arcAnalysis?: ArcAnalysis | null;
  updatedAt: string;
};

export type StoryBible = {
  summary: SummarySection;
  styleVoice: StyleVoiceSection;
  bookPlan: BookPlan;
  characters: Character[];
  locations: Location[];
  lore: LoreEntry[];
  factions: Faction[];
  items: Item[];
  timeline: TimelineEvent[];
  glossary: GlossaryTerm[];
  boltons: Bolton[];
  aiContext: AIContextSettings;
  // Legacy simple fields kept for backward compatibility with existing UI while Canon evolves.
  braindump: string;
  genre: string;
  style: string;
  synopsis: string;
  charactersText: string;
  worldbuilding: string;
  outline: string;
  charactersList: StoryCharacter[];
  updatedAt: string;
};

/** Manuscript health score — AI-generated publishing readiness report */
export type ManuscriptHealthScore = {
  pacing: number;        // 1–10
  dialogue: number;      // 1–10
  clarity: number;       // 1–10
  engagement: number;    // 1–10
  overall: number;       // 1–10 (average)
  tips: string[];        // actionable edits (max 5)
  generatedAt: string;   // ISO timestamp
};

export type Novel = {
  id: string;
  title: string;
  authorName: string;
  synopsis: string;
  goalWords: number;
  coverImage: string | null;
  chapters: Chapter[];
  storyBible: StoryBible;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
  healthScore?: ManuscriptHealthScore | null;
};

// ─── User-scoped localStorage keys ────────────────────────────────────────────
// Each user gets their own localStorage slot to prevent cross-user data leakage.
// We use a simple hash of the email to scope the key.

const LEGACY_STORAGE_KEY = "pilotwriter.novels.v1";
const LEGACY_BACKUP_KEY = "pilotwriter.novels.backup.v1";

let _currentUserHash: string | null = null;

function userHash(email: string): string {
  // Simple deterministic hash for localStorage key scoping
  let h = 0;
  const s = email.trim().toLowerCase();
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

/** Call once when the user session is known to scope all storage to that user. */
export function initUserScope(email: string) {
  _currentUserHash = userHash(email);
  if (typeof window === "undefined") return;
  // Clear any legacy (unscoped) data so it never leaks to the wrong user
  try { window.localStorage.removeItem(LEGACY_STORAGE_KEY); } catch { /* ignore */ }
  try { window.localStorage.removeItem(LEGACY_BACKUP_KEY); } catch { /* ignore */ }
  try { window.sessionStorage.removeItem(LEGACY_STORAGE_KEY); } catch { /* ignore */ }
  try { window.sessionStorage.removeItem(LEGACY_BACKUP_KEY); } catch { /* ignore */ }
  try { window.sessionStorage.removeItem("pilotwriter.novels.session.v1"); } catch { /* ignore */ }
}

/** Clear all novel data from localStorage (call on logout). */
export function clearNovelStorage() {
  if (typeof window === "undefined") return;
  // Clear legacy keys
  try { window.localStorage.removeItem(LEGACY_STORAGE_KEY); } catch { /* ignore */ }
  try { window.localStorage.removeItem(LEGACY_BACKUP_KEY); } catch { /* ignore */ }
  try { window.sessionStorage.removeItem(LEGACY_STORAGE_KEY); } catch { /* ignore */ }
  try { window.sessionStorage.removeItem(LEGACY_BACKUP_KEY); } catch { /* ignore */ }
  try { window.sessionStorage.removeItem("pilotwriter.novels.session.v1"); } catch { /* ignore */ }
  // Clear user-scoped keys
  if (_currentUserHash) {
    const sk = `pilotwriter.novels.${_currentUserHash}`;
    try { window.localStorage.removeItem(sk); } catch { /* ignore */ }
    try { window.localStorage.removeItem(sk + ".bak"); } catch { /* ignore */ }
    try { window.sessionStorage.removeItem(sk); } catch { /* ignore */ }
  }
  _currentUserHash = null;
}

function STORAGE_KEY(): string {
  if (_currentUserHash) return `pilotwriter.novels.${_currentUserHash}`;
  return LEGACY_STORAGE_KEY;
}

function BACKUP_STORAGE_KEY(): string {
  if (_currentUserHash) return `pilotwriter.novels.${_currentUserHash}.bak`;
  return LEGACY_BACKUP_KEY;
}

function SESSION_STORAGE_KEY(): string {
  if (_currentUserHash) return `pilotwriter.novels.${_currentUserHash}.session`;
  return "pilotwriter.novels.session.v1";
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeChapter(raw: unknown, fallbackIndex: number): Chapter | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const now = new Date().toISOString();

  const title = typeof record.title === "string" && record.title.trim() ? record.title : `Chapter ${fallbackIndex + 1}`;
  const subtitle = typeof record.subtitle === "string" ? record.subtitle : "";
  const content = typeof record.content === "string" ? record.content : "";
  const createdAt = typeof record.createdAt === "string" ? record.createdAt : now;
  const updatedAt = typeof record.updatedAt === "string" ? record.updatedAt : createdAt;

  const goalWords =
    typeof record.goalWords === "number" && record.goalWords > 0 ? record.goalWords : undefined;

  // Preserve sceneBlocks if present
  let sceneBlocks: SceneBlock[] | undefined;
  if (Array.isArray(record.sceneBlocks) && record.sceneBlocks.length > 0) {
    sceneBlocks = (record.sceneBlocks as Array<Record<string, unknown>>).map((b) => ({
      synopsis: typeof b.synopsis === "string" ? b.synopsis : "",
      wordTarget: typeof b.wordTarget === "number" ? b.wordTarget : 600,
      focus: typeof b.focus === "string" ? b.focus : "default",
      notes: typeof b.notes === "string" ? b.notes : "",
    }));
  }

  return {
    id: typeof record.id === "string" && record.id ? record.id : createId(),
    title,
    subtitle,
    content,
    ...(sceneBlocks ? { sceneBlocks } : {}),
    goalWords,
    createdAt,
    updatedAt,
  };
}

function normalizeStoryBible(raw: unknown): StoryBible {
  const record = (raw ?? {}) as Record<string, unknown>;
  const summaryRecord =
    record.summary && typeof record.summary === "object"
      ? (record.summary as Record<string, unknown>)
      : null;
  const styleVoiceRecord =
    record.styleVoice && typeof record.styleVoice === "object"
      ? (record.styleVoice as Record<string, unknown>)
      : null;
  const aiContextRecord =
    record.aiContext && typeof record.aiContext === "object"
      ? (record.aiContext as Record<string, unknown>)
      : null;
  const now = new Date().toISOString();
  const coerce = (key: string, source: Record<string, unknown> | null = record) =>
    typeof source?.[key] === "string" ? (source[key] as string) : "";
  const summaryGenreText = coerce("genre", summaryRecord) || coerce("genre");

  const legacyCharactersList = Array.isArray((record as Record<string, unknown>).charactersList)
    ? ((record as Record<string, unknown>).charactersList as unknown[]).map((item, index) => {
        const obj = (item ?? {}) as Record<string, unknown>;
        const id =
          typeof obj.id === "string" && obj.id
            ? obj.id
            : `char-${index + 1}-${Math.random().toString(36).slice(2, 6)}`;
        const read = (key: string) => (typeof obj[key] === "string" ? (obj[key] as string) : "");
        return {
          id,
          name: read("name") || `Character ${index + 1}`,
          role: read("role") || "Type",
          pronouns: read("pronouns"),
          notes: read("notes"),
          groups: read("groups"),
          otherNames: read("otherNames"),
          personality: read("personality"),
          background: read("background"),
          appearance: read("appearance"),
        } as StoryCharacter;
      })
    : [];

  const summary: SummarySection = {
    premise: coerce("premise", summaryRecord) || coerce("premise") || coerce("braindump") || "",
    synopsisShort:
      coerce("synopsisShort", summaryRecord) || coerce("synopsisShort") || coerce("synopsis") || "",
    themes: Array.isArray(summaryRecord?.themes)
      ? (summaryRecord?.themes as unknown[]).filter((x): x is string => typeof x === "string")
      : Array.isArray(record.themes)
      ? (record.themes as unknown[]).filter((x): x is string => typeof x === "string")
      : [],
    genre: Array.isArray(summaryRecord?.genre)
      ? (summaryRecord?.genre as unknown[]).filter((x): x is string => typeof x === "string")
      : Array.isArray(record.genre)
      ? (record.genre as unknown[]).filter((x): x is string => typeof x === "string")
      : summaryGenreText
          ? summaryGenreText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    tone: Array.isArray(summaryRecord?.tone)
      ? (summaryRecord?.tone as unknown[]).filter((x): x is string => typeof x === "string")
      : Array.isArray(record.tone)
      ? (record.tone as unknown[]).filter((x): x is string => typeof x === "string")
      : [],
    stakes: coerce("stakes", summaryRecord) || coerce("stakes"),
  };

  const styleVoice: StyleVoiceSection = {
    pov: coerce("pov", styleVoiceRecord) || coerce("pov"),
    povCharacterId: coerce("povCharacterId", styleVoiceRecord) || coerce("povCharacterId"),
    tense: coerce("tense", styleVoiceRecord) || coerce("tense"),
    comps: Array.isArray(styleVoiceRecord?.comps)
      ? (styleVoiceRecord?.comps as unknown[]).filter((x): x is string => typeof x === "string")
      : Array.isArray(record.comps)
      ? (record.comps as unknown[]).filter((x): x is string => typeof x === "string")
      : [],
    bannedWords: Array.isArray(styleVoiceRecord?.bannedWords)
      ? (styleVoiceRecord?.bannedWords as unknown[]).filter((x): x is string => typeof x === "string")
      : Array.isArray(record.bannedWords)
      ? (record.bannedWords as unknown[]).filter((x): x is string => typeof x === "string")
      : [],
    voiceRules: coerce("voiceRules", styleVoiceRecord) || coerce("voiceRules") || coerce("style"),
  };

  function mapArray<T>(source: unknown, mapper: (item: Record<string, unknown>, index: number) => T | null): NonNullable<T>[] {
    if (!Array.isArray(source)) return [];
    const result: NonNullable<T>[] = [];
    (source as unknown[]).forEach((item, index) => {
      if (item && typeof item === "object") {
        const mapped = mapper(item as Record<string, unknown>, index);
        if (mapped != null) result.push(mapped as NonNullable<T>);
      }
    });
    return result;
  }

  const characters: Character[] = mapArray(record.characters, (obj, index) => {
    const id =
      typeof obj.id === "string" && obj.id ? obj.id : `charv2-${index + 1}-${Math.random().toString(36).slice(2, 6)}`;
    return {
      id,
      name: typeof obj.name === "string" && obj.name ? obj.name : `Character ${index + 1}`,
      role:
        typeof obj.role === "string" && obj.role
          ? (obj.role as Character["role"])
          : "Type",
      logline: typeof obj.logline === "string" ? obj.logline : "",
      appearance: typeof obj.appearance === "string" ? obj.appearance : "",
      personality: typeof obj.personality === "string" ? obj.personality : "",
      goals: typeof obj.goals === "string" ? obj.goals : "",
      fears: typeof obj.fears === "string" ? obj.fears : "",
      backstory: typeof obj.backstory === "string" ? obj.backstory : "",
      secrets: typeof obj.secrets === "string" ? obj.secrets : "",
      readerSecretHint: typeof obj.readerSecretHint === "string" ? obj.readerSecretHint : "",
      accent: typeof obj.accent === "string" ? obj.accent : "",
      speakingStyle: typeof obj.speakingStyle === "string" ? obj.speakingStyle : "",
      reactionPattern: typeof obj.reactionPattern === "string" ? obj.reactionPattern : "",
      relationships: mapArray<Relationship>(obj.relationships, (rel) => {
        if (typeof rel.targetCharacterId !== "string" || !rel.targetCharacterId) return null;
        const r: Relationship = {
          targetCharacterId: rel.targetCharacterId,
          type: typeof rel.type === "string" ? rel.type : "",
        };
        if (typeof rel.description === "string") r.description = rel.description;
        return r;
      }),
      voiceNotes: typeof obj.voiceNotes === "string" ? obj.voiceNotes : "",
      tags: Array.isArray(obj.tags) ? (obj.tags as unknown[]).filter((t): t is string => typeof t === "string") : [],
      pronouns: typeof obj.pronouns === "string" ? obj.pronouns : "",
      groups: typeof obj.groups === "string" ? obj.groups : "",
      otherNames: typeof obj.otherNames === "string" ? obj.otherNames : "",
    };
  });

  const locations: Location[] = mapArray(record.locations, (obj, index) => {
    const id =
      typeof obj.id === "string" && obj.id ? obj.id : `loc-${index + 1}-${Math.random().toString(36).slice(2, 6)}`;
    return {
      id,
      name: typeof obj.name === "string" && obj.name ? obj.name : `Location ${index + 1}`,
      type: typeof obj.type === "string" ? obj.type : "",
      description: typeof obj.description === "string" ? obj.description : "",
      sensoryDetails: typeof obj.sensoryDetails === "string" ? obj.sensoryDetails : "",
      rules: typeof obj.rules === "string" ? obj.rules : "",
      significance: typeof obj.significance === "string" ? obj.significance : "",
      tags: Array.isArray(obj.tags) ? (obj.tags as unknown[]).filter((t): t is string => typeof t === "string") : [],
    };
  });

  const lore: LoreEntry[] = mapArray(record.lore, (obj, index) => {
    const id =
      typeof obj.id === "string" && obj.id ? obj.id : `lore-${index + 1}-${Math.random().toString(36).slice(2, 6)}`;
    const category =
      typeof obj.category === "string" && obj.category
        ? (obj.category as LoreEntry["category"])
        : "Other";
    return {
      id,
      title: typeof obj.title === "string" && obj.title ? obj.title : `Lore ${index + 1}`,
      category,
      content: typeof obj.content === "string" ? obj.content : "",
      constraints: Array.isArray(obj.constraints) ? (obj.constraints as unknown[]).filter((c): c is string => typeof c === "string") : [],
    };
  });

  const factions: Faction[] = mapArray(record.factions, (obj, index) => {
    const id =
      typeof obj.id === "string" && obj.id ? obj.id : `faction-${index + 1}-${Math.random().toString(36).slice(2, 6)}`;
    return {
      id,
      name: typeof obj.name === "string" && obj.name ? obj.name : `Faction ${index + 1}`,
      ideology: typeof obj.ideology === "string" ? obj.ideology : "",
      goals: typeof obj.goals === "string" ? obj.goals : "",
      hierarchy: typeof obj.hierarchy === "string" ? obj.hierarchy : "",
      relationships: typeof obj.relationships === "string" ? obj.relationships : "",
    };
  });

  const items: Item[] = mapArray(record.items, (obj, index) => {
    const id =
      typeof obj.id === "string" && obj.id ? obj.id : `item-${index + 1}-${Math.random().toString(36).slice(2, 6)}`;
    return {
      id,
      name: typeof obj.name === "string" && obj.name ? obj.name : `Item ${index + 1}`,
      description: typeof obj.description === "string" ? obj.description : "",
      origin: typeof obj.origin === "string" ? obj.origin : "",
      powersOrUse: typeof obj.powersOrUse === "string" ? obj.powersOrUse : "",
      limitations: typeof obj.limitations === "string" ? obj.limitations : "",
    };
  });

  const timeline: TimelineEvent[] = mapArray(record.timeline, (obj, index) => {
    const id =
      typeof obj.id === "string" && obj.id ? obj.id : `event-${index + 1}-${Math.random().toString(36).slice(2, 6)}`;
    return {
      id,
      name: typeof obj.name === "string" && obj.name ? obj.name : `Event ${index + 1}`,
      when: typeof obj.when === "string" ? obj.when : "",
      summary: typeof obj.summary === "string" ? obj.summary : "",
      chapterId:
        typeof obj.chapterId === "string"
          ? obj.chapterId
          : typeof obj.chapterTarget === "string"
            ? obj.chapterTarget
            : "",
      affectedEntities: mapArray<{ type: "Character" | "Location" | "Faction" | "Item"; id: string }>(obj.affectedEntities, (aff) => {
        if (typeof aff.type !== "string" || typeof aff.id !== "string") return null;
        const type = aff.type as "Character" | "Location" | "Faction" | "Item";
        return { type, id: aff.id };
      }),
    };
  });

  const glossary: GlossaryTerm[] = mapArray(record.glossary, (obj, index) => {
    const id =
      typeof obj.id === "string" && obj.id ? obj.id : `term-${index + 1}-${Math.random().toString(36).slice(2, 6)}`;
    return {
      id,
      term: typeof obj.term === "string" && obj.term ? obj.term : `Term ${index + 1}`,
      pronunciation: typeof obj.pronunciation === "string" ? obj.pronunciation : "",
      definition: typeof obj.definition === "string" ? obj.definition : "",
    };
  });

  const boltons: Bolton[] = mapArray(record.boltons, (obj, index) => {
    const id =
      typeof obj.id === "string" && obj.id ? obj.id : `bolton-${index + 1}-${Math.random().toString(36).slice(2, 6)}`;
    const category =
      typeof obj.category === "string" &&
      [
        "voice-style",
        "pacing-tension",
        "dialogue-subtext",
        "description-sensory",
        "emotion-psychology",
        "plot-structure",
        "world-atmosphere",
        "custom",
      ].includes(obj.category)
        ? (obj.category as BoltonCategory)
        : "custom";
    return {
      id,
      title: typeof obj.title === "string" && obj.title ? obj.title : `Bolton ${index + 1}`,
      category,
      description: typeof obj.description === "string" ? obj.description : "",
      prompt: typeof obj.prompt === "string" ? obj.prompt : "",
      createdAt: typeof obj.createdAt === "string" ? obj.createdAt : now,
    };
  });

  const aiContext: AIContextSettings = {
    defaultModel: coerce("defaultModel", aiContextRecord) || coerce("defaultModel") || "openai/gpt-4o-mini",
    strictCanon:
      typeof aiContextRecord?.strictCanon === "boolean"
        ? (aiContextRecord.strictCanon as boolean)
        : typeof record.strictCanon === "boolean"
          ? record.strictCanon
          : false,
    includeSummaryByDefault:
      typeof aiContextRecord?.includeSummaryByDefault === "boolean"
        ? (aiContextRecord.includeSummaryByDefault as boolean)
        : typeof record.includeSummaryByDefault === "boolean"
          ? record.includeSummaryByDefault
          : true,
    includeStyleByDefault:
      typeof aiContextRecord?.includeStyleByDefault === "boolean"
        ? (aiContextRecord.includeStyleByDefault as boolean)
        : typeof record.includeStyleByDefault === "boolean"
          ? record.includeStyleByDefault
          : true,
    maxContextTokens:
      typeof aiContextRecord?.maxContextTokens === "number"
        ? (aiContextRecord.maxContextTokens as number)
        : typeof record.maxContextTokens === "number"
          ? record.maxContextTokens
          : undefined,
  };

  const bookPlan: BookPlan = {
    chapters: mapArray(record.bookPlan && typeof record.bookPlan === "object" ? (record.bookPlan as Record<string, unknown>).chapters : [], (obj, index) => {
      const id =
        typeof obj.id === "string" && obj.id ? obj.id : `plan-${index + 1}-${Math.random().toString(36).slice(2, 6)}`;
      return {
        id,
        title: typeof obj.title === "string" && obj.title ? obj.title : `Chapter ${index + 1}`,
        synopsis: typeof obj.synopsis === "string" ? obj.synopsis : "",
        characterIds: Array.isArray(obj.characterIds) ? (obj.characterIds as unknown[]).filter((s): s is string => typeof s === "string") : [],
        locationIds: Array.isArray(obj.locationIds) ? (obj.locationIds as unknown[]).filter((s): s is string => typeof s === "string") : [],
        loreIds: Array.isArray(obj.loreIds) ? (obj.loreIds as unknown[]).filter((s): s is string => typeof s === "string") : [],
        manuscriptChapterId: typeof obj.manuscriptChapterId === "string" ? obj.manuscriptChapterId : "",
      };
    }),
    aiChapterTarget:
      record.bookPlan &&
      typeof record.bookPlan === "object" &&
      (typeof (record.bookPlan as Record<string, unknown>).aiChapterTarget === "number" ||
        (record.bookPlan as Record<string, unknown>).aiChapterTarget === "auto")
        ? ((record.bookPlan as Record<string, unknown>).aiChapterTarget as BookPlan["aiChapterTarget"])
        : "auto",
    pacingMode:
      record.bookPlan &&
      typeof record.bookPlan === "object" &&
      (record.bookPlan as Record<string, unknown>).pacingMode &&
      ["balanced", "slow-burn", "fast"].includes(String((record.bookPlan as Record<string, unknown>).pacingMode))
        ? ((record.bookPlan as Record<string, unknown>).pacingMode as BookPlan["pacingMode"])
        : "balanced",
    updatedAt:
      record.bookPlan && typeof record.bookPlan === "object" && typeof (record.bookPlan as Record<string, unknown>).updatedAt === "string"
        ? ((record.bookPlan as Record<string, unknown>).updatedAt as string)
        : now,
  };

  // Backfill: if no v2 characters but legacy list exists, adapt it.
  const charactersFromLegacy =
    characters.length === 0 && legacyCharactersList.length > 0
      ? legacyCharactersList.map((c) => ({
          id: c.id,
          name: c.name,
          role: (["Protagonist", "Antagonist", "Supporting", "Minor"].includes(c.role)
            ? c.role
            : "Type") as Character["role"],
          logline: c.notes,
          appearance: c.appearance,
          personality: c.personality,
          backstory: c.background,
          readerSecretHint: "",
          accent: "",
          speakingStyle: "",
          reactionPattern: "",
          pronouns: c.pronouns,
          groups: c.groups,
          otherNames: c.otherNames,
          relationships: [],
          voiceNotes: "",
          tags: [],
        }))
      : characters;

  return {
    summary,
    styleVoice,
    bookPlan,
    characters: charactersFromLegacy,
    locations,
    lore,
    factions,
    items,
    timeline,
    glossary,
    boltons,
    aiContext,
    braindump: coerce("braindump", record),
    genre: coerce("genre", record),
    style: coerce("style", record),
    synopsis: coerce("synopsis", record),
    charactersText: coerce("characters", record) || coerce("charactersText", record),
    worldbuilding: coerce("worldbuilding", record),
    outline: coerce("outline", record),
    charactersList: legacyCharactersList,
    updatedAt: typeof record.updatedAt === "string" ? (record.updatedAt as string) : now,
  };
}

function normalizeNovel(raw: unknown): Novel | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const rawChapters = Array.isArray(record.chapters) ? record.chapters : [];
  const normalizedChapters = rawChapters
    .map((chapter, chapterIndex) => normalizeChapter(chapter, chapterIndex))
    .filter((chapter): chapter is Chapter => chapter !== null);
  const firstLegacyChapter = rawChapters[0] as Record<string, unknown> | undefined;

  const id = typeof record.id === "string" && record.id ? record.id : createId();
  const titleSource =
    typeof record.title === "string"
      ? record.title
      : typeof record.name === "string"
        ? record.name
        : "Untitled Novel";
  const synopsisSource =
    typeof record.synopsis === "string"
      ? record.synopsis
      : typeof record.subtitle === "string"
        ? record.subtitle
        : "";

  const goalWords = typeof record.goalWords === "number" && record.goalWords > 0 ? record.goalWords : 50000;
  const coverImage = typeof record.coverImage === "string" && record.coverImage ? record.coverImage : null;
  const createdAt = typeof record.createdAt === "string" ? record.createdAt : new Date().toISOString();
  const updatedAt = typeof record.updatedAt === "string" ? record.updatedAt : createdAt;
  const storyBible = normalizeStoryBible(record.storyBible);

  let chapters = normalizedChapters;
  if (chapters.length === 0) {
    const legacySubtitle =
      typeof firstLegacyChapter?.subtitle === "string"
        ? firstLegacyChapter.subtitle
        : typeof record.subtitle === "string"
          ? record.subtitle
          : "";
    const legacyContent =
      typeof firstLegacyChapter?.content === "string"
        ? firstLegacyChapter.content
        : typeof record.content === "string"
          ? record.content
          : "";
    const legacyTitle =
      typeof firstLegacyChapter?.title === "string" && firstLegacyChapter.title
        ? firstLegacyChapter.title
        : "Chapter 1";

    if (legacySubtitle || legacyContent) {
      chapters = [
        {
          id: createId(),
          title: legacyTitle,
          subtitle: legacySubtitle,
          content: legacyContent,
          createdAt,
          updatedAt,
        },
      ];
    }
  }

  const authorName = typeof record.authorName === "string" ? record.authorName : "";

  return {
    id,
    title: titleSource,
    authorName,
    synopsis: synopsisSource,
    goalWords,
    coverImage,
    chapters,
    storyBible,
    createdAt,
    updatedAt,
  };
}

/** Reverse migration: if sceneBlocks were split out, merge them back into content as <<<BLOCK>>> format */
function restoreChapterBlocks(novel: Novel): Novel {
  const BLOCK_DELIM = "<<<BLOCK>>>";
  const PROSE_DELIM = "<<<PROSE>>>";
  const END_BLOCK = "<<<ENDBLOCK>>>";
  const META_DELIM = "<<<META>>>";

  let changed = false;
  const chapters = novel.chapters.map((chapter) => {
    // If content already has block delimiters, leave it alone
    if (chapter.content.includes(BLOCK_DELIM)) return chapter;
    // If no sceneBlocks to restore, leave it alone
    if (!chapter.sceneBlocks || chapter.sceneBlocks.length === 0) return chapter;

    // Rebuild the serialized block format from sceneBlocks + content
    const prose = chapter.content.trim();
    const blocks = chapter.sceneBlocks.map((sb, i) => {
      const meta = `${META_DELIM}${sb.wordTarget}|${sb.focus || "default"}|${sb.notes || ""}|\n`;
      // Put all existing prose in the first block if it exists
      const blockProse = i === 0 && prose ? prose : "";
      return `${BLOCK_DELIM}\n${meta}${sb.synopsis}\n${PROSE_DELIM}\n${blockProse}\n${END_BLOCK}`;
    });

    changed = true;
    return {
      ...chapter,
      content: blocks.join("\n\n"),
      sceneBlocks: undefined,
    };
  });
  if (!changed) return novel;
  return { ...novel, chapters };
}

function uniqueIds(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

/** Enforce Canon referential integrity across chapters, plan links, relationships, and timeline references. */
export function enforceNovelIntegrity(novel: Novel): Novel {
  const chapterIds = new Set(novel.chapters.map((chapter) => chapter.id));
  const characterIds = new Set((novel.storyBible.characters ?? []).map((character) => character.id));
  const locationIds = new Set((novel.storyBible.locations ?? []).map((location) => location.id));
  const loreIds = new Set((novel.storyBible.lore ?? []).map((entry) => entry.id));
  const factionIds = new Set((novel.storyBible.factions ?? []).map((faction) => faction.id));
  const itemIds = new Set((novel.storyBible.items ?? []).map((item) => item.id));

  const nextCharacters = (novel.storyBible.characters ?? []).map((character) => ({
    ...character,
    relationships: (character.relationships ?? []).filter((relationship) => characterIds.has(relationship.targetCharacterId)),
  }));

  const nextBookPlan = {
    ...novel.storyBible.bookPlan,
    chapters: (novel.storyBible.bookPlan?.chapters ?? []).map((chapter) => ({
      ...chapter,
      characterIds: uniqueIds((chapter.characterIds ?? []).filter((id) => characterIds.has(id))),
      locationIds: uniqueIds((chapter.locationIds ?? []).filter((id) => locationIds.has(id))),
      loreIds: uniqueIds((chapter.loreIds ?? []).filter((id) => loreIds.has(id))),
      manuscriptChapterId:
        chapter.manuscriptChapterId && chapterIds.has(chapter.manuscriptChapterId)
          ? chapter.manuscriptChapterId
          : "",
    })),
  };

  const nextTimeline = (novel.storyBible.timeline ?? []).map((event) => ({
    ...event,
    chapterId: event.chapterId && chapterIds.has(event.chapterId) ? event.chapterId : "",
    affectedEntities: (event.affectedEntities ?? []).filter((entity) => {
      if (entity.type === "Character") return characterIds.has(entity.id);
      if (entity.type === "Location") return locationIds.has(entity.id);
      if (entity.type === "Faction") return factionIds.has(entity.id);
      if (entity.type === "Item") return itemIds.has(entity.id);
      return false;
    }),
  }));

  return {
    ...novel,
    storyBible: {
      ...novel.storyBible,
      characters: nextCharacters,
      bookPlan: nextBookPlan,
      timeline: nextTimeline,
    },
  };
}

export function loadNovels(): Novel[] {
  if (typeof window === "undefined") return [];
  const safeGetItem = (storage: Storage, key: string) => {
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  };

  const parsePayload = (raw: string | null): Novel[] | undefined => {
    if (!raw) return undefined;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return undefined;
      return parsed
        .map((item) => normalizeNovel(item))
        .filter((item): item is Novel => item !== null);
    } catch {
      return undefined;
    }
  };

  const sources: Array<{ key: string; storage: Storage }> = [
    { key: STORAGE_KEY(), storage: window.localStorage },
    { key: BACKUP_STORAGE_KEY(), storage: window.localStorage },
    { key: STORAGE_KEY(), storage: window.sessionStorage },
    { key: BACKUP_STORAGE_KEY(), storage: window.sessionStorage },
    { key: SESSION_STORAGE_KEY(), storage: window.sessionStorage },
  ];

  for (const source of sources) {
    const parsed = parsePayload(safeGetItem(source.storage, source.key));
    if (parsed) {
      // Reverse migration: if any chapters had sceneBlocks split out, merge them back
      const restored = parsed.map(restoreChapterBlocks).map(enforceNovelIntegrity);

      // Save restored data
      try {
        const payload = JSON.stringify(restored);
        window.localStorage.setItem(STORAGE_KEY(), payload);
      } catch { /* ignore */ }

      return restored;
    }
  }

  return [];
}

export function saveNovels(novels: Novel[]): boolean {
  if (typeof window === "undefined") return false;
  const safeNovels = novels.map(enforceNovelIntegrity);
  const payload = JSON.stringify(safeNovels);
  let wroteAnything = false;

  try {
    window.localStorage.setItem(STORAGE_KEY(), payload);
    wroteAnything = true;
  } catch (error) {
    console.warn("saveNovels primary write failed", error);
  }

  // Keep an additional local backup copy in case the primary key gets corrupted.
  try {
    window.localStorage.setItem(BACKUP_STORAGE_KEY(), payload);
    wroteAnything = true;
  } catch {
    // ignore
  }

  // Keep session copies as crash/recovery fallback.
  try {
    window.sessionStorage.setItem(STORAGE_KEY(), payload);
    window.sessionStorage.setItem(BACKUP_STORAGE_KEY(), payload);
    window.sessionStorage.setItem(SESSION_STORAGE_KEY(), payload);
    wroteAnything = true;
  } catch {
    // ignore
  }

  return wroteAnything;
}

export function createNovel(title: string, coverImage: string | null = null): Novel {
  const now = new Date().toISOString();
  return {
    id: createId(),
    title: title.trim() || "Untitled Novel",
    authorName: "",
    synopsis: "",
    goalWords: 50000,
    coverImage,
    chapters: [],
    storyBible: {
      summary: {
        premise: "",
        synopsisShort: "",
        themes: [],
        genre: [],
        tone: [],
        stakes: "",
      },
      styleVoice: {
        pov: "",
        povCharacterId: "",
        tense: "",
        comps: [],
        bannedWords: [],
        voiceRules: "",
      },
      bookPlan: {
        chapters: [],
        aiChapterTarget: "auto",
        pacingMode: "balanced",
        updatedAt: now,
      },
      characters: [],
      locations: [],
      lore: [],
      factions: [],
      items: [],
      timeline: [],
      glossary: [],
      boltons: [],
      aiContext: {
        defaultModel: "openai/gpt-4o-mini",
        strictCanon: false,
        includeSummaryByDefault: true,
        includeStyleByDefault: true,
      },
      // legacy fields kept until the new Canon UI fully replaces them
      braindump: "",
      genre: "",
      style: "",
      synopsis: "",
      charactersText: "",
      worldbuilding: "",
      outline: "",
      charactersList: [],
      updatedAt: now,
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function createChapter(index: number): Chapter {
  const now = new Date().toISOString();
  return {
    id: createId(),
    title: `Chapter ${index + 1}`,
    subtitle: "",
    content: "",
    createdAt: now,
    updatedAt: now,
  };
}

// ─── Server sync ──────────────────────────────────────────────────────────────

/** Load novels from the server API. Returns null if the request fails. */
export async function loadNovelsFromServer(): Promise<Novel[] | null> {
  try {
    const res = await fetch("/api/novels", { credentials: "include" });
    if (!res.ok) return null;
    const raw = await res.json();
    if (!Array.isArray(raw)) return null;
    const novels = raw
      .map((item: unknown) => normalizeNovel(item))
      .filter((item: Novel | null): item is Novel => item !== null)
      .map(restoreChapterBlocks)
      .map(enforceNovelIntegrity);
    return novels;
  } catch {
    return null;
  }
}

/** Save novels to the server API. Returns true on success. */
export async function saveNovelsToServer(novels: Novel[]): Promise<boolean> {
  try {
    const safeNovels = novels.map(enforceNovelIntegrity);
    const res = await fetch("/api/novels", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(safeNovels),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Load settings from the server API. */
export async function loadSettingsFromServer(): Promise<Record<string, string> | null> {
  try {
    const res = await fetch("/api/novels/settings", { credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    return data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, string> : null;
  } catch {
    return null;
  }
}

/** Save settings to the server API. */
export async function saveSettingsToServer(settings: Record<string, string>): Promise<boolean> {
  try {
    const res = await fetch("/api/novels/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(settings),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Collect all profile/assistant settings from localStorage into one object. */
export function gatherSettings(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const keys = [
      "pilotwriter.profile.language",
      "pilotwriter.profile.aiOff",
      "pilotwriter.assistant.provider",
      "pilotwriter.boltons.library.v1",
      "bw-theme",
    ];
    // Also grab per-provider settings
    const provider = window.localStorage.getItem("pilotwriter.assistant.provider") || "openrouter";
    for (const field of ["key", "model", "baseUrl"]) {
      keys.push(`pilotwriter.assistant.${provider}.${field}`);
    }
    // Grab other providers too
    for (const p of ["openrouter", "infermatic", "lmstudio", "huggingface"]) {
      for (const field of ["key", "model", "baseUrl"]) {
        const k = `pilotwriter.assistant.${p}.${field}`;
        if (!keys.includes(k)) keys.push(k);
      }
    }
    // Legacy keys
    keys.push("pilotwriter.openrouter.key", "pilotwriter.openrouter.model");

    const settings: Record<string, string> = {};
    for (const key of keys) {
      const val = window.localStorage.getItem(key);
      if (val !== null) settings[key] = val;
    }
    return settings;
  } catch {
    return {};
  }
}

/** Apply settings from server into localStorage. */
export function applySettings(settings: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    for (const [key, value] of Object.entries(settings)) {
      if (typeof value === "string") {
        window.localStorage.setItem(key, value);
      }
    }
  } catch { /* ignore — private browsing or quota exceeded */ }
}

// ─── Debounced server save helper ─────────────────────────────────────────────

let _serverSaveTimer: ReturnType<typeof setTimeout> | null = null;
let _pendingNovels: Novel[] | null = null;

/** Save novels locally (instant) and queue a debounced server save. */
export function saveNovelsWithSync(novels: Novel[]): boolean {
  const localOk = saveNovels(novels);

  // Queue debounced server save (2 seconds)
  _pendingNovels = novels;
  if (_serverSaveTimer) clearTimeout(_serverSaveTimer);
  _serverSaveTimer = setTimeout(() => {
    if (_pendingNovels) {
      void saveNovelsToServer(_pendingNovels);
      _pendingNovels = null;
    }
  }, 2000);

  return localOk;
}

/** Flush any pending server save immediately (call on beforeunload / visibilitychange). */
export function flushServerSave() {
  if (_serverSaveTimer) {
    clearTimeout(_serverSaveTimer);
    _serverSaveTimer = null;
  }
  if (_pendingNovels) {
    // Use sendBeacon for reliability on page close
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify(_pendingNovels)], { type: "application/json" });
      navigator.sendBeacon("/api/novels", blob);
    } else {
      void saveNovelsToServer(_pendingNovels);
    }
    _pendingNovels = null;
  }
}

export function countWords(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/** Extract only prose text from chapter content (strips block synopses, metadata, delimiters). */
export function extractProseFromContent(content: string): string {
  if (!content.includes("<<<BLOCK>>>")) return content;
  const parts = content.split("<<<BLOCK>>>").filter(Boolean);
  const proseChunks: string[] = [];
  for (const part of parts) {
    const proseIdx = part.indexOf("<<<PROSE>>>");
    const endIdx = part.indexOf("<<<ENDBLOCK>>>");
    if (proseIdx === -1 || endIdx === -1) continue;
    const prose = part.slice(proseIdx + "<<<PROSE>>>".length, endIdx).trim();
    if (prose) proseChunks.push(prose);
  }
  return proseChunks.join("\n\n");
}

export function countChapterWords(chapter: Chapter) {
  return countWords(extractProseFromContent(chapter.content));
}

export function countNovelWords(novel: Novel) {
  return novel.chapters.reduce((total, chapter) => total + countChapterWords(chapter), 0);
}
