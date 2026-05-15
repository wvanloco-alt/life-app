/**
 * Goal-validation helpers shared by the goals API surface (POST + PATCH).
 *
 * Centralised so the same clamp rules apply on create and update, and so
 * unit tests can exercise the math without standing up route handlers.
 */

/**
 * Clamp a raw `sessionsPerWeek` value (typically from a JSON request body)
 * into the closed range [1, 7].
 *
 * The client-side goal form already enforces these bounds via
 * `<Input min={1} max={7} />`. This server-side clamp is the belt to that
 * belt-and-braces: a direct API caller bypassing the form must not be able
 * to persist out-of-range values now that role-level scheduling caps have
 * been removed (see role-scheduling-rules-removal, FR-016).
 *
 * Behaviour:
 *   - Finite numbers and numeric strings: rounded, then clamped to [1, 7].
 *   - Non-finite input (NaN, Infinity, undefined, null, non-numeric strings,
 *     etc.): returns `null` so the caller can decide the fallback. POST uses
 *     the goal default of 3; PATCH treats `null` as "no change".
 */
export function clampSessionsPerWeek(input: unknown): number | null {
  // Only number and string are sensible input types from a JSON body.
  // Rejecting other shapes (null, boolean, object, array) avoids surprising
  // coercions where, e.g., `null` becomes 0 → 1 or `true` becomes 1.
  if (typeof input !== "number" && typeof input !== "string") return null;
  const n = typeof input === "number" ? input : Number(input);
  if (!Number.isFinite(n)) return null;
  return Math.min(7, Math.max(1, Math.round(n)));
}

/** Fallback used by POST /api/goals when sessionsPerWeek is missing or non-finite. */
export const DEFAULT_SESSIONS_PER_WEEK = 3;
