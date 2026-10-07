/**
 * Local-only auth bypass for Docker / localhost dev.
 * Requires DISABLE_AUTH=true and NEXTAUTH_URL pointing at localhost.
 */
export function isAuthDisabled(): boolean {
  if (process.env.DISABLE_AUTH !== "true") return false;

  const url = (process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "").toLowerCase();
  return url.includes("localhost") || url.includes("127.0.0.1");
}
