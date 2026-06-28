"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/organisms/shared/app-header";
import { AdminLogin } from "@/components/organisms/admin/admin-login";
import { ModerationQueue } from "@/components/organisms/admin/moderation-queue";
import { useSession } from "@/lib/use-session";
import { checkIsModerator, signOut } from "@/lib/moderation";
import { isSupabaseConfigured } from "@/lib/supabase";
import { useT } from "@/lib/i18n/client";

/**
 * Moderation console. Gated by Supabase Auth (magic link) + the moderators
 * allowlist. All writes are additionally RLS-enforced server-side, so this gate
 * is UX, not the security boundary.
 */
export default function AdminPage() {
  const t = useT();
  const { session, loading } = useSession();
  const [isMod, setIsMod] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session) return;
    let active = true;
    void checkIsModerator().then((value) => {
      if (active) setIsMod(value);
    });
    return () => {
      active = false;
    };
  }, [session]);

  return (
    <>
      <AppHeader
        right={
          session ? (
            <button
              type="button"
              onClick={() => void signOut()}
              className="min-h-11 text-label text-info-text"
            >
              {t("admin.signOut")}
            </button>
          ) : undefined
        }
      />
      <main id="main" className="mx-auto max-w-[560px] px-4 pt-6 pb-24">
        <h1 className="text-h1">{t("admin.heading")}</h1>

        {!isSupabaseConfigured ? (
          <p className="mt-4 text-body text-ink-soft">{t("admin.config")}</p>
        ) : loading ? (
          <p className="mt-4 text-body text-ink-soft">{t("common.loading")}</p>
        ) : !session ? (
          <div className="mt-4">
            <AdminLogin />
          </div>
        ) : isMod === null ? (
          <p className="mt-4 text-body text-ink-soft">{t("admin.verifying")}</p>
        ) : !isMod ? (
          <p className="mt-4 text-body text-ink-soft">{t("admin.notMod")}</p>
        ) : (
          <div className="mt-4">
            <ModerationQueue />
          </div>
        )}
      </main>
    </>
  );
}
