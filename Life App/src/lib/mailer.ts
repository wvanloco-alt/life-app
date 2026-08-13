import nodemailer from "nodemailer";

let transport: nodemailer.Transporter | null = null;

function getMailer(): nodemailer.Transporter {
  if (!transport) {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;
    if (!user) throw new Error("GMAIL_USER not configured");
    if (!pass) throw new Error("GMAIL_APP_PASSWORD not configured");

    transport = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });
  }
  return transport;
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const fromUser = process.env.GMAIL_USER;
  if (!fromUser) throw new Error("GMAIL_USER not configured");

  await getMailer().sendMail({
    from: `"Life App" <${fromUser}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
}
