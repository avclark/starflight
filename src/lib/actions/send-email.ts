"use server";

import { sendEmail, buildEmailHtml } from "@/lib/email";

export async function sendTaskEmail({
  fromName,
  subject,
  body,
  recipientEmail,
}: {
  fromName: string;
  subject: string;
  body: string;
  recipientEmail?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!recipientEmail) {
    // Log only if no recipient
    console.log("[sendTaskEmail] No recipient email, logging:", { fromName, subject });
    return { success: true };
  }

  const html = buildEmailHtml({
    body: `<div style="white-space: pre-wrap;">${body}</div>`,
    preheader: subject,
  });

  return sendEmail({ to: recipientEmail, subject, html, fromName });
}
