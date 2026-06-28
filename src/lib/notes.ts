"use client";
import { useEffect, useState } from "react";
import { getSupabase } from "./supabase";
import { logError } from "./log";
import type { Extracted } from "./extract/types";

/** A publicly-visible note (status='visible'), from the report_notes_public view. */
export interface PublicNote {
  id: string;
  body: string;
  extracted: Extracted | null;
  createdAt: string;
}

interface NoteRow { id: string; body: string; extracted: Extracted | null; created_at: string }

function toNote(r: NoteRow): PublicNote {
  return { id: r.id, body: r.body, extracted: r.extracted, createdAt: r.created_at };
}

/**
 * Post an anonymous note on a report, then fire-and-forget server extraction.
 * Generates a client_uuid for idempotency + as the extract-ping target. Throws
 * on insert failure (caller shows an error); extraction failure is silent.
 */
export async function addNote(reportId: string, body: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("offline");
  const clientUuid = crypto.randomUUID();
  const { error } = await supabase
    .from("report_notes")
    .insert({ client_uuid: clientUuid, report_id: reportId, body });
  if (error) throw error;
  void fetch("/api/extract", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind: "note", clientUuid }),
  }).catch(() => { /* best-effort */ });
}

/** Live list of visible notes for a report (initial fetch + Realtime refetch). */
export function useNotes(reportId: string): PublicNote[] | undefined {
  const [notes, setNotes] = useState<PublicNote[] | undefined>(undefined);
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) { setNotes([]); return; }
    let active = true;
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
    const channel = supabase
      .channel(`notes-${reportId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "report_notes", filter: `report_id=eq.${reportId}` }, () => void load())
      .subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [reportId]);
  return notes;
}
