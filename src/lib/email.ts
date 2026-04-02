import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "Starflight <notifications@yourdomain.com>";

export async function sendEmail({
  to,
  subject,
  html,
  fromName,
}: {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    console.log("[email] Resend not configured. Would send:", { to, subject });
    return { success: true };
  }

  try {
    const from = fromName ? `${fromName} <${FROM_EMAIL.match(/<(.+)>/)?.[1] || FROM_EMAIL}>` : FROM_EMAIL;

    const { error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("[email] Send error:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[email] Exception:", err);
    return { success: false, error: String(err) };
  }
}

export function buildEmailHtml({
  body,
  preheader,
}: {
  body: string;
  preheader?: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f4f5; }
    .container { max-width: 580px; margin: 0 auto; padding: 32px 16px; }
    .card { background: white; border-radius: 8px; padding: 24px; border: 1px solid #e4e4e7; }
    .preheader { display: none; max-height: 0; overflow: hidden; }
    p { margin: 0 0 12px; line-height: 1.5; color: #27272a; font-size: 14px; }
    a { color: #2563eb; }
    .btn { display: inline-block; background: #18181b; color: white; text-decoration: none; padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 500; }
    .footer { text-align: center; padding: 16px; font-size: 12px; color: #a1a1aa; }
  </style>
</head>
<body>
  ${preheader ? `<span class="preheader">${preheader}</span>` : ""}
  <div class="container">
    <div class="card">
      ${body}
    </div>
    <div class="footer">Sent by Starflight</div>
  </div>
</body>
</html>`;
}
