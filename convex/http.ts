import { httpRouter } from "convex/server";
import { sendEmail } from "./sendEmail";

const http = httpRouter();

/**
 * POST /sendEmail
 * Real server-side SMTP relay through Hostinger Business Email.
 * Called from the browser-side emailService.ts — browsers cannot
 * open raw TCP SMTP sockets, so this Convex HTTP Action bridges the gap.
 */
http.route({
  path: "/sendEmail",
  method: "POST",
  handler: sendEmail,
});

// CORS preflight
http.route({
  path: "/sendEmail",
  method: "OPTIONS",
  handler: sendEmail,
});

export default http;
