"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Loader2, Watch } from "lucide-react";

interface GarminStatus {
  connected: boolean;
  garminEmail: string | null;
  lastSyncedAt: string | null;
}

interface SyncResult {
  activitiesAdded: number;
  sleepRecordsUpserted: number;
  dailyMetricsUpdated: number;
  sessionsAutoCompleted: number;
  lastSyncedAt: string;
}

export function GarminConnection() {
  const [status, setStatus] = useState<GarminStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [pendingCookies, setPendingCookies] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState("");
  const [syncMessage, setSyncMessage] = useState("");

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/garmin/status");
      if (!res.ok) throw new Error("Failed to load Garmin status");
      const data = (await res.json()) as GarminStatus;
      setStatus(data);
    } catch {
      setError("Could not load Garmin connection status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setConnecting(true);
    try {
      const res = await fetch("/api/garmin/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password: mfaRequired ? password || " " : password,
          mfaCode: mfaRequired ? mfaCode : undefined,
          pendingCookies: mfaRequired ? pendingCookies : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Connection failed");
        return;
      }
      if (data.mfaRequired) {
        setMfaRequired(true);
        setPendingCookies(data.pendingCookies);
        setPassword("");
        return;
      }
      setEmail("");
      setPassword("");
      setMfaCode("");
      setMfaRequired(false);
      setPendingCookies(null);
      await loadStatus();
    } catch {
      setError("Something went wrong connecting to Garmin.");
    } finally {
      setConnecting(false);
    }
  }

  async function handleSync() {
    setError("");
    setSyncMessage("");
    setSyncing(true);
    try {
      const res = await fetch("/api/garmin/sync?days=7", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Sync failed");
        return;
      }
      const result = data as SyncResult;
      setSyncMessage(
        `Synced: ${result.activitiesAdded} activities, ${result.sleepRecordsUpserted} sleep nights, ${result.dailyMetricsUpdated} daily metrics.`
      );
      await loadStatus();
    } catch {
      setError("Something went wrong during sync.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleDisconnect() {
    setError("");
    setDisconnecting(true);
    try {
      const res = await fetch("/api/garmin/status", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Disconnect failed");
        return;
      }
      setMfaRequired(false);
      setPendingCookies(null);
      await loadStatus();
    } catch {
      setError("Something went wrong disconnecting.");
    } finally {
      setDisconnecting(false);
    }
  }

  function formatLastSynced(iso: string | null) {
    if (!iso) return "Never";
    return new Date(iso).toLocaleString();
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-4">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: "#0EA5E915" }}
          >
            <Watch className="h-5 w-5" style={{ color: "#0EA5E9" }} />
          </div>
          <div>
            <h3 className="font-medium">Garmin Connect</h3>
            <p className="text-sm text-muted-foreground">
              Auto-import activities, sleep, and daily calories
            </p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : status?.connected ? (
          <div className="space-y-3">
            <p className="text-sm">
              Connected as <span className="font-medium">{status.garminEmail}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Last sync: {formatLastSynced(status.lastSyncedAt)}
            </p>
            {syncMessage && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Check className="h-4 w-4 text-primary" />
                {syncMessage}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2 rounded-[0.625rem] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {syncing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Syncing…
                  </>
                ) : (
                  "Sync now"
                )}
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="rounded-[0.625rem] border border-input px-4 py-2 text-sm font-medium hover:bg-muted/30 disabled:opacity-50"
              >
                {disconnecting ? "Disconnecting…" : "Disconnect"}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleConnect} className="space-y-3 max-w-sm">
            {!mfaRequired && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Garmin email
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-[0.625rem] border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Garmin password
                  </label>
                  <input
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-[0.625rem] border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </>
            )}
            {mfaRequired && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  MFA code
                </label>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  placeholder="Code from your authenticator app or email"
                  className="w-full rounded-[0.625rem] border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p className="text-xs text-muted-foreground">
                  Your Garmin account requires two-factor authentication.
                </p>
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={connecting}
              className="flex items-center gap-2 rounded-[0.625rem] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {connecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Connecting…
                </>
              ) : mfaRequired ? (
                "Verify & connect"
              ) : (
                "Connect Garmin"
              )}
            </button>
          </form>
        )}

        {status?.connected && error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
