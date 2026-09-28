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
    env,
    baseUrl,
    clientId: Deno.env.get("SICREDI_PIX_CLIENT_ID") || "",
    clientSecret: Deno.env.get("SICREDI_PIX_CLIENT_SECRET") || "",
    cert: Deno.env.get("SICREDI_PIX_CERT_PEM") || "",
    key: Deno.env.get("SICREDI_PIX_KEY_PEM") || "",
    pixKey: Deno.env.get("SICREDI_PIX_RECEIVER_KEY") || "",
  };
}

function decimalFromCents(cents: number) {
  return (cents / 100).toFixed(2);
}

function txidFromRegistration(id: string) {
  const compact = id.replace(/-/g, "").replace(/[^A-Za-z0-9]/g, "");
  return ("SJ" + compact).slice(0, 34);
}

async function getSicrediToken(cfg: ReturnType<typeof sicrediConfig>, client: Deno.HttpClient) {
  const basic = btoa(`${cfg.clientId}:${cfg.clientSecret}`);
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "cob.write cob.read pix.read webhook.read webhook.write",
  });

  const response = await fetch(`${cfg.baseUrl}/oauth/token`, {
    method: "POST",
    client,
    headers: {
      "Authorization": `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
    },
    body,
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.access_token) {
    throw new Error(`Sicredi OAuth falhou (${response.status})`);
  }
  return String(payload.access_token);
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405, origin);
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json({ error: "Origem não autorizada." }, 403, origin);

  const cfg = sicrediConfig();
  if (!cfg.baseUrl || !cfg.clientId || !cfg.clientSecret || !cfg.cert || !cfg.key || !cfg.pixKey) {
    return json({ error: "PIX_AUTOMATICO_NAO_CONFIGURADO" }, 503, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const secretKey = readKeySet("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !secretKey) return json({ error: "Backend indisponível." }, 500, origin);

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let registrationId = "";
  let txid = "";
  let mtlsClient: Deno.HttpClient | null = null;

  try {
    const body = await req.json();
    const workshopId = String(body?.workshop_id || "").trim();
    const responsibleName = String(body?.responsible_name || "").trim();
    const responsibleWhatsapp = String(body?.responsible_whatsapp || "").trim();
    const responsibleEmail = String(body?.responsible_email || "").trim();
    const childName = String(body?.child_name || "").trim();
    const childAge = Number(body?.child_age);
    const childBirthDate = body?.child_birth_date ? String(body.child_birth_date) : null;
    const notes = String(body?.notes || "").trim();

    if (!workshopId || !responsibleName || !responsibleWhatsapp || !childName || !Number.isFinite(childAge)) {
      return json({ error: "Dados da inscrição incompletos." }, 400, origin);
    }

    const { data: reservation, error: reservationError } = await admin.rpc("reserve_pix_registration", {
      p_workshop_id: workshopId,
      p_responsible_name: responsibleName,
      p_responsible_whatsapp: responsibleWhatsapp,
      p_responsible_email: responsibleEmail || null,
      p_child_name: childName,
      p_child_age: childAge,
      p_child_birth_date: childBirthDate,
      p_notes: notes || null,
    });

    if (reservationError || !reservation?.[0]) {
      throw new Error(reservationError?.message || "Não foi possível reservar a vaga.");
    }

    const row = reservation[0];
    registrationId = String(row.registration_id);
    txid = txidFromRegistration(registrationId);
    const expiresAt = new Date(String(row.reservation_expires_at));
    const seconds = Math.max(60, Math.floor((expiresAt.getTime() - Date.now()) / 1000));

    mtlsClient = Deno.createHttpClient({ cert: cfg.cert, key: cfg.key });
    const accessToken = await getSicrediToken(cfg, mtlsClient);

    const chargeResponse = await fetch(`${cfg.baseUrl}/api/v2/cob/${txid}`, {
      method: "PUT",
      client: mtlsClient,
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        calendario: { expiracao: seconds },
        valor: { original: decimalFromCents(Number(row.amount_cents)) },
        chave: cfg.pixKey,
        solicitacaoPagador: `Inscrição Socializando ${row.payment_reference}`,
        infoAdicionais: [
          { nome: "Referência", valor: String(row.payment_reference) },
        ],
      }),
    });

    const charge = await chargeResponse.json().catch(() => null);
    if (!chargeResponse.ok) {
      throw new Error(`Sicredi cobrança falhou (${chargeResponse.status})`);
    }

    const pixCopyPaste = String(charge?.pixCopiaECola || "");
    const location = String(charge?.location || "");
    if (!pixCopyPaste) throw new Error("Sicredi não retornou Pix Copia e Cola.");

    const { error: recordError } = await admin.rpc("record_pix_charge", {
      p_registration_id: registrationId,
      p_txid: txid,
      p_amount_cents: Number(row.amount_cents),
      p_pix_copy_paste: pixCopyPaste,
      p_location: location || null,
      p_expires_at: row.reservation_expires_at,
      p_provider_payload: charge,
    });
    if (recordError) throw new Error(recordError.message);

    return json({
      registration_id: registrationId,
      public_token: row.public_token,
      amount_cents: Number(row.amount_cents),
      payment_reference: row.payment_reference,
      reservation_expires_at: row.reservation_expires_at,
      txid,
      pix_copy_paste: pixCopyPaste,
      location: location || null,
      status: "pending_payment",
    }, 201, origin);
  } catch (error) {
    console.error("pix-checkout", error instanceof Error ? error.message : String(error));
    if (registrationId) {
      await admin.from("registrations")
        .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
        .eq("id", registrationId)
        .eq("status", "pending_payment");
    }
    return json({ error: error instanceof Error ? error.message : "Falha ao criar cobrança Pix." }, 502, origin);
  } finally {
    mtlsClient?.close();
  }
});
