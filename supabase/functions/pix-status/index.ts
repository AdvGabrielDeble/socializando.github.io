import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const ALLOWED_ORIGINS = new Set([
  "https://www.projetosocializando.com.br",
  "https://projetosocializando.com.br",
]);

function cors(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin)
      ? origin
      : "https://www.projetosocializando.com.br",
    "Access-Control-Allow-Headers": "content-type, apikey",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json; charset=utf-8" },
  });
}

function readKeySet(name: string, legacyName: string) {
  const raw = Deno.env.get(name);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.default) return String(parsed.default);
    } catch {}
  }
  return Deno.env.get(legacyName) || "";
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405, origin);
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json({ error: "Origem não autorizada." }, 403, origin);

  try {
    const body = await req.json();
    const registrationId = String(body?.registration_id || "").trim();
    const publicToken = String(body?.public_token || "").trim();
    if (!registrationId || !publicToken) return json({ error: "Dados incompletos." }, 400, origin);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const secretKey = readKeySet("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
    const admin = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: registration, error } = await admin
      .from("registrations")
      .select("id,status,reservation_expires_at,confirmed_at")
      .eq("id", registrationId)
      .eq("public_token", publicToken)
      .maybeSingle();

    if (error) throw error;
    if (!registration) return json({ error: "Inscrição não encontrada." }, 404, origin);

    let currentStatus = String(registration.status);
    if (
      currentStatus === "pending_payment" &&
      registration.reservation_expires_at &&
      new Date(registration.reservation_expires_at).getTime() <= Date.now()
    ) {
      const { data: updated } = await admin
        .from("registrations")
        .update({ status: "expired" })
        .eq("id", registrationId)
        .eq("public_token", publicToken)
        .eq("status", "pending_payment")
        .select("status")
        .maybeSingle();
      currentStatus = String(updated?.status || "expired");
    }

    const { data: payment } = await admin
      .from("payment_transactions")
      .select("status")
      .eq("registration_id", registrationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return json({
      status: currentStatus,
      reservation_expires_at: registration.reservation_expires_at,
      confirmed_at: registration.confirmed_at,
      payment_status: payment?.status || null,
    }, 200, origin);
  } catch (error) {
    console.error("pix-status", error instanceof Error ? error.message : String(error));
    return json({ error: "Falha ao consultar inscrição." }, 500, origin);
  }
});
