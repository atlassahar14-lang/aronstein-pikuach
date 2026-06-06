import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  corsHeaders,
  escapeHtml,
  jsonResponse,
  sendResendEmail,
} from "../_shared/email.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, name")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile || profile.role !== "client") {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const body = await req.json();
    const clientName = String(body.clientName || profile.name || user.email || "").trim();
    const projectName = String(body.projectName || "לא ידוע").trim();
    const questionText = String(body.questionText || "").trim();

    if (!questionText) {
      return jsonResponse({ error: "Missing question" }, 400);
    }

    const result = await sendResendEmail(
      `שאלה חדשה מלקוח — ${projectName}`,
      `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.6;color:#1a2332">
<h2 style="color:#1B2B5E;margin-bottom:16px">שאלה חדשה במערכת ארונשטיין פיקוח וניהול</h2>
<p><strong>שם הלקוח:</strong> ${escapeHtml(clientName)}</p>
<p><strong>שם הפרויקט:</strong> ${escapeHtml(projectName)}</p>
<p><strong>תוכן השאלה:</strong></p>
<p style="background:#f0f4f8;padding:14px;border-radius:10px;white-space:pre-wrap">${escapeHtml(questionText)}</p>
</div>`,
    );

    if (!result.ok) {
      return jsonResponse({ error: result.error }, result.error === "Email service not configured" ? 503 : 500);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error("notify-client-question error:", error);
    return jsonResponse({ error: (error as Error).message || "Internal error" }, 500);
  }
});
