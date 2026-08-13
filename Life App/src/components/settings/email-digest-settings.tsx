"use client";

import { useCallback, useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import type { EmailPreferences } from "@/types";
import { Check, Loader2 } from "lucide-react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface LibraryTopic {
  slug: string;
  title: string;
  icon: string;
}

export function EmailDigestSettings() {
  const [prefs, setPrefs] = useState<EmailPreferences>({
    email: null,
    cadence: "daily",
    enabled: false,
    excludedLibraryTopics: [],
  });
  const [emailInput, setEmailInput] = useState("");
  const [cadence, setCadence] = useState<"daily" | "weekly">("daily");
  const [topics, setTopics] = useState<LibraryTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [prefsRes, topicsRes] = await Promise.all([
        fetch("/api/email-preferences"),
        fetch("/api/library/topics"),
      ]);
      if (!prefsRes.ok) throw new Error("Failed to load email preferences");
      const data = (await prefsRes.json()) as EmailPreferences;
      setPrefs(data);
      setEmailInput(data.email ?? "");
      setCadence(data.cadence);
      if (topicsRes.ok) {
        const topicData = (await topicsRes.json()) as LibraryTopic[];
        setTopics(topicData);
      }
    } catch {
      setError("Could not load email digest settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const savedEmailValid = Boolean(prefs.email && EMAIL_RE.test(prefs.email));
  const inputValid = emailInput.trim() === "" || EMAIL_RE.test(emailInput.trim());
  const canToggle = savedEmailValid && !toggling;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setValidationError("");
    setError("");
    const trimmed = emailInput.trim();
    if (trimmed && !EMAIL_RE.test(trimmed)) {
      setValidationError("Enter a valid email address.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/email-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, cadence }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Save failed"); return; }
      setPrefs(data as EmailPreferences);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      setError("Something went wrong saving preferences.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(checked: boolean) {
    if (!canToggle) return;
    setToggling(true);
    setError("");
    try {
      const res = await fetch("/api/email-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: checked }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Update failed"); return; }
      setPrefs(data as EmailPreferences);
    } catch {
      setError("Something went wrong updating the toggle.");
    } finally {
      setToggling(false);
    }
  }

  async function handleTopicToggle(slug: string, included: boolean) {
    const next = included
      ? [...prefs.excludedLibraryTopics, slug]
      : prefs.excludedLibraryTopics.filter((s) => s !== slug);

    // Optimistic update
    setPrefs((p) => ({ ...p, excludedLibraryTopics: next }));

    await fetch("/api/email-preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ excludedLibraryTopics: next }),
    });
  }

  if (loading) {
    return (
      <p className="text-sm text-muted-foreground flex items-center gap-2 py-4">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">Email digest</h2>
        <p className="text-sm text-muted-foreground mt-1">A warm morning briefing — sleep, training, habits.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Email address
          </label>
          <input
            type="email"
            value={emailInput}
            onChange={(e) => { setEmailInput(e.target.value); setValidationError(""); }}
            placeholder="your@email.com"
            className="w-full rounded-[0.625rem] border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cadence</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="cadence" value="daily" checked={cadence === "daily"} onChange={() => setCadence("daily")} />
              Daily
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="cadence" value="weekly" checked={cadence === "weekly"} onChange={() => setCadence("weekly")} />
              Weekly (Mon)
            </label>
          </div>
        </fieldset>

        {validationError && <p className="text-xs text-destructive">{validationError}</p>}

        <button
          type="submit"
          disabled={saving || !inputValid}
          className="flex items-center gap-2 rounded-[0.625rem] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {saved ? <><Check className="h-4 w-4" /> Saved</> : saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save"}
        </button>
      </form>

      <div className="flex items-center justify-between gap-4 pt-4 border-t border-border/40">
        <div>
          <p className="text-sm font-medium">Enable digest</p>
          {!savedEmailValid && (
            <p className="text-xs text-muted-foreground mt-0.5">Enter an email address above first</p>
          )}
        </div>
        <Switch checked={prefs.enabled} disabled={!canToggle} onCheckedChange={handleToggle} />
      </div>

      {topics.length > 0 && (
        <div className="pt-4 border-t border-border/40 space-y-1">
          <p className="text-sm font-medium mb-3">Library concepts</p>
          {topics.map((topic) => {
            const included = !prefs.excludedLibraryTopics.includes(topic.slug);
            return (
              <div key={topic.slug} className="flex items-center justify-between gap-4 py-2 border-b border-border/30 last:border-0">
                <p className="text-sm text-muted-foreground">{topic.title}</p>
                <Switch
                  checked={included}
                  onCheckedChange={(checked) => void handleTopicToggle(topic.slug, !checked)}
                />
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
