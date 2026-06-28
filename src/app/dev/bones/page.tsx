import { ReportCardBones } from "@/components/ui/loading-bones";

/**
 * /dev/bones — skeleton showcase. Every per-surface wrapper renders here in its
 * loading state so `pnpm bones:build` can capture pixel-accurate bones. Dev
 * surface only; not linked from the app.
 */
export default function BonesShowcase() {
  return (
    <main id="main" className="mx-auto max-w-[560px] px-4 py-8">
      <h1 className="text-h1">Boneyard — showcase</h1>
      <p className="mt-2 text-body text-ink-soft">
        Cada esqueleto se captura aquí con <code>pnpm bones:build</code>.
      </p>

      <section className="mt-6 space-y-3" aria-label="report-card">
        <h2 className="text-h3">report-card</h2>
        <ReportCardBones loading>
          <div>contenido real</div>
        </ReportCardBones>
      </section>
    </main>
  );
}
