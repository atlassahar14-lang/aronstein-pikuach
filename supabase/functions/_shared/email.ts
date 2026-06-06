export const ADMIN_EMAIL = "atlassahar14@gmail.com";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export function getFromEmail() {
  const configured = (Deno.env.get("NOTIFY_FROM_EMAIL") || "").trim();
  const address = configured && configured.includes("@") ? configured : "onboarding@resend.dev";
  return address.includes("<") ? address : `ארונשטיין פיקוח <${address}>`;
}

export function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendResendEmail(subject: string, html: string) {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set");
    return { ok: false as const, error: "Email service not configured" };
  }

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getFromEmail(),
      to: [ADMIN_EMAIL],
      subject,
      html,
    }),
  });

  if (!emailRes.ok) {
    let errMsg = "Failed to send email";
    try {
      const errJson = await emailRes.json();
      errMsg = errJson.message || errJson.error || JSON.stringify(errJson);
    } catch {
      errMsg = await emailRes.text();
    }
    console.error("Resend error:", errMsg);
    return { ok: false as const, error: errMsg };
  }

  return { ok: true as const };
}
