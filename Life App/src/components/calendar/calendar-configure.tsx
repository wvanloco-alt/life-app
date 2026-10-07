"use client";

import { useMemo, useState } from "react";
import { ActivityMark } from "@/components/calendar/activity-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePalette } from "@/hooks/use-palette";
import {
  CELEBRATION_EMOJI_OPTIONS,
  type CelebrationEmojiToken,
} from "@/lib/celebration-emojis";
import { ACTIVITY_TYPE_ICONS } from "@/lib/icons";
import { PALETTE_VARS, type PaletteColor } from "@/lib/palette";
import type { CalendarActivity } from "@/types";
import { cn } from "@/lib/utils";

const PALETTE_OPTIONS = Object.keys(PALETTE_VARS) as PaletteColor[];

type ChooserKind = "icon" | "color" | "emoji";

interface OpenChooser {
  activityId: number;
  kind: ChooserKind;
}

export interface CalendarConfigurePatch {
  calendarVisible?: boolean;
  calendarColor?: string;
  icon?: string;
  calendarCelebration?: CelebrationEmojiToken | null;
}

interface CalendarConfigureProps {
  activities: CalendarActivity[];
  onChange: (activityId: number, patch: CalendarConfigurePatch) => Promise<void>;
  onCreate: (name: string) => Promise<void>;
  onClose: () => void;
}

function ConfigureRow({
  activity,
  openChooser,
  onOpenChooser,
  onPatch,
  onHideShow,
  visibilityActionLabel,
  palette,
}: {
  activity: CalendarActivity;
  openChooser: OpenChooser | null;
  onOpenChooser: (next: OpenChooser | null) => void;
  onPatch: (patch: CalendarConfigurePatch) => Promise<boolean>;
  onHideShow: () => Promise<boolean>;
  visibilityActionLabel: "Hide" | "Show";
  palette: ReturnType<typeof usePalette>;
}) {
  const emojiChar =
    CELEBRATION_EMOJI_OPTIONS.find((o) => o.token === activity.celebration)?.character ??
    null;
  const chooserOpen = openChooser?.activityId === activity.id ? openChooser.kind : null;

  return (
    <li className="space-y-2 border-b border-border/30 pb-4 last:border-0">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          title="Change icon"
          onClick={() =>
            onOpenChooser(
              chooserOpen === "icon"
                ? null
                : { activityId: activity.id, kind: "icon" }
            )
          }
          className="rounded-md border border-border/40 p-0.5 hover:border-foreground/40"
        >
          <ActivityMark activity={activity} size="sm" />
        </button>
        <span className="text-sm font-medium flex-1 min-w-[6rem]">{activity.name}</span>
        <button
          type="button"
          title="Change color"
          onClick={() =>
            onOpenChooser(
              chooserOpen === "color"
                ? null
                : { activityId: activity.id, kind: "color" }
            )
          }
          className="h-7 w-7 rounded-full border-2 border-border/50 shrink-0"
          style={{ backgroundColor: palette.color(activity.color as PaletteColor) }}
        />
        <button
          type="button"
          title="Change celebration emoji"
          onClick={() =>
            onOpenChooser(
              chooserOpen === "emoji"
                ? null
                : { activityId: activity.id, kind: "emoji" }
            )
          }
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-md border border-border/40 text-lg",
            !emojiChar && "text-muted-foreground/40"
          )}
        >
          {emojiChar ?? "○"}
        </button>
        <button
          type="button"
          onClick={() => void onHideShow()}
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-2 hover:underline shrink-0"
        >
          {visibilityActionLabel}
        </button>
      </div>

      {chooserOpen === "icon" && (
        <div className="flex flex-wrap gap-1.5 pl-1 animate-fade-in">
          {ACTIVITY_TYPE_ICONS.map((icon) => (
            <button
              key={icon.name}
              type="button"
              title={icon.label}
              onClick={() => {
                void onPatch({ icon: icon.name }).then((ok) => {
                  if (ok) onOpenChooser(null);
                });
              }}
              className={cn(
                "rounded-md border p-0.5",
                activity.icon === icon.name ? "border-foreground" : "border-transparent"
              )}
            >
              <ActivityMark activity={{ ...activity, icon: icon.name }} size="sm" />
            </button>
          ))}
        </div>
      )}

      {chooserOpen === "color" && (
        <div className="flex flex-wrap gap-2 pl-1 animate-fade-in">
          {PALETTE_OPTIONS.map((colorName) => (
            <button
              key={colorName}
              type="button"
              title={colorName}
              onClick={() => {
                void onPatch({ calendarColor: colorName }).then((ok) => {
                  if (ok) onOpenChooser(null);
                });
              }}
              className={cn(
                "h-7 w-7 rounded-full border-2 transition-transform hover:scale-105",
                activity.color === colorName ? "border-foreground" : "border-transparent"
              )}
              style={{ backgroundColor: palette.color(colorName) }}
            />
          ))}
        </div>
      )}

      {chooserOpen === "emoji" && (
        <div className="flex flex-wrap gap-2 pl-1 animate-fade-in">
          <button
            type="button"
            title="None"
            onClick={() => {
              void onPatch({ calendarCelebration: null }).then((ok) => {
                if (ok) onOpenChooser(null);
              });
            }}
            className={cn(
              "rounded-md border px-2 py-1 text-xs text-muted-foreground",
              !activity.celebration ? "border-foreground" : "border-border/40"
            )}
          >
            None
          </button>
          {CELEBRATION_EMOJI_OPTIONS.map((opt) => (
            <button
              key={opt.token}
              type="button"
              title={opt.label}
              onClick={() => {
                void onPatch({ calendarCelebration: opt.token }).then((ok) => {
                  if (ok) onOpenChooser(null);
                });
              }}
              className={cn(
                "rounded-md border px-2 py-1 text-lg leading-none",
                activity.celebration === opt.token
                  ? "border-foreground"
                  : "border-border/40"
              )}
            >
              {opt.character}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}

export function CalendarConfigure({
  activities,
  onChange,
  onCreate,
  onClose,
}: CalendarConfigureProps) {
  const palette = usePalette();
  const [openChooser, setOpenChooser] = useState<OpenChooser | null>(null);
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [configureError, setConfigureError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function handlePatch(
    activityId: number,
    patch: CalendarConfigurePatch
  ): Promise<boolean> {
    setConfigureError(null);
    try {
      await onChange(activityId, patch);
      return true;
    } catch {
      setConfigureError("Could not save. Try again.");
      return false;
    }
  }

  const shown = useMemo(
    () =>
      activities
        .filter((a) => a.visible)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [activities]
  );
  const hidden = useMemo(
    () =>
      activities
        .filter((a) => !a.visible)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [activities]
  );

  async function handleCreate() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setCreateError(null);
    setCreating(true);
    try {
      await onCreate(trimmed);
      setNewName("");
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Could not add activity.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="rounded-[0.625rem] border border-border/60 bg-card p-6 space-y-4 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Configure activities
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Hide what you don&apos;t use. Click an icon, a color, or an emoji to change it.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Done
        </button>
      </div>

      {configureError && (
        <p className="text-sm text-destructive">{configureError}</p>
      )}

      <ul className="space-y-4 max-h-[20rem] overflow-y-auto pr-1">
        {shown.map((activity) => (
          <ConfigureRow
            key={activity.id}
            activity={activity}
            openChooser={openChooser}
            onOpenChooser={setOpenChooser}
            onPatch={(patch) => handlePatch(activity.id, patch)}
            onHideShow={() => handlePatch(activity.id, { calendarVisible: false })}
            visibilityActionLabel="Hide"
            palette={palette}
          />
        ))}
      </ul>

      {hidden.length > 0 && (
        <div className="space-y-3 border-t border-border/40 pt-4">
          <h3 className="text-sm font-medium text-muted-foreground">Hidden</h3>
          <ul className="space-y-4">
            {hidden.map((activity) => (
              <ConfigureRow
                key={activity.id}
                activity={activity}
                openChooser={openChooser}
                onOpenChooser={setOpenChooser}
                onPatch={(patch) => handlePatch(activity.id, patch)}
                onHideShow={() => handlePatch(activity.id, { calendarVisible: true })}
                visibilityActionLabel="Show"
                palette={palette}
              />
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-border/40 pt-4 space-y-2">
        <p className="text-sm font-medium">Add an activity</p>
        <div className="flex flex-wrap gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Activity name"
            className="max-w-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreate();
            }}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={creating || !newName.trim()}
            onClick={() => void handleCreate()}
          >
            Save
          </Button>
        </div>
        {createError && <p className="text-sm text-destructive">{createError}</p>}
      </div>
    </div>
  );
}
