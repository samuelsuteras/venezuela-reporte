"use client";
import { useEffect, useState } from "react";
import { getSupabase } from "./supabase";
import { logError } from "./log";
import { applyCedulaPolicy } from "./feed";
import type { Extracted } from "./extract/types";

/** A publicly-visible note (status='visible'), from the report_notes_public view. */
export interface PublicNote {
  id: string;
  body: string;
  extracted: Extracted | null;
  createdAt: string;
}

interface NoteRow { id: string; body: string; extracted: Extracted | null; created_at: string }

/**
 * Custom event fired on the window after `addNote` successfully inserts a note.
 * `useNotes` listens for this to refetch from `report_notes_public` immediately,
 * because anon has no SELECT RLS policy on the base `report_notes` table and
 * therefore receives zero Realtime change events — without this, the list
 * never updates until reload.
 *
 * Mirrors the SYNCED_EVENT pattern in `./sync`.
 */
export const NOTE_ADDED_EVENT = "reporteve:note-added";

function toNote(r: NoteRow): PublicNote {
  return {
    id: r.id,
    body: r.body,
    // Apply the same cédula display policy as reports (DISPLAY-ONLY — the full
    // cédula is present in report_notes_public by design; see applyCedulaPolicy).
    extracted: r.extracted ? applyCedulaPolicy(r.extracted) : null,
    createdAt: r.created_at,
  };
}

/**
 * Post an anonymous note on a report, then fire-and-forget server extraction.
 * Generates a client_uuid for idempotency + as the extract-ping target. Throws
 * on insert failure (caller shows an error); extraction failure is silent.
 *
 * After a successful insert, dispatches `NOTE_ADDED_EVENT` on `window` so
 * `useNotes` can refetch immediately (anon gets no Realtime events from the
 * base table due to RLS — the custom event bridges that gap).
 *
 * @param reportId - The report to attach the note to.
 * @param body - The note text (1–1000 chars).
 */
export async function addNote(reportId: string, body: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("offline");
  const clientUuid = crypto.randomUUID();
  const { error } = await supabase
    .from("report_notes")
    .insert({ client_uuid: clientUuid, report_id: reportId, body });
  if (error) throw error;

  // Notify same-tab useNotes hooks to refetch from the public view.
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(NOTE_ADDED_EVENT, { detail: { reportId } }),
    );
  }

  void fetch("/api/extract", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind: "note", clientUuid }),
  }).catch(() => { /* best-effort */ });
}

/**
 * Live list of visible notes for a report: initial fetch from
 * `report_notes_public` (oldest first) + a Realtime refetch on any change to
 * this report's notes. Also refetches on `NOTE_ADDED_EVENT` (same-tab insert)
 * because anon has no SELECT RLS on the base table and receives no Realtime
 * events. Cleans up the channel, the event listener, and guards setState on
 * unmount.
 *
 * @param reportId - The report whose notes to watch.
 * @returns The notes, `undefined` while the first fetch is in flight, or `[]`
 *   when Supabase isn't configured (or the report genuinely has none).
 */
export function useNotes(reportId: string): PublicNote[] | undefined {
  const [notes, setNotes] = useState<PublicNote[] | undefined>(undefined);
  useEffect(() => {
    let active = true;
    const supabase = getSupabase();
    if (!supabase) {
      // Defer so setState is not called synchronously in the effect body
      // (avoids react-hooks/set-state-in-effect cascade-render lint error);
      // guard with `active` so an unmount in the microtask window is a no-op.
      void Promise.resolve().then(() => { if (active) setNotes([]); });
      return () => { active = false; };
    }
    const load = () =>
      supabase
        .from("report_notes_public")
        .select("id,body,extracted,created_at")
        .eq("report_id", reportId)
        .order("created_at", { ascending: true })
        .then(({ data, error }) => {
          if (error) { logError("notes", "load failed", error.message); return; }
          if (active) setNotes(((data ?? []) as unknown as NoteRow[]).map(toNote));
        });
    void load();

    // Listen for same-tab note inserts (anon has no Realtime on base table).
    const onNoteAdded = (e: Event) => {
      const detail = (e as CustomEvent<{ reportId: string }>).detail;
      if (detail.reportId === reportId) void load();
    };
    window.addEventListener(NOTE_ADDED_EVENT, onNoteAdded);

    // Keep Realtime for authenticated moderators / future policy changes.
    const channel = supabase
      .channel(`notes-${reportId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "report_notes", filter: `report_id=eq.${reportId}` }, () => void load())
      .subscribe();
    return () => {
      active = false;
      window.removeEventListener(NOTE_ADDED_EVENT, onNoteAdded);
      void supabase.removeChannel(channel);
    };
  }, [reportId]);
  return notes;
}
