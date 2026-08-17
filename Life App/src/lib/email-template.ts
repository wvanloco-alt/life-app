import { formatSleepDuration, formatWeekSessionsSummary } from "@/lib/digest-assembler";
import type { DigestContent } from "@/types";
import { format, parseISO } from "date-fns";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Design tokens ────────────────────────────────────────────
const C = {
  bg: "#faf8f5",
  card: "#ffffff",
  border: "#ede9e2",
  text: "#2d2519",
  muted: "#8a7d6b",
  accent: "#c2813a",
  accentLight: "#fdf3e7",
  sectionLabel: "#b8a99a",
} as const;

const FONT = `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif`;
const FONT_SERIF = `font-family:Georgia,'Times New Roman',serif`;

// ─── Layout helpers ───────────────────────────────────────────

function wrapper(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${C.bg};${FONT}">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.bg}">
  <tr><td align="center" style="padding:32px 16px">
    <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%">
      ${content}
    </table>
  </td></tr>
</table>
</body>
</html>`.trim();
}

function sectionLabel(text: string): string {
  return `
<tr><td style="padding:24px 0 8px">
  <p style="margin:0;font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${C.sectionLabel};${FONT}">${escapeHtml(text)}</p>
</td></tr>`;
}

function divider(): string {
  return `<tr><td style="padding:0"><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="height:1px;background:${C.border}"></td></tr></table></td></tr>`;
}

function statRow(emoji: string, label: string, value: string, sub?: string): string {
  return `
<tr>
  <td style="padding:10px 0;border-bottom:1px solid ${C.border}">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td width="32" style="vertical-align:middle">
          <span style="font-size:18px">${emoji}</span>
        </td>
        <td style="vertical-align:middle">
          <span style="font-size:13px;font-weight:500;color:${C.muted};${FONT}">${escapeHtml(label)}</span>
        </td>
        <td align="right" style="vertical-align:middle">
          <span style="font-size:14px;font-weight:600;color:${C.text};${FONT}">${escapeHtml(value)}</span>
          ${sub ? `<span style="font-size:12px;color:${C.muted};margin-left:6px;${FONT}">${escapeHtml(sub)}</span>` : ""}
        </td>
      </tr>
    </table>
  </td>
</tr>`;
}

function pillRow(items: { label: string; value: string }[]): string {
  const pills = items
    .map(
      (item) =>
        `<td style="padding:0 6px 0 0">
          <span style="display:inline-block;background:${C.accentLight};border-radius:6px;padding:6px 12px">
            <span style="font-size:12px;color:${C.muted};${FONT}">${escapeHtml(item.label)}&nbsp;</span>
            <span style="font-size:13px;font-weight:600;color:${C.accent};${FONT}">${escapeHtml(item.value)}</span>
          </span>
        </td>`
    )
    .join("");
  return `<tr><td style="padding:12px 0"><table cellpadding="0" cellspacing="0" border="0"><tr>${pills}</tr></table></td></tr>`;
}

// ─── Section builders ─────────────────────────────────────────

function buildYesterdaySection(content: DigestContent): string {
  let rows = "";

  if (content.sleep) {
    const dur = formatSleepDuration(content.sleep.durationMinutes);
    rows += statRow("😴", "Sleep", dur, `Score ${content.sleep.score}`);
  }

  if (content.calories) {
    const total = content.calories.total.toLocaleString();
    rows += statRow("🔥", "Calories", `${total} kcal`, `${content.calories.active} active`);
  }

  if (content.activity) {
    for (const name of content.activity.names) {
      rows += statRow("⚡", name, `${content.activity.count > 1 ? content.activity.count + "×" : ""}`.trimEnd() || "—");
    }
    if (content.activity.kmRun != null && content.activity.kmRun > 0) {
      rows += statRow("📍", "Distance", `${content.activity.kmRun} km`);
    }
  }

  if (!rows) return "";

  const sectionTitle = content.bodySectionLabel ?? "Yesterday";
  return sectionLabel(sectionTitle) + divider() + rows;
}

function buildMonthlySection(content: DigestContent, today: string): string {
  const stats = content.monthlyStats;
  if (!stats) return "";

  const monthName = format(parseISO(today), "MMMM");
  const items: { label: string; value: string }[] = [];

  items.push({ label: "Sessions", value: String(stats.activities) });
  if (stats.habitsLogged > 0) items.push({ label: "Habit days", value: String(stats.habitsLogged) });
  if (stats.sleepAvg != null) items.push({ label: "Avg sleep", value: String(stats.sleepAvg) });
  if (stats.avgSteps != null) items.push({ label: "Avg steps", value: stats.avgSteps.toLocaleString() });

  if (items.length === 0) return "";

  return sectionLabel(monthName) + divider() + pillRow(items);
}

function buildTodaySection(content: DigestContent): string {
  if (!content.todaySession) return "";

  const { sport, phaseName, durationMinutes } = content.todaySession;
  const row = statRow("📅", `${sport} today`, `${durationMinutes} min`, phaseName);

  return sectionLabel("Today") + divider() + row;
}

function buildLibrarySection(content: DigestContent): string {
  const seg = content.librarySegment;
  if (!seg) return "";

  return `
${sectionLabel(`Concept · ${seg.topicTitle}`)}
${divider()}
<tr><td style="padding:16px;background:${C.accentLight};border-radius:8px;margin-top:8px">
  <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;color:${C.accent};${FONT}">${escapeHtml(seg.itemTitle)}</p>
  <p style="margin:0 0 12px;font-size:14px;line-height:1.65;color:${C.text};${FONT_SERIF}">${escapeHtml(seg.what)}</p>
  <p style="margin:6px 0 4px;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${C.muted};${FONT}">How</p>
  <p style="margin:0;font-size:13px;line-height:1.65;color:${C.text};${FONT}">${escapeHtml(seg.how)}</p>
</td></tr>`;
}

function buildFooter(appUrl: string): string {
  if (!appUrl) return "";
  return `
<tr><td style="padding:28px 0 8px;text-align:center">
  <a href="${escapeHtml(appUrl)}" style="display:inline-block;background:${C.accent};color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 24px;border-radius:6px;${FONT}">Open Life App →</a>
</td></tr>
<tr><td style="padding:16px 0 0;text-align:center">
  <p style="margin:0;font-size:11px;color:${C.sectionLabel};${FONT}">Life App · Put First Things First</p>
</td></tr>`;
}

// ─── Daily ────────────────────────────────────────────────────

function buildDailyHtml(content: DigestContent): string {
  const today = new Date().toISOString().slice(0, 10);
  const dateLabel = format(new Date(), "EEEE, MMMM d");

  const greeting = `
<tr><td style="padding:0 0 4px">
  <p style="margin:0;font-size:26px;font-weight:700;color:${C.text};${FONT_SERIF}">Good morning, ${escapeHtml(content.userName)} ✦</p>
  <p style="margin:6px 0 0;font-size:13px;color:${C.muted};${FONT}">${escapeHtml(dateLabel)}</p>
</td></tr>`;

  const sections = [
    greeting,
    buildYesterdaySection(content),
    buildMonthlySection(content, today),
    buildTodaySection(content),
    buildLibrarySection(content),
    buildFooter(content.appUrl),
  ].join("");

  return wrapper(sections);
}

// ─── Weekly ───────────────────────────────────────────────────

function buildWeeklyHtml(content: DigestContent): string {
  const dateLabel = format(new Date(), "EEEE, MMMM d");

  const greeting = `
<tr><td style="padding:0 0 4px">
  <p style="margin:0;font-size:26px;font-weight:700;color:${C.text};${FONT_SERIF}">Your week, ${escapeHtml(content.userName)} ✦</p>
  <p style="margin:6px 0 0;font-size:13px;color:${C.muted};${FONT}">${escapeHtml(dateLabel)}</p>
</td></tr>`;

  let rows = "";
  if (content.weekSessions && content.weekSessions.length > 0) {
    rows += statRow("⚡", "Sessions", formatWeekSessionsSummary(content.weekSessions));
  }
  if (content.weekSleepAvg != null) {
    rows += statRow("😴", "Avg sleep score", String(content.weekSleepAvg));
  }
  if (content.topHabits) {
    for (const h of content.topHabits) {
      rows += statRow("✅", h.name, `${h.doneLast30}/30 days`);
    }
  }
  if (content.todaySession) {
    const { sport, phaseName, durationMinutes } = content.todaySession;
    rows += statRow("📅", `${sport} today`, `${durationMinutes} min`, phaseName);
  }

  const today = new Date().toISOString().slice(0, 10);
  const sections = [
    greeting,
    sectionLabel("Last 7 days") + divider() + rows,
    buildMonthlySection(content, today),
    buildLibrarySection(content),
    buildFooter(content.appUrl),
  ].join("");

  return wrapper(sections);
}

// ─── Plain text ───────────────────────────────────────────────

function buildPlainText(content: DigestContent): string {
  const lines: string[] = [];

  if (content.cadence === "daily") {
    lines.push(`Good morning, ${content.userName} ✦`, "");
    const bodyLabel = content.bodySectionLabel ?? "Yesterday";
    if (content.sleep || content.calories || content.activity) {
      lines.push(`─── ${bodyLabel} ───────────────────`);
    }
    if (content.sleep) {
      lines.push(`😴 Sleep: ${formatSleepDuration(content.sleep.durationMinutes)} · Score ${content.sleep.score}`);
    }
    if (content.calories) {
      lines.push(`🔥 Calories: ${content.calories.total.toLocaleString()} kcal (${content.calories.active} active)`);
    }
    if (content.activity) {
      lines.push(`⚡ Activity: ${content.activity.names.join(", ")}`);
      if (content.activity.kmRun) lines.push(`📍 Distance: ${content.activity.kmRun} km`);
    }
    if (content.monthlyStats) {
      lines.push("", `─── ${format(new Date(), "MMMM")} ───────────────────`);
      lines.push(`${content.monthlyStats.activities} sessions · ${content.monthlyStats.habitsLogged} habit days${content.monthlyStats.sleepAvg ? ` · avg sleep ${content.monthlyStats.sleepAvg}` : ""}${content.monthlyStats.avgSteps ? ` · avg steps ${content.monthlyStats.avgSteps.toLocaleString()}` : ""}`);
    }
    if (content.todaySession) {
      lines.push("", `─── Today ───────────────────`);
      lines.push(`${content.todaySession.sport} · ${content.todaySession.durationMinutes} min · ${content.todaySession.phaseName}`);
    }
    if (content.librarySegment) {
      lines.push("", `─── Concept · ${content.librarySegment.topicTitle} ───────────────────`);
      lines.push(content.librarySegment.itemTitle.toUpperCase());
      lines.push("", content.librarySegment.what);
      lines.push("", "How:", content.librarySegment.how);
    }
  } else {
    lines.push(`Your week, ${content.userName} ✦`, "");
    if (content.weekSessions?.length) {
      lines.push(formatWeekSessionsSummary(content.weekSessions));
    }
    if (content.weekSleepAvg != null) lines.push(`Avg sleep score: ${content.weekSleepAvg}`);
    if (content.topHabits) {
      for (const h of content.topHabits) lines.push(`${h.name}: ${h.doneLast30}/30 days`);
    }
    if (content.librarySegment) {
      lines.push("", `─── Concept · ${content.librarySegment.topicTitle} ───────────────────`);
      lines.push(content.librarySegment.itemTitle.toUpperCase());
      lines.push("", content.librarySegment.what, "", "How:", content.librarySegment.how);
    }
  }

  if (content.appUrl) lines.push("", content.appUrl);
  return lines.join("\n");
}

// ─── Public API ───────────────────────────────────────────────

export function getDigestSubject(content: DigestContent): string {
  if (content.cadence === "weekly") return `${content.userName} — your week in review`;
  return `Good morning, ${content.userName} — here's your day`;
}

export function renderDigest(content: DigestContent): { html: string; text: string } {
  const html =
    content.cadence === "weekly" ? buildWeeklyHtml(content) : buildDailyHtml(content);
  const text = buildPlainText(content);
  return { html, text };
}
