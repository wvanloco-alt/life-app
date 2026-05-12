import type { SessionType } from "@/types";

/** Card surface for scheduled activities (monthly / daily / preview). */
export function getSessionTypeCardClasses(sessionType: SessionType): string {
  return sessionType === "supplemental"
    ? "bg-muted/50 border-border"
    : "bg-card border-border";
}

export function shouldShowSupplementalBadge(sessionType: SessionType): boolean {
  return sessionType === "supplemental";
}
