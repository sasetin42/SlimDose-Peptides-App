import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * Convex HTTP Action: SMTP Email Sender via Hostinger
 * Endpoint: POST /sendEmail
 *
 * Forwards email payload to the Firebase Cloud Function SMTP relay
 * for actual delivery via Hostinger Business Email, then logs to Convex DB.
 */
export const sendEmail = httpAction(async (ctx, request) => {
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
    fromEmail = "noreply@slimdoseph.com",
    fromName = "SlimDose Peptides",
    replyTo,
    smtpHost = "smtp.hostinger.com",
    smtpPort = 465,
    smtpUser = "noreply@slimdoseph.com",
    smtpPass = "",
    secure = true,
    authRequired = true,
  } = body;

  if (!to || !subject || !html) {
    return json({ success: false, error: "Missing required fields: to, subject, html" }, 400);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    return json({ success: false, error: "Invalid recipient email address" }, 400);
  }

  const messageId = `sd_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  // Forward to the Firebase Cloud Function SMTP relay for actual delivery
  const relayEndpoints = [
    "https://apiSendEmail-xxxxx.a.run.app", // Firebase Cloud Run (if deployed)
    "https://slimdose-ph.firebaseapp.com/api/send-email", // Firebase Hosting rewrite
  ];

  let lastError = "";
  for (const endpoint of relayEndpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          to,
          subject,
          html,
          fromEmail,
          fromName,
          replyTo,
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPass,
          secure,
          authRequired,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const contentType = res.headers.get("content-type") || "";
      let data: any = {};
      if (contentType.includes("application/json")) {
        data = await res.json().catch(() => ({}));
      } else {
        const text = await res.text().catch(() => "");
        if (text.includes("<!DOCTYPE") || text.includes("<html")) continue;
        try { data = JSON.parse(text); } catch { data = {}; }
      }

      if (res.ok && data?.success) {
        // Audit log: success
        await ctx.runMutation(api.emailLogs.logDelivery, {
          recipient: to,
          subject,
          provider: `Hostinger Business Email (${smtpHost}:${smtpPort})`,
          message_id: data.messageId || messageId,
          status: "delivered",
          smtp_host: smtpHost,
          from_email: fromEmail,
        });

        return json({
          success: true,
          messageId: data.messageId || messageId,
          provider: `Hostinger Business Email (${smtpHost}:${smtpPort})`,
          response: data.response || "250 OK - Message accepted for delivery",
          timestamp: new Date().toISOString(),
        });
      }

      lastError = data?.error || `Relay returned status ${res.status}`;
    } catch (err: any) {
      lastError = err.name === "AbortError" ? "Relay timeout" : err.message || "Relay unreachable";
    }
  }

  // All relay methods exhausted — log failure
  await ctx.runMutation(api.emailLogs.logDelivery, {
    recipient: to,
    subject,
    provider: smtpHost,
    message_id: messageId,
    status: "failed",
    from_email: fromEmail,
    error_message: lastError || "All relay methods exhausted",
  });

  return json({ success: false, error: lastError || "Failed to send email via all relays", provider: smtpHost }, 500);
});

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
