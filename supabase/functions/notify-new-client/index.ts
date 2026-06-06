import {
  corsHeaders,
  escapeHtml,
  jsonResponse,
  sendResendEmail,
} from "../_shared/email.ts";
import { authenticateRequest, isAdminUser } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const auth = await authenticateRequest(req);
    if ("error" in auth && auth.error) return auth.error;

    const { user, profile } = auth;
    if (!isAdminUser(user, profile)) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const body = await req.json();
    const clientName = String(body.clientName || "").trim();
    const clientEmail = String(body.clientEmail || "").trim();
    const projectName = String(body.projectName || "לא ידוע").trim();

    if (!clientName || !clientEmail) {
      return jsonResponse({ error: "Missing client details" }, 400);
    }

    const result = await sendResendEmail(
      `לקוח חדש נוצר — ${clientName}`,
      `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.6;color:#1a2332">
<h2 style="color:#1B2B5E;margin-bottom:16px">לקוח חדש במערכת ארונשטיין פיקוח וניהול</h2>
<p><strong>שם הלקוח:</strong> ${escapeHtml(clientName)}</p>
<p><strong>אימייל:</strong> ${escapeHtml(clientEmail)}</p>
<p><strong>פרויקט משויך:</strong> ${escapeHtml(projectName)}</p>
</div>`,
    );

    if (!result.ok) {
      return jsonResponse(
        { error: result.error },
        result.error === "Email service not configured" ? 503 : 500,
      );
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error("notify-new-client error:", error);
    return jsonResponse({ error: (error as Error).message || "Internal error" }, 500);
  }
});
