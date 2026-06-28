"use client";

import { useState } from "react";
import { addNote } from "@/lib/notes";
import { useT } from "@/lib/i18n/client";
import { Button } from "@/components/atoms/button";

const MAX = 1000;

type FormState = "idle" | "posting" | "posted" | "error" | "tooLong";

/**
 * Anonymous note composer for a single report.
 *
 * Client component — owns textarea state, submit flow, and optimistic status
 * feedback. The live `useNotes` hook (called by the parent) refreshes the list
 * when the Supabase Realtime round-trip completes.
 *
 * a11y: `aria-live="polite"` status region, `aria-invalid` + visible red ring
 * on error/tooLong, error clears on keystroke, 44 px+ submit target via the
 * `Button` atom, `<label htmlFor>` association on the textarea.
 *
 * @param reportId - The UUID of the report to attach the note to.
 */
export function NoteForm({ reportId }: { reportId: string }) {
  const t = useT();
  const [body, setBody] = useState("");
  const [state, setState] = useState<FormState>("idle");

  /** True when the form is in an error-display state. */
  const invalid = state === "error" || state === "tooLong";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    // Guard above maxLength before hitting the network.
    if (text.length > MAX) {
      setState("tooLong");
      return;
    }
    setState("posting");
    try {
      await addNote(reportId, text);
      setBody("");
      setState("posted");
    } catch {
      setState("error");
    }
  }

  return (
    <form onSubmit={submit} className="mt-3">
      {/* sr-only keeps the visual layout clean while remaining accessible */}
      <label htmlFor="note-body" className="sr-only">
        {t("notes.placeholder")}
      </label>
      <textarea
        id="note-body"
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          // Clear error state as soon as the user starts editing — per a11y brief.
          if (invalid) setState("idle");
        }}
        placeholder={t("notes.placeholder")}
        rows={3}
        /* Allow a small buffer beyond MAX so the tooLong message can fire
           before the browser silently truncates; real guard is in submit(). */
        maxLength={MAX + 100}
        aria-invalid={invalid}
        aria-describedby="note-status"
        className={`w-full rounded-lg border bg-canvas p-2 text-body-lg ${
          invalid
            ? "border-emergency ring-2 ring-emergency"
            : "border-hairline-soft"
        }`}
      />
      <div className="mt-2 flex items-center justify-between">
        <Button
          type="submit"
          variant="primary"
          disabled={state === "posting" || !body.trim()}
        >
          {state === "posting" ? t("notes.posting") : t("notes.submit")}
        </Button>
        {/* aria-live="polite" announces state changes to screen readers
            without interrupting ongoing announcements. */}
        <p
          id="note-status"
          aria-live="polite"
          className="text-caption text-ink-muted"
        >
          {state === "posted" && t("notes.posted")}
          {state === "error" && t("notes.error")}
          {state === "tooLong" && t("notes.tooLong")}
        </p>
      </div>
    </form>
  );
}
