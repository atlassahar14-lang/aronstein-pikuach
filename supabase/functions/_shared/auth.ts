import { createClient, type User } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { ADMIN_EMAIL, jsonResponse } from "./email.ts";

type Profile = { role: string; name: string; email?: string };

export async function authenticateRequest(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { error: jsonResponse({ error: "Unauthorized" }, 401) };
  }

  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
  if (authError || !user) {
    console.error("Auth error:", authError?.message);
    return { error: jsonResponse({ error: "Unauthorized" }, 401) };
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("role, name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Profile lookup error:", profileError.message);
  }

  return { user, profile: profile as Profile | null };
}

export function isAdminUser(user: User, profile: Profile | null) {
  return profile?.role === "admin" || user.email === ADMIN_EMAIL;
}

export function isClientUser(user: User, profile: Profile | null) {
  if (isAdminUser(user, profile)) return false;
  if (profile?.role === "client") return true;
  const metaRole = user.user_metadata?.role;
  if (metaRole === "client") return true;
  return user.email !== ADMIN_EMAIL;
}
