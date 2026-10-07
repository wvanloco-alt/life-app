"use client";

import { ActivityMark } from "@/components/calendar/activity-mark";
import { Switch } from "@/components/ui/switch";
import { usePalette } from "@/hooks/use-palette";
import { ACTIVITY_TYPE_ICONS } from "@/lib/icons";
import { PALETTE_VARS, type PaletteColor } from "@/lib/palette";
import type { CalendarActivity } from "@/types";
import { cn } from "@/lib/utils";

const PALETTE_OPTIONS = Object.keys(PALETTE_VARS) as PaletteColor[];

interface CalendarConfigureProps {
  activities: CalendarActivity[];
  onChange: (
    activityId: number,
    patch: { calendarVisible?: boolean; calendarColor?: string; icon?: string }
  ) => Promise<void>;
  onClose: () => void;
}

export function CalendarConfigure({ activities, onChange, onClose }: CalendarConfigureProps) {
  const palette = usePalette();
  const ordered = [...activities].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="rounded-[0.625rem] border border-border/60 bg-card p-6 space-y-4 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Configure activities
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Choose what appears, and pick a color and an icon for each.
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

      <ul className="space-y-4 max-h-[24rem] overflow-y-auto pr-1">
        {ordered.map((activity) => (
          <li key={activity.id} className="space-y-2 border-b border-border/30 pb-4 last:border-0">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2 text-sm font-medium">
                <ActivityMark activity={activity} size="sm" />
                {activity.name}
              </span>
              <Switch
                checked={activity.visible}
                onCheckedChange={(checked) =>
                  void onChange(activity.id, { calendarVisible: checked })
                }
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ACTIVITY_TYPE_ICONS.map((icon) => (
                <button
                  key={icon.name}
                  type="button"
                  title={icon.label}
                  onClick={() => void onChange(activity.id, { icon: icon.name })}
                  className={cn(
                    "rounded-md border p-0.5",
                    activity.icon === icon.name ? "border-foreground" : "border-transparent"
                  )}
                >
                  <ActivityMark
                    activity={{ ...activity, icon: icon.name }}
                    size="sm"
                  />
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {PALETTE_OPTIONS.map((colorName) => (
                <button
                  key={colorName}
                  type="button"
                  title={colorName}
                  onClick={() => void onChange(activity.id, { calendarColor: colorName })}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform hover:scale-105",
                    activity.color === colorName
                      ? "border-foreground"
                      : "border-transparent"
                  )}
                  style={{ backgroundColor: palette.color(colorName) }}
                />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
