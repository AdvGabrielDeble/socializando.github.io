import { createClient } from "npm:@supabase/supabase-js@2.57.4";

function readKeySet(name: string, legacyName: string) {
  const raw = Deno.env.get(name);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.default) return String(parsed.default);
    } catch { /* fallback */ }
  }
  return Deno.env.get(legacyName) || "";
}

function sicrediConfig() {
  const env = (Deno.env.get("SICREDI_PIX_ENV") || "").toLowerCase();
  const baseUrl = env === "production"
    ? "https://api-pix.sicredi.com.br"
    : env === "sandbox"
      ? "https://api-pix-h.sicredi.com.br"
      : "";
  return {
    baseUrl,
    clientId: Deno.env.get("SICREDI_PIX_CLIENT_ID") || "",
    clientSecret: Deno.env.get("SICREDI_PIX_CLIENT_SECRET") || "",
    cert: Deno.env.get("SICREDI_PIX_CERT_PEM") || "",
    key: Deno.env.get("SICREDI_PIX_KEY_PEM") || "",
    webhookToken: Deno.env.get("SICREDI_PIX_WEBHOOK_TOKEN") || "",
  };
}

function moneyToCents(value: unknown) {
  const raw = String(value ?? "").replace(",", ".");
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) throw new Error("Valor Pix inválido.");
  return Math.round(parsed * 100);
}

async function getSicrediToken(cfg: ReturnType<typeof sicrediConfig>, client: Deno.HttpClient) {
  const basic = btoa(`${cfg.clientId}:${cfg.clientSecret}`);
  const response = await fetch(`${cfg.baseUrl}/oauth/token`, {
    method: "POST",
    client,
    headers: {
      "Authorization": `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "cob.read pix.read",
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.access_token) throw new Error(`Sicredi OAuth falhou (${response.status})`);
  return String(payload.access_token);
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });

  const cfg = sicrediConfig();
  const url = new URL(req.url);
  if (!cfg.webhookToken || url.searchParams.get("token") !== cfg.webhookToken) {
    return new Response("unauthorized", { status: 401 });
  }
  if (!cfg.baseUrl || !cfg.clientId || !cfg.clientSecret || !cfg.cert || !cfg.key) {
    return new Response("not configured", { status: 503 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const secretKey = readKeySet("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let mtlsClient: Deno.HttpClient | null = null;
  try {
    const payload = await req.json();
    const incoming = Array.isArray(payload?.pix) ? payload.pix : [];
    if (!incoming.length) return new Response("ok", { status: 200 });

    mtlsClient = Deno.createHttpClient({ cert: cfg.cert, key: cfg.key });
    const token = await getSicrediToken(cfg, mtlsClient);

    for (const event of incoming) {
      const txid = String(event?.txid || "").trim();
      if (!/^[A-Za-z0-9]{26,35}$/.test(txid)) continue;

      const { data: localPayment, error: localError } = await admin
        .from("payment_transactions")
        .select("provider_txid,created_at")
        .eq("provider", "sicredi")
        .eq("provider_txid", txid)
        .maybeSingle();
      if (localError || !localPayment) continue;

      const start = new Date(new Date(localPayment.created_at).getTime() - 60 * 60 * 1000).toISOString();
      const end = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      const query = new URLSearchParams({ inicio: start, fim: end, txid });

      const verifyResponse = await fetch(`${cfg.baseUrl}/api/v2/pix?${query.toString()}`, {
        method: "GET",
        client: mtlsClient,
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json",
        },
      });
      const verifiedPayload = await verifyResponse.json().catch(() => null);
      if (!verifyResponse.ok) throw new Error(`Sicredi consulta Pix falhou (${verifyResponse.status})`);

      const verifiedList = Array.isArray(verifiedPayload?.pix) ? verifiedPayload.pix : [];
      const verified = verifiedList.find((item: any) => String(item?.txid || "") === txid);
      if (!verified) continue;

      const { data: result, error: confirmError } = await admin.rpc("confirm_pix_payment", {
        p_txid: txid,
        p_amount_cents: moneyToCents(verified.valor),
        p_paid_at: verified.horario || new Date().toISOString(),
        p_end_to_end_id: verified.endToEndId || null,
        p_provider_payload: verified,
      });
      if (confirmError) throw new Error(confirmError.message);

      console.log("pix-confirmed", txid, result?.[0]?.registration_status, result?.[0]?.payment_status);
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("pix-webhook", error instanceof Error ? error.message : String(error));
    return new Response("retry", { status: 500 });
  } finally {
    mtlsClient?.close();
  }
});
