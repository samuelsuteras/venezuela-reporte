import Link from "next/link";
import type { ReactNode } from "react";
import { LocaleToggle } from "./locale-toggle";

/**
 * App header: wordmark (home link) + a contextual right-side action, plus the
 * always-present language toggle.
 */
export function AppHeader({ right }: { right?: ReactNode }) {
  return (
    <header className="border-b border-hairline-soft">
      <div className="mx-auto flex max-w-[560px] items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-h3 font-bold">
          Reporte VE
        </Link>
        <div className="flex items-center gap-3">
          {right}
          <LocaleToggle />
        </div>
      </div>
    </header>
  );
}
