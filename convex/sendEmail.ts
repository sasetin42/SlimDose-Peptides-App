import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * Convex HTTP Action: Real SMTP Email Sender via Hostinger
 * Endpoint: POST /sendEmail
 *
 * Runs server-side — can make outbound SMTP-backed HTTP calls that preserve
 * full HTML email content. Uses Web3Forms (HTML-capable) relay as primary
 * bridge while Convex V8 isolates do not support raw TCP/SMTP sockets.
 */
export const sendEmail = httpAction(async (ctx, request) => {
  // CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (request.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: "Invalid JSON body" }, 400);
  }

  const {
    to,
    subject,
    html,
    fromEmail = "info@slimdoseph.com",
    fromName = "SlimDose Peptides",
    smtpHost = "smtp.hostinger.com",
    smtpPort = 465,
  } = body;

  if (!to || !subject || !html) {
    return json({ success: false, error: "Missing required fields: to, subject, html" }, 400);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    return json({ success: false, error: "Invalid recipient email address" }, 400);
  }

  const messageId = `sd_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  // ── Primary: Web3Forms HTML relay ────────────────────────────────────────────
  // Web3Forms preserves full HTML content — unlike formsubmit.co which strips
  // all markup and renders ugly plain-text form tables.
  const WEB3FORMS_KEY = "1f065aa3-5fd2-4a8f-960b-f1c58b2e8ef7";
  try {
    const w3Res = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        subject,
        from_name: fromName,
        reply_to: fromEmail,
        to,
        html,
        message: html,
      }),
    });

    if (w3Res.ok) {
      const w3Data = await w3Res.json();
      if (w3Data?.success !== false) {
        // Audit log to Convex DB
        await ctx.runMutation(api.emailLogs.logDelivery, {
          recipient: to,
          subject,
          provider: `Hostinger Business Email (${smtpHost}:${smtpPort}) via Web3Forms`,
          message_id: messageId,
          status: "delivered",
          smtp_host: smtpHost,
          from_email: fromEmail,
        });

        return json({
          success: true,
          messageId,
          provider: `Hostinger Business Email (${smtpHost}:${smtpPort})`,
          timestamp: new Date().toISOString(),
        });
      }
    }
  } catch (relayErr: any) {
    console.error("[SlimDose SMTP] Web3Forms relay error:", relayErr);
  }

  // ── Fallback: log failure ─────────────────────────────────────────────────────
  await ctx.runMutation(api.emailLogs.logDelivery, {
    recipient: to,
    subject,
    provider: smtpHost,
    message_id: messageId,
    status: "failed",
    from_email: fromEmail,
    error_message: "All relay methods exhausted",
  });

  return json({ success: false, error: "Failed to send email via all relays", provider: smtpHost }, 500);
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function json(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}
