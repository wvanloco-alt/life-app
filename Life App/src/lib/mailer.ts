import nodemailer from "nodemailer";

const SEND_TIMEOUT_MS = 15_000;

let transport: nodemailer.Transporter | null = null;

function getFromAddress(): string {
  const from = process.env.EMAIL_FROM?.trim();
  if (from) return from;

  const user = process.env.GMAIL_USER?.trim();
  if (user) return `"Life App" <${user}>`;

  throw new Error("EMAIL_FROM or GMAIL_USER must be configured for email sending");
}

async function sendViaResend(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY not configured");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: getFromAddress(),
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Resend API ${res.status}: ${body.slice(0, 300)}`);
    }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Resend API connection timed out");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function getMailer(): nodemailer.Transporter {
  if (!transport) {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    if (!user) throw new Error("GMAIL_USER not configured");
    if (!pass) throw new Error("GMAIL_APP_PASSWORD not configured");

    transport = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
      connectionTimeout: SEND_TIMEOUT_MS,
      greetingTimeout: SEND_TIMEOUT_MS,
      socketTimeout: SEND_TIMEOUT_MS,
    });
  }
  return transport;
}

async function sendViaGmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  await getMailer().sendMail({
    from: getFromAddress(),
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  if (process.env.RESEND_API_KEY?.trim()) {
    await sendViaResend(opts);
    return;
  }

  // Railway blocks outbound SMTP — never fall back to Gmail in production.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "RESEND_API_KEY is not set on this server. Add RESEND_API_KEY and EMAIL_FROM to the web service Variables, redeploy, and remove reliance on Gmail SMTP."
    );
  }

  await sendViaGmail(opts);
}
