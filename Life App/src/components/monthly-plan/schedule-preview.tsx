"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { AlertTriangle, CalendarPlus, Sparkles, Clock } from "lucide-react";
import { formatTime, formatDate } from "@/lib/dates";
import { getQuadrantInfo } from "@/lib/quadrants";
import {
  getSessionTypeCardClasses,
  shouldShowSupplementalBadge,
} from "@/lib/session-type-styles";
import { cn } from "@/lib/utils";
import type { ScheduleProposal } from "@/lib/scheduler";

interface SchedulePreviewProps {
  open: boolean;
  onClose: () => void;
  onApply: () => void;
  proposal: ScheduleProposal | null;
  applying: boolean;
  isRegenerate?: boolean;
}

export function SchedulePreview({
  open,
  onClose,
  onApply,
  proposal,
  applying,
  isRegenerate,
}: SchedulePreviewProps) {
  if (!proposal) return null;

  const activitiesByDate = new Map<string, typeof proposal.activities>();
  for (const act of proposal.activities) {
    const existing = activitiesByDate.get(act.activityDate) ?? [];
    existing.push(act);
    activitiesByDate.set(act.activityDate, existing);
  }

  const sortedDates = [...activitiesByDate.keys()].sort();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Generated Schedule
          </DialogTitle>
          <DialogDescription>{proposal.summary}</DialogDescription>
        </DialogHeader>

        {proposal.warnings.length > 0 && (
          <div className="space-y-1">
            {proposal.warnings.map((warning, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-sm"
              >
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}

        {proposal.activities.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No activities to generate. All goals are already scheduled or
            completed.
          </div>
        ) : (
          <div className="space-y-4">
            {sortedDates.map((date) => {
              const dayActivities = activitiesByDate.get(date) ?? [];
              dayActivities.sort((a, b) =>
                a.startTime.localeCompare(b.startTime)
              );

              return (
                <div key={date}>
                  <h4 className="text-sm font-semibold mb-2">
                    {formatDate(date)}
                  </h4>
                  <div className="space-y-2">
                    {dayActivities.map((act, i) => {
                      const quadrant = getQuadrantInfo(act.quadrant);
                      const sessionType = act.sessionType ?? "training";
                      const showSupplementalBadge =
                        shouldShowSupplementalBadge(sessionType);
                      return (
                        <Card key={i} className={cn("border", getSessionTypeCardClasses(sessionType))}>
                          <CardContent className="relative flex items-start gap-3 py-3">
                            {showSupplementalBadge && (
                              <Badge
                                variant="secondary"
                                className="absolute right-3 top-2.5 text-[10px] font-normal"
                              >
                                Supplemental
                              </Badge>
                            )}
                            <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                            <div
                              className={cn(
                                "flex-1 min-w-0",
                                showSupplementalBadge && "pr-24"
                              )}
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">
                                  {act.title}
                                </span>
                                {act.roleName && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs"
                                    style={{
                                      borderColor: act.roleColor,
                                      color: act.roleColor,
                                    }}
                                  >
                                    {act.roleName}
                                  </Badge>
                                )}
                                <Badge
                                  variant="secondary"
                                  className="text-xs"
                                  style={{
                                    backgroundColor: `${quadrant.hexColor}20`,
                                    color: quadrant.hexColor,
                                  }}
                                >
                                  {quadrant.shortLabel}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {formatTime(act.startTime)} –{" "}
                                {formatTime(act.endTime)}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5 italic">
                                {act.reason}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {proposal.activities.length > 0 && (
            <Button onClick={onApply} disabled={applying}>
              <CalendarPlus className="mr-2 h-4 w-4" />
              {applying
                ? "Applying..."
                : isRegenerate
                  ? `Replace with ${proposal.activities.length} Activities`
                  : `Add ${proposal.activities.length} Activities`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
