"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";

interface HabitDeleteDialogProps {
  open: boolean;
  habitName: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export function HabitDeleteDialog({
  open,
  habitName,
  onClose,
  onConfirm,
}: HabitDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setDeleting(true);
    setError(null);
    try {
      await onConfirm();
      setDeleting(false);
    } catch {
      setError("Could not delete the habit. Please try again.");
      setDeleting(false);
    }
  }

  function handleClose() {
    if (deleting) return;
    setError(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-base">Delete this habit?</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-1">
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">{habitName}</span> and all
            its check-ins will be permanently removed. This cannot be undone.
          </p>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={deleting}
              autoFocus
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirm}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
