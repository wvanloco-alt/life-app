"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type BridgedLogAction = "delete" | "unlink";

interface LinkedLogActionDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (action: BridgedLogAction) => void;
  /**
   * Whether this dialog is asking about an un-check transition or an
   * activity deletion. The two options are the same in either case
   * (`unlink` or `delete` the linked log); only the surrounding copy
   * adapts. `uncheck` is the only caller in Phase 3; `delete` is ready
   * for a future surface.
   */
  mode?: "uncheck" | "delete";
  activityTitle?: string;
}

export function LinkedLogActionDialog({
  open,
  onClose,
  onConfirm,
  mode = "uncheck",
  activityTitle,
}: LinkedLogActionDialogProps) {
  const isDelete = mode === "delete";
  const title = isDelete ? "Delete this activity?" : "Un-check this activity?";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {activityTitle ? (
              <>
                <span className="font-medium text-foreground">
                  {activityTitle}
                </span>
                {" is linked to a tracker entry. "}
              </>
            ) : (
              "This activity is linked to a tracker entry. "
            )}
            {isDelete
              ? "Choose how to handle the tracker entry before removing the activity."
              : "Choose how to handle the tracker entry."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => onConfirm("unlink")}
            className="rounded-md border bg-background px-4 py-3 text-left transition-colors hover:bg-accent focus:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="text-sm font-medium">Keep tracker entry</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Detach it from this activity, but keep the log in the tracker.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onConfirm("delete")}
            className="rounded-md border bg-background px-4 py-3 text-left transition-colors hover:bg-accent focus:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="text-sm font-medium text-destructive">
              Remove from tracker
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Also delete the linked log entry from the tracker.
            </p>
          </button>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
