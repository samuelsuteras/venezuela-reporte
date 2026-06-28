import { ExtractedChips } from "@/components/molecules/extracted-chips";
import type { PublicNote } from "@/lib/notes";

/**
 * Single anonymous note card with extracted-data chips below the body text.
 * Server component — no hooks, no client boundary needed. Renders as a `<li>`
 * so callers wrap it in a `<ul>` / `<ol>`.
 *
 * @param note - The hydrated {@link PublicNote} to display.
 */
export function NoteItem({ note }: { note: PublicNote }) {
  return (
    <li className="rounded-lg border border-hairline-soft bg-surface p-3">
      {/* whitespace-pre-wrap preserves newlines the user typed */}
      <p className="text-body whitespace-pre-wrap">{note.body}</p>
      <ExtractedChips extracted={note.extracted} />
    </li>
  );
}
