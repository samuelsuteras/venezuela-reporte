"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/lib/i18n/client";
import type { MessageKey } from "@/lib/i18n/messages";

interface NavItem {
  href: string;
  labelKey: MessageKey;
  icon: string;
  loud?: boolean;
}

const ITEMS: NavItem[] = [
  { href: "/reportar", labelKey: "nav.report", icon: "＋", loud: true },
  { href: "/mapa", labelKey: "nav.map", icon: "🗺" },
  { href: "/reportes", labelKey: "nav.reports", icon: "≣" },
  { href: "/mis-reportes", labelKey: "nav.mine", icon: "👤" },
];

/**
 * Fixed bottom navigation (DESIGN.md § bottom-nav). "Reportar" is the loud, red
 * primary action. Active tab carries `aria-current="page"`.
 */
export function BottomNav() {
  const pathname = usePathname();
  const t = useT();

  return (
    <nav
      aria-label="Reporte VE"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline-soft bg-canvas"
    >
      <ul className="mx-auto flex max-w-[560px] items-stretch">
        {ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 py-1.5 text-caption ${
                  item.loud
                    ? "text-emergency-text"
                    : active
                      ? "text-info-text"
                      : "text-ink-soft"
                }`}
              >
                <span aria-hidden="true" className="text-xl leading-none">
                  {item.icon}
                </span>
                {t(item.labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
