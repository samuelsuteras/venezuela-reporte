"use client";

import { useState } from "react";
import { Button } from "@/components/atoms/button";
import { TextField } from "@/components/molecules/text-field";
import { signInWithEmail } from "@/lib/moderation";
import { useT } from "@/lib/i18n/client";

/** Magic-link sign-in for moderators. The link returns to /admin. */
export function AdminLogin() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      await signInWithEmail(email.trim());
      setSent(true);
    } catch {
      setError(t("admin.signInError"));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return <p className="text-body-lg">{t("admin.linkSent")}</p>;
  }

  return (
    <form onSubmit={submit} className="max-w-sm space-y-4">
      <TextField
        id="email"
        label={t("admin.emailLabel")}
        type="email"
        value={email}
        onChange={setEmail}
        required
        autoComplete="email"
      />
      {error && (
        <p className="text-caption text-danger" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy} aria-busy={busy} className="w-full">
        {busy ? t("admin.sending") : t("admin.sendLink")}
      </Button>
    </form>
  );
}
