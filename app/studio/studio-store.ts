export type SceneBlock = {
  synopsis: string;       // scene beat description (location, POV, goal, conflict, turning point, outcome)
  wordTarget: number;     // prose pacing target (400/600/800/1000)
  focus: string;          // "default" | "dialogue" | "action" | "introspection" | "atmosphere"
  notes: string;          // optional user notes
  prose: string;          // generated / manually edited prose for this scene
  openingLine?: string;   // how this scene should open — first-line guidance
  closingHook?: string;   // how this scene should end and bridge into the next
  emotionalArc?: string;  // emotional journey within this scene (e.g. "anxious → resolved")
  sensoryPalette?: string; // key sensory details to weave in (sight, sound, smell, texture, taste)
  dialogueNotes?: string; // key conversations, exchanges, subtext cues
  tension?: number;       // tension level 1-5 for pacing guidance
};

export type Chapter = {
  id: string;
  title: string;
  subtitle: string;
  content: string;            // chapter body (prose only — the actual novel text)
  sceneBlocks?: SceneBlock[]; // planning blocks (not exported, not counted in word count)
  goalWords?: number;
  notes?: string;             // personal scratchpad — not exported, not sent to AI
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
  category: "Magic" | "Tech" | "Culture" | "History" | "Religion" | "Politics" | "Law" | "Society" | "Psychology" | "Procedure" | "Setting" | "Rules" | "Other";
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

export type StoryBeat = {
  id: string;
  title: string;
  description: string;
  act: 1 | 2 | 3;
  chapterHint: number;
  characterIds: string[];
  locationHint: string;
  tension: 1 | 2 | 3 | 4 | 5;
  sortOrder: number;
};

export type Subplot = {
  id: string;
  title: string;
  description: string;
  characterIds: string[];
  linkedBeatIds: string[];
  status: "setup" | "developing" | "climax" | "resolved";
};

export type CharacterArc = {
  id: string;
  characterId: string;
  arcType: string;
  startState: string;
  endState: string;
  turningPointBeatIds: string[];
};

export type PlotSpine = {
  beats: StoryBeat[];
  subplots: Subplot[];
  characterArcs: CharacterArc[];
  generatedAt?: string;
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
  beatIds?: string[];
  subplotIds?: string[];
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

/** A single arc path choice generated by Arc Intelligence */
export type ArcChoice = {
  name: string;               // e.g. "The Reluctant Hero" or "Descent Into Darkness"
  description: string;        // 2-3 sentence overview of this arc direction
  score: number;              // 1–10 overall score for best narrative outcome
  rationale: string;          // Why this score — what makes it strong/weak
  chapterSynopses: string[];  // One synopsis per plan chapter (same order)
};

export type ArcAnalysis = {
  scores: ArcScore[];
  issues: ArcIssue[];
  overall: number;        // 1–10 average
  generatedAt: string;
  choices?: ArcChoice[];           // 3 arc path options
  selectedChoiceIndex?: number;    // which choice the user applied (0–2)
};

export type BookPlan = {
  chapters: BookPlanChapter[];
  aiChapterTarget: "auto" | number;
  pacingMode?: "balanced" | "slow-burn" | "fast";
  arcAnalysis?: ArcAnalysis | null;
  updatedAt: string;
};

/* ─── Knowledge & Reveal Tracker ─── */
export type KnowledgeHolder = {
  characterId: string;
  learnedInChapter?: number; // 1-based, when they learn it (null = knows from start)
};

export type KnowledgeEntry = {
  id: string;
  label: string;            // e.g. "The letter is forged"
  description: string;      // what the secret/knowledge actually is
  type: "secret" | "reveal" | "clue" | "deception";
  holders: KnowledgeHolder[];      // which characters know this
  revealChapter?: number;          // 1-based chapter where the reader learns
  status: "hidden" | "foreshadowed" | "revealed";
  notes?: string;                  // author notes
  createdAt: string;
};

export type KnowledgeScanIssue = {
  entryId: string;
  chapter: number;
  severity: "info" | "warning" | "critical";
  message: string;
  suggestion: string;
};

export type KnowledgeMap = {
  entries: KnowledgeEntry[];
  scanIssues: KnowledgeScanIssue[];
  lastScanAt?: string;
};

export type LifeEvent = {
  id: string;
  title: string;
  date: string;
  description: string;
  people: string[];
  places: string[];
  emotion: string;
  impact: string;
  sortOrder: number;
};

export type NonfictionSubtype = "memoir" | "biography" | "true-crime" | "historical" | "investigative";
export type NonfictionCategory = "biography" | "other";

export type ScrapbookEntry = {
  id: string;
  title: string;
  content: string;
  linkedEventId: string;
  createdAt: string;
};

export type ResearchNote = {
  id: string;
  title: string;
  content: string;
  source: string;
  tags: string[];
  createdAt: string;
  strength?: "primary" | "secondary" | "anecdotal" | "unverified";
};

export type StoryCard = {
  id: string;
  title: string;
  summary: string;
  sourceType: "event" | "scrapbook" | "research" | "manual";
  sourceId: string;
  chapterSlot: number;
  sortOrder: number;
};

export type NonfictionData = {
  subtype: NonfictionSubtype;
  nfCategory?: NonfictionCategory;
  subjectName: string;
  subjectRelation: string;
  era: string;
  setting: string;
  centralTheme: string;
  lifeEvents: LifeEvent[];
  interviewTranscript: Array<{ role: "ai" | "user"; text: string }>;
  interviewPhase: string;
  interviewCheckpointIdx: number;
  extractedAt: string;
  scrapbook: ScrapbookEntry[];
  researchChat: Array<{ role: "ai" | "user"; text: string }>;
  researchCheckpointIdx: number;
  researchNotes: ResearchNote[];
  researchExtractedAt: string;
  storyCards: StoryCard[];
  timelineSortChron?: boolean;
  timelineExpandedId?: string;
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
  knowledgeMap: KnowledgeMap;
  aiContext: AIContextSettings;
  plotSpine?: PlotSpine;
  nonfiction?: NonfictionData;
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

/* ─── Thematic Consistency Scanner ─── */
export type ThemePresence = "strong" | "moderate" | "absent" | "contradicted";

export type ThemeChapterStatus = {
  chapter: number;       // 1-based
  presence: ThemePresence;
  note?: string;         // short AI observation
};

export type ThemeEntry = {
  id: string;
  label: string;         // e.g. "Betrayal", "Freedom", "Sacrifice"
  description: string;   // how the theme manifests in this novel
  color: string;         // display color
  chapterMap: ThemeChapterStatus[];
  driftWarning?: string; // summary of any drift detected
};

export type ThematicAnalysis = {
  themes: ThemeEntry[];
  overallCohesion: number;  // 1-10
  summary: string;          // overall assessment
  generatedAt: string;
};

/* ─── Narrative Control Center ─── */
export type NccCharacterArc = {
  characterId: string;
  name: string;
  arcPhases: Array<{ chapter: number; phase: string; note: string }>;
  overallArc: string;
};

export type NccRelationshipEdge = {
  from: string;
  to: string;
  fromName: string;
  toName: string;
  evolution: Array<{ chapter: number; state: string }>;
  currentState: string;
};

export type NccTensionPoint = {
  chapter: number;
  tension: number; // 1-10
  label: string;
};

export type NccPlotThread = {
  id: string;
  label: string;
  status: "open" | "progressing" | "resolved" | "abandoned";
  introducedChapter: number;
  resolvedChapter?: number;
  note: string;
};

export type NccConflict = {
  type: string;
  chapter: number;
  message: string;
  severity: "info" | "warning" | "critical";
};

export type NccThemePresence = {
  label: string;
  color: string;
  chapters: Array<{ chapter: number; strength: number }>; // strength 0-3
};

export type NarrativeControlData = {
  characterArcs: NccCharacterArc[];
  relationships: NccRelationshipEdge[];
  tensionCurve: NccTensionPoint[];
  plotThreads: NccPlotThread[];
  canonConflicts: NccConflict[];
  themePresence: NccThemePresence[];
  generatedAt: string;
};

/** Per-chapter health breakdown */
export type ChapterHealthBreakdown = {
  chapterTitle: string;
  pacing: number;
  dialogue: number;
  clarity: number;
  engagement: number;
  tips: string[];
};

/** Manuscript health score — AI-generated publishing readiness report */
export type ManuscriptHealthScore = {
  pacing: number;        // 1–10
  dialogue: number;      // 1–10
  clarity: number;       // 1–10
  engagement: number;    // 1–10
  overall: number;       // 1–10 (average)
  tips: string[];        // actionable edits (max 5)
  chapterBreakdowns?: ChapterHealthBreakdown[];
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
  novelType?: "fiction" | "nonfiction";
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
  healthScore?: ManuscriptHealthScore | null;
  thematicAnalysis?: ThematicAnalysis | null;
  narrativeControl?: NarrativeControlData | null;
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
      prose: typeof b.prose === "string" ? b.prose : "",
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
    ...(record.bookPlan && typeof record.bookPlan === "object" && (record.bookPlan as Record<string, unknown>).arcAnalysis
      ? { arcAnalysis: (record.bookPlan as Record<string, unknown>).arcAnalysis as ArcAnalysis }
      : {}),
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
    knowledgeMap: (() => {
      const raw = record.knowledgeMap && typeof record.knowledgeMap === "object" ? (record.knowledgeMap as Record<string, unknown>) : null;
      const entries: KnowledgeEntry[] = Array.isArray(raw?.entries)
        ? (raw!.entries as Record<string, unknown>[]).filter((e) => e && typeof e.id === "string").map((e) => ({
            id: String(e.id),
            label: typeof e.label === "string" ? e.label : "",
            description: typeof e.description === "string" ? e.description : "",
            type: (["secret", "reveal", "clue", "deception"].includes(String(e.type)) ? String(e.type) : "secret") as KnowledgeEntry["type"],
            holders: Array.isArray(e.holders) ? (e.holders as Record<string, unknown>[]).filter((h) => h && typeof h.characterId === "string").map((h) => ({
              characterId: String(h.characterId),
              learnedInChapter: typeof h.learnedInChapter === "number" ? h.learnedInChapter : undefined,
            })) : [],
            revealChapter: typeof e.revealChapter === "number" ? e.revealChapter : undefined,
            status: (["hidden", "foreshadowed", "revealed"].includes(String(e.status)) ? String(e.status) : "hidden") as KnowledgeEntry["status"],
            notes: typeof e.notes === "string" ? e.notes : undefined,
            createdAt: typeof e.createdAt === "string" ? e.createdAt : now,
          }))
        : [];
      const scanIssues: KnowledgeScanIssue[] = Array.isArray(raw?.scanIssues)
        ? (raw!.scanIssues as Record<string, unknown>[]).filter((i) => i && typeof i.entryId === "string").map((i) => ({
            entryId: String(i.entryId),
            chapter: typeof i.chapter === "number" ? i.chapter : 0,
            severity: (["info", "warning", "critical"].includes(String(i.severity)) ? String(i.severity) : "info") as KnowledgeScanIssue["severity"],
            message: typeof i.message === "string" ? i.message : "",
            suggestion: typeof i.suggestion === "string" ? i.suggestion : "",
          }))
        : [];
      return { entries, scanIssues, lastScanAt: typeof raw?.lastScanAt === "string" ? (raw!.lastScanAt as string) : undefined };
    })(),
    aiContext,
    plotSpine: (() => {
      const ps = record.plotSpine && typeof record.plotSpine === "object" ? (record.plotSpine as Record<string, unknown>) : null;
      if (!ps) return undefined;
      const beats: StoryBeat[] = Array.isArray(ps.beats) ? (ps.beats as Record<string, unknown>[]).map((b, i) => ({
        id: typeof b.id === "string" && b.id ? b.id : `beat-${i}`,
        title: typeof b.title === "string" ? b.title : "",
        description: typeof b.description === "string" ? b.description : "",
        act: ([1, 2, 3].includes(Number(b.act)) ? Number(b.act) : 1) as 1 | 2 | 3,
        chapterHint: typeof b.chapterHint === "number" ? b.chapterHint : -1,
        characterIds: Array.isArray(b.characterIds) ? (b.characterIds as unknown[]).filter((s): s is string => typeof s === "string") : [],
        locationHint: typeof b.locationHint === "string" ? b.locationHint : "",
        tension: ([1, 2, 3, 4, 5].includes(Number(b.tension)) ? Number(b.tension) : 3) as 1 | 2 | 3 | 4 | 5,
        sortOrder: typeof b.sortOrder === "number" ? b.sortOrder : i,
      })) : [];
      const subplots: Subplot[] = Array.isArray(ps.subplots) ? (ps.subplots as Record<string, unknown>[]).map((s, i) => ({
        id: typeof s.id === "string" && s.id ? s.id : `sp-${i}`,
        title: typeof s.title === "string" ? s.title : "",
        description: typeof s.description === "string" ? s.description : "",
        characterIds: Array.isArray(s.characterIds) ? (s.characterIds as unknown[]).filter((x): x is string => typeof x === "string") : [],
        linkedBeatIds: Array.isArray(s.linkedBeatIds) ? (s.linkedBeatIds as unknown[]).filter((x): x is string => typeof x === "string") : [],
        status: (typeof s.status === "string" && ["setup", "developing", "climax", "resolved"].includes(s.status) ? s.status : "setup") as Subplot["status"],
      })) : [];
      const characterArcs: CharacterArc[] = Array.isArray(ps.characterArcs) ? (ps.characterArcs as Record<string, unknown>[]).map((a, i) => ({
        id: typeof a.id === "string" && a.id ? a.id : `arc-${i}`,
        characterId: typeof a.characterId === "string" ? a.characterId : "",
        arcType: typeof a.arcType === "string" ? a.arcType : "",
        startState: typeof a.startState === "string" ? a.startState : "",
        endState: typeof a.endState === "string" ? a.endState : "",
        turningPointBeatIds: Array.isArray(a.turningPointBeatIds) ? (a.turningPointBeatIds as unknown[]).filter((x): x is string => typeof x === "string") : [],
      })) : [];
      if (beats.length === 0 && subplots.length === 0 && characterArcs.length === 0) return undefined;
      return {
        beats,
        subplots,
        characterArcs,
        generatedAt: typeof ps.generatedAt === "string" ? ps.generatedAt : undefined,
      };
    })(),
    ...(record.nonfiction && typeof record.nonfiction === "object" ? {
      nonfiction: (() => {
        const nf = record.nonfiction as Record<string, unknown>;
        const validSubtypes = ["memoir", "biography", "true-crime", "historical", "investigative"];
        return {
          subtype: (typeof nf.subtype === "string" && validSubtypes.includes(nf.subtype) ? nf.subtype : "memoir") as NonfictionSubtype,
          subjectName: typeof nf.subjectName === "string" ? nf.subjectName : "",
          subjectRelation: typeof nf.subjectRelation === "string" ? nf.subjectRelation : "myself",
          era: typeof nf.era === "string" ? nf.era : "",
          setting: typeof nf.setting === "string" ? nf.setting : "",
          centralTheme: typeof nf.centralTheme === "string" ? nf.centralTheme : "",
          lifeEvents: Array.isArray(nf.lifeEvents) ? (nf.lifeEvents as Array<Record<string, unknown>>).map((e, i) => ({
            id: typeof e.id === "string" && e.id ? e.id : `le-${i}`,
            title: typeof e.title === "string" ? e.title : "",
            date: typeof e.date === "string" ? e.date : "",
            description: typeof e.description === "string" ? e.description : "",
            people: Array.isArray(e.people) ? e.people.filter((p): p is string => typeof p === "string") : [],
            places: Array.isArray(e.places) ? e.places.filter((p): p is string => typeof p === "string") : [],
            emotion: typeof e.emotion === "string" ? e.emotion : "",
            impact: typeof e.impact === "string" ? e.impact : "",
            sortOrder: typeof e.sortOrder === "number" ? e.sortOrder : i,
          })) : [],
          interviewTranscript: Array.isArray(nf.interviewTranscript) ? (nf.interviewTranscript as Array<Record<string, unknown>>).filter(
            (m) => typeof m.role === "string" && typeof m.text === "string"
          ).map((m) => ({ role: m.role as "ai" | "user", text: m.text as string })) : [],
          interviewPhase: typeof nf.interviewPhase === "string" ? nf.interviewPhase : "big-picture",
          interviewCheckpointIdx: typeof nf.interviewCheckpointIdx === "number" ? nf.interviewCheckpointIdx : 0,
          extractedAt: typeof nf.extractedAt === "string" ? nf.extractedAt : "",
          nfCategory: (typeof nf.nfCategory === "string" && (nf.nfCategory === "biography" || nf.nfCategory === "other") ? nf.nfCategory : undefined) as NonfictionCategory | undefined,
          scrapbook: Array.isArray(nf.scrapbook) ? (nf.scrapbook as Array<Record<string, unknown>>).map((e, i) => ({
            id: typeof e.id === "string" && e.id ? e.id : `sb-${i}`,
            title: typeof e.title === "string" ? e.title : "",
            content: typeof e.content === "string" ? e.content : "",
            linkedEventId: typeof e.linkedEventId === "string" ? e.linkedEventId : "",
            createdAt: typeof e.createdAt === "string" ? e.createdAt : "",
          })) : [],
          researchChat: Array.isArray(nf.researchChat) ? (nf.researchChat as Array<Record<string, unknown>>).filter(
            (m) => typeof m.role === "string" && typeof m.text === "string"
          ).map((m) => ({ role: m.role as "ai" | "user", text: m.text as string })) : [],
          researchCheckpointIdx: typeof nf.researchCheckpointIdx === "number" ? nf.researchCheckpointIdx : 0,
          researchNotes: Array.isArray(nf.researchNotes) ? (nf.researchNotes as Array<Record<string, unknown>>).map((e, i) => ({
            id: typeof e.id === "string" && e.id ? e.id : `rn-${i}`,
            title: typeof e.title === "string" ? e.title : "",
            content: typeof e.content === "string" ? e.content : "",
            source: typeof e.source === "string" ? e.source : "",
            tags: Array.isArray(e.tags) ? (e.tags as unknown[]).filter((t): t is string => typeof t === "string") : [],
            createdAt: typeof e.createdAt === "string" ? e.createdAt : "",
            ...(typeof e.strength === "string" && ["primary","secondary","anecdotal","unverified"].includes(e.strength) ? { strength: e.strength as ResearchNote["strength"] } : {}),
          })) : [],
          researchExtractedAt: typeof nf.researchExtractedAt === "string" ? nf.researchExtractedAt : "",
          storyCards: Array.isArray(nf.storyCards) ? (nf.storyCards as Array<Record<string, unknown>>).map((e, i) => ({
            id: typeof e.id === "string" && e.id ? e.id : `sc-${i}`,
            title: typeof e.title === "string" ? e.title : "",
            summary: typeof e.summary === "string" ? e.summary : "",
            sourceType: (typeof e.sourceType === "string" && ["event","scrapbook","research","manual"].includes(e.sourceType) ? e.sourceType : "manual") as StoryCard["sourceType"],
            sourceId: typeof e.sourceId === "string" ? e.sourceId : "",
            chapterSlot: typeof e.chapterSlot === "number" ? e.chapterSlot : -1,
            sortOrder: typeof e.sortOrder === "number" ? e.sortOrder : i,
          })) : [],
          timelineSortChron: typeof nf.timelineSortChron === "boolean" ? nf.timelineSortChron : false,
          timelineExpandedId: typeof nf.timelineExpandedId === "string" ? nf.timelineExpandedId : "",
        };
      })(),
    } : {}),
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
  const novelType = record.novelType === "nonfiction" ? "nonfiction" as const : "fiction" as const;
  const archived = record.archived === true;
  const healthScore = record.healthScore && typeof record.healthScore === "object" ? record.healthScore as Novel["healthScore"] : undefined;
  const thematicAnalysis = record.thematicAnalysis && typeof record.thematicAnalysis === "object" ? record.thematicAnalysis as Novel["thematicAnalysis"] : undefined;
  const narrativeControl = record.narrativeControl && typeof record.narrativeControl === "object" ? record.narrativeControl as Novel["narrativeControl"] : undefined;

  return {
    id,
    title: titleSource,
    authorName,
    synopsis: synopsisSource,
    goalWords,
    coverImage,
    chapters,
    storyBible,
    novelType,
    createdAt,
    updatedAt,
    ...(archived ? { archived } : {}),
    ...(healthScore ? { healthScore } : {}),
    ...(thematicAnalysis ? { thematicAnalysis } : {}),
    ...(narrativeControl ? { narrativeControl } : {}),
  };
}

/** Clean up any <<<BLOCK>>> delimiters that may have leaked into chapter content from a legacy migration.
 *  The current system stores block data in sceneBlocks and keeps content as plain prose. */
function cleanLegacyBlockDelimiters(novel: Novel): Novel {
  const BLOCK_DELIM = "<<<BLOCK>>>";
  const PROSE_DELIM = "<<<PROSE>>>";
  const END_BLOCK = "<<<ENDBLOCK>>>";
  const META_DELIM = "<<<META>>>";

  let changed = false;
  const chapters = novel.chapters.map((chapter) => {
    if (!chapter.content.includes(BLOCK_DELIM)) return chapter;

    // Content has legacy <<<BLOCK>>> format — parse out the prose from each block
    const blockSegments = chapter.content.split(BLOCK_DELIM).filter(Boolean);
    const proseChunks: string[] = [];
    const parsedBlocks: SceneBlock[] = [];

    for (const seg of blockSegments) {
      let synopsis = "";
      let wordTarget = 600;
      let focus = "default";
      let notes = "";
      let prose = "";

      const metaMatch = seg.indexOf(META_DELIM);
      const proseMatch = seg.indexOf(PROSE_DELIM);
      const endMatch = seg.indexOf(END_BLOCK);

      if (proseMatch !== -1) {
        const proseStart = proseMatch + PROSE_DELIM.length;
        const proseEnd = endMatch !== -1 ? endMatch : seg.length;
        prose = seg.slice(proseStart, proseEnd).trim();
      }

      if (metaMatch !== -1) {
        const metaStart = metaMatch + META_DELIM.length;
        const metaEnd = proseMatch !== -1 ? proseMatch : (endMatch !== -1 ? endMatch : seg.length);
        const metaBlock = seg.slice(metaStart, metaEnd).trim();
        const firstNewline = metaBlock.indexOf("\n");
        if (firstNewline !== -1) {
          const metaLine = metaBlock.slice(0, firstNewline);
          synopsis = metaBlock.slice(firstNewline + 1).trim();
          const metaParts = metaLine.split("|");
          wordTarget = parseInt(metaParts[0]) || 600;
          focus = metaParts[1] || "default";
          notes = metaParts[2] || "";
        } else {
          synopsis = metaBlock;
        }
      }

      if (prose) proseChunks.push(prose);
      parsedBlocks.push({ synopsis, wordTarget, focus, notes, prose });
    }

    changed = true;

    // If chapter already has sceneBlocks, keep those — just clean the content
    if (chapter.sceneBlocks && chapter.sceneBlocks.length > 0) {
      // Merge prose from the legacy content into existing sceneBlocks if they have empty prose
      const mergedBlocks = chapter.sceneBlocks.map((sb, i) => {
        if (sb.prose?.trim()) return sb;
        if (i < parsedBlocks.length && parsedBlocks[i].prose?.trim()) {
          return { ...sb, prose: parsedBlocks[i].prose };
        }
        return sb;
      });
      return {
        ...chapter,
        content: proseChunks.join("\n\n"),
        sceneBlocks: mergedBlocks,
      };
    }

    // No sceneBlocks exist — restore them from the parsed blocks
    return {
      ...chapter,
      content: proseChunks.join("\n\n"),
      sceneBlocks: parsedBlocks,
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
      // Clean any legacy <<<BLOCK>>> delimiters from chapter content
      const restored = parsed.map(cleanLegacyBlockDelimiters).map(enforceNovelIntegrity);

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
  } catch {
    // Primary write failed — try with cover images stripped to fit in quota
    try {
      const lite = safeNovels.map((n) => ({ ...n, coverImage: null }));
      window.localStorage.setItem(STORAGE_KEY(), JSON.stringify(lite));
      wroteAnything = true;
    } catch {
      console.warn("saveNovels: localStorage quota exceeded even without covers");
    }
  }

  // Keep an additional local backup copy in case the primary key gets corrupted.
  // Skip if primary failed to avoid doubling quota pressure.
  if (wroteAnything) {
    try {
      window.localStorage.setItem(BACKUP_STORAGE_KEY(), payload);
    } catch {
      // Backup is nice-to-have, don't fail over it
      try { window.localStorage.removeItem(BACKUP_STORAGE_KEY()); } catch { /* ignore */ }
    }
  }

  // Keep session copies as crash/recovery fallback.
  try {
    window.sessionStorage.setItem(STORAGE_KEY(), payload);
  } catch {
    // Session storage also has limits — try lite version
    try {
      const lite = safeNovels.map((n) => ({ ...n, coverImage: null }));
      window.sessionStorage.setItem(STORAGE_KEY(), JSON.stringify(lite));
    } catch { /* ignore */ }
  }

  return wroteAnything;
}

export function createNovel(title: string, coverImage: string | null = null, novelType: "fiction" | "nonfiction" = "fiction"): Novel {
  const now = new Date().toISOString();
  const isNF = novelType === "nonfiction";
  return {
    id: createId(),
    title: title.trim() || (isNF ? "Untitled Book" : "Untitled Novel"),
    authorName: "",
    synopsis: "",
    goalWords: isNF ? 60000 : 50000,
    coverImage,
    chapters: [],
    novelType,
    storyBible: {
      summary: {
        premise: "",
        synopsisShort: "",
        themes: [],
        genre: isNF ? ["Memoir"] : [],
        tone: [],
        stakes: "",
      },
      styleVoice: {
        pov: isNF ? "First Person" : "",
        povCharacterId: "",
        tense: isNF ? "Past Tense" : "",
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
      knowledgeMap: { entries: [], scanIssues: [] },
      aiContext: {
        defaultModel: "openai/gpt-4o-mini",
        strictCanon: false,
        includeSummaryByDefault: true,
        includeStyleByDefault: true,
      },
      ...(isNF ? {
        nonfiction: {
          subtype: "memoir",
          subjectName: "",
          subjectRelation: "myself",
          era: "",
          setting: "",
          centralTheme: "",
          lifeEvents: [],
          interviewTranscript: [],
          interviewPhase: "big-picture",
          interviewCheckpointIdx: 0,
          extractedAt: "",
          scrapbook: [],
          researchChat: [],
          researchCheckpointIdx: 0,
          researchNotes: [],
          researchExtractedAt: "",
          storyCards: [],
          timelineSortChron: false,
          timelineExpandedId: "",
        },
      } : {}),
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
      .map(cleanLegacyBlockDelimiters)
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

/** Collect all profile/assistant settings from localStorage into one object.
 *  API keys are NEVER synced to the server — they stay in localStorage only. */
export function gatherSettings(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const keys = [
      "pilotwriter.profile.language",
      "pilotwriter.profile.aiOff",
      "pilotwriter.assistant.provider",
      "pilotwriter.boltons.library.v1",
      "pilotwriter.tutorial.complete",
      "bw-theme",
    ];
    // Sync model and baseUrl per provider (but NOT keys — those stay local)
    for (const p of ["openrouter", "infermatic", "lmstudio", "huggingface"]) {
      for (const field of ["model", "baseUrl"]) {
        keys.push(`pilotwriter.assistant.${p}.${field}`);
      }
    }
    // Legacy model key only (not the API key)
    keys.push("pilotwriter.openrouter.model");

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

/** Apply settings from server into localStorage.
 *  API keys are NEVER applied from server — they stay local only for security. */
export function applySettings(settings: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    for (const [key, value] of Object.entries(settings)) {
      if (typeof value === "string") {
        // Skip API key fields — they should never come from the server
        if (key.endsWith(".key") && key.startsWith("pilotwriter.")) continue;
        if (key === "pilotwriter.openrouter.key") continue;
        window.localStorage.setItem(key, value);
      }
    }
  } catch { /* ignore — private browsing or quota exceeded */ }
}

// ─── Debounced server save helper ─────────────────────────────────────────────

let _serverSaveTimer: ReturnType<typeof setTimeout> | null = null;
let _pendingNovels: Novel[] | null = null;

/** Save novels locally (instant) and queue a debounced server save.
 *  If localStorage fails (quota/privacy), we still save to server immediately
 *  so data is never lost. Returns true as long as at least one save path works. */
export function saveNovelsWithSync(novels: Novel[]): boolean {
  const localOk = saveNovels(novels);

  if (!localOk) {
    // localStorage failed (quota exceeded or private mode).
    // Save to server immediately — don't wait for debounce.
    _pendingNovels = null;
    if (_serverSaveTimer) { clearTimeout(_serverSaveTimer); _serverSaveTimer = null; }
    void saveNovelsToServer(novels);
    // Return true — the server will have the data even if localStorage can't.
    return true;
  }

  // Normal path: queue debounced server save (2 seconds)
  _pendingNovels = novels;
  if (_serverSaveTimer) clearTimeout(_serverSaveTimer);
  _serverSaveTimer = setTimeout(() => {
    if (_pendingNovels) {
      void saveNovelsToServer(_pendingNovels);
      _pendingNovels = null;
    }
  }, 2000);

  return true;
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

/** Extract prose text from chapter content. With the new architecture, content IS prose. */
export function extractProseFromContent(content: string): string {
  return content;
}

export function countChapterWords(chapter: Chapter) {
  return countWords(chapter.content);
}

export function countNovelWords(novel: Novel) {
  return novel.chapters.reduce((total, chapter) => total + countChapterWords(chapter), 0);
}
