"use client";

import { useDebouncedCallback } from "use-debounce";
import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CharacterCount from "@tiptap/extension-character-count";
import Placeholder from "@tiptap/extension-placeholder";

type GrammarMatch = {
  message: string;
  offset: number;
  length: number;
  shortMessage?: string;
};

interface Props {
  projectId: string;
  chapterId: string;
  initialTitle: string;
  initialContent: string;
  initialWordCount: number;
}

export default function EditorClient({
  projectId,
  chapterId,
  initialTitle,
  initialContent,
  initialWordCount,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [grammarMatches, setGrammarMatches] = useState<GrammarMatch[]>([]);
  const [exporting, setExporting] = useState(false);

  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        CharacterCount,
        Placeholder.configure({
          placeholder: "Start writing your chapter...",
        }),
      ],
      content: initialContent || "<p></p>",
      onUpdate: ({ editor }) => {
        debouncedSave(editor.getHTML(), editor.storage.characterCount.words());
      },
    },
    [chapterId],
  );

  const debouncedSave = useDebouncedCallback(async (html: string, words: number) => {
    setSaving(true);
    setSaveError(false);
    try {
      const res = await fetch(`/api/chapters/${chapterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: html, wordCount: words }),
      });
      if (!res.ok) setSaveError(true);
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }, 800);

  const saveTitle = useDebouncedCallback(async (value: string) => {
    await fetch(`/api/chapters/${chapterId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: value }),
    });
  }, 400);

  const [wordCount, setWordCount] = useState(initialWordCount ?? 0);

  useEffect(() => {
    if (!editor) return;
    const updateCount = () => {
      setWordCount(editor.storage.characterCount?.words?.() ?? 0);
    };
    updateCount();
    editor.on("update", updateCount);
    return () => {
      editor.off("update", updateCount);
    };
  }, [editor]);

  async function runGrammar() {
    if (!editor) return;
    const text = editor.state.doc.textContent;
    const res = await fetch("/api/grammar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    setGrammarMatches(data.matches ?? []);
  }

  async function exportEpub() {
    setExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "project.epub";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  if (!editor) {
    return null;
  }

  return (
    <div className="grid lg:grid-cols-[260px_1fr_280px] gap-4 lg:gap-6">
      {/* Sidebar card */}
      <aside
        className="card h-fit space-y-3"
        style={{
          background: "rgba(255, 255, 255, 0.04)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <p className="text-sm" style={{ color: "rgba(255, 255, 255, 0.4)" }}>Project</p>
        <p className="font-semibold" style={{ color: "rgba(255, 255, 255, 0.85)" }}>Outline</p>
        <p className="text-sm" style={{ color: "rgba(255, 255, 255, 0.35)" }}>
          Word count updates as you type. Autosave runs after a short pause.
        </p>
        <div
          className="text-xs"
          style={{ color: saveError ? "#fca5a5" : "rgba(255, 255, 255, 0.3)" }}
        >
          Status: {saving ? "Saving..." : saveError ? "Save failed — retrying on next edit" : "Saved"}
        </div>
        <button onClick={exportEpub} className="btn btn-ghost w-full justify-center" disabled={exporting}
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            borderColor: "rgba(255, 255, 255, 0.08)",
            color: "rgba(255, 255, 255, 0.6)",
          }}
        >
          {exporting ? "Exporting..." : "Export EPUB"}
        </button>
      </aside>

      {/* Main editor */}
      <section
        className="card"
        style={{
          background: "rgba(255, 255, 255, 0.04)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            saveTitle(e.target.value);
          }}
          className="w-full mb-3 bg-transparent text-2xl font-semibold focus:outline-none"
          style={{ color: "rgba(255, 255, 255, 0.9)" }}
        />
        <div className="prose prose-invert max-w-none">
          <EditorContent editor={editor} />
        </div>
      </section>

      {/* Stats sidebar */}
      <aside
        className="card space-y-3"
        style={{
          background: "rgba(255, 255, 255, 0.04)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs" style={{ color: "rgba(255, 255, 255, 0.4)" }}>Words</p>
            <p className="text-3xl font-semibold" style={{ color: "rgba(255, 255, 255, 0.9)" }}>{wordCount}</p>
          </div>
          <div>
            <p className="text-xs" style={{ color: "rgba(255, 255, 255, 0.4)" }}>Reading time</p>
            <p className="text-lg font-semibold" style={{ color: "rgba(255, 255, 255, 0.9)" }}>
              {Math.max(1, Math.round(wordCount / 250))} min
            </p>
          </div>
        </div>

        <button onClick={runGrammar} className="btn btn-ghost w-full justify-center"
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            borderColor: "rgba(255, 255, 255, 0.08)",
            color: "rgba(255, 255, 255, 0.6)",
          }}
        >
          Check grammar
        </button>

        {grammarMatches.length > 0 ? (
          <div className="space-y-2 text-sm" style={{ color: "rgba(255, 255, 255, 0.5)" }}>
            <p
              className="text-xs uppercase font-medium"
              style={{ letterSpacing: "0.2em", color: "rgba(255, 255, 255, 0.4)" }}
            >
              Suggestions
            </p>
            {grammarMatches.slice(0, 6).map((match, idx) => (
              <div
                key={idx}
                className="rounded-lg p-3"
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                <p className="font-medium" style={{ color: "rgba(255, 255, 255, 0.7)" }}>{match.shortMessage ?? match.message}</p>
                <p className="text-xs" style={{ color: "rgba(255, 255, 255, 0.3)" }}>
                  Offset {match.offset}, length {match.length}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: "rgba(255, 255, 255, 0.35)" }}>
            No suggestions yet. Run grammar to see results.
          </p>
        )}
      </aside>
    </div>
  );
}
