/**
 * SkipLink — visually hidden until focused, then lets keyboard users jump
 * straight to <main id="main">. Mounted once in the root layout
 * (DESIGN.md § Accessibility · Landmarks). Server component; no client JS.
 */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only rounded-sm bg-ink px-4 py-2 text-label text-on-night focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50"
    >
      Saltar al contenido
    </a>
  );
}
