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
  initUserScope,
  clearNovelStorage,
  type Novel,
  type Relationship,
  extractProseFromContent,
  type SceneBlock,
  type Bolton,
  type BoltonCategory,
  type Character,
  type ArcAnalysis,
  type ArcChoice,
  type KnowledgeEntry,
  type KnowledgeScanIssue,
  type ThematicAnalysis,
  type ThemeEntry,
  type ThemePresence,
  type LoreEntry,
  type LifeEvent,
  type NonfictionData,
  type NonfictionSubtype,
} from "../studio-store";
import { ProfileButton } from "../components/ProfileButton";
import { ProfilePopup } from "../components/ProfilePopup";
import { TheEditor, type EditorMode, type TargetedFocus, type EditorResult, type EditorChange, type EditorialIssue } from "../components/TheEditor";
import type { ThreadKeeperCategoryId, ThreadKeeperIssue } from "../components/ThreadKeeper";
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
type AssistantProviderId = "openrouter" | "infermatic" | "lmstudio" | "huggingface";
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

const NF_ROLE_LABELS: Record<CharacterRole, string> = {
  Protagonist: "Subject / Central Figure",
  Antagonist: "Antagonist / Perpetrator",
  Supporting: "Key Person",
  Minor: "Minor Person",
  "Love Interest": "Partner / Spouse",
  Type: "Witness / Source",
  Custom: "Other",
};
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

/* ─── Writing Packs Marketplace ─── */
type WritingPackBolton = {
  title: string;
  category: BoltonCategory;
  description: string;
  prompt: string;
};

type WritingPack = {
  id: string;
  name: string;
  tagline: string;
  genre: string;
  icon: string; // SVG path
  color: string;
  boltons: WritingPackBolton[];
};

const WRITING_PACKS: WritingPack[] = [
  {
    id: "romance-plot-kit",
    name: "Romance Plot Kit",
    tagline: "Tension, chemistry, and emotional beats that make readers swoon",
    genre: "Romance",
    icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
    color: "#f472b6",
    boltons: [
      { title: "Slow Burn Chemistry", category: "emotion-psychology", description: "Build romantic tension through lingering glances, accidental touches, and loaded silence. Never rush the confession.", prompt: "Write romantic tension as slow-building: charged silences, awareness of physical proximity, interrupted moments. Avoid love-at-first-sight. Build longing through restraint. Characters should fight their attraction before surrendering to it." },
      { title: "Banter & Verbal Sparring", category: "dialogue-subtext", description: "Sharp, witty dialogue where attraction hides behind teasing and challenge.", prompt: "Write romantic dialogue as verbal sparring — quick, playful, with underlying attraction. Each line should reveal character while building chemistry. Include callbacks to earlier conversations. Banter should feel earned, not forced." },
      { title: "Emotional Vulnerability", category: "emotion-psychology", description: "The moments when walls come down and characters reveal their true selves.", prompt: "Write vulnerability scenes with restraint: a cracked voice, a confession that surprises even the speaker, hands that tremble. Show the cost of openness. Make the reader feel the risk of being honest." },
      { title: "Sensory Romance", category: "description-sensory", description: "Heightened sensory awareness when attraction is present.", prompt: "When characters are attracted to each other, heighten sensory detail: the warmth of proximity, the scent of their hair, the texture of skin. Make the reader feel the electricity. Use specific, unexpected sensory details rather than clichés." },
    ],
  },
  {
    id: "fantasy-world-builder",
    name: "Fantasy World Builder",
    tagline: "Rich, immersive worldbuilding that feels lived-in, not lecture-y",
    genre: "Fantasy",
    icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    color: "#818cf8",
    boltons: [
      { title: "Show-Don't-Lecture World", category: "world-atmosphere", description: "Weave worldbuilding into action and character perspective, never info-dump.", prompt: "Reveal world details through character interaction, not exposition. A character doesn't think 'In our kingdom, we have three moons' — they notice the triple moonlight on their blade. Worldbuilding should feel discovered, not explained." },
      { title: "Magic System Consistency", category: "world-atmosphere", description: "Keep magic rules consistent and show costs and limitations.", prompt: "Every use of magic must have a visible cost or limitation. Show the strain, the price, the rule that can't be broken. If magic is easy, it's boring. Consistency builds trust with the reader." },
      { title: "Lived-In Details", category: "description-sensory", description: "Small, grounding details that make a fantasy world feel real.", prompt: "Include mundane, lived-in details: the smell of the market, how coins change hands, what people eat, how doors lock. Fantasy worlds feel real through specificity, not through grandeur." },
      { title: "Cultural Voice", category: "voice-style", description: "Different cultures should sound and think differently in the prose.", prompt: "When writing characters from different cultures, adjust their metaphors, priorities, and speech patterns. A sailor thinks in tides and knots. A scholar thinks in arguments and evidence. Culture shapes thought." },
    ],
  },
  {
    id: "thriller-dialogue-gen",
    name: "Thriller Dialogue Engine",
    tagline: "Tight, tense exchanges that keep readers on the edge",
    genre: "Thriller",
    icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
    color: "#f59e0b",
    boltons: [
      { title: "Interrogation Dynamics", category: "dialogue-subtext", description: "Power shifts in conversation — who controls the exchange and when it flips.", prompt: "Write dialogue as a power game. Track who has the upper hand and shift it mid-conversation. Use pauses, subject changes, and refusals to answer as weapons. The most dangerous lines are often the quietest." },
      { title: "Ticking Clock Pacing", category: "pacing-tension", description: "Build urgency through time pressure and escalating stakes.", prompt: "Create urgency: shorter sentences as tension rises, time references that compress, interruptions that cut off safety. The reader should feel time running out. Cut any line that releases pressure too early." },
      { title: "Unreliable Information", category: "plot-structure", description: "Characters lie, omit, and misdirect — readers must stay sharp.", prompt: "Characters should withhold truth strategically. Not every lie is dramatic — some are small omissions that compound. Let the reader catch lies before the protagonist does. Trust is currency in thrillers." },
      { title: "Controlled Reveal", category: "pacing-tension", description: "Meter out information to maximise impact and sustain mystery.", prompt: "Never reveal everything at once. Give the reader one piece of the puzzle per scene. End scenes on new questions, not answers. The reveal should reframe everything that came before." },
    ],
  },
  {
    id: "literary-fiction-craft",
    name: "Literary Fiction Craft",
    tagline: "Prose that earns its place on the page — precise, resonant, surprising",
    genre: "Literary",
    icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
    color: "#a78bfa",
    boltons: [
      { title: "Precise Language", category: "voice-style", description: "Every word earns its place. No filler, no approximation.", prompt: "Choose the exact word, not the almost-right word. 'Trudged' not 'walked slowly'. 'Crimson' not 'red' — but only when the specificity matters. Cut adverbs. Let strong verbs do the work." },
      { title: "Subtext Over Statement", category: "dialogue-subtext", description: "Characters say one thing and mean another. The real story is beneath.", prompt: "Characters rarely say what they mean. A mother asking 'Have you eaten?' means 'I'm worried about you.' Show the gap between what's said and what's felt. Trust the reader to read between lines." },
      { title: "Resonant Imagery", category: "description-sensory", description: "Images that carry emotional weight and connect to theme.", prompt: "Use imagery that does double duty: describe the world AND the character's inner state. A cracked mirror isn't just a cracked mirror — it reflects a fractured self-image. But be subtle. Never explain the metaphor." },
      { title: "Interior Complexity", category: "emotion-psychology", description: "Characters think in contradictions, hold opposing feelings simultaneously.", prompt: "Real people feel multiple contradictory things at once: relief and guilt, love and resentment, hope and dread. Show this complexity. A character can miss someone they're glad is gone." },
    ],
  },
  {
    id: "horror-atmosphere",
    name: "Horror Atmosphere Pack",
    tagline: "Dread, unease, and the feeling that something is deeply wrong",
    genre: "Horror",
    icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
    color: "#ef4444",
    boltons: [
      { title: "Wrongness Detector", category: "world-atmosphere", description: "Something is off — the reader can feel it before they can name it.", prompt: "Build dread through wrongness: familiar things slightly altered, sounds that shouldn't be there, a smile that lasts too long. Horror isn't jump scares — it's the growing certainty that something is fundamentally wrong." },
      { title: "Isolation & Claustrophobia", category: "pacing-tension", description: "Shrink the world around the character. Cut off escape routes.", prompt: "Systematically remove safety: phones die, doors lock, allies disappear, night falls. Each scene should close one more exit. The character's world should shrink until there's nowhere left to go." },
      { title: "Body as Betrayal", category: "description-sensory", description: "Physical responses to fear — the body knows before the mind.", prompt: "Show fear through the body first: cold sweat, a stomach that drops, hairs that rise, breathing that won't steady. The body reacts before the mind processes. Use involuntary physical responses, not thoughts about being scared." },
      { title: "Normality as Weapon", category: "voice-style", description: "The most unsettling moments are surrounded by the mundane.", prompt: "Contrast horror with normality: breakfast cereal, a child's laughter, sunlight on a kitchen floor. The mundane makes the terrible more terrible. Don't let the prose become gothic — keep it grounded and matter-of-fact." },
    ],
  },
  {
    id: "sci-fi-world-engine",
    name: "Sci-Fi World Engine",
    tagline: "Technology, society, and ideas that feel inevitable, not invented",
    genre: "Sci-Fi",
    icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
    color: "#06b6d4",
    boltons: [
      { title: "Technology as Texture", category: "world-atmosphere", description: "Tech should feel used and lived-with, not explained.", prompt: "Don't explain technology — show people using it casually. Nobody explains how a phone works. Characters should interact with future tech as naturally as we use light switches. Frustration with tech is more realistic than awe." },
      { title: "Social Extrapolation", category: "plot-structure", description: "Follow one change to its logical social consequences.", prompt: "Every technological change has social consequences. If communication is instant, privacy is different. If death is curable, grief changes. Follow the implications honestly — the best sci-fi is social commentary." },
      { title: "Human Scale", category: "emotion-psychology", description: "Big ideas, intimate emotions. The cosmic filtered through the personal.", prompt: "Frame cosmic-scale events through personal, human moments: a parent worried about a child, a couple arguing about dinner, someone missing home. The vastness of space means nothing without intimate human stakes." },
      { title: "Jargon Economy", category: "voice-style", description: "Invented terms should be rare, self-explanatory, and consistent.", prompt: "Limit invented jargon to 3-4 terms maximum. Each should be obvious in context. 'Mindlink' is better than 'Cerebral Neural Interface Protocol'. If the reader needs a glossary, you've failed." },
    ],
  },
  {
    id: "mystery-detective",
    name: "Mystery & Detective Kit",
    tagline: "Clues, red herrings, and that satisfying moment when it all clicks",
    genre: "Mystery",
    icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
    color: "#8b5cf6",
    boltons: [
      { title: "Fair-Play Clues", category: "plot-structure", description: "Plant every clue the reader needs — hide them in plain sight.", prompt: "Every clue must appear before the reveal. Hide it in a throwaway detail, a character's nervous habit, or a piece of scenery the narrator barely notices. The reader should be able to solve it — but only if they were paying very close attention." },
      { title: "Red Herring Craft", category: "pacing-tension", description: "Misdirect without cheating. Red herrings should feel plausible even after the reveal.", prompt: "Red herrings must serve the story even after they're debunked. A suspicious character wasn't the murderer — but they were hiding something real and interesting. Never waste a red herring on pure misdirection; give it its own subplot value." },
      { title: "Interrogation Subtext", category: "dialogue-subtext", description: "Questions reveal as much about the asker as the answers do.", prompt: "In interview and interrogation scenes, let the detective's questions reveal their theory while the suspect's answers reveal their character. Neither party is fully honest. The truth emerges from the gap between questions and answers." },
      { title: "The Ticking Revelation", category: "pacing-tension", description: "Each scene should reframe what came before.", prompt: "Every reveal should make the reader mentally replay earlier scenes. 'Wait — that means when she said X, she actually meant...' Build your mystery so each new piece of information transforms the meaning of old information." },
    ],
  },
  {
    id: "historical-immersion",
    name: "Historical Immersion Pack",
    tagline: "Transport readers to another era without it reading like a textbook",
    genre: "Historical",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    color: "#d97706",
    boltons: [
      { title: "Period Through Senses", category: "description-sensory", description: "Smell the era. Feel the cobblestones. Hear the market cries.", prompt: "Establish historical setting through sensory experience, not facts. Don't tell us it's 1885 — show us the gas lamps hissing, the horse dung in the streets, the weight of wool against skin. Use textures, smells, and sounds that a modern reader wouldn't expect." },
      { title: "Era-Appropriate Thought", category: "voice-style", description: "Characters think with the assumptions of their time, not ours.", prompt: "Characters must think with the values and assumptions of their era. A medieval peasant doesn't question divine right. A Victorian woman feels genuine shame, not modern indignation. Avoid imposing modern morality on historical characters — their worldview IS the story." },
      { title: "Invisible Research", category: "world-atmosphere", description: "Your research should be invisible. The iceberg principle.", prompt: "Show 10% of your research, know the other 90%. A character doesn't think 'In this era, we use tallow candles' — they reach for the candle instinctively. Worldbuilding is behaviour, not exposition. If a detail feels researched, cut it." },
      { title: "Speech Without Archaic Parody", category: "dialogue-subtext", description: "Dialogue that feels historical without being a Renaissance fair.", prompt: "Historical dialogue should feel different from modern speech without being a costume. Avoid 'thee' and 'forsooth'. Instead, adjust sentence structure: longer constructions, different idioms, formal address. The rhythm should feel old; the words should remain clear." },
    ],
  },
  {
    id: "dark-academia",
    name: "Dark Academia Kit",
    tagline: "Obsession, intellectual rivalry, and beauty that costs something",
    genre: "Dark Academia",
    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    color: "#78716c",
    boltons: [
      { title: "Intellectual Seduction", category: "dialogue-subtext", description: "Ideas as foreplay. Knowledge as power. Debate as intimacy.", prompt: "Write intellectual exchanges as a form of intimacy — characters testing each other's minds, impressed despite themselves, drawn to brilliance. A perfectly quoted line of poetry is more seductive than any physical description. Knowledge is the currency of attraction." },
      { title: "Beautiful Decay", category: "description-sensory", description: "Old libraries, crumbling facades, beauty that's half-ruined.", prompt: "Describe settings with a keen eye for beautiful deterioration: leather bindings cracked with age, marble stairs worn concave by centuries of footsteps, ivy consuming a stone wall. Beauty should feel earned by time, not manufactured. The aesthetic is old money, never new." },
      { title: "Moral Erosion", category: "emotion-psychology", description: "Characters cross lines gradually — each step feels justified at the time.", prompt: "Show moral compromise as a slow process. The first transgression is small and justified. The second is slightly larger. By the time the character does something truly terrible, they've built an entire philosophy to support it. The reader should understand every step even as they're horrified." },
      { title: "Obsessive Narration", category: "voice-style", description: "The narrator notices too much, thinks too deeply, can't let go.", prompt: "Write with an obsessive narrative voice: the narrator fixates on details, spirals into analysis, returns to the same images. Sentences should feel overly precise, as if the narrator is trying to control reality through language. This is not unreliable narration — it's narration that tries too hard to be reliable." },
    ],
  },
  {
    id: "cozy-warmth",
    name: "Cozy & Comfort Pack",
    tagline: "Warm kitchens, found families, and the quiet courage of kindness",
    genre: "Cozy",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    color: "#fb923c",
    boltons: [
      { title: "Sensory Comfort", category: "description-sensory", description: "The smell of baking, the warmth of tea, the weight of a good blanket.", prompt: "Lean into comforting sensory details: the steam from a mug, bread cooling on a rack, rain against windows while you're warm inside, a cat settling into a lap. Make the reader feel physically comforted by the prose. These details are the point, not decoration." },
      { title: "Low-Stakes, High-Heart", category: "pacing-tension", description: "The tension of a soufflé falling or a friendship misunderstanding.", prompt: "Create tension from things that matter emotionally but aren't life-threatening: will the garden grow in time for the fête? Did the neighbour take offence? Can they finish the quilt before the baby arrives? Treat small stakes with the same narrative respect as high ones." },
      { title: "Community Voice", category: "voice-style", description: "Everyone knows everyone. Stories overlap and interweave.", prompt: "Write community as a web of overlapping stories. Characters reference each other casually: 'Mrs Henderson says the same thing.' 'Oh, that's just like what happened to Tom at the post office.' Make the reader feel like they know the whole village." },
      { title: "Gentle Resolution", category: "emotion-psychology", description: "Conflicts resolve through understanding, not confrontation.", prompt: "Resolve conflicts through conversation, empathy, and small gestures rather than dramatic confrontation. A character leaves fresh eggs on a doorstep instead of apologising aloud. A misunderstanding dissolves when someone finally listens. Kindness is the protagonist's superpower." },
    ],
  },
  {
    id: "unreliable-narrator",
    name: "Unreliable Narrator Toolkit",
    tagline: "Trust nothing. Question everything. The narrator is lying — or are they?",
    genre: "Psychological",
    icon: "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    color: "#e879f9",
    boltons: [
      { title: "Subtle Contradictions", category: "voice-style", description: "The narrator says one thing but the details say another.", prompt: "Plant small contradictions between what the narrator claims and what they describe. They say they're fine, but notice every exit in the room. They say they trust someone, but describe their smile as 'practised'. Let the reader catch the lies through observation, not explanation." },
      { title: "Memory Gaps", category: "plot-structure", description: "What the narrator doesn't remember is more important than what they do.", prompt: "Leave deliberate gaps in the narrator's account. They skip over certain moments, change the subject abruptly, describe arriving somewhere without remembering the journey. These gaps should form a pattern that the reader can decode." },
      { title: "Over-Justification", category: "dialogue-subtext", description: "People who are telling the truth don't explain why they're telling the truth.", prompt: "Have the narrator over-explain their innocence, their motives, their version of events. 'I need you to understand that I had no choice' is more suspicious than simply describing the choice. Guilty narrators justify; innocent ones describe." },
      { title: "Reality Slippage", category: "description-sensory", description: "Small sensory details that don't quite add up.", prompt: "Introduce subtle sensory impossibilities: a sound that shouldn't be there, a detail that changes between descriptions, a person the narrator describes differently each time. Never announce these — let them accumulate. The reader should feel uneasy before they can articulate why." },
    ],
  },
  {
    id: "dialogue-masterclass",
    name: "Dialogue Masterclass",
    tagline: "Every line of dialogue should do at least two things at once",
    genre: "All Genres",
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    color: "#34d399",
    boltons: [
      { title: "Distinct Voices", category: "dialogue-subtext", description: "Cover the names and you should still know who's speaking.", prompt: "Every character should speak differently: sentence length, vocabulary level, verbal tics, what they avoid saying. A professor uses subclauses; a teenager fragments. A liar qualifies everything; an honest person is blunt. Cover the dialogue tags — the reader should still identify the speaker." },
      { title: "Interruption & Overlap", category: "pacing-tension", description: "Real conversations don't take turns politely.", prompt: "Write dialogue that interrupts, talks past, and overlaps. Characters don't wait for each other to finish. They mishear, answer a different question, and change the subject when uncomfortable. Use em-dashes for interruptions. Let characters talk at cross-purposes." },
      { title: "The Unsaid", category: "emotion-psychology", description: "The most powerful line of dialogue is the one nobody says.", prompt: "In every important conversation, identify what each character CANNOT say. The father who can't say 'I'm proud of you.' The lover who can't say 'Don't go.' Write around the unsaid — the reader fills in the silence, and that's more powerful than words." },
      { title: "Dialogue as Action", category: "plot-structure", description: "Conversations should change things. If nothing shifts, cut the scene.", prompt: "Every dialogue scene must shift something: a relationship, a plan, a power dynamic, a belief. If two characters end a conversation in the same state they started it, the scene has no purpose. Track what changes. If nothing does, the conversation is exposition in disguise." },
    ],
  },
  {
    id: "action-choreography",
    name: "Action Choreography Pack",
    tagline: "Fights, chases, and set pieces that feel kinetic, not choreographed",
    genre: "Action",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    color: "#ef4444",
    boltons: [
      { title: "Clarity Over Spectacle", category: "description-sensory", description: "The reader should always know where everyone is and what's happening.", prompt: "In action scenes, spatial clarity is everything. Establish where characters are relative to each other, what they can see, and where the exits are. Use short, concrete sentences. The reader's mental camera should never lose its subject. Confusion is not the same as excitement." },
      { title: "Emotional Stakes First", category: "emotion-psychology", description: "We don't care about the punch. We care about why it matters.", prompt: "Before any action sequence, establish what's at stake emotionally. The reader needs to care before the first blow lands. A fight between strangers is boring. A fight between former friends is devastating. Anchor every action beat to a feeling." },
      { title: "Sensory Impact", category: "description-sensory", description: "The crack of bone, the taste of blood, the ringing ears after a blast.", prompt: "Write action through the senses: the metallic taste of adrenaline, the shock of cold water, the way a punch sounds more than it hurts. Use unexpected sensory details — the smell of gunpowder is a cliché, but the ringing silence after a shot is visceral." },
      { title: "Rhythm & Breath", category: "pacing-tension", description: "Short sentences hit hard. Then give the reader a moment to breathe.", prompt: "Vary sentence length dramatically in action scenes. Short sentences for impact. Fragments for speed. Then a longer sentence when the character catches their breath and the reader catches theirs. Action prose should have the rhythm of a heartbeat: fast, fast, fast, pause, fast." },
    ],
  },
  {
    id: "coming-of-age",
    name: "Coming of Age Pack",
    tagline: "That ache of growing up — first losses, first freedoms, first selves",
    genre: "Coming of Age",
    icon: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
    color: "#fbbf24",
    boltons: [
      { title: "Hyper-Awareness", category: "voice-style", description: "Everything feels like it means something. Because at that age, it does.", prompt: "Write with the heightened perception of youth: every glance feels loaded, every slight feels permanent, every new experience feels like the first and last. The intensity is not melodrama — it's authentic. At that age, everything IS as big as it feels." },
      { title: "Adult World Glimpses", category: "world-atmosphere", description: "The moment you realise adults don't have it figured out either.", prompt: "Show moments where the young character glimpses adult reality: a parent crying when they think no one's watching, a teacher who's clearly exhausted, an overheard argument that wasn't meant for young ears. These moments should shift the character's understanding without anyone explaining anything." },
      { title: "Friendship as Everything", category: "emotion-psychology", description: "Before romantic love, there's the fierce loyalty of best friends.", prompt: "Write young friendships with the intensity they deserve: the fierce loyalty, the devastating betrayals, the inside jokes that are funnier than anything will ever be again. Young friendship is not a lesser form of love — it's often more consuming than romantic love will ever be." },
      { title: "The Last Time", category: "pacing-tension", description: "You never know it's the last time until it's too late.", prompt: "Weave in 'last time' moments without announcing them: the last summer all the friends are together, the last time the character climbs the backyard tree, the last dinner before everything changes. The narrator may not recognise these as endings — but the reader should feel the ache." },
    ],
  },
  {
    id: "villain-depth",
    name: "Villain & Antagonist Forge",
    tagline: "Villains who terrify because they almost make sense",
    genre: "All Genres",
    icon: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z",
    color: "#dc2626",
    boltons: [
      { title: "Sympathetic Logic", category: "emotion-psychology", description: "The villain is the hero of their own story. Make us understand why.", prompt: "Write antagonists who believe they're right. Their logic should be internally consistent — even compelling. The reader should have a moment of thinking 'they have a point' before recoiling. A villain you understand is more terrifying than one you don't." },
      { title: "Competence as Menace", category: "pacing-tension", description: "The scariest villains are the ones who are genuinely good at what they do.", prompt: "Show the antagonist succeeding. Let them outthink the protagonist, anticipate their moves, execute their plans flawlessly. A competent villain raises stakes automatically. The reader fears them because they've seen them win." },
      { title: "Human Moments", category: "dialogue-subtext", description: "The villain who loves their dog is scarier than the one who kicks it.", prompt: "Give antagonists genuine human moments: tenderness with a child, a joke that's actually funny, a moment of real grief. Don't use these to excuse their actions — use them to make the reader uncomfortable about how much they relate to someone who does terrible things." },
      { title: "Mirror to Hero", category: "plot-structure", description: "The best villain is the hero if they'd made one different choice.", prompt: "Construct your antagonist as a dark mirror of your protagonist: same wound, different response. Where the hero chose hope, the villain chose control. Where the hero accepted loss, the villain refused it. The reader should see how easily the hero could have become the villain." },
    ],
  },
  {
    id: "magical-realism",
    name: "Magical Realism Pack",
    tagline: "The extraordinary treated as ordinary — matter-of-fact miracles",
    genre: "Magical Realism",
    icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
    color: "#c084fc",
    boltons: [
      { title: "Casual Impossibility", category: "voice-style", description: "Narrate the miraculous with the same tone you'd use for making breakfast.", prompt: "When magical events occur, describe them with the same matter-of-fact tone as mundane events. A woman sprouts wings — she adjusts them like a coat collar. A ghost joins the family dinner — someone sets an extra place. The magic is real; the characters' acceptance of it makes it more powerful, not less." },
      { title: "Emotional Metaphor Made Real", category: "emotion-psychology", description: "Grief that literally weighs you down. Love that literally makes you float.", prompt: "Turn emotional states into physical reality: a heartbroken woman's tears flood the house, a lonely man's shadow detaches and walks away, a liar's words turn to ash in the air. The magic should be a literalisation of emotional truth. Never explain the symbolism — let it exist." },
      { title: "Grounded Specificity", category: "description-sensory", description: "The more magical the event, the more concrete the surrounding details.", prompt: "Surround magical events with hyper-specific real-world details: the brand of coffee on the counter, the exact shade of peeling paint, the bus route number. The mundane anchors the magical. If everything is dreamlike, nothing is. Reality makes the impossible believable." },
      { title: "Generational Memory", category: "world-atmosphere", description: "Stories that carry the weight of family history and cultural memory.", prompt: "Embed magical events in family and cultural history: 'The women in this family have always known things.' 'It started when your great-grandmother made a promise to the river.' Magic should feel inherited, not invented. It carries the weight of generations and the specificity of place." },
    ],
  },
  {
    id: "dystopian-resistance",
    name: "Dystopian Resistance Kit",
    tagline: "Oppressive systems, small rebellions, and the cost of resistance",
    genre: "Dystopian",
    icon: "M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z",
    color: "#64748b",
    boltons: [
      { title: "System as Character", category: "world-atmosphere", description: "The oppressive system should feel as real and complex as any character.", prompt: "Write the dystopian system with internal logic: it works for some people, it has true believers, it solves real problems (badly). Show why people comply — not because they're stupid, but because the system offers something (safety, order, belonging). The most terrifying dystopia is one that's comfortable." },
      { title: "Small Rebellions", category: "pacing-tension", description: "Revolution starts with a whispered word, a hidden book, a refused order.", prompt: "Show resistance as small, daily acts: a teacher who includes a forbidden book, a worker who 'accidentally' misfiles a record, a mother who tells her child the real history at bedtime. Grand rebellion grows from tiny defiances. Make each small act feel as dangerous as it is." },
      { title: "Complicity & Cost", category: "emotion-psychology", description: "Everyone in a dystopia is complicit. Including the protagonist.", prompt: "Show your protagonist's complicity in the system before their resistance. They benefited from it, enforced it, looked away. Resistance should cost them something real — relationships, safety, certainty. Don't make rebellion free. The weight of what they lose makes what they gain meaningful." },
      { title: "Language of Control", category: "voice-style", description: "The system controls thought by controlling language.", prompt: "Show how the regime shapes language: euphemisms for violence ('restructuring' for execution), banned words, mandatory phrases. Characters who resist start to notice the language — and choosing a forbidden word becomes an act of rebellion. Language IS power in dystopian fiction." },
    ],
  },
  {
    id: "gothic-atmosphere",
    name: "Gothic Atmosphere Pack",
    tagline: "Crumbling estates, family secrets, and the past that refuses to stay buried",
    genre: "Gothic",
    icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
    color: "#6b21a8",
    boltons: [
      { title: "The House as Character", category: "world-atmosphere", description: "The setting should feel alive, watchful, and full of memory.", prompt: "Write the house/estate as a character: it groans, settles, breathes. Rooms are described in terms of mood, not just furnishings. The house responds to emotional states — doors stick when characters are trapped, corridors lengthen when they're lost. The architecture reflects psychology." },
      { title: "Family as Trap", category: "plot-structure", description: "Inheritance is never free. Family legacy comes with chains.", prompt: "Frame family connections as binding: inherited debts (financial, moral, supernatural), expectations that suffocate, secrets that implicate. Characters can't simply leave — they're bound by blood, guilt, duty, or curse. The family is both home and prison." },
      { title: "Doubling & Mirrors", category: "emotion-psychology", description: "Characters see themselves reflected — in portraits, in relatives, in the madness they fear.", prompt: "Use doubling throughout: the protagonist resembles a dead ancestor, a reflection doesn't quite match, two characters are opposites who complete each other. Gothic fiction is about the self divided. Show characters confronting versions of themselves they're afraid to become." },
      { title: "Ornate Dread", category: "voice-style", description: "Beautiful prose about terrible things. The language itself should feel excessive.", prompt: "Write with deliberate linguistic excess: longer sentences, richer vocabulary, descriptions that border on overwhelming. The prose style should mirror the overstuffed, decaying world. This is not minimalism — it's prose that, like the gothic setting, is beautiful and suffocating." },
    ],
  },
  {
    id: "war-combat",
    name: "War & Conflict Realism",
    tagline: "The chaos, boredom, and moral weight of people in extreme situations",
    genre: "War",
    icon: "M3 21h18M9 8h1m4 0h1m-5 4h1m4 0h1M5 21V3h14v18",
    color: "#71717a",
    boltons: [
      { title: "Boredom & Waiting", category: "pacing-tension", description: "War is 90% waiting and 10% terror. Write both.", prompt: "Show the tedium between action: cleaning equipment, writing letters, bad jokes, endless waiting. These quiet moments are where character is built. The contrast between boredom and violence is what makes war fiction devastating. Don't skip to the explosions." },
      { title: "Moral Grey Zones", category: "emotion-psychology", description: "There are no clean hands in war. Every decision costs something.", prompt: "Present moral dilemmas with no clean answer: save one person or complete the mission, follow an unjust order or endanger your unit, kill a child soldier or die. Don't judge your characters — show the impossible choices and let the reader sit with the discomfort." },
      { title: "Small Unit Intimacy", category: "dialogue-subtext", description: "The bonds formed under fire are unlike any other.", prompt: "Write unit relationships with the intensity they carry: nicknames, running jokes, unspoken agreements, knowing someone's habits better than their spouse does. These bonds form fast under pressure. Show the casual intimacy of people who depend on each other for survival." },
      { title: "Aftermath & Body", category: "description-sensory", description: "Violence has consequences. Show what happens after the shooting stops.", prompt: "Don't skip the aftermath: shaking hands, ringing ears, the inability to eat, the strange calm of shock. Show the physical reality of violence without glorifying it. Characters should carry wounds — physical and psychological — into every subsequent scene." },
    ],
  },
  {
    id: "epistolary-found",
    name: "Epistolary & Found Documents",
    tagline: "Letters, journals, transcripts — stories told through fragments",
    genre: "All Genres",
    icon: "M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    color: "#0ea5e9",
    boltons: [
      { title: "Voice-Per-Document", category: "voice-style", description: "Each document type should sound completely different.", prompt: "Match voice to document type: a diary is intimate and unpolished, an official report is clipped and evasive, a letter to a lover is raw, a text message is fragmented. The format shapes the honesty — people write differently depending on who's reading." },
      { title: "Gaps as Story", category: "plot-structure", description: "What's missing from the archive is the real mystery.", prompt: "Leave deliberate gaps in the document trail: missing pages, redacted sections, a letter that references one we never see. The reader should notice what's absent and build theories. The gaps between documents are where the most important events happened." },
      { title: "Contradicting Accounts", category: "pacing-tension", description: "Two people describe the same event differently. Who's right?", prompt: "Present the same event from multiple document perspectives that don't quite agree: a diary entry, a police report, a letter to a friend. The contradictions should be subtle enough that the reader has to work to spot them. Truth emerges from the spaces between accounts." },
      { title: "Editorial Presence", category: "dialogue-subtext", description: "Someone assembled these documents. Their choices tell a story too.", prompt: "Imply a curator/editor who selected and arranged these documents. Their choices reveal a perspective: what they included, what order they chose, what they footnoted. The arrangement is itself an argument. Let the reader wonder about the invisible hand behind the collection." },
    ],
  },
  {
    id: "noir-hardboiled",
    name: "Noir & Hardboiled Pack",
    tagline: "Rain-slicked streets, moral compromise, and prose that hits like a fist",
    genre: "Noir",
    icon: "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z",
    color: "#475569",
    boltons: [
      { title: "Hardboiled Voice", category: "voice-style", description: "Clipped, cynical, and surprisingly poetic when you're not expecting it.", prompt: "Write in short, punchy sentences with a cynical edge. The narrator notices everything and trusts nothing. Similes should be original and slightly dark: 'She had a smile like a crack in a wall.' Mix toughness with unexpected poetry — hardboiled prose is secretly lyrical." },
      { title: "Moral Quicksand", category: "emotion-psychology", description: "Every character is compromised. The hero is just less compromised than the rest.", prompt: "No one is clean in noir. The detective takes money they shouldn't. The femme fatale has genuine reasons for her betrayals. The cop is corrupt but loves their kid. Write moral complexity without judgment — in noir, everyone is trying to survive a system that's already broken." },
      { title: "City as Mood", category: "world-atmosphere", description: "The city at night: neon, rain, shadows, and the people who live in them.", prompt: "Write the city as a character with moods: predatory at night, indifferent at dawn, seductive in rain. Use weather and light as emotional cues. Neon reflects in puddles. Alleys swallow light. Every setting should feel like it's been up too late and seen too much." },
      { title: "Economical Menace", category: "pacing-tension", description: "Threats should be quiet. The most dangerous people speak softly.", prompt: "Write menace through understatement: a quiet voice is scarier than a shout, a gentle request more threatening than an order. The most dangerous character in the room is the one who seems relaxed. Violence should arrive suddenly, without preamble, and be over fast." },
    ],
  },
  {
    id: "satire-comedy",
    name: "Satire & Dark Comedy Kit",
    tagline: "Funny because it's true. Devastating because it's funny",
    genre: "Satire",
    icon: "M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    color: "#84cc16",
    boltons: [
      { title: "Deadpan Delivery", category: "voice-style", description: "The funniest horror is described without any indication that it's funny.", prompt: "Describe absurd, terrible, or hilarious situations in a completely neutral, matter-of-fact tone. The narrator doesn't seem to notice anything unusual. The contrast between the content and the delivery IS the comedy. Never signal that something is meant to be funny." },
      { title: "Escalating Absurdity", category: "plot-structure", description: "Start plausible. End somewhere impossible. Make every step between them feel logical.", prompt: "Begin with a reasonable situation and escalate it through perfectly logical steps into complete absurdity. Each individual step should make sense — it's only when the reader looks back at the full chain that they realise how far they've come from normal. Logic is the engine of absurdity." },
      { title: "Institutional Madness", category: "world-atmosphere", description: "Bureaucracy, corporations, and systems that nobody controls.", prompt: "Write institutions as self-perpetuating machines: nobody is in charge, everyone is following rules that nobody wrote, the system produces outcomes nobody intended. Show characters trying to navigate a system that is simultaneously powerful and completely irrational. The satire should feel uncomfortably familiar." },
      { title: "Sympathy Under Satire", category: "emotion-psychology", description: "Mock the system, not the person trapped in it.", prompt: "Even in satire, give characters genuine emotions and real stakes. The bureaucrat enforcing absurd rules is also trying to keep their job and feed their family. The reader should laugh AND empathise. Pure mockery is easy; satire that makes you care is devastating." },
    ],
  },
  {
    id: "dual-timeline",
    name: "Dual Timeline Architect",
    tagline: "Past and present in conversation — two stories that illuminate each other",
    genre: "All Genres",
    icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4",
    color: "#f97316",
    boltons: [
      { title: "Thematic Rhyming", category: "plot-structure", description: "Past and present scenes should echo each other without being identical.", prompt: "Structure timeline switches so scenes rhyme thematically: a betrayal in the past echoes a betrayal in the present, but with different stakes. The timelines should illuminate each other — what we learn in one reframes what we're reading in the other. Juxtaposition is your primary tool." },
      { title: "Distinct Period Voices", category: "voice-style", description: "Each timeline should have its own rhythm, vocabulary, and pace.", prompt: "Give each timeline a distinct prose style: the past might be more formal, slower, more sensory; the present might be clipped and urgent. The reader should feel the shift in era through language alone, before any context clues. Voice is the first signal of 'when'." },
      { title: "Delayed Revelations", category: "pacing-tension", description: "Information in one timeline answers questions posed in the other.", prompt: "Plant questions in the present timeline that only the past can answer — and vice versa. A mysterious scar in the present; the injury scene arrives three chapters later in the past. Time the reveals so the reader gets a burst of understanding at the exact moment both timelines converge." },
      { title: "Convergence Point", category: "emotion-psychology", description: "The timelines should build toward a moment where they emotionally merge.", prompt: "Build both timelines toward a convergence point where their emotional climaxes align. The character in the past makes a decision whose consequences the present character finally understands. The reader experiences both the cause and the effect simultaneously." },
    ],
  },
  {
    id: "first-person-deep",
    name: "Deep First Person Pack",
    tagline: "Inside one head completely — biased, vivid, and utterly compelling",
    genre: "All Genres",
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    color: "#f472b6",
    boltons: [
      { title: "Thought as Voice", category: "voice-style", description: "The narrator's thoughts should have a distinctive rhythm that's theirs alone.", prompt: "Write interior monologue with a voice as distinct as spoken dialogue: does this character think in fragments or run-on sentences? Do they spiral or stay linear? Do they lie to themselves? The thought patterns should feel like overhearing a specific person's brain, not a generic narrator." },
      { title: "Selective Perception", category: "description-sensory", description: "We only see what this character would notice. Everything else doesn't exist.", prompt: "Filter ALL description through this character's specific attention: a chef notices food and smells everywhere; a soldier clocks exits and threats; a new mother hears every baby cry in a crowd. What the character notices reveals who they are. What they miss creates dramatic irony." },
      { title: "Emotional Colouring", category: "world-atmosphere", description: "The world looks different depending on how the narrator feels.", prompt: "Let the narrator's emotional state colour every description: when happy, the rain is 'fresh'; when depressed, the same rain is 'relentless'. The same room feels cozy in one scene and suffocating in another. The world is not objective — it's filtered through feeling." },
      { title: "Self-Deception", category: "emotion-psychology", description: "The narrator lies to themselves — and the reader catches it.", prompt: "Show the narrator constructing comfortable narratives about themselves: 'I didn't care anyway,' they think, while their hands shake. 'It wasn't my fault,' they insist, while describing exactly how it was. The reader should see through the narrator even when the narrator can't see through themselves." },
    ],
  },
  {
    id: "tension-suspense",
    name: "Tension & Suspense Engine",
    tagline: "The art of making readers physically unable to put the book down",
    genre: "All Genres",
    icon: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    color: "#f43f5e",
    boltons: [
      { title: "Micro-Tension", category: "pacing-tension", description: "Every single page should have a question the reader needs answered.", prompt: "Embed small tensions in every paragraph: an unanswered question, a word that doesn't fit, a reaction that seems wrong, a detail that nags. The reader doesn't need a bomb to keep reading — they need to wonder why someone glanced at the clock, or what's behind the locked door." },
      { title: "Dramatic Irony", category: "plot-structure", description: "When the reader knows something the character doesn't, every scene becomes tense.", prompt: "Give the reader information the character doesn't have: we know the call is coming from inside the house; the character picks up the phone. We know the friend is a traitor; the character confides in them. The gap between what we know and what the character knows creates unbearable tension." },
      { title: "False Safety", category: "world-atmosphere", description: "The most dangerous moment is when everyone relaxes.", prompt: "Create moments of apparent safety before danger strikes: the characters laugh, share a meal, make plans for the future. Lull the reader into comfort. Then shatter it. The contrast between safety and threat is what makes suspense work. Constant danger is just noise." },
      { title: "Chapter Hooks", category: "pacing-tension", description: "End every chapter on a question, a threat, or a door opening.", prompt: "End chapters at the moment of maximum tension, not resolution: the phone rings but we don't hear the answer, a character opens a door and we cut away, someone says 'There's something I need to tell you' and the chapter ends. The reader MUST turn the page." },
    ],
  },
];

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
  {
    id: "huggingface",
    label: "Hugging Face",
    requiresKey: true,
    defaultBaseUrl: "https://router.huggingface.co/v1",
    defaultModel: "deepseek-ai/DeepSeek-R1",
  },
];

function getProviderOption(id: AssistantProviderId) {
  return ASSISTANT_PROVIDER_OPTIONS.find((provider) => provider.id === id) ?? ASSISTANT_PROVIDER_OPTIONS[0];
}

function getStoredProvider() {
  if (typeof window === "undefined") return "openrouter" as AssistantProviderId;
  try {
    const stored = window.localStorage.getItem("pilotwriter.assistant.provider");
    if (stored && ASSISTANT_PROVIDER_OPTIONS.some((provider) => provider.id === stored)) {
      return stored as AssistantProviderId;
    }
  } catch { /* ignore */ }
  return "openrouter" as AssistantProviderId;
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
  "anonymous", "stranger", "blackmailer", "killer", "informant", "witness",
  "caller", "sender", "hacker", "stalker", "protagonist", "antagonist",
  "villain", "hero", "heroine", "sidekick", "mentor", "love interest",
  "bad guy", "good guy", "narrator", "detective", "victim", "suspect",
  "guardian", "leader", "rival", "boss", "henchman", "accomplice",
  "mastermind", "fugitive", "traitor", "spy", "assassin", "thief",
  "servant", "companion", "ally", "enemy", "bystander", "bodyguard",
  "mysterious man", "mysterious woman", "mysterious figure", "dark figure",
  "old man", "old woman", "young man", "young woman", "child",
  "unknown man", "unknown woman", "unnamed", "main character",
  "father", "mother", "brother", "sister", "son", "daughter",
  "husband", "wife", "uncle", "aunt", "cousin", "nephew", "niece",
  "grandfather", "grandmother", "grandpa", "grandma", "grandson", "granddaughter",
  "the father", "the mother", "the brother", "the sister",
  "the husband", "the wife", "the son", "the daughter",
  "dad", "mom", "mum", "papa", "mama",
  "neighbor", "neighbour", "friend", "best friend", "roommate",
  "teacher", "doctor", "nurse", "priest", "lawyer", "judge",
  "bartender", "shopkeeper", "innkeeper", "landlord",
] as const;

function isRoleLikeCharacterLabel(value: string) {
  const lower = value.trim().toLowerCase();
  if (!lower) return false;
  if (ROLE_ALIAS_TOKENS.some((token) => lower.includes(token))) return true;
  // Reject anything starting with "the" (e.g. "The Bad Guy", "The Ones")
  if (/^the\s/i.test(lower)) return true;
  // Reject generic descriptors (e.g. "Bad Guy", "Mysterious Stranger")
  if (/^(a |an |some )/i.test(lower)) return true;
  return false;
}

function isLikelyHumanName(name: string) {
  const cleaned = name.trim();
  if (!cleaned) return false;
  if (isRoleLikeCharacterLabel(cleaned)) return false;
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 3) return false;
  if (/^(new character|character \d+|unknown|unnamed|n\/a|the |a |an )/i.test(cleaned)) return false;
  // Each word must start with a capital letter and look like a name
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
  const [novels, setNovels] = useState<Novel[]>([]);
  const [novelSyncDone, setNovelSyncDone] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  // Undo history: maps chapterId → array of previous { content, sceneBlocks } snapshots (max 20)
  const chapterUndoHistory = useRef<Record<string, Array<{ content: string; sceneBlocks?: SceneBlock[] }>>>({});
  const [canUndo, setCanUndo] = useState(false);
  const undoSnapshotTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSnapshotContent = useRef<Record<string, string>>({});
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileInitialTab, setProfileInitialTab] = useState<"general" | "ai" | "account" | undefined>(undefined);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("epub");
  const [exportScope, setExportScope] = useState<"all" | "selected">("all");
  const [selectedExportChapterIds, setSelectedExportChapterIds] = useState<string[]>([]);
  const [exportingFile, setExportingFile] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedShareChapterIds, setSelectedShareChapterIds] = useState<string[]>([]);
  const [sharingLink, setSharingLink] = useState(false);
  const [shareResult, setShareResult] = useState<{ token: string; url: string; expiresAt: string; emailSent?: boolean; hasPassword?: boolean } | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareLinks, setShareLinks] = useState<Array<{ id: string; token: string; status: string; readerName: string | null; recipientEmail: string | null; passwordHash: string | null; expiryDays: number; expiresAt: string; createdAt: string; chapters: Array<{ id: string; chapterTitle: string }> }>>([]);
  const [shareLinksLoading, setShareLinksLoading] = useState(false);
  const [sharePassword, setSharePassword] = useState("");
  const [shareExpiryDays, setShareExpiryDays] = useState(7);
  const [shareRecipientEmail, setShareRecipientEmail] = useState("");
  // shareSendingEmail removed — now just opens email app directly
  // shareEmailSentMsg removed — single email button opens app directly
  const [pendingFeedbackCount, setPendingFeedbackCount] = useState(0);
  const [showFeedbackPanel, setShowFeedbackPanel] = useState(false);
  const [feedbackData, setFeedbackData] = useState<Array<{ id: string; token: string; novelId: string; readerName: string | null; createdAt: string; chapters: Array<{ id: string; title: string; content: string; annotations: Array<{ id: string; selectedText: string; startOffset: number; endOffset: number; note: string; type: string; createdAt: string }> }> }>>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [applyingFeedbackId, setApplyingFeedbackId] = useState<string | null>(null);
  const [dismissedAnnotations, setDismissedAnnotations] = useState<Set<string>>(new Set());
  // Sequential feedback review state
  const [feedbackReviewMode, setFeedbackReviewMode] = useState(false);
  const [feedbackReviewQueue, setFeedbackReviewQueue] = useState<Array<{ fbId: string; token: string; readerName: string | null; chapterId: string; chapterTitle: string; chapterContent: string; ann: { id: string; selectedText: string; startOffset: number; endOffset: number; note: string; type: string } }>>([]);
  const [feedbackReviewIdx, setFeedbackReviewIdx] = useState(0);
  const [feedbackReviewApplying, setFeedbackReviewApplying] = useState(false);
  const [feedbackReviewDone, setFeedbackReviewDone] = useState(false);
  const [feedbackReviewAccepted, setFeedbackReviewAccepted] = useState(0);
  const [feedbackReviewRejected, setFeedbackReviewRejected] = useState(0);
  // AI preview state for feedback review
  const [fbPreviewOriginal, setFbPreviewOriginal] = useState<string | null>(null);
  const [fbPreviewRevised, setFbPreviewRevised] = useState<string | null>(null);
  const [fbPreviewGenerating, setFbPreviewGenerating] = useState(false);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [editorResult, setEditorResult] = useState<EditorResult | null>(null);
  const [editorLoadingPhase, setEditorLoadingPhase] = useState<string | null>(null);
  const [editorError, setEditorError] = useState<string | null>(null);
  const [editorOriginalParagraphs, setEditorOriginalParagraphs] = useState<string[]>([]);
  const [pendingChapterDelete, setPendingChapterDelete] = useState<PendingChapterDelete>(null);
  // Novel archive/delete is handled from the studio dashboard only
  const [regenConfirm, setRegenConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null);
  // ── Chat (Characters + Co-Author) ──
  const [charChatOpen, setCharChatOpen] = useState(false);
  const [charChatTarget, setCharChatTarget] = useState<Character | null>(null);
  const [charChatMessages, setCharChatMessages] = useState<Array<{ role: "user" | "character"; text: string }>>([]);
  const [charChatInput, setCharChatInput] = useState("");
  const [charChatLoading, setCharChatLoading] = useState(false);
  const [coAuthorMode, setCoAuthorMode] = useState(false);
  const charChatEndRef = useRef<HTMLDivElement | null>(null);
  const [charChatPickerOpen, setCharChatPickerOpen] = useState(false);
  const chatOpenedAt = useRef<number>(0); // timestamp when current chat session started
  const [chatIsStale, setChatIsStale] = useState(false); // true if reopening an old chat (>5 min)
  // Chat review system
  type ChatRecommendation = {
    id: string;
    type: "chapter_synopsis" | "character_profile" | "prose_edit";
    label: string;
    detail: string;
    targetId: string; // plan chapter id, character id, or manuscript chapter id
    field?: string;   // character field to update
    currentValue?: string;
    newValue: string;
    accepted: boolean | null; // null = pending
  };
  const [charChatReviewing, setCharChatReviewing] = useState(false);
  const [charChatRecommendations, setCharChatRecommendations] = useState<ChatRecommendation[]>([]);
  const [charChatReviewDone, setCharChatReviewDone] = useState(false);
  // ── The Editor (overview — sentence-level edits — unified under showEditorModal) ──
  const [nccBusy, setNccBusy] = useState(false);
  const [editorFindings, setEditorFindings] = useState<Array<{
    id: string;
    chapter: number;
    chapterTitle: string;
    reason: string;
    original: string;
    revised: string;
    status: "pending" | "accepted" | "dismissed";
  }>>([]);
  const [editorSummary, setEditorSummary] = useState<string>("");
  const [editorScannedAt, setEditorScannedAt] = useState<string | null>(null);
  const [editorApplying, setEditorApplying] = useState(false);
  const [editorApplyProgress, setEditorApplyProgress] = useState<string>("");
  const [editorApplyDone, setEditorApplyDone] = useState(false);
  const [editorApplyCount, setEditorApplyCount] = useState(0);
  // Auto-scroll character chat to bottom
  useEffect(() => {
    charChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [charChatMessages, charChatLoading]);

  // No chat persistence — chats clear on close, review happens automatically
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
    "summary" | "characters" | "locations" | "worldbuilding" | "styleVoice" | "boltons" | "knowledge" | "nf-about" | "nf-events" | "nf-interview" | "nf-timeline" | "nf-relationships"
  >(
    "summary",
  );
  const [selectedV2CharacterId, setSelectedV2CharacterId] = useState<string | null>(null);
  const [nameConfirmPopup, setNameConfirmPopup] = useState<{
    roster: Array<{ name: string; role: string; logline: string; selected: boolean }>;
    step: "names" | "profiles";
    addedCharacterIds?: string[];
  } | null>(null);
  const [profileGenProgress, setProfileGenProgress] = useState<{ current: number; total: number; name: string; done: number } | null>(null);
  const [batchProfileQueue, setBatchProfileQueue] = useState<string[]>([]);
  const batchProfileTotalRef = useRef(0);
  const batchProfileAllIdsRef = useRef<string[]>([]);
  const [newCharPopup, setNewCharPopup] = useState<{
    charId: string;
    description: string;
    generating: boolean;
  } | null>(null);
  const [storyAiBusyAction, setStoryAiBusyAction] = useState<string | null>(null);
  const [synopsisOptions, setSynopsisOptions] = useState<Array<{ label: string; text: string }>>([]);
  // Global AI abort controller — closing any modal/menu aborts in-flight AI requests
  const aiAbortRef = useRef<AbortController | null>(null);
  const [storyAiBusyElapsedSec, setStoryAiBusyElapsedSec] = useState(0);
  const [boltonCategoryFilter, setBoltonCategoryFilter] = useState<"all" | BoltonCategory>("all");
  const [boltonLibraryCount, setBoltonLibraryCount] = useState(0);
  const [boltonLibraryOpen, setBoltonLibraryOpen] = useState(false);
  const [openBoltonDropdownId, setOpenBoltonDropdownId] = useState<string | null>(null);
  const [writingPacksOpen, setWritingPacksOpen] = useState(false);
  const [expandedPack, setExpandedPack] = useState<string | null>(null);
  const [packInstallFlash, setPackInstallFlash] = useState<string | null>(null);
  const [packSelectedBoltons, setPackSelectedBoltons] = useState<Set<string>>(new Set());
  const [knowledgeSelectedId, setKnowledgeSelectedId] = useState<string | null>(null);
  const [knowledgeScanBusy, setKnowledgeScanBusy] = useState(false);
  const [knowledgeScanError, setKnowledgeScanError] = useState<string | null>(null);
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
  const [scenePurposeOpen, setScenePurposeOpen] = useState<Set<number>>(new Set());
  const [editorFontFamily, setEditorFontFamily] = useState<string>("serif");
  const [editorTextAlign, setEditorTextAlign] = useState<"left" | "center" | "right" | "justify">("left");
  const [editorFontSize, setEditorFontSize] = useState<number>(17.5);
  const blockProseRefs = useRef<(HTMLTextAreaElement | null)[]>([]);


  // ── Right-click prose context menu ──
  const [proseCtx, setProseCtx] = useState<{
    x: number; y: number;
    blockIdx: number;
    selStart: number; selEnd: number;
    selectedText: string;
    fullProse: string;
  } | null>(null);
  const [proseCtxBusy, setProseCtxBusy] = useState(false);

  // ── Smart Rewrite floating toolbar ──
  const [rewriteSelection, setRewriteSelection] = useState<{
    x: number; y: number;
    blockIdx: number; // -1 = plain editor
    selStart: number; selEnd: number;
    selectedText: string;
    fullContent: string; // the full prose/content of the textarea
  } | null>(null);
  const [rewriteBusy, setRewriteBusy] = useState(false);
  const [rewriteMode, setRewriteMode] = useState<string | null>(null);
  const [rewritePreview, setRewritePreview] = useState<{
    original: string;
    revised: string;
    blockIdx: number;
    selStart: number;
    selEnd: number;
    fullContent: string;
  } | null>(null);
  const rewriteSelectionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [chapterRewriteBusy, setChapterRewriteBusy] = useState(false);
  const [chapterRewriteMenuOpen, setChapterRewriteMenuOpen] = useState(false);

  const EDITOR_FONT_OPTIONS = [
    { id: "serif", label: "Serif", font: "Georgia, 'Times New Roman', serif" },
    { id: "sans", label: "Sans", font: "var(--font-sans), 'Inter', system-ui, sans-serif" },
    { id: "mono", label: "Mono", font: "var(--font-mono), ui-monospace, 'Cascadia Code', monospace" },
    { id: "garamond", label: "Garamond", font: "'EB Garamond', Garamond, 'Times New Roman', serif" },
    { id: "merriweather", label: "Merriweather", font: "'Merriweather', Georgia, serif" },
    { id: "courier", label: "Courier", font: "'Courier New', Courier, monospace" },
  ];
  const EDITOR_FONT_SIZES = [14, 15, 16, 17.5, 19, 21, 24];
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
  const [sidebarPinned, setSidebarPinned] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return window.localStorage.getItem("pilotwriter.sidebar.pinned") === "true"; } catch { return false; }
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => !sidebarPinned);
  const [currentTheme, setCurrentTheme] = useState<"dark" | "light">("dark");
  const [navigatingAway, setNavigatingAway] = useState(false);
  const sidebarHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize theme from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("bw-theme") as "dark" | "light" | null;
      if (stored) setCurrentTheme(stored);
    } catch { /* ignore */ }
  }, []);

  function toggleTheme() {
    const next = currentTheme === "dark" ? "light" : "dark";
    setCurrentTheme(next);
    try { localStorage.setItem("bw-theme", next); } catch { /* ignore */ }
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

  // Process batch profile queue one character at a time.
  // Each iteration runs after a React re-render, so all closures are FRESH —
  // exactly like the user manually pressing the "Full profile" button.
  useEffect(() => {
    if (batchProfileQueue.length === 0) return;

    const charId = batchProfileQueue[0];
    const character = storyCharacters.find((c) => c.id === charId);
    const total = batchProfileTotalRef.current;
    const done = total - batchProfileQueue.length;

    if (!character) {
      // Skip missing character, move to next
      setBatchProfileQueue((q) => q.slice(1));
      return;
    }

    setProfileGenProgress({ current: done + 1, total, name: character.name, done });

    let cancelled = false;

    const run = async () => {
      // Small delay between characters (skip for first one)
      if (done > 0) await new Promise((r) => setTimeout(r, 3000));
      if (cancelled) return;

      try {
        await runCharacterAiForSelected(charId, "profile");
      } catch (err) {
        if (isCancelledError(err)) { setBatchProfileQueue([]); return; }
        console.error("Batch profile failed for", charId, err);
      }

      if (cancelled) return;

      // Remove this character from queue → triggers re-render → next iteration
      setBatchProfileQueue((q) => q.slice(1));
    };

    void run();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchProfileQueue]);

  // When queue empties, clear progress — done
  useEffect(() => {
    if (batchProfileQueue.length === 0 && batchProfileTotalRef.current > 0) {
      setProfileGenProgress(null);
      setStoryAiBusyAction(null);
      batchProfileTotalRef.current = 0;
      batchProfileAllIdsRef.current = [];
    }
  }, [batchProfileQueue]);

  useEffect(() => {
    if (!showStoryBibleModal || bibleSection !== "boltons") return;
    setBoltonLibraryCount(readBoltonLibrary().length);
  }, [showStoryBibleModal, bibleSection]);

  useEffect(() => {
    setBlockProseDrafts({});
    // Update undo availability for the new active chapter
    if (activeChapterId) {
      const stack = chapterUndoHistory.current[activeChapterId];
      setCanUndo(!!stack && stack.length > 0);
    } else {
      setCanUndo(false);
    }
    // Reset Editor state so each chapter / overview starts fresh
    setEditorResult(null);
    setEditorError(null);
    setEditorLoadingPhase(null);
    setEditorOriginalParagraphs([]);
    setEditorFindings([]);
    setEditorSummary("");
    setEditorScannedAt(null);
    setEditorApplyDone(false);
    setEditorApplyCount(0);
    setEditorApplyProgress("");
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
      try { window.localStorage.setItem("pilotwriter.sidebar.pinned", String(next)); } catch { /* ignore */ }
      return next;
    });
  }
  const [planGenerateCustomCount, setPlanGenerateCustomCount] = useState("8");
  const [planGeneratePacingMode, setPlanGeneratePacingMode] = useState<"balanced" | "slow-burn" | "fast">("balanced");
  const [planGenerateProgressIdx, setPlanGenerateProgressIdx] = useState<number | null>(null);
  const [planGenerateTotal, setPlanGenerateTotal] = useState(0);
  const [showArcOfferPopup, setShowArcOfferPopup] = useState(false);
  const [arcBusy, setArcBusy] = useState(false);
  const [arcError, setArcError] = useState<string | null>(null);
  const [arcExpandedDimension, setArcExpandedDimension] = useState<string | null>(null);
  const [arcRegenWarning, setArcRegenWarning] = useState(false);
  const [arcApplyingChoice, setArcApplyingChoice] = useState<number | null>(null);
  const [profileOfferPopup, setProfileOfferPopup] = useState<{ characterIds: string[]; source: string } | null>(null);

  // ── Tutorial walkthrough ──
  type TutorialStep = { target: string; title: string; desc: string; onEnter?: () => void; onLeave?: () => void };
  // Helper to close all modals/popups
  const tutCloseAll = () => { setShowStoryBibleModal(false); setShowPlanModal(false); setShowExportModal(false); setShowShareModal(false); setShowEditorModal(false); setProfileOpen(false); setProfileInitialTab(undefined); };
  const TUTORIAL_STEPS: TutorialStep[] = [
    // 1. Connect AI — open Settings on AI tab
    {
      target: "settings-ai", title: "Step 1 — Connect Your AI",
      desc: "This is where it all starts. Choose your AI provider — OpenRouter, Hugging Face, Infermatic, or LM Studio for free local AI. Paste your API key, pick a model, and set your language. Once connected, every AI feature in Blocwrite runs through your chosen model.",
      onEnter: () => { setProfileInitialTab("ai"); setProfileOpen(true); },
      onLeave: () => { setProfileOpen(false); setProfileInitialTab(undefined); },
    },
    // 2. Canon — open Canon modal, show the whole thing
    {
      target: "canon-modal", title: "Step 2 — The Canon",
      desc: "Welcome to your story\u2019s single source of truth. The Canon holds everything the AI needs to know about your novel. Let\u2019s walk through each section\u2026",
      onEnter: () => { setShowStoryBibleModal(true); setBibleSection("summary"); },
      onLeave: () => setShowStoryBibleModal(false),
    },
    // 3. Canon — Style & Voice tab
    {
      target: "canon-styleVoice", title: "Step 3 — Canon: Style & Voice",
      desc: "Set the overall tone and writing style for your novel. Define voice directives like \u2018first person, present tense\u2019 or \u2018literary fiction with short sentences\u2019. The AI follows these rules in every generation so your manuscript stays consistent.",
      onEnter: () => { setShowStoryBibleModal(true); setBibleSection("styleVoice"); },
      onLeave: () => setShowStoryBibleModal(false),
    },
    // 4. Canon — Characters tab
    {
      target: "canon-characters", title: "Step 4 — Canon: Characters",
      desc: "Build detailed character profiles: name, personality, speech patterns, backstory, goals, and relationships. The AI uses these profiles when writing dialogue, internal monologue, and character interactions — so every character sounds like themselves.",
      onEnter: () => { setShowStoryBibleModal(true); setBibleSection("characters"); },
      onLeave: () => setShowStoryBibleModal(false),
    },
    // 5. Canon — Locations tab
    {
      target: "canon-locations", title: "Step 5 — Canon: Locations",
      desc: "Define your story\u2019s locations with descriptions, atmosphere, and sensory details. When the AI writes a scene set in a location, it draws from these details to create vivid, consistent settings without you having to repeat yourself.",
      onEnter: () => { setShowStoryBibleModal(true); setBibleSection("locations"); },
      onLeave: () => setShowStoryBibleModal(false),
    },
    // 6. Canon — Worldbuilding tab
    {
      target: "canon-worldbuilding", title: "Step 6 — Canon: Worldbuilding",
      desc: "Add world-building notes relevant to your genre — rules, systems, procedures, social dynamics, or anything that keeps your story consistent. For a thriller, that might be police procedure; for fantasy, magic systems. The AI tailors entries to your genre automatically.",
      onEnter: () => { setShowStoryBibleModal(true); setBibleSection("worldbuilding"); },
      onLeave: () => setShowStoryBibleModal(false),
    },
    // 7. Canon — Bolt-Ons tab
    {
      target: "canon-boltons", title: "Step 7 — Canon: Bolt-Ons",
      desc: "Bolt-Ons are targeted writing instructions that shape how the AI writes. Add instructions like \u2018keep it gritty\u2019, \u2018more dialogue\u2019, or \u2018slow-burn romance\u2019. Browse the Writing Packs marketplace for pre-built sets, or create your own. These apply globally — for per-chapter instructions, use Blocs inside each chapter.",
      onEnter: () => { setShowStoryBibleModal(true); setBibleSection("boltons"); },
      onLeave: () => setShowStoryBibleModal(false),
    },
    // 8. The Plan — open Plan modal
    {
      target: "plan-modal", title: "Step 8 — The Plan",
      desc: "Your chapter planner. Write or paste your synopsis, hit AI Generate, and the AI builds a full structured outline: chapter titles, detailed synopses, character assignments, and location mapping — all pulled from your Canon. Rearrange, add, or remove chapters, then sync to your manuscript. Arc Intelligence appears below once you have 3+ chapters planned.",
      onEnter: () => { tutCloseAll(); setShowPlanModal(true); },
      onLeave: () => setShowPlanModal(false),
    },
    // 9. Arc Intelligence — inside the Plan modal
    {
      target: "plan-modal", title: "Step 9 — Arc Intelligence",
      desc: "After generating your plan, Arc Intelligence appears here and analyses your chapter outlines. It presents three scored story directions — each with a name, description, rationale, and a score out of 10. Pick one and it reshapes all your chapter synopses to match that arc. Note: this only works before you\u2019ve written prose, so run it early.",
      onEnter: () => { tutCloseAll(); setShowPlanModal(true); },
      onLeave: () => setShowPlanModal(false),
    },
    // 10. Chapters & Blocs — sidebar
    {
      target: "sidebar", title: "Step 10 — Chapters & Blocs",
      desc: "Every chapter appears in this sidebar. Click any chapter to start writing, or hit \u2018+ New chapter\u2019 at the bottom. The sidebar auto-collapses while you write — hover to bring it back. Inside each chapter you\u2019ll find Blocs: per-chapter Bolt-On instructions that apply only to that section.",
      onEnter: tutCloseAll,
    },
    // 11. Editor in chapter
    {
      target: "editor", title: "Step 11 — The Editor (In-Chapter)",
      desc: "Inside any chapter, click \u2018The Editor\u2019 to run 11 real-time continuity checks: Canon Traits, Character Presence, Timeline, Emotional Arc, Voice Drift, Spatial Logic, and more. Each issue shows severity, a clear explanation, and the exact location in your text.",
      onEnter: tutCloseAll,
    },
    // 12. Editor from overview
    {
      target: "editor", title: "Step 12 — The Editor (Manuscript)",
      desc: "From the Overview (no chapter selected), The Editor switches to manuscript mode. It scans your entire novel and suggests sentence-level rewrites — current text vs. proposed improvement side by side. Accept or dismiss each change individually. Your final polish tool.",
      onEnter: tutCloseAll,
    },
    // 13. Manuscript Health
    {
      target: "health", title: "Step 13 — Manuscript Health",
      desc: "In the Overview, scroll to find Manuscript Health. The AI scores your novel on pacing, dialogue quality, clarity, and engagement — each out of 10. Per-chapter breakdowns tell you exactly which chapters need work and what to improve. A publishing readiness report.",
      onEnter: tutCloseAll,
    },
    // 14. Share
    {
      target: "share", title: "Step 14 — Share",
      desc: "Click the share icon to send your work to beta readers. Generate a password-protected, time-limited link — readers open it in a branded reading view with light and dark mode. They can highlight passages and leave annotations. Feedback arrives instantly in your review dashboard.",
      onEnter: tutCloseAll,
    },
    // 15. Export
    {
      target: "export", title: "Step 15 — Export",
      desc: "Click the export icon to download your manuscript as a professionally formatted EPUB or DOCX. Choose which chapters to include — Blocwrite generates clean, chaptered prose ready for publishers or self-publishing.",
      onEnter: tutCloseAll,
    },
    // 16. Chat & Co-Author
    {
      target: "chat", title: "Step 16 — Chat & Co-Author",
      desc: "This floating button opens your AI conversation panel. Interview characters from your Canon — they respond in their own voice. Story Insights then recommends profile updates. Switch to Co-Author mode for a writing partner who knows every chapter and character.",
      onEnter: tutCloseAll,
    },
    // 17. Settings
    {
      target: "settings", title: "Step 17 — Settings",
      desc: "Your settings hub. Manage your AI provider, model, language, context budget, subscription, password, and restart this tutorial anytime from the General tab.",
      onEnter: tutCloseAll,
    },
    // 18. Theme
    {
      target: "theme", title: "Step 18 — Dark & Light Mode",
      desc: "Switch between dark and light themes with one click. Your preference saves automatically and syncs across devices. The entire studio adapts instantly. You\u2019re all set — happy writing!",
      onEnter: tutCloseAll,
    },
  ];
  const [tutorialActive, setTutorialActive] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialRect, setTutorialRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const tutorialPrevStep = useRef<number>(-1);

  // ── Admin push alerts ──
  const [adminAlert, setAdminAlert] = useState<{ id: string; message: string } | null>(null);
  const [adminAlertProgress, setAdminAlertProgress] = useState(100);
  const adminAlertDismissed = useRef<Set<string>>(new Set());
  const ALERT_DURATION = 15_000;
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch("/api/alerts/active");
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data && data.id && !adminAlertDismissed.current.has(data.id)) {
            setAdminAlert(data);
            setAdminAlertProgress(100);
          } else if (!data || !data.id) {
            setAdminAlert(null);
          }
        }
      } catch { /* ignore */ }
    };
    void poll();
    const interval = setInterval(poll, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);
  useEffect(() => {
    if (!adminAlert) return;
    const start = Date.now();
    const frame = () => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / ALERT_DURATION) * 100);
      setAdminAlertProgress(remaining);
      if (remaining > 0) rafId = requestAnimationFrame(frame);
      else { adminAlertDismissed.current.add(adminAlert.id); setAdminAlert(null); }
    };
    let rafId = requestAnimationFrame(frame);
    const timer = setTimeout(() => {
      adminAlertDismissed.current.add(adminAlert.id);
      setAdminAlert(null);
    }, ALERT_DURATION + 100);
    return () => { cancelAnimationFrame(rafId); clearTimeout(timer); };
  }, [adminAlert]);

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
  const isNF = novel?.novelType === "nonfiction";
  const nfData = novel?.storyBible.nonfiction;
  const storyCharacters = useMemo(() => novel?.storyBible.characters ?? [], [novel]);
  const storyLocations = useMemo(() => novel?.storyBible.locations ?? [], [novel]);
  const storyTimelineEvents = useMemo(() => novel?.storyBible.timeline ?? [], [novel]);
  const planChapters = useMemo(() => novel?.storyBible.bookPlan?.chapters ?? [], [novel]);
  const chapterBoltonId = activeChapter ? (chapterBoltonByChapterId[activeChapter.id] ?? "") : "";
  useEffect(() => {
    if (!activeChapter) return;
    const blocks = getSceneBlocks(activeChapter);
    if (blocks.length === 0) return;
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
  }, [activeChapter?.id, activeChapter?.sceneBlocks]);
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

  // Fetch pending feedback count on mount / novelId change
  useEffect(() => {
    fetch("/api/share/feedback").then((r) => r.ok ? r.json() : []).then((data) => {
      if (Array.isArray(data)) {
        let count = 0;
        for (const fb of data) {
          for (const ch of fb.chapters ?? []) {
            count += (ch.annotations ?? []).length;
          }
        }
        setPendingFeedbackCount(count);
      }
    }).catch(() => {});
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
    try { window.localStorage.setItem("pilotwriter.assistant.provider", assistantProvider); } catch { /* ignore */ }
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
      try { window.localStorage.setItem(`pilotwriter.assistant.${assistantProvider}.key`, normalized); } catch { /* ignore */ }
      void saveSettingsToServer(gatherSettings());
    }
  }

  function persistOpenRouterModel(model: string) {
    setOpenRouterModel(model);
    if (typeof window !== "undefined") {
      try { window.localStorage.setItem(`pilotwriter.assistant.${assistantProvider}.model`, model); } catch { /* ignore */ }
      void saveSettingsToServer(gatherSettings());
    }
  }

  function persistAssistantBaseUrl(baseUrl: string) {
    setAssistantBaseUrl(baseUrl);
    if (typeof window !== "undefined") {
      try { window.localStorage.setItem(`pilotwriter.assistant.${assistantProvider}.baseUrl`, baseUrl); } catch { /* ignore */ }
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

  // Load novels from server on mount — server is the single source of truth.
  // No cross-user merge: we scope localStorage per user and always trust the server.
  useEffect(() => {
    void (async () => {
      // Get user email to scope localStorage before loading anything
      try {
        const subRes = await fetch("/api/billing/subscription");
        if (subRes.ok) {
          const subData = await subRes.json() as { email?: string; isAdmin?: boolean };
          if (subData.email) initUserScope(subData.email);
          if (subData.isAdmin) setIsAdmin(true);
        }
      } catch { /* ignore */ }

      // Server is the single source of truth
      const serverNovels = await loadNovelsFromServer();
      if (serverNovels !== null && serverNovels.length > 0) {
        setNovels(serverNovels);
        saveNovels(serverNovels); // cache locally (user-scoped)
      }
      // Also sync settings — restore AI config from server so it survives logout/login
      const serverSettings = await loadSettingsFromServer();
      if (serverSettings && Object.keys(serverSettings).length > 0) {
        applySettings(serverSettings);
        // Refresh React state from the now-populated localStorage
        const restoredProvider = getStoredProvider();
        setAssistantProvider(restoredProvider);
        const provOpt = getProviderOption(restoredProvider);
        setOpenRouterKey(normalizeClientApiKey(readStoredProviderField(restoredProvider, "key")));
        setOpenRouterModel(readStoredProviderField(restoredProvider, "model") || provOpt.defaultModel);
        setAssistantBaseUrl(readStoredProviderField(restoredProvider, "baseUrl") || provOpt.defaultBaseUrl);
      }
      setNovelSyncDone(true);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Tutorial: auto-trigger on first visit ──
  function startTutorial() {
    setActiveChapterId(null);
    setTutorialStep(0);
    setTutorialActive(true);
  }
  function completeTutorial() {
    const prev = tutorialPrevStep.current;
    if (prev >= 0 && TUTORIAL_STEPS[prev]?.onLeave) TUTORIAL_STEPS[prev].onLeave!();
    tutCloseAll();
    setTutorialActive(false);
    setTutorialStep(0);
    try {
      window.localStorage.setItem("pilotwriter.tutorial.complete", "1");
      void saveSettingsToServer(gatherSettings());
    } catch { /* ignore */ }
  }
  useEffect(() => {
    if (!novelSyncDone || !novel) return;
    try {
      if (!window.localStorage.getItem("pilotwriter.tutorial.complete")) {
        const t = setTimeout(() => startTutorial(), 900);
        return () => clearTimeout(t);
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [novelSyncDone]);

  // ── Tutorial: run step actions + recompute spotlight on step change ──
  useEffect(() => {
    if (!tutorialActive) { setTutorialRect(null); tutorialPrevStep.current = -1; return; }
    const step = TUTORIAL_STEPS[tutorialStep];
    if (!step) return;
    // Leave previous step
    const prev = tutorialPrevStep.current;
    if (prev >= 0 && prev !== tutorialStep && TUTORIAL_STEPS[prev]?.onLeave) {
      TUTORIAL_STEPS[prev].onLeave!();
    }
    tutorialPrevStep.current = tutorialStep;
    // Enter current step
    if (step.onEnter) step.onEnter();
    // Measure with delay so modals/DOM have time to render
    const delay = step.onEnter ? 500 : 120;
    const measure = () => {
      const el = document.querySelector(`[data-tutorial="${step.target}"]`) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
        // Double rAF to ensure scroll + layout is settled before measuring
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const r = el.getBoundingClientRect();
            setTutorialRect({ top: r.top, left: r.left, width: r.width, height: r.height });
          });
        });
      } else {
        setTutorialRect(null);
      }
    };
    const t = setTimeout(measure, delay);
    // Re-measure on resize/scroll for the spotlight to follow
    const throttledMeasure = () => requestAnimationFrame(measure);
    window.addEventListener("resize", throttledMeasure);
    window.addEventListener("scroll", throttledMeasure, true);
    return () => { clearTimeout(t); window.removeEventListener("resize", throttledMeasure); window.removeEventListener("scroll", throttledMeasure, true); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tutorialActive, tutorialStep]);

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
      // Cmd+Z / Ctrl+Z: undo (only when not inside a textarea/input)
      if (event.key === "z" && (event.metaKey || event.ctrlKey) && !event.shiftKey) {
        const tag = (event.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag !== "textarea" && tag !== "input") {
          event.preventDefault();
          handleUndo();
          return;
        }
      }
      if (event.key !== "Escape") return;
      if (rewritePreview) {
        setRewritePreview(null);
        return;
      }
      if (rewriteSelection) {
        setRewriteSelection(null);
        return;
      }
      if (pendingChapterDelete) {
        setPendingChapterDelete(null);
        return;
      }
      if (showPlanGenerateModal) {
        cancelAiWork(); setShowPlanGenerateModal(false);
        saveNow();
        return;
      }
      if (showExportModal) {
        setShowExportModal(false);
        return;
      }
      if (showShareModal) {
        setShowShareModal(false);
        return;
      }
      if (showFeedbackPanel) {
        cancelAiWork(); setShowFeedbackPanel(false);
        saveNow();
        return;
      }
      if (showPlanModal) {
        cancelAiWork(); setShowPlanModal(false);
        saveNow();
        return;
      }
      if (showEditorModal) {
        cancelAiWork(); setShowEditorModal(false);
        saveNow();
        return;
      }
      if (charChatOpen) {
        cancelAiWork(); setCharChatOpen(false);
        return;
      }
      if (showStoryBibleModal) {
        cancelAiWork(); setShowStoryBibleModal(false);
        saveNow();
        return;
      }
      if (profileOpen) {
        setProfileOpen(false);
        saveNow();
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
    showShareModal,
    showFeedbackPanel,
    showPlanModal,
    showEditorModal,
    charChatOpen,
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

  // ── Talk to Your Characters ──────────────────────────
  function buildCharacterSystemPrompt(char: Character): string {
    if (!novel) return "";
    const bibleContext = buildStoryBibleContext("default");

    const planChapters = novel.storyBible.bookPlan?.chapters ?? [];
    const chapterSummary = novel.chapters.map((ch, i) => {
      const planEntry = planChapters.find((pc) => pc.manuscriptChapterId === ch.id);
      const prose = extractProseFromContent(ch.content ?? "");
      const isActive = activeChapter?.id === ch.id;
      const excerpt = isActive ? "" : (prose.length > 300 ? prose.slice(0, 300) + "..." : prose);
      const parts = [`Ch${i + 1}: "${ch.title || "Untitled"}"${isActive ? " [CURRENT CHAPTER]" : ""}`];
      if (planEntry?.synopsis) parts.push(`Synopsis: ${planEntry.synopsis}`);
      if (excerpt.trim()) parts.push(`Content: ${excerpt}`);
      return parts.join(" | ");
    }).join("\n");

    const activeChapterProse = activeChapter ? extractProseFromContent(activeChapter.content ?? "") : "";
    const activeChapterSection = activeChapterProse.trim()
      ? [
          `=== CURRENT CHAPTER PROSE (you are being asked about THIS chapter — you know every detail of what happens here) ===`,
          activeChapterProse.slice(0, 6000),
        ].join("\n")
      : "";

    const charParts: string[] = [];
    charParts.push(`You ARE ${char.name}. You are being interviewed by the author of the story you exist in.`);
    charParts.push(`Stay completely in character at all times. Respond as ${char.name} would — using their vocabulary, speech patterns, emotional tendencies, and worldview.`);
    charParts.push(`Never break character. Never say you are an AI. You are ${char.name}.`);
    if (char.role) charParts.push(`Role in the story: ${char.role}.`);
    if (char.pronouns) charParts.push(`Pronouns: ${char.pronouns}.`);
    if (char.personality) charParts.push(`Personality: ${char.personality}`);
    if (char.backstory) charParts.push(`Backstory: ${char.backstory}`);
    if (char.goals) charParts.push(`Goals and motivations: ${char.goals}`);
    if (char.fears) charParts.push(`Fears: ${char.fears}`);
    if (char.accent) charParts.push(`Accent/dialect: ${char.accent}`);
    if (char.speakingStyle) charParts.push(`Speaking style: ${char.speakingStyle}`);
    if (char.voiceNotes) charParts.push(`Voice notes: ${char.voiceNotes}`);
    if (char.reactionPattern) charParts.push(`How they typically react: ${char.reactionPattern}`);
    if (char.secrets) charParts.push(`Secrets they carry (they may hint at but not reveal directly unless pressed): ${char.secrets}`);
    if (char.appearance) charParts.push(`Physical appearance: ${char.appearance}`);
    if (char.logline) charParts.push(`One-line description: ${char.logline}`);
    const relationships = char.relationships?.filter((r) => r.targetCharacterId) ?? [];
    if (relationships.length > 0) {
      const relLines = relationships.map((r) => {
        const target = storyCharacters.find((c) => c.id === r.targetCharacterId);
        return target ? `${target.name}: ${r.type || r.description || "connected"}` : null;
      }).filter(Boolean);
      if (relLines.length) charParts.push(`Key relationships: ${relLines.join("; ")}`);
    }
    const hasDetail = !!(char.personality || char.backstory || char.goals || char.fears || char.speakingStyle || char.logline);
    if (!hasDetail) {
      charParts.push(`This character's profile is mostly blank — the author is discovering who you are through conversation. Be creative. Invent details about yourself that feel authentic for the story. Let your personality emerge naturally.`);
    }
    charParts.push(`Keep responses concise and natural — like real dialogue, not essays. Show personality through word choice, rhythm, and attitude.`);
    if (activeChapterProse.trim()) {
      charParts.push(`The author is talking to you about the current chapter. You know exactly what happens in it — you were there. If the author asks about details, react as someone who lived through those events. If you have thoughts about what's missing or wrong, share them naturally in character.`);
    }

    return [
      `=== YOUR CHARACTER ===`,
      charParts.join("\n\n"),
      ``,
      `=== STORY BIBLE (your world) ===`,
      bibleContext,
      ``,
      `=== CHAPTERS ===`,
      chapterSummary || "(No chapters yet)",
      activeChapterSection ? `\n${activeChapterSection}` : "",
      ``,
      `You know this story from the inside — you live in it. Use this knowledge naturally when it's relevant to the conversation, but don't info-dump. React to story events as someone who experienced them.`,
    ].filter(Boolean).join("\n");
  }

  async function sendCharacterChat() {
    if (!charChatTarget || !charChatInput.trim() || charChatLoading || storyAiBusyAction || arcBusy) return;
    const userMsg = charChatInput.trim();
    setCharChatInput("");
    setCharChatMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setCharChatLoading(true);
    try {
      const systemPrompt = buildCharacterSystemPrompt(charChatTarget);
      // Build conversation history for context
      const conversationHistory = charChatMessages.map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.text,
      }));
      // Include recent messages in the prompt for context
      let contextPrompt = "";
      if (conversationHistory.length > 0) {
        const recent = conversationHistory.slice(-10);
        contextPrompt = recent.map((m) => `${m.role === "user" ? "Author" : charChatTarget.name}: ${m.content}`).join("\n\n") + "\n\n";
      }
      contextPrompt += `Author: ${userMsg}\n\n${charChatTarget.name}:`;

      const reply = await requestOpenRouterText(contextPrompt, 800, 120000, systemPrompt, false, 0.85);
      if (reply.trim()) {
        setCharChatMessages((prev) => [...prev, { role: "character", text: reply.trim() }]);
      } else {
        setCharChatMessages((prev) => [...prev, { role: "character", text: "…" }]);
      }
    } catch (err) {
      if (!isCancelledError(err)) {
        setCharChatMessages((prev) => [...prev, { role: "character", text: "I seem to have lost my train of thought…" }]);
      }
    } finally {
      setCharChatLoading(false);
    }
  }

  function closeChat() {
    if (!coAuthorMode && charChatTarget && charChatMessages.length >= 2 && !charChatReviewDone && !charChatReviewing) {
      void endChatAndReview();
      return;
    }
    setCharChatOpen(false);
    saveNow();
  }

  function openCharacterChat(char: Character) {
    setCoAuthorMode(false);
    setCharChatTarget(char);
    setCharChatMessages([]);
    setCharChatInput("");
    setCharChatLoading(false);
    setCharChatReviewDone(false);
    setCharChatRecommendations([]);
    setChatIsStale(false);
    chatOpenedAt.current = Date.now();
    setCharChatOpen(true);
  }

  function openCoAuthorChat() {
    setCoAuthorMode(true);
    setCharChatTarget(null);
    setCharChatMessages([]);
    setCharChatInput("");
    setCharChatLoading(false);
    setCharChatReviewDone(false);
    setCharChatRecommendations([]);
    setChatIsStale(false);
    chatOpenedAt.current = Date.now();
    setCharChatOpen(true);
  }

  async function sendCoAuthorChat() {
    if (!novel || !charChatInput.trim() || charChatLoading || storyAiBusyAction || arcBusy) return;
    const userMsg = charChatInput.trim();
    setCharChatInput("");
    setCharChatMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setCharChatLoading(true);
    try {
      // Full story bible context so the co-author knows everything
      const bibleContext = buildStoryBibleContext("default");

      // Build detailed chapter listing with synopses and prose excerpts
      const planChapters = novel.storyBible.bookPlan?.chapters ?? [];
      const chapterDetails = novel.chapters.map((ch, i) => {
        const planEntry = planChapters.find((pc) => pc.manuscriptChapterId === ch.id);
        const prose = extractProseFromContent(ch.content ?? "");
        const excerpt = prose.length > 400 ? prose.slice(0, 400) + "..." : prose;
        const parts = [`Ch${i + 1}: "${ch.title || "Untitled"}"`];
        if (planEntry?.synopsis) parts.push(`Synopsis: ${planEntry.synopsis}`);
        if (excerpt.trim()) parts.push(`Content: ${excerpt}`);
        else parts.push("(not yet written)");
        return parts.join("\n  ");
      }).join("\n");

      const activeChapterCtx = activeChapter
        ? `The author is currently working on Chapter ${novel.chapters.findIndex((c) => c.id === activeChapter.id) + 1}: "${activeChapter.title || "Untitled"}".`
        : `The author is on the novel overview.`;

      const nfCoAuthorCtx = isNF ? (() => {
        const nf = novel.storyBible.nonfiction;
        const parts: string[] = ["\n=== MEMOIR CONTEXT ==="];
        if (nf?.subjectName) parts.push(`Subject: ${nf.subjectName} (${nf.subjectRelation || "subject"})`);
        if (nf?.era) parts.push(`Era: ${nf.era}`);
        if (nf?.setting) parts.push(`Setting: ${nf.setting}`);
        if (nf?.centralTheme) parts.push(`Theme: ${nf.centralTheme}`);
        if (nf?.lifeEvents?.length) {
          parts.push(`Life Events (${nf.lifeEvents.length}):`);
          nf.lifeEvents.slice(0, 15).forEach((e, i) => parts.push(`  ${i + 1}. ${e.title}${e.date ? ` (${e.date})` : ""}: ${e.description?.slice(0, 120) || ""}`));
        }
        return parts.join("\n");
      })() : "";

      const systemPrompt = isNF ? [
        `You are The Co-Author — a sharp, knowledgeable writing partner for the ${nfData?.subtype === "true-crime" ? "true crime book" : nfData?.subtype === "historical" ? "historical non-fiction book" : nfData?.subtype === "investigative" ? "investigative book" : nfData?.subtype === "biography" ? "biography" : "memoir"} "${novel.title}".`,
        `You have complete knowledge of the events, people, places, and themes. You help the author shape their true story into compelling narrative.`,
        ``,
        `=== FULL STORY BIBLE ===`,
        bibleContext,
        nfCoAuthorCtx,
        ``,
        `=== CHAPTERS ===`,
        chapterDetails || "(No chapters yet)",
        ``,
        `=== CURRENT STATE ===`,
        activeChapterCtx,
        ``,
        `=== BEHAVIOUR ===`,
        nfData?.subtype === "true-crime"
          ? `This is true crime non-fiction. Help the author build tension, maintain factual accuracy, and structure the investigation narrative. Suggest ways to handle sensitive material with respect for victims.`
          : nfData?.subtype === "historical"
          ? `This is historical non-fiction. Help the author ground facts in vivid narrative, weave in human stories, and maintain historical accuracy. Suggest research angles and ways to bring the past to life.`
          : nfData?.subtype === "investigative"
          ? `This is investigative non-fiction. Help structure revelations, build from evidence, and maintain journalistic rigour while keeping the narrative gripping.`
          : nfData?.subtype === "biography"
          ? `This is a biography. Help the author capture the subject's life with depth, balance, and narrative drive. Suggest ways to handle the subject fairly.`
          : `This is a memoir. Help the author tell their true story with authenticity, emotional depth, and literary quality. Focus on sensory memory and emotional truth.`,
        `When suggesting prose, ground it in the real events and people from the context.`,
        `Be concise, specific, and useful — like a real co-author in a writing room.`,
        `Don't dump information unprompted — only reference details when relevant to the author's question.`,
      ].join("\n") : [
        `You are The Co-Author — a sharp, knowledgeable writing partner for the novel "${novel.title}".`,
        `You have complete knowledge of the entire novel: its synopsis, characters, plot, themes, chapters, locations, lore, and everything in the story bible. Use this knowledge when the author asks about any aspect of their story.`,
        ``,
        `=== FULL STORY BIBLE ===`,
        bibleContext,
        ``,
        `=== CHAPTERS ===`,
        chapterDetails || "(No chapters yet)",
        ``,
        `=== CURRENT STATE ===`,
        activeChapterCtx,
        ``,
        `=== BEHAVIOUR ===`,
        `Answer based on what you know about THIS story. Be concise, specific, and useful — like a real co-author in a writing room.`,
        `When the author asks for a title, synopsis, character detail, plot point, or anything about the story, draw on the full context above.`,
        `Don't dump information unprompted — only reference details when relevant to the author's question.`,
        `If asked for creative suggestions, make them specific to this story and consistent with existing canon.`,
      ].join("\n");

      // Include conversation history
      let contextPrompt = "";
      if (charChatMessages.length > 0) {
        const recent = charChatMessages.slice(-10);
        contextPrompt = recent.map((m) => `${m.role === "user" ? "Author" : "Co-Author"}: ${m.text}`).join("\n\n") + "\n\n";
      }
      contextPrompt += `Author: ${userMsg}\n\nCo-Author:`;

      const reply = await requestOpenRouterText(contextPrompt, 1000, 120000, systemPrompt, false, 0.75);
      if (reply.trim()) {
        setCharChatMessages((prev) => [...prev, { role: "character", text: reply.trim() }]);
      } else {
        setCharChatMessages((prev) => [...prev, { role: "character", text: "…" }]);
      }
    } catch (err) {
      if (!isCancelledError(err)) {
        setCharChatMessages((prev) => [...prev, { role: "character", text: "Let me think about that differently…" }]);
      }
    } finally {
      setCharChatLoading(false);
    }
  }

  async function endChatAndReview() {
    if (!novel || !charChatTarget || charChatMessages.length < 2 || !ensureStoryAiReady()) return;
    setCharChatReviewing(true);

    const chatTranscript = charChatMessages
      .map((m) => `${m.role === "user" ? "Author" : charChatTarget.name}: ${m.text}`)
      .join("\n\n");

    // Full story context for continuity awareness
    const bibleContext = buildStoryBibleContext("planCompact");

    // Gather plan chapters without prose
    const planChapters = novel.storyBible.bookPlan.chapters.map((pc, idx) => {
      const manuscript = novel.chapters.find((c) => c.id === pc.manuscriptChapterId);
      const hasProse = manuscript && (manuscript.content ?? "").trim().length > 100;
      return { ...pc, idx, hasProse };
    }).filter((pc) => !pc.hasProse && pc.synopsis.trim());

    // Gather all characters for cross-character awareness
    const otherChars = novel.storyBible.characters
      .filter((c) => c.id !== charChatTarget.id)
      .slice(0, 8)
      .map((c) => `${c.name} (${c.role}): ${c.logline || c.personality || "no detail yet"}`);

    const charProfile = charChatTarget;

    const activeChapterProse = activeChapter ? extractProseFromContent(activeChapter.content ?? "").trim() : "";
    const hasActiveChapterProse = activeChapter && activeChapterProse.length > 50;

    const systemPrompt = [
      "You are a sharp story continuity analyst. An author just had an in-character conversation with one of their characters.",
      "Your job: scan the conversation for anything that GENUINELY changes what we know about this character or the story direction.",
      "",
      "RULES — read carefully:",
      "- Only recommend changes that are CLEARLY and DIRECTLY supported by something specific said in the conversation.",
      "- Do NOT recommend changes just because the conversation touched on a topic — the character must have revealed something NEW that isn't already captured in their profile or the story.",
      "- Do NOT rewrite things that are already accurate. If the current profile already captures the trait, skip it.",
      "- Do NOT add generic filler. Every recommendation must point to a specific moment in the conversation.",
      "- PROTECT CONTINUITY: if a change would contradict established events, character arcs, or written prose, do NOT recommend it.",
      "- Be conservative. 0 recommendations is a perfectly valid outcome for a casual chat.",
      "- For chapter synopses: only suggest changes if the conversation revealed a concrete plot shift, new motivation, or relationship change that directly affects that chapter's direction.",
      "- For profile fields: only suggest changes if the character said or implied something that genuinely updates, deepens, or corrects their current profile entry.",
      "- New values should INCORPORATE existing content where relevant, not replace it entirely.",
      hasActiveChapterProse
        ? "- For prose edits: if the character revealed a specific detail, reaction, sensory memory, or emotional nuance that would ENRICH an existing sentence or passage in the current chapter, suggest a targeted prose edit. The original must be a VERBATIM quote. The revised version should weave in the new detail naturally — not rewrite the whole paragraph. Only suggest prose edits for details the character specifically mentioned that are MISSING from the current text."
        : "",
      "- Return ONLY valid JSON. No explanation outside the JSON.",
    ].filter(Boolean).join("\n");

    const userPrompt = [
      `=== CHARACTER PROFILE ===`,
      `Name: ${charProfile.name} (${charProfile.role})`,
      charProfile.logline ? `Logline: ${charProfile.logline}` : `Logline: (empty)`,
      `Personality: ${charProfile.personality || "(empty)"}`,
      `Backstory: ${charProfile.backstory || "(empty)"}`,
      `Goals: ${charProfile.goals || "(empty)"}`,
      `Fears: ${charProfile.fears || "(empty)"}`,
      `Secrets: ${charProfile.secrets || "(empty)"}`,
      "",
      `=== STORY CONTEXT ===`,
      bibleContext,
      "",
      otherChars.length > 0 ? `=== OTHER CHARACTERS ===\n${otherChars.join("\n")}` : "",
      "",
      `=== CONVERSATION TRANSCRIPT ===`,
      chatTranscript,
      "",
      hasActiveChapterProse ? [
        `=== CURRENT CHAPTER PROSE (Chapter: "${activeChapter!.title || "Untitled"}") ===`,
        activeChapterProse.slice(0, 6000),
      ].join("\n") : "",
      "",
      planChapters.length > 0 ? `=== FUTURE CHAPTERS (no prose written yet — these CAN be modified) ===\n${planChapters.map((pc) => `Ch${pc.idx + 1} (id: "${pc.id}", title: "${pc.title || "Untitled"}"): ${pc.synopsis}`).join("\n")}` : "No future chapters without prose — skip chapter recommendations.",
      "",
      `Return JSON:`,
      `{"chapterChanges": [{"chapterId": "string", "chapterTitle": "string", "currentSynopsis": "string", "newSynopsis": "string", "reason": "Quote or reference the specific conversation moment"}],`,
      ` "profileChanges": [{"field": "goals"|"fears"|"backstory"|"secrets"|"personality"|"logline", "currentValue": "string", "newValue": "string", "reason": "Quote or reference the specific conversation moment"}]`,
      hasActiveChapterProse
        ? `, "proseEdits": [{"original": "exact verbatim quote from the chapter prose", "revised": "the same passage with the new detail woven in naturally", "reason": "what the character revealed that enriches this passage"}]}`
        : `}`,
      `If nothing meaningful was revealed, return {"chapterChanges": [], "profileChanges": []${hasActiveChapterProse ? ', "proseEdits": []' : ""}}.`,
    ].filter(Boolean).join("\n");

    try {
      const result = await requestOpenRouterJson(userPrompt, 2000, { systemMessage: systemPrompt }) as Record<string, unknown> | null;
      if (!result) { setCharChatReviewing(false); setCharChatReviewDone(true); return; }

      const recs: ChatRecommendation[] = [];

      // Process chapter changes
      if (Array.isArray(result.chapterChanges)) {
        for (const ch of result.chapterChanges as Record<string, unknown>[]) {
          if (!ch.chapterId || !ch.newSynopsis) continue;
          recs.push({
            id: `ch-${ch.chapterId}`,
            type: "chapter_synopsis",
            label: `Chapter: ${String(ch.chapterTitle || ch.chapterId)}`,
            detail: String(ch.reason || "Based on conversation insights"),
            targetId: String(ch.chapterId),
            currentValue: String(ch.currentSynopsis || ""),
            newValue: String(ch.newSynopsis).slice(0, 500),
            accepted: null,
          });
        }
      }

      // Process profile changes
      if (Array.isArray(result.profileChanges)) {
        for (const pc of result.profileChanges as Record<string, unknown>[]) {
          if (!pc.field || !pc.newValue) continue;
          const field = String(pc.field);
          if (!["goals", "fears", "backstory", "secrets", "personality", "logline"].includes(field)) continue;
          recs.push({
            id: `prof-${field}`,
            type: "character_profile",
            label: `${charChatTarget.name}'s ${field.charAt(0).toUpperCase() + field.slice(1)}`,
            detail: String(pc.reason || "Based on conversation insights"),
            targetId: charChatTarget.id,
            field,
            currentValue: String(pc.currentValue || ""),
            newValue: String(pc.newValue).slice(0, 500),
            accepted: null,
          });
        }
      }

      // Process prose edits — only if there's an active chapter with prose
      if (Array.isArray(result.proseEdits) && activeChapter) {
        const chContent = activeChapter.content ?? "";
        for (const pe of result.proseEdits as Record<string, unknown>[]) {
          if (!pe.original || !pe.revised) continue;
          const original = String(pe.original).trim();
          const revised = String(pe.revised).trim();
          if (!original || !revised || original === revised) continue;
          if (!chContent.includes(original)) continue;
          recs.push({
            id: `prose-${recs.length}`,
            type: "prose_edit",
            label: `Enrich prose in "${activeChapter.title || "Untitled"}"`,
            detail: String(pe.reason || "Detail from conversation"),
            targetId: activeChapter.id,
            currentValue: original.slice(0, 500),
            newValue: revised.slice(0, 500),
            accepted: null,
          });
        }
      }

      setCharChatRecommendations(recs);
    } catch { /* ignore */ } finally {
      setCharChatReviewing(false);
      setCharChatReviewDone(true);
    }
  }

  function applyCharChatRecommendation(recId: string) {
    if (!novel) return;
    const rec = charChatRecommendations.find((r) => r.id === recId);
    if (!rec) return;

    if (rec.type === "chapter_synopsis") {
      const updatedPlan = {
        ...novel.storyBible.bookPlan,
        chapters: novel.storyBible.bookPlan.chapters.map((pc) =>
          pc.id === rec.targetId ? { ...pc, synopsis: rec.newValue } : pc
        ),
      };
      updateStoryBible({ bookPlan: updatedPlan });
    } else if (rec.type === "character_profile" && rec.field) {
      const updatedCharacters = novel.storyBible.characters.map((c) =>
        c.id === rec.targetId ? { ...c, [rec.field!]: rec.newValue } : c
      );
      updateStoryBible({ characters: updatedCharacters });
    } else if (rec.type === "prose_edit" && rec.currentValue) {
      const chapter = novel.chapters.find((c) => c.id === rec.targetId);
      if (chapter) {
        const content = chapter.content ?? "";
        if (content.includes(rec.currentValue)) {
          pushUndoSnapshot(chapter.id, content, chapter.sceneBlocks, true);
          const updated = content.replace(rec.currentValue, rec.newValue);
          updateChapter(chapter.id, { content: updated });
        }
      }
    }

    setCharChatRecommendations((prev) =>
      prev.map((r) => r.id === recId ? { ...r, accepted: true } : r)
    );
  }

  function dismissCharChatRecommendation(recId: string) {
    setCharChatRecommendations((prev) =>
      prev.map((r) => r.id === recId ? { ...r, accepted: false } : r)
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
    try {
      const raw = window.localStorage.getItem(BOLTON_LIBRARY_KEY);
      if (!raw) return [];
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
    // Prioritise: protagonist first, then antagonist, then others — always include protagonist
    const protagonist = characters.find((c) => c.role === "Protagonist");
    const sortedChars = (relevantChars.length > 0 ? relevantChars : characters.slice(0, 3))
      .slice(0, 6)
      .sort((a, b) => {
        if (a.role === "Protagonist") return -1;
        if (b.role === "Protagonist") return 1;
        if (a.role === "Antagonist") return -1;
        if (b.role === "Antagonist") return 1;
        return 0;
      });
    // Ensure protagonist is always included even if not in planCharIds
    if (protagonist && !sortedChars.find((c) => c.id === protagonist.id)) {
      sortedChars.unshift(protagonist);
    }
    const charList = sortedChars
      .slice(0, 6)
      .map((c) => {
        const alias = c.otherNames?.trim() ? ` | aliases: ${clampPromptText(c.otherNames, 40)}` : "";
        const speechParts: string[] = [];
        if ((c as Record<string, unknown>).accent) speechParts.push(`accent: ${clampPromptText(String((c as Record<string, unknown>).accent), 40)}`);
        if ((c as Record<string, unknown>).speakingStyle) speechParts.push(`speech: ${clampPromptText(String((c as Record<string, unknown>).speakingStyle), 40)}`);
        if ((c as Record<string, unknown>).voiceNotes) speechParts.push(`voice: ${clampPromptText(String((c as Record<string, unknown>).voiceNotes), 40)}`);
        const speechInfo = speechParts.length > 0 ? ` [${speechParts.join(", ")}]` : "";
        return `${c.name} (${c.role || "Supporting"})${c.logline ? `: ${clampPromptText(c.logline, 50)}` : ""}${alias}${speechInfo}`;
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

    return parts.length > 2200 ? `${parts.slice(0, 2100).trimEnd()}\n[condensed]` : parts;
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

  // ── Right-click prose rewrite ──────────────────────────
  async function runProseContextAction(action: "rewrite" | "expand" | "tighten" | "natural") {
    if (!proseCtx || !novel || !activeChapter || !ensureStoryAiReady()) return;
    const { blockIdx, selStart, selEnd, selectedText, fullProse } = proseCtx;
    setProseCtxBusy(true);
    setProseCtx(null); // close menu

    const before = fullProse.slice(Math.max(0, selStart - 600), selStart);
    const after = fullProse.slice(selEnd, selEnd + 600);

    // Get author style from profile if available
    const styleAuthor = readStoredProviderField(assistantProvider, "key") ? "" : ""; // placeholder
    const novelGenre = novel.storyBible.summary.genre.join(", ") || "fiction";

    const actionInstructions: Record<string, string> = {
      rewrite: `Rewrite the SELECTED TEXT to be clearer, more engaging, and better crafted. Change sentence structures, word choices, and phrasing. Keep the same meaning, events, and intent. The result MUST be noticeably different from the original.`,
      expand: `Expand the SELECTED TEXT with more detail, sensory description, interiority, or dialogue. Add new phrasing and restructure existing sentences. Keep it grounded in the same scene and voice. Don't change the events — enrich them.`,
      tighten: `Tighten the SELECTED TEXT. Cut filler, reduce wordiness, sharpen sentences, combine where possible. Keep every important beat but make it leaner and punchier. The result MUST be shorter than the original.`,
      natural: `Make the SELECTED TEXT sound more natural and human. Restructure sentences, swap out stiff phrasing for conversational flow. Remove any AI-sounding patterns: excessive em dashes, overly formal phrasing, "a testament to", "the weight of", "couldn't help but", "a sense of". The result MUST read differently from the original.`,
    };

    const systemMsg = [
      `You are a prose editor working on a ${novelGenre} novel.`,
      `CRITICAL: You MUST produce a genuinely DIFFERENT version of the text. Do NOT return the original text or something nearly identical. Change sentence structures, word choices, and phrasing.`,
      `You MUST return ONLY the replacement prose — nothing else. No quotes, no labels, no "Here is the rewritten text:", no explanations.`,
      `NEVER include your thinking, notes, word counts, or meta-commentary.`,
      `The replacement must flow naturally with the text before and after it.`,
      `Avoid AI writing patterns: no excessive em dashes (—), no "a testament to", "the weight of", "couldn't help but", "sent a shiver", "a sense of". Write like a human author.`,
      `Match the voice, tense, POV, and style of the surrounding prose exactly.`,
    ].join(" ");

    const prompt = [
      `TEXT BEFORE (for context only — do NOT include in output):`,
      `"""${before}"""`,
      ``,
      `SELECTED TEXT (you MUST rewrite this — do NOT return it unchanged):`,
      `"""${selectedText}"""`,
      ``,
      `TEXT AFTER (for context only — do NOT include in output):`,
      `"""${after}"""`,
      ``,
      actionInstructions[action],
      `IMPORTANT: The rewritten version MUST be noticeably different from the original. Do NOT echo the original back.`,
      `Return ONLY the replacement prose. Nothing else.`,
    ].join("\n");

    try {
      const result = await requestOpenRouterText(prompt, Math.max(500, Math.round(selectedText.split(/\s+/).length * 3)), 180000, systemMsg, false, 0.85);
      if (!result || !result.trim()) { setProseCtxBusy(false); return; }

      // Clean any wrapping quotes the AI might add
      let cleaned = result.trim();
      if (cleaned.startsWith('"') && cleaned.endsWith('"')) cleaned = cleaned.slice(1, -1);
      if (cleaned.startsWith("'") && cleaned.endsWith("'")) cleaned = cleaned.slice(1, -1);

      // Replace the selected text
      const newText = fullProse.slice(0, selStart) + cleaned + fullProse.slice(selEnd);
      if (blockIdx >= 0) {
        pushUndoSnapshot(activeChapter.id, activeChapter.content, activeChapter.sceneBlocks, true);
        const blocks = getSceneBlocks(activeChapter);
        if (blockIdx < blocks.length) {
          const next = [...blocks];
          next[blockIdx] = { ...next[blockIdx], prose: newText };
          updateSceneBlocks(activeChapter.id, next);
          syncChapterContentFromBlocks(activeChapter.id, next);
        }
      } else {
        updateChapter(activeChapter.id, { content: newText }, true);
      }
    } catch (err) {
      if (isCancelledError(err)) { setProseCtxBusy(false); return; }
      console.error("Prose context action failed:", err);
    } finally {
      setProseCtxBusy(false);
    }
  }

  // ── Smart Rewrite: detect selection in any editor textarea ──
  const REWRITE_MODES = [
    { id: "emotional", label: "More Emotional", desc: "Deepen feeling and interiority", icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" },
    { id: "suspenseful", label: "More Suspenseful", desc: "Build tension and dread", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
    { id: "poetic", label: "More Poetic", desc: "Richer imagery and rhythm", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
    { id: "tighter", label: "Shorter & Tighter", desc: "Cut filler, sharpen every line", icon: "M4 6h16M4 12h10M4 18h6" },
    { id: "bestseller", label: "Bestseller Tone", desc: "Punchy, commercial, page-turner", icon: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" },
  ];

  function handleEditorMouseUp(
    e: React.MouseEvent<HTMLTextAreaElement>,
    blockIdx: number, // -1 for plain editor
  ) {
    // Clear any pending timer
    if (rewriteSelectionTimer.current) clearTimeout(rewriteSelectionTimer.current);

    // Small delay so the browser finalises the selection
    rewriteSelectionTimer.current = setTimeout(() => {
      const el = e.target as HTMLTextAreaElement;
      const selText = el.value.slice(el.selectionStart, el.selectionEnd).trim();
      if (!selText || selText.length < 5) {
        setRewriteSelection(null);
        return;
      }
      // Position the toolbar above the cursor, clamped to stay fully on-screen
      const toolbarW = 520; // approx width of the rewrite toolbar
      const toolbarH = 44;  // approx height
      let x = e.clientX - toolbarW / 2;
      let y = e.clientY - toolbarH - 12;
      // Clamp horizontal: keep fully visible
      if (x + toolbarW > window.innerWidth - 12) x = window.innerWidth - toolbarW - 12;
      if (x < 12) x = 12;
      // Clamp vertical: if too close to top, show below selection instead
      if (y < 12) y = e.clientY + 16;
      if (y + toolbarH > window.innerHeight - 12) y = window.innerHeight - toolbarH - 12;
      setRewriteSelection({
        x, y,
        blockIdx,
        selStart: el.selectionStart,
        selEnd: el.selectionEnd,
        selectedText: selText,
        fullContent: el.value,
      });
    }, 200);
  }

  async function runSmartRewrite(modeId: string) {
    if (!rewriteSelection || !novel || !activeChapter || !ensureStoryAiReady()) return;
    const { blockIdx, selStart, selEnd, selectedText, fullContent } = rewriteSelection;
    setRewriteBusy(true);
    setRewriteMode(modeId);

    const before = fullContent.slice(Math.max(0, selStart - 600), selStart);
    const after = fullContent.slice(selEnd, selEnd + 600);
    const novelGenre = novel.storyBible.summary.genre.join(", ") || "fiction";

    const modeInstructions: Record<string, string> = {
      emotional: `Rewrite the SELECTED TEXT to be MORE EMOTIONALLY RESONANT. Deepen interiority, let the reader feel what the character feels. Add sensory and emotional depth. Restructure sentences, change word choices, vary rhythm. Keep the same events and meaning but the prose MUST read differently.`,
      suspenseful: `Rewrite the SELECTED TEXT to be MORE SUSPENSEFUL. Build tension, add dread, shorten sentences where needed, use pacing tricks. Restructure the prose, change word choices, vary sentence length dramatically. Keep the same events and meaning but the prose MUST read differently.`,
      poetic: `Rewrite the SELECTED TEXT with RICHER, MORE POETIC prose. Use fresh imagery, metaphor, rhythm, and lyrical phrasing. Restructure sentences, find new word choices, create beauty without being purple. Keep the same events and meaning but the prose MUST read differently.`,
      tighter: `Rewrite the SELECTED TEXT to be SHORTER AND TIGHTER. Cut every unnecessary word, eliminate filler, sharpen sentences. Combine sentences, remove redundancy, use stronger verbs. Aim for 60-75% of the original length. The result MUST be noticeably more concise.`,
      bestseller: `Rewrite the SELECTED TEXT in a BESTSELLER TONE — punchy, commercial, page-turning prose. Short sentences mixed with longer ones. Active voice. Direct. Restructure for pace and impact. Think Colleen Hoover, Lee Child, or Gillian Flynn. Keep the same events and meaning but the prose MUST read differently.`,
    };

    const svr = novel.storyBible.styleVoice;
    const rewriteStyleCtx = [
      svr?.comps?.length ? `Style: ${svr.comps.slice(0, 5).join(", ")}.` : "",
      svr?.voiceRules ? `Voice rules: ${svr.voiceRules.slice(0, 600)}` : "",
      svr?.pov ? `POV: ${svr.pov}.` : "",
      svr?.tense ? `Tense: ${svr.tense}.` : "",
    ].filter(Boolean).join(" ");
    const systemMsg = [
      `You are a prose rewriting specialist for a ${novelGenre} novel.`,
      rewriteStyleCtx ? `AUTHOR'S STYLE (follow closely): ${rewriteStyleCtx}` : "",
      `CRITICAL: You MUST produce a genuinely DIFFERENT version of the text. Do NOT return the original text or something nearly identical.`,
      `Change sentence structures, word choices, rhythm, and phrasing. The rewrite should be clearly improved and noticeably different from the original.`,
      `Return ONLY the replacement prose — nothing else. No quotes, no labels, no explanations, no "Here is the rewritten text:".`,
      `NEVER include thinking, notes, word counts, or meta-commentary.`,
      `The replacement must flow naturally with the text before and after it.`,
      `Avoid AI writing patterns: no excessive em dashes, no "a testament to", "the weight of", "couldn't help but". Write like a human author.`,
      `Match the tense, POV, and general voice of the surrounding prose.`,
    ].filter(Boolean).join(" ");

    const prompt = [
      `TEXT BEFORE (context only — do NOT include in output):`,
      `"""${before}"""`,
      ``,
      `SELECTED TEXT (you MUST rewrite this — do NOT return it unchanged):`,
      `"""${selectedText}"""`,
      ``,
      `TEXT AFTER (context only — do NOT include in output):`,
      `"""${after}"""`,
      ``,
      modeInstructions[modeId] || modeInstructions.emotional,
      `IMPORTANT: The rewritten version MUST be noticeably different from the original. Change sentence structures, word choices, and phrasing. Do NOT echo the original back.`,
      `Return ONLY the replacement prose. Nothing else.`,
    ].join("\n");

    // Helper: measure how similar two strings are (0 = identical, 1 = completely different)
    function textDifference(a: string, b: string): number {
      const na = a.toLowerCase().replace(/\s+/g, " ").trim();
      const nb = b.toLowerCase().replace(/\s+/g, " ").trim();
      if (na === nb) return 0;
      const wordsA = na.split(" ");
      const wordsB = nb.split(" ");
      const setA = new Set(wordsA);
      const setB = new Set(wordsB);
      const intersection = [...setA].filter((w) => setB.has(w)).length;
      const union = new Set([...setA, ...setB]).size;
      return union === 0 ? 0 : 1 - intersection / union;
    }

    try {
      const maxTokens = Math.max(500, Math.round(selectedText.split(/\s+/).length * 3));
      let cleaned = "";
      let attempts = 0;
      const maxAttempts = 2;

      while (attempts < maxAttempts) {
        attempts++;
        const temp = attempts === 1 ? 0.85 : 1.0;
        const result = await requestOpenRouterText(prompt, maxTokens, 180000, systemMsg, false, temp);
        if (!result || !result.trim()) continue;

        cleaned = result.trim();
        if (cleaned.startsWith('"') && cleaned.endsWith('"')) cleaned = cleaned.slice(1, -1);
        if (cleaned.startsWith("'") && cleaned.endsWith("'")) cleaned = cleaned.slice(1, -1);

        const diff = textDifference(selectedText, cleaned);
        if (diff > 0.08) break; // sufficiently different — use it
        // Too similar — retry with higher temperature
        cleaned = "";
      }

      if (!cleaned) {
        setRewriteBusy(false);
        setRewriteMode(null);
        return;
      }

      setRewritePreview({
        original: selectedText,
        revised: cleaned,
        blockIdx,
        selStart, selEnd,
        fullContent,
      });
      setRewriteSelection(null);
    } catch (err) {
      if (!isCancelledError(err)) console.error("Smart rewrite failed:", err);
    } finally {
      setRewriteBusy(false);
      setRewriteMode(null);
    }
  }

  function acceptRewrite() {
    if (!rewritePreview || !activeChapter) return;
    const { blockIdx, selStart, selEnd, fullContent, revised } = rewritePreview;
    const newText = fullContent.slice(0, selStart) + revised + fullContent.slice(selEnd);

    if (blockIdx >= 0) {
      // Block mode: push immediate undo snapshot, then update block prose
      pushUndoSnapshot(activeChapter.id, activeChapter.content, activeChapter.sceneBlocks, true);
      const blocks = getSceneBlocks(activeChapter);
      if (blockIdx < blocks.length) {
        const next = [...blocks];
        next[blockIdx] = { ...next[blockIdx], prose: newText };
        updateSceneBlocks(activeChapter.id, next);
        syncChapterContentFromBlocks(activeChapter.id, next);
      }
    } else {
      // Plain editor mode: update chapter content directly (immediate undo)
      updateChapter(activeChapter.id, { content: newText }, true);
    }
    setRewritePreview(null);
    saveNow();
  }

  function rejectRewrite() {
    setRewritePreview(null);
  }

  async function regenerateRewrite() {
    if (!rewritePreview) return;
    // Restore the selection context and re-run with the same mode
    setRewriteSelection({
      x: window.innerWidth / 2 - 120,
      y: window.innerHeight / 3,
      blockIdx: rewritePreview.blockIdx,
      selStart: rewritePreview.selStart,
      selEnd: rewritePreview.selEnd,
      selectedText: rewritePreview.original,
      fullContent: rewritePreview.fullContent,
    });
    setRewritePreview(null);
  }

  async function runChapterRewrite(modeId: string) {
    if (!novel || !activeChapter || !ensureStoryAiReady()) return;
    const chapterId = activeChapter.id;
    const blocks = getSceneBlocks(activeChapter);
    const hasBlocks = blocks.length > 0 && blocks.some(b => b.prose?.trim());
    const novelGenre = isNF ? (nfData?.subtype === "true-crime" ? "true crime" : nfData?.subtype === "historical" ? "historical non-fiction" : nfData?.subtype === "investigative" ? "investigative non-fiction" : nfData?.subtype === "biography" ? "biography" : "memoir") : (novel.storyBible.summary.genre?.join(", ") || "fiction");
    const mode = REWRITE_MODES.find((m) => m.id === modeId) ?? REWRITE_MODES[0];

    const sv = novel.storyBible.styleVoice;
    const styleContext = [
      sv?.comps?.length ? `Style: ${sv.comps.slice(0, 5).join(", ")}.` : "",
      sv?.voiceRules ? `Voice rules to follow: ${sv.voiceRules.slice(0, 600)}` : "",
      sv?.pov ? `POV: ${sv.pov}.` : "",
      sv?.tense ? `Tense: ${sv.tense}.` : "",
    ].filter(Boolean).join(" ");
    const systemMsg = [
      `You are a literary rewrite assistant for a ${novelGenre}${isNF ? " (non-fiction)" : " novel"}.`,
      `Rewrite the user's prose in a "${mode.label}" style: ${mode.desc}.`,
      styleContext ? `AUTHOR'S STYLE (follow closely): ${styleContext}` : "",
      isNF ? `Keep all real events, people, and facts accurate. Only change tone, word choice, and phrasing.` : `Keep the same plot events, characters, setting, and structure.`,
      `Only change tone, word choice, sentence rhythm, and phrasing.`,
      `Return ONLY the rewritten prose. No headings, labels, or commentary.`,
      `The rewritten text must be roughly the same length as the original.`,
      `NEVER truncate or summarize — rewrite the ENTIRE passage.`,
    ].filter(Boolean).join(" ");

    setChapterRewriteBusy(true);
    setChapterRewriteMenuOpen(false);
    freshAiAbort();

    try {
      if (hasBlocks) {
        // Rewrite each block individually so nothing gets lost
        pushUndoSnapshot(chapterId, activeChapter.content, activeChapter.sceneBlocks, true);
        const updatedBlocks = [...blocks];
        for (let i = 0; i < blocks.length; i++) {
          if (aiAbortRef.current?.signal.aborted) break;
          const blockProse = blocks[i].prose?.trim();
          if (!blockProse || blockProse.length < 20) continue;
          const wordCount = countWords(blockProse);
          const maxTokens = Math.max(1500, Math.round(wordCount * 2));
          const userMsg = `Rewrite this scene to be "${mode.label}" (${mode.desc}):\n\n${blockProse}`;
          const result = await requestOpenRouterText(userMsg, maxTokens, 180000, systemMsg);
          if (result && result.trim() && result.trim().length > blockProse.length * 0.4) {
            updatedBlocks[i] = { ...updatedBlocks[i], prose: result.trim() };
          }
        }
        updateSceneBlocks(chapterId, updatedBlocks);
        syncChapterContentFromBlocks(chapterId, updatedBlocks);
      } else {
        // Plain editor: rewrite in chunks to handle long chapters
        const content = activeChapter.content ?? "";
        const prose = extractProseFromContent(content).trim();
        if (!prose || prose.length < 20) { setChapterRewriteBusy(false); return; }

        const paragraphs = prose.split(/\n\n+/).filter(Boolean);
        const CHUNK_SIZE = 8;
        const rewrittenParts: string[] = [];

        for (let i = 0; i < paragraphs.length; i += CHUNK_SIZE) {
          if (aiAbortRef.current?.signal.aborted) break;
          const chunk = paragraphs.slice(i, i + CHUNK_SIZE).join("\n\n");
          const wordCount = countWords(chunk);
          const maxTokens = Math.max(1500, Math.round(wordCount * 2));
          const userMsg = `Rewrite this passage to be "${mode.label}" (${mode.desc}):\n\n${chunk}`;
          const result = await requestOpenRouterText(userMsg, maxTokens, 180000, systemMsg);
          if (result && result.trim() && result.trim().length > chunk.length * 0.3) {
            rewrittenParts.push(result.trim());
          } else {
            rewrittenParts.push(chunk);
          }
        }

        const finalText = rewrittenParts.join("\n\n");
        if (finalText.trim()) {
          updateChapter(chapterId, { content: finalText.trim() }, true);
        }
      }
    } catch (err) {
      if (isCancelledError(err)) { setChapterRewriteBusy(false); return; }
      console.error("Chapter rewrite failed:", err);
    } finally {
      setChapterRewriteBusy(false);
    }
    saveNow();
  }

  function evaluateProseResult(
    prose: string,
    args: { targetWords: number; minAcceptable: number; useBestFit: boolean; previousProse: string },
  ) {
    let text = prose.trim();
    // Strip metadata lines at start of lines (not mid-sentence) instead of rejecting
    const metaLinePattern = /^(word count\s*:.*|scene\s*\d+\s*:.*|chapter\s*\d+\s*:.*|---+\s*|[\*]{3,}\s*|\[.*?\]\s*)$/gim;
    text = text.replace(metaLinePattern, "").replace(/\n{3,}/g, "\n\n").trim();
    const wc = countWords(text);
    const paragraphCount = text ? text.split(/\n{2,}/).filter(Boolean).length : 0;
    const prevTail = args.previousProse.trim().slice(-220);
    const appearsDuplicatedTail = Boolean(prevTail) && text.startsWith(prevTail);
    const minByMode = args.useBestFit ? Math.max(220, Math.round(args.targetWords * 0.62)) : args.minAcceptable;
    const maxByMode = args.useBestFit ? Math.round(args.targetWords * 1.3) : Math.round(args.targetWords * 1.12);
    const ok =
      wc >= minByMode &&
      wc <= maxByMode &&
      paragraphCount >= 1 &&
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

  /** Create a fresh AbortController for AI work; cancels any previous one. */
  function freshAiAbort() {
    aiAbortRef.current?.abort();
    aiAbortRef.current = new AbortController();
  }
  /** Cancel any in-flight AI request and clean up busy state. */
  function cancelAiWork() {
    aiAbortRef.current?.abort();
    aiAbortRef.current = null;
    setStoryAiBusyAction(null);
    setEditorLoadingPhase(null);
    setFeedbackReviewApplying(false);
    setFbPreviewGenerating(false);
    setCharChatLoading(false);
    setChapterRewriteBusy(false);
    setNccBusy(false);
    setEditorApplying(false);
    setEditorApplyProgress("");
    setRewriteBusy(false);
    setProseCtxBusy(false);
    setHealthScoreBusy(false);
  }
  /** Returns true if the error is a user-initiated cancellation (silent). */
  function isCancelledError(err: unknown): boolean {
    return err instanceof Error && err.message === "__CANCELLED__";
  }

  /* ─── Scene Block helpers (new architecture) ─── */
  const DEFAULT_SCENE_BLOCK: SceneBlock = {
    synopsis: "",
    wordTarget: 600,
    focus: "default",
    notes: "",
    prose: "",
  };

  const WORD_TARGET_OPTIONS: Array<{ value: number; label: string; title: string }> = [
    { value: 0, label: "Best Fit", title: "AI decides the ideal length for this scene" },
    { value: 400, label: "400", title: "Target ~400 words (short scene)" },
    { value: 600, label: "600", title: "Target ~600 words (standard scene)" },
    { value: 800, label: "800", title: "Target ~800 words (longer scene)" },
    { value: 1000, label: "1000", title: "Target ~1000 words (extended scene)" },
    { value: 1500, label: "1500", title: "Target ~1500 words (major scene)" },
  ];

  const FOCUS_PRESETS: Array<{ id: string; label: string; hint: string }> = [
    { id: "default", label: "Default", hint: "Balanced narration, dialogue, and action. Match the novel's established voice and genre conventions. Natural pacing." },
    { id: "dialogue", label: "Dialogue-Heavy", hint: "Higher dialogue ratio, faster exchanges, snappy back-and-forth, reduced exposition" },
    { id: "action", label: "Action & Pace", hint: "Shorter sentences, clear physical movement, high momentum, visceral detail" },
    { id: "introspection", label: "Introspection", hint: "Interior monologue, emotional processing, thematic depth, character reflection" },
    { id: "atmosphere", label: "Atmosphere", hint: "Rich sensory detail, mood-forward writing, setting as character" },
    { id: "tension", label: "Tension & Suspense", hint: "Building dread, withholding information, shorter paragraphs, cliffhanger pacing" },
    { id: "emotional", label: "Emotional Beat", hint: "Heightened emotion, vulnerability, character relationships, meaningful pauses" },
    { id: "exposition", label: "World-Building", hint: "Weave in lore, rules, backstory naturally through action and dialogue, no info-dumps" },
    { id: "opening", label: "Chapter Opening", hint: "Strong hook, establish scene and stakes quickly, ground the reader in time/place" },
    { id: "climax", label: "Climax", hint: "Peak intensity, payoff of setups, decisive character action, turning point" },
    { id: "resolution", label: "Resolution", hint: "Aftermath, reflection, new equilibrium, plant seeds for what comes next" },
  ];

  function getSceneBlocks(chapter: typeof activeChapter): SceneBlock[] {
    return chapter?.sceneBlocks ?? [];
  }

  /** Update scene blocks (planning layer only — does NOT touch chapter.content) */
  function updateSceneBlocks(chapterId: string, blocks: SceneBlock[], immediateUndo?: boolean) {
    updateChapter(chapterId, { sceneBlocks: blocks }, immediateUndo);
  }

  function insertSceneBlockAt(blocks: SceneBlock[], atIndex: number) {
    if (!activeChapter) return;
    const lastBlock = blocks.length > 0 ? blocks[blocks.length - 1] : DEFAULT_SCENE_BLOCK;
    const newBlock: SceneBlock = {
      ...DEFAULT_SCENE_BLOCK,
      wordTarget: lastBlock.wordTarget,
      focus: lastBlock.focus,
    };
    const next = [...blocks.slice(0, atIndex + 1), newBlock, ...blocks.slice(atIndex + 1)];
    updateSceneBlocks(activeChapter.id, next);
  }

  function deleteSceneBlockAt(blocks: SceneBlock[], atIndex: number) {
    if (!activeChapter) return;
    const next = blocks.filter((_, i) => i !== atIndex);
    updateSceneBlocks(activeChapter.id, next);
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

  /* applyBlockFormatting removed — formatting now applies to chapter body textarea via applyRawFormatting */

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

    // Build a rich character roster for synopses — names, roles, pronouns, key traits
    const allChars = novel.storyBible.characters ?? [];
    const planCharIds = planChapter?.characterIds ?? [];
    const planLinked = planCharIds.length > 0
      ? allChars.filter((c) => planCharIds.includes(c.id))
      : [];
    const synopsisSearch = `${chapterSynopsis} ${activeChapter.title}`.toLowerCase();
    const textMatched = allChars.filter((c) => {
      if (c.role === "Protagonist" || c.role === "Antagonist") return true;
      const name = (c.name || "").toLowerCase();
      return name.length > 1 && synopsisSearch.includes(name);
    });
    const rosterChars = planLinked.length > 0
      ? [...new Map([...planLinked, ...textMatched].map((c) => [c.id, c])).values()]
      : textMatched.length > 0 ? textMatched : allChars.slice(0, 6);
    const characterRoster = rosterChars.slice(0, 8).map((c) => {
      const parts = [`${c.name} (${c.role || "Supporting"})`];
      if (c.pronouns) parts.push(`pronouns: ${c.pronouns}`);
      if (c.logline) parts.push(clampPromptText(c.logline, 60));
      if (c.personality) parts.push(`personality: ${clampPromptText(c.personality, 50)}`);
      if (c.otherNames?.trim()) parts.push(`also known as: ${clampPromptText(c.otherNames, 40)}`);
      if (c.goals) parts.push(`goal: ${clampPromptText(c.goals, 40)}`);
      return parts.join(" — ");
    }).join("\n  ");

    setStoryAiBusyAction(`chapter-blocks-${targetChapterId}`);
    setStoryAiError(null);

    try {
      /* ══════════════════════════════════════════════════════════════
       * SINGLE BATCH CALL — generate all bloc synopses at once.
       * ══════════════════════════════════════════════════════════════ */

      type BatchBlocResult = { blocs?: Array<{ synopsis?: string; focus?: string; wordTarget?: number }> };

      const focusIds = FOCUS_PRESETS.map((p) => p.id).join(", ");

      const batchPrompt = [
        `Split this chapter into EXACTLY ${BLOC_COUNT} scene blocs. Each bloc is a continuous scene that will be turned into prose.`,
        ``,
        `CRITICAL: You MUST return EXACTLY ${BLOC_COUNT} blocs — not 1, not 2, not 3 — EXACTLY ${BLOC_COUNT}.`,
        ``,
        `Return ONLY this JSON structure:`,
        `{ "blocs": [{ "synopsis": "...", "focus": "...", "wordTarget": 600 }, ...] }`,
        ``,
        `For each bloc:`,
        `- "synopsis": 1-3 concrete sentences describing the scene beat`,
        `- "focus": the best writing focus for this scene, one of: ${focusIds}`,
        `- "wordTarget": recommended word count (0 for best-fit, or 400/600/800/1000/1500) — choose based on scene complexity and pacing`,
        "",
        "═══ CHARACTER ROSTER — USE THESE EXACT NAMES ═══",
        `The following characters exist in this story. You MUST use their EXACT names (not generic labels like "the protagonist" or "the hero"). Every synopsis must reference characters by their proper name.`,
        "",
        `  ${characterRoster}`,
        "",
        "RULES:",
        `- Return EXACTLY ${BLOC_COUNT} blocs in the array. This is mandatory.`,
        "- Each synopsis must be 1-3 concrete sentences (at least 15 words) describing what HAPPENS — actions, dialogue beats, emotional shifts.",
        "- ALWAYS use the character's PROPER NAME (e.g. 'Elena', 'Marcus') — NEVER use generic labels like 'the protagonist', 'the hero', 'the main character', 'Character A'.",
        "- If multiple characters interact, name each one explicitly.",
        "- All blocs share ONE primary location unless a transition is essential for the plot.",
        "- Bloc 1 opens the chapter. The final bloc resolves or closes the chapter.",
        "- Each bloc flows naturally into the next — no jumps.",
        "- Be specific: name characters, describe actions, state emotional shifts and consequences.",
        "- Do NOT write generic synopses like 'continuation of the scene' or 'the story continues'. Each must describe a distinct beat.",
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
        "",
        `REMINDER: Return EXACTLY ${BLOC_COUNT} blocs. Use character NAMES, not generic labels.`,
      ].filter(Boolean).join("\n");

      let batchBlocs: Array<{ synopsis?: string; focus?: string; wordTarget?: number }> = [];

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
          let parsed = parseJsonFromAi<BatchBlocResult | Array<{ synopsis?: string; focus?: string; wordTarget?: number }>>(raw);
          if (!parsed) {
            const repaired = attemptCloseTruncatedJson(raw.trim());
            if (repaired) try { parsed = JSON.parse(repaired) as BatchBlocResult; } catch { /* ignore */ }
          }
          if (Array.isArray(parsed)) {
            batchBlocs = parsed;
          } else if (parsed && typeof parsed === "object") {
            const obj = parsed as Record<string, unknown>;
            if (Array.isArray(obj.blocs)) {
              batchBlocs = obj.blocs as Array<{ synopsis?: string; focus?: string; wordTarget?: number }>;
            } else if (Array.isArray(obj.blocks)) {
              batchBlocs = obj.blocks as Array<{ synopsis?: string; focus?: string; wordTarget?: number }>;
            } else if (Array.isArray(obj.scenes)) {
              batchBlocs = obj.scenes as Array<{ synopsis?: string; focus?: string; wordTarget?: number }>;
            } else {
              // Try any array value
              for (const key of Object.keys(obj)) {
                if (Array.isArray(obj[key])) { batchBlocs = obj[key] as Array<{ synopsis?: string; focus?: string; wordTarget?: number }>; break; }
              }
            }
          }
          // Validate entries — must be a real synopsis, not a stub
          batchBlocs = batchBlocs.filter((b) => {
            const syn = typeof b?.synopsis === "string" ? b.synopsis.trim() : "";
            if (syn.length < 15) return false;
            // Reject generic stubs
            const lower = syn.toLowerCase();
            if (/^(continuation|the (story|scene|chapter) continues)/.test(lower)) return false;
            return true;
          });
          if (batchBlocs.length >= BLOC_COUNT) break;
        } catch {
          // retry
        }
      }

      // ── Build blocks from batch results ──
      const validFocusIds = FOCUS_PRESETS.map((p) => p.id);
      const validWordTargets = WORD_TARGET_OPTIONS.map((o) => o.value);
      const blocks: SceneBlock[] = [];
      for (let i = 0; i < Math.min(BLOC_COUNT, batchBlocs.length); i++) {
        const b = batchBlocs[i];
        const synopsis = (typeof b?.synopsis === "string" ? b.synopsis!.trim() : "");
        if (synopsis.length >= 15) {
          const suggestedFocus = typeof b.focus === "string" && validFocusIds.includes(b.focus) ? b.focus : "default";
          const suggestedTarget = typeof b.wordTarget === "number" && validWordTargets.includes(b.wordTarget) ? b.wordTarget : 0;
          blocks.push({ ...DEFAULT_SCENE_BLOCK, synopsis, notes: chapterLevelBolton, focus: suggestedFocus, wordTarget: suggestedTarget });
        }
      }

      // ── Full-batch retry if we got fewer than 3 blocs ──
      if (blocks.length < 3) {
        try {
          const retryPrompt = [
            `IMPORTANT: Your previous response did not return ${BLOC_COUNT} blocs. Try again.`,
            batchPrompt,
          ].join("\n\n");
          const retryRaw = await requestOpenRouterText(retryPrompt, 800, 240000, systemMsg, false, 0.3);
          let retryParsed = parseJsonFromAi<BatchBlocResult | Array<{ synopsis?: string; focus?: string; wordTarget?: number }>>(retryRaw);
          if (!retryParsed) {
            const repaired = attemptCloseTruncatedJson(retryRaw.trim());
            if (repaired) try { retryParsed = JSON.parse(repaired) as BatchBlocResult; } catch { /* ignore */ }
          }
          let retryBlocs: Array<{ synopsis?: string; focus?: string; wordTarget?: number }> = [];
          if (Array.isArray(retryParsed)) {
            retryBlocs = retryParsed;
          } else if (retryParsed && typeof retryParsed === "object") {
            const obj = retryParsed as Record<string, unknown>;
            for (const key of ["blocs", "blocks", "scenes"]) {
              if (Array.isArray(obj[key])) { retryBlocs = obj[key] as Array<{ synopsis?: string; focus?: string; wordTarget?: number }>; break; }
            }
            if (!retryBlocs.length) {
              for (const key of Object.keys(obj)) {
                if (Array.isArray(obj[key])) { retryBlocs = obj[key] as Array<{ synopsis?: string; focus?: string; wordTarget?: number }>; break; }
              }
            }
          }
          retryBlocs = retryBlocs.filter((b) => {
            const syn = typeof b?.synopsis === "string" ? b.synopsis.trim() : "";
            return syn.length >= 15 && !/^(continuation|the (story|scene|chapter) continues)/i.test(syn);
          });
          if (retryBlocs.length > blocks.length) {
            blocks.length = 0;
            for (let i = 0; i < Math.min(BLOC_COUNT, retryBlocs.length); i++) {
              const rb = retryBlocs[i];
              const synopsis = rb?.synopsis?.trim() ?? "";
              if (synopsis.length >= 15) {
                const sf = typeof rb.focus === "string" && validFocusIds.includes(rb.focus) ? rb.focus : "default";
                const st = typeof rb.wordTarget === "number" && validWordTargets.includes(rb.wordTarget) ? rb.wordTarget : 0;
                blocks.push({ ...DEFAULT_SCENE_BLOCK, synopsis, notes: chapterLevelBolton, focus: sf, wordTarget: st });
              }
            }
          }
        } catch { /* fall through to individual repairs */ }
      }

      // ── Individual repair: fill any remaining missing blocs ──
      if (blocks.length < BLOC_COUNT && blocks.length > 0) {
        for (let i = blocks.length; i < BLOC_COUNT; i++) {
          const isLast = i === BLOC_COUNT - 1;
          const previousSynopses = blocks.map((b, idx) => `Bloc ${idx + 1}: ${b.synopsis}`).join("\n");
          const repairPrompt = [
            `Write a 1-3 sentence synopsis for scene bloc ${i + 1} of ${BLOC_COUNT} in this chapter.`,
            `The synopsis must describe specific actions and show what HAPPENS.`,
            `Use the EXACT character names from the roster below — NEVER use generic labels like "the protagonist".`,
            `Return JSON: { "synopsis": "your synopsis" }`,
            "",
            `CHARACTER ROSTER:\n  ${characterRoster}`,
            "",
            `Chapter: ${activeChapter.title}`,
            `Chapter synopsis: ${chapterSynopsis}`,
            previousSynopses ? `Previous blocs already written:\n${previousSynopses}` : "",
            previousChapterSynopsis ? `Previous chapter: ${clampPromptText(previousChapterSynopsis, 150)}` : "",
            isLast ? "This is the FINAL bloc — wrap up and close the chapter." : `This bloc must advance the story beyond where Bloc ${i} left off.`,
            context,
          ].filter(Boolean).join("\n");
          try {
            const data = await requestOpenRouterJson<{ synopsis?: string }>(
              repairPrompt,
              300,
              { timeoutMs: 120000, systemMessage: "Return ONLY valid JSON." },
            );
            const syn = (typeof data.synopsis === "string" ? data.synopsis : "").trim();
            if (syn.length >= 15) {
              blocks.push({ ...DEFAULT_SCENE_BLOCK, synopsis: syn, notes: chapterLevelBolton });
            }
          } catch { /* skip */ }
        }
      }

      if (blocks.length === 0) {
        throw new Error("AI returned invalid data — no usable blocs were found. Try again or switch to a different model.");
      }

      // Update the chapter sceneBlocks (planning layer) — does NOT touch content
      updateChapter(targetChapterId, { sceneBlocks: blocks });

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
      if (isCancelledError(error)) { setStoryAiBusyAction(null); return; }
      let msg = "Block generation failed.";
      if (error instanceof Error) {
        const m = error.message.toLowerCase();
        if (m.includes("timeout") || m.includes("timed out") || m.includes("aborted")) {
          msg = "Bloc generation timed out. Your model may be slow — try a faster one or a shorter chapter synopsis.";
        } else if (m.includes("json") || m.includes("parse") || m.includes("invalid")) {
          msg = error.message;
        } else {
          msg = error.message;
        }
      }
      setStoryAiError(msg);
    } finally {
      setStoryAiBusyAction(null);
    }
  }

  /* ─── Per-bloc prose generation ─── */

  function syncChapterContentFromBlocks(chapterId: string, blocks: SceneBlock[]) {
    const combined = blocks.map((b) => b.prose?.trim() || "").filter(Boolean).join("\n\n");
    updateChapter(chapterId, { content: combined });
  }

  function syncBlocksFromChapterContent(chapterId: string, blocks: SceneBlock[]) {
    const ch = novel?.chapters.find((c) => c.id === chapterId);
    if (!ch) return;
    const content = (ch.content ?? "").trim();
    if (!content) return;

    const blocksWithProse = blocks.filter((b) => (b.prose?.trim() || "").length > 0);
    if (blocksWithProse.length === 0) {
      const updated = [...blocks];
      if (updated.length > 0) {
        updated[0] = { ...updated[0], prose: content };
        updateSceneBlocks(chapterId, updated);
      }
      return;
    }

    // Try to match each block's original prose in the edited content
    const updated = [...blocks];
    let remaining = content;
    for (let i = 0; i < updated.length; i++) {
      const origProse = updated[i].prose?.trim() || "";
      if (!origProse) continue;

      const idx = remaining.indexOf(origProse);
      if (idx !== -1) {
        // Content before this block's prose belongs to the previous block that had prose
        updated[i] = { ...updated[i], prose: origProse };
        remaining = remaining.slice(idx + origProse.length).replace(/^\n+/, "");
      } else {
        // Original prose was edited — split remaining content proportionally
        const remainingBlocks = updated.slice(i).filter((b) => (b.prose?.trim() || "").length > 0).length;
        if (remainingBlocks <= 1) {
          updated[i] = { ...updated[i], prose: remaining.trim() };
          remaining = "";
        } else {
          const paragraphs = remaining.split(/\n\n+/);
          const perBlock = Math.max(1, Math.ceil(paragraphs.length / remainingBlocks));
          updated[i] = { ...updated[i], prose: paragraphs.slice(0, perBlock).join("\n\n").trim() };
          remaining = paragraphs.slice(perBlock).join("\n\n").trim();
        }
      }
    }
    // Any leftover content goes to the last block
    if (remaining.trim()) {
      const lastIdx = updated.length - 1;
      const existing = updated[lastIdx].prose?.trim() || "";
      updated[lastIdx] = { ...updated[lastIdx], prose: existing ? `${existing}\n\n${remaining.trim()}` : remaining.trim() };
    }
    updateSceneBlocks(chapterId, updated);
  }

  async function runGenerateBlockProse(blockIndex: number) {
    if (!novel || !activeChapter || !ensureStoryAiReady()) return;
    const targetChapterId = activeChapter.id;
    const blocks = getSceneBlocks(activeChapter);
    if (blockIndex < 0 || blockIndex >= blocks.length) return;
    const block = blocks[blockIndex];
    if (!block.synopsis?.trim()) {
      setStoryAiError("Add a synopsis to this scene block first.");
      return;
    }

    const planChapter = planChapters.find((p) => p.manuscriptChapterId === targetChapterId);
    const planCharIds = planChapter?.characterIds ?? [];
    const planLocIds = planChapter?.locationIds ?? [];
    const { previousChapterSynopsis, nextChapterSynopsis } = getAdjacentChapterSynopses(targetChapterId);
    const storyPosition = getChapterStoryPosition(targetChapterId);

    const precedingBlocs = blocks.slice(0, blockIndex);
    const followingProse = blocks.slice(blockIndex + 1).map((b) => b.prose?.trim() || "").filter(Boolean).join("\n\n");

    const immediatePrevBloc = blockIndex > 0 ? blocks[blockIndex - 1] : null;
    const immediatePrevProse = immediatePrevBloc?.prose?.trim() || "";
    const earlierBlocs = blockIndex > 1 ? blocks.slice(0, blockIndex - 1) : [];

    const earlierBlocContext = earlierBlocs.length > 0
      ? earlierBlocs.map((b, i) => {
          const synopsis = b.synopsis?.trim() || "(no synopsis)";
          const prose = b.prose?.trim() || "";
          const ending = prose.slice(-400);
          return `Scene ${i + 1}: ${synopsis}${ending ? `\n  Ending: "${ending}"` : ""}`;
        }).join("\n\n")
      : "";

    const prevChapterEnding = (() => {
      if (blockIndex === 0) {
        const chIndex = novel.chapters.findIndex((c) => c.id === targetChapterId);
        const prev = chIndex > 0 ? novel.chapters[chIndex - 1] : null;
        return prev?.content?.trim().slice(-800) || "";
      }
      return "";
    })();

    setStoryAiBusyAction(`block-prose-${blockIndex}`);
    setStoryAiError(null);
    try {
      const fullContext = buildChapterBlocksContext(activeChapter.title, planChapter?.synopsis || activeChapter.subtitle || "", planCharIds, planLocIds);
      const summary = novel.storyBible.summary;
      const sv = novel.storyBible.styleVoice;
      const styleSection = [
        summary.genre?.length ? `Genre: ${summary.genre.slice(0, 10).join(", ")}` : "",
        summary.tone?.length ? `Tone: ${summary.tone.slice(0, 10).join(", ")}` : "",
        sv?.pov ? `POV: ${sv.pov}` : "",
        sv?.tense ? `Tense: ${sv.tense}` : "",
        sv?.comps?.length ? `Style: ${sv.comps.slice(0, 5).join(", ")}` : "",
        sv?.voiceRules ? `Voice & style rules (FOLLOW THESE CLOSELY): ${(sv.voiceRules ?? "").slice(0, 1200)}` : "",
      ].filter(Boolean).join("\n");

      const blockBoltonId = block.notes || chapterBoltonId;
      const activeBolton = blockBoltonId ? (novel.storyBible.boltons ?? []).find((b) => b.id === blockBoltonId) : null;
      const boltonDirective = activeBolton ? getBoltonDirectiveText(activeBolton) : "";

      const focusPreset = FOCUS_PRESETS.find((p) => p.id === block.focus);
      const focusHint = focusPreset ? `\nFOCUS MODE: ${focusPreset.hint}` : "";

      const povNote = sv?.pov ? ` You MUST use ${sv.pov} POV.` : "";
      const nfProseCtx = isNF ? (() => {
        const nf = novel.storyBible.nonfiction;
        const parts: string[] = [];
        if (nf?.subjectName) parts.push(`Subject: ${nf.subjectName}`);
        if (nf?.era) parts.push(`Era: ${nf.era}`);
        if (nf?.centralTheme) parts.push(`Central theme: ${nf.centralTheme}`);
        const relevantEvents = (nf?.lifeEvents ?? []).filter(e =>
          block.synopsis?.toLowerCase().includes(e.title.toLowerCase()) ||
          e.people.some(p => block.synopsis?.toLowerCase().includes(p.toLowerCase()))
        );
        if (relevantEvents.length) {
          parts.push("Relevant life events:");
          relevantEvents.forEach(e => parts.push(`  - ${e.title}: ${e.description?.slice(0, 200) || ""}`));
        }
        return parts.join("\n");
      })() : "";
      const spellingRule = profileLangCode === "en-GB" ? "Use BRITISH English spelling and grammar throughout (e.g. colour, realise, honour, favourite, centre, programme, travelling, defence). NEVER use American spellings."
        : profileLangCode === "en-AU" ? "Use AUSTRALIAN English spelling and grammar throughout (e.g. colour, realise, honour, centre). NEVER use American spellings."
        : profileLangCode === "en-CA" ? "Use CANADIAN English spelling and grammar throughout (e.g. colour, favourite, centre, but -ize endings like realize). NEVER use British -ise endings."
        : "Use AMERICAN English spelling and grammar throughout (e.g. color, realize, honor, favorite, center, program, traveling, defense). NEVER use British spellings.";

      const humanWritingRules = [
        "WRITE LIKE A HUMAN AUTHOR, NOT AN AI. This is the most important rule.",
        "NEVER use em dashes (—). Use commas, full stops, or semicolons instead.",
        "NEVER use these AI clichés: 'a chill ran down', 'little did they know', 'the weight of', 'a sense of', 'couldn't help but', 'a mixture of', 'the silence was deafening', 'time seemed to', 'knot in their stomach', 'pierced the silence'.",
        "Vary sentence length naturally — mix short punchy sentences with longer flowing ones. Do NOT make every sentence the same length.",
        "Use concrete sensory details, not abstract emotional labels. Show emotions through action and body language, not by naming them.",
        "Dialogue should sound like real people talking — contractions, interruptions, half-finished thoughts. Not every line needs a dialogue tag.",
        spellingRule,
      ].join("\n");

      const systemMsg = isNF ? [
        `You are a professional ${nfData?.subtype === "true-crime" ? "true crime" : nfData?.subtype === "historical" ? "historical non-fiction" : nfData?.subtype === "investigative" ? "investigative" : "memoir/biography"} author writing in ${profileLangLabel}.`,
        "You write like a published human author. Your prose is natural, varied, and compelling.",
        povNote,
        nfData?.subtype === "true-crime" ? "Write with tension, procedural detail, and psychological insight." :
        nfData?.subtype === "historical" ? "Write with authority, narrative drive, and period authenticity." :
        nfData?.subtype === "investigative" ? "Write with precision and revelatory pacing." :
        "Write with emotional honesty and literary quality.",
        "Use real names and places from Canon. Return ONLY prose — no headers, labels, JSON, or metadata.",
      ].join(" ") : [
        `You are a professional novelist writing in ${profileLangLabel}. You write like a published human author — natural, skilled, varied prose.`,
        "Your PRIMARY job: match the author's established style, voice, and genre conventions from the Style section.",
        povNote,
        "Use ONLY characters and locations from Canon. Return ONLY prose — no headers, labels, JSON, metadata, or thinking.",
      ].join(" ");

      const isBestFit = block.wordTarget === 0;
      const effectiveTarget = isBestFit ? 600 : block.wordTarget;

      const sceneContext = blocks.map((b, i) => {
        const fp = FOCUS_PRESETS.find((p) => p.id === b.focus);
        const fh = fp && b.focus !== "default" ? ` [Focus: ${fp.hint}]` : "";
        const wt = b.wordTarget === 0 ? "best fit" : `~${b.wordTarget} words`;
        return `Scene ${i + 1} (${wt}${fh}):\n${b.synopsis || "(no synopsis)"}`;
      }).join("\n\n");

      const prompt = [
        "STYLE AND TONE — THIS IS YOUR TOP PRIORITY:",
        styleSection || "Use professional, consistent prose.",
        humanWritingRules,
        boltonDirective ? `\nBOLT-ON DIRECTIVE: ${boltonDirective}` : "",
        focusHint,
        "",
        isBestFit
          ? `Write prose for SCENE ${blockIndex + 1} ONLY. Let the synopsis complexity guide the length. Write a natural, well-paced scene.`
          : `Write prose for SCENE ${blockIndex + 1} ONLY. TARGET: ~${block.wordTarget} words.`,
        "",
        `Chapter: ${activeChapter.title}`,
        storyPosition.chapterNumber > 0 ? `Story position: Chapter ${storyPosition.chapterNumber} of ${storyPosition.totalChapters}.` : "",
        storyPosition.arcGuidance,
        "",
        "ALL SCENE BLOCKS (for context — write ONLY the indicated scene):",
        sceneContext,
        "",
        earlierBlocContext ? `EARLIER SCENES IN THIS CHAPTER (for narrative awareness):\n${earlierBlocContext}` : "",
        "",
        immediatePrevProse
          ? `THE SCENE IMMEDIATELY BEFORE YOURS — FULL PROSE (this is what the reader just read — your scene MUST continue seamlessly from the END of this text. Track where characters ARE and what just happened):\n"""\n${immediatePrevProse.slice(0, 5000)}\n"""`
          : prevChapterEnding
            ? `PROSE FROM END OF PREVIOUS CHAPTER (your scene continues from here):\n"""${prevChapterEnding}"""`
            : "",
        immediatePrevBloc?.synopsis ? `\nPrevious scene synopsis: ${immediatePrevBloc.synopsis}` : "",
        followingProse ? `\nPROSE AFTER THIS SCENE (your scene must flow naturally INTO this — do not contradict or repeat it):\n"""${followingProse.slice(0, 400)}"""` : "",
        previousChapterSynopsis && blockIndex === 0 ? `\nPrevious chapter synopsis: ${clampPromptText(previousChapterSynopsis, 220)}` : "",
        nextChapterSynopsis && blockIndex === blocks.length - 1 ? `\nNext chapter (for foreshadowing — do NOT write it):\n${nextChapterSynopsis}` : "",
        "",
        nfProseCtx ? `\nMemoir Context:\n${nfProseCtx}` : "",
        "Canon (style, voice, characters, locations):",
        fullContext.slice(0, 3000),
        "",
        "RULES:",
        `- Write ONLY Scene ${blockIndex + 1}. Do not write other scenes.`,
        "- CONTINUITY IS CRITICAL: Read the previous scenes above. If a character LEFT a location, they are NOT there any more. If a character is at school, they cannot also be at home. Track where every character IS at the end of the previous scene and continue from THAT state.",
        "- Do NOT repeat actions, dialogue, or situations from previous scenes. Each scene must move the story FORWARD.",
        "- Your prose MUST read as a seamless continuation of the text before it. No jarring transitions. A reader removing all bloc markers should read one smooth chapter.",
        "- If there is prose after your scene, your ending must flow naturally into it.",
        isNF ? "- Non-fiction: write with authenticity, sensory memory, and emotional truth." : "- Maintain character and canon consistency throughout.",
        "- Write like a skilled human author. Varied sentence rhythm. No AI patterns.",
        "- Output the scene prose ONLY. No commentary, no labels, no metadata.",
      ].filter(Boolean).join("\n");

      const maxTokens = Math.min(4000, Math.round((isBestFit ? 1000 : block.wordTarget) * 2.0));
      let prose = await requestOpenRouterText(prompt, maxTokens, 180000, systemMsg, false);
      prose = cleanProseOutput(prose);

      if (!prose) {
        throw new Error("No prose returned. Try again or switch to a different model.");
      }

      const updatedBlocks = [...blocks];
      updatedBlocks[blockIndex] = { ...block, prose };
      updateSceneBlocks(targetChapterId, updatedBlocks, true);
      syncChapterContentFromBlocks(targetChapterId, updatedBlocks);
      requestAnimationFrame(() => {
        const el = blockProseRefs.current[blockIndex];
        if (el) autoSizeEditorInput(el);
      });
    } catch (error) {
      if (isCancelledError(error)) { setStoryAiBusyAction(null); return; }
      let msg = "Prose generation failed for this scene.";
      if (error instanceof Error) {
        const m = error.message.toLowerCase();
        if (m.includes("timeout") || m.includes("timed out") || m.includes("aborted")) {
          msg = "Prose generation timed out. Try a faster model.";
        } else {
          msg = error.message;
        }
      }
      setStoryAiError(msg);
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
    // Ensure we have a live abort controller (create if null/cancelled)
    if (!aiAbortRef.current || aiAbortRef.current.signal.aborted) {
      aiAbortRef.current = new AbortController();
    }
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
      // Check global abort before starting
      if (aiAbortRef.current?.signal.aborted) {
        return { ok: false, status: 0, text: "", apiError: "cancelled" };
      }
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), attemptTimeoutMs);
      const onGlobalAbort = () => controller.abort();
      aiAbortRef.current?.signal.addEventListener("abort", onGlobalAbort);

      // LM Studio runs locally — call directly from the browser instead of the server proxy
      if (assistantProvider === "lmstudio") {
        const rawBase = (assistantBaseUrl.trim() || "http://127.0.0.1:1234/v1").replace(/\/+$/, "");
        const localBaseUrl = rawBase;
        const messages: Array<{ role: string; content: string }> = [];
        if (systemMessage) messages.push({ role: "system", content: systemMessage });
        messages.push({ role: "user", content: prompt });
        const localBody: Record<string, unknown> = {
          model: openRouterModel || "local-model",
          max_tokens: maxTokens,
          messages,
          stream: false,
        };
        if (temperature != null) localBody.temperature = temperature;
        if (jsonMode) localBody.response_format = { type: "json_object" };
        const localHeaders: Record<string, string> = { "Content-Type": "application/json" };
        try {
          const localRes = await fetch(`${localBaseUrl}/chat/completions`, {
            method: "POST",
            headers: localHeaders,
            body: JSON.stringify(localBody),
            signal: controller.signal,
          });
          const localPayload = (await localRes.json().catch(() => ({}))) as Record<string, unknown>;
          const choices = localPayload.choices as Array<{ message?: { content?: string } }> | undefined;
          const text = choices?.[0]?.message?.content ?? "";
          if (!localRes.ok) {
            const errMsg = typeof localPayload.error === "string" ? localPayload.error
              : localPayload.error && typeof (localPayload.error as Record<string, unknown>).message === "string" ? ((localPayload.error as Record<string, unknown>).message as string)
              : `LM Studio error ${localRes.status}`;
            return { ok: false, status: localRes.status, text: "", apiError: errMsg };
          }
          return { ok: true, status: 200, text: text.trim() };
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            if (aiAbortRef.current?.signal.aborted) return { ok: false, status: 0, text: "", apiError: "cancelled" };
            return { ok: false, status: 0, text: "", apiError: "timeout" };
          }
          return { ok: false, status: 0, text: "", apiError: "Could not reach LM Studio. Make sure it is running on your computer with the server enabled." };
        } finally {
          window.clearTimeout(timeoutId);
          aiAbortRef.current?.signal.removeEventListener("abort", onGlobalAbort);
        }
      }

      // Standard path: proxy through server for cloud providers
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
          if (aiAbortRef.current?.signal.aborted) {
            return { ok: false, status: 0, text: "", apiError: "cancelled" };
          }
          return { ok: false, status: 0, text: "", apiError: "timeout" };
        }
        throw error;
      } finally {
        window.clearTimeout(timeoutId);
        aiAbortRef.current?.signal.removeEventListener("abort", onGlobalAbort);
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
    // If cancelled by user, throw immediately
    if (first.apiError === "cancelled") throw new Error("__CANCELLED__");

    // If we got a non-empty successful response, return it
    if (first.ok && first.text) return first.text;

    // Determine if retry is worthwhile
    const elapsed = Date.now() - startMs;
    const remaining = totalBudgetMs - elapsed;
    const isAuthError = first.apiError?.includes("API key") || first.status === 401 || first.status === 402;
    const isTransient = first.text === "" || first.status === 500 || first.status === 502 || first.status === 503;

    if (!isAuthError && isTransient && remaining > 12000) {
      if (aiAbortRef.current?.signal.aborted) throw new Error("__CANCELLED__");
      // Quality-first: allow up to two retries when models are slow/unreliable.
      await new Promise((r) => window.setTimeout(r, 600));
      const secondBudget = Math.max(6000, Math.min(secondPlannedBudget, remaining - 600));
      const second = await singleAttempt(secondBudget);
      if (second.apiError === "cancelled") throw new Error("__CANCELLED__");
      if (second.ok && second.text) return second.text;

      const elapsedAfterSecond = Date.now() - startMs;
      const remainingAfterSecond = totalBudgetMs - elapsedAfterSecond;
      const secondTransient = second.text === "" || second.status === 500 || second.status === 502 || second.status === 503;
      if (secondTransient && remainingAfterSecond > 8000) {
        if (aiAbortRef.current?.signal.aborted) throw new Error("__CANCELLED__");
        await new Promise((r) => window.setTimeout(r, 800));
        const thirdBudget = Math.max(6000, Math.min(thirdPlannedBudget, remainingAfterSecond - 800));
        const third = await singleAttempt(thirdBudget);
        if (third.apiError === "cancelled") throw new Error("__CANCELLED__");
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
      throw new Error("The AI model returned an empty response. This usually means the model is temporarily overloaded — try again in a moment. If it keeps happening, try a different model in Settings.");
    }
    throw new Error("Assistant request failed — try again or check your model settings.");
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
    if (aiAbortRef.current?.signal.aborted) throw new Error("__CANCELLED__");
    const remainingMs = totalBudgetMs - (Date.now() - startMs);
    if (remainingMs < 18000) {
      throw new Error("Assistant response was not valid JSON. Try a different model or run again.");
    }

    // Retry with strict prompt while preserving more context for accuracy.
    const retryPrompt = `Your previous response was not valid JSON. Respond with ONLY the JSON object requested. No explanation.\n\nOriginal request (respond with JSON only):\n${prompt.slice(0, 4000)}`;
    const retryMaxTokens = Math.max(450, maxTokens);
    const secondPass = await requestOpenRouterText(retryPrompt, retryMaxTokens, remainingMs, "Return ONLY valid JSON. No markdown, no text.", false, 0.1);
    const secondParsed = parseJsonFromAi<T>(secondPass);
    if (secondParsed) return secondParsed;

    // Last chance: repair retry output
    const retryRepair = attemptCloseTruncatedJson(stripThinkingBlocks(secondPass).trim() || repairSource);
    if (retryRepair) {
      try { return JSON.parse(retryRepair) as T; } catch { /* fall through */ }
    }

    // Third pass: tiny schema lock to salvage slower models that drift.
    if (aiAbortRef.current?.signal.aborted) throw new Error("__CANCELLED__");
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
        Math.max(450, maxTokens),
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
        `Create a novel summary. Do NOT use specific character names — refer to characters by role or description only (e.g. "a young detective", "her abusive partner"). Character names will be created separately in the Characters section.`,
        `Return JSON:`,
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
      if (isCancelledError(error)) { setStoryAiBusyAction(null); return; }
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
      if (isCancelledError(error)) { setStoryAiBusyAction(null); return; }
      setStoryAiError(error instanceof Error ? error.message : "Unable to generate key events.");
    } finally {
      setStoryAiBusyAction(null);
    }
  }

  function stripAuthorNames(text: string, userInput: string): string {
    if (!text) return text;
    const names = userInput.split(/[,&+]/).map(n => n.trim()).filter(Boolean);
    let cleaned = text;
    for (const name of names) {
      const parts = name.split(/\s+/);
      const escaped = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      cleaned = cleaned.replace(new RegExp(escaped(name), "gi"), "");
      if (parts.length > 1) {
        for (const part of parts) {
          if (part.length > 2) cleaned = cleaned.replace(new RegExp(`\\b${escaped(part)}\\b`, "gi"), "");
        }
      }
    }
    return cleaned.replace(/\s{2,}/g, " ").replace(/^\s*[,;:.\-–—]+\s*/g, "").trim();
  }

  async function runDescribeWriterStyle() {
    if (!novel || !ensureStoryAiReady()) return;
    if (!styleAuthorDraft.trim()) {
      setStoryAiError("Describe a writing style first.");
      return;
    }
    setStoryAiBusyAction("style-author");
    setStoryAiError(null);
    try {
      const context = buildStoryBibleContext("characterCompact");
      const systemMsg = [
        "Writing style analyst. Return only valid JSON.",
        "ABSOLUTE RULE: NEVER mention any author, writer, or person names anywhere in your output — not in voiceRules, not in toneTags, not in styleComparables.",
        "Describe the style purely in terms of technique: sentence structure, vocabulary, pacing, dialogue patterns, tone, rhythm, and prose texture.",
        "The output must read as original style guidance that could stand alone without referencing any real person.",
      ].join(" ");
      const prompt = [
        `The user describes their desired writing style as: "${styleAuthorDraft.trim()}". Analyze this and return JSON:`,
        `{ "voiceRules": "practical style rules (max 800 chars) — sentence structure, vocabulary level, pacing, dialogue patterns, tone, rhythm, prose texture. NO author/person names.", "toneTags": ["tone1","tone2"], "styleComparables": ["style descriptor without names, e.g. visceral suspense, literary minimalism, sparse hardboiled noir"] }`,
        `Novel context:\n${context}`,
      ].join("\n\n");
      const data = await requestOpenRouterJson<{
        voiceRules?: string;
        toneTags?: string[];
        styleComparables?: string[];
      }>(prompt, 400, { systemMessage: systemMsg });

      const rawRules = typeof data.voiceRules === "string" ? stripAuthorNames(data.voiceRules.trim(), styleAuthorDraft) : "";
      const aiComps = parseStringList(data.styleComparables).map(c => stripAuthorNames(c, styleAuthorDraft)).filter(Boolean);
      const aiTone = parseStringList(data.toneTags).map(t => stripAuthorNames(t, styleAuthorDraft)).filter(Boolean);
      const currentComps = novel.storyBible.styleVoice.comps ?? [];
      const mergedComps = Array.from(new Set([...currentComps, ...aiComps]));

      updateStoryBible({
        styleVoice: {
          ...novel.storyBible.styleVoice,
          voiceRules: rawRules || novel.storyBible.styleVoice.voiceRules || "",
          comps: mergedComps,
        },
        summary: {
          ...novel.storyBible.summary,
          tone: aiTone.length
            ? Array.from(new Set([...(novel.storyBible.summary.tone ?? []), ...aiTone]))
            : novel.storyBible.summary.tone,
        },
      });
    } catch (error) {
      if (isCancelledError(error)) { setStoryAiBusyAction(null); return; }
      setStoryAiError(error instanceof Error ? error.message : "Unable to generate style.");
    } finally {
      setStoryAiBusyAction(null);
    }
  }

  function handleGenerateCharacters() {
    if (!novel || !ensureStoryAiReady()) return;
    const hasSummaryInput =
      Boolean(novel.storyBible.summary.synopsisShort.trim()) || Boolean(novel.storyBible.summary.stakes.trim());
    if (!hasSummaryInput) {
      setStoryAiError(
        "Your Summary is still empty. Add synopsis or core conflict first so generated characters stay canon-safe and story-specific.",
      );
      return;
    }
    void runGenerateCharacterNames();
  }

  async function runGenerateCharacterNames() {
    if (!novel || !ensureStoryAiReady()) return;

    setStoryAiBusyAction("characters-generate");
    setStoryAiError(null);
    try {
      const existingNames = storyCharacters.map((c) => c.name).filter(Boolean).join(", ") || "none";
      const sb = novel.storyBible;
      const genre = (sb.summary.genre ?? []).slice(0, 4).join(", ") || "fiction";
      const tone = (sb.summary.tone ?? []).slice(0, 3).join(", ") || "";
      const synopsis = sb.summary.synopsisShort?.trim() || "";
      const stakes = sb.summary.stakes?.trim() || "";
      const themes = (sb.summary.themes ?? []).slice(0, 3).join(", ") || "";
      const premise = sb.summary.premise?.trim() || "";
      const detected = extractSummaryNameHints();
      const requestedCount = Math.max(3, Math.min(6, detected.length + 2));

      type RosterEntry = { name?: string; role?: string; logline?: string };

      const promptParts = [
        `You are creating characters for a ${genre} novel.`,
        `Synopsis: ${clampPromptText(synopsis, 500)}`,
        stakes ? `Core conflict: ${clampPromptText(stakes, 200)}` : "",
        premise ? `Premise: ${clampPromptText(premise, 150)}` : "",
        tone ? `Tone: ${tone}` : "",
        themes ? `Themes: ${themes}` : "",
        existingNames !== "none" ? `Already created (skip these): ${existingNames}` : "",
        detected.length > 0 ? `Names mentioned in synopsis (include these): ${detected.join(", ")}. Add fitting surnames if only first names.` : "",
        `Create ${requestedCount} characters with realistic, human-sounding full names (first + last) that fit the story's setting, culture, time period, and geography.`,
        "NAMING RULES:",
        "- Names must feel like real people — not fantasy placeholders.",
        "- Match the cultural background and era of the story.",
        "- Each character needs a distinct, memorable name.",
        "",
        "Give each a role (Protagonist, Antagonist, Supporting, Love Interest, or Minor) and a one-sentence hook.",
        `Return JSON only: [{"name":"First Last","role":"Protagonist","logline":"one sentence hook"}]`,
      ];

      const prompt = promptParts.filter(Boolean).join("\n");
      let roster: RosterEntry[] = [];

      try {
        const raw = await requestOpenRouterText(prompt, 400, 120000, "Return JSON array only.", false, 0.7);
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

      if (roster.length === 0) {
        try {
          const raw2 = await requestOpenRouterText(
            `Create 4 characters for a ${genre} novel: ${clampPromptText(synopsis, 300)}\nEach needs full name, role, one-sentence hook.\nJSON: [{"name":"First Last","role":"Protagonist","logline":"hook"}]`,
            400, 60000, "Return JSON array only.", false, 0.5,
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

      roster = roster.filter((r) => {
        if (typeof r.name !== "string" || !r.name.trim()) return false;
        const name = r.name.trim();
        const words = name.split(/\s+/).filter(Boolean);
        if (words.length === 0) return false;
        const firstLower = words[0].toLowerCase();
        if (SUMMARY_NAME_BLOCKLIST.has(firstLower)) return false;
        if (/^(new character|character \d|unknown|unnamed|n\/a|the )/i.test(name)) return false;
        return true;
      });

      const existingNamesSet = new Set(storyCharacters.map((c) => c.name.trim().toLowerCase()));
      const firstNameIndex = new Set<string>();
      storyCharacters.forEach((c) => {
        const firstName = c.name.trim().toLowerCase().split(/\s+/)[0];
        if (firstName) firstNameIndex.add(firstName);
      });
      roster = roster.filter((r) => {
        const k = (r.name ?? "").trim().toLowerCase();
        const firstName = k.split(/\s+/)[0] ?? "";
        if (existingNamesSet.has(k)) return false;
        if (firstName && firstNameIndex.has(firstName)) return false;
        firstNameIndex.add(firstName);
        return true;
      });

      if (roster.length === 0) {
        throw new Error("Could not generate characters. Try a different model or add more synopsis detail.");
      }

      // Show the name confirmation popup — user picks which to keep
      setNameConfirmPopup({
        roster: roster.map((r) => ({
          name: (r.name ?? "").trim(),
          role: normalizeCharacterRole(r.role),
          logline: typeof r.logline === "string" ? r.logline.trim() : "",
          selected: true,
        })),
        step: "names",
      });
    } catch (error) {
      if (isCancelledError(error)) { setStoryAiBusyAction(null); return; }
      setStoryAiError(error instanceof Error ? error.message : "Unable to generate characters.");
    } finally {
      setStoryAiBusyAction(null);
    }
  }

  function commitSelectedCharacters() {
    if (!novel || !nameConfirmPopup) return;
    const selected = nameConfirmPopup.roster.filter((r) => r.selected);
    if (selected.length === 0) { setNameConfirmPopup(null); return; }

    const nextCharacters = [...storyCharacters];
    const addedIds: string[] = [];

    for (const entry of selected) {
      const id = createEntityId("charv2");
      nextCharacters.push({
        id,
        name: entry.name,
        role: normalizeCharacterRole(entry.role),
        logline: entry.logline,
        appearance: "", personality: "", goals: "", fears: "", backstory: "",
        secrets: "", readerSecretHint: "", accent: "", speakingStyle: "",
        reactionPattern: "", voiceNotes: "", tags: [], pronouns: "",
        groups: "", otherNames: "", relationships: [],
      });
      addedIds.push(id);
    }

    updateStoryBible({ characters: nextCharacters });
    if (!selectedV2CharacterId && nextCharacters[0]) {
      setSelectedV2CharacterId(nextCharacters[0].id);
    }

    // Move to profile generation step
    setNameConfirmPopup({ ...nameConfirmPopup, step: "profiles", addedCharacterIds: addedIds });
  }

  async function runCharacterAiForSelected(overrideCharId?: string, overrideMode?: CharacterAiMode) {
    if (!novel || !ensureStoryAiReady()) return;
    const targetCharId = overrideCharId || selectedV2CharacterId;
    if (!targetCharId) {
      setStoryAiError("Select a character first.");
      return;
    }
    const character = storyCharacters.find((item) => item.id === targetCharId);
    if (!character) {
      setStoryAiError("Select a valid character first.");
      return;
    }

    const activeMode = overrideMode || characterAiMode;
    setStoryAiBusyAction(`character-${activeMode}`);
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
        activeMode === "voice"
          ? "Focus on how this character speaks — accent, dialect, vocabulary, sentence rhythm, speech patterns, and voice notes. Reference the author's style from Canon to make dialogue feel authentic."
          : activeMode === "psyche"
            ? "Focus on inner psychology — hidden secrets, how they react under stress/conflict/betrayal, subconscious fears, and a reader-safe foreshadowing hint that does not spoil the secret."
            : "Build a full character profile — appearance, personality, goals, fears, and backstory. Make them vivid and grounded in the Canon.";
      const systemMsg = activeMode === "voice"
        ? "You are a dialogue and voice specialist. Craft how characters speak based on the author's style rules in Canon. Return only valid JSON."
        : activeMode === "psyche"
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
        `Current character:\n${JSON.stringify(trimCharacterForAiMode(character, activeMode), null, 2)}`,
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
      if (isCancelledError(error)) { setStoryAiBusyAction(null); return; }
      setStoryAiError(error instanceof Error ? error.message : "Unable to run character assistant.");
    } finally {
      setStoryAiBusyAction(null);
    }
  }

  function runAutoGenerateAllProfiles(characterIds: string[]) {
    if (!novel || !ensureStoryAiReady() || characterIds.length === 0) return;

    // Just set the queue — the useEffect above processes one at a time,
    // each with a fresh React render (exactly like clicking the button manually).
    setNameConfirmPopup(null);
    setStoryAiError(null);
    batchProfileTotalRef.current = characterIds.length;
    batchProfileAllIdsRef.current = [...characterIds];
    setBatchProfileQueue([...characterIds]);
  }

  function getUnprofiledCharacterIds(characterIds?: string[]): string[] {
    const chars = novel?.storyBible.characters ?? [];
    const candidates = characterIds
      ? chars.filter((c) => characterIds.includes(c.id))
      : chars;
    return candidates
      .filter((c) => {
        const hasProfile = (c.appearance?.trim() || c.personality?.trim() || c.backstory?.trim() || c.goals?.trim());
        return !hasProfile;
      })
      .map((c) => c.id);
  }

  function offerProfileGeneration(characterIds: string[], source: string) {
    const unprofiled = getUnprofiledCharacterIds(characterIds);
    if (unprofiled.length > 0) {
      setProfileOfferPopup({ characterIds: unprofiled, source });
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
    if (target === "synopsis") setSynopsisOptions([]);
    try {
      const context = buildStoryBibleContext("summary");
      const summarySystemMsg = "Canon refinement specialist. Return only valid JSON.";

      if (target === "synopsis") {
        const currentSynopsis = novel.storyBible.summary.synopsisShort || "";
        if (!currentSynopsis.trim()) {
          setStoryAiError("Write a synopsis first before using AI tools on it. Describe your story idea in the synopsis box above.");
          return;
        }
        const modeInstruction = mode === "tighten"
          ? "Make each version more concise, vivid, and punchy (110-170 words). Cut flab, sharpen verbs, tighten pacing."
          : mode === "expand"
            ? "Expand each version with richer narrative detail, emotional depth, causality, and texture about setting, motivations, and consequences (190-320 words each)."
            : mode === "blurb"
              ? "Rewrite each as compelling back-cover copy that hooks a reader — dramatic, enticing, with a sense of stakes and mystery."
              : mode === "beats"
                ? "Rewrite each as a chapter-ready arc summary with clear beginning, escalation, climax, and resolution beats."
                : "Improve clarity, pacing, tension, and emotional pull. Each version should take a different creative approach — one tighter, one more atmospheric, one more character-focused.";
        const sysMsg = [
          "You are an expert fiction editor helping refine a novel synopsis.",
          "Preserve any character names the author already wrote. Do NOT invent new character names.",
          "Return ONLY the 3 versions separated by ---OPTION--- on its own line.",
          "No numbering, no labels, no explanations. Just the synopsis text for each option.",
        ].join("\n");
        const prompt = [
          `Write 3 different improved versions of this synopsis.`,
          modeInstruction,
          `Each version should feel distinctly different while staying faithful to the story.`,
          `Separate each version with ---OPTION--- on its own line.`,
          `\nCurrent synopsis:\n${currentSynopsis}`,
          novel.storyBible.summary.stakes ? `\nCore conflict:\n${novel.storyBible.summary.stakes}` : "",
          `\nStory context:\n${context}`,
        ].filter(Boolean).join("\n\n");
        const raw = await requestOpenRouterText(prompt, 1800, 240000, sysMsg, false, 0.8);

        // Try multiple split strategies to reliably separate the 3 options
        let parts: string[] = [];

        // Strategy 1: explicit ---OPTION--- separator
        parts = raw.split(/---OPTION---/i).map((s) => s.trim()).filter((s) => s.length > 30);

        // Strategy 2: numbered headers like "Option 1:", "Version 1:", "1.", "**Option 1**"
        if (parts.length < 2) {
          parts = raw
            .split(/\n\s*(?:\*{0,2}(?:Option|Version)\s*\d+\*{0,2}\s*[:\-—]|\d+\.\s+\*{0,2}(?:Option|Version))/i)
            .map((s) => s.trim())
            .filter((s) => s.length > 30);
        }

        // Strategy 3: markdown headers like "### Option 1"
        if (parts.length < 2) {
          parts = raw
            .split(/\n\s*#{1,4}\s*(?:Option|Version)\s*\d+/i)
            .map((s) => s.trim())
            .filter((s) => s.length > 30);
        }

        // Strategy 4: double newline + numbered pattern like "\n\n1." or "\n\n**1"
        if (parts.length < 2) {
          parts = raw
            .split(/\n{2,}(?=\d+[\.\)]\s|\*{2}\d)/)
            .map((s) => s.trim())
            .filter((s) => s.length > 30);
        }

        // Clean each option — strip labels, markdown bold headers, leading numbers
        const cleanOption = (text: string) =>
          text
            .replace(/^\*{0,2}(?:Option|Version)\s*\d+\*{0,2}\s*[:\-—]?\s*/i, "")
            .replace(/^\d+[\.\)]\s*/, "")
            .replace(/^\*\*.+\*\*\s*\n?/, "")
            .trim();

        if (parts.length >= 2) {
          const options = parts.slice(0, 3).map((text, i) => ({
            label: `Option ${i + 1}`,
            text: cleanOption(text),
          }));
          setSynopsisOptions(options);
        } else {
          // Fallback: whole response as single option
          const cleaned = cleanOption(raw);
          if (cleaned.length > 30) {
            setSynopsisOptions([{ label: "Option 1", text: cleaned }]);
          } else {
            setStoryAiError("AI returned an empty result. Try again or switch model.");
          }
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
      if (isCancelledError(error)) { setStoryAiBusyAction(null); return; }
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
              ? { ...ch, subtitle: patch.synopsis!, updatedAt: new Date().toISOString() }
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
      setShowPlanGenerateModal(false);
      setRegenConfirm({
        message: `This will replace your existing ${planChapters.length} chapter${planChapters.length === 1 ? "" : "s"} in the plan. Existing synopses will be overwritten.`,
        onConfirm: () => { setRegenConfirm(null); updateBookPlan({ aiChapterTarget: target, pacingMode: planGeneratePacingMode }); void runGeneratePlan(target); },
      });
      return;
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
          subtitle: plan.synopsis || existing?.subtitle || "",
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
    // Clear stale arc analysis so old placeholder synopses don't show
    updateBookPlan({ arcAnalysis: null });
    let planGenFailed = false;
    let planNewCharIds: string[] = [];
    try {
      const planTarget = targetOverride ?? normalizePlanTarget(novel.storyBible.bookPlan?.aiChapterTarget);
      const systemMsg = "You are a PLOT outliner, not a prose writer. Write chapter plot summaries describing what HAPPENS — actions, consequences, changes. Never write prose scenes or dialogue. Think like a screenwriter's beat sheet. Respect all Canon. Return only valid JSON.";
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
       * TWO-PHASE SEQUENTIAL PLAN GENERATION
       * Phase 1: Generate chapter titles (fast call — establishes arc)
       * Phase 2: Generate each chapter synopsis one-at-a-time with
       *          full context of ALL previous chapters for consistency.
       *          This produces a genuine novel blueprint, not repeated
       *          summaries.
       * ══════════════════════════════════════════════════════════════ */

      const nfSubtype = nfData?.subtype ?? "memoir";
      const nfSubtypeLabel = nfSubtype === "true-crime" ? "true crime" : nfSubtype === "investigative" ? "investigative non-fiction" : nfSubtype;
      const nfCtx = isNF ? (() => {
        const nf = novel.storyBible.nonfiction;
        const parts: string[] = [`Type: ${nfSubtypeLabel}`];
        if (nf?.subjectName) parts.push(`Subject: ${nf.subjectName} (${nf.subjectRelation || "subject"})`);
        if (nf?.era) parts.push(`Era: ${nf.era}`);
        if (nf?.setting) parts.push(`Setting: ${nf.setting}`);
        if (nf?.centralTheme) parts.push(`Central theme: ${nf.centralTheme}`);
        if (nf?.lifeEvents?.length) {
          parts.push("Life Events (source material for chapters):");
          nf.lifeEvents.forEach((e, i) => {
            parts.push(`  ${i + 1}. ${e.title}${e.date ? ` (${e.date})` : ""}: ${e.description || ""}${e.emotion ? ` [Emotion: ${e.emotion}]` : ""}${e.impact ? ` [Impact: ${e.impact}]` : ""}`);
          });
        }
        return parts.join("\n");
      })() : "";

      const genres = novel.storyBible.summary.genre ?? [];
      const genreLower = genres.map((g: string) => g.toLowerCase());
      const genreStr = genres.join(", ") || "general fiction";
      const planStyleVoice = novel.storyBible.styleVoice;
      const authorStyleHint = planStyleVoice?.voiceRules ? `Writing style: ${clampPromptText(planStyleVoice.voiceRules, 150)}` : "";

      const getGenreGuidance = (): string => {
        const parts: string[] = [];
        if (genreLower.some((g: string) => g.includes("thriller") || g.includes("suspense")))
          parts.push("GENRE NOTE: Thriller/Suspense — End chapters with tension or cliffhangers. Layer mysteries and misdirection.");
        if (genreLower.some((g: string) => g.includes("romance")))
          parts.push("GENRE NOTE: Romance — Build the relationship gradually. Create meaningful obstacles between the leads.");
        if (genreLower.some((g: string) => g.includes("mystery") || g.includes("crime") || g.includes("detective")))
          parts.push("GENRE NOTE: Mystery/Crime — Plant clues and red herrings. Each chapter reveals something new while deepening the mystery.");
        if (genreLower.some((g: string) => g.includes("fantasy")))
          parts.push("GENRE NOTE: Fantasy — Weave worldbuilding naturally into action. Magic should feel grounded in rules.");
        if (genreLower.some((g: string) => g.includes("horror")))
          parts.push("GENRE NOTE: Horror — Build dread through atmosphere. Each chapter escalates the sense of danger.");
        if (genreLower.some((g: string) => g.includes("sci-fi") || g.includes("science fiction")))
          parts.push("GENRE NOTE: Sci-Fi — Ground speculative elements in internal logic.");
        if (genreLower.some((g: string) => g.includes("literary")))
          parts.push("GENRE NOTE: Literary Fiction — Focus on character interiority and thematic depth.");
        if (genreLower.some((g: string) => g.includes("historical")))
          parts.push("GENRE NOTE: Historical — Ground chapters in period-authentic detail.");
        if (genreLower.some((g: string) => g.includes("young adult") || g.includes("ya")))
          parts.push("GENRE NOTE: YA — Voice should feel authentic to the protagonist's age.");
        return parts.join("\n");
      };

      const getStructuralBeat = (chapterIndex: number, totalChapters: number): string => {
        const pos = (chapterIndex + 1) / totalChapters;
        const chNum = chapterIndex + 1;
        if (chNum === 1) return "STRUCTURE: OPENING chapter. Hook the reader immediately. Introduce the protagonist in a SPECIFIC moment that defines them. End on a note that makes the reader need chapter 2.";
        if (chNum === 2) return "STRUCTURE: Chapter 2 must show a DIFFERENT side of the story — new setting, new situation, or a time jump. Introduce a new element (character, threat, relationship, or mystery). DO NOT repeat the same scenario as Chapter 1.";
        if (chNum === 3) return "STRUCTURE: Chapter 3 deepens the conflict. The protagonist faces a new challenge or complication that raises the stakes beyond what chapters 1-2 established.";
        if (chNum === 4) return "STRUCTURE: Chapter 4 — the story is now in motion. Something happens that makes turning back impossible. A point of no return.";
        if (pos <= 0.25) return "STRUCTURE: Act 1 — Inciting Incident zone. The status quo shatters. The protagonist is thrust into the central conflict.";
        if (pos <= 0.40) return "STRUCTURE: Act 2A — Rising Action. New complications, new obstacles, deeper stakes. The protagonist is tested.";
        if (pos <= 0.55) return "STRUCTURE: MIDPOINT. A major twist, revelation, or reversal changes everything. The protagonist must fundamentally shift their approach.";
        if (pos <= 0.70) return "STRUCTURE: Act 2B — Escalation. Stakes peak. Subplots converge. Pressure mounts relentlessly.";
        if (pos <= 0.80) return "STRUCTURE: Act 2B — Dark moment. The protagonist's lowest point. Everything seems lost.";
        if (pos <= 0.90) return "STRUCTURE: Act 3 — Climax. The central conflict reaches its peak. Maximum stakes, direct confrontation.";
        if (chNum === totalChapters) return "STRUCTURE: FINAL chapter. Resolve the central conflict decisively. Tie up major threads.";
        return "STRUCTURE: Act 3 — Resolution. Show consequences of the climax. Resolve remaining threads.";
      };

      /* ── Phase 1: Generate chapter TITLES (fast call) ── */
      const titlePrompt = isNF ? [
        `Create exactly ${planTarget} chapter titles for this ${nfSubtypeLabel} book.`,
        `Return JSON: { "titles": ["Title 1", "Title 2", ...] }`,
        `Exactly ${planTarget} unique, evocative titles that map out the entire narrative arc from beginning to end.`,
        nfSubtype === "true-crime" ? "Structure: the crime, the investigation, the pursuit, the resolution." : "",
        nfSubtype === "biography" ? "Structure: follow the subject's life arc through defining moments." : "",
        nfSubtype === "memoir" ? "Structure: follow a chronological or thematic arc through life events." : "",
        nfSubtype === "historical" ? "Structure: chronologically through key events with human stories." : "",
        nfSubtype === "investigative" ? "Structure: build toward revelation — hidden, uncovered, consequences." : "",
        pacingHint,
        nfCtx ? `Context:\n${nfCtx}` : "",
        `\nCanon:\n${context}`,
      ].filter(Boolean).join("\n") : [
        `Create exactly ${planTarget} chapter titles for this ${genreStr} novel.`,
        `Return JSON: { "titles": ["Title 1", "Title 2", ...] }`,
        `Exactly ${planTarget} unique titles that map out the ENTIRE story arc from opening hook to resolution.`,
        `A reader should sense the emotional journey of the novel just from reading the title sequence.`,
        `Genre: ${genreStr}`,
        pacingHint,
        authorStyleHint,
        `\nCanon:\n${context}`,
      ].filter(Boolean).join("\n");

      let allTitles: string[] = [];
      try {
        const raw = await requestOpenRouterText(titlePrompt, Math.min(2000, planTarget * 60), 120000, systemMsg, false, 0.4);
        let parsed = parseJsonFromAi<{ titles?: string[] } | string[]>(raw);
        if (!parsed) {
          const repaired = attemptCloseTruncatedJson(raw.trim());
          if (repaired) try { parsed = JSON.parse(repaired) as { titles?: string[] }; } catch { /* ignore */ }
        }
        if (Array.isArray(parsed)) {
          allTitles = parsed.map((t: unknown, i: number) => (typeof t === "string" ? t.trim() : "") || `Chapter ${i + 1}`);
        } else if (parsed && typeof parsed === "object") {
          const obj = parsed as Record<string, unknown>;
          const arr = Array.isArray(obj.titles) ? obj.titles : (Object.values(obj).find((v) => Array.isArray(v)) as string[] | undefined);
          if (arr) allTitles = arr.map((t: unknown, i: number) => (typeof t === "string" ? t.trim() : "") || `Chapter ${i + 1}`);
        }
      } catch { /* fall through to defaults */ }
      while (allTitles.length < planTarget) allTitles.push(`Chapter ${allTitles.length + 1}`);
      allTitles = allTitles.slice(0, planTarget);

      /* ── Show skeleton plan immediately so user sees titles ── */
      type Phase2Result = {
        synopsis?: string;
        characters?: string[];
        location?: string;
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
      const existingCharIdsBefore = new Set((novel.storyBible.characters ?? []).map((c) => c.id));
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
        const words = key.split(/\s+/);
        const first = words[0];
        const last = words.length > 1 ? words[words.length - 1] : "";
        // Match by first name if unique
        const firstMatches = mergedCharacters.filter((c) => normalizeLookup(c.name || "").split(/\s+/)[0] === first);
        if (firstMatches.length === 1) return firstMatches[0].id;
        // Match by last name — "John Thompson" should find existing "Mary Thompson"
        if (last) {
          const lastMatches = mergedCharacters.filter((c) => {
            const parts = normalizeLookup(c.name || "").split(/\s+/);
            return parts.length > 1 && parts[parts.length - 1] === last;
          });
          if (lastMatches.length === 1) return lastMatches[0].id;
        }
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

      /* ── Phase 2: Generate each chapter synopsis SEQUENTIALLY ──
       * Each chapter gets the full context of ALL previously generated
       * chapters so the story builds naturally with proper pacing,
       * cause-and-effect, and genre-aware structure.
       */
      const generatedSynopses: string[] = [];
      const usedLocations: string[] = [];
      const fullChapterList = allTitles.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n");
      const genreGuidance = getGenreGuidance();

      const synopsisFormatGuide = [
        "FORMAT: Write a PLOT SUMMARY, not prose. Describe what happens like a book outline.",
        "BAD example: 'John sits at his desk, staring out the window. Rain streaks down the glass as he picks up his pen.'",
        "GOOD example: 'John discovers his wife has been hiding letters from his estranged brother. He confronts her, and she reveals the brother is dying. John decides to visit despite years of silence, but his wife refuses to go with him, deepening the rift in their marriage.'",
        "Write like the GOOD example — plot events, decisions, consequences, and what CHANGES. Never narrate moment-by-moment scenes.",
      ].join("\n");

      for (let index = 0; index < allTitles.length; index++) {
        if (aiAbortRef.current?.signal.aborted) break;
        setPlanGenerateProgressIdx(index);

        const chapterTitle = allTitles[index];
        const structuralBeat = getStructuralBeat(index, allTitles.length);

        const storySoFar = generatedSynopses.length > 0
          ? generatedSynopses.map((s, si) => `Ch ${si + 1} "${allTitles[si]}": ${clampPromptText(s, 400)}`).join("\n\n")
          : "";

        const prevSynopsis = index > 0 ? generatedSynopses[index - 1] : "";
        const nextTitle = index < allTitles.length - 1 ? allTitles[index + 1] : "";

        const blockedLocations = usedLocations.length > 0
          ? `LOCATIONS ALREADY USED (pick a DIFFERENT one): ${usedLocations.join(", ")}`
          : "";

        const whatChangedLast = prevSynopsis
          ? `At the end of the previous chapter: ${clampPromptText(prevSynopsis.split(/\.\s/).slice(-2).join(". "), 200)}`
          : "";

        const chapterPrompt = isNF ? [
          `Chapter ${index + 1} of ${allTitles.length}: "${chapterTitle}" — ${nfSubtypeLabel} book.`,
          `Return JSON: { "synopsis": "...", "characters": ["Person Name"], "location": "One Place Name", "events": ["key moment"] }`,
          "",
          synopsisFormatGuide,
          "",
          storySoFar ? `ALREADY HAPPENED (do not repeat — continue AFTER this):\n${storySoFar}\n` : "",
          whatChangedLast ? `PICK UP FROM: ${whatChangedLast}\n` : "",
          blockedLocations,
          structuralBeat,
          "",
          `- This is a NON-FICTION ${nfSubtypeLabel} book based on real events.`,
          nfSubtype === "true-crime" ? "- True crime narrative: evidence, investigation, pursuit." : "",
          nfSubtype === "biography" ? "- Biography: defining moments and turning points." : "",
          nfSubtype === "memoir" ? "- Memoir: emotional honesty about real experiences." : "",
          "- Write 4-6 sentences of PLOT: what happens, what decisions are made, what changes.",
          "- ONE location only. Return a single place name string.",
          "- Only people who appear and act (2-4 typically).",
          "- Use existing Canon names. Never create duplicates.",
          canonNames ? `Canon names: ${canonNames}` : "",
          pacingHint,
          "",
          `Chapter outline:\n${fullChapterList}`,
          nextTitle ? `Next chapter: "${nextTitle}"` : "This is the FINAL chapter.",
          `\nBook synopsis: ${clampPromptText(novel.storyBible.summary.synopsisShort || "", 500)}`,
          nfCtx ? `\nNon-fiction context:\n${clampPromptText(nfCtx, 800)}` : "",
          `\nCanon:\n${clampPromptText(context, 800)}`,
        ].filter(Boolean).join("\n") : [
          `Chapter ${index + 1} of ${allTitles.length}: "${chapterTitle}" — ${genreStr} novel.`,
          `Return JSON: { "synopsis": "...", "characters": ["First Last"], "location": "One Place Name", "events": ["key moment"] }`,
          "",
          synopsisFormatGuide,
          "",
          storySoFar ? `ALREADY HAPPENED (do not repeat — continue AFTER this):\n${storySoFar}\n` : "",
          whatChangedLast ? `PICK UP FROM: ${whatChangedLast}\n` : "",
          blockedLocations,
          structuralBeat,
          genreGuidance,
          "",
          "- Write 4-6 sentences of PLOT: what happens, what decisions are made, what changes, what consequences follow.",
          "- Every sentence should advance the story. No scene-setting, no describing postures or weather.",
          "- State WHO does WHAT and what CHANGES as a result.",
          "- ONE location only. Return a single place name string.",
          "- Only characters who appear and act (2-4 typically). Proper names only.",
          "- Use existing Canon names. Never create duplicates.",
          canonNames ? `Canon names: ${canonNames}` : "",
          pacingHint,
          authorStyleHint,
          "",
          `Chapter outline:\n${fullChapterList}`,
          nextTitle ? `Next chapter: "${nextTitle}"` : "This is the FINAL chapter — resolve the central conflict.",
          `\nBook synopsis: ${clampPromptText(novel.storyBible.summary.synopsisShort || "", 500)}`,
          `\nCanon:\n${clampPromptText(context, 800)}`,
        ].filter(Boolean).join("\n");

        let synopsis = "";
        let chapterCharacterIds: string[] = [];
        let chapterLocationIds: string[] = [];
        let chapterLoreIds: string[] = [];

        try {
          const raw = await requestOpenRouterText(chapterPrompt, 600, 180000, systemMsg, false, 0.6);
          let parsed = parseJsonFromAi<Phase2Result>(raw);
          if (!parsed) {
            const repaired = attemptCloseTruncatedJson(raw.trim());
            if (repaired) try { parsed = JSON.parse(repaired) as Phase2Result; } catch { /* skip */ }
          }
          if (parsed?.synopsis && parsed.synopsis.trim().length > 40) {
            synopsis = parsed.synopsis.trim();
            const rawCharacterNames = parseStringList(parsed.characters);
            const resolvedCharacterIds = rawCharacterNames.map(ensureCharacterId).filter(Boolean);
            chapterCharacterIds = mergeUniqueIds(
              resolvedCharacterIds,
              inferEntityIdsFromText(`${chapterTitle}\n${synopsis}`, mergedCharacters.map((c) => ({
                id: c.id, name: c.name || "",
                aliases: (c.otherNames || "").split(/[;,]/).map((a) => a.trim()).filter(Boolean),
              }))),
            );
            // Enforce single location: prefer "location" string, fall back to first of "locations" array
            const singleLocName = typeof parsed.location === "string" ? parsed.location.trim() : "";
            const locNames = singleLocName ? [singleLocName] : parseStringList(parsed.locations).slice(0, 1);
            chapterLocationIds = mergeUniqueIds(
              locNames.map(ensureLocationId).filter(Boolean),
              inferEntityIdsFromText(`${chapterTitle}\n${synopsis}`, mergedLocations.map((l) => ({
                id: l.id, name: l.name || "",
              }))),
            ).slice(0, 1);
            chapterLoreIds = mergeUniqueIds(
              parseStringList(parsed.events).map(resolveLoreId).filter(Boolean),
              inferEntityIdsFromText(`${chapterTitle}\n${synopsis}`, mergedLore.map((e) => ({
                id: e.id, name: e.title || "",
              }))),
            );
            parseStringList(parsed.events).forEach((ev) => ensureEventId(ev, chapterTitle, synopsis, index));
          }
        } catch { /* AI call failed — will show placeholder */ }

        if (!synopsis) synopsis = `Outline for ${chapterTitle}.`;
        generatedSynopses.push(synopsis);

        // Track used location so next chapter picks a different one
        if (chapterLocationIds.length > 0) {
          const locEntity = mergedLocations.find((l) => l.id === chapterLocationIds[0]);
          if (locEntity?.name) usedLocations.push(locEntity.name);
        }

        mutateNovel((current) => {
          const plan = current.storyBible.bookPlan;
          if (!plan) return current;
          const updatedPlanChapters = [...plan.chapters];
          if (updatedPlanChapters[index]) {
            updatedPlanChapters[index] = {
              ...updatedPlanChapters[index],
              synopsis,
              characterIds: chapterCharacterIds,
              locationIds: chapterLocationIds,
              loreIds: chapterLoreIds,
            };
          }
          const updatedChapters = [...current.chapters];
          if (updatedChapters[index]) {
            updatedChapters[index] = {
              ...updatedChapters[index],
              subtitle: synopsis,
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
      }
      setPlanGenerateProgressIdx(null);

      planNewCharIds = mergedCharacters
        .filter((c) => !existingCharIdsBefore.has(c.id))
        .map((c) => c.id);
    } catch (error) {
      if (isCancelledError(error)) { setStoryAiBusyAction(null); setPlanGenerateProgressIdx(null); return; }
      setPlanError(error instanceof Error ? error.message : "Unable to generate plan.");
      planGenFailed = true;
    } finally {
      setStoryAiBusyAction(null);
      setPlanGenerateProgressIdx(null);
      setPlanGenerateTotal(0);
      if (!planGenFailed) {
        // Give React a tick to settle after mutateNovel, then offer character profiles
        setTimeout(() => {
          const unprofiled = getUnprofiledCharacterIds();
          if (unprofiled.length > 0) {
            setProfileOfferPopup({ characterIds: unprofiled, source: "Chapter Plan" });
          }
        }, 800);
      }
    }
  }

  /* ─── Arc Intelligence Engine ─── */

  function novelHasProse(): boolean {
    if (!novel) return false;
    return novel.chapters.some((ch) => {
      const prose = extractProseFromContent(ch.content).trim();
      return prose.length > 50;
    });
  }

  async function runArcAnalysis() {
    if (!novel || aiOff) return;
    if (storyAiBusyAction) {
      setArcError("Another AI task is running. Wait for it to finish first.");
      return;
    }
    const plan = novel.storyBible.bookPlan;
    if (!plan || plan.chapters.length < 3) {
      setArcError("Need at least 3 plan chapters to analyse arcs.");
      return;
    }
    const incompleteCount = plan.chapters.filter((ch) => !ch.synopsis || ch.synopsis.trim().length < 60).length;
    if (incompleteCount > 0) {
      setArcError(`${incompleteCount} chapter${incompleteCount > 1 ? "s" : ""} still missing a synopsis. Generate your full plan first.`);
      return;
    }

    setArcBusy(true);
    setArcError(null);

    try {
      // Keep the prompt SMALL — just ask for 3 short arc suggestions.
      // Chapter synopses are generated later when the user picks one.
      const chapterTitles = plan.chapters.map((ch, i) => `${i + 1}. ${ch.title}`).join("\n");

      const userPrompt = [
        `Novel: "${novel.title}"`,
        `Genre: ${(novel.storyBible.summary.genre || []).join(", ") || "not specified"}`,
        `Synopsis: ${(novel.synopsis || novel.storyBible.summary.synopsisShort || "").slice(0, 600)}`,
        `Chapters:\n${chapterTitles}`,
        "",
        "Suggest 3 different story arc directions for this novel.",
        "Each must feel genuinely different — different emotional journeys, different structures.",
        "Score each for narrative strength. Recommend which is best.",
        "",
        "Return JSON only:",
        '{ "choices": [{ "name": "2-5 word arc name", "description": "2-3 sentences", "score": 1-10, "rationale": "1-2 sentences why" }] }',
        "Exactly 3 choices. Best score first.",
      ].join("\n");

      const result = await requestOpenRouterJson<{ choices?: Array<{ name?: string; description?: string; score?: number; rationale?: string }> }>(
        userPrompt,
        600,
        { systemMessage: "Story arc analyst. Return ONLY valid JSON. No markdown." },
      );

      if (!result || typeof result !== "object") {
        setArcError("AI returned an invalid response. Try again.");
        return;
      }

      const res = result as Record<string, unknown>;
      const numChapters = plan.chapters.length;

      const rawChoices: ArcChoice[] = Array.isArray(res.choices)
        ? (res.choices as Record<string, unknown>[])
            .filter((c) => c && typeof c.name === "string")
            .slice(0, 3)
            .map((c) => ({
              name: String(c.name || "Unnamed Arc").slice(0, 60),
              description: String(c.description || "").slice(0, 400),
              score: Math.max(1, Math.min(10, Number(c.score) || 5)),
              rationale: String(c.rationale || "").slice(0, 300),
              chapterSynopses: plan.chapters.map((ch) => ch.synopsis || ""),
            }))
        : [];

      if (rawChoices.length === 0) {
        setArcError("AI did not return valid arc choices. Try again.");
        return;
      }

      while (rawChoices.length < 3) {
        rawChoices.push({
          name: `Arc Option ${rawChoices.length + 1}`,
          description: "Could not generate this option. Try regenerating.",
          score: 1,
          rationale: "Incomplete generation.",
          chapterSynopses: plan.chapters.map((ch) => ch.synopsis || ""),
        });
      }

      rawChoices.sort((a, b) => b.score - a.score);

      const analysis: ArcAnalysis = {
        scores: [],
        issues: [],
        overall: rawChoices[0]?.score ?? 5,
        generatedAt: new Date().toISOString(),
        choices: rawChoices,
      };

      updateBookPlan({ arcAnalysis: analysis });

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Arc analysis failed.";
      setArcError(msg.includes("empty response")
        ? "Arc Intelligence got an empty response — try again."
        : msg);
    } finally {
      setArcBusy(false);
    }
  }

  async function applyArcChoice(choiceIndex: number) {
    if (!novel) return;
    if (storyAiBusyAction) {
      setArcError("Another AI task is running. Wait for it to finish first.");
      return;
    }
    const plan = novel.storyBible.bookPlan;
    const analysis = plan?.arcAnalysis;
    if (!plan || !analysis?.choices || !analysis.choices[choiceIndex]) return;

    const choice = analysis.choices[choiceIndex];
    setArcApplyingChoice(choiceIndex);
    setArcError(null);

    try {
      // Smaller batches = more reliable detailed synopses
      const BATCH_SIZE = 4;
      const allChapters = plan.chapters;
      const totalChapters = allChapters.length;
      const finalSynopses: string[] = new Array(totalChapters).fill("");
      const allMentionedCharNames: string[] = [];

      const existingCharNames = (novel.storyBible.characters ?? []).map((c) => c.name).filter(Boolean);

      const storyContext = [
        `Novel: "${novel.title}"`,
        `Genre: ${(novel.storyBible.summary.genre || []).join(", ") || "not specified"}`,
        `Synopsis: ${(novel.synopsis || novel.storyBible.summary.synopsisShort || "").slice(0, 800)}`,
        "",
        `Chosen arc direction: "${choice.name}"`,
        `Arc description: ${choice.description}`,
        `Arc rationale: ${choice.rationale}`,
        existingCharNames.length > 0 ? `Existing characters: ${existingCharNames.join(", ")}` : "",
      ].filter(Boolean).join("\n");

      const allTitles = allChapters.map((ch, i) => `${i + 1}. ${ch.title}`).join("\n");

      for (let batchStart = 0; batchStart < totalChapters; batchStart += BATCH_SIZE) {
        const batchEnd = Math.min(batchStart + BATCH_SIZE, totalChapters);
        const batchChapters = allChapters.slice(batchStart, batchEnd);
        const batchSize = batchChapters.length;

        const chapterOutline = batchChapters.map((ch, localIdx) => {
          const globalIdx = batchStart + localIdx;
          return `Chapter ${globalIdx + 1} — "${ch.title}":\n${ch.synopsis || "(no synopsis yet)"}`;
        }).join("\n\n");

        const batchPrompt = [
          storyContext,
          "",
          `Full chapter list (${totalChapters} chapters total):\n${allTitles}`,
          "",
          `Rewrite synopses for chapters ${batchStart + 1}–${batchEnd} to follow the "${choice.name}" arc.`,
          "",
          "Current synopses for this batch:",
          chapterOutline,
          "",
          "RULES:",
          "- Each synopsis MUST be detailed — at least 4-6 sentences per chapter.",
          "- Include specific character actions, emotional beats, key plot developments, and scene-setting.",
          "- Keep the same characters, world, and core events. Reshape the narrative arc, pacing, tension, and emotional journey.",
          "- Maintain or exceed the detail from the originals. Never shorten — expand and reshape.",
          "- Ensure continuity: each chapter leads naturally into the next.",
          "- Every character must have a proper human name (First Last). NEVER use role labels like 'The Antagonist', 'The Bad Guy', 'The Killer'. Give every character a real name.",
          "- Also return the full list of character names mentioned across all synopses in this batch.",
          "",
          `Return JSON: { "synopses": [${batchSize} entries], "characters": ["First Last", ...] }`,
          `Exactly ${batchSize} synopsis entries. Each must be a detailed paragraph.`,
        ].join("\n");

        const tokenBudget = Math.max(2000, batchSize * 600);
        const result = await requestOpenRouterJson<{ synopses?: string[]; characters?: string[] }>(
          batchPrompt,
          tokenBudget,
          { systemMessage: "Expert story architect. Rewrite chapter synopses with rich detail. Return ONLY valid JSON.", timeoutMs: Math.max(240000, batchSize * 30000) },
        );

        const batchSynopses = Array.isArray(result?.synopses) ? result.synopses : [];
        for (let j = 0; j < batchSize; j++) {
          const syn = batchSynopses[j];
          finalSynopses[batchStart + j] = (typeof syn === "string" && syn.trim()) ? syn.trim() : (allChapters[batchStart + j]?.synopsis || "");
        }

        // Collect character names from this batch
        if (Array.isArray(result?.characters)) {
          result.characters.forEach((n) => { if (typeof n === "string" && n.trim()) allMentionedCharNames.push(n.trim()); });
        }

        // Small delay between batches to avoid rate limits
        if (batchEnd < totalChapters) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }

      // Merge any new characters into Canon
      const charByName = new Map<string, string>();
      (novel.storyBible.characters ?? []).forEach((c) => {
        if (c.name) charByName.set(normalizeLookup(c.name), c.id);
        (c.otherNames || "").split(/[;,]/).map((a) => normalizeLookup(a)).filter(Boolean).forEach((k) => charByName.set(k, c.id));
      });
      const newCharIds: string[] = [];
      const newChars = [...(novel.storyBible.characters ?? [])];
      const uniqueNames = [...new Set(allMentionedCharNames.map((n) => n.trim()).filter(Boolean))];
      for (const name of uniqueNames) {
        if (isRoleLikeCharacterLabel(name) || !isLikelyHumanName(name)) continue;
        const key = normalizeLookup(name);
        if (charByName.has(key)) continue;
        // Check first-name match
        const first = key.split(/\s+/)[0];
        const firstMatches = newChars.filter((c) => normalizeLookup(c.name || "").split(/\s+/)[0] === first);
        if (firstMatches.length === 1) continue;
        const newChar: typeof newChars[number] = {
          id: createEntityId("char"), name, role: "Supporting", logline: "",
          appearance: "", personality: "", goals: "", fears: "", backstory: "",
          secrets: "", readerSecretHint: "", accent: "", speakingStyle: "",
          reactionPattern: "", relationships: [], voiceNotes: "", tags: [],
          pronouns: "", groups: "", otherNames: "",
        };
        newChars.push(newChar);
        charByName.set(key, newChar.id);
        newCharIds.push(newChar.id);
      }

      mutateNovel((current) => {
        const curPlan = current.storyBible.bookPlan;
        if (!curPlan) return current;

        const mergedCharsForArc = newChars.length > (current.storyBible.characters ?? []).length ? newChars : current.storyBible.characters;
        const novelWithNewChars = { ...current, storyBible: { ...current.storyBible, characters: mergedCharsForArc } };

        const updatedPlanChapters = curPlan.chapters.map((ch, i) => {
          const newSynopsis = finalSynopses[i] || ch.synopsis;
          return inferPlanReferences({ ...ch, synopsis: newSynopsis }, novelWithNewChars);
        });

        const updatedChapters = current.chapters.map((ch, i) => ({
          ...ch,
          subtitle: finalSynopses[i] || ch.subtitle,
          updatedAt: new Date().toISOString(),
        }));

        return {
          ...current,
          chapters: updatedChapters,
          storyBible: {
            ...current.storyBible,
            characters: mergedCharsForArc,
            bookPlan: {
              ...curPlan,
              chapters: updatedPlanChapters,
              arcAnalysis: {
                ...analysis,
                selectedChoiceIndex: choiceIndex,
              },
              updatedAt: new Date().toISOString(),
            },
          },
        };
      });

      // After arc apply, offer to generate profiles for characters without them
      // Use a timeout so React state has settled after mutateNovel
      setTimeout(() => {
        // New characters from arc have no profile, plus check existing ones
        const existingUnprofiled = getUnprofiledCharacterIds();
        const allUnprofiled = [...new Set([...newCharIds, ...existingUnprofiled])];
        if (allUnprofiled.length > 0) {
          setProfileOfferPopup({ characterIds: allUnprofiled, source: "Arc Intelligence" });
        }
      }, 1000);

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to apply arc.";
      setArcError(msg.includes("empty response")
        ? "Could not rewrite synopses — try again."
        : msg);
    } finally {
      setTimeout(() => setArcApplyingChoice(null), 600);
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
            subtitle: synopsis,
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
      if (isCancelledError(error)) { setStoryAiBusyAction(null); return; }
      setPlanError(error instanceof Error ? error.message : "Failed to regenerate chapter.");
    } finally {
      setStoryAiBusyAction(null);
    }
  }

  function autoSizeEditorInput(input: HTMLTextAreaElement | null, minHeight?: number) {
    if (!input) return;
    const min = minHeight ?? (input.classList.contains("pw-block-prose-seamless") ? 40 : 520);
    input.style.height = "auto";
    input.style.height = `${Math.max(input.scrollHeight, min)}px`;
  }

  useEffect(() => {
    autoSizeEditorInput(editorInputRef.current);
  }, [activeChapter?.id, activeChapter?.content, hideBlocks]);

  useEffect(() => {
    if (!activeChapter) return;
    const blocks = getSceneBlocks(activeChapter);
    blocks.forEach((_, idx) => {
      const el = blockProseRefs.current[idx];
      if (el) autoSizeEditorInput(el);
    });
  }, [activeChapter?.id, JSON.stringify(activeChapter ? getSceneBlocks(activeChapter).map((b) => b.prose?.length ?? 0) : [])]);

  /** Force an immediate save (local + server flush) — call when any panel/modal closes */
  function saveNow() {
    saveNovels(novels);
    flushServerSave();
  }

  // ── Manuscript Health Score ──
  const [healthScoreBusy, setHealthScoreBusy] = useState(false);

  // ── Thematic Consistency Scanner ──
  const [themeScanBusy, setThemeScanBusy] = useState(false);
  const [themeScanExpanded, setThemeScanExpanded] = useState(false);

  const [healthChapterIdx, setHealthChapterIdx] = useState(0);

  async function generateHealthScore() {
    if (!novel || !ensureStoryAiReady()) return;
    setHealthScoreBusy(true);

    const chaptersWithProse = novel.chapters
      .map((ch, i) => ({ idx: i, title: ch.title || `Chapter ${i + 1}`, prose: extractProseFromContent(ch.content) }))
      .filter((c) => c.prose.trim().length > 30);
    if (chaptersWithProse.length === 0) { setHealthScoreBusy(false); return; }

    const novelGenre = novel.storyBible.summary.genre?.join(", ") || "fiction";
    const tw = countNovelWords(novel);

    const systemMsg = [
      `You are a professional manuscript assessor evaluating a ${novelGenre} novel (${tw.toLocaleString()} words, ${novel.chapters.length} chapters).`,
      `Score each category 1-10 (10 = publishable). Be honest but constructive.`,
      `Provide overall scores AND per-chapter breakdowns with specific, actionable tips.`,
      `Return ONLY valid JSON.`,
    ].join(" ");

    const chapterSamples = chaptersWithProse.map((c) =>
      `--- Ch${c.idx + 1}: "${c.title}" ---\n${c.prose.slice(0, 800)}`
    ).join("\n\n");

    const prompt = [
      `Assess this manuscript using the chapter samples below.`,
      `\nCHAPTERS:\n${chapterSamples}`,
      `\nScore each category 1-10: pacing, dialogue, clarity, engagement.`,
      `Provide: 1) Overall scores + 3-5 actionable tips for the whole manuscript`,
      `2) Per-chapter breakdowns: for each chapter, all 4 scores + 2-3 specific tips`,
      `\nReturn JSON: {"pacing":7,"dialogue":6,"clarity":8,"engagement":7,"tips":["Tip 1"],`,
      `"chapters":[{"chapterTitle":"Chapter 1","pacing":7,"dialogue":6,"clarity":8,"engagement":7,"tips":["Specific tip"]}]}`,
    ].join("\n");

    try {
      const data = await requestOpenRouterJson(prompt, 2500, { timeoutMs: 120000, systemMessage: systemMsg }) as Record<string, unknown> | null;
      if (!data) { setHealthScoreBusy(false); return; }

      const clamp = (v: unknown) => Math.max(1, Math.min(10, Math.round(Number(v) || 5)));
      const pacing = clamp(data.pacing);
      const dialogue = clamp(data.dialogue);
      const clarity = clamp(data.clarity);
      const engagement = clamp(data.engagement);
      const overall = Math.round((pacing + dialogue + clarity + engagement) / 4);
      const tips = Array.isArray(data.tips)
        ? (data.tips as string[]).filter((t) => typeof t === "string" && t.trim().length > 0).slice(0, 5)
        : [];

      const chapterBreakdowns = Array.isArray(data.chapters)
        ? (data.chapters as Record<string, unknown>[]).slice(0, 30).map((ch) => ({
            chapterTitle: String(ch.chapterTitle || ""),
            pacing: clamp(ch.pacing), dialogue: clamp(ch.dialogue),
            clarity: clamp(ch.clarity), engagement: clamp(ch.engagement),
            tips: Array.isArray(ch.tips) ? (ch.tips as string[]).filter((t) => typeof t === "string").slice(0, 4) : [],
          }))
        : [];

      updateNovel({
        healthScore: { pacing, dialogue, clarity, engagement, overall, tips, chapterBreakdowns, generatedAt: new Date().toISOString() },
      });
      setHealthChapterIdx(0);
    } catch (err) {
      console.error("Health score generation failed:", err);
    } finally {
      setHealthScoreBusy(false);
    }
  }

  const THEME_COLORS = ["#a3e635", "#71717a", "#a1a1aa", "#52525b", "#6b7280", "#9ca3af", "#d4d4d8", "#737373"];

  async function runThematicScan() {
    if (!novel || !ensureStoryAiReady()) return;
    const chapters = novel.chapters.filter((ch) => (ch.content ?? "").trim().length > 50);
    if (chapters.length < 2) return;

    setThemeScanBusy(true);

    try {
      // Build chapter prose samples (trim each to keep prompt manageable)
      const chapterSamples = chapters.map((ch, i) => {
        const prose = extractProseFromContent(ch.content ?? "").slice(0, 600);
        const words = countWords(prose);
        return `Chapter ${i + 1} ("${ch.title || `Ch ${i + 1}`}", ~${words} words):\n${prose}`;
      }).join("\n\n---\n\n");

      const systemPrompt = [
        "You are an expert literary analyst specializing in thematic consistency across novels.",
        "You identify core themes from early chapters, then track their presence, absence, or contradiction through later chapters.",
        "Be specific — reference chapter numbers. Rate presence honestly.",
        "Respond ONLY with valid JSON.",
      ].join("\n");

      const userPrompt = [
        `Novel: "${novel.title}"`,
        `Genre: ${novel.storyBible.genre || "not specified"}`,
        `Total chapters: ${chapters.length}`,
        "",
        "CHAPTER SAMPLES:",
        chapterSamples,
        "",
        "TASK:",
        "1. Extract 3-6 core themes established in the first ~25% of chapters (e.g. betrayal, freedom, sacrifice, redemption, identity, power, loss).",
        "2. For EACH theme, scan EVERY chapter and classify its presence as: 'strong' (theme actively explored), 'moderate' (theme present but not central), 'absent' (theme not present), or 'contradicted' (text undermines the theme without purpose).",
        "3. If a theme is absent for 3+ consecutive chapters, note it as drift.",
        "4. Give an overall cohesion score (1-10) and a 1-2 sentence summary.",
        "",
        'Return JSON: { "themes": [{ "id": string (short kebab-case), "label": string (1-2 words), "description": string (how this theme manifests in this novel, 1 sentence), "chapterMap": [{ "chapter": number (1-based), "presence": "strong"|"moderate"|"absent"|"contradicted", "note": string (optional, 5-10 words) }], "driftWarning": string|null }], "overallCohesion": number (1-10), "summary": string }',
        "chapterMap must have one entry per chapter. themes should have 3-6 entries.",
      ].join("\n");

      const result = await requestOpenRouterJson(
        userPrompt,
        3000,
        { systemMessage: systemPrompt },
      );

      const res = result as Record<string, unknown> | null;
      if (!res) { setThemeScanBusy(false); return; }

      const rawThemes = Array.isArray(res.themes) ? (res.themes as Record<string, unknown>[]) : [];
      const themes: ThemeEntry[] = rawThemes
        .filter((t) => t && typeof t.label === "string")
        .slice(0, 6)
        .map((t, i) => {
          const chapterMap = Array.isArray(t.chapterMap)
            ? (t.chapterMap as Record<string, unknown>[])
                .filter((cm) => cm && typeof cm.chapter === "number")
                .map((cm) => ({
                  chapter: Number(cm.chapter),
                  presence: (["strong", "moderate", "absent", "contradicted"].includes(String(cm.presence)) ? String(cm.presence) : "absent") as ThemePresence,
                  note: typeof cm.note === "string" ? cm.note.slice(0, 60) : undefined,
                }))
            : [];
          return {
            id: typeof t.id === "string" ? t.id : `theme-${i}`,
            label: String(t.label).slice(0, 30),
            description: typeof t.description === "string" ? String(t.description).slice(0, 200) : "",
            color: THEME_COLORS[i % THEME_COLORS.length],
            chapterMap,
            driftWarning: typeof t.driftWarning === "string" && t.driftWarning ? t.driftWarning.slice(0, 200) : undefined,
          };
        });

      const analysis: ThematicAnalysis = {
        themes,
        overallCohesion: Math.max(1, Math.min(10, Math.round(Number(res.overallCohesion) || 5))),
        summary: typeof res.summary === "string" ? res.summary.slice(0, 400) : "",
        generatedAt: new Date().toISOString(),
      };

      updateNovel({ thematicAnalysis: analysis });
    } catch { /* ignore */ } finally {
      setThemeScanBusy(false);
    }
  }

  /* ─── The Editor (Overview) — specific sentence-level edits ─── */
  type OverviewEdit = {
    id: string;
    chapter: number;
    chapterTitle: string;
    reason: string;
    original: string;
    revised: string;
    status: "pending" | "accepted" | "dismissed";
  };

  async function runEditorScan() {
    if (!novel || !ensureStoryAiReady()) return;

    const chapters = novel.chapters.filter((ch) => (ch.content ?? "").trim().length > 50);
    if (chapters.length === 0) return;

    setNccBusy(true);
    setEditorFindings([]);
    setEditorSummary("");
    setEditorApplyDone(false);
    setEditorApplyCount(0);

    try {
      const charSummaries = novel.storyBible.characters.slice(0, 8).map((c) => {
        const parts = [`${c.name} (${c.role})`];
        if (c.speakingStyle) parts.push(`Voice: ${c.speakingStyle.slice(0, 60)}`);
        if (c.personality) parts.push(`Personality: ${c.personality.slice(0, 60)}`);
        return parts.join(" — ");
      }).join("\n");

      const sv = novel.storyBible.styleVoice;
      const styleContext = [
        sv?.pov ? `POV: ${sv.pov}` : "",
        sv?.tense ? `Tense: ${sv.tense}` : "",
        sv?.comps?.length ? `Comparable authors/style: ${sv.comps.slice(0, 5).join(", ")}` : "",
        sv?.voiceRules ? `Voice rules: ${sv.voiceRules.slice(0, 400)}` : "",
        sv?.bannedWords?.length ? `Banned words/phrases: ${sv.bannedWords.slice(0, 10).join(", ")}` : "",
      ].filter(Boolean).join("\n");

      const hs = novel.healthScore;
      const bpChapters = novel.storyBible.bookPlan?.chapters ?? [];
      const genreStr = novel.storyBible.summary?.genre?.join(", ") || "general fiction";

      const allEdits: OverviewEdit[] = [];

      for (let batchStart = 0; batchStart < chapters.length; batchStart += 2) {
        const batch = chapters.slice(batchStart, batchStart + 2);
        const chapterContent = batch.map((ch) => {
          const chapterNum = novel.chapters.findIndex((c) => c.id === ch.id) + 1;
          const prose = extractProseFromContent(ch.content ?? "").slice(0, 6000);
          const planCh = bpChapters.find((pc) => pc.manuscriptChapterId === ch.id);
          const synopsis = planCh?.synopsis ? `Synopsis: ${planCh.synopsis.slice(0, 200)}` : "";

          const healthBd = hs?.chapterBreakdowns?.[chapterNum - 1];
          let healthHint = "";
          if (healthBd) {
            const weak: string[] = [];
            if (healthBd.pacing <= 5) weak.push(`pacing (${healthBd.pacing}/10)`);
            if (healthBd.dialogue <= 5) weak.push(`dialogue (${healthBd.dialogue}/10)`);
            if (healthBd.clarity <= 5) weak.push(`clarity (${healthBd.clarity}/10)`);
            if (healthBd.engagement <= 5) weak.push(`engagement (${healthBd.engagement}/10)`);
            if (weak.length) healthHint = `WEAK AREAS: ${weak.join(", ")}`;
            if (healthBd.tips?.length) healthHint += `\nHealth tips: ${healthBd.tips.join("; ")}`;
          }

          return [
            `--- Chapter ${chapterNum}: "${ch.title || `Chapter ${chapterNum}`}" ---`,
            synopsis,
            healthHint,
            prose,
          ].filter(Boolean).join("\n");
        }).join("\n\n");

        setEditorApplyProgress(`Editing chapters ${batchStart + 1}–${Math.min(batchStart + 2, chapters.length)} of ${chapters.length}...`);

        const overallHealthHint = hs ? [
          `\nMANUSCRIPT HEALTH SCORES: Pacing ${hs.pacing}/10, Dialogue ${hs.dialogue}/10, Clarity ${hs.clarity}/10, Engagement ${hs.engagement}/10 (Overall ${hs.overall}/10).`,
          hs.tips?.length ? `Key issues: ${hs.tips.join("; ")}` : "",
          "PRIORITISE edits that address the lowest-scoring areas. A chapter scoring 4/10 on dialogue needs more attention than one scoring 8/10.",
        ].filter(Boolean).join("\n") : "";

        const systemPrompt = [
          `You are a world-class developmental and line editor working on a ${genreStr} novel.`,
          "You combine the eye of a publishing house editor with deep genre expertise.",
          "Your edits must make each passage NOTICEABLY better — not just shuffle words.",
          "",
          "EDIT PRIORITIES (in order):",
          "1. TELLING vs SHOWING — Replace emotional labels with action, body language, sensory detail",
          "2. WEAK DIALOGUE — Flat, expository, or unnatural speech. Make it sound like real people",
          "3. CLICHÉS & AI PATTERNS — Em dashes, 'a sense of', 'couldn't help but', 'the weight of'",
          "4. PACING — Overly long descriptions that slow momentum, or rushed scenes that need breathing room",
          "5. REDUNDANCY — Saying the same thing twice, stating what's already implied",
          "6. VAGUE PROSE — Abstract descriptions that could be concrete and specific",
          "7. VOICE DRIFT — Passages that break from the established style/tone",
          "",
          "Each original must be a VERBATIM quote from the text (a full sentence or clause).",
          "The revised version must be the same length or shorter. Never pad.",
          "Do NOT suggest structural changes, scene reordering, or plot changes.",
          "Return ONLY valid JSON.",
        ].join("\n");

        const userPrompt = [
          `Novel: "${novel.title}". Genre: ${genreStr}.`,
          styleContext ? `\nSTYLE RULES (follow these closely):\n${styleContext}` : "",
          `\nCharacters:\n${charSummaries || "None defined"}`,
          overallHealthHint,
          `\nManuscript:\n${chapterContent}`,
          `\nReturn JSON: { "edits": [ { "chapter": <chapter number>, "category": "<one of: show-dont-tell|dialogue|cliché|pacing|redundancy|vague|voice-drift|clarity>", "reason": "<brief reason — 1 sentence>", "original": "<exact verbatim quote>", "revised": "<your improved version>" } ] }`,
          `Find 8-15 edits per chapter. Focus heavily on the WEAK AREAS listed for each chapter. The original MUST be an exact quote that exists in the text.`,
        ].filter(Boolean).join("\n");

        try {
          const result = await requestOpenRouterJson(userPrompt, 6000, { systemMessage: systemPrompt });
          const res = result as Record<string, unknown> | null;
          if (res && Array.isArray(res.edits)) {
            for (const edit of (res.edits as Record<string, unknown>[]).slice(0, 30)) {
              const chNum = typeof edit.chapter === "number" ? edit.chapter : batchStart + 1;
              const chapter = novel.chapters[chNum - 1];
              if (!chapter) continue;
              const orig = String(edit.original || "").trim();
              const rev = String(edit.revised || "").trim();
              if (!orig || !rev || orig === rev) continue;
              if (isPlaceholderJunk(rev, orig)) continue;
              // Verify the original text actually exists in the chapter
              const chContent = chapter.content ?? "";
              if (!chContent.includes(orig)) continue;
              const cat = String(edit.category || "").trim();
              const catLabel = cat === "show-dont-tell" ? "Show don't tell"
                : cat === "dialogue" ? "Dialogue" : cat === "cliché" ? "Cliché"
                : cat === "pacing" ? "Pacing" : cat === "redundancy" ? "Redundancy"
                : cat === "vague" ? "Vague prose" : cat === "voice-drift" ? "Voice drift"
                : cat === "clarity" ? "Clarity" : "";
              allEdits.push({
                id: `edit-${Date.now()}-${allEdits.length}`,
                chapter: chNum,
                chapterTitle: chapter.title || `Chapter ${chNum}`,
                reason: (catLabel ? `[${catLabel}] ` : "") + String(edit.reason || "Improves prose").slice(0, 200),
                original: orig.slice(0, 500),
                revised: rev.slice(0, 500),
                status: "pending",
              });
            }
          }
        } catch (err) {
          if (err instanceof Error && (err.message === "__CANCELLED__" || err.name === "AbortError")) throw err;
        }
      }

      const summaryParts: string[] = [];
      if (allEdits.length > 0) {
        const chaptersCovered = new Set(allEdits.map((e) => e.chapter)).size;
        summaryParts.push(`Found ${allEdits.length} edit${allEdits.length !== 1 ? "s" : ""} across ${chaptersCovered} chapter${chaptersCovered !== 1 ? "s" : ""}.`);
        if (hs) summaryParts.push(`Targeted your weakest areas (health score: ${hs.overall}/10).`);
        summaryParts.push(`Review each change — accept the ones that improve your writing.`);
      } else {
        summaryParts.push("No specific edits suggested. Your prose is in good shape.");
      }

      setEditorFindings(allEdits);
      setEditorSummary(summaryParts.join(" "));
      setEditorScannedAt(new Date().toISOString());
      setEditorApplyProgress("");
    } catch { /* ignore */ } finally {
      setNccBusy(false);
    }
  }

  function applyOverviewEdits() {
    if (!novel) return;
    const accepted = editorFindings.filter((e) => e.status === "accepted");
    if (accepted.length === 0) return;

    setEditorApplying(true);
    let applied = 0;

    // Group by chapter
    const byChapter = new Map<number, OverviewEdit[]>();
    for (const edit of accepted) {
      if (!byChapter.has(edit.chapter)) byChapter.set(edit.chapter, []);
      byChapter.get(edit.chapter)!.push(edit);
    }

    let skipped = 0;
    for (const [chapterNum, edits] of byChapter.entries()) {
      const chapter = novel.chapters[chapterNum - 1];
      if (!chapter) continue;
      let content = chapter.content ?? "";
      for (const edit of edits) {
        if (content.includes(edit.original)) {
          content = content.replace(edit.original, edit.revised);
          applied++;
        } else {
          skipped++;
        }
      }
      updateChapter(chapter.id, { content });
    }

    setEditorApplyCount(applied);
    setEditorApplying(false);
    setEditorApplyDone(true);
    if (skipped > 0) {
      setEditorApplyProgress(`${applied} applied, ${skipped} skipped (text changed since scan)`);
    }
    saveNow();
  }

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
    const labels: Record<string, string> = { summary: "summary", styleVoice: "style & voice", characters: "all characters", locations: "all locations", worldbuilding: "worldbuilding", boltons: "all bolt-ons" };
    setRegenConfirm({
      message: `This will clear ${labels[section] || "this section"}. This cannot be undone.`,
      onConfirm: () => { setRegenConfirm(null); executeClearBibleSection(section); },
    });
  }

  function executeClearBibleSection(section: typeof bibleSection) {
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
    // Force immediate server save so the clear persists even if user navigates away quickly
    flushServerSave();
  }

  /** Push a content+blocks snapshot onto the undo stack for a chapter (max 20 entries).
   *  immediate=true bypasses debounce (use for AI/programmatic changes). */
  function pushUndoSnapshot(chapterId: string, content: string, blocks?: SceneBlock[], immediate?: boolean) {
    const doSnapshot = () => {
      const stack = chapterUndoHistory.current[chapterId] ?? [];
      const top = stack.length > 0 ? stack[stack.length - 1] : null;
      if (top && top.content === content) return;
      stack.push({ content, sceneBlocks: blocks ? blocks.map(b => ({ ...b })) : undefined });
      if (stack.length > 20) stack.shift();
      chapterUndoHistory.current[chapterId] = stack;
      lastSnapshotContent.current[chapterId] = content;
      if (chapterId === activeChapterId) setCanUndo(stack.length > 0);
    };

    if (immediate) {
      if (undoSnapshotTimer.current) { clearTimeout(undoSnapshotTimer.current); undoSnapshotTimer.current = null; }
      doSnapshot();
      return;
    }

    // Debounce: only snapshot after 1s pause in typing
    if (undoSnapshotTimer.current) clearTimeout(undoSnapshotTimer.current);
    undoSnapshotTimer.current = setTimeout(doSnapshot, 1000);
  }

  /** Pop the most recent undo snapshot for the active chapter. */
  function handleUndo() {
    if (!activeChapterId) return;
    // Flush any pending debounced snapshot first so we don't lose it
    if (undoSnapshotTimer.current) {
      clearTimeout(undoSnapshotTimer.current);
      undoSnapshotTimer.current = null;
      // Push current state before undoing
      if (novel) {
        const ch = novel.chapters.find(c => c.id === activeChapterId);
        if (ch) {
          const stack = chapterUndoHistory.current[activeChapterId] ?? [];
          const top = stack.length > 0 ? stack[stack.length - 1] : null;
          if (!top || top.content !== ch.content) {
            stack.push({ content: ch.content, sceneBlocks: ch.sceneBlocks?.map(b => ({ ...b })) });
            if (stack.length > 20) stack.shift();
            chapterUndoHistory.current[activeChapterId] = stack;
          }
        }
      }
    }
    const stack = chapterUndoHistory.current[activeChapterId];
    if (!stack || stack.length === 0) return;
    const snapshot = stack.pop()!;
    chapterUndoHistory.current[activeChapterId] = stack;
    lastSnapshotContent.current[activeChapterId] = snapshot.content;
    setCanUndo(stack.length > 0);
    // Apply both content and sceneBlocks without pushing to undo
    mutateNovel((current) => {
      const now = new Date().toISOString();
      return {
        ...current,
        chapters: current.chapters.map((ch) =>
          ch.id === activeChapterId
            ? {
                ...ch,
                content: snapshot.content,
                ...(snapshot.sceneBlocks ? { sceneBlocks: snapshot.sceneBlocks } : {}),
                updatedAt: now,
              }
            : ch
        ),
      };
    });
    saveNow();
  }

  function updateChapter(
    chapterId: string,
    patch: { title?: string; subtitle?: string; content?: string; goalWords?: number; sceneBlocks?: SceneBlock[] },
    immediateUndo?: boolean,
  ) {
    // If content or sceneBlocks are changing, save current state to undo history
    if ((typeof patch.content === "string" || patch.sceneBlocks) && novel) {
      const existing = novel.chapters.find((c) => c.id === chapterId);
      if (existing) {
        const contentChanged = typeof patch.content === "string" && existing.content !== patch.content;
        const blocksChanged = !!patch.sceneBlocks;
        if (contentChanged || blocksChanged) {
          pushUndoSnapshot(chapterId, existing.content, existing.sceneBlocks, immediateUndo);
        }
      }
    }

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

  /**
   * Compress & resize a cover image to keep it under ~150KB as a JPEG data URL.
   * This prevents localStorage quota overflow — raw photos can be 2-5MB+ as base64.
   */
  function compressCoverImage(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        // Max dimensions for a book cover thumbnail
        const MAX_W = 600;
        const MAX_H = 900;
        let { width, height } = img;
        if (width > MAX_W || height > MAX_H) {
          const scale = Math.min(MAX_W / width, MAX_H / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas not supported")); return; }
        ctx.drawImage(img, 0, 0, width, height);
        // Compress to JPEG at 0.7 quality — typically results in 50-150KB
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        resolve(dataUrl);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Failed to load image")); };
      img.src = url;
    });
  }

  /** Open the user's email client with a polished plain-text invitation. */
  function openShareEmailInClient() {
    if (!shareResult || !novel) return;
    const novelTitle = novel.title || "Untitled Novel";
    const pw = sharePassword.trim();
    const expiryDate = new Date(shareResult.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    const authorName = novel.authorName?.trim() || "";

    const subject = `You're invited to review "${novelTitle}" on Blocwrite`;

    const lines: string[] = [
      `Hi,`,
      "",
      `I'd love your feedback on my manuscript. I've shared it with you on Blocwrite, where you can read it, leave comments, and share your thoughts.`,
      "",
      "",
      `${novelTitle}`,
      authorName ? `by ${authorName}` : "",
      "",
      "",
      `Read & review here:`,
      shareResult.url,
      "",
    ];

    if (pw) {
      lines.push(
        `Password: ${pw}`,
        "",
      );
    } else if (shareResult.hasPassword) {
      lines.push(
        `(This manuscript is password protected - I'll send the password separately.)`,
        "",
      );
    }

    lines.push(
      "",
      `How it works:`,
      `1. Open the link above`,
      pw ? `2. Enter the password when prompted` : `2. Start reading`,
      `3. Highlight any text to leave a note`,
      `4. Hit submit when you're done`,
      "",
      `Your feedback goes straight to me and helps shape the final draft.`,
      "",
      `This link expires on ${expiryDate}.`,
      "",
      "",
      `Sent via Blocwrite - blocwrite.com`,
    );

    const body = lines.filter((l) => l !== undefined).join("\n");
    const recipient = shareRecipientEmail.trim();
    const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, "_blank");
  }

  function handleCoverUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      event.target.value = "";
      return;
    }
    // Reject files over 5 MB — even after compression they may cause issues
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_FILE_SIZE) {
      setAutosaveStatus({
        status: "error",
        message: "Image too large (max 5 MB). Please use a smaller file.",
        at: new Date().toISOString(),
      });
      event.target.value = "";
      return;
    }

    compressCoverImage(file)
      .then((dataUrl) => updateNovel({ coverImage: dataUrl }))
      .catch((err) => {
        console.warn("Cover upload failed:", err);
        setAutosaveStatus({
          status: "error",
          message: "Cover upload failed. Try a different image.",
          at: new Date().toISOString(),
        });
      });
    event.target.value = "";
  }

  /* ─── The Editor: chunked-burst approach (8 paragraphs per call) ─── */

  const EDITOR_CHUNK = 8; // paragraphs per AI call — increased for better context coherence

  function getEditorContext() {
    if (!activeChapter || !novel) return null;
    const baseContent = contentForExport(activeChapter.content);
    const paragraphs = baseContent.split(/\n\n+/).filter((p) => p.trim());
    const summary = novel.storyBible.summary;
    const genreStr = (summary.genre ?? []).join(", ") || "Fiction";
    const bpChapters = novel.storyBible.bookPlan?.chapters ?? [];
    const ci = novel.chapters.findIndex((c) => c.id === activeChapter.id);
    const planCh = bpChapters.find((pc) => pc.manuscriptChapterId === activeChapter.id) ?? bpChapters[ci];
    const synopsis = planCh?.synopsis?.trim() || activeChapter.subtitle?.trim() || "";
    const lower = baseContent.toLowerCase();

    // Characters: combine plan-tagged + text-mentioned (no false positives for tagged chars)
    const planCharIds = new Set(planCh?.characterIds ?? []);
    const allChars = novel.storyBible.characters ?? [];
    const charsInChapter = allChars.filter((c) =>
      (c.name && lower.includes(c.name.toLowerCase())) || planCharIds.has(c.id)
    );
    const charNames = charsInChapter.map((c) => c.name);
    const charDetails = charsInChapter
      .map((c) => {
        const parts = [`${c.name} (${c.role || ""})`];
        if (planCharIds.has(c.id)) parts.push("[tagged to this chapter]");
        if (c.logline) parts.push(c.logline.slice(0, 80));
        if (c.speakingStyle) parts.push(`Speech: ${c.speakingStyle.slice(0, 60)}`);
        if (c.accent) parts.push(`Accent: ${c.accent.slice(0, 40)}`);
        return parts.join(" — ");
      }).join("\n  ");

    // Locations: combine plan-tagged + text-mentioned
    const planLocIds = new Set(planCh?.locationIds ?? []);
    const allLocs = novel.storyBible.locations ?? [];
    const locsInChapter = allLocs.filter((l) =>
      (l.name && lower.includes(l.name.toLowerCase())) || planLocIds.has(l.id)
    );
    const locNames = locsInChapter.map((l) => l.name);
    const locDetails = locsInChapter
      .map((l) => `${l.name}${planLocIds.has(l.id) ? " [tagged to this chapter]" : ""}: ${(l.description || "").slice(0, 80)}`)
      .join("\n  ");

    // Adjacent chapter context — crucial for continuity checks
    const prevChapter = ci > 0 ? novel.chapters[ci - 1] : null;
    const nextChapter = ci + 1 < novel.chapters.length ? novel.chapters[ci + 1] : null;
    const prevPlanCh = prevChapter ? bpChapters.find((pc) => pc.manuscriptChapterId === prevChapter.id) : null;
    const nextPlanCh = nextChapter ? bpChapters.find((pc) => pc.manuscriptChapterId === nextChapter.id) : null;

    const prevChapterInfo = prevChapter ? [
      `Previous chapter: "${prevChapter.title}"`,
      prevPlanCh?.synopsis ? `Synopsis: ${prevPlanCh.synopsis.slice(0, 200)}` : "",
      (() => { const prose = contentForExport(prevChapter.content); return prose ? `Ends with: "${prose.slice(-400)}"` : ""; })(),
    ].filter(Boolean).join("\n") : "";

    const nextChapterInfo = nextChapter ? [
      `Next chapter: "${nextChapter.title}"`,
      nextPlanCh?.synopsis ? `Synopsis: ${nextPlanCh.synopsis.slice(0, 200)}` : "",
    ].filter(Boolean).join("\n") : "";

    // Style/voice rules
    const sv = novel.storyBible.styleVoice;
    const styleRules: string[] = [];
    if (sv.pov) styleRules.push(`POV: ${sv.pov}`);
    if (sv.tense) styleRules.push(`Tense: ${sv.tense}`);
    if (sv.comps?.length) styleRules.push(`Style: ${sv.comps.slice(0, 5).join(", ")}`);
    if (sv.voiceRules) styleRules.push(`Voice & style rules (FOLLOW CLOSELY): ${sv.voiceRules.slice(0, 600)}`);
    if (sv.bannedWords?.length) styleRules.push(`Banned words: ${sv.bannedWords.slice(0, 8).join(", ")}`);
    const styleInfo = styleRules.length > 0 ? styleRules.join(". ") + "." : "";

    // Story position
    const totalChapters = novel.chapters.length;
    const chapterNumber = ci + 1;

    /* Rich context for the editor — includes story position, characters, locations, style, adjacent chapters */
    const briefParts = [
      `${genreStr} novel. Chapter ${chapterNumber}/${totalChapters}: "${activeChapter.title || "Untitled"}".`,
      synopsis ? `Chapter synopsis: ${synopsis.slice(0, 250)}` : "",
      charDetails ? `Characters in this chapter:\n  ${charDetails}` : "",
      locDetails ? `Locations in this chapter:\n  ${locDetails}` : "",
      styleInfo ? `Style rules: ${styleInfo}` : "",
      prevChapterInfo,
      nextChapterInfo,
    ].filter(Boolean);
    const brief = briefParts.join("\n");

    return {
      paragraphs,
      brief,
      genreStr,
      charNames,
      locNames,
      chapterNumber,
      totalChapters,
      wordCount: paragraphs.reduce((sum, p) => sum + countWords(p), 0),
    };
  }

  /** Words that indicate the AI echoed our placeholder instead of writing actual revised text */
  const PLACEHOLDER_JUNK = new Set([
    "revised", "revised paragraph", "revised text", "revised version",
    "corrected", "corrected paragraph", "corrected text", "fixed", "fixed paragraph",
    "polished", "polished paragraph", "polished text", "improved", "improved paragraph",
    "the complete rewritten paragraph text", "the complete revised paragraph text",
    "the entire revised paragraph", "full revised paragraph",
  ]);
  /** Returns true if text looks like AI returned junk instead of actual content */
  function isPlaceholderJunk(text: string, original: string): boolean {
    const t = text.toLowerCase().trim();
    if (PLACEHOLDER_JUNK.has(t)) return true;
    // Mostly just the word "revised" repeated
    if (/^(revised\s*)+$/i.test(t)) return true;
    // Extremely short compared to original — likely placeholder
    if (text.length < Math.min(20, original.length * 0.1) && text.split(/\s+/).length < 4) return true;
    // Contains only generic placeholder words
    if (/^(the\s+)?(revised|corrected|fixed|polished|improved|updated)\s*(paragraph|text|version|content)?\.?$/i.test(t)) return true;
    return false;
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
      "",
      "Return ONLY changed paragraphs as a JSON object. Omit paragraphs that need no changes.",
      "",
      "Format (p = paragraph index number from the brackets):",
      `{"edits":[{"p":<index>,"text":"<FULL paragraph with fix applied>","reason":"<what you changed>"}]}`,
      "",
      "ABSOLUTE REQUIREMENTS FOR THE \"text\" FIELD:",
      "- It MUST contain the ENTIRE paragraph — every word, every sentence from the original, with ONLY your correction applied",
      "- It must be hundreds of characters long (same length as the original paragraph)",
      "- NEVER write just one word like 'revised' or 'corrected' — that is WRONG",
      "- NEVER summarize — always output the complete paragraph text",
      "- If you cannot fix it properly, omit that paragraph from edits",
      "If no paragraphs need changes, return: {\"edits\":[]}",
      "",
      numbered,
    ].join("\n");

    // Give enough tokens for paragraphs to be returned in full
    const avgParaLen = paragraphs.reduce((s, p) => s + p.length, 0) / Math.max(1, paragraphs.length);
    const estimatedTokensPerPara = Math.ceil(avgParaLen / 3); // rough char-to-token ratio
    const maxTokens = Math.min(4000, Math.max(600, paragraphs.length * estimatedTokensPerPara));

    const data = await requestOpenRouterJson<{
      edits?: Array<{ p?: number; text?: string; reason?: string }>;
    }>(prompt, maxTokens, { timeoutMs: 300000, systemMessage: sysMsg });

    const edits = Array.isArray(data?.edits) ? data.edits : [];
    const changes: EditorChange[] = [];
    for (const e of edits) {
      const idx = typeof e.p === "number" ? e.p : -1;
      const text = typeof e.text === "string" ? e.text.trim() : "";
      const localIdx = idx - startIdx;
      if (localIdx < 0 || localIdx >= paragraphs.length || !text) continue;
      // Skip if text is unchanged
      if (text === paragraphs[localIdx].trim()) continue;
      // Skip placeholder junk — AI echoed our example instead of writing actual text
      if (isPlaceholderJunk(text, paragraphs[localIdx])) continue;
      // Skip edits that changed too much — more than 20% word count difference means the AI rewrote instead of fixing
      const origWords = paragraphs[localIdx].split(/\s+/).filter(Boolean).length;
      const revWords = text.split(/\s+/).filter(Boolean).length;
      if (origWords > 5 && Math.abs(revWords - origWords) / origWords > 0.2) continue;
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

  async function runEditorPass(mode: EditorMode, targetedFocus?: TargetedFocus, editorTab?: string) {
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

    /* ─── Tab-specific system messages and task lines ─── */
    const tab = editorTab || "grammar";

    try {
      if (tab === "threadkeeper" || tab === "consistency") {
        /* ═══ CONSISTENCY — report mode: deep story-aware analysis ═══ */
        const sysMsg = [
          `You are a professional continuity editor for a ${ctx.genreStr} novel.`,
          `You have deep knowledge of the story context:`,
          ctx.brief,
          "",
          "Your job is to catch REAL continuity and consistency errors — things a reader would notice.",
          "",
          "IMPORTANT — DO NOT flag these as issues:",
          "- Characters marked [tagged to this chapter] BELONG here. Do NOT question their presence.",
          "- A character appearing in prose who is tagged to this chapter is CORRECT, even if they aren't in the synopsis text.",
          "- Stylistic choices, prose quality, or writing preferences are NOT continuity issues.",
          "- Minor details that don't affect the reader's understanding.",
          "",
          "ONLY flag these genuine problems:",
          "1. CONTRADICTIONS — A character does something impossible given what happened earlier (e.g. uses a broken hand, is in two places at once).",
          "2. TIMELINE ERRORS — Events happen in the wrong order, impossible time gaps, day becomes night without transition.",
          "3. DISAPPEARING/APPEARING — A character vanishes mid-scene without leaving, or appears without arriving.",
          "4. NAME CONFUSION — Wrong name used for a character, pronoun referring to the wrong person.",
          "5. LOCATION BREAKS — Setting changes without any transition or movement.",
          "6. POV SLIPS — Narration breaks out of the established POV to reveal another character's inner thoughts.",
          "7. ADJACENT CHAPTER CLASHES — Does this chapter's opening contradict how the previous chapter ended?",
          "",
          "Be VERY selective. Only flag issues a careful reader would genuinely notice. Quality over quantity.",
        ].join("\n");

        const allIssues: EditorialIssue[] = [];

        for (let c = 0; c < totalChunks; c++) {
          const start = c * EDITOR_CHUNK;
          const slice = ctx.paragraphs.slice(start, start + EDITOR_CHUNK);
          const numbered = slice.map((p, i) => `[${start + i}] ${p}`).join("\n\n");
          setEditorLoadingPhase(`Checking consistency ${c + 1}/${totalChunks}...`);

          const prompt = [
            "Analyse these paragraphs for consistency issues. Return ONLY valid JSON:",
            `{"issues":[{"severity":"high|medium|low","category":"Character Placement|Location|Timeline|Names|POV|Continuity|Behaviour","quote":"exact quote from text","issue":"clear description","suggestion":"specific fix"}]}`,
            "Max 5 issues for this section. Evidence-based only — quote the problematic text.",
            "high = reader will definitely notice, medium = attentive reader catches it, low = minor but worth fixing.",
            "If no issues: {\"issues\":[]}",
            "",
            numbered,
          ].join("\n");

          try {
            const data = await requestOpenRouterJson<{ issues?: EditorialIssue[] }>(
              prompt, 600, { timeoutMs: 300000, systemMessage: sysMsg },
            );
            if (Array.isArray(data?.issues)) allIssues.push(...data.issues);
          } catch {
            /* If one chunk fails, continue with the rest */
          }
        }

        setEditorResult({
          mode: "report",
          issues: allIssues,
          summary: allIssues.length > 0
            ? `Found ${allIssues.length} consistency issue${allIssues.length !== 1 ? "s" : ""} across the chapter.`
            : "No consistency issues found. Characters, locations, and timeline are coherent.",
        });

      } else if (tab === "grammar") {
        /* ═══ GRAMMAR & STYLE — fix real errors, no creative changes ═══ */
        const sysMsg = [
          `You are a grammar-only proofreader for a ${ctx.genreStr} novel.`,
          "You are NOT a style editor. You do NOT improve prose quality, flow, or readability. You ONLY fix errors.",
          ctx.brief,
          "",
          "ABSOLUTE RULES — NEVER BREAK THESE:",
          "- You may ONLY change 1-3 words per paragraph to fix a genuine error",
          "- The corrected paragraph MUST be 95%+ identical to the original",
          "- If your revised text is more than 10% longer or shorter than the original, you changed TOO MUCH — revert and make a smaller fix",
          "- NEVER rewrite sentences for style, flow, clarity, or preference",
          "- NEVER restructure, combine, or split sentences",
          "- NEVER change the author's voice, word choices, or creative decisions",
          "- NEVER change dialogue speech patterns, dialect, or slang",
          "- NEVER add new words, phrases, or descriptions that weren't there",
          "- If a paragraph has no genuine grammar errors, DO NOT include it — skip it entirely",
          "",
          "What counts as an error (fix ONLY these):",
          "1. SPELLING — Actual misspellings only (not intentional dialect/accent)",
          "2. PUNCTUATION — Missing or wrong punctuation, dialogue tag errors",
          "3. TENSE AGREEMENT — Unintentional tense shifts only",
          "4. WORD USAGE — Wrong word, homophones (their/there/they're)",
          "5. SUBJECT-VERB AGREEMENT — 'he were' → 'he was' etc",
          "",
          "OUTPUT: Return JSON with edits. Each edit must contain the COMPLETE paragraph with ONLY the error fix applied. Every other word must be WORD-FOR-WORD identical to the original. Never use placeholder words like 'revised'.",
        ].join("\n");

        const taskLine = "Fix ONLY grammar, spelling, and punctuation errors. Make the SMALLEST possible change — fix the error word(s) and leave EVERYTHING else word-for-word identical. NEVER rewrite or restructure. Return the FULL paragraph text with ONLY the fix applied.";

        const allChanges: EditorChange[] = [];

        for (let c = 0; c < totalChunks; c++) {
          const start = c * EDITOR_CHUNK;
          const slice = ctx.paragraphs.slice(start, start + EDITOR_CHUNK);
          setEditorLoadingPhase(`Checking grammar ${c + 1}/${totalChunks}...`);

          try {
            const chunkChanges = await editorChunkCall(slice, start, sysMsg, taskLine);
            allChanges.push(...chunkChanges);
            setEditorResult({
              mode: "quick-fix",
              changes: [...allChanges],
              summary: `Checked ${Math.min((c + 1) * EDITOR_CHUNK, totalParas)}/${totalParas} paragraphs — ${allChanges.length} correction${allChanges.length !== 1 ? "s" : ""} so far...`,
            });
          } catch { /* continue */ }
        }

        setEditorResult({
          mode: "quick-fix",
          changes: allChanges,
          summary: allChanges.length > 0
            ? `${allChanges.length} grammar/style correction${allChanges.length !== 1 ? "s" : ""} found.`
            : "No grammar or spelling errors found. Chapter is clean.",
        });

      } else {
        /* ═══ FINAL POLISH — elevate prose quality ═══ */
        const sysMsg = [
          `You are a world-class literary editor doing a final polish on a ${ctx.genreStr} novel.`,
          ctx.brief,
          "",
          "Your job is to elevate the prose to publication standard while preserving the author's voice:",
          "1. SENTENCE VARIETY — Vary sentence length and structure (short punchy + longer flowing)",
          "2. WEAK VERBS — Replace was/were/had constructions with active, specific verbs where possible",
          "3. FILLER — Cut unnecessary words: 'very', 'really', 'just', 'that', 'seemed to', 'began to'",
          "4. SHOWING VS TELLING — Convert 'She was angry' to show anger through action/dialogue where natural",
          "5. REPEATED OPENINGS — Consecutive paragraphs starting the same way",
          "6. CLICHÉS — Replace tired phrases with fresh language",
          "7. PROSE RHYTHM — Ensure the rhythm matches the scene's emotional beat",
          "",
          "CRITICAL RULES:",
          "- NEVER add new plot, characters, or information",
          "- NEVER use AI-sounding phrases: 'a testament to', 'palpable', 'couldn't help but', 'sent a shiver'",
          "- NEVER add em dashes where the author hasn't used them",
          "- Preserve the author's voice — tighten, don't transform",
          "- Changes should be subtle improvements, not rewrites",
          "- Only change paragraphs that genuinely benefit from polish",
          "",
          "OUTPUT FORMAT: Return JSON with edits. Each edit must contain the COMPLETE polished paragraph text — every word, every sentence. Never use placeholders like 'revised' or 'polished' — always output the full paragraph with your improvements applied.",
        ].join("\n");

        const taskLine = "Polish prose to publication standard. Tighten, vary rhythm, strengthen verbs, cut filler. Subtle improvements only — preserve voice. Do NOT invent anything. Return the FULL polished paragraph text for each edit.";

        const allChanges: EditorChange[] = [];

        for (let c = 0; c < totalChunks; c++) {
          const start = c * EDITOR_CHUNK;
          const slice = ctx.paragraphs.slice(start, start + EDITOR_CHUNK);
          setEditorLoadingPhase(`Polishing ${c + 1}/${totalChunks}...`);

          try {
            const chunkChanges = await editorChunkCall(slice, start, sysMsg, taskLine);
            allChanges.push(...chunkChanges);
            setEditorResult({
              mode: "quick-fix",
              changes: [...allChanges],
              summary: `Polished ${Math.min((c + 1) * EDITOR_CHUNK, totalParas)}/${totalParas} paragraphs — ${allChanges.length} improvement${allChanges.length !== 1 ? "s" : ""} so far...`,
            });
          } catch { /* continue */ }
        }

        setEditorResult({
          mode: "quick-fix",
          changes: allChanges,
          summary: allChanges.length > 0
            ? `${allChanges.length} polish improvement${allChanges.length !== 1 ? "s" : ""} suggested.`
            : "Chapter prose is already at a strong standard. No improvements needed.",
        });
      }
    } catch (err) {
      if (isCancelledError(err)) { setEditorLoadingPhase(null); return; }
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

    const sysMsg = `Professional ${ctx.genreStr} editor. Fix ONLY the listed issues below — nothing else. Preserve the author's voice completely. CRITICAL: When returning edits in JSON, the "text" field MUST contain the ENTIRE paragraph text — every single word and sentence, with ONLY the issue fixed. NEVER output placeholder words like "revised", "fixed", "corrected" etc. NEVER output just one word. Always output the FULL paragraph.`;
    const allChanges: EditorChange[] = [];

    try {
      for (let c = 0; c < totalChunks; c++) {
        const start = c * EDITOR_CHUNK;
        const slice = ctx.paragraphs.slice(start, start + EDITOR_CHUNK);
        const numbered = slice.map((p, i) => `[${start + i}] ${p}`).join("\n\n");
        setEditorLoadingPhase(`Fixing ${c + 1}/${totalChunks}...`);

        const prompt = [
          "Fix ONLY these specific issues in the paragraphs below. Do not change anything else.",
          "",
          "Return a JSON object with your edits.",
          `{"edits":[{"p":<index>,"text":"<FULL paragraph with fix applied>","reason":"<which issue this fixes>"}]}`,
          "",
          "ABSOLUTE REQUIREMENTS FOR THE \"text\" FIELD:",
          "- It MUST contain the ENTIRE paragraph — every word, every sentence, with ONLY the issue fixed",
          "- It must be hundreds of characters long (same length as the original)",
          "- NEVER write just one word like 'revised' or 'fixed' — that is WRONG",
          "- NEVER summarize — always output the complete paragraph text",
          "Omit unchanged paragraphs. If none are affected: {\"edits\":[]}",
          "",
          `Issues to fix:\n${issueList}`,
          "",
          numbered,
        ].join("\n");

        const avgLen = slice.reduce((s, p) => s + p.length, 0) / Math.max(1, slice.length);
        const fixMaxTokens = Math.min(4000, Math.max(600, slice.length * Math.ceil(avgLen / 3)));

        try {
          const data = await requestOpenRouterJson<{
            edits?: Array<{ p?: number; text?: string; reason?: string }>;
          }>(prompt, fixMaxTokens, { timeoutMs: 300000, systemMessage: sysMsg });

          const edits = Array.isArray(data?.edits) ? data.edits : [];
          for (const e of edits) {
            const idx = typeof e.p === "number" ? e.p : -1;
            const text = typeof e.text === "string" ? e.text.trim() : "";
            const localIdx = idx - start;
            if (localIdx < 0 || localIdx >= slice.length || !text) continue;
            if (text === slice[localIdx].trim()) continue;
            // Skip placeholder junk
            if (isPlaceholderJunk(text, slice[localIdx])) continue;
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
      if (isCancelledError(err)) { setEditorLoadingPhase(null); return; }
      setEditorResult(null);
      setEditorError(err instanceof Error ? err.message : "Failed to fix issues. Try again.");
    } finally {
      setEditorLoadingPhase(null);
    }
  }

  /* ── ThreadKeeper AI handler — Layer 2 & 3 checks ── */
  async function runThreadKeeperAiCheck(
    categoryId: ThreadKeeperCategoryId,
    context: {
      chapterProse: string;
      prevChapterProse: string;
      nextChapterProse: string;
      canonSummary: string;
    },
  ): Promise<ThreadKeeperIssue[]> {
    if (!novel || !ensureStoryAiReady()) return [];

    const CATEGORY_PROMPTS: Record<string, { system: string; task: string; categoryLabel: string }> = {
      "state-drift": {
        categoryLabel: "State Drift",
        system: `You are a continuity checker for a single novel. Focus ONLY on the current chapter provided. Use the previous/next chapter excerpts ONLY as context for detecting contradictions within this chapter. Do NOT report issues that exist solely in other chapters.`,
        task: `Find state drift issues WITHIN THIS CHAPTER: injuries that heal without mention, characters who die then reappear, possession of items changing without explanation, conditions (pregnant, sick, imprisoned) that vanish. Only flag genuine contradictions visible in the current chapter text. If the chapter has no contradictions, return empty.`,
      },
      "timeline": {
        categoryLabel: "Timeline Error",
        system: `You are a continuity checker for a single novel. Focus ONLY on the current chapter provided. Use the previous/next chapter excerpts ONLY as context for detecting contradictions within this chapter.`,
        task: `Find timeline issues WITHIN THIS CHAPTER: impossible time jumps, characters traveling too fast between locations, events referenced before they happen, day/night contradictions. Only flag genuine issues visible in the current chapter text. If there are no issues, return empty.`,
      },
      "relationships": {
        categoryLabel: "Relationship Inconsistency",
        system: `You are a continuity checker for a single novel. Focus ONLY on the current chapter provided. Use the canon and previous chapter ONLY as context for understanding established relationship states.`,
        task: `Find relationship issues WITHIN THIS CHAPTER: characters acting deeply in love after a breakup with no reconciliation scene, enemies suddenly friendly, betrayals forgotten. Flag missing emotional transitions. Only flag issues visible in the current chapter text. If there are no issues, return empty.`,
      },
      "knowledge": {
        categoryLabel: "Knowledge Violation",
        system: `You are a continuity checker for a single novel. Focus ONLY on the current chapter provided. Use the canon info to understand what each character should and shouldn't know.`,
        task: `Find knowledge violations WITHIN THIS CHAPTER: a character references information only another character knows, secrets mentioned before being revealed, deductions made without evidence. Only flag genuine impossible knowledge visible in the current chapter text. If there are no issues, return empty.`,
      },
      "spatial-logic": {
        categoryLabel: "Spatial Logic Error",
        system: `You are a continuity checker for a single novel. Focus ONLY on the current chapter provided. Check physical/spatial consistency within this chapter's scenes.`,
        task: `Find spatial issues WITHIN THIS CHAPTER: characters speaking after exiting a scene, people in rooms they never entered, physical impossibilities (facing wrong direction, grabbing with injured hand). Only flag genuine errors visible in the current chapter text. If there are no issues, return empty.`,
      },
      "emotional-arc": {
        categoryLabel: "Emotional Arc Break",
        system: `You are a continuity checker for a single novel. Focus ONLY on the current chapter provided. Use previous chapter context only to understand the emotional state characters should be in.`,
        task: `Find emotional arc issues WITHIN THIS CHAPTER: intense grief that vanishes within the same scene, fear of something suddenly forgotten, joy that's unrealistic given recent trauma. Is the character reacting proportionally? Only flag issues visible in the current chapter text. If there are no issues, return empty.`,
      },
      "setup-payoff": {
        categoryLabel: "Setup / Payoff",
        system: `You are a continuity checker for a single novel. Focus ONLY on the current chapter provided. Use previous/next chapter excerpts as context only.`,
        task: `Find setup/payoff issues WITHIN THIS CHAPTER: things that resolve without being set up earlier in this chapter, dramatic events that get no follow-through within the chapter, internal contradictions in the narrative. Only flag issues visible in the current chapter text. If there are no issues, return empty.`,
      },
      "voice-drift": {
        categoryLabel: "Voice Drift",
        system: `You are a continuity checker for a single novel. Focus ONLY on the current chapter provided. Use the canon's character speech styles as reference.`,
        task: `Find voice drift WITHIN THIS CHAPTER: formal character suddenly using slang, shy character becoming aggressive without catalyst, accent inconsistencies in dialogue, vocabulary level shifts. Only flag clear voice breaks visible in the current chapter text, not subtle variation. If there are no issues, return empty.`,
      },
    };

    const config = CATEGORY_PROMPTS[categoryId];
    if (!config) return [];

    const prevSnippet = context.prevChapterProse ? `PREVIOUS CHAPTER (ending):\n${context.prevChapterProse.slice(-1500)}` : "No previous chapter.";
    const nextSnippet = context.nextChapterProse ? `NEXT CHAPTER (opening):\n${context.nextChapterProse.slice(0, 800)}` : "No next chapter.";

    const sysMsg = [
      config.system,
      "",
      "IMPORTANT: Characters and locations listed as 'tagged to this chapter' or 'expected to appear' BELONG in this chapter. Do NOT flag their presence as an issue.",
      "Only flag GENUINE contradictions, impossibilities, or breaks that a reader would notice.",
      "",
      "CANON CONTEXT:",
      context.canonSummary,
      "",
      prevSnippet,
      "",
      nextSnippet,
    ].join("\n");

    const prompt = [
      config.task,
      "",
      "Return ONLY valid JSON:",
      `{"issues":[{"severity":"high|medium|low","quote":"exact quote from text","issue":"clear description","suggestion":"specific actionable fix"}]}`,
      "Max 5 issues. Evidence-based only — quote the problematic text. If none: {\"issues\":[]}",
      "high = reader will definitely notice. medium = attentive reader catches. low = minor but worth noting.",
      "Do NOT flag characters who are tagged to this chapter. Do NOT flag stylistic choices or prose quality.",
      "",
      "CURRENT CHAPTER PROSE:",
      context.chapterProse.slice(0, 6000),
    ].join("\n");

    try {
      const data = await requestOpenRouterJson<{ issues?: Array<{ severity?: string; quote?: string; issue?: string; suggestion?: string }> }>(
        prompt, 800, { timeoutMs: 300000, systemMessage: sysMsg },
      );
      if (!Array.isArray(data?.issues)) return [];
      return data.issues
        .filter((i): i is { severity: string; issue: string; suggestion: string; quote?: string } =>
          typeof i.issue === "string" && typeof i.suggestion === "string")
        .map((i) => ({
          severity: (i.severity === "high" || i.severity === "medium" || i.severity === "low") ? i.severity : "medium",
          category: categoryId,
          categoryLabel: config.categoryLabel,
          quote: i.quote || undefined,
          issue: i.issue,
          suggestion: i.suggestion,
        }));
    } catch {
      return [];
    }
  }

  function addV2Character() {
    if (!novel) return;
    const charId = `charv2-${Date.now()}`;
    if (aiOff) {
      // AI disabled — just create a blank character directly
      const newChar = {
        id: charId, name: "New Character", role: "Protagonist" as CharacterRole,
        logline: "", appearance: "", personality: "", goals: "", fears: "", backstory: "",
        secrets: "", readerSecretHint: "", accent: "", speakingStyle: "", reactionPattern: "",
        relationships: [] as Array<{ targetCharacterId: string; type: string; description?: string }>,
        voiceNotes: "", tags: [] as string[], pronouns: "", groups: "", otherNames: "",
      };
      updateStoryBible({ characters: [...(novel.storyBible.characters || []), newChar] });
      setSelectedV2CharacterId(newChar.id);
      return;
    }
    // Show AI prompt popup
    setNewCharPopup({ charId, description: "", generating: false });
  }

  function addV2CharacterBlank(charId: string) {
    if (!novel) return;
    const newChar = {
      id: charId, name: "New Character", role: "Protagonist" as CharacterRole,
      logline: "", appearance: "", personality: "", goals: "", fears: "", backstory: "",
      secrets: "", readerSecretHint: "", accent: "", speakingStyle: "", reactionPattern: "",
      relationships: [] as Array<{ targetCharacterId: string; type: string; description?: string }>,
      voiceNotes: "", tags: [] as string[], pronouns: "", groups: "", otherNames: "",
    };
    updateStoryBible({ characters: [...(novel.storyBible.characters || []), newChar] });
    setSelectedV2CharacterId(newChar.id);
    setNewCharPopup(null);
  }

  async function addV2CharacterWithAi(charId: string, userDescription: string) {
    if (!novel) return;
    setNewCharPopup((p) => p ? { ...p, generating: true } : p);

    try {
      const context = buildStoryBibleContext("characters");
      const existingNames = storyCharacters.map((c) => c.name.trim().toLowerCase()).filter(Boolean);

      const prompt = [
        "Create a brand-new character for this novel based on the author's description below.",
        "",
        `Author's description: "${userDescription.trim()}"`,
        "",
        "Use the story context and existing characters to make this character fit naturally.",
        "Give them a real, full human name (first and last) that suits the genre and setting.",
        "Write detailed, rich content for EVERY field — do not leave anything empty or brief.",
        "",
        "Return JSON only in this shape:",
        `{
  "name": "string (full first and last name)",
  "role": "Protagonist|Antagonist|Supporting|Minor|Love Interest|Custom",
  "logline": "one-sentence summary of who they are",
  "appearance": "detailed physical description — height, build, hair, eyes, distinguishing features, how they dress",
  "personality": "detailed personality traits, temperament, habits, quirks, demeanour",
  "goals": "what they want — short-term and long-term motivations",
  "fears": "what they're afraid of — surface fears and deeper anxieties",
  "backstory": "detailed background — upbringing, key events, how they became who they are",
  "accent": "how they sound — regional accent, vocal quality, tone",
  "speakingStyle": "speech patterns, vocabulary level, verbal habits, catchphrases",
  "reactionPattern": "how they behave under stress, conflict, joy, grief",
  "secrets": "hidden information only the author knows",
  "readerSecretHint": "spoiler-safe hint that foreshadows the secret for readers",
  "voiceNotes": "notes on how to write authentic dialogue for this character",
  "tags": ["string"]
}`,
        "",
        "Rules:",
        "- Name must be a realistic full name, never a placeholder.",
        "- EVERY field must have substantial content (2+ sentences minimum for appearance, personality, goals, fears, backstory).",
        `- Do NOT reuse these existing names: ${existingNames.join(", ") || "none yet"}`,
        "- Anchor everything to the story context. Don't invent unrelated storylines.",
        "- readerSecretHint must be spoiler-safe.",
        "",
        `Story context:\n${context}`,
      ].join("\n");

      const data = await requestOpenRouterJson<{
        name?: string; role?: string; logline?: string;
        appearance?: string; personality?: string; goals?: string; fears?: string;
        backstory?: string; accent?: string; speakingStyle?: string;
        reactionPattern?: string; voiceNotes?: string;
        secrets?: string; readerSecretHint?: string; tags?: string[];
      }>(prompt, 1200, { systemMessage: "Character creation specialist. Build rich, detailed character profiles. Return only valid JSON. No markdown.", timeoutMs: 45000 });

      // Build the COMPLETE character in one shot — no placeholder then patch (avoids stale closure)
      const aiName = (typeof data.name === "string" && data.name.trim())
        ? ensureFullCharacterName(data.name.trim(), storyCharacters.length + 1)
        : "New Character";

      const fullChar = {
        id: charId,
        name: aiName,
        role: (typeof data.role === "string" && data.role.trim()) ? normalizeCharacterRole(data.role) : ("Supporting" as CharacterRole),
        logline: (typeof data.logline === "string" && data.logline.trim()) ? data.logline.trim() : "",
        appearance: (typeof data.appearance === "string" && data.appearance.trim()) ? data.appearance.trim() : "",
        personality: (typeof data.personality === "string" && data.personality.trim()) ? data.personality.trim() : "",
        goals: (typeof data.goals === "string" && data.goals.trim()) ? data.goals.trim() : "",
        fears: (typeof data.fears === "string" && data.fears.trim()) ? data.fears.trim() : "",
        backstory: (typeof data.backstory === "string" && data.backstory.trim()) ? data.backstory.trim() : "",
        secrets: (typeof data.secrets === "string" && data.secrets.trim()) ? data.secrets.trim() : "",
        readerSecretHint: (typeof data.readerSecretHint === "string" && data.readerSecretHint.trim()) ? data.readerSecretHint.trim() : "",
        accent: (typeof data.accent === "string" && data.accent.trim()) ? data.accent.trim() : "",
        speakingStyle: (typeof data.speakingStyle === "string" && data.speakingStyle.trim()) ? data.speakingStyle.trim() : "",
        reactionPattern: (typeof data.reactionPattern === "string" && data.reactionPattern.trim()) ? data.reactionPattern.trim() : "",
        voiceNotes: (typeof data.voiceNotes === "string" && data.voiceNotes.trim()) ? data.voiceNotes.trim() : "",
        relationships: [] as Array<{ targetCharacterId: string; type: string; description?: string }>,
        tags: parseStringList(data.tags),
        pronouns: "",
        groups: "",
        otherNames: "",
      };

      // Add the COMPLETE character in one atomic update — uses mutateNovel callback so state is always fresh
      updateStoryBible({ characters: [...(novel.storyBible.characters || []), fullChar] });
      setSelectedV2CharacterId(charId);
    } catch {
      // AI failed — create a blank character so nothing is lost
      const blankChar = {
        id: charId, name: "New Character", role: "Supporting" as CharacterRole,
        logline: "", appearance: "", personality: "", goals: "", fears: "", backstory: "",
        secrets: "", readerSecretHint: "", accent: "", speakingStyle: "", reactionPattern: "",
        relationships: [] as Array<{ targetCharacterId: string; type: string; description?: string }>,
        voiceNotes: "", tags: [] as string[], pronouns: "", groups: "", otherNames: "",
      };
      updateStoryBible({ characters: [...(novel.storyBible.characters || []), blankChar] });
      setSelectedV2CharacterId(charId);
    }
    setNewCharPopup(null);
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

  /** Position a fixed-position dropdown anchored to the trigger icon.
   *  Accounts for ancestor transforms / will-change that break position:fixed
   *  by computing the containing-block offset. */
  function positionDropdown(trigger: HTMLElement, dropdown: HTMLElement) {
    const triggerRect = trigger.getBoundingClientRect();
    const gap = 6;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 8;

    // Save original display state — if already visible (React-rendered),
    // don't hide it afterwards; if CSS-class controlled, restore to none.
    const wasVisible = getComputedStyle(dropdown).display !== "none";

    // Temporarily show at (0,0) in fixed coords to measure
    // the containing-block offset (will-change/transform on ancestors
    // makes position:fixed relative to that ancestor, not viewport).
    dropdown.style.display = "flex";
    dropdown.style.flexDirection = "column";
    dropdown.style.visibility = "hidden";
    dropdown.style.top = "0px";
    dropdown.style.left = "0px";

    // Force layout — get real dimensions and containing-block offset
    const ddW = dropdown.offsetWidth || 270;
    const ddH = dropdown.offsetHeight || 280;
    const ddRect = dropdown.getBoundingClientRect();
    const cbOffsetX = ddRect.left;
    const cbOffsetY = ddRect.top;

    const trigCenterX = triggerRect.left + triggerRect.width / 2;

    // Horizontal: center on trigger, clamp to viewport
    let left = trigCenterX - ddW / 2;
    if (left + ddW > vw - pad) left = vw - ddW - pad;
    if (left < pad) left = pad;

    // Vertical: prefer above trigger
    let top = triggerRect.top - ddH - gap;
    if (top < pad) top = triggerRect.bottom + gap;
    if (top + ddH > vh - pad) top = vh - ddH - pad;
    if (top < pad) top = pad;

    // Subtract the containing-block offset to convert viewport → local coords
    dropdown.style.top = `${Math.round(top - cbOffsetY)}px`;
    dropdown.style.left = `${Math.round(left - cbOffsetX)}px`;

    // Only remove inline display if the element uses CSS-class toggling
    // (not React conditional rendering which already handles display)
    if (!wasVisible) {
      dropdown.style.removeProperty("display");
      dropdown.style.removeProperty("flex-direction");
    }
    dropdown.style.visibility = "";
  }

  /** Close all open bolton dropdowns */
  function closeBoltonDropdowns() {
    document.querySelectorAll(".pw-bolton-open").forEach((el) => el.classList.remove("pw-bolton-open"));
    setOpenBoltonDropdownId(null);
  }

  // Close bolton dropdown when clicking outside
  useEffect(() => {
    if (!openBoltonDropdownId) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest(".pw-block-bolton-wrap")) return;
      closeBoltonDropdowns();
    }
    document.addEventListener("click", handleClickOutside, true);
    return () => document.removeEventListener("click", handleClickOutside, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openBoltonDropdownId]);

  function setChapterBoltonForActiveChapter(nextBoltonId: string) {
    if (!activeChapter) return;
    const normalized = nextBoltonId.trim();
    setChapterBoltonByChapterId((current) => {
      const next = { ...current };
      if (normalized) next[activeChapter.id] = normalized;
      else delete next[activeChapter.id];
      return next;
    });
    const blocks = getSceneBlocks(activeChapter);
    if (blocks.length === 0) return;
    const aligned = blocks.map((block) => ({ ...block, notes: normalized }));
    updateSceneBlocks(activeChapter.id, aligned);
  }

  /** Save a single bolt-on to the global library (localStorage + server settings) */
  async function saveSingleBoltonToLibrary(bolton: { title: string; description?: string; prompt?: string; category?: string }) {
    if (typeof window === "undefined") return;
    const library = readBoltonLibrary();
    const desc = bolton.description || "";
    const key = `${bolton.title.trim().toLowerCase()}|${desc.trim().toLowerCase()}`;
    const exists = library.some((item) => `${item.title.trim().toLowerCase()}|${(item.description || "").trim().toLowerCase()}` === key);
    if (!exists) {
      library.push({
        title: clampText(bolton.title, 40),
        description: clampPromptText(desc, 500),
        prompt: clampPromptText(bolton.prompt || "", 500),
        category: normalizeBoltonCategory(bolton.category || "custom"),
      });
    }
    try { window.localStorage.setItem(BOLTON_LIBRARY_KEY, JSON.stringify(library)); } catch { /* ignore */ }
    setBoltonLibraryCount(library.length);
    const syncOk = await saveSettingsToServer(gatherSettings());
    const now = new Date().toISOString();
    setAutosaveStatus({
      status: syncOk ? "ok" : "error",
      message: syncOk ? "Bolt-on saved to library" : "Saved locally, but cloud sync failed.",
      at: now,
    });
  }

  /** Delete a bolt-on from the global library by index */
  async function deleteLibraryBolton(index: number) {
    if (typeof window === "undefined") return;
    const library = readBoltonLibrary();
    library.splice(index, 1);
    try { window.localStorage.setItem(BOLTON_LIBRARY_KEY, JSON.stringify(library)); } catch { /* ignore */ }
    setBoltonLibraryCount(library.length);
    await saveSettingsToServer(gatherSettings());
  }

  /** Load a single bolt-on from the library into the current novel */
  function loadSingleFromLibrary(item: { title: string; description?: string; prompt?: string; category?: string }) {
    if (!novel) return;
    const existing = novel.storyBible.boltons ?? [];
    if (existing.length >= 10) return;
    const itemDesc = item.description || "";
    const key = `${item.title.trim().toLowerCase()}|${itemDesc.trim().toLowerCase()}`;
    const already = existing.some((b) => `${b.title.trim().toLowerCase()}|${(b.description || "").trim().toLowerCase()}` === key);
    if (already) return;
    const merged = [...existing, {
      id: createEntityId("bolton"),
      title: item.title || "Imported Plugin",
      category: normalizeBoltonCategory(item.category || "custom"),
      description: itemDesc,
      prompt: item.prompt || "",
      createdAt: new Date().toISOString(),
    }];
    updateStoryBible({ boltons: merged });
  }

  /** Install all boltons from a writing pack into the current novel (skips duplicates, respects 10 limit) */
  function installWritingPack(pack: WritingPack, selectedOnly?: Set<string>) {
    if (!novel) return;
    const existing = novel.storyBible.boltons ?? [];
    let added = 0;
    const merged = [...existing];
    const toInstall = selectedOnly
      ? pack.boltons.filter((_, i) => selectedOnly.has(`${pack.id}-${i}`))
      : pack.boltons;
    for (const pb of toInstall) {
      if (merged.length >= 10) break;
      const key = `${pb.title.trim().toLowerCase()}|${pb.description.trim().toLowerCase()}`;
      const already = merged.some((b) => `${b.title.trim().toLowerCase()}|${(b.description || "").trim().toLowerCase()}` === key);
      if (already) continue;
      merged.push({
        id: createEntityId("bolton"),
        title: pb.title,
        category: pb.category,
        description: pb.description,
        prompt: pb.prompt,
        createdAt: new Date().toISOString(),
      });
      added++;
    }
    if (added > 0) {
      updateStoryBible({ boltons: merged });
      setPackInstallFlash(pack.id);
      setPackSelectedBoltons(new Set());
      setTimeout(() => setPackInstallFlash(null), 2000);
    }
  }

  /** Check how many boltons from a pack are already installed */
  function getPackInstalledCount(pack: WritingPack): number {
    if (!novel) return 0;
    const existing = novel.storyBible.boltons ?? [];
    return pack.boltons.filter((pb) => {
      const key = `${pb.title.trim().toLowerCase()}|${pb.description.trim().toLowerCase()}`;
      return existing.some((b) => `${b.title.trim().toLowerCase()}|${(b.description || "").trim().toLowerCase()}` === key);
    }).length;
  }

  /* ─── Knowledge & Reveal Tracker ─── */
  const KNOWLEDGE_TYPES: Array<{ id: KnowledgeEntry["type"]; label: string; color: string; icon: string }> = [
    { id: "secret", label: "Secret", color: "#71717a", icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" },
    { id: "reveal", label: "Reveal", color: "#a1a1aa", icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" },
    { id: "clue", label: "Clue", color: "#9ca3af", icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" },
    { id: "deception", label: "Deception", color: "#6b7280", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
  ];

  const STATUS_META: Record<KnowledgeEntry["status"], { label: string; color: string }> = {
    hidden: { label: "Hidden", color: "#71717a" },
    foreshadowed: { label: "Foreshadowed", color: "#a1a1aa" },
    revealed: { label: "Revealed", color: "#a3e635" },
  };

  function addKnowledgeEntry() {
    if (!novel) return;
    const km = novel.storyBible.knowledgeMap ?? { entries: [], scanIssues: [] };
    if (km.entries.length >= 30) return;
    const entry: KnowledgeEntry = {
      id: createEntityId("know"),
      label: "",
      description: "",
      type: "secret",
      holders: [],
      status: "hidden",
      createdAt: new Date().toISOString(),
    };
    updateStoryBible({ knowledgeMap: { ...km, entries: [...km.entries, entry] } });
    setKnowledgeSelectedId(entry.id);
  }

  function updateKnowledgeEntry(entryId: string, patch: Partial<KnowledgeEntry>) {
    if (!novel) return;
    const km = novel.storyBible.knowledgeMap ?? { entries: [], scanIssues: [] };
    updateStoryBible({
      knowledgeMap: {
        ...km,
        entries: km.entries.map((e) => e.id === entryId ? { ...e, ...patch } : e),
      },
    });
  }

  function removeKnowledgeEntry(entryId: string) {
    if (!novel) return;
    const km = novel.storyBible.knowledgeMap ?? { entries: [], scanIssues: [] };
    updateStoryBible({
      knowledgeMap: {
        ...km,
        entries: km.entries.filter((e) => e.id !== entryId),
        scanIssues: km.scanIssues.filter((i) => i.entryId !== entryId),
      },
    });
    if (knowledgeSelectedId === entryId) setKnowledgeSelectedId(null);
  }

  function addKnowledgeHolder(entryId: string, characterId: string) {
    if (!novel) return;
    const km = novel.storyBible.knowledgeMap ?? { entries: [], scanIssues: [] };
    const entry = km.entries.find((e) => e.id === entryId);
    if (!entry) return;
    if (entry.holders.some((h) => h.characterId === characterId)) return;
    updateKnowledgeEntry(entryId, { holders: [...entry.holders, { characterId }] });
  }

  function removeKnowledgeHolder(entryId: string, characterId: string) {
    if (!novel) return;
    const km = novel.storyBible.knowledgeMap ?? { entries: [], scanIssues: [] };
    const entry = km.entries.find((e) => e.id === entryId);
    if (!entry) return;
    updateKnowledgeEntry(entryId, { holders: entry.holders.filter((h) => h.characterId !== characterId) });
  }

  async function runKnowledgeScan() {
    if (!novel || aiOff) return;
    const km = novel.storyBible.knowledgeMap ?? { entries: [], scanIssues: [] };
    if (km.entries.length === 0) {
      setKnowledgeScanError("Add at least one knowledge entry before scanning.");
      return;
    }
    const chapters = novel.chapters.filter((ch) => (ch.content ?? "").trim().length > 30);
    if (chapters.length === 0) {
      setKnowledgeScanError("No chapters with content to scan.");
      return;
    }
    setKnowledgeScanBusy(true);
    setKnowledgeScanError(null);

    try {
      // Build knowledge map description for the AI
      const knowledgeDesc = km.entries.map((e, i) => {
        const holders = e.holders.map((h) => {
          const char = novel.storyBible.characters.find((c) => c.id === h.characterId);
          const learn = h.learnedInChapter ? ` (learns in Ch${h.learnedInChapter})` : " (knows from start)";
          return char ? `${char.name}${learn}` : null;
        }).filter(Boolean);
        return `${i + 1}. [${e.type.toUpperCase()}] "${e.label}" — ${e.description || "(no description)"}\n   Status: ${e.status}. Reader reveal: ${e.revealChapter ? `Chapter ${e.revealChapter}` : "not set"}.\n   Known by: ${holders.length > 0 ? holders.join(", ") : "nobody yet"}.`;
      }).join("\n");

      // Build chapter summaries
      const chapterSummaries = chapters.map((ch, i) => {
        const prose = extractProseFromContent(ch.content ?? "").slice(0, 800);
        return `Chapter ${i + 1}: "${ch.title || `Chapter ${i + 1}`}"\n${prose}`;
      }).join("\n\n---\n\n");

      const systemPrompt = [
        "You are an expert continuity and knowledge-state checker for novels.",
        "You detect when characters reference information they shouldn't know yet, when secrets are mentioned before being revealed to the reader, and when reveals feel unearned.",
        "Be specific — reference chapter numbers and character names. Be constructive.",
        "Respond ONLY with valid JSON. No markdown outside JSON.",
      ].join("\n");

      const userPrompt = [
        `Novel: "${novel.title}"`,
        "",
        "KNOWLEDGE MAP (the source of truth for who knows what):",
        knowledgeDesc,
        "",
        "CHAPTER CONTENT:",
        chapterSummaries,
        "",
        "Scan every chapter against the knowledge map. Find:",
        "1. Characters referencing secrets they don't know (check the holders list)",
        "2. Reader learning information before the designated reveal chapter",
        "3. Secrets mentioned or hinted at when their status is 'hidden' and the chapter is before the reveal",
        "4. Reveals that feel unearned — reader gains knowledge without proper setup",
        "5. Characters making deductions without evidence in their knowledge state",
        "",
        'Return JSON: { "issues": [{ "entryId": string (the knowledge entry id), "chapter": number (1-based), "severity": "info"|"warning"|"critical", "message": string, "suggestion": string }] }',
        "Return 0-20 issues. Only flag genuine violations. If everything is clean, return empty issues array.",
        "",
        "Knowledge entry IDs for reference:",
        km.entries.map((e) => `  "${e.id}" = "${e.label}"`).join("\n"),
      ].join("\n");

      const result = await requestOpenRouterJson(
        userPrompt,
        2000,
        { systemMessage: systemPrompt },
      );

      const res = result as Record<string, unknown> | null;
      const issues: KnowledgeScanIssue[] = res && Array.isArray(res.issues)
        ? (res.issues as Record<string, unknown>[])
            .filter((i) => i && typeof i.entryId === "string")
            .map((i) => ({
              entryId: String(i.entryId),
              chapter: typeof i.chapter === "number" ? i.chapter : 0,
              severity: (["info", "warning", "critical"].includes(String(i.severity)) ? String(i.severity) : "info") as KnowledgeScanIssue["severity"],
              message: String(i.message || "").slice(0, 400),
              suggestion: String(i.suggestion || "").slice(0, 400),
            }))
        : [];

      updateStoryBible({
        knowledgeMap: { ...km, scanIssues: issues, lastScanAt: new Date().toISOString() },
      });
    } catch (err) {
      setKnowledgeScanError(err instanceof Error ? err.message : "Scan failed.");
    } finally {
      setKnowledgeScanBusy(false);
    }
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
    try { window.localStorage.setItem(BOLTON_LIBRARY_KEY, JSON.stringify(source)); } catch { /* ignore */ }
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
      const systemMsg = "You are a prose direction specialist. You convert vague author wishes into precise, actionable prose-writing instructions. Your output will be injected directly into an AI prose generator's prompt. Return only valid JSON.";
      const prompt = [
        "Convert the user's instruction into a specific, actionable directive for an AI prose writer.",
        "",
        "RULES:",
        "- The directive MUST be a concrete instruction telling the AI HOW to write, not WHAT to write about.",
        "- Use specific craft techniques: e.g. 'Use short, fragmented sentences during tense moments. Layer sensory details — sounds, smells, textures — to build atmosphere. Cut dialogue tags and let action beats carry speech.'",
        "- NEVER produce vague instructions like 'focus on horror' or 'make it scary'. Instead describe the exact writing techniques: sentence rhythm, word choice, sensory emphasis, pacing, dialogue style, metaphor use.",
        "- Keep the prompt under 500 characters. Every word must earn its place.",
        "- Write as direct imperatives: 'Use...', 'Cut...', 'Layer...', 'Slow the pacing by...', 'Build tension through...'",
        "- Also generate a short, relevant title (2-4 words) that captures what this bolt-on does, e.g. 'Dark Atmosphere', 'Punchy Dialogue', 'Slow Burn Tension'.",
        "",
        "Return JSON only: { \"prompt\": \"the actionable directive\", \"title\": \"Short Relevant Title\" }",
        "",
        `User instruction: ${bolton.description}`,
        `Plugin category: ${categoryMeta.label}`,
        "",
        `Novel genre: ${genre}`,
        `Novel tone: ${tone}`,
        pov ? `POV: ${pov}` : "",
        styleRules ? `Style rules: ${styleRules}` : "",
      ].filter(Boolean).join("\n");
      const data = await requestOpenRouterJson<{ prompt?: string; title?: string }>(prompt, 350, { systemMessage: systemMsg });
      const updates: Partial<Bolton> = {};
      if (typeof data.prompt === "string" && data.prompt.trim()) {
        updates.prompt = clampPromptText(data.prompt, 500);
      }
      if (typeof data.title === "string" && data.title.trim()) {
        updates.title = clampText(data.title, 40);
      }
      if (Object.keys(updates).length > 0) {
        updateBolton(boltonId, updates);
        // Auto-save to library
        const updatedBolton = { ...bolton, ...updates };
        void saveSingleBoltonToLibrary(updatedBolton);
      }
    } catch (error) {
      if (isCancelledError(error)) { setStoryAiBusyAction(null); return; }
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
      const genres = sb.summary.genre.slice(0, 4);
      const genre = genres.join(", ") || "fiction";
      const tone = sb.summary.tone.slice(0, 3).join(", ") || "";
      const themes = (sb.summary.themes ?? []).slice(0, 5).join(", ");
      const charNames = (sb.characters ?? []).map((c) => c.name).filter(Boolean).join(", ") || "none";
      const locNames = storyLocations.map((l) => l.name).filter(Boolean).join(", ") || "none";
      const existingLoreNames = (sb.lore ?? []).map((e) => e.title).filter(Boolean).join(", ") || "none";

      const synopsisBlock = [synopsis, stakes ? `Stakes: ${stakes}` : "", themes ? `Themes: ${themes}` : ""].filter(Boolean).join("\n");

      // Build genre-aware guidance so AI generates relevant world-building
      const genreLower = genre.toLowerCase();
      const isFantasySciFi = /fantasy|sci-fi|science fiction|supernatural|paranormal|dystopi|steampunk|mytholog/i.test(genreLower);
      const isCrimeThriller = /thriller|crime|mystery|detective|suspense|noir|espionage|spy|police|forensic|legal/i.test(genreLower);
      const isRomance = /romance|love|erotic|chick.lit/i.test(genreLower);
      const isHistorical = /historic|period|war|regency|medieval|ancient|wwii|civil war/i.test(genreLower);
      const isHorror = /horror|gothic|dark|occult|creepy/i.test(genreLower);
      const isLitFic = /literary|contemporary|realistic|family|drama|coming.of.age/i.test(genreLower);

      let genreGuidance: string;
      let suggestedCategories: string;

      if (isFantasySciFi) {
        genreGuidance = "This is a speculative-fiction story. Generate world-building entries about magic systems, technology, races/species, world rules, power structures, history of the world, cosmology, or unique cultural systems. Focus on what makes this world different from reality.";
        suggestedCategories = "Magic|Tech|Culture|History|Religion|Politics|Rules|Other";
      } else if (isCrimeThriller) {
        genreGuidance = "This is a crime/thriller story. Do NOT generate fantasy lore. Instead generate entries about: how the criminal world operates in this story, law enforcement procedures, legal systems, forensic methods, surveillance/intelligence tradecraft, power dynamics between factions, psychological profiles, the 'rules of engagement' between antagonist and protagonist, key plot devices or MacGuffins, and any real-world systems (finance, government, tech) that drive the plot.";
        suggestedCategories = "Law|Procedure|Psychology|Politics|Society|Tech|Setting|Rules|Other";
      } else if (isRomance) {
        genreGuidance = "This is a romance story. Do NOT generate fantasy lore. Instead generate entries about: social dynamics and expectations in this world, relationship rules/barriers, cultural norms around love and marriage, workplace/community politics, family dynamics, class or social divides, the setting's atmosphere and how it shapes relationships.";
        suggestedCategories = "Society|Culture|Setting|Psychology|Rules|Other";
      } else if (isHistorical) {
        genreGuidance = "This is a historical story. Generate entries about: period-accurate social rules, political landscape of the era, technology and daily life, class structures, relevant historical events the characters live through, cultural norms and taboos, language or dialect notes.";
        suggestedCategories = "History|Culture|Politics|Society|Setting|Rules|Other";
      } else if (isHorror) {
        genreGuidance = "This is a horror/dark story. Generate entries about: the rules of the threat/entity, how the horror operates and its limitations, psychological vulnerabilities it exploits, the mythology or backstory behind the horror, setting atmosphere rules, survival rules the characters must discover.";
        suggestedCategories = "Rules|Psychology|History|Setting|Culture|Religion|Other";
      } else if (isLitFic) {
        genreGuidance = "This is a literary/contemporary story. Do NOT generate fantasy lore. Instead generate entries about: the social world of the characters, community or family dynamics, cultural context, psychological underpinnings, recurring motifs or symbols, rules of the setting, thematic ground rules the story follows.";
        suggestedCategories = "Society|Psychology|Culture|Setting|Rules|Other";
      } else {
        genreGuidance = "Consider the genre carefully. Generate world-building entries that are actually relevant to this type of story. For realistic fiction: social rules, setting details, power dynamics, procedural details. For speculative fiction: magic systems, technology, world rules. Never generate fantasy lore for a realistic story.";
        suggestedCategories = "Culture|History|Politics|Society|Psychology|Setting|Rules|Tech|Other";
      }

      const sysMsg = `World-building architect. You generate world-building notes tailored to the story's genre. ${genreGuidance} Return ONLY entries that the author needs to keep the story internally consistent. NO character bios or location descriptions. Return valid JSON.`;

      const userPrompt = [
        `Genre: ${genre}${tone ? ` | Tone: ${tone}` : ""}`,
        `Synopsis: ${synopsisBlock}`,
        charNames !== "none" ? `Characters: ${charNames}` : "",
        locNames !== "none" ? `Locations: ${locNames}` : "",
        existingLoreNames !== "none" ? `Already exists (do NOT duplicate): ${existingLoreNames}` : "",
        "",
        `Think about what world-building notes a ${genre} author actually needs. What rules, systems, or context must be established so the story stays consistent?`,
        `Create 4-8 entries. Return JSON:`,
        `{"entries":[{"title":"Short descriptive name","category":"${suggestedCategories}","content":"2-4 sentences explaining this world-building element and why it matters to the story","constraints":["a concrete rule the story must follow because of this"]}]}`,
      ].filter(Boolean).join("\n");

      type LoreGenResult = {
        entries?: Array<{
          title?: string;
          category?: string;
          content?: string;
          constraints?: string[];
        }>;
      };

      let data: LoreGenResult | null = null;

      try {
        const raw = await requestOpenRouterText(userPrompt, 900, 180000, sysMsg, false, 0.7);
        data = parseJsonFromAi<LoreGenResult>(raw);
      } catch { /* continue */ }

      if (!data || !Array.isArray(data.entries) || data.entries.length === 0) {
        try {
          const retryPrompt = userPrompt + "\n\nReturn ONLY valid JSON.";
          const raw2 = await requestOpenRouterText(retryPrompt, 900, 180000, sysMsg, false, 0.4);
          data = parseJsonFromAi<LoreGenResult>(raw2);
        } catch { /* continue */ }
      }

      if (!data || !Array.isArray(data.entries) || data.entries.length === 0) {
        throw new Error("Worldbuilding generation failed. Try a different model or add more detail to your synopsis.");
      }

      const VALID_CATEGORIES = new Set(["Magic", "Tech", "Culture", "History", "Religion", "Politics", "Law", "Society", "Psychology", "Procedure", "Setting", "Rules", "Other"]);

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
          const rawCat = (item.category ?? "").trim();
          const cat = VALID_CATEGORIES.has(rawCat) ? rawCat as LoreEntry["category"] : "Other" as const;
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
      if (isCancelledError(error)) { setStoryAiBusyAction(null); return; }
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
      const storyGenre = (novel.storyBible.summary.genre ?? []).slice(0, 4).join(", ") || "fiction";
      const systemMsg = `You are a world-building editor for a ${storyGenre} story. Refine entries for clarity and drafting use while preserving all established constraints and cross-references. Match your language and focus to the genre — no fantasy language for realistic fiction. Return only valid JSON.`;
      const prompt = [
        "Refine this world-building entry for clarity and practical drafting use.",
        `This is a ${storyGenre} story — make sure the entry is relevant and useful for this genre.`,
        "Preserve existing constraints and ensure consistency with related entries.",
        "Return JSON only in this shape:",
        `{
  "title": "string",
  "category": "Magic|Tech|Culture|History|Religion|Politics|Law|Society|Psychology|Procedure|Setting|Rules|Other",
  "content": "string",
  "constraints": ["string"]
}`,
        "Keep this entry consistent with Canon. Do not remove existing constraints unless they directly contradict Canon.",
        `Entry title: ${entry.title}`,
        `Entry category: ${entry.category}`,
        `Entry content:\n${entry.content || "(empty)"}`,
        `Entry constraints: ${(entry.constraints ?? []).join(", ") || "(none)"}`,
        relatedConstraints ? `Related world-building constraints (preserve cross-references):\n${relatedConstraints}` : "",
        `Story context:\n${context}`,
      ].filter(Boolean).join("\n\n");

      const data = await requestOpenRouterJson<{
        title?: string;
        category?: string;
        content?: string;
        constraints?: string[];
      }>(prompt, 650, { systemMessage: systemMsg });

      const ENHANCE_VALID_CATS = new Set(["Magic", "Tech", "Culture", "History", "Religion", "Politics", "Law", "Society", "Psychology", "Procedure", "Setting", "Rules", "Other"]);
      const enhancedCat = ENHANCE_VALID_CATS.has(data.category ?? "") ? data.category as LoreEntry["category"] : entry.category;
      updateLoreEntry(loreId, {
        title: typeof data.title === "string" && data.title.trim() ? data.title.trim() : entry.title,
        category: enhancedCat,
        content: typeof data.content === "string" && data.content.trim() ? data.content.trim() : entry.content,
        constraints: parseStringList(data.constraints),
      });
    } catch (error) {
      if (isCancelledError(error)) { setStoryAiBusyAction(null); return; }
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
      if (isCancelledError(error)) { setStoryAiBusyAction(null); return; }
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
      if (isCancelledError(error)) { setStoryAiBusyAction(null); return; }
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
    return content;
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
      // Return nothing — the loading.tsx skeleton is already visible via Next.js Suspense.
      // Rendering a second skeleton here causes a flash when it replaces loading.tsx.
      return null;
    }
    return (
      <div className="pw-wallpaper">
        <div className="pw-window">
          <aside className="pw-sidebar">
            <div className="pw-logo">
              <img src="/blocwrite-logo-white.png" alt="Blocwrite" className="pw-logo-full" />
            </div>
            <Link href="/studio" className="pw-back-link">
              <span>&larr; Back to novels</span>
            </Link>
            <div className="pw-sidebar-foot" style={{ opacity: 0.4 }}>Novel not found.</div>
          </aside>
          <section className="pw-home-main" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
              <p className="pw-empty-title">This novel does not exist.</p>
              <button type="button" className="btn btn-primary" onClick={() => router.push("/studio")} style={{ marginTop: 12 }}>
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
    if (storyAiBusyAction === "character-profile-batch") return "Building character profiles";
    if (storyAiBusyAction === "locations-generate") return "Generating locations";
    if (storyAiBusyAction === "worldbuilding-generate") return "Generating world-building";
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
    <div className={`pw-wallpaper pw-content-ready${navigatingAway ? " pw-exit" : ""}`}>
      <div className={`pw-window ${sidebarCollapsed ? "pw-sidebar-collapsed" : ""}`}>
        <aside className="pw-sidebar" data-tutorial="sidebar" onMouseEnter={handleSidebarEnter} onMouseLeave={handleSidebarLeave}>
          <div className="pw-logo">
            <div className="pw-logo-swap">
              <img src="/blocwrite-logo-white.png" alt="Blocwrite" className="pw-logo-full" />
              <img src={currentTheme === "dark" ? "/blocwrite-icon-dark.png" : "/blocwrite-icon-light.png"} alt="Bw" className="pw-logo-icon-img" />
            </div>
            <button type="button" className={`pw-collapse-btn ${sidebarPinned ? "pw-pin-active" : ""}`} onClick={toggleSidebarPin} title={sidebarPinned ? "Unpin sidebar" : "Pin sidebar open"}>
              <span style={{ fontWeight: 300, fontSize: 16, fontStyle: "italic", lineHeight: 1 }}>/</span>
            </button>
          </div>
          <Link href="/studio" prefetch={true} className="pw-back-link" onClick={(e) => {
            e.preventDefault();
            // Save everything before navigating away
            saveNovels(novels);
            flushServerSave();
            setNavigatingAway(true);
            setTimeout(() => router.push("/studio"), 240);
          }}>
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
          {isAdmin && (
            <Link
              href="/admin"
              className="pw-admin-sidebar-link"
              title="Admin Hub"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 00-2 2v.18a2 2 0 01-1 1.73l-.43.25a2 2 0 01-2 0l-.15-.08a2 2 0 00-2.73.73l-.22.38a2 2 0 00.73 2.73l.15.1a2 2 0 011 1.72v.51a2 2 0 01-1 1.74l-.15.09a2 2 0 00-.73 2.73l.22.38a2 2 0 002.73.73l.15-.08a2 2 0 012 0l.43.25a2 2 0 011 1.73V20a2 2 0 002 2h.44a2 2 0 002-2v-.18a2 2 0 011-1.73l.43-.25a2 2 0 012 0l.15.08a2 2 0 002.73-.73l.22-.39a2 2 0 00-.73-2.73l-.15-.08a2 2 0 01-1-1.74v-.5a2 2 0 011-1.74l.15-.09a2 2 0 00.73-2.73l-.22-.38a2 2 0 00-2.73-.73l-.15.08a2 2 0 01-2 0l-.43-.25a2 2 0 01-1-1.73V4a2 2 0 00-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
              Admin Hub
            </Link>
          )}
          <div style={{ fontSize: 9, color: "var(--pw-text-dim)", textAlign: "center", padding: "4px 8px 8px", opacity: 0.5 }}>&copy; {new Date().getFullYear()} Blocwrite</div>
        </aside>

        <div className="pw-topbar">
          <div className="pw-toolbar">
            <span className="pw-project-title">{novel.title || "Untitled Novel"}</span>
            <span className="pw-dot" />
            <button type="button" className="pw-mode-btn" data-tutorial="overview" onClick={() => setActiveChapterId(null)}>
              Overview
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="pw-theme-toggle" data-tutorial="theme" onClick={toggleTheme} title={`Switch to ${currentTheme === "dark" ? "light" : "dark"} mode`}>
              <span className="pw-theme-icon">{currentTheme === "dark" ? "☀" : "☽"}</span>
              <span style={{ fontSize: 12 }}>{currentTheme === "dark" ? "Light" : "Dark"}</span>
            </button>
            <div className="pw-pill">{totalWords.toLocaleString()} words</div>
            {canUndo && activeChapter && (
              <button
                type="button"
                className="btn"
                onClick={handleUndo}
                title="Undo last change (⌘Z)"
                style={{ display: "flex", alignItems: "center", gap: 4, opacity: 0.85 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                Undo
              </button>
            )}
            {!aiOff && (
            <button type="button" className="btn pw-proofread-btn"
              style={{ display: "flex", alignItems: "center", gap: 5 }}
              title="The Editor — AI manuscript analysis"
              data-tutorial="editor"
              onClick={() => setShowEditorModal(true)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              The Editor
            </button>
            )}
            <button type="button" className="btn btn-primary" data-tutorial="plan" onClick={() => setShowPlanModal(true)}>
              The Plan
            </button>
            <button type="button" className="btn" style={{ position: "relative", padding: "6px 8px", minWidth: 0 }} onClick={() => {
              if (!novel) return;
              if (pendingFeedbackCount > 0) {
                // Open feedback review mode
                setFeedbackLoading(true);
                setShowFeedbackPanel(true);
                setFeedbackReviewMode(false);
                setFeedbackReviewDone(false);
                setFeedbackReviewIdx(0);
                setFeedbackReviewAccepted(0);
                setFeedbackReviewRejected(0);
                setDismissedAnnotations(new Set());
                fetch("/api/share/feedback").then((r) => r.ok ? r.json() : []).then((d) => {
                  if (Array.isArray(d)) {
                    setFeedbackData(d);
                    // Build the review queue from all feedback
                    const queue: typeof feedbackReviewQueue = [];
                    for (const fb of d) {
                      for (const ch of fb.chapters ?? []) {
                        for (const ann of ch.annotations ?? []) {
                          queue.push({
                            fbId: fb.id,
                            token: fb.token,
                            readerName: fb.readerName,
                            chapterId: ch.id,
                            chapterTitle: ch.title,
                            chapterContent: ch.content,
                            ann: { id: ann.id, selectedText: ann.selectedText, startOffset: ann.startOffset, endOffset: ann.endOffset, note: ann.note, type: ann.type },
                          });
                        }
                      }
                    }
                    setFeedbackReviewQueue(queue);
                  }
                }).catch(() => {}).finally(() => setFeedbackLoading(false));
              } else {
                setSelectedShareChapterIds(novel.chapters.map((c) => c.id));
                setShareResult(null);
                setShareError(null);
                setSharePassword("");
                setShareExpiryDays(7);
                setShareRecipientEmail("");
                setShowShareModal(true);
                setShareLinksLoading(true);
                fetch("/api/share").then((r) => r.ok ? r.json() : []).then((data) => {
                  if (Array.isArray(data)) setShareLinks(data);
                }).catch(() => {}).finally(() => setShareLinksLoading(false));
              }
            }} data-tutorial="share" title={pendingFeedbackCount > 0 ? "Review feedback" : "Share chapters for feedback"}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              {pendingFeedbackCount > 0 && (
                <span style={{
                  position: "absolute", top: -4, right: -4,
                  width: 18, height: 18, borderRadius: "50%",
                  background: "#ef4444", color: "#fff",
                  fontSize: 10, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  lineHeight: 1, animation: "pulse 2s infinite",
                }}>{pendingFeedbackCount > 9 ? "9+" : pendingFeedbackCount}</span>
              )}
            </button>
            <button type="button" className="btn" style={{ position: "relative", padding: "6px 8px", minWidth: 0 }}
              data-tutorial="export"
              onClick={() => openExportModal()}
              title="Export to EPUB or DOCX"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
            <span data-tutorial="settings"><ProfileButton onClick={() => setProfileOpen(true)} /></span>
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
                  // Always prefer the FULL plan synopsis — subtitle is a truncated copy
                  const overview = pc?.synopsis?.trim() || activeChapter.subtitle || "";
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
                    disabled={storyAiBusyAction !== null}
                    onClick={() => {
                      const blocks = getSceneBlocks(activeChapter);
                      if (blocks.length > 0) {
                        setRegenConfirm({ message: "This will regenerate all blocs for this chapter. Existing bloc synopses could be overwritten.", onConfirm: () => { setRegenConfirm(null); void runGenerateChapterBlocks(); } });
                      } else {
                        void runGenerateChapterBlocks();
                      }
                    }}
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
                    {/* Chapter-level rewrite */}
                    {!aiOff && activeChapter && (activeChapter.content ?? "").trim().length > 20 && (
                      <div style={{ position: "relative" }}>
                        <button type="button"
                          data-pw-rewrite-trigger
                          disabled={chapterRewriteBusy}
                          onClick={() => { if (!chapterRewriteBusy) setChapterRewriteMenuOpen(!chapterRewriteMenuOpen); }}
                          style={{
                            display: "flex", alignItems: "center", gap: 4,
                            padding: "4px 10px", fontSize: 11, fontWeight: 600, borderRadius: 6,
                            background: chapterRewriteBusy ? "rgba(var(--pw-accent-rgb, 163,230,53), 0.08)" : "var(--pw-overlay-bg)",
                            border: "1px solid var(--pw-border)", cursor: chapterRewriteBusy ? "default" : "pointer",
                            color: chapterRewriteBusy ? "var(--pw-accent, #a3e635)" : "var(--pw-text-dim)",
                            transition: "all 0.12s",
                          }}
                          title="Rewrite entire chapter tone"
                        >
                          {chapterRewriteBusy ? (
                            <><span style={{ width: 10, height: 10, border: "1.5px solid rgba(var(--pw-accent-rgb, 163,230,53), 0.2)", borderTopColor: "var(--pw-accent, #a3e635)", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} /> Rewriting...</>
                          ) : (
                            <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg> Tone</>
                          )}
                        </button>
                        {chapterRewriteMenuOpen && (
                          <>
                            <div style={{ position: "fixed", inset: 0, zIndex: 9998 }} onClick={() => setChapterRewriteMenuOpen(false)} />
                            <div ref={(el) => {
                              if (!el) return;
                              const trigger = document.querySelector("[data-pw-rewrite-trigger]") as HTMLElement | null;
                              if (trigger) positionDropdown(trigger, el);
                            }} style={{
                              position: "fixed", zIndex: 9999,
                              background: "var(--pw-surface)", border: "1px solid var(--pw-border)",
                              borderRadius: 10, padding: "8px 6px", minWidth: 220,
                              boxShadow: "var(--pw-shadow-elevated)",
                            }}>
                              <div style={{ padding: "2px 10px 8px", fontSize: 11, fontWeight: 700, color: "var(--pw-text-dim)", opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                Rewrite Chapter Tone
                              </div>
                              {REWRITE_MODES.map((mode) => (
                                <button key={mode.id} type="button"
                                  onClick={() => {
                                    if (!confirm(`Rewrite this chapter as "${mode.label}"?\n\n${mode.desc}\n\nYou can undo this afterwards.`)) return;
                                    void runChapterRewrite(mode.id);
                                  }}
                                  style={{
                                    display: "flex", alignItems: "center", gap: 10, width: "100%",
                                    padding: "8px 10px", background: "none", border: "none", borderRadius: 7,
                                    cursor: "pointer", color: "var(--pw-text-dim)", fontSize: 12, fontWeight: 600,
                                    textAlign: "left", transition: "all 0.1s",
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(var(--pw-accent-rgb, 163,230,53), 0.06)"; e.currentTarget.style.color = "var(--pw-accent)"; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--pw-text-dim)"; }}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={mode.icon}/></svg>
                                  <div>
                                    <div style={{ fontSize: 12, fontWeight: 600 }}>{mode.label}</div>
                                    <div style={{ fontSize: 10, opacity: 0.45, fontWeight: 400, marginTop: 1 }}>{mode.desc}</div>
                                  </div>
                                </button>
                              ))}
                              <div style={{ padding: "6px 10px 2px", fontSize: 10, color: "var(--pw-text-dim)", opacity: 0.35, borderTop: "1px solid var(--pw-border)", marginTop: 4 }}>
                                Rewrites all prose — undoable
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    <div className={`pw-chapter-bolton-wrap pw-block-bolton-wrap ${openBoltonDropdownId === "chapter" ? "pw-bolton-open" : ""}`}>
                      <button
                        type="button"
                        className={`pw-chapter-bolton-trigger ${chapterBoltonId ? "pw-bolton-active" : ""}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (openBoltonDropdownId === "chapter") {
                            closeBoltonDropdowns();
                          } else {
                            closeBoltonDropdowns();
                            setOpenBoltonDropdownId("chapter");
                            const wrap = e.currentTarget.parentElement;
                            if (wrap) {
                              const dd = wrap.querySelector(".pw-block-bolton-dropdown") as HTMLElement | null;
                              if (dd) positionDropdown(e.currentTarget, dd);
                            }
                          }
                        }}
                        title={chapterBoltonId ? (() => { const bo = (novel.storyBible.boltons ?? []).find((b) => b.id === chapterBoltonId); return bo ? `Bolt-On: ${bo.title}\n${bo.prompt || bo.description || "No description"}` : "Bolt-On"; })() : "Apply Bolt-On to chapter"}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill={chapterBoltonId ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                        {chapterBoltonId ? <span className="pw-chapter-bolton-name">{(novel.storyBible.boltons ?? []).find((b) => b.id === chapterBoltonId)?.title || "Bolt-On"}</span> : <span style={{ fontSize: 11, fontWeight: 600 }}>Bolt-Ons</span>}
                      </button>
                      <div className="pw-block-bolton-dropdown">
                        <div className="pw-bolton-dropdown-head">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                          Chapter Bolt-On
                        </div>
                        <div className="pw-bolton-dropdown-body">
                          <button type="button" className={`pw-block-bolton-option pw-bolton-dropdown-none ${!chapterBoltonId ? "active" : ""}`} onClick={() => { setChapterBoltonForActiveChapter(""); closeBoltonDropdowns(); }}>
                            <span className="pw-block-bolton-option-icon">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </span>
                            <span className="pw-block-bolton-option-text">
                              <span className="pw-block-bolton-option-title">None</span>
                              <span className="pw-block-bolton-option-cat">No bolt-on applied</span>
                            </span>
                          </button>
                          {(novel.storyBible.boltons ?? []).map((b, i) => (
                            <button key={b.id} type="button" className={`pw-block-bolton-option ${chapterBoltonId === b.id ? "active" : ""}`} onClick={() => { setChapterBoltonForActiveChapter(b.id); closeBoltonDropdowns(); }}>
                              <span className="pw-block-bolton-option-icon">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                              </span>
                              <span className="pw-block-bolton-option-text">
                                <span className="pw-block-bolton-option-title">{b.title || `Bolt-On ${i + 1}`}</span>
                                <span className="pw-block-bolton-option-cat">{getBoltonCategoryMeta(b.category).label}</span>
                              </span>
                            </button>
                          ))}
                          <div className="pw-bolton-dropdown-sep" />
                          <button type="button" className="pw-block-bolton-option" onClick={() => { closeBoltonDropdowns(); setWritingPacksOpen(true); }}>
                            <span className="pw-block-bolton-option-icon" style={{ background: "rgba(var(--pw-accent-rgb, 163,230,53), 0.08)", color: "var(--pw-accent)" }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                            </span>
                            <span className="pw-block-bolton-option-text">
                              <span className="pw-block-bolton-option-title" style={{ color: "var(--pw-accent)" }}>Browse Packs</span>
                              <span className="pw-block-bolton-option-cat">Install from writing packs</span>
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                      <div className="pw-settings-toggle-row">
                        <span className={`pw-settings-toggle-label ${hideBlocks ? "off" : "on"}`}>{hideBlocks ? "Blocs hidden" : "Blocs"}</span>
                        <label className="pw-settings-toggle">
                          <input
                            type="checkbox"
                            checked={!hideBlocks}
                            onChange={() => {
                              if (!activeChapter) return;
                              const willHide = !hideBlocks;
                              if (willHide) {
                                const blks = getSceneBlocks(activeChapter);
                                if (blks.length > 0) {
                                  syncChapterContentFromBlocks(activeChapter.id, blks);
                                }
                              } else {
                                const blks = getSceneBlocks(activeChapter);
                                if (blks.length > 0) {
                                  syncBlocksFromChapterContent(activeChapter.id, blks);
                                }
                              }
                              setHideBlocks(willHide);
                            }}
                          />
                          <span className="pw-settings-toggle-track" />
                        </label>
                      </div>
                      {hideBlocks && (
                        <span style={{ fontSize: 10, color: "var(--pw-text-dim)", maxWidth: 180, textAlign: "right", lineHeight: 1.3 }}>
                          Editing prose or running the editor will replace bloc structure
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {(() => {
                  const blocks = getSceneBlocks(activeChapter);
                  return (
                    <>
                      <div className="pw-editor-toolbar">
                        {/* Text alignment */}
                        <button type="button" className={`pw-toolbar-btn${editorTextAlign === "left" ? " active" : ""}`} title="Align left" onClick={() => setEditorTextAlign("left")}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>
                        </button>
                        <button type="button" className={`pw-toolbar-btn${editorTextAlign === "center" ? " active" : ""}`} title="Align center" onClick={() => setEditorTextAlign("center")}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
                        </button>
                        <button type="button" className={`pw-toolbar-btn${editorTextAlign === "right" ? " active" : ""}`} title="Align right" onClick={() => setEditorTextAlign("right")}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>
                        </button>
                        <button type="button" className={`pw-toolbar-btn${editorTextAlign === "justify" ? " active" : ""}`} title="Justify" onClick={() => setEditorTextAlign("justify")}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                        </button>
                        <span className="pw-toolbar-sep" />
                        {/* Font family */}
                        <select className="pw-toolbar-font-select" value={editorFontFamily} onChange={(e) => setEditorFontFamily(e.target.value)} title="Font">
                          {EDITOR_FONT_OPTIONS.map((f) => (
                            <option key={f.id} value={f.id}>{f.label}</option>
                          ))}
                        </select>
                        {/* Font size */}
                        <select className="pw-toolbar-font-select pw-toolbar-size-select" value={editorFontSize} onChange={(e) => setEditorFontSize(Number(e.target.value))} title="Font size">
                          {EDITOR_FONT_SIZES.map((s) => (
                            <option key={s} value={s}>{s}px</option>
                          ))}
                        </select>
                        <span className="pw-toolbar-sep" />
                        <button type="button" className="pw-toolbar-btn" title="Add scene block (or type /)" onClick={() => { const b = getSceneBlocks(activeChapter); insertSceneBlockAt(b, b.length); }}>
                          /
                        </button>
                      </div>
                      {/* ── Blocks with interleaved prose ── */}
                      {!hideBlocks && blocks.length > 0 && (
                      <div className="pw-chapter-blocks" dir="ltr">
                        {blocks.map((block, idx) => {
                          const isBlockBusy = storyAiBusyAction === `block-prose-${idx}`;
                          const editorFont = EDITOR_FONT_OPTIONS.find((f) => f.id === editorFontFamily)?.font ?? "Georgia, serif";
                          return (
                          <div key={idx} className="pw-block-wrap">
                            <div className="pw-block-card">
                              <div className="pw-block-header">
                                <span className="pw-block-title">SCENE {idx + 1}</span>
                                <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                                  {!!block.prose?.trim() && (
                                    <button
                                      type="button"
                                      className="pw-block-header-btn"
                                      title="Clear prose"
                                      onClick={() => {
                                        if (!confirm("Clear all prose for this scene?")) return;
                                        pushUndoSnapshot(activeChapter.id, activeChapter.content, activeChapter.sceneBlocks, true);
                                        const next = [...blocks];
                                        next[idx] = { ...block, prose: "" };
                                        updateSceneBlocks(activeChapter.id, next);
                                        syncChapterContentFromBlocks(activeChapter.id, next);
                                      }}
                                      aria-label="Clear prose"
                                    >
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
                                    </button>
                                  )}
                                  <button type="button" className="pw-block-header-btn pw-block-delete" title="Delete bloc" onClick={() => deleteSceneBlockAt(blocks, idx)} aria-label="Delete bloc">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                                  </button>
                                </div>
                              </div>
                              <textarea className="pw-block-synopsis" placeholder="Scene synopsis..." value={block.synopsis} onChange={(e) => { const next = [...blocks]; next[idx] = { ...block, synopsis: e.target.value }; updateSceneBlocks(activeChapter.id, next); }} rows={2} />
                              <div className="pw-block-toolbar" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                                <div className="pw-block-word-pills">
                                  {WORD_TARGET_OPTIONS.map((opt) => (
                                    <button key={opt.value} type="button" className={`pw-word-pill ${block.wordTarget === opt.value ? "active" : ""}`} onClick={() => { const next = [...blocks]; next[idx] = { ...block, wordTarget: opt.value }; updateSceneBlocks(activeChapter.id, next); }} title={opt.title}>{opt.label}</button>
                                  ))}
                                </div>
                                <select value={block.focus} onChange={(e) => { const next = [...blocks]; next[idx] = { ...block, focus: e.target.value }; updateSceneBlocks(activeChapter.id, next); }} title="Focus mode" style={{ fontSize: 11, padding: "4px 8px" }}>
                                  {FOCUS_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                                </select>
                                    {chapterBoltonId ? (
                                      <div className="pw-block-bolton-wrap pw-block-bolton-hover" title={`Chapter Bolt-On: ${(novel.storyBible.boltons ?? []).find((b) => b.id === chapterBoltonId)?.title || "Bolt-On"}`}>
                                        <span className="pw-block-bolton-trigger pw-bolton-active pw-bolton-locked">
                                          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                                        </span>
                                      </div>
                                    ) : (
                                      <div className={`pw-block-bolton-wrap pw-block-bolton-hover ${openBoltonDropdownId === `block-${idx}` ? "pw-bolton-open" : ""}`}>
                                        <button
                                          type="button"
                                          className={`pw-block-bolton-trigger ${block.notes ? "pw-bolton-active" : ""}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const blockKey = `block-${idx}`;
                                            if (openBoltonDropdownId === blockKey) {
                                              closeBoltonDropdowns();
                                            } else {
                                              closeBoltonDropdowns();
                                              setOpenBoltonDropdownId(blockKey);
                                              const wrap = e.currentTarget.parentElement;
                                              if (wrap) {
                                                const dd = wrap.querySelector(".pw-block-bolton-dropdown") as HTMLElement | null;
                                                if (dd) positionDropdown(e.currentTarget, dd);
                                              }
                                            }
                                          }}
                                          title={block.notes ? `Bolt-On: ${(novel.storyBible.boltons ?? []).find((b) => b.id === block.notes)?.title || ""}` : "Attach a Bolt-On"}
                                        >
                                          <svg width="13" height="13" viewBox="0 0 24 24" fill={block.notes ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                                        </button>
                                        <div className="pw-block-bolton-dropdown">
                                          <div className="pw-bolton-dropdown-head">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                                            Bloc Bolt-On
                                          </div>
                                          <div className="pw-bolton-dropdown-body">
                                            <button
                                              type="button"
                                              className={`pw-block-bolton-option pw-bolton-dropdown-none ${!block.notes ? "active" : ""}`}
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                closeBoltonDropdowns();
                                                const next = [...blocks];
                                                next[idx] = { ...block, notes: "" };
                                                updateSceneBlocks(activeChapter.id, next);
                                              }}
                                            >
                                              <span className="pw-block-bolton-option-icon">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                              </span>
                                              <span className="pw-block-bolton-option-text">
                                                <span className="pw-block-bolton-option-title">None</span>
                                                <span className="pw-block-bolton-option-cat">No bolt-on applied</span>
                                              </span>
                                            </button>
                                            {(novel.storyBible.boltons ?? []).map((b, i) => (
                                              <button
                                                key={b.id}
                                                type="button"
                                                className={`pw-block-bolton-option ${block.notes === b.id ? "active" : ""}`}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  closeBoltonDropdowns();
                                                  const next = [...blocks];
                                                  next[idx] = { ...block, notes: b.id };
                                                  updateSceneBlocks(activeChapter.id, next);
                                                }}
                                              >
                                                <span className="pw-block-bolton-option-icon">
                                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                                                </span>
                                                <span className="pw-block-bolton-option-text">
                                                  <span className="pw-block-bolton-option-title">{b.title || `Bolt-On ${i + 1}`}</span>
                                                  <span className="pw-block-bolton-option-cat">{getBoltonCategoryMeta(b.category).label}</span>
                                                </span>
                                              </button>
                                            ))}
                                            <div className="pw-bolton-dropdown-sep" />
                                            <button type="button" className="pw-block-bolton-option" onClick={(e) => { e.stopPropagation(); closeBoltonDropdowns(); setWritingPacksOpen(true); }}>
                                              <span className="pw-block-bolton-option-icon" style={{ background: "rgba(var(--pw-accent-rgb, 163,230,53), 0.08)", color: "var(--pw-accent)" }}>
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                                              </span>
                                              <span className="pw-block-bolton-option-text">
                                                <span className="pw-block-bolton-option-title" style={{ color: "var(--pw-accent)" }}>Browse Packs</span>
                                                <span className="pw-block-bolton-option-cat">Install from writing packs</span>
                                              </span>
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                <button type="button" className="pw-block-btn" title="Insert bloc after" onClick={() => insertSceneBlockAt(blocks, idx)}>/</button>
                              </div>
                            </div>
                            {/* ── Seamless prose area (styled like main editor) ── */}
                            {block.synopsis?.trim() && (
                              <button
                                type="button"
                                disabled={isBlockBusy || !!storyAiBusyAction}
                                onClick={() => void runGenerateBlockProse(idx)}
                                style={{
                                  display: "inline-flex", alignItems: "center", gap: 5,
                                  padding: "4px 12px", margin: "8px 0 4px",
                                  borderRadius: 6, fontSize: 12, fontWeight: 600,
                                  background: "none", border: "none",
                                  color: "var(--pw-accent)", cursor: isBlockBusy || storyAiBusyAction ? "not-allowed" : "pointer",
                                  opacity: isBlockBusy || storyAiBusyAction ? 0.5 : 0.8,
                                  transition: "opacity 0.15s",
                                  fontFamily: "inherit",
                                }}
                                onMouseEnter={(e) => { if (!isBlockBusy && !storyAiBusyAction) e.currentTarget.style.opacity = "1"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.opacity = isBlockBusy || storyAiBusyAction ? "0.5" : "0.8"; }}
                              >
                                {isBlockBusy ? (
                                  <><span style={{ width: 12, height: 12, border: "2px solid rgba(var(--pw-accent-rgb,163,230,53),0.2)", borderTopColor: "var(--pw-accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} /> {block.prose?.trim() ? "Regenerating..." : "Generating..."}</>
                                ) : block.prose?.trim() ? "✦ Regenerate prose" : "✦ Generate prose for this scene"}
                              </button>
                            )}
                            {isBlockBusy && block.prose?.trim() && (
                              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 0", fontSize: 12, color: "var(--pw-accent)", fontWeight: 600 }}>
                                <span style={{ width: 12, height: 12, border: "2px solid rgba(var(--pw-accent-rgb,163,230,53),0.2)", borderTopColor: "var(--pw-accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                                Regenerating...
                              </div>
                            )}
                            <textarea
                              ref={(el) => { blockProseRefs.current[idx] = el; }}
                              className="pw-editor-input pw-block-prose-seamless"
                              style={{
                                fontFamily: editorFont,
                                textAlign: editorTextAlign,
                                fontSize: editorFontSize,
                                minHeight: block.prose?.trim() ? 80 : 36,
                                border: "none",
                                background: "transparent",
                                padding: "8px 0 16px",
                                width: "100%",
                                boxSizing: "border-box",
                                outline: "none",
                                resize: "none",
                              }}
                              dir="ltr"
                              spellCheck
                              placeholder={block.prose?.trim() ? undefined : "Start writing this scene..."}
                              value={block.prose || ""}
                              onChange={(e) => {
                                const next = [...blocks];
                                next[idx] = { ...block, prose: e.target.value };
                                updateSceneBlocks(activeChapter.id, next);
                                syncChapterContentFromBlocks(activeChapter.id, next);
                              }}
                              onInput={(event) => autoSizeEditorInput(event.currentTarget)}
                              onMouseUp={(e) => handleEditorMouseUp(e, idx)}
                            />
                          </div>
                          );
                        })}
                      </div>
                      )}
                      {/* ── Unified chapter editor (no blocks, or blocks hidden) ── */}
                      {(blocks.length === 0 || hideBlocks) && (
                      <textarea
                        ref={editorInputRef}
                        data-pw-plain-editor
                        className="pw-editor-input"
                        style={{
                          fontFamily:
                            EDITOR_FONT_OPTIONS.find((f) => f.id === editorFontFamily)?.font ??
                            "Georgia, serif",
                          textAlign: editorTextAlign,
                          fontSize: editorFontSize,
                          minHeight: "70vh",
                          width: "100%",
                          resize: "none",
                          overflow: "hidden",
                        }}
                        dir="ltr"
                        spellCheck
                        value={activeChapter.content}
                        onMouseUp={(e) => handleEditorMouseUp(e, -1)}
                        onInput={(event) => autoSizeEditorInput(event.currentTarget)}
                        onChange={(event) => updateChapter(activeChapter.id, { content: event.target.value })}
                        onKeyDown={(e) => {
                          if ((e.key === "/" || e.key === "Slash" || e.code === "Slash") && !e.ctrlKey && !e.metaKey && !e.altKey) {
                            e.preventDefault();
                            const b = getSceneBlocks(activeChapter);
                            insertSceneBlockAt(b, b.length);
                          }
                        }}
                        placeholder="Chapter prose... (type / to add a scene block)"
                      />
                      )}
                    </>
                  );
                })()}
              </div>


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
                    value={novel.synopsis || novel.storyBible?.summary?.synopsisShort || ""}
                    onChange={(event) => updateNovel({ synopsis: event.target.value })}
                    placeholder="Write your full synopsis here — this is the foundation the AI uses for every generation..."
                    rows={8}
                  />
                </div>
              </div>

              {/* Canon */}
              <div className="pw-overview-grid" style={{ gridTemplateColumns: "1fr" }}>
                <div className="pw-overview-card pw-bible-card">
                  <div className="pw-overview-card-head">
                    <div>
                      <h3>{isNF ? "My Story" : "Canon"}</h3>
                      <p className="pw-overview-sub">{isNF ? "Your life story source of truth — people, places, and events." : "Your story\u2019s source of truth — characters, world, and voice."}</p>
                    </div>
                    <button type="button" className="btn btn-primary" data-tutorial="canon" onClick={() => { if (isNF) setBibleSection("nf-about"); setShowStoryBibleModal(true); }}>
                      {isNF ? "Open My Story" : "Open Canon"}
                    </button>
                  </div>
                  <div className="pw-bible-summary">
                    {isNF ? (
                      <>
                        <div>
                          <div className="pw-bible-summary-number">{nfData?.lifeEvents?.length || 0}</div>
                          <p>Life Events</p>
                        </div>
                        <div>
                          <div className="pw-bible-summary-number">{novel.storyBible.characters?.length || 0}</div>
                          <p>People</p>
                        </div>
                        <div>
                          <div className="pw-bible-summary-number">{novel.storyBible.locations?.length || 0}</div>
                          <p>Places</p>
                        </div>
                        <div className="pw-bible-summary-wide">
                          <p className="pw-overview-sub">
                            {nfData?.centralTheme || novel.storyBible.summary?.synopsisShort
                              ? (nfData?.centralTheme || novel.storyBible.summary.synopsisShort).slice(0, 140)
                              : "Open My Story to start building your memoir."}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
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
                      </>
                    )}
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

              {/* ── Manuscript Health Score ── */}
              <div className="pw-overview-grid" style={{ gridTemplateColumns: "1fr" }}>
                <div className="pw-overview-card" data-tutorial="health">
                  <div className="pw-overview-card-head">
                    <div>
                      <h3>Manuscript Health</h3>
                      <p className="pw-overview-sub">AI-powered publishing readiness assessment</p>
                    </div>
                    <button
                      type="button"
                      className={novel.healthScore ? "btn" : "btn btn-primary"}
                      disabled={healthScoreBusy || totalWords < 100}
                      onClick={() => {
                        if (novel.healthScore) {
                          setRegenConfirm({ message: "This will regenerate your manuscript health report, replacing the current scores.", onConfirm: () => { setRegenConfirm(null); void generateHealthScore(); } });
                        } else { void generateHealthScore(); }
                      }}
                      style={{ padding: "7px 14px", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}
                      title={totalWords < 100 ? "Write at least 100 words first" : "Generate health report"}
                    >
                      {healthScoreBusy ? (
                        <>
                          <span style={{
                            width: 12, height: 12, border: "2px solid var(--pw-border)",
                            borderTopColor: "#fff", borderRadius: "50%",
                            animation: "spin 0.7s linear infinite", display: "inline-block",
                          }} />
                          Analysing...
                        </>
                      ) : novel.healthScore ? (
                        <>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                          Regenerate
                        </>
                      ) : "Run Assessment"}
                    </button>
                  </div>

                  {novel.healthScore ? (() => {
                    const hs = novel.healthScore;
                    const scoreColor = (v: number) =>
                      v >= 8 ? "#22c55e" : v >= 6 ? "#a3e635" : v >= 4 ? "#f59e0b" : "#ef4444";
                    const scoreLabel = (v: number) =>
                      v >= 9 ? "Excellent" : v >= 7 ? "Good" : v >= 5 ? "Fair" : v >= 3 ? "Needs work" : "Weak";
                    const categories = [
                      { label: "Pacing", value: hs.pacing, desc: "Scene flow and momentum" },
                      { label: "Dialogue", value: hs.dialogue, desc: "Natural, distinct speech" },
                      { label: "Clarity", value: hs.clarity, desc: "Readability and coherence" },
                      { label: "Engagement", value: hs.engagement, desc: "Reader pull and hook" },
                    ];
                    return (
                      <>
                        {/* Overall score */}
                        <div style={{
                          display: "flex", alignItems: "center", gap: 16, padding: "16px 0 12px",
                          borderBottom: "1px solid var(--pw-border-light, #2a2a2a)",
                        }}>
                          <div style={{
                            width: 56, height: 56, borderRadius: "50%",
                            border: `3px solid ${scoreColor(hs.overall)}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                          }}>
                            <span style={{ fontSize: 20, fontWeight: 800, color: scoreColor(hs.overall) }}>
                              {hs.overall}
                            </span>
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 700 }}>
                              {scoreLabel(hs.overall)} — {hs.overall}/10
                            </div>
                            <div style={{ fontSize: 11, opacity: 0.45, marginTop: 2 }}>
                              Last assessed {new Date(hs.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </div>
                          </div>
                        </div>

                        {/* Category scores */}
                        <div style={{
                          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
                          padding: "14px 0",
                        }}>
                          {categories.map((cat) => (
                            <div key={cat.label} style={{
                              padding: "10px 12px", borderRadius: 8,
                              background: "var(--pw-surface-alt, #161616)",
                              border: "1px solid var(--pw-border-light, #2a2a2a)",
                            }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                <span style={{ fontSize: 12, fontWeight: 600 }}>{cat.label}</span>
                                <span style={{ fontSize: 14, fontWeight: 800, color: scoreColor(cat.value) }}>
                                  {cat.value}/10
                                </span>
                              </div>
                              {/* Score bar */}
                              <div style={{
                                height: 4, borderRadius: 2, background: "var(--pw-border, #333)",
                                overflow: "hidden",
                              }}>
                                <div style={{
                                  height: "100%", borderRadius: 2, width: `${cat.value * 10}%`,
                                  background: scoreColor(cat.value),
                                  transition: "width 0.3s ease-out",
                                }} />
                              </div>
                              <div style={{ fontSize: 10, opacity: 0.4, marginTop: 4 }}>{cat.desc}</div>
                            </div>
                          ))}
                        </div>

                        {/* Overall Tips */}
                        {hs.tips.length > 0 && (
                          <div style={{
                            padding: "12px 14px", borderRadius: 8, marginTop: 2,
                            background: "rgba(var(--pw-accent-rgb, 163,230,53), 0.03)",
                            border: "1px solid rgba(var(--pw-accent-rgb, 163,230,53), 0.08)",
                          }}>
                            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8, color: "var(--pw-accent)" }}>
                              Overall Tips
                            </div>
                            <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: 12, lineHeight: 1.7, opacity: 0.8 }}>
                              {hs.tips.map((tip, i) => (
                                <li key={i} style={{ marginBottom: 4 }}>{tip}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Per-chapter breakdown with left/right navigation */}
                        {hs.chapterBreakdowns && hs.chapterBreakdowns.length > 0 && (() => {
                          const chIdx = Math.min(healthChapterIdx, hs.chapterBreakdowns!.length - 1);
                          const chb = hs.chapterBreakdowns![chIdx];
                          const chCategories = [
                            { label: "Pacing", value: chb.pacing },
                            { label: "Dialogue", value: chb.dialogue },
                            { label: "Clarity", value: chb.clarity },
                            { label: "Engagement", value: chb.engagement },
                          ];
                          return (
                            <div style={{
                              marginTop: 10, borderRadius: 10, padding: "14px 16px",
                              background: "var(--pw-overlay-bg)", border: "1px solid var(--pw-border-light)",
                            }}>
                              {/* Chapter nav header */}
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                                <button type="button" disabled={chIdx <= 0}
                                  onClick={() => setHealthChapterIdx((p) => Math.max(0, p - 1))}
                                  style={{
                                    background: "var(--pw-overlay-bg-hover)", border: "none", borderRadius: 6,
                                    width: 26, height: 26, cursor: chIdx <= 0 ? "default" : "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    opacity: chIdx <= 0 ? 0.25 : 0.7, color: "inherit",
                                  }}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
                                </button>
                                <div style={{ textAlign: "center" }}>
                                  <div style={{ fontSize: 12, fontWeight: 700 }}>{chb.chapterTitle || `Chapter ${chIdx + 1}`}</div>
                                  <div style={{ fontSize: 10, color: "var(--pw-text-dim)", marginTop: 1 }}>{chIdx + 1} of {hs.chapterBreakdowns!.length}</div>
                                </div>
                                <button type="button" disabled={chIdx >= hs.chapterBreakdowns!.length - 1}
                                  onClick={() => setHealthChapterIdx((p) => Math.min(hs.chapterBreakdowns!.length - 1, p + 1))}
                                  style={{
                                    background: "var(--pw-overlay-bg-hover)", border: "none", borderRadius: 6,
                                    width: 26, height: 26, cursor: chIdx >= hs.chapterBreakdowns!.length - 1 ? "default" : "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    opacity: chIdx >= hs.chapterBreakdowns!.length - 1 ? 0.25 : 0.7, color: "inherit",
                                  }}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
                                </button>
                              </div>
                              {/* Chapter scores */}
                              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                                {chCategories.map((cat) => (
                                  <div key={cat.label} style={{
                                    flex: 1, padding: "6px 0", textAlign: "center", borderRadius: 6,
                                    background: "var(--pw-overlay-bg)",
                                  }}>
                                    <div style={{ fontSize: 14, fontWeight: 800, color: scoreColor(cat.value) }}>{cat.value}</div>
                                    <div style={{ fontSize: 9, color: "var(--pw-text-dim)", marginTop: 1 }}>{cat.label}</div>
                                  </div>
                                ))}
                              </div>
                              {/* Chapter tips */}
                              {chb.tips.length > 0 && (
                                <ul style={{ margin: 0, padding: "0 0 0 14px", fontSize: 11, lineHeight: 1.7, opacity: 0.75 }}>
                                  {chb.tips.map((tip, ti) => <li key={ti} style={{ marginBottom: 2 }}>{tip}</li>)}
                                </ul>
                              )}
                            </div>
                          );
                        })()}

                        {/* Clear button */}
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                          <button type="button" onClick={() => updateNovel({ healthScore: null })}
                            style={{ background: "none", border: "none", fontSize: 10, color: "var(--pw-text-dim)", cursor: "pointer", opacity: 0.5, padding: "4px 8px" }}>
                            Clear report
                          </button>
                        </div>
                      </>
                    );
                  })() : (
                    <div style={{ textAlign: "center", padding: "28px 16px", opacity: 0.35 }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 12px", display: "block" }}>
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                      </svg>
                      <p style={{ fontSize: 13, margin: "0 0 4px" }}>No health score yet</p>
                      <p style={{ fontSize: 11, maxWidth: 280, margin: "0 auto", lineHeight: 1.5 }}>
                        {totalWords < 100
                          ? "Write at least 100 words to run the assessment."
                          : "Click \"Run Assessment\" to get your manuscript health report."}
                      </p>
                    </div>
                  )}

                </div>
              </div>


            </div>
          )}
        </section>
      </div>

      {/* Novel management (archive/delete) is handled from the studio dashboard */}

      {/* Old overview editor removed — now unified inside showEditorModal block */}

      {/* ── The Plan Modal ── */}
      {showPlanModal && (
        <div className="pw-modal-overlay" onClick={() => { cancelAiWork(); setShowPlanModal(false); saveNow(); }}>
          <div
            className="pw-plan-modal"
            data-tutorial="plan-modal"
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
                  onClick={() => { cancelAiWork(); setShowPlanModal(false); saveNow(); }}
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
                        background: "var(--pw-overlay-bg-hover)",
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

              {/* ── Arc Intelligence panel ── */}
              {(novel.storyBible.bookPlan?.arcAnalysis || arcBusy || arcError) && planChapters.length >= 3 && (
                <div data-tutorial="arc-panel" style={{
                  marginBottom: 18, borderRadius: 14,
                  background: "var(--pw-overlay-bg)",
                  border: "1px solid var(--pw-border)",
                  overflow: "hidden",
                }}>
                  {/* Panel header */}
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 18px", borderBottom: "1px solid var(--pw-border-light)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: "rgba(var(--pw-accent-rgb, 163,230,53), 0.08)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--pw-accent, #a3e635)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                      </div>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>Arc Intelligence</span>
                        {novel.storyBible.bookPlan?.arcAnalysis?.selectedChoiceIndex != null && (
                          <span style={{
                            marginLeft: 8, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                            background: "rgba(163,230,53,0.12)", color: "#a3e635",
                          }}>
                            Applied
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={arcBusy || aiOff || !!storyAiBusyAction}
                      onClick={() => {
                        if (novel.storyBible.bookPlan?.arcAnalysis?.selectedChoiceIndex != null) {
                          setArcRegenWarning(true);
                        } else {
                          void runArcAnalysis();
                        }
                      }}
                      title={aiOff ? "Enable AI to use Arc Intelligence" : "Regenerate arc choices"}
                      style={{
                        padding: "6px 14px", fontSize: 11, fontWeight: 700, borderRadius: 8,
                        background: arcBusy ? "var(--pw-overlay-bg)" : "rgba(var(--pw-accent-rgb, 163,230,53), 0.08)",
                        color: arcBusy ? "var(--pw-text-dim)" : "var(--pw-accent, #a3e635)",
                        border: arcBusy ? "1px solid var(--pw-border)" : "1px solid rgba(var(--pw-accent-rgb, 163,230,53), 0.2)", cursor: arcBusy ? "default" : "pointer",
                        display: "flex", alignItems: "center", gap: 6,
                      }}
                    >
                      {arcBusy ? (
                        <><span className="pw-plan-spinner" style={{ width: 12, height: 12 }} /> Generating Arcs...</>
                      ) : (
                        <>{novel.storyBible.bookPlan?.arcAnalysis ? "Regenerate" : "Run Analysis"}</>
                      )}
                    </button>
                  </div>

                  {/* Error */}
                  {arcError && (
                    <div style={{ padding: "10px 18px", fontSize: 12, color: "#ef4444", background: "rgba(239,68,68,0.06)" }}>
                      {arcError}
                    </div>
                  )}

                  {/* Busy state */}
                  {arcBusy && (
                    <div style={{ padding: "24px 18px", textAlign: "center" }}>
                      <div style={{
                        width: 24, height: 24, border: "2px solid rgba(var(--pw-accent-rgb, 163,230,53), 0.2)", borderTopColor: "var(--pw-accent, #a3e635)",
                        borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px",
                      }} />
                      <p style={{ fontSize: 13, color: "var(--pw-text-dim)", margin: 0 }}>Generating 3 arc paths for {planChapters.length} chapters...</p>
                      <p style={{ fontSize: 11, color: "var(--pw-text-dim)", margin: "6px 0 0", opacity: 0.6 }}>This may take a moment — each path includes full chapter synopses</p>
                    </div>
                  )}

                  {/* Choice cards */}
                  {!arcBusy && novel.storyBible.bookPlan?.arcAnalysis?.choices && (() => {
                    const arc = novel.storyBible.bookPlan.arcAnalysis!;
                    const choices = arc.choices!;
                    const selectedIdx = arc.selectedChoiceIndex;
                    const hasProse = novelHasProse();
                    return (
                      <div style={{ padding: "14px 18px 18px" }}>
                        {hasProse && (
                          <div style={{
                            padding: "10px 14px", borderRadius: 10, marginBottom: 14,
                            background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)",
                            display: "flex", alignItems: "center", gap: 10,
                          }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600 }}>
                              Note: Applying an arc will update chapter synopses. Your existing prose won&apos;t be changed but you may want to review chapters afterwards.
                            </span>
                          </div>
                        )}

                        {selectedIdx != null && (
                          <div style={{
                            padding: "10px 14px", borderRadius: 10, marginBottom: 14,
                            background: "rgba(163,230,53,0.06)", border: "1px solid rgba(163,230,53,0.15)",
                            display: "flex", alignItems: "center", gap: 10,
                          }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a3e635" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                            <span style={{ fontSize: 12, color: "#a3e635", fontWeight: 600 }}>
                              &ldquo;{choices[selectedIdx]?.name}&rdquo; applied — chapter synopses updated
                            </span>
                          </div>
                        )}

                        <div style={{ fontSize: 11, color: "var(--pw-text-dim)", marginBottom: 12, lineHeight: 1.5 }}>
                          Choose an arc direction. Selecting one will rewrite all chapter synopses to follow that narrative path.
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          {choices.map((choice, ci) => {
                            const isSelected = selectedIdx === ci;
                            const isApplying = arcApplyingChoice === ci;
                            const scoreColor = choice.score >= 8 ? "#a3e635" : choice.score >= 6 ? "#f59e0b" : "#ef4444";
                            const isExpanded = arcExpandedDimension === (`choice-${ci}`);
                            return (
                              <div key={ci} style={{
                                borderRadius: 12, overflow: "hidden",
                                border: isSelected ? "1px solid rgba(163,230,53,0.3)" : "1px solid var(--pw-border-light)",
                                background: isSelected ? "rgba(163,230,53,0.04)" : "var(--pw-overlay-bg)",
                                transition: "all 0.2s",
                              }}>
                                <div
                                  style={{ padding: "14px 16px", cursor: "pointer" }}
                                  onClick={() => setArcExpandedDimension(isExpanded ? null : `choice-${ci}`)}
                                >
                                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                                        {ci === 0 && (
                                          <span style={{
                                            fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em",
                                            padding: "2px 7px", borderRadius: 5,
                                            background: "rgba(163,230,53,0.12)", color: "#a3e635",
                                          }}>Best</span>
                                        )}
                                        <span style={{ fontWeight: 700, fontSize: 14, color: "var(--pw-text)" }}>{choice.name}</span>
                                        {isSelected && (
                                          <svg width="14" height="14" viewBox="0 0 24 24" fill="#a3e635" stroke="none"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                                        )}
                                      </div>
                                      <div style={{ fontSize: 12, color: "var(--pw-text-dim)", lineHeight: 1.5 }}>{choice.description}</div>
                                    </div>
                                    <div style={{
                                      minWidth: 48, height: 48, borderRadius: 12,
                                      background: `${scoreColor}11`,
                                      border: `1px solid ${scoreColor}33`,
                                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                                      flexShrink: 0,
                                    }}>
                                      <span style={{ fontSize: 18, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{choice.score}</span>
                                      <span style={{ fontSize: 8, fontWeight: 700, color: scoreColor, opacity: 0.7, textTransform: "uppercase" }}>/10</span>
                                    </div>
                                  </div>

                                  <div style={{ fontSize: 11, color: "var(--pw-text-dim)", fontStyle: "italic", lineHeight: 1.4 }}>
                                    {choice.rationale}
                                  </div>

                                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, gap: 8 }}>
                                    <button
                                      type="button"
                                      style={{
                                        fontSize: 10, fontWeight: 600, color: "var(--pw-text-dim)",
                                        background: "none", border: "none", cursor: "pointer", padding: 0,
                                        display: "flex", alignItems: "center", gap: 4,
                                      }}
                                      onClick={(e) => { e.stopPropagation(); setArcExpandedDimension(isExpanded ? null : `choice-${ci}`); }}
                                    >
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d={isExpanded ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"}/>
                                      </svg>
                                      {isExpanded ? "Hide chapters" : `Preview ${choice.chapterSynopses.length} chapters`}
                                    </button>

                                    {!isSelected && (
                                      <button
                                        type="button"
                                        disabled={isApplying}
                                        onClick={(e) => { e.stopPropagation(); applyArcChoice(ci); }}
                                        style={{
                                          padding: "5px 14px", fontSize: 11, fontWeight: 700, borderRadius: 8,
                                          background: isApplying ? "var(--pw-accent, #a3e635)" : "rgba(var(--pw-accent-rgb, 163,230,53), 0.1)",
                                          color: isApplying ? "#111" : "var(--pw-accent, #a3e635)",
                                          border: "1px solid rgba(var(--pw-accent-rgb, 163,230,53), 0.2)",
                                          cursor: "pointer",
                                          transition: "all 0.15s",
                                        }}
                                      >
                                        {isApplying ? "Applying..." : "Apply This Arc"}
                                      </button>
                                    )}
                                    {isSelected && (
                                      <span style={{ fontSize: 11, fontWeight: 700, color: "#a3e635", display: "flex", alignItems: "center", gap: 4 }}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#a3e635" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                                        Applied
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Expanded chapter preview */}
                                {isExpanded && (
                                  <div style={{
                                    borderTop: "1px solid var(--pw-border-light)",
                                    padding: "12px 16px", background: "rgba(0,0,0,0.1)",
                                    maxHeight: 320, overflowY: "auto",
                                  }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--pw-text-dim)", marginBottom: 8 }}>
                                      Chapter synopses for this arc
                                    </div>
                                    {choice.chapterSynopses.map((syn, si) => (
                                      <div key={si} style={{
                                        padding: "8px 0",
                                        borderBottom: si < choice.chapterSynopses.length - 1 ? "1px solid var(--pw-border-light)" : "none",
                                      }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--pw-text)", marginBottom: 3 }}>
                                          Ch. {si + 1}: {planChapters[si]?.title || `Chapter ${si + 1}`}
                                        </div>
                                        <div style={{ fontSize: 11, color: "var(--pw-text-dim)", lineHeight: 1.5 }}>{syn}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Also show a small "Run Arc Intelligence" button when no analysis exists yet */}
              {!novel.storyBible.bookPlan?.arcAnalysis && !arcBusy && planChapters.length >= 3 && !aiOff && (
                <div style={{ marginBottom: 14, textAlign: "center" }}>
                  <button
                    type="button"
                    onClick={() => void runArcAnalysis()}
                    style={{
                      padding: "8px 18px", fontSize: 12, fontWeight: 700, borderRadius: 10,
                      background: "rgba(var(--pw-accent-rgb, 163,230,53), 0.08)",
                      color: "var(--pw-accent, #a3e635)", border: "1px solid rgba(var(--pw-accent-rgb, 163,230,53), 0.15)",
                      cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                    Run Arc Intelligence
                  </button>
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

      {/* ── Share Modal ── */}
      {showShareModal && novel && (
        <div className="pw-modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="pw-modal pw-export-modal" onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
            {/* Close X */}
            <button
              type="button"
              onClick={() => setShowShareModal(false)}
              style={{
                position: "absolute", top: 14, right: 14, zIndex: 2,
                background: "none", border: "none", cursor: "pointer",
                width: 28, height: 28, borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--pw-text-dim)", transition: "all 0.12s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "var(--pw-text)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--pw-text-dim)"; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            <div className="pw-export-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: "rgba(var(--pw-accent-rgb, 163,230,53), 0.08)",
                  border: "1px solid rgba(var(--pw-accent-rgb, 163,230,53), 0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--pw-accent, #a3e635)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                </div>
                <div className="pw-delete-modal-title" style={{ margin: 0 }}>Share for Feedback</div>
              </div>
              <p className="pw-delete-modal-copy" style={{ paddingRight: 24 }}>
                Send a read-only link to a reader. They can highlight text, leave notes, and send feedback back to you.
              </p>
            </div>

            <div className="pw-export-section">
              <p className="pw-export-label">Chapters to share</p>
              <div className="pw-export-chapter-tools">
                <span>Chapters {selectedShareChapterIds.length}/{novel.chapters.length}</span>
                <div className="pw-export-tool-actions">
                  <button type="button" className="pw-export-tool-btn" onClick={() => setSelectedShareChapterIds(novel.chapters.map((c) => c.id))}>Select All</button>
                  <button type="button" className="pw-export-tool-btn" onClick={() => setSelectedShareChapterIds([])}>Clear All</button>
                </div>
              </div>
              <div className="pw-export-chapter-list">
                {novel.chapters.length === 0 ? (
                  <p className="pw-export-help">No chapters available yet.</p>
                ) : (
                  novel.chapters.map((ch, idx) => {
                    const checked = selectedShareChapterIds.includes(ch.id);
                    return (
                      <label key={ch.id} className="pw-export-chapter-item">
                        <input
                          type="checkbox"
                          className="pw-checkbox"
                          checked={checked}
                          onChange={() => setSelectedShareChapterIds((cur) => cur.includes(ch.id) ? cur.filter((x) => x !== ch.id) : [...cur, ch.id])}
                        />
                        <span className="pw-export-chapter-meta">
                          <strong>{ch.title || `Chapter ${idx + 1}`}</strong>
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {/* Options section */}
            <div className="pw-export-section" style={{ borderTop: "1px solid var(--pw-border-light)", marginTop: 4, paddingTop: 14 }}>
              <p className="pw-export-label">Options</p>
              <div style={{ display: "grid", gap: 12 }}>
                {/* Expiry */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: "block", color: "var(--pw-text)" }}>Link expires after</label>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {[1, 3, 7, 14, 30].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setShareExpiryDays(d)}
                        style={{
                          padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                          border: shareExpiryDays === d ? "1.5px solid var(--pw-accent)" : "1px solid var(--pw-border)",
                          background: shareExpiryDays === d ? "rgba(var(--pw-accent-rgb, 163,230,53), 0.08)" : "transparent",
                          color: shareExpiryDays === d ? "var(--pw-accent, #a3e635)" : "var(--pw-text-muted)",
                          cursor: "pointer",
                        }}
                      >
                        {d === 1 ? "1 day" : `${d} days`}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Password */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, display: "block", color: "var(--pw-text)" }}>Password protection <span style={{ fontWeight: 400, color: "var(--pw-text-dim)" }}>(optional)</span></label>
                  <input
                    className="pw-settings-input"
                    type="text"
                    placeholder="Leave empty for no password"
                    value={sharePassword}
                    onChange={(e) => setSharePassword(e.target.value)}
                    style={{ width: "100%", fontSize: 13 }}
                    autoComplete="off"
                  />
                </div>
                {/* Email hint — shown after link is created */}
              </div>
            </div>

            {shareResult && (
              <div className="pw-export-section">
                {/* Link created success */}
                <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--pw-success-bg, rgba(16,185,129,0.08))", border: "1px solid var(--pw-success-border, rgba(16,185,129,0.18))" }}>
                  <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--pw-success, #10b981)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ verticalAlign: "-2px", marginRight: 6 }}><polyline points="20 6 9 17 4 12"/></svg>
                    Share link created!
                    {shareResult.hasPassword && <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 8, opacity: 0.8 }}>Password protected</span>}
                  </p>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      className="pw-settings-input"
                      type="text"
                      readOnly
                      value={shareResult.url}
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                      style={{ flex: 1, fontSize: 12, fontFamily: "monospace" }}
                    />
                    <button type="button" className="btn btn-primary" style={{ padding: "7px 16px", fontSize: 12 }} onClick={() => { navigator.clipboard.writeText(shareResult.url); }}>Copy</button>
                  </div>
                  <p style={{ fontSize: 11, color: "var(--pw-text-dim)", marginTop: 6, marginBottom: 0 }}>
                    Link expires {new Date(shareResult.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>

                {/* Invite by email — opens email app */}
                <div style={{
                  marginTop: 10, padding: "12px 14px", borderRadius: 10,
                  background: "var(--pw-surface-alt)", border: "1px solid var(--pw-border-light)",
                }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: "var(--pw-text)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--pw-accent, #a3e635)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    Invite by email
                  </p>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      className="pw-settings-input"
                      type="email"
                      placeholder="reader@example.com"
                      value={shareRecipientEmail}
                      onChange={(e) => setShareRecipientEmail(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && shareRecipientEmail.trim()) {
                          e.preventDefault();
                          openShareEmailInClient();
                        }
                      }}
                      style={{ flex: 1, fontSize: 13 }}
                    />
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={!shareRecipientEmail.trim()}
                      style={{ padding: "8px 16px", fontSize: 12, whiteSpace: "nowrap", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: shareRecipientEmail.trim() ? 1 : 0.4 }}
                      onClick={openShareEmailInClient}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                      Email
                    </button>
                  </div>
                  {shareResult.hasPassword && sharePassword.trim() && (
                    <p style={{ fontSize: 11, marginTop: 6, marginBottom: 0, lineHeight: 1.4, color: "var(--pw-accent, #a3e635)", display: "flex", alignItems: "center", gap: 5 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                      Password will be included in the email
                    </p>
                  )}
                </div>

                {/* Warning about editing */}
                <div style={{
                  marginTop: 10, padding: "10px 12px", borderRadius: 8,
                  background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)",
                  display: "flex", gap: 8, alignItems: "flex-start",
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                  </svg>
                  <p style={{ fontSize: 11, color: "#f59e0b", lineHeight: 1.5, margin: 0 }}>
                    <strong>Don&apos;t edit these chapters</strong> while waiting for feedback. If you change the text, reader annotations won&apos;t line up and &ldquo;Apply with AI&rdquo; may not work correctly.
                  </p>
                </div>
              </div>
            )}

            {shareError && <p className="pw-export-error">{shareError}</p>}

            <div className="pw-delete-modal-actions">
              <button type="button" className="btn pw-cancel-btn" onClick={() => setShowShareModal(false)}>Cancel</button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={sharingLink || selectedShareChapterIds.length === 0}
                onClick={async () => {
                  setSharingLink(true);
                  setShareError(null);
                  setShareResult(null);
                  try {
                    const payload: Record<string, unknown> = {
                      novelId: novel.id,
                      chapterIds: selectedShareChapterIds,
                      expiryDays: shareExpiryDays,
                      novelTitle: novel.title || "Untitled Novel",
                    };
                    if (sharePassword.trim()) payload.password = sharePassword.trim();
                    const res = await fetch("/api/share", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload),
                    });
                    const data = await res.json();
                    if (res.ok && data.token) {
                      setShareResult(data);
                      fetch("/api/share").then((r) => r.ok ? r.json() : []).then((d) => { if (Array.isArray(d)) setShareLinks(d); }).catch(() => {});
                    } else {
                      setShareError(data.error || "Failed to create share link.");
                    }
                  } catch {
                    setShareError("Network error. Please try again.");
                  } finally {
                    setSharingLink(false);
                  }
                }}
              >
                {sharingLink ? "Creating link..." : selectedShareChapterIds.length === 0 ? "Select chapters to share" : `Share ${selectedShareChapterIds.length} chapter${selectedShareChapterIds.length !== 1 ? "s" : ""}`}
              </button>
            </div>

            {/* Existing share links */}
            {shareLinks.filter((l) => l.status !== "revoked" && l.status !== "reviewed").length > 0 && (
              <div className="pw-export-section" style={{ borderTop: "1px solid var(--pw-border-light)", marginTop: 8, paddingTop: 16 }}>
                <p className="pw-export-label">Active share links</p>
                <div className="pw-export-chapter-list" style={{ maxHeight: 160 }}>
                  {shareLinks.filter((l) => l.status !== "revoked" && l.status !== "reviewed").map((link) => (
                    <div key={link.id} className="pw-export-chapter-item" style={{ justifyContent: "space-between" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {link.chapters.length} chapter{link.chapters.length !== 1 ? "s" : ""}
                          {link.readerName && <span style={{ fontWeight: 400, color: "var(--pw-text-muted)" }}> — {link.readerName}</span>}
                          {link.passwordHash && <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.6 }}>🔒</span>}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--pw-text-muted)", marginTop: 2 }}>
                          {new Date(link.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          {" · "}Expires {new Date(link.expiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                          {link.recipientEmail && <span style={{ marginLeft: 6 }}>→ {link.recipientEmail}</span>}
                          {link.status === "submitted" && <span style={{ marginLeft: 6, color: "var(--pw-success, #10b981)", fontWeight: 600 }}>Feedback received</span>}
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        {link.status === "submitted" && (
                          <button type="button" className="pw-export-tool-btn" onClick={() => {
                            setShowShareModal(false);
                            setShowFeedbackPanel(true);
                            setFeedbackReviewMode(false);
                            setFeedbackReviewDone(false);
                            setFeedbackReviewIdx(0);
                            setFeedbackReviewAccepted(0);
                            setFeedbackReviewRejected(0);
                            setDismissedAnnotations(new Set());
                            setFeedbackLoading(true);
                            fetch("/api/share/feedback").then((r) => r.ok ? r.json() : []).then((d) => {
                              if (Array.isArray(d)) {
                                setFeedbackData(d);
                                const queue: typeof feedbackReviewQueue = [];
                                for (const fb of d) {
                                  for (const ch of fb.chapters ?? []) {
                                    for (const ann of ch.annotations ?? []) {
                                      queue.push({
                                        fbId: fb.id, token: fb.token, readerName: fb.readerName,
                                        chapterId: ch.id, chapterTitle: ch.title, chapterContent: ch.content,
                                        ann: { id: ann.id, selectedText: ann.selectedText, startOffset: ann.startOffset, endOffset: ann.endOffset, note: ann.note, type: ann.type },
                                      });
                                    }
                                  }
                                }
                                setFeedbackReviewQueue(queue);
                              }
                            }).catch(() => {}).finally(() => setFeedbackLoading(false));
                          }} style={{ color: "var(--pw-success, #10b981)" }}>Review</button>
                        )}
                        <button type="button" className="pw-export-tool-btn" onClick={async () => {
                          await fetch(`/api/share/${link.token}`, { method: "DELETE" });
                          setShareLinks((cur) => cur.filter((l) => l.id !== link.id));
                        }} style={{ color: "var(--pw-danger, #ef4444)" }}>Revoke</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Feedback Review Panel ── */}
      {showFeedbackPanel && (
        <div className="pw-modal-overlay" onClick={() => { if (!feedbackReviewMode) { setShowFeedbackPanel(false); saveNow(); } }}>
          <div className="pw-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 620, maxHeight: "85vh", overflow: "auto" }}>

            {/* Loading state */}
            {feedbackLoading && (
              <div style={{ padding: 40, textAlign: "center" }}>
                <div style={{ width: 28, height: 28, border: "2.5px solid var(--pw-border)", borderTopColor: "var(--pw-accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 14px" }} />
                <p style={{ color: "var(--pw-text-dim)", fontSize: 13 }}>Loading feedback...</p>
              </div>
            )}

            {/* No feedback — jump to share modal */}
            {!feedbackLoading && feedbackReviewQueue.length === 0 && !feedbackReviewDone && (
              <div style={{ padding: 40, textAlign: "center" }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--pw-text-dim, #6b7280)" strokeWidth="1.5" strokeLinecap="round" style={{ margin: "0 auto 14px", display: "block" }}>
                  <circle cx="12" cy="12" r="10"/><path d="M8 12l2 2 4-4"/>
                </svg>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--pw-text)", marginBottom: 6 }}>No Feedback Yet</h3>
                <p style={{ fontSize: 13, color: "var(--pw-text-muted)", lineHeight: 1.5, marginBottom: 20 }}>
                  Share chapters with readers to start getting feedback.
                </p>
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  <button type="button" className="btn pw-cancel-btn" onClick={() => setShowFeedbackPanel(false)}>Close</button>
                  <button type="button" className="btn btn-primary" style={{ fontSize: 13, padding: "8px 20px" }} onClick={() => {
                    setShowFeedbackPanel(false);
                    if (novel) {
                      setSelectedShareChapterIds(novel.chapters.map((c) => c.id));
                      setShareResult(null);
                      setShareError(null);
                      setSharePassword("");
                      setShareExpiryDays(7);
                      setShareRecipientEmail("");
                      setShowShareModal(true);
                      setShareLinksLoading(true);
                      fetch("/api/share").then((r) => r.ok ? r.json() : []).then((linkData) => { if (Array.isArray(linkData)) setShareLinks(linkData); }).catch(() => {}).finally(() => setShareLinksLoading(false));
                    }
                  }}>Share Chapters</button>
                </div>
              </div>
            )}

            {/* Feedback summary — before starting review */}
            {!feedbackLoading && feedbackReviewQueue.length > 0 && !feedbackReviewMode && !feedbackReviewDone && (() => {
              const readerNames = [...new Set(feedbackReviewQueue.map((q) => q.readerName || "Anonymous"))];
              const chapterNames = [...new Set(feedbackReviewQueue.map((q) => q.chapterTitle))];
              return (
                <div style={{ padding: "20px 0 0" }}>
                  <div className="pw-export-header">
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                      <img src="/blocwrite-logo-white.png" alt="Blocwrite" style={{ height: 18, width: "auto", opacity: 0.7 }} />
                      <div className="pw-delete-modal-title" style={{ margin: 0 }}>Reader Feedback</div>
                    </div>
                    <p className="pw-delete-modal-copy">
                      You have <strong>{feedbackReviewQueue.length}</strong> note{feedbackReviewQueue.length !== 1 ? "s" : ""} from {readerNames.length} reader{readerNames.length !== 1 ? "s" : ""} across {chapterNames.length} chapter{chapterNames.length !== 1 ? "s" : ""}.
                    </p>
                  </div>

                  {/* Summary cards per reader */}
                  <div style={{ padding: "0 20px", marginBottom: 16 }}>
                    {feedbackData.map((fb) => {
                      const annCount = fb.chapters.reduce((sum, ch) => sum + ch.annotations.length, 0);
                      return (
                        <div key={fb.id} style={{
                          display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", marginBottom: 6,
                          borderRadius: 10, background: "var(--pw-surface-alt)",
                          border: "1px solid var(--pw-border)",
                        }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                            background: "rgba(var(--pw-accent-rgb, 163,230,53), 0.1)",
                            border: "1px solid rgba(var(--pw-accent-rgb, 163,230,53), 0.15)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            color: "var(--pw-accent, #a3e635)", fontSize: 14, fontWeight: 700,
                          }}>
                            {(fb.readerName || "A")[0].toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--pw-text)" }}>{fb.readerName || "Anonymous Reader"}</div>
                            <div style={{ fontSize: 11, color: "var(--pw-text-muted)", marginTop: 1 }}>
                              {annCount} note{annCount !== 1 ? "s" : ""} · {new Date(fb.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Chapter breakdown */}
                  <div style={{ padding: "0 20px", marginBottom: 20 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: "var(--pw-text-dim)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Chapters with feedback</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {chapterNames.map((name) => {
                        const count = feedbackReviewQueue.filter((q) => q.chapterTitle === name).length;
                        return (
                          <span key={name} style={{
                            fontSize: 12, padding: "4px 12px", borderRadius: 8,
                            background: "rgba(var(--pw-accent-rgb, 163,230,53), 0.06)", border: "1px solid rgba(var(--pw-accent-rgb, 163,230,53), 0.12)",
                            color: "var(--pw-text-muted)", fontWeight: 500,
                          }}>
                            {name} <span style={{ opacity: 0.7 }}>({count})</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pw-delete-modal-actions">
                    <button type="button" className="btn pw-cancel-btn" onClick={() => { setShowFeedbackPanel(false); saveNow(); }}>Later</button>
                    <button type="button" className="btn btn-primary" style={{ fontSize: 13, padding: "9px 24px", fontWeight: 700 }} onClick={() => {
                      setFeedbackReviewMode(true);
                      setFeedbackReviewIdx(0);
                      setFeedbackReviewAccepted(0);
                      setFeedbackReviewRejected(0);
                      setFbPreviewOriginal(null);
                      setFbPreviewRevised(null);
                      setFbPreviewGenerating(false);
                      // Jump to the first feedback's chapter
                      const first = feedbackReviewQueue[0];
                      if (first && novel) {
                        const matchChapter = novel.chapters.find((c) => c.title === first.chapterTitle);
                        if (matchChapter) setActiveChapterId(matchChapter.id);
                      }
                    }}>
                      Start Review ({feedbackReviewQueue.length} note{feedbackReviewQueue.length !== 1 ? "s" : ""})
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* ── Active Review Mode: one annotation at a time ── */}
            {!feedbackLoading && feedbackReviewMode && !feedbackReviewDone && (() => {
              const item = feedbackReviewQueue[feedbackReviewIdx];
              if (!item) return null;
              const typeColor = item.ann.type === "issue" ? "#ef4444" : item.ann.type === "suggestion" ? "var(--pw-accent, #a3e635)" : "var(--pw-text-muted)";
              const typeBg = item.ann.type === "issue" ? "rgba(239,68,68,0.08)" : item.ann.type === "suggestion" ? "rgba(var(--pw-accent-rgb, 163,230,53), 0.06)" : "rgba(255,255,255,0.03)";
              const progress = ((feedbackReviewIdx) / feedbackReviewQueue.length) * 100;

              return (
                <div>
                  {/* Progress bar */}
                  <div style={{ padding: "16px 20px 0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--pw-text)" }}>
                        Note {feedbackReviewIdx + 1} of {feedbackReviewQueue.length}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--pw-text-muted)" }}>
                        {feedbackReviewAccepted} accepted · {feedbackReviewRejected} skipped
                      </span>
                    </div>
                    <div style={{ height: 4, borderRadius: 4, background: "var(--pw-border)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${progress}%`, background: "var(--pw-accent, #a3e635)", borderRadius: 4, transition: "width 0.3s ease" }} />
                    </div>
                  </div>

                  {/* Chapter & reader info */}
                  <div style={{ padding: "14px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--pw-text-muted)" strokeWidth="2" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--pw-text)" }}>{item.chapterTitle}</span>
                    </div>
                    <span style={{ fontSize: 11, color: "var(--pw-text-dim)" }}>
                      by {item.readerName || "Anonymous"}
                    </span>
                  </div>

                  {/* The annotation card */}
                  <div style={{ padding: "14px 20px" }}>
                    <div style={{
                      borderRadius: 12, border: `1px solid ${typeColor}22`, background: typeBg, padding: "18px 16px",
                    }}>
                      {/* Type badge */}
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 6,
                        background: `${typeColor}18`, color: typeColor, textTransform: "uppercase",
                        display: "inline-block", marginBottom: 12,
                      }}>
                        {item.ann.type}
                      </span>

                      {/* Highlighted text */}
                      <div style={{
                        padding: "10px 14px", borderRadius: 8, marginBottom: 14,
                        background: "var(--pw-overlay-bg)", borderLeft: `3px solid ${typeColor}55`,
                      }}>
                        <p style={{ fontSize: 13, color: "var(--pw-text-dim)", fontStyle: "italic", lineHeight: 1.7, margin: 0 }}>
                          &ldquo;{item.ann.selectedText.slice(0, 250)}{item.ann.selectedText.length > 250 ? "..." : ""}&rdquo;
                        </p>
                      </div>

                      {/* Reader's note */}
                      <div style={{ marginBottom: 4 }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: "var(--pw-text-muted)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>Reader&apos;s Note</p>
                        <p style={{ fontSize: 14, color: "var(--pw-text)", lineHeight: 1.6, margin: 0 }}>{item.ann.note}</p>
                      </div>
                    </div>
                  </div>

                  {/* ─── AI Preview Diff ─── */}
                  {fbPreviewOriginal !== null && fbPreviewRevised !== null && (
                    <div style={{ padding: "0 20px 6px" }}>
                      <div style={{
                        borderRadius: 12,
                        border: "1px solid rgba(var(--pw-accent-rgb, 163,230,53), 0.12)",
                        background: "rgba(var(--pw-accent-rgb, 163,230,53), 0.02)",
                        overflow: "hidden",
                      }}>
                        {/* Header */}
                        <div style={{
                          padding: "10px 14px",
                          borderBottom: "1px solid var(--pw-border-light, #2a2a2a)",
                          display: "flex", alignItems: "center", gap: 8,
                        }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--pw-accent, #a3e635)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                          </svg>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--pw-accent, #a3e635)", letterSpacing: "0.02em" }}>AI Suggested Revision</span>
                        </div>
                        {/* Side-by-side diff */}
                        <div style={{ display: "flex", gap: 0, fontSize: 13, lineHeight: 1.65 }}>
                          {/* Before */}
                          <div style={{
                            flex: 1, padding: "12px 14px",
                            borderRight: "1px solid var(--pw-border-light, #2a2a2a)",
                            background: "rgba(239,68,68,0.02)",
                          }}>
                            <div style={{
                              fontSize: 9, textTransform: "uppercase", opacity: 0.35,
                              marginBottom: 6, letterSpacing: "0.08em", fontWeight: 700,
                            }}>
                              Before
                            </div>
                            <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", opacity: 0.6, fontStyle: "italic" }}>
                              {fbPreviewOriginal}
                            </div>
                          </div>
                          {/* After */}
                          <div style={{
                            flex: 1, padding: "12px 14px",
                            background: "rgba(163,230,53,0.02)",
                          }}>
                            <div style={{
                              fontSize: 9, textTransform: "uppercase", opacity: 0.35,
                              marginBottom: 6, letterSpacing: "0.08em", fontWeight: 700,
                            }}>
                              After
                            </div>
                            <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                              {fbPreviewRevised}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ─── Action buttons ─── */}
                  <div style={{ padding: "0 20px 20px", display: "flex", gap: 10 }}>
                    {/* Skip / Reject */}
                    <button
                      type="button"
                      className="btn"
                      style={{
                        flex: 1, fontSize: 13, fontWeight: 600, padding: "12px 0", borderRadius: 10,
                        border: "1px solid var(--pw-border)",
                        background: "transparent", color: "var(--pw-text-muted)",
                        cursor: "pointer", transition: "all 0.15s",
                      }}
                      disabled={feedbackReviewApplying || fbPreviewGenerating}
                      onClick={() => {
                        // If rejecting a preview, just clear it and stay on this item
                        if (fbPreviewRevised !== null) {
                          setFbPreviewOriginal(null);
                          setFbPreviewRevised(null);
                          return;
                        }
                        // Skip — move to next
                        setFeedbackReviewRejected((c) => c + 1);
                        setFbPreviewOriginal(null);
                        setFbPreviewRevised(null);
                        const nextIdx = feedbackReviewIdx + 1;
                        if (nextIdx >= feedbackReviewQueue.length) {
                          const tokens = [...new Set(feedbackReviewQueue.map((q) => q.token))];
                          for (const t of tokens) {
                            fetch(`/api/share/${t}`, { method: "PATCH" }).catch(() => {});
                          }
                          setFeedbackReviewDone(true);
                          setFeedbackReviewMode(false);
                          setPendingFeedbackCount(0);
                        } else {
                          setFeedbackReviewIdx(nextIdx);
                          const next = feedbackReviewQueue[nextIdx];
                          if (next && novel && next.chapterTitle !== item.chapterTitle) {
                            const matchChapter = novel.chapters.find((c) => c.title === next.chapterTitle);
                            if (matchChapter) setActiveChapterId(matchChapter.id);
                          }
                        }
                      }}
                    >
                      {fbPreviewRevised !== null ? "Reject" : "Skip"}
                    </button>

                    {/* Regenerate — only visible when a preview exists */}
                    {fbPreviewRevised !== null && (
                      <button
                        type="button"
                        className="btn"
                        style={{
                          flex: 1, fontSize: 13, fontWeight: 600, padding: "12px 0", borderRadius: 10,
                          border: "1px solid rgba(var(--pw-accent-rgb, 163,230,53), 0.2)",
                          background: "rgba(var(--pw-accent-rgb, 163,230,53), 0.06)", color: "var(--pw-accent, #a3e635)",
                          cursor: fbPreviewGenerating ? "wait" : "pointer", transition: "all 0.15s",
                          opacity: fbPreviewGenerating ? 0.6 : 1,
                        }}
                        disabled={fbPreviewGenerating}
                        onClick={async () => {
                          // Re-generate — call AI again
                          setFbPreviewGenerating(true);
                          try {
                            const sysMsg = [
                              "You are a careful, skilled prose editor working on a novel manuscript.",
                              "A beta reader highlighted a passage and left feedback. Your previous revision was rejected, so produce a DIFFERENT approach.",
                              "1. Revise ONLY the highlighted passage to address the reader's concern — with a fresh take.",
                              "2. PRESERVE the author's unique voice, style, tone, sentence rhythm, and vocabulary.",
                              "3. Keep the same tense, POV, and narrative perspective.",
                              "4. Do NOT add new plot points, characters, or information not implied by the original.",
                              "5. Do NOT expand the passage significantly — keep roughly the same length.",
                              "6. Return ONLY the revised passage text. No explanations, labels, quotes, or meta-commentary.",
                            ].join("\n");
                            const userPrompt = [
                              `HIGHLIGHTED PASSAGE:`,
                              `"""`,
                              item.ann.selectedText,
                              `"""`,
                              ``,
                              `READER'S FEEDBACK (${item.ann.type}): "${item.ann.note}"`,
                              ``,
                              `PREVIOUS REJECTED REVISION:`,
                              `"""`,
                              fbPreviewRevised ?? "",
                              `"""`,
                              ``,
                              `SURROUNDING CONTEXT (for tone/flow — do NOT modify):`,
                              `"""`,
                              item.chapterContent.slice(Math.max(0, item.ann.startOffset - 600), item.ann.startOffset),
                              `[HIGHLIGHTED PASSAGE GOES HERE]`,
                              item.chapterContent.slice(item.ann.endOffset, item.ann.endOffset + 600),
                              `"""`,
                              ``,
                              `Produce a DIFFERENT revision. Return ONLY the revised text:`,
                            ].join("\n");
                            const aiText = await requestOpenRouterText(userPrompt, 1200, 120000, sysMsg, false);
                            if (aiText.trim()) {
                              let revised = aiText.trim();
                              if ((revised.startsWith('"""') && revised.endsWith('"""')) || (revised.startsWith('"') && revised.endsWith('"') && !item.ann.selectedText.startsWith('"'))) {
                                revised = revised.replace(/^"{1,3}/, "").replace(/"{1,3}$/, "").trim();
                              }
                              setFbPreviewRevised(revised);
                            } else {
                              alert("AI could not regenerate. Try again.");
                            }
                          } catch (err) {
                            if (!isCancelledError(err)) alert("Failed to regenerate. Check your AI connection.");
                          } finally {
                            setFbPreviewGenerating(false);
                          }
                        }}
                      >
                        {fbPreviewGenerating ? (
                          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                            <span style={{ width: 12, height: 12, border: "2px solid rgba(var(--pw-accent-rgb, 163,230,53), 0.2)", borderTopColor: "var(--pw-accent, #a3e635)", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                            Regenerating...
                          </span>
                        ) : (
                          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4v6h6"/><path d="M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg>
                            Regenerate
                          </span>
                        )}
                      </button>
                    )}

                    {/* Generate / Accept */}
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{
                        flex: 2, fontSize: 13, fontWeight: 700, padding: "12px 0", borderRadius: 10,
                        opacity: (feedbackReviewApplying || fbPreviewGenerating) ? 0.7 : 1,
                        cursor: (feedbackReviewApplying || fbPreviewGenerating) ? "wait" : "pointer",
                      }}
                      disabled={feedbackReviewApplying || fbPreviewGenerating}
                      onClick={async () => {
                        if (!novel) return;
                        const matchChapter = novel.chapters.find((c) => c.title === item.chapterTitle);
                        if (!matchChapter) {
                          alert("Could not find this chapter in your novel.");
                          return;
                        }
                        setActiveChapterId(matchChapter.id);

                        if (fbPreviewRevised !== null) {
                          /* ═══ ACCEPT — apply the previewed revision ═══ */
                          setFeedbackReviewApplying(true);
                          try {
                            const currentContent = matchChapter.content || "";
                            const selectedText = item.ann.selectedText;

                            // Try exact match first
                            let idx = currentContent.indexOf(selectedText);

                            // Fuzzy match: try with normalised whitespace
                            if (idx === -1) {
                              const normSelected = selectedText.replace(/\s+/g, " ").trim();
                              const normContent = currentContent.replace(/\s+/g, " ");
                              const normIdx = normContent.indexOf(normSelected);
                              if (normIdx !== -1) {
                                // Map normalised offset back to original content
                                let origChars = 0;
                                let origIdx = 0;
                                let normChars = 0;
                                while (origIdx < currentContent.length && normChars < normIdx) {
                                  if (/\s/.test(currentContent[origIdx])) {
                                    while (origIdx < currentContent.length && /\s/.test(currentContent[origIdx])) origIdx++;
                                    normChars++;
                                  } else {
                                    origIdx++;
                                    normChars++;
                                  }
                                }
                                origChars = origIdx;
                                // Find the end in original
                                let endNorm = normChars;
                                let endOrig = origIdx;
                                while (endOrig < currentContent.length && endNorm < normIdx + normSelected.length) {
                                  if (/\s/.test(currentContent[endOrig])) {
                                    while (endOrig < currentContent.length && /\s/.test(currentContent[endOrig])) endOrig++;
                                    endNorm++;
                                  } else {
                                    endOrig++;
                                    endNorm++;
                                  }
                                }
                                idx = origChars;
                                const origSelectedLen = endOrig - origChars;
                                const newContent = currentContent.slice(0, idx) + fbPreviewRevised + currentContent.slice(idx + origSelectedLen);
                                updateChapter(matchChapter.id, { content: newContent }, true);
                                setFeedbackReviewAccepted((c) => c + 1);
                                idx = -2; // sentinel: already applied
                              }
                            }

                            // Context-based fallback: use surrounding text to locate the passage
                            if (idx === -1) {
                              const words = selectedText.split(/\s+/).filter(Boolean);
                              if (words.length >= 3) {
                                const startPhrase = words.slice(0, Math.min(4, words.length)).join(" ");
                                const endPhrase = words.slice(-Math.min(4, words.length)).join(" ");
                                const sIdx = currentContent.indexOf(startPhrase);
                                const eIdx = sIdx !== -1 ? currentContent.indexOf(endPhrase, sIdx) : -1;
                                if (sIdx !== -1 && eIdx !== -1) {
                                  const end = eIdx + endPhrase.length;
                                  const newContent = currentContent.slice(0, sIdx) + fbPreviewRevised + currentContent.slice(end);
                                  updateChapter(matchChapter.id, { content: newContent }, true);
                                  setFeedbackReviewAccepted((c) => c + 1);
                                  idx = -2; // sentinel: already applied
                                }
                              }
                            }

                            if (idx >= 0) {
                              // Exact match found — apply directly
                              const newContent = currentContent.slice(0, idx) + fbPreviewRevised + currentContent.slice(idx + selectedText.length);
                              updateChapter(matchChapter.id, { content: newContent }, true);
                              setFeedbackReviewAccepted((c) => c + 1);
                            } else if (idx === -1) {
                              alert("Could not locate this passage in the current chapter. The text may have changed since sharing. Skipping this note.");
                            }
                          } finally {
                            setFeedbackReviewApplying(false);
                            // Sync sceneBlocks from new content so block mode stays in sync
                            if (novel) {
                              const updatedCh = novel.chapters.find(c => c.id === matchChapter.id);
                              if (updatedCh && updatedCh.sceneBlocks && updatedCh.sceneBlocks.length > 0) {
                                const paras = updatedCh.content.split(/\n\n+/).filter(Boolean);
                                let pi = 0;
                                const syncedBlocks = updatedCh.sceneBlocks.map(b => {
                                  if (!b.prose?.trim()) return b;
                                  const bpc = b.prose.split(/\n\n+/).filter(Boolean).length || 1;
                                  const np = paras.slice(pi, pi + bpc).join("\n\n");
                                  pi += bpc;
                                  return { ...b, prose: np || b.prose };
                                });
                                updateSceneBlocks(matchChapter.id, syncedBlocks);
                              }
                            }
                          }
                          // Clear preview and move to next
                          setFbPreviewOriginal(null);
                          setFbPreviewRevised(null);
                          const nextIdx = feedbackReviewIdx + 1;
                          if (nextIdx >= feedbackReviewQueue.length) {
                            const tokens = [...new Set(feedbackReviewQueue.map((q) => q.token))];
                            for (const t of tokens) {
                              fetch(`/api/share/${t}`, { method: "PATCH" }).catch(() => {});
                            }
                            setFeedbackReviewDone(true);
                            setFeedbackReviewMode(false);
                            setPendingFeedbackCount(0);
                          } else {
                            setFeedbackReviewIdx(nextIdx);
                            const next = feedbackReviewQueue[nextIdx];
                            if (next && next.chapterTitle !== item.chapterTitle) {
                              const mc = novel.chapters.find((c) => c.title === next.chapterTitle);
                              if (mc) setActiveChapterId(mc.id);
                            }
                          }
                        } else {
                          /* ═══ GENERATE — call AI and show preview ═══ */
                          setFbPreviewGenerating(true);
                          setFbPreviewOriginal(item.ann.selectedText);
                          try {
                            const fbSysMsg = [
                              "You are a careful, skilled prose editor working on a novel manuscript.",
                              "A beta reader highlighted a passage and left feedback. Your job:",
                              "1. Revise ONLY the highlighted passage to address the reader's concern.",
                              "2. PRESERVE the author's unique voice, style, tone, sentence rhythm, and vocabulary.",
                              "3. Keep the same tense, POV, and narrative perspective.",
                              "4. Do NOT add new plot points, characters, or information not implied by the original.",
                              "5. Do NOT expand the passage significantly — keep roughly the same length.",
                              "6. Do NOT rewrite surrounding text — only revise what was highlighted.",
                              "7. Return ONLY the revised passage text. No explanations, labels, quotes, or meta-commentary.",
                              "8. If the feedback is vague or you're unsure, make the smallest meaningful improvement.",
                            ].join("\n");
                            const fbUserPrompt = [
                              `HIGHLIGHTED PASSAGE:`,
                              `"""`,
                              item.ann.selectedText,
                              `"""`,
                              ``,
                              `READER'S FEEDBACK (${item.ann.type}): "${item.ann.note}"`,
                              ``,
                              `SURROUNDING CONTEXT (for tone/flow — do NOT modify this, only use for reference):`,
                              `"""`,
                              item.chapterContent.slice(Math.max(0, item.ann.startOffset - 600), item.ann.startOffset),
                              `[HIGHLIGHTED PASSAGE GOES HERE]`,
                              item.chapterContent.slice(item.ann.endOffset, item.ann.endOffset + 600),
                              `"""`,
                              ``,
                              `Now revise the highlighted passage. Return ONLY the revised text, nothing else:`,
                            ].join("\n");
                            const fbAiText = await requestOpenRouterText(fbUserPrompt, 1200, 120000, fbSysMsg, false);
                            if (fbAiText.trim()) {
                              let revised = fbAiText.trim();
                              if ((revised.startsWith('"""') && revised.endsWith('"""')) || (revised.startsWith('"') && revised.endsWith('"') && !item.ann.selectedText.startsWith('"'))) {
                                revised = revised.replace(/^"{1,3}/, "").replace(/"{1,3}$/, "").trim();
                              }
                              setFbPreviewRevised(revised);
                            } else {
                              setFbPreviewOriginal(null);
                              alert("AI could not generate a revision. Try again.");
                            }
                          } catch (err) {
                            if (!isCancelledError(err)) {
                              setFbPreviewOriginal(null);
                              alert("Failed to generate. Check your AI connection.");
                            }
                          } finally {
                            setFbPreviewGenerating(false);
                          }
                        }
                      }}
                    >
                      {feedbackReviewApplying ? (
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                          <span style={{ width: 14, height: 14, border: "2px solid var(--pw-border)", borderTopColor: "var(--pw-text)", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                          Applying...
                        </span>
                      ) : fbPreviewGenerating ? (
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                          <span style={{ width: 14, height: 14, border: "2px solid var(--pw-border)", borderTopColor: "var(--pw-text)", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                          Generating...
                        </span>
                      ) : fbPreviewRevised !== null ? (
                        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                          Accept Change
                        </span>
                      ) : "Generate AI Fix"}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* ── Review Complete ── */}
            {feedbackReviewDone && (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" style={{ margin: "0 auto 16px", display: "block" }}>
                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25"/><polyline points="20 6 9 17 4 12"/>
                </svg>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--pw-text)", marginBottom: 6 }}>Feedback Complete</h3>
                <p style={{ fontSize: 14, color: "var(--pw-text-muted)", lineHeight: 1.6, marginBottom: 24, maxWidth: 340, margin: "0 auto 24px" }}>
                  All {feedbackReviewQueue.length} note{feedbackReviewQueue.length !== 1 ? "s" : ""} reviewed.
                  {feedbackReviewAccepted > 0 && <><br/><span style={{ color: "#10b981", fontWeight: 600 }}>{feedbackReviewAccepted} applied</span></>}
                  {feedbackReviewRejected > 0 && <><span style={{ color: "var(--pw-text-dim)" }}> · {feedbackReviewRejected} skipped</span></>}
                </p>
                <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                  <button type="button" className="btn pw-cancel-btn" style={{ fontSize: 13, padding: "9px 20px" }} onClick={() => {
                    setShowFeedbackPanel(false);
                    setFeedbackReviewDone(false);
                    setFeedbackReviewMode(false);
                    setPendingFeedbackCount(0);
                    saveNow();
                  }}>Close</button>
                  <button type="button" className="btn btn-primary" style={{ fontSize: 13, padding: "9px 20px" }} onClick={() => {
                    setShowFeedbackPanel(false);
                    setFeedbackReviewDone(false);
                    setFeedbackReviewMode(false);
                    setPendingFeedbackCount(0);
                    saveNow();
                    // Open share modal
                    if (novel) {
                      setSelectedShareChapterIds(novel.chapters.map((c) => c.id));
                      setShareResult(null);
                      setShareError(null);
                      setSharePassword("");
                      setShareExpiryDays(7);
                      setShareRecipientEmail("");
                      setShowShareModal(true);
                      setShareLinksLoading(true);
                      fetch("/api/share").then((r) => r.ok ? r.json() : []).then((linkData) => { if (Array.isArray(linkData)) setShareLinks(linkData); }).catch(() => {}).finally(() => setShareLinksLoading(false));
                    }
                  }}>Share More Chapters</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showEditorModal && novel && (() => {
        if (activeChapter) {
          // ── Chapter mode: use the tabbed TheEditor component ──
          const edCtx = getEditorContext();
          const chNum = edCtx?.chapterNumber ?? (novel.chapters.findIndex((c) => c.id === activeChapter.id) + 1);
          const chTotal = edCtx?.totalChapters ?? novel.chapters.length;
          const chWc = edCtx?.wordCount ?? 0;
          const chIdx = novel.chapters.findIndex((c) => c.id === activeChapter.id);
          const bpChapters = novel.storyBible.bookPlan?.chapters ?? [];
          const bpMatch = bpChapters.find((pc) => pc.manuscriptChapterId === activeChapter.id);
          const tkCharIds = bpMatch?.characterIds ?? [];
          const tkLocIds = bpMatch?.locationIds ?? [];
          const tkSynopsis = bpMatch?.synopsis ?? "";
          const tkBlocSynopses = (activeChapter.sceneBlocks ?? [])
            .map((b) => b.synopsis?.trim()).filter((s): s is string => !!s);
          const chProse = extractProseFromContent(activeChapter.content);
          return (
            <TheEditor
              open={showEditorModal}
              onClose={() => { cancelAiWork(); setShowEditorModal(false); setEditorResult(null); setEditorError(null); setEditorLoadingPhase(null); saveNow(); }}
              chapterTitle={activeChapter.title || "Untitled chapter"}
              chapterNumber={chNum}
              totalChapters={chTotal}
              charactersInChapter={edCtx?.charNames ?? []}
              locationsInChapter={edCtx?.locNames ?? []}
              wordCount={chWc}
              loadingPhase={editorLoadingPhase}
              error={editorError}
              result={editorResult}
              originalParagraphs={editorOriginalParagraphs}
              onRun={runEditorPass}
              onResultUpdate={setEditorResult}
              onFixIssues={runEditorFixIssues}
              onApply={(revisedText) => {
                if (!activeChapter) return;
                pushUndoSnapshot(activeChapter.id, activeChapter.content, activeChapter.sceneBlocks, true);
                const blocks = getSceneBlocks(activeChapter);
                if (blocks.length > 0 && blocks.some(b => b.prose?.trim())) {
                  const revisedParas = revisedText.split(/\n\n+/).filter(Boolean);
                  const origParaCount = blocks.reduce((n, b) => n + (b.prose?.trim() ? (b.prose.split(/\n\n+/).filter(Boolean).length || 1) : 0), 0);
                  // If paragraph count shifted, fall back to content-only update to avoid block misalignment
                  if (Math.abs(revisedParas.length - origParaCount) > 2) {
                    mutateNovel((current) => ({
                      ...current,
                      chapters: current.chapters.map(ch =>
                        ch.id === activeChapter.id
                          ? { ...ch, content: revisedText, updatedAt: new Date().toISOString() }
                          : ch
                      ),
                    }));
                  } else {
                    let paraIdx = 0;
                    const updatedBlocks = blocks.map(b => {
                      if (!b.prose?.trim()) return b;
                      const blockParaCount = b.prose.split(/\n\n+/).filter(Boolean).length || 1;
                      const slice = revisedParas.slice(paraIdx, paraIdx + blockParaCount);
                      paraIdx += blockParaCount;
                      return { ...b, prose: slice.length > 0 ? slice.join("\n\n") : b.prose };
                    });
                    if (paraIdx < revisedParas.length && updatedBlocks.length > 0) {
                      const last = updatedBlocks.length - 1;
                      const remainder = revisedParas.slice(paraIdx).join("\n\n");
                      updatedBlocks[last] = { ...updatedBlocks[last], prose: (updatedBlocks[last].prose || "") + "\n\n" + remainder };
                    }
                    const combinedContent = updatedBlocks.map(b => b.prose?.trim() || "").filter(Boolean).join("\n\n");
                    mutateNovel((current) => ({
                      ...current,
                      chapters: current.chapters.map(ch =>
                        ch.id === activeChapter.id
                          ? { ...ch, content: combinedContent, sceneBlocks: updatedBlocks, updatedAt: new Date().toISOString() }
                          : ch
                      ),
                    }));
                  }
                } else {
                  mutateNovel((current) => ({
                    ...current,
                    chapters: current.chapters.map(ch =>
                      ch.id === activeChapter.id
                        ? { ...ch, content: revisedText, updatedAt: new Date().toISOString() }
                        : ch
                    ),
                  }));
                }
                setEditorOriginalParagraphs(revisedText.split(/\n\n+/).filter(Boolean));
                saveNow();
              }}
              chapterProse={chProse}
              storyBible={novel.storyBible}
              allChapters={novel.chapters}
              currentChapterIndex={chIdx >= 0 ? chIdx : 0}
              planCharacterIds={tkCharIds}
              planLocationIds={tkLocIds}
              chapterSynopsis={tkSynopsis}
              blocSynopses={tkBlocSynopses}
              onThreadKeeperAiCheck={runThreadKeeperAiCheck}
            />
          );
        }

        // ── Overview mode: sentence-level manuscript edits ──
        const closeOverview = () => { cancelAiWork(); setShowEditorModal(false); saveNow(); };
        return (
          <div className="pw-modal-overlay" onClick={closeOverview}>
            <div className="pw-chapter-review-modal" onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 680, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
              {/* Header — same style as chapter editor */}
              <div style={{ flexShrink: 0, padding: "20px 24px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", margin: 0 }}>The Editor</h2>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 6,
                      background: "var(--pw-accent-muted, rgba(163,230,53,0.1))",
                      color: "var(--pw-accent, #a3e635)",
                      textTransform: "uppercase", letterSpacing: "0.06em",
                    }}>
                      Full Manuscript
                    </span>
                  </div>
                  <p style={{ fontSize: 13, opacity: 0.5, margin: 0 }}>
                    {novel.chapters.filter((c) => (c.content ?? "").trim().length > 50).length} chapters with content
                  </p>
                </div>
                <button type="button" className="pw-bible-close" onClick={closeOverview} aria-label="Close" style={{ marginTop: -4 }}>&times;</button>
              </div>

              {/* Context bar */}
              <div style={{
                display: "flex", gap: 12, padding: "12px 24px",
                fontSize: 11, color: "var(--pw-text-dim, #888)",
                flexWrap: "wrap", alignItems: "center",
                borderBottom: "1px solid var(--pw-border-light, #2a2a2a)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
                  <span>{novel.chapters.length} chapters</span>
                </div>
                {novel.storyBible.characters.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    <span>{novel.storyBible.characters.length} characters</span>
                  </div>
                )}
                <div style={{ marginLeft: "auto" }}>
                  <button type="button"
                    disabled={nccBusy || aiOff || novel.chapters.filter((c) => (c.content ?? "").trim().length > 50).length < 1}
                    onClick={() => {
                      if (editorFindings.length > 0) {
                        setRegenConfirm({ message: "Re-scanning will replace your current editing suggestions. Any unreviewed changes will be lost.", onConfirm: () => { setRegenConfirm(null); void runEditorScan(); } });
                      } else { void runEditorScan(); }
                    }}
                    style={{
                      padding: "5px 14px", fontSize: 11, fontWeight: 700, borderRadius: 8,
                      background: "rgba(var(--pw-accent-rgb, 163,230,53), 0.1)",
                      color: "var(--pw-accent)", border: "1px solid rgba(var(--pw-accent-rgb, 163,230,53), 0.2)",
                      cursor: nccBusy ? "default" : "pointer", display: "flex", alignItems: "center", gap: 5,
                      transition: "all 0.15s",
                      opacity: nccBusy ? 0.5 : 1,
                    }}
                  >
                    {nccBusy ? (
                      <><span style={{ width: 10, height: 10, border: "1.5px solid rgba(var(--pw-accent-rgb, 163,230,53), 0.3)", borderTopColor: "var(--pw-accent)", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} /> Scanning...</>
                    ) : editorFindings.length > 0 ? "Re-scan" : "Scan Manuscript"}
                  </button>
                </div>
              </div>

              {/* Body */}
              <div style={{ flex: 1, overflow: "auto", padding: "16px 24px 24px" }}>
                {/* Empty state */}
                {editorFindings.length === 0 && !nccBusy && !editorApplyDone && (
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--pw-text-dim)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 14px", display: "block", opacity: 0.25 }}>
                      <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                    <p style={{ fontWeight: 700, fontSize: 14, margin: "0 0 4px" }}>Ready to edit your manuscript</p>
                    <p style={{ fontSize: 12, color: "var(--pw-text-dim)", margin: 0, maxWidth: 380, marginLeft: "auto", marginRight: "auto", lineHeight: 1.5 }}>
                      Scans every chapter for weak prose, clichés, pacing issues, flat dialogue, and inconsistencies — then suggests specific rewrites with before and after.
                    </p>
                    {novel.healthScore ? (
                      <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 10, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)", display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                        <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 600 }}>Health data found — edits will target your weakest areas</span>
                      </div>
                    ) : (
                      <div style={{ marginTop: 16, padding: "10px 14px", borderRadius: 10, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                        <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>Run Manuscript Health first for smarter, targeted edits</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Scanning */}
                {nccBusy && (
                  <div style={{ textAlign: "center", padding: "48px 20px" }}>
                    <div style={{ width: 28, height: 28, border: "2.5px solid rgba(var(--pw-accent-rgb, 163,230,53), 0.2)", borderTopColor: "var(--pw-accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 14px" }} />
                    <p style={{ fontSize: 13, fontWeight: 600, margin: "0 0 4px" }}>Reading your manuscript...</p>
                    {editorApplyProgress && <p style={{ fontSize: 11, color: "var(--pw-text-dim)", margin: 0 }}>{editorApplyProgress}</p>}
                  </div>
                )}

                {/* Summary */}
                {editorSummary && !nccBusy && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: "rgba(var(--pw-accent-rgb, 163,230,53), 0.04)", border: "1px solid rgba(var(--pw-accent-rgb, 163,230,53), 0.1)", marginBottom: 12 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--pw-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    <p style={{ fontSize: 12, color: "var(--pw-text-dim)", margin: 0, lineHeight: 1.4, flex: 1 }}>{editorSummary}</p>
                  </div>
                )}

                {/* Progress */}
                {editorFindings.length > 0 && !nccBusy && !editorApplyDone && (() => {
                  const total = editorFindings.length;
                  const done = editorFindings.filter((f) => f.status !== "pending").length;
                  const accepted = editorFindings.filter((f) => f.status === "accepted").length;
                  return (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--pw-text-dim)" }}>{done}/{total} reviewed</span>
                        <span style={{ fontSize: 10, color: "var(--pw-text-dim)" }}>{accepted} accepted</span>
                      </div>
                      <div style={{ height: 3, borderRadius: 2, background: "var(--pw-overlay-bg-hover)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(done / total) * 100}%`, borderRadius: 2, background: "var(--pw-accent)", transition: "width 0.3s ease" }} />
                      </div>
                    </div>
                  );
                })()}

                {/* Edits list */}
                {editorFindings.length > 0 && !nccBusy && (
                  <div className="pw-overview-edits">
                    {editorFindings.some((f) => f.status === "pending") && (
                      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                        <button type="button" onClick={() => setEditorFindings((prev) => prev.map((f) => f.status === "pending" ? { ...f, status: "accepted" } : f))}
                          style={{ padding: "4px 10px", fontSize: 10, fontWeight: 700, borderRadius: 6, background: "rgba(var(--pw-accent-rgb,163,230,53),0.08)", border: "1px solid rgba(var(--pw-accent-rgb,163,230,53),0.15)", color: "var(--pw-accent)", cursor: "pointer" }}>
                          Accept all
                        </button>
                        <button type="button" onClick={() => setEditorFindings((prev) => prev.map((f) => f.status === "pending" ? { ...f, status: "dismissed" } : f))}
                          style={{ padding: "4px 10px", fontSize: 10, fontWeight: 600, borderRadius: 6, background: "var(--pw-overlay-bg)", border: "1px solid var(--pw-border)", color: "var(--pw-text-dim)", cursor: "pointer" }}>
                          Dismiss all
                        </button>
                      </div>
                    )}
                    {editorFindings.map((edit) => {
                      const isDone = edit.status !== "pending";
                      return (
                        <div key={edit.id} className={`pw-ov-edit-card${isDone ? " done" : ""}`}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                            <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--pw-text-dim)", background: "var(--pw-overlay-bg-hover)", padding: "2px 6px", borderRadius: 4 }}>Ch {edit.chapter}</span>
                            <span style={{ fontSize: 11, fontWeight: 600, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--pw-text-dim)" }}>{edit.chapterTitle}</span>
                            {isDone && <span style={{ fontSize: 10, fontWeight: 700, color: edit.status === "accepted" ? "var(--pw-accent)" : "var(--pw-text-dim)" }}>{edit.status === "accepted" ? "Accepted" : "Dismissed"}</span>}
                          </div>
                          <p style={{ fontSize: 11, color: "var(--pw-text-dim)", margin: "0 0 8px", fontStyle: "italic", lineHeight: 1.4 }}>{edit.reason}</p>
                          <div className="pw-ov-edit-diff">
                            <div className="pw-ov-edit-before">
                              <span className="pw-ov-edit-label pw-ov-edit-label-before">Current</span>
                              <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6 }}>{edit.original}</p>
                            </div>
                            <div className="pw-ov-edit-after">
                              <span className="pw-ov-edit-label pw-ov-edit-label-after">Suggested</span>
                              <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6 }}>{edit.revised}</p>
                            </div>
                          </div>
                          {!isDone && (
                            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                              <button type="button" onClick={() => setEditorFindings((prev) => prev.map((f) => f.id === edit.id ? { ...f, status: "accepted" } : f))} className="pw-ov-edit-accept">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                Accept
                              </button>
                              <button type="button" onClick={() => setEditorFindings((prev) => prev.map((f) => f.id === edit.id ? { ...f, status: "dismissed" } : f))} className="pw-ov-edit-dismiss">Dismiss</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Apply */}
                {editorFindings.length > 0 && !editorFindings.some((f) => f.status === "pending") && !editorApplyDone && !nccBusy && (() => {
                  const acceptedCount = editorFindings.filter((f) => f.status === "accepted").length;
                  if (acceptedCount === 0) return <div style={{ textAlign: "center", padding: "16px", opacity: 0.5 }}><p style={{ fontSize: 12, margin: 0 }}>All edits dismissed — nothing to apply.</p></div>;
                  return (
                    <div style={{ padding: "16px 0 8px", textAlign: "center" }}>
                      {!editorApplying ? (
                        <button type="button" onClick={() => applyOverviewEdits()} className="pw-editor-apply-btn" style={{ margin: "0 auto" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          Apply {acceptedCount} Edit{acceptedCount !== 1 ? "s" : ""} to Manuscript
                        </button>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center" }}>
                          <div style={{ width: 18, height: 18, border: "2px solid rgba(var(--pw-accent-rgb, 163,230,53), 0.2)", borderTopColor: "var(--pw-accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 600 }}>Applying...</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Done */}
                {editorApplyDone && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderRadius: 10, background: "rgba(var(--pw-accent-rgb, 163,230,53), 0.05)", border: "1px solid rgba(var(--pw-accent-rgb, 163,230,53), 0.15)", marginTop: 8 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--pw-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--pw-accent)" }}>{editorApplyCount} edit{editorApplyCount !== 1 ? "s" : ""} applied</div>
                      <div style={{ fontSize: 11, color: "var(--pw-text-dim)", marginTop: 1 }}>Changes written directly to your chapters. Use Undo to revert.</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {showStoryBibleModal && novel && (
        <div className="pw-modal-overlay" onClick={() => { cancelAiWork(); setShowStoryBibleModal(false); saveNow(); }}>
          <div className="pw-bible-modal" data-tutorial="canon-modal" onClick={(event) => event.stopPropagation()}>
            <div className="pw-bible-modal-head">
              <div>
                <p className="pw-bible-modal-kicker">{isNF ? "Memoir & Biography" : "Novel Overview"}</p>
                <h2>{isNF ? "My Story" : "Canon"}</h2>
                <p className="pw-bible-modal-sub">{isNF ? "Your life story — people, places, events, and voice." : "Your story\u2019s source of truth — characters, world, and voice."}</p>
                <p className="pw-field-help">Field limits keep autosave and assistant actions stable.</p>
              </div>
              <div className="pw-bible-modal-actions">
                {!aiOff && <span className="pw-pill">Model: {openRouterModel}</span>}
                <button type="button" className="pw-link-btn" onClick={() => setProfileOpen(true)}>
                  Settings
                </button>
                <button type="button" className="pw-bible-close" onClick={() => { cancelAiWork(); setShowStoryBibleModal(false); saveNow(); }} aria-label="Close">
                  ×
                </button>
              </div>
            </div>

            <div className="pw-bible-modal-body">
              <aside className="pw-bible-nav">
                {(isNF ? [
                    { id: "nf-about" as const, label: "About" },
                    { id: "nf-events" as const, label: (nfData?.subtype === "true-crime") ? "Key Events" : (nfData?.subtype === "historical" || nfData?.subtype === "investigative") ? "Key Events" : "Life Events" },
                    { id: "nf-interview" as const, label: (nfData?.subtype === "true-crime" || nfData?.subtype === "investigative") ? "Research Interview" : nfData?.subtype === "historical" ? "Event Interview" : "Life Interview" },
                    { id: "nf-timeline" as const, label: "Emotional Timeline" },
                    { id: "nf-relationships" as const, label: "Relationships" },
                    { id: "characters" as const, label: "People" },
                    { id: "locations" as const, label: "Places" },
                    { id: "styleVoice" as const, label: "Style & Voice" },
                    { id: "summary" as const, label: "Summary" },
                  ] : [
                    { id: "styleVoice" as const, label: "Style & Voice" },
                    { id: "summary" as const, label: "Summary" },
                    { id: "characters" as const, label: "Characters" },
                    { id: "locations" as const, label: "Locations" },
                    { id: "worldbuilding" as const, label: "Worldbuilding" },
                    { id: "boltons" as const, label: "Bolt-Ons" },
                  ]
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`pw-bible-nav-btn ${bibleSection === item.id ? "active" : ""}`}
                    data-tutorial={`canon-${item.id}`}
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
                          {storyAiBusyAction === "summary-field-synopsis" ? "Generating options..." : "Run Assistant"}
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
                    {/* Synopsis options are shown in a modal popup below */}
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
                        <h3>{isNF ? "People" : "Characters"}</h3>
                        <p className="pw-bible-section-note">
                          {isNF
                            ? "Real people in this story. Add them manually, extract from your interview, or let AI find them."
                            : "Auto generate from Summary or build each character manually from scratch."}
                        </p>
                        {!isNF && !hasSummaryForCharacterAi && (
                          <p className="pw-bible-warning-note">
                            Summary is empty. Assistant-generated characters may drift from your story. Add synopsis or core conflict
                            first for stronger canon-safe results.
                          </p>
                        )}
                      </div>
                      <div className="pw-bible-inline-actions">
                        {storyCharacters.length > 0 && (
                        <button
                          type="button"
                          className="pw-bible-clear-btn"
                          onClick={() => clearBibleSection("characters")}
                          title={isNF ? "Remove all people" : "Remove all characters"}
                        >
                          {isNF ? "Clear All People" : "Clear All Characters"}
                        </button>
                        )}
                        {!aiOff && (
                        <button
                          type="button"
                          className="pw-ai-mini-btn"
                          onClick={() => handleGenerateCharacters()}
                          disabled={storyAiBusyAction !== null}
                        >
                          {storyAiBusyAction === "characters-generate"
                            ? isNF ? "Finding people..." : "Finding characters..."
                            : isNF ? "Generate people from summary" : "Generate characters from summary"}
                        </button>
                        )}
                        <button type="button" className="btn btn-primary" onClick={addV2Character}>
                          {isNF ? "+ Add Person" : "+ Add Character"}
                        </button>
                      </div>
                    </div>
                    {!aiOff && storyAiError && <p className="pw-ora-error pw-bible-ai-error">{storyAiError}</p>}

                    <div className="pw-bible-characters-layout">
                      <div className="pw-bible-characters-list">
                        {storyCharacters.length === 0 ? (
                          <p className="pw-overview-empty">
                            {isNF ? "No people yet. Add them manually or extract from your interview." : "No characters yet. Use Generate from Summary or add one manually."}
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
                                {isNF ? NF_ROLE_LABELS[c.role] || c.role : c.role}
                                {c.accent ? ` • ${c.accent}` : ""}
                              </span>
                            </button>
                          ))
                        )}
                      </div>

                      <div className="pw-bible-char-detail">
                        {!selectedV2CharacterId && <p>{isNF ? "Select a person to edit details." : "Select a character to edit details."}</p>}
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
                                {/* ── Character header: name + actions ── */}
                                <div style={{
                                  display: "flex", alignItems: "center", gap: 10,
                                  padding: "12px 0 8px", borderBottom: "1px solid var(--pw-border-light, rgba(255,255,255,0.06))",
                                  marginBottom: 12,
                                }}>
                                  <div style={{
                                    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                                    background: "rgba(var(--pw-accent-rgb,163,230,53),0.12)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: 14, fontWeight: 800, color: "var(--pw-accent)",
                                  }}>
                                    {(character.name || "?").charAt(0).toUpperCase()}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <h4 style={{
                                      margin: 0, fontSize: 15, fontWeight: 800, letterSpacing: "-0.01em",
                                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                    }}>
                                      {character.name || "Character Profile"}
                                    </h4>
                                    <p style={{ margin: "1px 0 0", fontSize: 11, color: "var(--pw-text-dim)", fontWeight: 500 }}>
                                      {character.role || "Supporting"}{character.logline ? ` — ${character.logline.slice(0, 60)}${character.logline.length > 60 ? "…" : ""}` : ""}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    title={`Remove ${character.name || "character"}`}
                                    onClick={() => {
                                      setRegenConfirm({
                                        message: `Remove "${character.name || "Untitled"}" from your Canon? This cannot be undone.`,
                                        onConfirm: () => {
                                          setRegenConfirm(null);
                                          removeV2Character(character.id);
                                          setSelectedV2CharacterId(null);
                                        },
                                      });
                                    }}
                                    style={{
                                      padding: "5px 10px", fontSize: 11, fontWeight: 600, borderRadius: 6,
                                      background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.12)",
                                      color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                                      transition: "all 0.15s", flexShrink: 0,
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(220,38,38,0.12)"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(220,38,38,0.06)"; }}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                                    Remove
                                  </button>
                                </div>

                                {/* ── AI assistant controls (own row) ── */}
                                {!aiOff && (
                                <div style={{ marginBottom: 14 }}>
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
                                </div>
                                )}

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
                                    <label>{isNF ? "Role in Story" : "Role"}</label>
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
                                          {isNF ? NF_ROLE_LABELS[role] : role}
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
                                  <h4>{isNF ? "Who They Are" : "Core Identity"}</h4>
                                  <label>{isNF ? "Summary" : "Logline"}</label>
                                  <p className="pw-field-help">
                                    {isNF ? "One-sentence summary of who this person is and their role in the story." : "One-sentence character hook: who they are, what they want, and what blocks them."}
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
                                      <label>{isNF ? "Personality / Character" : "Personality"}</label>
                                      <textarea
                                        className="pw-bible-input"
                                        rows={2}
                                        maxLength={STORY_BIBLE_LIMITS.character.personality}
                                        value={character.personality ?? ""}
                                        placeholder={isNF ? "What kind of person are they? Temperament, habits, values." : ""}
                                        onChange={(event) =>
                                          updateV2Character(character.id, { personality: event.target.value })
                                        }
                                      />
                                    </div>
                                    <div>
                                      <label>{isNF ? "Background / History" : "Backstory"}</label>
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
                                  <h4>{isNF ? "Character & Motivations" : "Behavior Engine"}</h4>
                                  <div className="pw-bible-grid-2">
                                    <div>
                                      <label>{isNF ? "Motivations / Drives" : "Goals"}</label>
                                      <textarea
                                        className="pw-bible-input"
                                        rows={2}
                                        maxLength={STORY_BIBLE_LIMITS.character.goals}
                                        value={character.goals ?? ""}
                                        onChange={(event) => updateV2Character(character.id, { goals: event.target.value })}
                                      />
                                    </div>
                                    <div>
                                      <label>{isNF ? "Vulnerabilities / Flaws" : "Fears"}</label>
                                      <textarea
                                        className="pw-bible-input"
                                        rows={2}
                                        maxLength={STORY_BIBLE_LIMITS.character.fears}
                                        value={character.fears ?? ""}
                                        placeholder={isNF ? "Weaknesses, blind spots, struggles." : ""}
                                        onChange={(event) => updateV2Character(character.id, { fears: event.target.value })}
                                      />
                                    </div>
                                  </div>
                                  <label>{isNF ? "Behaviour under pressure" : "Reaction pattern"}</label>
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
                                  <h4>{isNF ? "What's Not Public" : "Secrets and Reveal Control"}</h4>
                                  <p className="pw-character-secret-note">
                                    {isNF ? "Information the author knows but may not reveal immediately in the narrative." : "Author-only secrets stay private. Use reader hint only for subtle foreshadowing."}
                                  </p>
                                  <div className="pw-bible-grid-2">
                                    <div>
                                      <label>{isNF ? "Private information" : "Author-only secret"}</label>
                                      <textarea
                                        className="pw-bible-input"
                                        rows={2}
                                        maxLength={STORY_BIBLE_LIMITS.character.secrets}
                                        value={character.secrets ?? ""}
                                        onChange={(event) => updateV2Character(character.id, { secrets: event.target.value })}
                                      />
                                    </div>
                                    <div>
                                      <label>{isNF ? "What readers will learn" : "Reader-visible hint (safe)"}</label>
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

                                {/* Footer spacer */}
                                <div style={{ height: 8 }} />
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
                          {storyAiBusyAction === "worldbuilding-generate" ? "Generating..." : "Generate world-building"}
                        </button>
                        )}
                        <button type="button" className="btn" onClick={addLoreEntry}>
                          + Add entry
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
                        No world-building entries yet. Add entries manually or generate from your synopsis and genre.
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
                                  <option value="Law">Law &amp; Justice</option>
                                  <option value="Society">Society</option>
                                  <option value="Psychology">Psychology</option>
                                  <option value="Procedure">Procedure</option>
                                  <option value="Setting">Setting</option>
                                  <option value="Rules">Story Rules</option>
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

                {/* Knowledge & Reveals moved to NCC */}

                {bibleSection === "boltons" && (
                  <div className="pw-bible-section">
                    {/* ── Top bar: title + actions ── */}
                    <div className="pw-bible-flex-head">
                      <div>
                        <h3>Bolt-Ons</h3>
                        <p className="pw-bible-section-note">
                          Tell the AI how to write. Type an instruction, hit Build, and the AI turns it into a craft directive. Bolt-ons auto-save to your library.
                        </p>
                      </div>
                      <div className="pw-bible-inline-actions" style={{ display: "flex", gap: 6 }}>
                        <button
                          type="button"
                          className="pw-bolton-add-btn"
                          onClick={() => setWritingPacksOpen(true)}
                          title="Browse pre-made writing packs"
                          style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: -2 }}><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                          Packs
                        </button>
                        <button
                          type="button"
                          className="pw-bolton-add-btn"
                          onClick={() => setBoltonLibraryOpen(true)}
                          title={`Bolt-on library (${boltonLibraryCount} saved)`}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4, verticalAlign: -2 }}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
                          Library {boltonLibraryCount > 0 ? `(${boltonLibraryCount})` : ""}
                        </button>
                      </div>
                    </div>

                    {/* ── Library modal ── */}
                    {boltonLibraryOpen && (
                      <div style={{
                        position: "fixed", inset: 0, zIndex: 9999,
                        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                        onClick={() => setBoltonLibraryOpen(false)}
                      >
                        <div
                          style={{
                            background: "var(--pw-bg)",
                            border: "1px solid var(--pw-border)",
                            borderRadius: 20, width: "92%", maxWidth: 480, maxHeight: "75vh",
                            display: "flex", flexDirection: "column",
                            boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Header */}
                          <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--pw-border-light)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--pw-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
                                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Bolt-On Library</h3>
                              </div>
                              <button type="button" onClick={() => setBoltonLibraryOpen(false)} style={{
                                background: "var(--pw-overlay-bg-hover)", border: "none", borderRadius: 8,
                                width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                                color: "var(--pw-text-dim)", fontSize: 16, cursor: "pointer",
                              }}>&times;</button>
                            </div>
                            <p style={{ fontSize: 12, color: "var(--pw-text-dim)", margin: "8px 0 0" }}>
                              Your saved bolt-ons — available across all novels.
                            </p>
                          </div>

                          {/* List */}
                          <div style={{ overflow: "auto", flex: 1, padding: "12px 16px" }}>
                          {(() => {
                            const library = readBoltonLibrary();
                            if (library.length === 0) return (
                              <div style={{ textAlign: "center", padding: "40px 0", opacity: 0.4 }}>
                                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 12 }}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                                <p style={{ fontWeight: 600, marginBottom: 4 }}>Library is empty</p>
                                <p style={{ fontSize: 12 }}>Build a bolt-on and it auto-saves here.</p>
                              </div>
                            );
                            return (
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {library.map((item, i) => {
                                  const catLabel = BOLTON_PLUGIN_CATEGORIES.find((c) => c.id === item.category)?.label || "Custom";
                                  return (
                                    <div key={i} style={{
                                      display: "flex", alignItems: "center", gap: 12,
                                      padding: "10px 12px", borderRadius: 10,
                                      background: "var(--pw-overlay-bg)",
                                      border: "1px solid var(--pw-border-light)",
                                      transition: "background 0.15s",
                                    }}
                                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--pw-overlay-bg-hover)"; }}
                                      onMouseLeave={(e) => { e.currentTarget.style.background = "var(--pw-overlay-bg)"; }}
                                    >
                                      {/* Icon */}
                                      <div style={{
                                        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                                        background: item.prompt ? "rgba(163,230,53,0.1)" : "var(--pw-overlay-bg)",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                      }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill={item.prompt ? "var(--pw-accent)" : "none"} stroke={item.prompt ? "var(--pw-accent)" : "var(--pw-text-dim)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                                      </div>

                                      {/* Title + category */}
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                          {item.title || "Untitled"}
                                        </div>
                                        <div style={{ fontSize: 11, color: "var(--pw-text-dim)", marginTop: 1 }}>
                                          {catLabel}
                                        </div>
                                      </div>

                                      {/* Actions */}
                                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                                        <button
                                          type="button"
                                          disabled={allBoltons.length >= 10}
                                          onClick={() => { loadSingleFromLibrary(item); setBoltonLibraryOpen(false); }}
                                          title="Load into this novel"
                                          style={{
                                            padding: "5px 12px", fontSize: 11, fontWeight: 600, borderRadius: 6,
                                            background: "var(--pw-accent)", color: "var(--pw-btn-primary-text)", border: "none", cursor: "pointer",
                                          }}
                                        >
                                          Load
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => { void deleteLibraryBolton(i); setBoltonLibraryOpen(false); setTimeout(() => setBoltonLibraryOpen(true), 50); }}
                                          title="Remove from library"
                                          style={{
                                            padding: "5px 8px", fontSize: 11, borderRadius: 6,
                                            background: "var(--pw-overlay-bg)", color: "var(--pw-text-dim)", border: "1px solid var(--pw-border)", cursor: "pointer",
                                          }}
                                        >
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Writing Packs modal is rendered at top level so it can be opened from chapter/bloc view too */}

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
                        <p style={{ fontSize: 12, opacity: 0.6 }}>Pick a category above to create one, or load from your library. Just describe what you want and hit Build.</p>
                      </div>
                    ) : visibleBoltons.length === 0 ? (
                      <div className="pw-bolton-empty">
                        <p>No bolt-ons in this category.</p>
                      </div>
                    ) : (
                      <div className="pw-bolton-grid">
                        {visibleBoltons.map((bolton) => (
                          <div key={bolton.id} className={`pw-bolton-card ${bolton.prompt ? "pw-bolton-card-ready" : ""}`}>
                            {/* Header: title + category + delete */}
                            <div className="pw-bolton-card-head">
                              <input
                                className="pw-bolton-card-title"
                                placeholder={bolton.prompt ? "Untitled bolt-on" : "Title (auto-generated on build)"}
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
                              <button type="button" className="pw-bolton-remove" onClick={() => removeBolton(bolton.id)} title="Delete bolt-on">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                              </button>
                            </div>

                            {/* Instruction area */}
                            <textarea
                              className="pw-bolton-desc"
                              rows={2}
                              maxLength={500}
                              placeholder="Tell the AI how to write — e.g. 'make it feel tense and claustrophobic' or 'more dialogue, less description'"
                              value={bolton.description}
                              onChange={(e) => updateBolton(bolton.id, { description: e.target.value })}
                              onKeyDown={(e) => e.stopPropagation()}
                            />
                            <div className="pw-bolton-card-foot">
                              {!aiOff && (
                              <button
                                type="button"
                                className="pw-bolton-sharpen-btn"
                                disabled={storyAiBusyAction !== null || !bolton.description.trim()}
                                onClick={() => void sharpenBolton(bolton.id)}
                              >
                                {storyAiBusyAction === `bolton-${bolton.id}` ? "Building..." : bolton.prompt ? "↻ Rebuild" : "⚡ Build"}
                              </button>
                              )}
                              <span className="pw-bolton-char-count">{bolton.description.length}/500</span>
                            </div>

                            {/* AI directive preview */}
                            {bolton.prompt && (
                              <div className="pw-bolton-step pw-bolton-prompt-preview">
                                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--pw-accent)", display: "inline-block" }} />
                                  <span className="pw-bolton-step-label pw-bolton-step-ready" style={{ margin: 0 }}>Active directive</span>
                                </div>
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
                    <label>Writing Style</label>
                    <p className="pw-field-help" style={{ marginBottom: 6, marginTop: 0 }}>
                      Describe the writing style you want — AI will generate voice rules, tone, and style guidance from your description.
                    </p>
                    <div className="pw-ai-assist-row">
                      <input
                        className="pw-bible-input pw-ai-assist-select"
                        maxLength={STORY_BIBLE_LIMITS.styleVoice.compItem}
                        placeholder="e.g. dark literary prose, punchy dialogue, sparse and gritty..."
                        value={styleAuthorDraft}
                        onChange={(event) => setStyleAuthorDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void runDescribeWriterStyle();
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="pw-ai-mini-btn"
                        onClick={() => void runDescribeWriterStyle()}
                        disabled={storyAiBusyAction !== null}
                      >
                        {storyAiBusyAction === "style-author" ? "Analyzing..." : "Generate Style"}
                      </button>
                    </div>
                    {isNF && (nfData?.interviewTranscript ?? []).filter(m => m.role === "user").length >= 3 && (
                      <div style={{ marginTop: 8, marginBottom: 4 }}>
                        <button
                          type="button"
                          className="pw-ai-mini-btn"
                          disabled={storyAiBusyAction !== null}
                          onClick={async () => {
                            if (storyAiBusyAction || !novel) return;
                            setStoryAiBusyAction("style-interview");
                            setStoryAiError(null);
                            try {
                              const userMsgs = (nfData?.interviewTranscript ?? [])
                                .filter(m => m.role === "user")
                                .map(m => m.text);
                              const sample = userMsgs.slice(0, 20).join("\n\n---\n\n").slice(0, 6000);
                              const ctx = [
                                novel.storyBible.summary.genre?.length ? `Genre: ${novel.storyBible.summary.genre.join(", ")}` : "",
                                novel.storyBible.summary.tone?.length ? `Tone: ${novel.storyBible.summary.tone.join(", ")}` : "",
                                nfData?.subtype ? `Type: ${nfData.subtype}` : "",
                              ].filter(Boolean).join(". ");
                              const prompt = [
                                "Analyse these writing samples from an author's life interview. These are their natural, unedited words.",
                                "Extract their authentic writing voice and style patterns. Return JSON:",
                                '{ "voiceRules": "practical style rules capturing their natural voice (max 800 chars) — sentence length preferences, vocabulary level, emotional tone, storytelling patterns, use of detail, dialogue style, rhythm. Describe HOW they write, not WHAT they write about.",',
                                '  "toneTags": ["tone1","tone2","tone3"],',
                                '  "styleComparables": ["style descriptor 1", "style descriptor 2"] }',
                                "",
                                "Focus on: Do they use short punchy sentences or long flowing ones? Are they blunt or poetic? Do they use humour? Are they detail-oriented or big-picture? Formal or colloquial? Emotionally restrained or raw?",
                                "NEVER mention any author/person names in output.",
                                ctx ? `\nBook context: ${ctx}` : "",
                                `\nAuthor writing samples:\n${sample}`,
                              ].join("\n");
                              const data = await requestOpenRouterJson<{
                                voiceRules?: string;
                                toneTags?: string[];
                                styleComparables?: string[];
                              }>(prompt, 500, { systemMessage: "You are a literary voice analyst. Study the writing samples and extract the author's natural voice patterns. Return valid JSON only. Never reference real author names." });
                              const rawRules = typeof data.voiceRules === "string" ? data.voiceRules.trim() : "";
                              const aiComps = Array.isArray(data.styleComparables) ? data.styleComparables.filter((x): x is string => typeof x === "string" && x.length > 0) : [];
                              const aiTone = Array.isArray(data.toneTags) ? data.toneTags.filter((x): x is string => typeof x === "string" && x.length > 0) : [];
                              const existingComps = novel.storyBible.styleVoice.comps ?? [];
                              const mergedComps = [...new Set([...existingComps, ...aiComps])].slice(0, STORY_BIBLE_LIMITS.styleVoice.compCount);
                              const existingTone = novel.storyBible.summary.tone ?? [];
                              const mergedTone = [...new Set([...existingTone, ...aiTone])];
                              updateStoryBible({
                                styleVoice: {
                                  ...novel.storyBible.styleVoice,
                                  voiceRules: rawRules || novel.storyBible.styleVoice.voiceRules || "",
                                  comps: mergedComps,
                                },
                                summary: { ...novel.storyBible.summary, tone: mergedTone },
                              });
                            } catch (err: unknown) {
                              if (err instanceof Error && err.name === "AbortError") { /* */ } else {
                                setStoryAiError(err instanceof Error ? err.message : "Voice analysis failed");
                              }
                            } finally { setStoryAiBusyAction(null); }
                          }}
                        >
                          {storyAiBusyAction === "style-interview" ? "Analysing your voice..." : "Create from Life Interview"}
                        </button>
                        <p className="pw-field-help" style={{ marginTop: 4 }}>
                          Analyses how you write in the Life Interview to capture your authentic voice and style.
                        </p>
                      </div>
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

                {/* ═══════════════════ NON-FICTION: ABOUT ═══════════════════ */}
                {bibleSection === "nf-about" && isNF && (
                  <div className="pw-bible-section">
                    <h3>About This Story</h3>
                    <p className="pw-field-help" style={{ marginBottom: 12 }}>What kind of non-fiction are you writing? This shapes how AI helps you.</p>

                    <label>Type of Non-Fiction</label>
                    <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", border: "1px solid var(--pw-border)", marginBottom: 12 }}>
                      {([
                        { id: "memoir" as NonfictionSubtype, label: "Memoir", hint: "Your own life story" },
                        { id: "biography" as NonfictionSubtype, label: "Biography", hint: "Someone else's story" },
                        { id: "true-crime" as NonfictionSubtype, label: "True Crime", hint: "Criminal cases & investigations" },
                        { id: "historical" as NonfictionSubtype, label: "Historical", hint: "Events & eras" },
                        { id: "investigative" as NonfictionSubtype, label: "Investigative", hint: "Deep-dive reporting" },
                      ]).map((st) => (
                        <button key={st.id} type="button" title={st.hint}
                          onClick={() => mutateNovel((n) => ({ ...n, storyBible: { ...n.storyBible, nonfiction: { ...n.storyBible.nonfiction!, subtype: st.id } } }))}
                          style={{
                            flex: 1, padding: "8px 2px", fontSize: 11, fontWeight: 600, border: "none", cursor: "pointer",
                            background: (nfData?.subtype ?? "memoir") === st.id ? "var(--pw-accent)" : "var(--pw-surface)",
                            color: (nfData?.subtype ?? "memoir") === st.id ? "var(--pw-btn-primary-text)" : "var(--pw-text-muted)",
                            transition: "all 0.15s",
                          }}
                        >{st.label}</button>
                      ))}
                    </div>

                    <label>{(nfData?.subtype === "true-crime") ? "Case / Subject Name" : (nfData?.subtype === "historical") ? "Event / Subject Name" : "Subject Name"}</label>
                    <input className="pw-bible-input" maxLength={120}
                      placeholder={
                        nfData?.subtype === "true-crime" ? "e.g. The Yorkshire Ripper Case" :
                        nfData?.subtype === "historical" ? "e.g. The Battle of the Somme" :
                        nfData?.subtype === "biography" ? "e.g. Marie Curie" :
                        nfData?.subtype === "investigative" ? "e.g. The Theranos Scandal" :
                        "e.g. John Smith"
                      }
                      value={nfData?.subjectName ?? ""}
                      onChange={(e) => mutateNovel((n) => ({ ...n, storyBible: { ...n.storyBible, nonfiction: { ...n.storyBible.nonfiction!, subjectName: e.target.value } } }))}
                    />

                    <label style={{ marginTop: 12 }}>
                      {nfData?.subtype === "true-crime" ? "Author's Connection" :
                       nfData?.subtype === "historical" ? "Author's Perspective" :
                       "Relation to Subject"}
                    </label>
                    <select className="pw-bible-input" value={nfData?.subjectRelation ?? "myself"}
                      onChange={(e) => mutateNovel((n) => ({ ...n, storyBible: { ...n.storyBible, nonfiction: { ...n.storyBible.nonfiction!, subjectRelation: e.target.value } } }))}
                    >
                      <optgroup label="Personal">
                        <option value="myself">Myself (Autobiography)</option>
                        <option value="parent">Parent</option>
                        <option value="grandparent">Grandparent</option>
                        <option value="partner">Partner / Spouse</option>
                        <option value="child">Son / Daughter</option>
                        <option value="sibling">Sibling</option>
                        <option value="friend">Friend</option>
                        <option value="family-other">Other Family Member</option>
                      </optgroup>
                      <optgroup label="Professional / Research">
                        <option value="journalist">Journalist / Reporter</option>
                        <option value="researcher">Researcher / Historian</option>
                        <option value="witness">Witness / Observer</option>
                        <option value="investigator">Investigator</option>
                        <option value="survivor">Survivor</option>
                        <option value="victim-family">Victim's Family</option>
                      </optgroup>
                      <optgroup label="Subject Type">
                        <option value="public-figure">Public Figure</option>
                        <option value="historical-figure">Historical Figure</option>
                        <option value="criminal">Criminal / Perpetrator</option>
                        <option value="event">Historical Event</option>
                        <option value="institution">Institution / Organisation</option>
                        <option value="other">Other</option>
                      </optgroup>
                    </select>

                    <label style={{ marginTop: 12 }}>Era / Time Period</label>
                    <input className="pw-bible-input" maxLength={200}
                      placeholder={
                        nfData?.subtype === "true-crime" ? "e.g. 1975–1981, with trial in 1982" :
                        nfData?.subtype === "historical" ? "e.g. July–November 1916" :
                        "e.g. 1960s–2020s, Post-war Britain"
                      }
                      value={nfData?.era ?? ""}
                      onChange={(e) => mutateNovel((n) => ({ ...n, storyBible: { ...n.storyBible, nonfiction: { ...n.storyBible.nonfiction!, era: e.target.value } } }))}
                    />

                    <label style={{ marginTop: 12 }}>Setting / Location</label>
                    <input className="pw-bible-input" maxLength={300}
                      placeholder={
                        nfData?.subtype === "true-crime" ? "e.g. Leeds, Bradford, and the West Yorkshire area" :
                        nfData?.subtype === "historical" ? "e.g. The Western Front, northern France" :
                        "e.g. Manchester, then London, with time in Australia"
                      }
                      value={nfData?.setting ?? ""}
                      onChange={(e) => mutateNovel((n) => ({ ...n, storyBible: { ...n.storyBible, nonfiction: { ...n.storyBible.nonfiction!, setting: e.target.value } } }))}
                    />

                    <label style={{ marginTop: 12 }}>Central Theme</label>
                    <textarea className="pw-bible-input" rows={3} maxLength={600}
                      placeholder={
                        nfData?.subtype === "true-crime" ? "e.g. How fear gripped a community, the investigation failures, the pursuit of justice..." :
                        nfData?.subtype === "historical" ? "e.g. The futility of war, sacrifice, the human cost of political decisions..." :
                        nfData?.subtype === "investigative" ? "e.g. How corporate greed endangered lives, the cover-up unravelled..." :
                        "What is the heart of this story? e.g. Overcoming adversity, a love story, finding identity..."
                      }
                      value={nfData?.centralTheme ?? ""}
                      onChange={(e) => mutateNovel((n) => ({ ...n, storyBible: { ...n.storyBible, nonfiction: { ...n.storyBible.nonfiction!, centralTheme: e.target.value } } }))}
                    />

                    {!aiOff && nfData?.era && (
                      <div style={{ marginTop: 16 }}>
                        <button type="button" className="pw-ai-mini-btn" disabled={storyAiBusyAction !== null}
                          onClick={async () => {
                            if (!novel || storyAiBusyAction) return;
                            setStoryAiBusyAction("nf-era-context");
                            setStoryAiError(null);
                            try {
                              const prompt = [
                                `Generate historical and cultural context for a memoir set in: ${nfData?.era || ""}.`,
                                nfData?.setting ? `Location: ${nfData.setting}` : "",
                                "Return JSON: { \"culturalNotes\": \"3-5 sentences about daily life, culture, and social norms of that era\", \"historicalEvents\": \"key events happening in the world during this time\", \"technology\": \"what technology and communication looked like\", \"musicAndMedia\": \"popular culture, music, TV, films of the era\" }",
                              ].filter(Boolean).join("\n");
                              const data = await requestOpenRouterJson<{ culturalNotes?: string; historicalEvents?: string; technology?: string; musicAndMedia?: string }>(prompt, 800, { systemMessage: "Era research assistant for memoir writers. Return valid JSON only." });
                              const lore = [...(novel.storyBible.lore ?? [])];
                              const entries: Array<{ key: string; val: string | undefined; cat: LoreEntry["category"] }> = [
                                { key: "Cultural Context", val: data.culturalNotes, cat: "Culture" },
                                { key: "Historical Events", val: data.historicalEvents, cat: "History" },
                                { key: "Technology & Daily Life", val: data.technology, cat: "Tech" },
                                { key: "Music & Popular Culture", val: data.musicAndMedia, cat: "Culture" },
                              ];
                              for (const entry of entries) {
                                if (!entry.val) continue;
                                if (!lore.some(l => l.title === entry.key)) {
                                  lore.push({ id: createEntityId("lore"), title: entry.key, category: entry.cat, content: entry.val });
                                }
                              }
                              mutateNovel((n) => ({ ...n, storyBible: { ...n.storyBible, lore } }));
                            } catch (err: unknown) {
                              if (err instanceof Error && err.name === "AbortError") { /* */ } else {
                                setStoryAiError(err instanceof Error ? err.message : "Failed to generate era context");
                              }
                            } finally { setStoryAiBusyAction(null); }
                          }}
                        >
                          {storyAiBusyAction === "nf-era-context" ? "Researching..." : "AI Era Research"}
                        </button>
                        <p className="pw-field-help" style={{ marginTop: 4 }}>Generates historical & cultural context for your era and adds it to your story lore.</p>
                      </div>
                    )}

                    <div style={{ marginTop: 16, padding: 12, borderRadius: 8, background: "var(--pw-surface)", border: "1px solid var(--pw-border-light)" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--pw-text-dim)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Privacy Shield</div>
                      <p style={{ fontSize: 12, color: "var(--pw-text-muted)", lineHeight: 1.5, margin: 0 }}>
                        All personal information stays in your local project. Names and details are never sent to AI services — only anonymised context is used for generation. You can change any real name to a pseudonym above and it will be used throughout.
                      </p>
                    </div>
                  </div>
                )}

                {/* ═══════════════════ NON-FICTION: LIFE EVENTS ═══════════════════ */}
                {bibleSection === "nf-events" && isNF && (
                  <div className="pw-bible-section">
                    <div className="pw-bible-flex-head">
                      <div>
                        <h3>{(nfData?.subtype === "true-crime" || nfData?.subtype === "historical" || nfData?.subtype === "investigative") ? "Key Events" : "Life Events"}</h3>
                        <p className="pw-field-help">{
                          nfData?.subtype === "true-crime" ? "The key events in the case — the crime, investigation milestones, arrests, trial, verdict. These become your chapters." :
                          nfData?.subtype === "historical" ? "The key historical events that form the backbone of your narrative. These become your chapters." :
                          nfData?.subtype === "investigative" ? "The key moments of discovery and revelation. These become your chapters." :
                          "Key moments that form the backbone of the story. These become the source material for chapters."
                        }</p>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {!aiOff && (
                          <button type="button" className="pw-ai-mini-btn" disabled={storyAiBusyAction !== null}
                            onClick={async () => {
                              if (!novel || storyAiBusyAction) return;
                              setStoryAiBusyAction("nf-suggest-events");
                              setStoryAiError(null);
                              try {
                                const existing = (nfData?.lifeEvents ?? []).map(e => e.title).join(", ");
                                const ctx = [
                                  nfData?.subjectName ? `Subject: ${nfData.subjectName}` : "",
                                  nfData?.era ? `Era: ${nfData.era}` : "",
                                  nfData?.setting ? `Setting: ${nfData.setting}` : "",
                                  nfData?.centralTheme ? `Theme: ${nfData.centralTheme}` : "",
                                  existing ? `Already recorded: ${existing}` : "",
                                ].filter(Boolean).join("\n");
                                const prompt = `Based on this memoir/biography context, suggest 5 life events that would make compelling chapters. Return JSON array of objects with fields: title, date (approximate), description (2-3 sentences), emotion (one word), impact (one sentence).\n\nContext:\n${ctx}`;
                                const result = await requestOpenRouterJson<Array<{ title: string; date?: string; description?: string; emotion?: string; impact?: string }>>(prompt, 1200, { systemMessage: "You are a memoir writing assistant. Return only valid JSON. Suggest meaningful life events based on the context provided. Focus on universal human experiences — milestones, turning points, losses, discoveries." });
                                if (Array.isArray(result) && result.length > 0) {
                                  const newEvents: LifeEvent[] = result.map((r, i) => ({
                                    id: createEntityId("le"),
                                    title: String(r.title || "Untitled"),
                                    date: String(r.date || ""),
                                    description: String(r.description || ""),
                                    people: [],
                                    places: [],
                                    emotion: String(r.emotion || ""),
                                    impact: String(r.impact || ""),
                                    sortOrder: (nfData?.lifeEvents?.length ?? 0) + i,
                                  }));
                                  mutateNovel((n) => ({
                                    ...n,
                                    storyBible: {
                                      ...n.storyBible,
                                      nonfiction: { ...n.storyBible.nonfiction!, lifeEvents: [...(n.storyBible.nonfiction?.lifeEvents ?? []), ...newEvents] },
                                    },
                                  }));
                                }
                              } catch (err: unknown) {
                                if (err instanceof Error && err.name === "AbortError") { /* cancelled */ } else {
                                  setStoryAiError(err instanceof Error ? err.message : "Failed to suggest events");
                                }
                              } finally {
                                setStoryAiBusyAction(null);
                              }
                            }}
                          >
                            {storyAiBusyAction === "nf-suggest-events" ? "Thinking..." : "AI Suggest Events"}
                          </button>
                        )}
                        <button type="button" className="pw-ai-mini-btn" onClick={() => {
                          const newEvent: LifeEvent = {
                            id: createEntityId("le"), title: "", date: "", description: "",
                            people: [], places: [], emotion: "", impact: "",
                            sortOrder: nfData?.lifeEvents?.length ?? 0,
                          };
                          mutateNovel((n) => ({
                            ...n,
                            storyBible: {
                              ...n.storyBible,
                              nonfiction: { ...n.storyBible.nonfiction!, lifeEvents: [...(n.storyBible.nonfiction?.lifeEvents ?? []), newEvent] },
                            },
                          }));
                        }}>
                          + Add Event
                        </button>
                      </div>
                    </div>

                    {(nfData?.lifeEvents ?? []).length === 0 && (
                      <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--pw-text-dim)" }}>
                        <p style={{ fontSize: 14, marginBottom: 8 }}>No life events yet</p>
                        <p style={{ fontSize: 12 }}>Add events manually or let AI suggest some based on your About details.</p>
                      </div>
                    )}

                    {(nfData?.lifeEvents ?? []).map((evt, idx) => (
                      <div key={evt.id} style={{
                        background: "var(--pw-surface)", borderRadius: 8, padding: 14, marginBottom: 8,
                        border: "1px solid var(--pw-border-light)",
                      }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--pw-accent)", minWidth: 20 }}>#{idx + 1}</span>
                          <input className="pw-bible-input" style={{ flex: 1, fontWeight: 600 }} placeholder="Event title" maxLength={200}
                            value={evt.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              mutateNovel((n) => ({
                                ...n, storyBible: { ...n.storyBible, nonfiction: { ...n.storyBible.nonfiction!,
                                  lifeEvents: (n.storyBible.nonfiction?.lifeEvents ?? []).map(le => le.id === evt.id ? { ...le, title: val } : le),
                                } },
                              }));
                            }}
                          />
                          <input className="pw-bible-input" style={{ width: 110 }} placeholder="Date" maxLength={50}
                            value={evt.date}
                            onChange={(e) => {
                              const val = e.target.value;
                              mutateNovel((n) => ({
                                ...n, storyBible: { ...n.storyBible, nonfiction: { ...n.storyBible.nonfiction!,
                                  lifeEvents: (n.storyBible.nonfiction?.lifeEvents ?? []).map(le => le.id === evt.id ? { ...le, date: val } : le),
                                } },
                              }));
                            }}
                          />
                          <button type="button" style={{ background: "none", border: "none", color: "var(--pw-text-dim)", cursor: "pointer", fontSize: 16, padding: "2px 4px" }}
                            title="Delete event"
                            onClick={() => mutateNovel((n) => ({
                              ...n, storyBible: { ...n.storyBible, nonfiction: { ...n.storyBible.nonfiction!,
                                lifeEvents: (n.storyBible.nonfiction?.lifeEvents ?? []).filter(le => le.id !== evt.id),
                              } },
                            }))}
                          >×</button>
                        </div>
                        <textarea className="pw-bible-input" rows={2} placeholder="What happened? Describe the memory in detail..." maxLength={1200}
                          value={evt.description}
                          onChange={(e) => {
                            const val = e.target.value;
                            mutateNovel((n) => ({
                              ...n, storyBible: { ...n.storyBible, nonfiction: { ...n.storyBible.nonfiction!,
                                lifeEvents: (n.storyBible.nonfiction?.lifeEvents ?? []).map(le => le.id === evt.id ? { ...le, description: val } : le),
                              } },
                            }));
                          }}
                        />
                        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                          <div style={{ flex: 1, minWidth: 120 }}>
                            <label style={{ fontSize: 10, color: "var(--pw-text-dim)" }}>Emotion</label>
                            <input className="pw-bible-input" placeholder="e.g. grief, joy, anger" maxLength={60}
                              value={evt.emotion}
                              onChange={(e) => {
                                const val = e.target.value;
                                mutateNovel((n) => ({
                                  ...n, storyBible: { ...n.storyBible, nonfiction: { ...n.storyBible.nonfiction!,
                                    lifeEvents: (n.storyBible.nonfiction?.lifeEvents ?? []).map(le => le.id === evt.id ? { ...le, emotion: val } : le),
                                  } },
                                }));
                              }}
                            />
                          </div>
                          <div style={{ flex: 2, minWidth: 180 }}>
                            <label style={{ fontSize: 10, color: "var(--pw-text-dim)" }}>Impact — how did this change things?</label>
                            <input className="pw-bible-input" placeholder="e.g. Never trusted anyone again" maxLength={300}
                              value={evt.impact}
                              onChange={(e) => {
                                const val = e.target.value;
                                mutateNovel((n) => ({
                                  ...n, storyBible: { ...n.storyBible, nonfiction: { ...n.storyBible.nonfiction!,
                                    lifeEvents: (n.storyBible.nonfiction?.lifeEvents ?? []).map(le => le.id === evt.id ? { ...le, impact: val } : le),
                                  } },
                                }));
                              }}
                            />
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                          <div style={{ flex: 1, minWidth: 140 }}>
                            <label style={{ fontSize: 10, color: "var(--pw-text-dim)" }}>People involved (comma-separated)</label>
                            <input className="pw-bible-input" placeholder="e.g. Mum, Uncle Frank" maxLength={300}
                              value={evt.people.join(", ")}
                              onChange={(e) => {
                                const val = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                                mutateNovel((n) => ({
                                  ...n, storyBible: { ...n.storyBible, nonfiction: { ...n.storyBible.nonfiction!,
                                    lifeEvents: (n.storyBible.nonfiction?.lifeEvents ?? []).map(le => le.id === evt.id ? { ...le, people: val } : le),
                                  } },
                                }));
                              }}
                            />
                          </div>
                          <div style={{ flex: 1, minWidth: 140 }}>
                            <label style={{ fontSize: 10, color: "var(--pw-text-dim)" }}>Places (comma-separated)</label>
                            <input className="pw-bible-input" placeholder="e.g. Kitchen, Hospital" maxLength={300}
                              value={evt.places.join(", ")}
                              onChange={(e) => {
                                const val = e.target.value.split(",").map(s => s.trim()).filter(Boolean);
                                mutateNovel((n) => ({
                                  ...n, storyBible: { ...n.storyBible, nonfiction: { ...n.storyBible.nonfiction!,
                                    lifeEvents: (n.storyBible.nonfiction?.lifeEvents ?? []).map(le => le.id === evt.id ? { ...le, places: val } : le),
                                  } },
                                }));
                              }}
                            />
                          </div>
                        </div>
                        {!aiOff && evt.description && (
                          <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
                            <button type="button" className="pw-ai-mini-btn" style={{ fontSize: 10 }}
                              disabled={storyAiBusyAction !== null}
                              onClick={async () => {
                                if (storyAiBusyAction) return;
                                setStoryAiBusyAction(`nf-dialogue-${evt.id}`);
                                setStoryAiError(null);
                                try {
                                  const prompt = [
                                    "Based on this real life event, reconstruct plausible dialogue that might have occurred.",
                                    "Write 3-5 short exchanges of natural dialogue between the people present.",
                                    "Make it feel authentic to the era and emotional tone. Return ONLY the dialogue, no narration.",
                                    `\nEvent: ${evt.title}`,
                                    `Description: ${evt.description}`,
                                    evt.people.length ? `People present: ${evt.people.join(", ")}` : "",
                                    evt.emotion ? `Emotional tone: ${evt.emotion}` : "",
                                  ].filter(Boolean).join("\n");
                                  const dialogue = await requestOpenRouterText(prompt, 500, 60000, "Memoir dialogue reconstruction specialist. Write authentic, period-appropriate dialogue based on real events.");
                                  if (dialogue?.trim()) {
                                    const newDesc = evt.description + "\n\n--- Reconstructed Dialogue ---\n" + dialogue.trim();
                                    mutateNovel((n) => ({
                                      ...n, storyBible: { ...n.storyBible, nonfiction: { ...n.storyBible.nonfiction!,
                                        lifeEvents: (n.storyBible.nonfiction?.lifeEvents ?? []).map(le => le.id === evt.id ? { ...le, description: newDesc } : le),
                                      } },
                                    }));
                                  }
                                } catch (err: unknown) {
                                  if (err instanceof Error && err.name === "AbortError") { /* */ } else {
                                    setStoryAiError(err instanceof Error ? err.message : "Dialogue reconstruction failed");
                                  }
                                } finally { setStoryAiBusyAction(null); }
                              }}
                            >
                              {storyAiBusyAction === `nf-dialogue-${evt.id}` ? "Reconstructing..." : "Reconstruct Dialogue"}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {storyAiError && <p className="pw-ora-error pw-bible-ai-error">{storyAiError}</p>}
                  </div>
                )}

                {/* ═══════════════════ NON-FICTION: LIFE INTERVIEW ═══════════════════ */}
                {bibleSection === "nf-interview" && isNF && (
                  <div className="pw-bible-section" style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
                    <div className="pw-bible-flex-head">
                      <div>
                        <h3>{(nfData?.subtype === "true-crime" || nfData?.subtype === "investigative") ? "Research Interview" : nfData?.subtype === "historical" ? "Event Interview" : "Life Interview"}</h3>
                        <p className="pw-field-help">{
                          nfData?.subtype === "true-crime" ? "Walk through the case with AI. Describe the events, the investigation, the people. When ready, extract everything into your story." :
                          nfData?.subtype === "investigative" ? "Walk through your investigation with AI. Lay out the evidence, the sources, the timeline. When ready, extract everything." :
                          nfData?.subtype === "historical" ? "Walk through the historical events with AI. Describe what happened, who was involved, and the consequences." :
                          "Talk through your memories with AI. It asks questions, you tell stories. When ready, extract everything into your Canon."
                        }</p>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {!aiOff && (nfData?.interviewTranscript?.length ?? 0) > 2 && (
                          <button type="button" className="pw-ai-mini-btn" disabled={storyAiBusyAction !== null}
                            onClick={async () => {
                              if (!novel || storyAiBusyAction) return;
                              setStoryAiBusyAction("nf-extract");
                              setStoryAiError(null);
                              try {
                                const transcript = (nfData?.interviewTranscript ?? []).map(m => `${m.role === "ai" ? "Interviewer" : "Subject"}: ${m.text}`).join("\n");
                                const prompt = [
                                  "Extract structured memoir data from this interview transcript. Return JSON with:",
                                  '{ "lifeEvents": [{ "title": "...", "date": "...", "description": "...", "emotion": "...", "impact": "...", "people": ["..."], "places": ["..."] }],',
                                  '  "characters": [{ "name": "...", "role": "...", "description": "..." }],',
                                  '  "locations": [{ "name": "...", "description": "..." }],',
                                  '  "synopsis": "A 2-3 sentence synopsis of the overall story",',
                                  '  "themes": ["theme1", "theme2"] }',
                                  "",
                                  `Transcript:\n${transcript.slice(0, 8000)}`,
                                ].join("\n");
                                const data = await requestOpenRouterJson<{
                                  lifeEvents?: Array<{ title: string; date?: string; description?: string; emotion?: string; impact?: string; people?: string[]; places?: string[] }>;
                                  characters?: Array<{ name: string; role?: string; description?: string }>;
                                  locations?: Array<{ name: string; description?: string }>;
                                  synopsis?: string;
                                  themes?: string[];
                                }>(prompt, 3000, { systemMessage: "You are a memoir data extraction assistant. Extract all named people, places, events, and themes from the transcript. Return valid JSON only." });
                                mutateNovel((n) => {
                                  const nf = { ...n.storyBible.nonfiction! };
                                  if (Array.isArray(data.lifeEvents)) {
                                    const newEvts: LifeEvent[] = data.lifeEvents.map((e, i) => ({
                                      id: createEntityId("le"), title: String(e.title || ""), date: String(e.date || ""),
                                      description: String(e.description || ""), emotion: String(e.emotion || ""),
                                      impact: String(e.impact || ""), people: Array.isArray(e.people) ? e.people.map(String) : [],
                                      places: Array.isArray(e.places) ? e.places.map(String) : [],
                                      sortOrder: (nf.lifeEvents?.length ?? 0) + i,
                                    }));
                                    nf.lifeEvents = [...(nf.lifeEvents ?? []), ...newEvts];
                                  }
                                  nf.extractedAt = new Date().toISOString();
                                  const chars = [...(n.storyBible.characters ?? [])];
                                  if (Array.isArray(data.characters)) {
                                    for (const c of data.characters) {
                                      if (!c.name || chars.some(ec => ec.name.toLowerCase() === c.name.toLowerCase())) continue;
                                      chars.push({
                                        id: createEntityId("char"), name: c.name, role: "Supporting" as const,
                                        logline: c.description || "", appearance: "", personality: "",
                                        goals: "", fears: "", backstory: "",
                                        relationships: [],
                                      });
                                    }
                                  }
                                  const locs = [...(n.storyBible.locations ?? [])];
                                  if (Array.isArray(data.locations)) {
                                    for (const l of data.locations) {
                                      if (!l.name || locs.some(el => el.name.toLowerCase() === l.name.toLowerCase())) continue;
                                      locs.push({ id: createEntityId("loc"), name: l.name, description: l.description || "" });
                                    }
                                  }
                                  const summary = { ...n.storyBible.summary };
                                  if (data.synopsis) summary.synopsisShort = data.synopsis;
                                  if (Array.isArray(data.themes)) summary.themes = [...new Set([...(summary.themes ?? []), ...data.themes])];
                                  return { ...n, storyBible: { ...n.storyBible, nonfiction: nf, characters: chars, locations: locs, summary } };
                                });
                                saveNow();
                              } catch (err: unknown) {
                                if (err instanceof Error && err.name === "AbortError") { /* cancelled */ } else {
                                  setStoryAiError(err instanceof Error ? err.message : "Extraction failed");
                                }
                              } finally {
                                setStoryAiBusyAction(null);
                              }
                            }}
                          >
                            {storyAiBusyAction === "nf-extract" ? "Extracting..." : "Extract to Canon"}
                          </button>
                        )}
                        {(nfData?.interviewTranscript?.length ?? 0) > 0 && (
                          <button type="button" className="pw-ai-mini-btn" style={{ opacity: 0.6 }}
                            onClick={() => {
                              if (!confirm("Clear the entire interview transcript?")) return;
                              mutateNovel((n) => ({
                                ...n, storyBible: { ...n.storyBible, nonfiction: { ...n.storyBible.nonfiction!, interviewTranscript: [], interviewPhase: "big-picture" } },
                              }));
                            }}
                          >Clear</button>
                        )}
                      </div>
                    </div>

                    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, padding: "8px 0", minHeight: 200, maxHeight: 400 }}>
                      {(nfData?.interviewTranscript ?? []).length === 0 && (
                        <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--pw-text-dim)" }}>
                          <p style={{ fontSize: 14, marginBottom: 8 }}>Ready for your life interview</p>
                          <p style={{ fontSize: 12 }}>Type a message or click &quot;Start Interview&quot; to let AI guide you through your story.</p>
                        </div>
                      )}
                      {(nfData?.interviewTranscript ?? []).map((msg, i) => (
                        <div key={i} style={{
                          padding: "8px 12px", borderRadius: 8, maxWidth: "85%",
                          alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                          background: msg.role === "user" ? "var(--pw-accent)" : "var(--pw-surface)",
                          color: msg.role === "user" ? "var(--pw-btn-primary-text)" : "var(--pw-text)",
                          fontSize: 13, lineHeight: 1.5,
                          border: msg.role === "ai" ? "1px solid var(--pw-border-light)" : "none",
                        }}>
                          {msg.text}
                        </div>
                      ))}
                    </div>

                    {/* Checkpoint banner */}
                    {(() => {
                      const ckIdx = nfData?.interviewCheckpointIdx ?? 0;
                      const transcriptNow = nfData?.interviewTranscript ?? [];
                      const userMsgsSinceCheckpoint = transcriptNow.slice(ckIdx).filter(m => m.role === "user").length;
                      if (userMsgsSinceCheckpoint < 8) return null;
                      return (
                        <div style={{
                          padding: "10px 14px", borderRadius: 8, display: "flex", alignItems: "center", gap: 10,
                          background: "rgba(var(--pw-accent-rgb, 163,230,53), 0.08)",
                          border: "1px solid rgba(var(--pw-accent-rgb, 163,230,53), 0.2)",
                        }}>
                          <span style={{ flex: 1, fontSize: 12, fontWeight: 550, color: "var(--pw-text)" }}>
                            You&apos;ve shared a lot — save to Canon so nothing gets lost?
                          </span>
                          <button type="button" className="pw-ai-mini-btn" disabled={storyAiBusyAction !== null}
                            onClick={async () => {
                              if (!novel || storyAiBusyAction) return;
                              setStoryAiBusyAction("nf-extract");
                              setStoryAiError(null);
                              try {
                                const ck = nfData?.interviewCheckpointIdx ?? 0;
                                const newMsgs = (nfData?.interviewTranscript ?? []).slice(ck);
                                const transcript = newMsgs.map(m => `${m.role === "ai" ? "Interviewer" : "Subject"}: ${m.text}`).join("\n");
                                const prompt = [
                                  "Extract structured memoir data from this interview transcript. Return JSON with:",
                                  '{ "lifeEvents": [{ "title": "...", "date": "...", "description": "...", "emotion": "...", "impact": "...", "people": ["..."], "places": ["..."] }],',
                                  '  "characters": [{ "name": "...", "role": "...", "description": "..." }],',
                                  '  "locations": [{ "name": "...", "description": "..." }],',
                                  '  "themes": ["theme1", "theme2"] }',
                                  "",
                                  `Transcript:\n${transcript.slice(0, 8000)}`,
                                ].join("\n");
                                const data = await requestOpenRouterJson<{
                                  lifeEvents?: Array<{ title: string; date?: string; description?: string; emotion?: string; impact?: string; people?: string[]; places?: string[] }>;
                                  characters?: Array<{ name: string; role?: string; description?: string }>;
                                  locations?: Array<{ name: string; description?: string }>;
                                  themes?: string[];
                                }>(prompt, 3000, { systemMessage: "You are a memoir data extraction assistant. Extract all named people, places, events, and themes from the transcript. Return valid JSON only." });
                                mutateNovel((n) => {
                                  const nf = { ...n.storyBible.nonfiction! };
                                  if (Array.isArray(data.lifeEvents)) {
                                    const newEvts: LifeEvent[] = data.lifeEvents.map((e, i) => ({
                                      id: createEntityId("le"), title: String(e.title || ""), date: String(e.date || ""),
                                      description: String(e.description || ""), emotion: String(e.emotion || ""),
                                      impact: String(e.impact || ""), people: Array.isArray(e.people) ? e.people.map(String) : [],
                                      places: Array.isArray(e.places) ? e.places.map(String) : [],
                                      sortOrder: (nf.lifeEvents?.length ?? 0) + i,
                                    }));
                                    nf.lifeEvents = [...(nf.lifeEvents ?? []), ...newEvts];
                                  }
                                  nf.interviewCheckpointIdx = (nf.interviewTranscript ?? []).length;
                                  nf.extractedAt = new Date().toISOString();
                                  const chars = [...(n.storyBible.characters ?? [])];
                                  if (Array.isArray(data.characters)) {
                                    for (const c of data.characters) {
                                      if (!c.name || chars.some(ec => ec.name.toLowerCase() === c.name.toLowerCase())) continue;
                                      chars.push({ id: createEntityId("char"), name: c.name, role: "Supporting" as const, logline: c.description || "", appearance: "", personality: "", goals: "", fears: "", backstory: "", relationships: [] });
                                    }
                                  }
                                  const locs = [...(n.storyBible.locations ?? [])];
                                  if (Array.isArray(data.locations)) {
                                    for (const l of data.locations) {
                                      if (!l.name || locs.some(el => el.name.toLowerCase() === l.name.toLowerCase())) continue;
                                      locs.push({ id: createEntityId("loc"), name: l.name, description: l.description || "" });
                                    }
                                  }
                                  const summary = { ...n.storyBible.summary };
                                  if (Array.isArray(data.themes)) summary.themes = [...new Set([...(summary.themes ?? []), ...data.themes])];
                                  return { ...n, storyBible: { ...n.storyBible, nonfiction: nf, characters: chars, locations: locs, summary } };
                                });
                                saveNow();
                              } catch (err: unknown) {
                                if (err instanceof Error && err.name === "AbortError") { /* cancelled */ } else {
                                  setStoryAiError(err instanceof Error ? err.message : "Extraction failed");
                                }
                              } finally { setStoryAiBusyAction(null); }
                            }}
                          >
                            {storyAiBusyAction === "nf-extract" ? "Saving..." : "Save & Continue"}
                          </button>
                        </div>
                      );
                    })()}

                    <div style={{ display: "flex", gap: 8, paddingTop: 8, borderTop: "1px solid var(--pw-border-light)" }}>
                      {(nfData?.interviewTranscript ?? []).length === 0 && !aiOff && (
                        <button type="button" className="pw-ai-mini-btn" disabled={storyAiBusyAction !== null}
                          onClick={async () => {
                            if (storyAiBusyAction) return;
                            setStoryAiBusyAction("nf-interview");
                            try {
                              const ctx = [
                                nfData?.subjectName ? `Subject: ${nfData.subjectName}` : "",
                                nfData?.era ? `Era: ${nfData.era}` : "",
                                nfData?.centralTheme ? `Theme: ${nfData.centralTheme}` : "",
                              ].filter(Boolean).join(". ");
                              const subtypeHint = nfData?.subtype === "true-crime" ? "a true crime case" : nfData?.subtype === "historical" ? "a historical event" : nfData?.subtype === "investigative" ? "an investigation" : nfData?.subtype === "biography" ? "someone's life story" : "their life";
                              const prompt = `You are starting an interview for a ${nfData?.subtype || "memoir"} book${ctx ? ` about: ${ctx}` : ""}. Ask an engaging opening question to get the author talking about ${subtypeHint}. Be warm, conversational, and curious. Just the question, 2-3 sentences max.`;
                              const res = await requestOpenRouterText(prompt, 200);
                              const aiText = typeof res === "string" ? res.trim() : "";
                              if (aiText) {
                                mutateNovel((n) => ({
                                  ...n, storyBible: { ...n.storyBible, nonfiction: { ...n.storyBible.nonfiction!, interviewTranscript: [{ role: "ai" as const, text: aiText }] } },
                                }));
                              }
                            } catch { /* */ } finally { setStoryAiBusyAction(null); }
                          }}
                        >
                          {storyAiBusyAction === "nf-interview" ? "Starting..." : "Start Interview"}
                        </button>
                      )}
                      <input
                        className="pw-bible-input" style={{ flex: 1 }}
                        placeholder="Tell your story..."
                        maxLength={2000}
                        onKeyDown={async (e) => {
                          if (e.key !== "Enter" || !e.currentTarget.value.trim() || storyAiBusyAction) return;
                          const userText = e.currentTarget.value.trim();
                          e.currentTarget.value = "";
                          const transcript = [...(nfData?.interviewTranscript ?? []), { role: "user" as const, text: userText }];
                          mutateNovel((n) => ({ ...n, storyBible: { ...n.storyBible, nonfiction: { ...n.storyBible.nonfiction!, interviewTranscript: transcript } } }));
                          if (aiOff) return;
                          setStoryAiBusyAction("nf-interview");
                          try {
                            const ckIdx = nfData?.interviewCheckpointIdx ?? 0;
                            const recent = transcript.slice(ckIdx).slice(-14).map(m => `${m.role === "ai" ? "Interviewer" : "Subject"}: ${m.text}`).join("\n");
                            const ctx = [
                              nfData?.subjectName ? `Subject: ${nfData.subjectName}` : "",
                              nfData?.centralTheme ? `Theme: ${nfData.centralTheme}` : "",
                            ].filter(Boolean).join(". ");
                            const memoryPrompts = [
                              "What sounds, smells, or textures do you remember from that moment?",
                              "Who else was there? What were they doing?",
                              "What were you thinking at the time?",
                              "How did you feel right before it happened?",
                              "If you could go back to that moment, what would you notice?",
                              "What happened right after?",
                              "Did anyone say something you still remember word for word?",
                            ];
                            const randomPrompt = memoryPrompts[Math.floor(Math.random() * memoryPrompts.length)];
                            const prompt = [
                              `You're conducting an interview for a ${nfData?.subtype || "memoir"} book${ctx ? ` (${ctx})` : ""}.`,
                              nfData?.subtype === "true-crime" ? "Based on what the author just said, acknowledge the detail, then ask a follow-up about the investigation, the people involved, or the sequence of events. Push for specifics — timeline, evidence, motives."
                                : nfData?.subtype === "historical" ? "Based on what the author said, ask a follow-up about the historical context, the human stories within, or the consequences of the events."
                                : nfData?.subtype === "investigative" ? "Based on what the author said, dig deeper into the evidence, the sources, and the revelations. Ask what they discovered next."
                                : "Based on what the subject just said, respond with empathy (1 sentence), then ask a follow-up question that digs deeper into the memory.",
                              nfData?.subtype !== "true-crime" && nfData?.subtype !== "investigative" ? `Optionally weave in a sensory memory prompt like: "${randomPrompt}"` : "",
                              "Keep it natural — like a knowledgeable colleague who's genuinely curious. 2-4 sentences max.",
                              `\nRecent conversation:\n${recent}`,
                            ].join("\n");
                            const res = await requestOpenRouterText(prompt, 300);
                            const aiText = typeof res === "string" ? res.trim() : "";
                            if (aiText) {
                              mutateNovel((n) => ({
                                ...n, storyBible: { ...n.storyBible, nonfiction: { ...n.storyBible.nonfiction!,
                                  interviewTranscript: [...(n.storyBible.nonfiction?.interviewTranscript ?? []), { role: "ai" as const, text: aiText }],
                                } },
                              }));
                            }
                          } catch { /* */ } finally { setStoryAiBusyAction(null); }
                        }}
                      />
                    </div>
                    {storyAiError && <p className="pw-ora-error pw-bible-ai-error" style={{ marginTop: 8 }}>{storyAiError}</p>}
                  </div>
                )}

                {/* ═══════════════════ NON-FICTION: EMOTIONAL TIMELINE ═══════════════════ */}
                {bibleSection === "nf-timeline" && isNF && (
                  <div className="pw-bible-section">
                    <h3>Emotional Timeline</h3>
                    <p className="pw-field-help" style={{ marginBottom: 16 }}>Visualise the emotional arc of the story. Events are plotted by their emotion to help you see the narrative shape.</p>

                    {(nfData?.lifeEvents ?? []).length === 0 ? (
                      <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--pw-text-dim)" }}>
                        <p style={{ fontSize: 14 }}>Add Life Events first to see the emotional timeline.</p>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {(() => {
                          const emotionValues: Record<string, number> = {
                            joy: 5, love: 5, pride: 4, hope: 4, excitement: 4, gratitude: 4, relief: 3, peace: 3,
                            surprise: 2, nostalgia: 2, bittersweet: 1, confusion: 0, anxiety: -1, loneliness: -1,
                            frustration: -2, anger: -2, fear: -3, shame: -3, guilt: -3, sadness: -4, grief: -5, despair: -5,
                          };
                          const events = (nfData?.lifeEvents ?? []).filter(e => e.title);
                          return events.map((evt) => {
                            const emotionKey = evt.emotion.toLowerCase().trim();
                            const val = emotionValues[emotionKey] ?? 0;
                            const pct = ((val + 5) / 10) * 100;
                            const color = val > 2 ? "#22c55e" : val > 0 ? "#a3e635" : val === 0 ? "#94a3b8" : val > -3 ? "#f59e0b" : "#ef4444";
                            return (
                              <div key={evt.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0" }}>
                                <span style={{ fontSize: 11, color: "var(--pw-text-dim)", minWidth: 80, textAlign: "right" }}>{evt.date || "—"}</span>
                                <div style={{ flex: 1, position: "relative", height: 28, background: "var(--pw-surface)", borderRadius: 4, overflow: "hidden" }}>
                                  <div style={{
                                    position: "absolute", left: `${Math.min(pct, 95)}%`, top: 2, bottom: 2,
                                    width: 8, borderRadius: 4, background: color,
                                    transform: "translateX(-50%)", transition: "left 0.3s",
                                  }} />
                                  <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, fontWeight: 600, color: "var(--pw-text)" }}>
                                    {evt.title.slice(0, 40)}
                                  </span>
                                </div>
                                <span style={{ fontSize: 10, color, minWidth: 60, textAlign: "left", fontWeight: 600 }}>{evt.emotion || "neutral"}</span>
                              </div>
                            );
                          });
                        })()}
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--pw-text-dim)", marginTop: 4, padding: "0 88px 0 88px" }}>
                          <span>Despair</span><span>Neutral</span><span>Joy</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ═══════════════════ NON-FICTION: RELATIONSHIPS ═══════════════════ */}
                {bibleSection === "nf-relationships" && isNF && (
                  <div className="pw-bible-section">
                    <div className="pw-bible-flex-head">
                      <div>
                        <h3>Relationship Web</h3>
                        <p className="pw-field-help">Map how the people in this story relate to the subject and each other.</p>
                      </div>
                      {!aiOff && storyCharacters.length >= 2 && (
                        <button type="button" className="pw-ai-mini-btn" disabled={storyAiBusyAction !== null}
                          onClick={async () => {
                            if (!novel || storyAiBusyAction) return;
                            setStoryAiBusyAction("nf-relationships");
                            setStoryAiError(null);
                            try {
                              const people = storyCharacters.map(c => `${c.name}: ${c.role || ""}. ${c.logline || ""}`).join("\n");
                              const evts = (nfData?.lifeEvents ?? []).map(e => `${e.title}: ${e.description?.slice(0, 100) || ""} (People: ${(e.people ?? []).join(", ")})`).join("\n");
                              const prompt = [
                                "Given these people and life events from a memoir, identify key relationships between people.",
                                "Return JSON array: [{ person1: 'name', person2: 'name', relationship: 'description of bond/conflict/dynamic' }]",
                                `Max 10 relationships.\n\nPeople:\n${people}\n\nEvents:\n${evts}`,
                              ].join("\n");
                              const data = await requestOpenRouterJson<Array<{ person1: string; person2: string; relationship: string }>>(prompt, 1000, {
                                systemMessage: "Memoir relationship analyst. Return valid JSON only.",
                              });
                              if (Array.isArray(data)) {
                                const chars = [...(novel.storyBible.characters ?? [])];
                                for (const rel of data) {
                                  const c1 = chars.find(c => c.name.toLowerCase() === rel.person1?.toLowerCase());
                                  const c2 = chars.find(c => c.name.toLowerCase() === rel.person2?.toLowerCase());
                                  if (c1 && c2) {
                                    if (!c1.relationships) c1.relationships = [];
                                    if (!c1.relationships.some((r: Relationship) => r.targetCharacterId === c2.id)) {
                                      c1.relationships.push({ targetCharacterId: c2.id, type: "memoir", description: rel.relationship || "" });
                                    }
                                  }
                                }
                                mutateNovel((n) => ({ ...n, storyBible: { ...n.storyBible, characters: chars } }));
                              }
                            } catch (err: unknown) {
                              if (err instanceof Error && err.name === "AbortError") { /* cancelled */ } else {
                                setStoryAiError(err instanceof Error ? err.message : "Failed to map relationships");
                              }
                            } finally { setStoryAiBusyAction(null); }
                          }}
                        >
                          {storyAiBusyAction === "nf-relationships" ? "Mapping..." : "AI Map Relationships"}
                        </button>
                      )}
                    </div>

                    {storyCharacters.length < 2 ? (
                      <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--pw-text-dim)" }}>
                        <p style={{ fontSize: 14, marginBottom: 8 }}>Add at least 2 people to see the relationship web.</p>
                        <p style={{ fontSize: 12 }}>Use the People tab, Life Events, or extract from Interview.</p>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {storyCharacters.map((char) => {
                          const rels = (char.relationships ?? []).filter((r: Relationship) => {
                            return storyCharacters.some(c => c.id === r.targetCharacterId);
                          });
                          if (rels.length === 0) return null;
                          return (
                            <div key={char.id} style={{ background: "var(--pw-surface)", borderRadius: 8, padding: 12, border: "1px solid var(--pw-border-light)" }}>
                              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{char.name}</div>
                              {rels.map((rel: Relationship, ri: number) => {
                                const target = storyCharacters.find(c => c.id === rel.targetCharacterId);
                                return (
                                  <div key={ri} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", fontSize: 12 }}>
                                    <span style={{ color: "var(--pw-accent)", fontWeight: 600 }}>{target?.name || "?"}</span>
                                    <span style={{ color: "var(--pw-text-dim)", fontSize: 11 }}>—</span>
                                    <span style={{ color: "var(--pw-text-muted)" }}>{rel.description}</span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {storyAiError && <p className="pw-ora-error pw-bible-ai-error">{storyAiError}</p>}
                  </div>
                )}

              </section>
            </div>
          </div>
        </div>
      )}

      {/* ── Name confirmation popup ── */}
      {/* ── Character generation step-through popup ── */}
      {nameConfirmPopup && nameConfirmPopup.step === "names" && (
        <div className="pw-modal-overlay" onClick={() => setNameConfirmPopup(null)}>
          <div className="pw-modal" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 520 }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, margin: "0 auto 12px",
                background: "rgba(var(--pw-accent-rgb, 163,230,53), 0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--pw-accent, #a3e635)" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
              </div>
              <div className="pw-delete-modal-title" style={{ fontSize: 18, fontWeight: 800 }}>
                Step 1: Confirm Characters
              </div>
              <p className="pw-delete-modal-copy" style={{ marginTop: 6, fontSize: 13 }}>
                Tick the characters you want to add. Untick any you don&apos;t need.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "0 0 20px" }}>
              {nameConfirmPopup.roster.map((entry, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setNameConfirmPopup((prev) => {
                      if (!prev) return prev;
                      const next = [...prev.roster];
                      next[idx] = { ...next[idx], selected: !next[idx].selected };
                      return { ...prev, roster: next };
                    });
                  }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 14px", borderRadius: 12,
                    cursor: "pointer", transition: "all 0.15s",
                    textAlign: "left", width: "100%",
                    border: entry.selected ? "2px solid var(--pw-accent, #556b2f)" : "1.5px solid var(--pw-border, #e5e6ea)",
                    background: entry.selected ? "var(--pw-accent-light, rgba(85,107,47,0.08))" : "var(--pw-bg-soft, transparent)",
                  }}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                    border: entry.selected ? "2px solid var(--pw-accent, #a3e635)" : "2px solid var(--pw-border, #444)",
                    background: entry.selected ? "var(--pw-accent, #a3e635)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.15s",
                  }}>
                    {entry.selected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={document.documentElement.classList.contains("pw-light") ? "#fff" : "#111"} strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--pw-text)" }}>{entry.name}</div>
                    {entry.logline && (
                      <div style={{ fontSize: 11, color: "var(--pw-text-dim)", marginTop: 2, lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {entry.logline}
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 6, flexShrink: 0,
                    background: entry.role === "Protagonist" ? "rgba(163,230,53,0.12)" : entry.role === "Antagonist" ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.06)",
                    color: entry.role === "Protagonist" ? "var(--pw-accent)" : entry.role === "Antagonist" ? "#ef4444" : "var(--pw-text-dim)",
                    textTransform: "uppercase", letterSpacing: "0.03em",
                  }}>{entry.role || "Supporting"}</span>
                </button>
              ))}
            </div>

            <div className="pw-delete-modal-actions" style={{ marginTop: 16 }}>
              <button
                type="button"
                className="btn pw-cancel-btn"
                onClick={() => setNameConfirmPopup(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={nameConfirmPopup.roster.filter((r) => r.selected).length === 0}
                onClick={() => commitSelectedCharacters()}
                style={{ opacity: nameConfirmPopup.roster.filter((r) => r.selected).length === 0 ? 0.4 : 1 }}
              >
                Add {nameConfirmPopup.roster.filter((r) => r.selected).length} character{nameConfirmPopup.roster.filter((r) => r.selected).length !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Generate profiles offer ── */}
      {nameConfirmPopup && nameConfirmPopup.step === "profiles" && nameConfirmPopup.addedCharacterIds && (
        <div className="pw-modal-overlay" onClick={() => setNameConfirmPopup(null)}>
          <div className="pw-modal" onClick={(event) => event.stopPropagation()} style={{ maxWidth: 480 }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, margin: "0 auto 12px",
                background: "rgba(var(--pw-accent-rgb, 163,230,53), 0.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--pw-accent, #a3e635)" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div className="pw-delete-modal-title" style={{ fontSize: 18, fontWeight: 800 }}>
                Step 2: Generate Profiles?
              </div>
              <p className="pw-delete-modal-copy" style={{ marginTop: 6, fontSize: 13 }}>
                {nameConfirmPopup.addedCharacterIds.length} character{nameConfirmPopup.addedCharacterIds.length !== 1 ? "s" : ""} added. Generate full profiles (appearance, personality, backstory, speaking style)?
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4, margin: "0 0 16px" }}>
              {nameConfirmPopup.addedCharacterIds.map((cid) => {
                const ch = storyCharacters.find((c) => c.id === cid);
                if (!ch) return null;
                return (
                  <div key={cid} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 12px", borderRadius: 10,
                    background: "var(--pw-surface-alt, rgba(255,255,255,0.04))",
                    border: "1px solid var(--pw-border, rgba(255,255,255,0.08))",
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{ch.name}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                      background: ch.role === "Protagonist" ? "rgba(163,230,53,0.12)" : ch.role === "Antagonist" ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.06)",
                      color: ch.role === "Protagonist" ? "var(--pw-accent)" : ch.role === "Antagonist" ? "#ef4444" : "var(--pw-text-dim)",
                    }}>{ch.role || "Supporting"}</span>
                  </div>
                );
              })}
            </div>

            <div className="pw-delete-modal-actions" style={{ marginTop: 16 }}>
              <button
                type="button"
                className="btn pw-cancel-btn"
                onClick={() => setNameConfirmPopup(null)}
              >
                Skip - I&apos;ll fill them in
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void runAutoGenerateAllProfiles(nameConfirmPopup.addedCharacterIds!)}
              >
                Generate all profiles
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New character AI prompt popup ── */}
      {newCharPopup && (
        <div className="pw-modal-overlay">
          <div className="pw-modal" style={{ maxWidth: 440, padding: "28px 26px" }}>
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, margin: "0 auto 12px",
                background: "rgba(var(--pw-accent-rgb,163,230,53),0.10)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--pw-accent,#a3e635)" strokeWidth="2" strokeLinecap="round">
                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
                </svg>
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: "-0.01em" }}>
                New Character
              </h3>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "var(--pw-text-dim)", fontWeight: 500, lineHeight: 1.5 }}>
                Want AI to generate this character? Describe them briefly in relation to your story and we'll build a full profile with a name.
              </p>
            </div>

            {newCharPopup.generating ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, margin: "0 auto 12px",
                  background: "rgba(var(--pw-accent-rgb,163,230,53),0.10)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  animation: "pulse 1.8s ease-in-out infinite",
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--pw-accent,#a3e635)" strokeWidth="2" strokeLinecap="round">
                    <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.48-8.48l2.83-2.83M2 12h4m12 0h4m-3.93 7.07l-2.83-2.83M7.76 7.76L4.93 4.93"/>
                  </svg>
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Creating character...</p>
                <p style={{ fontSize: 12, color: "var(--pw-text-dim)", marginTop: 6 }}>
                  Building profile, this may take a moment.
                </p>
                <style>{`@keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.7; transform:scale(0.95); } }`}</style>
              </div>
            ) : (
              <>
                <textarea
                  autoFocus
                  rows={3}
                  placeholder="e.g. The detective's ex-wife who now works as a journalist and is secretly investigating the same case..."
                  value={newCharPopup.description}
                  onChange={(e) => setNewCharPopup((p) => p ? { ...p, description: e.target.value } : p)}
                  style={{
                    width: "100%", padding: "10px 12px", fontSize: 13, fontWeight: 500,
                    borderRadius: 8, border: "1px solid var(--pw-border-light, rgba(255,255,255,0.1))",
                    background: "var(--pw-surface-alt, rgba(255,255,255,0.04))",
                    color: "var(--pw-text)", resize: "vertical", fontFamily: "inherit",
                    lineHeight: 1.55,
                  }}
                />
                <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => addV2CharacterBlank(newCharPopup.charId)}
                    style={{
                      padding: "8px 16px", fontSize: 13, fontWeight: 600, borderRadius: 8,
                      background: "transparent", border: "1px solid var(--pw-border-light, rgba(255,255,255,0.1))",
                      color: "var(--pw-text-dim)", cursor: "pointer",
                    }}
                  >
                    Skip — I'll fill it in
                  </button>
                  <button
                    type="button"
                    disabled={!newCharPopup.description.trim()}
                    onClick={() => void addV2CharacterWithAi(newCharPopup.charId, newCharPopup.description)}
                    style={{
                      padding: "8px 18px", fontSize: 13, fontWeight: 700, borderRadius: 8,
                      background: newCharPopup.description.trim() ? "var(--pw-accent, #a3e635)" : "rgba(var(--pw-accent-rgb,163,230,53),0.2)",
                      border: "none", color: newCharPopup.description.trim() ? "#000" : "var(--pw-text-dim)",
                      cursor: newCharPopup.description.trim() ? "pointer" : "not-allowed",
                      transition: "all 0.15s",
                    }}
                  >
                    Generate Character
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Profile generation progress overlay ── */}
      {profileGenProgress && (
        <div className="pw-modal-overlay">
          <div className="pw-modal" style={{ maxWidth: 380, textAlign: "center", padding: "28px 24px" }}>
            {/* Pulsing icon */}
            <div style={{
              width: 48, height: 48, borderRadius: 14, margin: "0 auto 14px",
              background: "rgba(var(--pw-accent-rgb, 163,230,53), 0.10)",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "pulse 1.8s ease-in-out infinite",
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--pw-accent, #a3e635)" strokeWidth="2" strokeLinecap="round">
                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
              </svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--pw-text)", letterSpacing: "-0.01em" }}>
              Building profiles
            </div>
            {profileGenProgress.name && (
              <p style={{ marginTop: 4, fontSize: 13, color: "var(--pw-text-dim)", fontWeight: 500 }}>
                <strong style={{ color: "var(--pw-text)" }}>{profileGenProgress.name}</strong> — {profileGenProgress.current} of {profileGenProgress.total}
              </p>
            )}
            {/* Progress bar */}
            <div style={{
              marginTop: 16, height: 5, borderRadius: 3,
              background: "var(--pw-surface-alt, rgba(255,255,255,0.06))",
              overflow: "hidden",
            }}>
              <div style={{
                height: "100%", borderRadius: 3,
                background: "var(--pw-accent, #a3e635)",
                width: `${Math.max(4, Math.round((profileGenProgress.done / profileGenProgress.total) * 100))}%`,
                transition: "width 0.5s cubic-bezier(.4,0,.2,1)",
              }} />
            </div>
            <p style={{ fontSize: 12, color: "var(--pw-text-dim)", marginTop: 10, fontWeight: 600 }}>
              {profileGenProgress.done} of {profileGenProgress.total} done
            </p>
            <p style={{ fontSize: 11, color: "var(--pw-text-dim)", marginTop: 8, fontWeight: 400, opacity: 0.7 }}>
              This may take a few minutes. Sit tight, your characters are being crafted.
            </p>
            <style>{`@keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:.7; transform:scale(0.95); } }`}</style>
          </div>
        </div>
      )}

      {/* ── Arc Intelligence offer popup (shown after plan generation) ── */}
      {showArcOfferPopup && !aiOff && planChapters.length >= 3 && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10001,
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "pw-fade-in 0.2s ease-out",
        }}
          onClick={() => setShowArcOfferPopup(false)}
        >
          <div
            style={{
              background: "var(--pw-bg)",
              border: "1px solid var(--pw-border)",
              borderRadius: 20, width: "92%", maxWidth: 420,
              padding: "32px 28px 28px",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
              textAlign: "center",
              animation: "pw-content-in 0.25s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px",
              background: "rgba(var(--pw-accent-rgb, 163,230,53), 0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--pw-accent, #a3e635)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
              </svg>
            </div>

            <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800 }}>Arc Intelligence</h3>
            <p style={{ fontSize: 13, color: "var(--pw-text-dim)", margin: "0 0 20px", lineHeight: 1.5 }}>
              Your plan is ready. Arc Intelligence will generate 3 distinct narrative arc paths — each scored for best outcome. Pick one and it rewrites your chapter synopses to match.
            </p>

            <div style={{
              display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 22,
            }}>
              {["3 Arc Paths", "Scored & Ranked", "One-Click Apply"].map((pill) => (
                <span key={pill} style={{
                  fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 8,
                  background: "rgba(var(--pw-accent-rgb, 163,230,53), 0.06)", color: "var(--pw-text-muted)", border: "1px solid rgba(var(--pw-accent-rgb, 163,230,53), 0.1)",
                }}>
                  {pill}
                </span>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => setShowArcOfferPopup(false)}
                style={{
                  padding: "10px 20px", fontSize: 13, fontWeight: 600, borderRadius: 10,
                  background: "var(--pw-overlay-bg-hover)", color: "var(--pw-text)", border: "1px solid var(--pw-border)",
                  cursor: "pointer",
                }}
              >
                Skip
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowArcOfferPopup(false);
                  void runArcAnalysis();
                }}
                style={{
                  padding: "10px 24px", fontSize: 13, fontWeight: 700, borderRadius: 10,
                  background: "var(--pw-accent, #a3e635)", color: "#111", border: "none",
                  cursor: "pointer", boxShadow: "0 4px 16px rgba(var(--pw-accent-rgb, 163,230,53), 0.2)",
                }}
              >
                Generate Arc Paths
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Profile generation offer popup (shown after plan/arc generation) ── */}
      {profileOfferPopup && !aiOff && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10001,
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "pw-fade-in 0.2s ease-out",
        }}
          onClick={() => setProfileOfferPopup(null)}
        >
          <div
            style={{
              background: "var(--pw-bg)",
              border: "1px solid var(--pw-border)",
              borderRadius: 20, width: "92%", maxWidth: 440,
              padding: "32px 28px 28px",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
              textAlign: "center",
              animation: "pw-content-in 0.25s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px",
              background: "rgba(var(--pw-accent-rgb, 163,230,53), 0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--pw-accent, #a3e635)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/>
                <line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
            </div>

            <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 800 }}>Generate Character Profiles?</h3>
            <p style={{ fontSize: 13, color: "var(--pw-text-dim)", margin: "0 0 14px", lineHeight: 1.5 }}>
              {profileOfferPopup.source} found <strong>{profileOfferPopup.characterIds.length}</strong> character{profileOfferPopup.characterIds.length !== 1 ? "s" : ""} without profiles. Generate full profiles (appearance, personality, backstory, speaking style) so everything links together?
            </p>

            <div style={{
              display: "flex", flexDirection: "column", gap: 4, margin: "0 0 18px", maxHeight: 160, overflowY: "auto",
              padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid var(--pw-border)",
            }}>
              {profileOfferPopup.characterIds.map((cid) => {
                const ch = storyCharacters.find((c) => c.id === cid);
                return ch ? (
                  <div key={cid} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, padding: "4px 0" }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                      background: "rgba(var(--pw-accent-rgb, 163,230,53), 0.1)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 700, color: "var(--pw-accent, #a3e635)",
                    }}>
                      {(ch.name || "?")[0]}
                    </div>
                    <span style={{ fontWeight: 600 }}>{ch.name || "Unnamed"}</span>
                    {ch.role && <span style={{ fontSize: 10, opacity: 0.5 }}>{ch.role}</span>}
                  </div>
                ) : null;
              })}
            </div>

            <p style={{ fontSize: 11, color: "var(--pw-text-dim)", opacity: 0.7, margin: "0 0 16px" }}>
              This may take a few minutes depending on the number of characters.
            </p>

            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => setProfileOfferPopup(null)}
                style={{
                  padding: "10px 20px", fontSize: 13, fontWeight: 600, borderRadius: 10,
                  background: "var(--pw-overlay-bg-hover)", color: "var(--pw-text)", border: "1px solid var(--pw-border)",
                  cursor: "pointer",
                }}
              >
                Skip
              </button>
              <button
                type="button"
                onClick={() => {
                  const ids = [...profileOfferPopup.characterIds];
                  setProfileOfferPopup(null);
                  void runAutoGenerateAllProfiles(ids);
                  // After plan gen, also show arc offer when profiles finish
                  // (handled naturally since profiles run in background)
                }}
                style={{
                  padding: "10px 24px", fontSize: 13, fontWeight: 700, borderRadius: 10,
                  background: "var(--pw-accent, #a3e635)", color: "#111", border: "none",
                  cursor: "pointer", boxShadow: "0 4px 16px rgba(var(--pw-accent-rgb, 163,230,53), 0.2)",
                }}
              >
                Generate All Profiles
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Arc regeneration warning modal ── */}
      {arcRegenWarning && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 10001,
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "pw-fade-in 0.2s ease-out",
        }}
          onClick={() => setArcRegenWarning(false)}
        >
          <div
            style={{
              background: "var(--pw-bg)",
              border: "1px solid var(--pw-border)",
              borderRadius: 20, width: "92%", maxWidth: 400,
              padding: "32px 28px 28px",
              boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
              textAlign: "center",
              animation: "pw-content-in 0.25s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 14, margin: "0 auto 14px",
              background: "rgba(245,158,11,0.1)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v2m0 4h.01M10.29 3.86l-8.6 14.86A2 2 0 003.43 21h17.14a2 2 0 001.74-2.98l-8.6-14.86a2 2 0 00-3.42 0z"/>
              </svg>
            </div>

            <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 800 }}>Regenerate Arc Paths?</h3>
            <p style={{ fontSize: 13, color: "var(--pw-text-dim)", margin: "0 0 22px", lineHeight: 1.5 }}>
              You already have an applied arc. Regenerating will create 3 new arc options and clear your current selection. Your existing chapter synopses will remain until you apply a new choice.
            </p>

            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => setArcRegenWarning(false)}
                style={{
                  padding: "10px 20px", fontSize: 13, fontWeight: 600, borderRadius: 10,
                  background: "var(--pw-overlay-bg-hover)", color: "var(--pw-text)", border: "1px solid var(--pw-border)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setArcRegenWarning(false);
                  void runArcAnalysis();
                }}
                style={{
                  padding: "10px 24px", fontSize: 13, fontWeight: 700, borderRadius: 10,
                  background: "#f59e0b", color: "#111", border: "none",
                  cursor: "pointer",
                }}
              >
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}

      {showPlanGenerateModal && (
        <div className="pw-modal-overlay" onClick={() => { cancelAiWork(); setShowPlanGenerateModal(false); saveNow(); }}>
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
                onClick={() => { cancelAiWork(); setShowPlanGenerateModal(false); saveNow(); }}
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
        onClose={() => { setProfileOpen(false); saveNow(); }}
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
          clearNovelStorage();
          window.location.href = "/";
        }}
        onSettingsChange={() => void saveSettingsToServer(gatherSettings())}
        onStartTutorial={() => startTutorial()}
        initialTab={profileInitialTab}
      />

      {/* ── Smart Rewrite floating toolbar ── */}
      {rewriteSelection && !rewriteBusy && !rewritePreview && !aiOff && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 99996 }}
            onClick={() => setRewriteSelection(null)}
          />
          <div style={{
            position: "fixed",
            left: rewriteSelection.x,
            top: rewriteSelection.y,
            zIndex: 99997,
            background: "var(--pw-surface)",
            border: "1px solid var(--pw-border)",
            borderRadius: 10,
            boxShadow: "var(--pw-shadow-elevated)",
            padding: "4px",
            display: "flex",
            gap: 2,
            alignItems: "center",
            fontFamily: "var(--font-sans), system-ui, sans-serif",
          }}>
            {REWRITE_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                title={`${mode.label} — ${mode.desc}`}
                onClick={() => void runSmartRewrite(mode.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "6px 10px", background: "none", border: "none",
                  borderRadius: 7, cursor: "pointer",
                  color: "var(--pw-text-dim, #bbb)", fontSize: 11, fontWeight: 600,
                  transition: "all 0.1s", whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(var(--pw-accent-rgb, 163,230,53), 0.08)";
                  e.currentTarget.style.color = "var(--pw-accent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "none";
                  e.currentTarget.style.color = "var(--pw-text-dim, #bbb)";
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={mode.icon}/></svg>
                {mode.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── Smart Rewrite busy indicator ── */}
      {rewriteBusy && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 99999,
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 20px", borderRadius: 12,
          background: "var(--pw-surface)",
          border: "1px solid rgba(var(--pw-accent-rgb, 163,230,53), 0.15)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}>
          <span style={{
            width: 14, height: 14, border: "2px solid rgba(var(--pw-accent-rgb, 163,230,53), 0.3)",
            borderTopColor: "var(--pw-accent)", borderRadius: "50%",
            animation: "spin 0.7s linear infinite", display: "inline-block",
          }} />
          <span style={{ fontSize: 12, color: "var(--pw-text, #e4e4e7)" }}>
            Rewriting{rewriteMode ? ` (${REWRITE_MODES.find((m) => m.id === rewriteMode)?.label || rewriteMode})` : ""}...
          </span>
        </div>
      )}

      {/* ── Smart Rewrite preview modal ── */}
      {rewritePreview && (
        <div className="pw-modal-overlay" onClick={() => setRewritePreview(null)}>
          <div className="pw-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640, maxHeight: "85vh", overflow: "auto" }}>
            <div style={{ padding: "20px 24px 0" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>Smart Rewrite Preview</h3>
              <p style={{ fontSize: 12, opacity: 0.5, margin: "0 0 16px" }}>
                Review the rewrite below. Accept to replace, reject to keep original, or regenerate for a new version.
              </p>
            </div>

            <div style={{ padding: "0 24px" }}>
              {/* Original */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--pw-text-dim, #888)", marginBottom: 6 }}>
                  Original
                </div>
                <div style={{
                  padding: "12px 14px", borderRadius: 8, fontSize: 13, lineHeight: 1.7,
                  background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)",
                  color: "var(--pw-text, #e4e4e7)", opacity: 0.7,
                  textDecoration: "line-through", textDecorationColor: "rgba(239,68,68,0.3)",
                }}>
                  {rewritePreview.original}
                </div>
              </div>

              {/* Revised */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--pw-accent)", marginBottom: 6 }}>
                  Rewritten
                </div>
                <div style={{
                  padding: "12px 14px", borderRadius: 8, fontSize: 13, lineHeight: 1.7,
                  background: "rgba(var(--pw-accent-rgb, 163,230,53), 0.04)",
                  border: "1px solid rgba(var(--pw-accent-rgb, 163,230,53), 0.15)",
                  color: "var(--pw-text, #e4e4e7)",
                }}>
                  {rewritePreview.revised}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{
              display: "flex", gap: 8, justifyContent: "flex-end",
              padding: "16px 24px", borderTop: "1px solid var(--pw-border-light, #2a2a2a)",
            }}>
              <button
                type="button" className="btn"
                onClick={rejectRewrite}
                style={{ fontSize: 12, padding: "8px 16px" }}
              >
                Reject
              </button>
              <button
                type="button" className="btn"
                onClick={() => void regenerateRewrite()}
                style={{ fontSize: 12, padding: "8px 16px" }}
              >
                Regenerate
              </button>
              <button
                type="button" className="btn btn-primary"
                onClick={acceptRewrite}
                style={{ fontSize: 12, padding: "8px 20px", fontWeight: 700 }}
              >
                Accept Rewrite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Prose right-click context menu ── */}
      {proseCtx && !proseCtxBusy && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 99998 }}
            onClick={() => setProseCtx(null)}
          />
          <div
            style={{
              position: "fixed",
              left: Math.min(proseCtx.x, (typeof window !== "undefined" ? window.innerWidth : 1200) - 240),
              top: Math.min(proseCtx.y, (typeof window !== "undefined" ? window.innerHeight : 800) - 320),
              zIndex: 99999,
              background: "var(--pw-surface)",
              border: "1px solid var(--pw-border)",
              borderRadius: 14,
              boxShadow: "var(--pw-shadow-elevated)",
              padding: 0,
              width: 220,
              fontFamily: "var(--font-sans), system-ui, sans-serif",
              overflow: "hidden",
            }}
          >
            {/* Selected text preview */}
            <div style={{
              padding: "10px 14px", borderBottom: "1px solid var(--pw-border-light)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--pw-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.7 }}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              <span style={{ fontSize: 11, color: "var(--pw-text-dim)", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                &ldquo;{proseCtx.selectedText.length > 30 ? proseCtx.selectedText.slice(0, 30) + "…" : proseCtx.selectedText}&rdquo;
              </span>
            </div>

            {/* Actions */}
            <div style={{ padding: "4px 0" }}>
              {([
                { id: "rewrite" as const, label: "Rewrite", desc: "Recraft with same meaning", iconPath: "M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5zM12 20h9" },
                { id: "expand" as const, label: "Expand", desc: "Add detail and depth", iconPath: "M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" },
                { id: "tighten" as const, label: "Tighten", desc: "Cut filler, sharpen", iconPath: "M4 6h16M4 12h10M4 18h6" },
                { id: "natural" as const, label: "Make natural", desc: "Sound more human", iconPath: "M20.24 12.24a6 6 0 00-8.49-8.49L5 10.5V19h8.5zM16 8L2 22M17.5 15H9" },
              ]).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%",
                    padding: "8px 14px", background: "none", border: "none",
                    cursor: "pointer", textAlign: "left", transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--pw-overlay-bg-hover)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                  onClick={() => void runProseContextAction(opt.id)}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                    background: "rgba(163,230,53,0.08)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--pw-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={opt.iconPath}/></svg>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--pw-text)" }}>{opt.label}</div>
                    <div style={{ fontSize: 10, color: "var(--pw-text-dim)", marginTop: 1 }}>{opt.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Chat Modal (Co-Author + Character) ── */}
      {charChatOpen && (coAuthorMode || charChatTarget) && (
        <div className="pw-modal-overlay" onClick={() => closeChat()}>
          <div className="pw-chat-modal" style={{
            maxWidth: charChatReviewDone && !coAuthorMode ? 820 : 520,
            flexDirection: charChatReviewDone && !coAuthorMode ? "row" : "column",
          }} onClick={(e) => e.stopPropagation()}>
            {/* Chat panel */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, overflow: "hidden" }}>
              {/* Header */}
              <div style={{
                padding: "14px 16px", borderBottom: "1px solid var(--pw-border-light)",
                display: "flex", alignItems: "center", gap: 10,
              }}>
                {/* Avatar / icon */}
                <div style={{
                  width: 36, height: 36, borderRadius: coAuthorMode ? 10 : 10, flexShrink: 0,
                  background: coAuthorMode ? "rgba(var(--pw-accent-rgb,163,230,53),0.15)" : "rgba(163,230,53,0.12)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 15, fontWeight: 800, color: "var(--pw-accent)",
                }}>
                  {coAuthorMode ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  ) : charChatTarget!.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em" }}>
                    {coAuthorMode ? "The Co-Author" : charChatTarget!.name}
                  </h3>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--pw-text-dim)" }}>
                    {coAuthorMode ? (activeChapter ? `Chapter ${novel!.chapters.findIndex(c => c.id === activeChapter.id) + 1}` : "Novel overview") : `${charChatTarget!.role}${charChatTarget!.logline ? ` — ${charChatTarget!.logline}` : ""}`}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  {charChatReviewing && (
                    <span style={{
                      padding: "6px 12px", fontSize: 11, fontWeight: 700, borderRadius: 8,
                      background: "rgba(163,230,53,0.05)", color: "var(--pw-accent)",
                      border: "1px solid rgba(163,230,53,0.2)",
                      display: "flex", alignItems: "center", gap: 5,
                    }}>
                      <span style={{ width: 10, height: 10, border: "1.5px solid rgba(163,230,53,0.3)", borderTopColor: "#a3e635", borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} /> Reviewing...
                    </span>
                  )}
                  <button type="button" onClick={() => closeChat()} style={{
                    background: "var(--pw-overlay-bg-hover)", border: "none", borderRadius: 8,
                    width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--pw-text-dim)", fontSize: 16, cursor: "pointer",
                  }}>&times;</button>
                </div>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: "16px 20px" }}>
                {charChatMessages.length === 0 && coAuthorMode && (
                  <div style={{ textAlign: "center", padding: "40px 16px" }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--pw-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 14px", display: "block", opacity: 0.4 }}><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>The Co-Author</p>
                    <p style={{ fontSize: 12, color: "var(--pw-text-dim)", lineHeight: 1.5, maxWidth: 340, margin: "0 auto 16px" }}>
                      Your AI writing partner. Ask about plot, characters, structure — or brainstorm ideas together.
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                      {[
                        `What's the strongest theme so far?`,
                        `How could I raise the stakes here?`,
                        `Suggest a plot twist for this chapter.`,
                        `Where does the pacing feel off?`,
                      ].map((q) => (
                        <button key={q} type="button" onClick={() => setCharChatInput(q)}
                          style={{
                            padding: "6px 12px", fontSize: 11, fontWeight: 600, borderRadius: 8,
                            background: "rgba(163,230,53,0.06)", border: "1px solid rgba(163,230,53,0.12)",
                            color: "var(--pw-accent)", cursor: "pointer", transition: "all 0.15s",
                          }}
                        >{q}</button>
                      ))}
                    </div>
                  </div>
                )}
                {charChatMessages.length === 0 && !coAuthorMode && charChatTarget && (
                  <div style={{ textAlign: "center", padding: "40px 16px" }}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--pw-text-dim)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 14px", display: "block", opacity: 0.3 }}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                    <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Talk to {charChatTarget.name}</p>
                    <p style={{ fontSize: 12, color: "var(--pw-text-dim)", lineHeight: 1.5, maxWidth: 340, margin: "0 auto 16px" }}>
                      Interview your character. What they reveal can shape future chapters and update their profile.
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                      {[
                        `What's your earliest memory?`,
                        `What are you most afraid of?`,
                        `Tell me about someone you care about.`,
                        `What do you want more than anything?`,
                      ].map((q) => (
                        <button key={q} type="button" onClick={() => setCharChatInput(q)}
                          style={{
                            padding: "6px 12px", fontSize: 11, fontWeight: 600, borderRadius: 8,
                            background: "rgba(163,230,53,0.06)", border: "1px solid rgba(163,230,53,0.12)",
                            color: "var(--pw-accent)", cursor: "pointer", transition: "all 0.15s",
                          }}
                        >{q}</button>
                      ))}
                    </div>
                  </div>
                )}
                {charChatMessages.map((msg, idx) => (
                  <div key={idx} style={{
                    display: "flex", gap: 8, marginBottom: 12,
                    flexDirection: msg.role === "user" ? "row-reverse" : "row",
                  }}>
                    {msg.role === "character" && (
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                        background: coAuthorMode ? "rgba(var(--pw-accent-rgb,163,230,53),0.15)" : "rgba(163,230,53,0.1)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, fontWeight: 800, color: "var(--pw-accent)",
                      }}>
                        {coAuthorMode ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                        ) : charChatTarget!.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={{
                      maxWidth: "75%", padding: "10px 14px", borderRadius: 14,
                      background: msg.role === "user" ? "var(--pw-accent-light)" : "var(--pw-overlay-bg)",
                      border: msg.role === "user" ? "1px solid var(--pw-accent-glow)" : "1px solid var(--pw-overlay-border-light)",
                    }}>
                      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{msg.text}</p>
                    </div>
                  </div>
                ))}
                {charChatLoading && (
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: "rgba(163,230,53,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "var(--pw-accent)" }}>
                      {coAuthorMode ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                      ) : charChatTarget ? charChatTarget.name.charAt(0).toUpperCase() : "?"}
                    </div>
                    <div style={{ padding: "12px 16px", borderRadius: 14, background: "var(--pw-overlay-bg)", border: "1px solid var(--pw-overlay-border-light)", display: "flex", gap: 4, alignItems: "center" }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--pw-text-dim)", animation: "pw-pulse 1.2s infinite", animationDelay: "0s" }} />
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--pw-text-dim)", animation: "pw-pulse 1.2s infinite", animationDelay: "0.2s" }} />
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--pw-text-dim)", animation: "pw-pulse 1.2s infinite", animationDelay: "0.4s" }} />
                    </div>
                  </div>
                )}
                <div ref={charChatEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={(e) => { e.preventDefault(); coAuthorMode ? void sendCoAuthorChat() : void sendCharacterChat(); }} style={{
                padding: "12px 16px", borderTop: "1px solid var(--pw-border-light)",
                display: "flex", gap: 8,
              }}>
                <input
                  type="text"
                  placeholder={charChatReviewDone ? "Chat ended — review recommendations" : coAuthorMode ? "Ask your co-author anything…" : `Say something to ${charChatTarget!.name}...`}
                  value={charChatInput}
                  onChange={(e) => setCharChatInput(e.target.value)}
                  disabled={charChatLoading || charChatReviewDone || !!storyAiBusyAction || arcBusy}
                  autoFocus
                  style={{
                    flex: 1, padding: "10px 14px", borderRadius: 10,
                    background: "var(--pw-overlay-bg)", border: "1px solid var(--pw-border)",
                    color: "inherit", fontSize: 13, outline: "none",
                  }}
                />
                {(!!storyAiBusyAction || arcBusy) && (
                  <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 600, whiteSpace: "nowrap", alignSelf: "center" }}>AI busy…</span>
                )}
                <button type="submit" disabled={!charChatInput.trim() || charChatLoading || charChatReviewDone || !!storyAiBusyAction || arcBusy}
                  style={{
                    width: 38, height: 38, borderRadius: 10, border: "none", flexShrink: 0,
                    background: charChatInput.trim() ? "var(--pw-accent)" : "var(--pw-overlay-bg-hover)",
                    color: charChatInput.trim() ? "var(--pw-btn-primary-text)" : "var(--pw-text-dim)",
                    cursor: charChatInput.trim() ? "pointer" : "default",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </form>
            </div>

            {/* Recommendations panel — appears after End & Review */}
            {charChatReviewDone && (
              <div style={{
                width: 300, borderLeft: "1px solid var(--pw-border-light)",
                display: "flex", flexDirection: "column", flexShrink: 0,
              }}>
                <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid var(--pw-border-light)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--pw-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700 }}>Story Insights</h4>
                  </div>
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--pw-text-dim)" }}>
                    {charChatRecommendations.length === 0
                      ? "No changes recommended — the conversation didn't reveal anything new."
                      : `${charChatRecommendations.length} recommendation${charChatRecommendations.length !== 1 ? "s" : ""} based on your chat with ${charChatTarget?.name ?? "the character"}.`}
                  </p>
                </div>
                <div style={{ flex: 1, overflow: "auto", padding: "10px 12px" }}>
                  {charChatRecommendations.length === 0 && (
                    <div style={{ textAlign: "center", padding: "30px 12px", opacity: 0.35 }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 8px", display: "block" }}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      <p style={{ fontSize: 12, fontWeight: 600 }}>All good</p>
                      <p style={{ fontSize: 11 }}>Try a deeper conversation next time.</p>
                    </div>
                  )}
                  {charChatRecommendations.map((rec) => (
                    <div key={rec.id} style={{
                      marginBottom: 8, borderRadius: 10, padding: "10px 12px",
                      background: rec.accepted === true ? "var(--pw-accent-muted)" : "var(--pw-overlay-bg)",
                      border: `1px solid ${rec.accepted === true ? "var(--pw-accent-glow)" : "var(--pw-border)"}`,
                      opacity: rec.accepted === false ? 0.4 : 1, transition: "all 0.2s",
                    }}>
                      {/* Type badge */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, textTransform: "uppercase", padding: "2px 6px", borderRadius: 4,
                          background: "rgba(var(--pw-accent-rgb, 163,230,53), 0.08)",
                          color: "var(--pw-text-muted)",
                          letterSpacing: "0.04em",
                        }}>{rec.type === "chapter_synopsis" ? "Chapter" : rec.type === "prose_edit" ? "Prose" : "Profile"}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{rec.label}</span>
                        {rec.accepted === true && <span style={{ fontSize: 9, color: "var(--pw-accent)", fontWeight: 700 }}>Applied</span>}
                        {rec.accepted === false && <span style={{ fontSize: 9, color: "var(--pw-text-dim)", fontWeight: 600 }}>Dismissed</span>}
                      </div>
                      {/* Reason */}
                      <p style={{ fontSize: 11, color: "var(--pw-text-dim)", margin: "0 0 6px", lineHeight: 1.4, fontStyle: "italic" }}>{rec.detail}</p>
                      {/* Current vs new */}
                      {rec.type === "prose_edit" && rec.currentValue ? (
                        <div style={{ marginBottom: 6 }}>
                          <div style={{ fontSize: 10, color: "#ef4444", marginBottom: 3, padding: "4px 8px", borderRadius: 6, background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.1)", lineHeight: 1.4, textDecoration: "line-through" }}>
                            {rec.currentValue.slice(0, 200)}{rec.currentValue.length > 200 ? "…" : ""}
                          </div>
                          <div style={{ fontSize: 11, padding: "6px 8px", borderRadius: 6, background: "rgba(163,230,53,0.04)", border: "1px solid rgba(163,230,53,0.15)", lineHeight: 1.4, color: "var(--pw-text)" }}>
                            {rec.newValue.slice(0, 200)}{rec.newValue.length > 200 ? "…" : ""}
                          </div>
                        </div>
                      ) : (
                        <>
                          {rec.currentValue && (
                            <div style={{ fontSize: 10, color: "var(--pw-text-dim)", marginBottom: 4, opacity: 0.6 }}>
                              <strong>Current:</strong> {rec.currentValue.slice(0, 80)}{rec.currentValue.length > 80 ? "…" : ""}
                            </div>
                          )}
                          <div style={{ fontSize: 11, padding: "6px 8px", borderRadius: 6, background: "var(--pw-overlay-bg)", border: "1px solid var(--pw-border-light)", lineHeight: 1.4, marginBottom: 6 }}>
                            {rec.newValue.slice(0, 200)}{rec.newValue.length > 200 ? "…" : ""}
                          </div>
                        </>
                      )}
                      {/* Actions */}
                      {rec.accepted === null && (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button type="button" onClick={() => applyCharChatRecommendation(rec.id)}
                            style={{
                              flex: 1, padding: "5px 0", fontSize: 11, fontWeight: 700, borderRadius: 6,
                              background: "rgba(163,230,53,0.1)", border: "1px solid rgba(163,230,53,0.2)",
                              color: "var(--pw-accent)", cursor: "pointer",
                            }}
                          >Accept</button>
                          <button type="button" onClick={() => dismissCharChatRecommendation(rec.id)}
                            style={{
                              flex: 1, padding: "5px 0", fontSize: 11, fontWeight: 600, borderRadius: 6,
                              background: "var(--pw-overlay-bg)", border: "1px solid var(--pw-border)",
                              color: "var(--pw-text-dim)", cursor: "pointer",
                            }}
                          >Dismiss</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {/* Apply all / done */}
                {charChatRecommendations.some((r) => r.accepted === null) && (
                  <div style={{ padding: "10px 12px", borderTop: "1px solid var(--pw-border-light)" }}>
                    <button type="button" onClick={() => charChatRecommendations.filter((r) => r.accepted === null).forEach((r) => applyCharChatRecommendation(r.id))}
                      style={{
                        width: "100%", padding: "8px 0", fontSize: 12, fontWeight: 700, borderRadius: 8,
                        background: "var(--pw-accent)", border: "none", color: "var(--pw-btn-primary-text)", cursor: "pointer",
                      }}
                    >Accept All ({charChatRecommendations.filter((r) => r.accepted === null).length})</button>
                  </div>
                )}
                {charChatRecommendations.length > 0 && !charChatRecommendations.some((r) => r.accepted === null) && (
                  <div style={{ padding: "10px 12px", borderTop: "1px solid var(--pw-border-light)", textAlign: "center" }}>
                    <p style={{ fontSize: 11, color: "var(--pw-text-dim)", margin: 0 }}>
                      {charChatRecommendations.filter((r) => r.accepted === true).length} applied, {charChatRecommendations.filter((r) => r.accepted === false).length} dismissed
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}


      {/* ── Writing Packs modal (top-level so accessible from chapter/bloc/canon) ── */}
      {writingPacksOpen && novel && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
          onClick={() => { setWritingPacksOpen(false); setExpandedPack(null); }}
        >
          <div
            style={{
              background: "var(--pw-bg)",
              border: "1px solid var(--pw-border)",
              borderRadius: 20, width: "94%", maxWidth: 560, maxHeight: "80vh",
              display: "flex", flexDirection: "column",
              boxShadow: "0 32px 80px rgba(0,0,0,0.5)",
              animation: "pw-modal-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid var(--pw-border-light)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--pw-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Writing Packs</h3>
                </div>
                <button type="button" onClick={() => { setWritingPacksOpen(false); setExpandedPack(null); }} style={{
                  background: "var(--pw-overlay-bg-hover)", border: "none", borderRadius: 8,
                  width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--pw-text-dim)", fontSize: 16, cursor: "pointer",
                }}>&times;</button>
              </div>
              <p style={{ fontSize: 12, color: "var(--pw-text-dim)", margin: "8px 0 0" }}>
                Pre-made craft kits — install bolt-ons built by genre experts with one click.
              </p>
            </div>

            {/* Pack list */}
            <div style={{ overflow: "auto", flex: 1, padding: "12px 16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {WRITING_PACKS.map((pack) => {
                  const installed = getPackInstalledCount(pack);
                  const allInstalled = installed === pack.boltons.length;
                  const isExpanded = expandedPack === pack.id;
                  const justInstalled = packInstallFlash === pack.id;
                  const slotsLeft = 10 - (novel.storyBible.boltons ?? []).length;
                  return (
                    <div key={pack.id} style={{
                      borderRadius: 14,
                      background: "var(--pw-overlay-bg)",
                      border: `1px solid ${justInstalled ? "rgba(163,230,53,0.3)" : "var(--pw-overlay-bg-hover)"}`,
                      transition: "all 0.2s",
                      overflow: "hidden",
                    }}>
                      {/* Pack header */}
                      <div
                        style={{
                          display: "flex", alignItems: "center", gap: 14,
                          padding: "14px 16px", cursor: "pointer",
                          transition: "background 0.15s",
                        }}
                        onClick={() => setExpandedPack(isExpanded ? null : pack.id)}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--pw-overlay-bg)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <div style={{
                          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                          background: "rgba(var(--pw-accent-rgb, 163,230,53), 0.08)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--pw-accent, #a3e635)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={pack.icon}/></svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: 14 }}>{pack.name}</span>
                            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 6, background: "rgba(var(--pw-accent-rgb, 163,230,53), 0.08)", color: "var(--pw-text-muted)" }}>{pack.genre}</span>
                            {allInstalled && (
                              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 6, background: "rgba(163,230,53,0.12)", color: "var(--pw-accent)" }}>Installed</span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--pw-text-dim)", marginTop: 3, lineHeight: 1.4 }}>{pack.tagline}</div>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--pw-text-dim)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          style={{ flexShrink: 0, transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
                        ><path d="M6 9l6 6 6-6"/></svg>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (() => {
                        const packBoltonKeys = pack.boltons.map((_, i) => `${pack.id}-${i}`);
                        const packSelected = packBoltonKeys.filter((k) => packSelectedBoltons.has(k));
                        const hasSelection = packSelected.length > 0;
                        return (
                        <div style={{ borderTop: "1px solid var(--pw-border-light)", padding: "12px 16px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                            <p style={{ fontSize: 11, color: "var(--pw-text-dim)", margin: 0, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              {pack.boltons.length} bolt-ons — select which to install
                            </p>
                            <button type="button" onClick={() => {
                              const uninstalled = pack.boltons.map((pb, i) => {
                                const key = `${pb.title.trim().toLowerCase()}|${pb.description.trim().toLowerCase()}`;
                                const already = (novel.storyBible.boltons ?? []).some((b) => `${b.title.trim().toLowerCase()}|${(b.description || "").trim().toLowerCase()}` === key);
                                return already ? null : `${pack.id}-${i}`;
                              }).filter(Boolean) as string[];
                              const allChecked = uninstalled.every((k) => packSelectedBoltons.has(k));
                              const next = new Set(packSelectedBoltons);
                              if (allChecked) uninstalled.forEach((k) => next.delete(k));
                              else uninstalled.forEach((k) => next.add(k));
                              setPackSelectedBoltons(next);
                            }} style={{ fontSize: 10, background: "none", border: "none", color: "var(--pw-accent)", cursor: "pointer", fontWeight: 600, padding: "2px 4px" }}>
                              {packBoltonKeys.every((k) => packSelectedBoltons.has(k)) ? "Deselect all" : "Select all"}
                            </button>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {pack.boltons.map((pb, i) => {
                              const bKey = `${pack.id}-${i}`;
                              const alreadyHas = (novel.storyBible.boltons ?? []).some((b) => {
                                const key = `${pb.title.trim().toLowerCase()}|${pb.description.trim().toLowerCase()}`;
                                return `${b.title.trim().toLowerCase()}|${(b.description || "").trim().toLowerCase()}` === key;
                              });
                              const isChecked = packSelectedBoltons.has(bKey);
                              return (
                                <div key={i}
                                  onClick={() => { if (alreadyHas) return; const next = new Set(packSelectedBoltons); if (isChecked) next.delete(bKey); else next.add(bKey); setPackSelectedBoltons(next); }}
                                  style={{
                                    display: "flex", alignItems: "center", gap: 10,
                                    padding: "8px 10px", borderRadius: 8, cursor: alreadyHas ? "default" : "pointer",
                                    background: isChecked ? "rgba(var(--pw-accent-rgb, 163,230,53), 0.05)" : alreadyHas ? "rgba(163,230,53,0.03)" : "var(--pw-overlay-bg)",
                                    border: isChecked ? "1px solid rgba(var(--pw-accent-rgb, 163,230,53), 0.15)" : alreadyHas ? "1px solid rgba(163,230,53,0.1)" : "1px solid var(--pw-border-light)",
                                    transition: "all 0.12s",
                                  }}>
                                  <div style={{
                                    width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                                    border: alreadyHas ? "1.5px solid var(--pw-accent)" : isChecked ? "1.5px solid var(--pw-accent)" : "1.5px solid var(--pw-border)",
                                    background: alreadyHas ? "rgba(163,230,53,0.15)" : isChecked ? "rgba(var(--pw-accent-rgb, 163,230,53), 0.15)" : "transparent",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                  }}>
                                    {(alreadyHas || isChecked) && (
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--pw-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                                    )}
                                  </div>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, opacity: alreadyHas ? 0.5 : 1 }}>
                                      {pb.title}
                                      {alreadyHas && <span style={{ fontSize: 9, color: "var(--pw-accent)", marginLeft: 6 }}>installed</span>}
                                    </div>
                                    <div style={{ fontSize: 10, color: "var(--pw-text-dim)", marginTop: 1, lineHeight: 1.4 }}>{pb.description}</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                            <span style={{ fontSize: 11, color: "var(--pw-text-dim)" }}>
                              {allInstalled ? "All installed" : hasSelection ? `${packSelected.length} selected` : `${pack.boltons.length - installed} available`}
                            </span>
                            <div style={{ display: "flex", gap: 6 }}>
                              {hasSelection && (
                                <button type="button" disabled={slotsLeft <= 0} onClick={() => installWritingPack(pack, packSelectedBoltons)}
                                  style={{ padding: "7px 14px", fontSize: 12, fontWeight: 700, borderRadius: 8, border: "none", cursor: slotsLeft <= 0 ? "default" : "pointer", background: "var(--pw-accent, #a3e635)", color: "#111", transition: "all 0.15s" }}>
                                  Install Selected ({packSelected.length})
                                </button>
                              )}
                              <button type="button" disabled={allInstalled || slotsLeft <= 0} onClick={() => installWritingPack(pack)}
                                style={{
                                  padding: "7px 14px", fontSize: 12, fontWeight: 700, borderRadius: 8, border: "none",
                                  cursor: allInstalled || slotsLeft <= 0 ? "default" : "pointer",
                                  background: allInstalled ? "rgba(163,230,53,0.1)" : hasSelection ? "var(--pw-overlay-bg-hover)" : "var(--pw-accent, #a3e635)",
                                  color: allInstalled ? "var(--pw-accent)" : hasSelection ? "var(--pw-text-dim)" : "#111",
                                  opacity: allInstalled || slotsLeft <= 0 ? 0.5 : 1, transition: "all 0.15s",
                                }}>
                                {justInstalled ? "Installed!" : allInstalled ? "Installed" : slotsLeft <= 0 ? "Slots Full" : "Install All"}
                              </button>
                            </div>
                          </div>
                        </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating Chat FAB (bottom-left) ── */}
      {!charChatOpen && (
        <div className="pw-chat-fab-wrap" data-tutorial="chat">
          {/* Picker popup (opens upward from FAB) */}
          {charChatPickerOpen && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 99996 }} onClick={() => setCharChatPickerOpen(false)} />
              <div className="pw-chat-fab-picker">
                {/* Co-Author option always first */}
                <button type="button"
                  onClick={() => { setCharChatPickerOpen(false); openCoAuthorChat(); }}
                  className="pw-chat-fab-picker-item pw-chat-fab-picker-coauthor"
                >
                  <div className="pw-chat-fab-picker-avatar pw-coauthor-avatar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>The Co-Author</div>
                    <div style={{ fontSize: 10, color: "var(--pw-text-dim)", whiteSpace: "nowrap" }}>AI writing partner</div>
                  </div>
                </button>
                {/* Separator + Characters (fiction only) */}
                {!isNF && storyCharacters.length > 0 && (
                  <div style={{ height: 1, background: "var(--pw-border-light)", margin: "4px 8px" }} />
                )}
                {!isNF && storyCharacters.length > 0 && (
                  <div style={{ fontSize: 9, fontWeight: 700, color: "var(--pw-text-dim)", padding: "4px 10px 2px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Characters</div>
                )}
                {!isNF && storyCharacters.map((char) => (
                  <button key={char.id} type="button"
                    onClick={() => { setCharChatPickerOpen(false); openCharacterChat(char); }}
                    className="pw-chat-fab-picker-item"
                  >
                    <div className="pw-chat-fab-picker-avatar">{char.name.charAt(0).toUpperCase()}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{char.name}</div>
                      {char.role && <div style={{ fontSize: 10, color: "var(--pw-text-dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{char.role}</div>}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
          {/* The round FAB button */}
          <button
            type="button"
            className="pw-chat-fab"
            title="Chat"
            onClick={() => { if (isNF) { openCoAuthorChat(); } else { setCharChatPickerOpen(!charChatPickerOpen); } }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          </button>
        </div>
      )}

      {/* Busy indicator while prose context action runs */}
      {proseCtxBusy && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 99999,
          display: "flex", alignItems: "center", gap: 10,
          padding: "12px 20px", borderRadius: 12,
          background: "var(--pw-surface)", border: "1px solid var(--pw-accent-glow)",
          boxShadow: "var(--pw-shadow-elevated)",
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: "var(--pw-accent-light)",
            display: "flex", alignItems: "center", justifyContent: "center",
            animation: "pw-pulse 1.5s ease-in-out infinite",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--pw-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--pw-text)" }}>Rewriting&hellip;</div>
            <div style={{ fontSize: 10, color: "var(--pw-text-dim)", marginTop: 1 }}>AI is editing your selection</div>
          </div>
        </div>
      )}

      {/* ── Regeneration confirmation modal — rendered last so it stacks above all other modals ── */}
      {regenConfirm && (
        <div className="pw-modal-overlay" style={{ zIndex: 200 }} onClick={() => setRegenConfirm(null)}>
          <div className="pw-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 400, textAlign: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, margin: "0 auto 14px", background: "rgba(245,158,11,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Are you sure?</div>
            <p style={{ fontSize: 13, color: "var(--pw-text-dim)", lineHeight: 1.5, margin: "0 0 20px" }}>{regenConfirm.message}</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button type="button" className="btn pw-cancel-btn" onClick={() => setRegenConfirm(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={regenConfirm.onConfirm}>Continue</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Synopsis options popup ── */}
      {synopsisOptions.length > 0 && (
        <div className="pw-modal-overlay" style={{ zIndex: 190 }} onClick={() => setSynopsisOptions([])}>
          <div className="pw-modal pw-synopsis-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pw-synopsis-modal-header">
              <h3>Choose a version</h3>
              <button
                type="button"
                className="pw-synopsis-modal-close"
                onClick={() => setSynopsisOptions([])}
                title="Close"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <p className="pw-synopsis-modal-sub">Select the version you'd like to use for your synopsis.</p>
            <div className="pw-synopsis-modal-options">
              {synopsisOptions.map((opt, i) => (
                <div key={i} className="pw-synopsis-modal-card">
                  <div className="pw-synopsis-modal-label">{opt.label}</div>
                  <p className="pw-synopsis-modal-text">{opt.text}</p>
                  <button
                    type="button"
                    className="pw-synopsis-modal-use-btn"
                    onClick={() => {
                      updateStoryBible({
                        summary: { ...novel!.storyBible.summary, synopsisShort: opt.text },
                      });
                      setSynopsisOptions([]);
                    }}
                  >
                    Use this version
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


      {/* ── Admin alert toast ── */}
      {adminAlert && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 99990,
          maxWidth: 340, width: "auto",
          background: "var(--pw-surface, #18181b)",
          border: "1px solid var(--pw-border-light, rgba(255,255,255,0.08))",
          borderRadius: 12,
          boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
          overflow: "hidden",
          animation: "pw-alert-in 0.35s cubic-bezier(0.2,0,0.2,1)",
        }}>
          <style>{`
            @keyframes pw-alert-in {
              from { opacity: 0; transform: translateY(12px) scale(0.97); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>
          <div style={{ padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--pw-accent, #a3e635)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "var(--pw-text, #e4e4e7)", lineHeight: 1.5, flex: 1 }}>
              {adminAlert.message}
            </p>
            <button
              type="button"
              onClick={() => { adminAlertDismissed.current.add(adminAlert.id); setAdminAlert(null); }}
              style={{
                flexShrink: 0, background: "none", border: "none", cursor: "pointer",
                color: "var(--pw-text-dim, rgba(255,255,255,0.35))", padding: 2, lineHeight: 1,
              }}
              title="Dismiss"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div style={{
            height: 2, background: "var(--pw-accent, #a3e635)", opacity: 0.6,
            width: `${adminAlertProgress}%`,
            transition: "width 0.1s linear",
            borderRadius: "0 0 0 12px",
          }} />
        </div>
      )}

      {/* ── Tutorial overlay ── */}
      {tutorialActive && (() => {
        const step = TUTORIAL_STEPS[tutorialStep];
        if (!step) return null;
        const isFirst = tutorialStep === 0;
        const isLast = tutorialStep === TUTORIAL_STEPS.length - 1;
        const pad = 10;
        const cardW = 340;
        const cardH = 420;
        const gap = 16;
        const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
        const vh = typeof window !== "undefined" ? window.innerHeight : 800;

        const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(val, max));

        let cardTop = vh / 2 - cardH / 2;
        let cardLeft = vw / 2 - cardW / 2;
        let centered = true;

        if (tutorialRect) {
          centered = false;
          const r = tutorialRect;
          const spaceRight = vw - r.left - r.width;
          const spaceLeft = r.left;
          const spaceBelow = vh - r.top - r.height;
          const spaceAbove = r.top;

          if (spaceRight > cardW + gap * 2) {
            cardLeft = r.left + r.width + gap;
            cardTop = r.top + r.height / 2 - cardH / 2;
          } else if (spaceLeft > cardW + gap * 2) {
            cardLeft = r.left - cardW - gap;
            cardTop = r.top + r.height / 2 - cardH / 2;
          } else if (spaceBelow > cardH + gap) {
            cardTop = r.top + r.height + gap;
            cardLeft = r.left + r.width / 2 - cardW / 2;
          } else if (spaceAbove > cardH + gap) {
            cardTop = r.top - cardH - gap;
            cardLeft = r.left + r.width / 2 - cardW / 2;
          } else {
            cardTop = vh / 2 - cardH / 2;
            cardLeft = vw / 2 - cardW / 2;
          }

          cardLeft = clamp(cardLeft, gap, vw - cardW - gap);
          cardTop = clamp(cardTop, gap, vh - cardH - gap);
        }

        const cardStyle: React.CSSProperties = centered
          ? { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
          : { top: cardTop, left: cardLeft };

        return (
          <div className="pw-tutorial-overlay" onClick={completeTutorial}>
            <div className="pw-tutorial-spotlight" style={{
              top: tutorialRect ? tutorialRect.top - pad : window.innerHeight / 2,
              left: tutorialRect ? tutorialRect.left - pad : window.innerWidth / 2,
              width: tutorialRect ? tutorialRect.width + pad * 2 : 0,
              height: tutorialRect ? tutorialRect.height + pad * 2 : 0,
              opacity: tutorialRect ? 1 : 0,
            }} />
            <div className={`pw-tutorial-card${tutorialStep === 0 ? " pw-tutorial-entering" : ""}`} style={cardStyle} onClick={(e) => e.stopPropagation()}>
              <div className="pw-tutorial-content" key={tutorialStep}>
                <div className="pw-tutorial-step-num">{tutorialStep + 1} of {TUTORIAL_STEPS.length}</div>
                <h4 className="pw-tutorial-title">{step.title}</h4>
                <p className="pw-tutorial-desc">{step.desc}</p>
              </div>
              <div className="pw-tutorial-dots">
                {TUTORIAL_STEPS.map((_, i) => (
                  <span key={i} className={`pw-tutorial-dot${i === tutorialStep ? " active" : i < tutorialStep ? " done" : ""}`} />
                ))}
              </div>
              <div className="pw-tutorial-actions">
                <button type="button" className="pw-tutorial-skip" onClick={completeTutorial}>Skip tutorial</button>
                <div style={{ display: "flex", gap: 8 }}>
                  {!isFirst && (
                    <button type="button" className="pw-tutorial-back" onClick={() => setTutorialStep((s) => s - 1)}>Back</button>
                  )}
                  <button type="button" className="pw-tutorial-next" onClick={() => isLast ? completeTutorial() : setTutorialStep((s) => s + 1)}>
                    {isLast ? "Finish" : "Next \u2192"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Novel counter — bottom-right */}
      <div style={{
        position: "fixed", bottom: 16, right: 16, zIndex: 30,
        padding: "5px 12px", borderRadius: 10,
        background: "var(--pw-surface, #1a1a1a)",
        border: "1px solid var(--pw-border-light, #2a2a2a)",
        fontSize: 10, fontWeight: 600, color: "var(--pw-text-dim)",
        display: "flex", alignItems: "center", gap: 5,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        backdropFilter: "blur(8px)",
        opacity: 0.6,
        transition: "opacity 0.15s",
      }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.6"; }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
        {novels.length}/25
      </div>
    </div>
  );
}

export default dynamic(() => Promise.resolve(NovelWorkspacePage), {
  ssr: false,
});
