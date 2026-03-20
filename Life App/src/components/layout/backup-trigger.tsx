"use client";

import { useEffect } from "react";

export function BackupTrigger() {
  useEffect(() => {
    fetch("/api/health").catch(() => {
      // Silently fail -- backup is best-effort
    });
  }, []);

  return null;
}
