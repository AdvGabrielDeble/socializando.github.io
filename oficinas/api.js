function requireConfig({ supabaseUrl, supabaseAnonKey }) {
  const url = String(supabaseUrl ?? '').replace(/\/$/, '');
  const key = String(supabaseAnonKey ?? '').trim();
  if (!url || !key) {
    throw new Error('Configuração do módulo de oficinas indisponível.');
  }
  return { url, key };
}

async function readJson(response) {
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (!response.ok) {
    const message = data?.message || data?.error_description || data?.hint || `Erro HTTP ${response.status}`;
    throw new Error(message);
  }
  return data;
}

function mapWorkshop(row) {
  return {
    id: row.id,
    experienceKey: row.experience_key,
    slug: row.slug,
    title: row.title,
    shortDescription: row.short_description ?? '',
    eventDate: row.event_date,
    startTime: row.start_time,
    endTime: row.end_time,
    minimumAge: Number(row.minimum_age),
    ageLabel: row.age_label,
    priceCents: Number(row.price_cents),
    capacity: Number(row.capacity),
    status: row.status,
    imageUrl: row.image_url,
    confirmedCount: Number(row.confirmed_count),
    availableSpots: Number(row.available_spots),
  };
}

function mapRegistration(row) {
  return {
    registrationId: row.registration_id,
    publicToken: row.public_token,
    amountCents: Number(row.amount_cents),
    paymentReference: row.payment_reference,
    status: row.status,
    paymentReportedAt: row.payment_reported_at ?? null,
  };
}

export function createWorkshopApi({ supabaseUrl, supabaseAnonKey, fetchImpl = globalThis.fetch } = {}) {
  const { url, key } = requireConfig({ supabaseUrl, supabaseAnonKey });
  if (typeof fetchImpl !== 'function') throw new Error('Transporte HTTP indisponível.');

  const rpc = async (name, body) => {
    const response = await fetchImpl(`${url}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body ?? {}),
    });
    return readJson(response);
  };

  return {
    async listOpenWorkshops() {
      const rows = await rpc('list_public_workshops', {});
      if (!Array.isArray(rows)) throw new Error('Resposta inválida ao consultar oficinas.');
      return rows.map(mapWorkshop);
    },

    async createRegistration(input) {
      const rows = await rpc('create_public_registration', {
        p_workshop_id: input.workshopId,
        p_responsible_name: input.responsibleName,
        p_responsible_whatsapp: input.responsibleWhatsapp,
        p_responsible_email: input.responsibleEmail || null,
        p_child_name: input.childName,
        p_child_age: Number(input.childAge),
        p_child_birth_date: input.childBirthDate || null,
        p_notes: input.notes || null,
      });
      const row = Array.isArray(rows) ? rows[0] : rows;
      if (!row?.registration_id || !row?.public_token) throw new Error('Resposta inválida ao criar inscrição.');
      return mapRegistration(row);
    },

    async reportPayment(registrationId, publicToken) {
      const rows = await rpc('report_public_payment', {
        p_registration_id: registrationId,
        p_public_token: publicToken,
      });
      const row = Array.isArray(rows) ? rows[0] : rows;
      if (!row?.status) throw new Error('Resposta inválida ao informar pagamento.');
      return mapRegistration({
        registration_id: registrationId,
        public_token: publicToken,
        amount_cents: 0,
        payment_reference: null,
        ...row,
      });
    },
  };
}

export function createRuntimeWorkshopApi({ fetchImpl = globalThis.fetch, config = globalThis.SOCIALIZANDO_SUPABASE } = {}) {
  return createWorkshopApi({
    supabaseUrl: config?.url,
    supabaseAnonKey: config?.anonKey,
    fetchImpl,
  });
}
