"use client";

import { NoteForm } from "@/components/molecules/note-form";
import { NoteItem } from "@/components/molecules/note-item";
import { useNotes } from "@/lib/notes";
import { useT } from "@/lib/i18n/client";

/**
 * Notes section for a public report: live list of visible notes + the
 * anonymous composer. Client component (live query + form state). The list
 * uses aria-live so screen readers hear newly-posted notes.
 *
 * @param reportId - UUID of the report whose notes to display and accept.
 */
export function ReportNotes({ reportId }: { reportId: string }) {
  const t = useT();
  const notes = useNotes(reportId);
  return (
    <section className="mt-6" aria-label={t("notes.heading")}>
      <h2 className="text-h2">{t("notes.heading")}</h2>
      <ul aria-live="polite" className="mt-2 flex flex-col gap-2">
        {notes && notes.length === 0 && (
          <li className="text-body text-ink-muted">{t("notes.empty")}</li>
        )}
        {notes?.map((n) => <NoteItem key={n.id} note={n} />)}
      </ul>
      <NoteForm reportId={reportId} />
    </section>
  );
}
