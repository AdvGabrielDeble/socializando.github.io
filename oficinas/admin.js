const CANONICAL_ARTWORK_RULES = Object.freeze({
  'expedicao-jurassica|2026-10-10': Object.freeze({
    storagePath: 'expedicao-jurassica-2026-10-10.png',
    sha256: 'e0831d1c3580dcfafde231d5bf7cc45f4f92f86fba730ae933804cccc1742454',
    sizeBytes: 3585562,
    mimeType: 'image/png',
  }),
  'fabrica-dos-squishy-magicos|2026-10-10': Object.freeze({
    storagePath: 'fabrica-squishy-magicos-2026-10-10.png',
    sha256: '2ed21c9bd59f01659f5812d3d9a7a6574bdbb95cdf6b972dca558e9f61ecd339',
    sizeBytes: 3529499,
    mimeType: 'image/png',
  }),
});

export function getCanonicalArtworkRule(workshop) {
  if (!workshop?.experience_key || !workshop?.event_date) return null;
  return CANONICAL_ARTWORK_RULES[`${workshop.experience_key}|${workshop.event_date}`] || null;
}

function artworkExtension(file) {
  const mime = String(file?.type || '').toLowerCase();
  if (mime === 'image/jpeg') return 'jpeg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  return '';
}

export function validateArtworkFileMeta(file, workshop) {
  if (!file) throw new Error('Selecione uma arte para a turma.');
  const ext = artworkExtension(file);
  if (!ext) throw new Error('Formato inválido. Use JPEG, PNG ou WEBP.');
  if (Number(file.size) <= 0 || Number(file.size) > 5 * 1024 * 1024) {
    throw new Error('A arte deve ter no máximo 5 MB.');
  }

  const rule = getCanonicalArtworkRule(workshop);
  if (rule) {
    if (String(file.type).toLowerCase() !== rule.mimeType) {
      throw new Error('Para esta turma, envie o PNG original aprovado.');
    }
    if (Number(file.size) !== rule.sizeBytes) {
      throw new Error('O arquivo não corresponde ao arquivo original aprovado.');
    }
  }
  return true;
}

export function buildArtworkStoragePath(workshop, file) {
  const rule = getCanonicalArtworkRule(workshop);
  if (rule) return rule.storagePath;
  const ext = artworkExtension(file);
  if (!ext) throw new Error('Formato de arte não suportado.');
  if (!workshop?.experience_key || !workshop?.event_date) throw new Error('Turma inválida para vincular arte.');
  return `${workshop.experience_key}-${workshop.event_date}.${ext}`;
}

export function buildPublicArtworkUrl(supabaseUrl, storagePath) {
  const base = String(supabaseUrl || '').replace(/\/$/, '');
  const encoded = String(storagePath || '').split('/').map(encodeURIComponent).join('/');
  return `${base}/storage/v1/object/public/workshop-artworks/${encoded}`;
}


export function readMagicLinkSession(hash = '') {
  const raw = String(hash || '').replace(/^#/, '');
  if (!raw) return null;
  const params = new URLSearchParams(raw);
  const accessToken = params.get('access_token');
  if (!accessToken) return null;
  return {
    accessToken,
    refreshToken: params.get('refresh_token') || '',
    expiresIn: Number(params.get('expires_in') || 0),
    tokenType: params.get('token_type') || 'bearer',
    type: params.get('type') || '',
  };
}

async function sha256File(file) {
  if (!globalThis.crypto?.subtle) throw new Error('Seu navegador não suporta a validação segura da arte.');
  const bytes = await file.arrayBuffer();
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function summarizeWorkshops(workshops = [], registrations = []) {
  return workshops.map((workshop) => {
    const workshopRegistrations = registrations.filter((registration) => registration.workshop_id === workshop.id);
    const confirmedCount = workshopRegistrations.filter((registration) => registration.status === 'confirmed').length;
    const paymentReportedCount = workshopRegistrations.filter((registration) => registration.status === 'payment_reported').length;
    const pendingCount = workshopRegistrations.filter((registration) => registration.status === 'pending_payment').length;
    const occupiedCount = confirmedCount + paymentReportedCount;
    return {
      ...workshop,
      registrations: workshopRegistrations,
      confirmedCount,
      paymentReportedCount,
      pendingCount,
      occupiedCount,
      availableSpots: Math.max(0, Number(workshop.capacity) - occupiedCount),
    };
  });
}

export function canConfirmRegistration(registration) {
  return registration?.status === 'payment_reported';
}

export function buildNewSession(source, { eventDate, startTime, endTime, capacity }) {
  if (!source?.experience_key || !eventDate) throw new Error('Dados da nova turma incompletos.');
  return {
    experience_key: source.experience_key,
    slug: `${source.experience_key}-${eventDate}`,
    title: source.title,
    short_description: source.short_description ?? null,
    event_date: eventDate,
    start_time: startTime || source.start_time,
    end_time: endTime || source.end_time,
    minimum_age: Number(source.minimum_age || 5),
    age_label: source.age_label || `A partir de ${source.minimum_age || 5} anos`,
    price_cents: Number(source.price_cents),
    capacity: Number(capacity || source.capacity),
    status: 'open',
    image_url: null,
  };
}

export function createAdminApi({ config = globalThis.SOCIALIZANDO_SUPABASE, fetchImpl = globalThis.fetch } = {}) {
  const url = String(config?.url || '').replace(/\/$/, '');
  const anonKey = String(config?.anonKey || '').trim();
  if (!url || !anonKey) throw new Error('Configuração Supabase ainda não definida.');

  const parse = async (response) => {
    let body = null;
    try { body = await response.json(); } catch { body = null; }
    if (!response.ok) throw new Error(body?.message || body?.error_description || body?.hint || `Erro HTTP ${response.status}`);
    return body;
  };
  const authHeaders = (token) => {
    const sessionToken = String(token || '').trim();
    if (!sessionToken) throw new Error('Sessão administrativa inválida.');
    return { apikey: anonKey, Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' };
  };

  return {
    async requestMagicLink(email, redirectTo) {
      const normalizedEmail = String(email || '').trim().toLowerCase();
      if (!normalizedEmail || !normalizedEmail.includes('@')) throw new Error('E-mail administrativo inválido.');
      const redirect = String(redirectTo || '').trim();
      if (!redirect) throw new Error('URL de retorno administrativo indisponível.');

      const response = await fetchImpl(`${url}/auth/v1/otp?redirect_to=${encodeURIComponent(redirect)}`, {
        method: 'POST',
        headers: { apikey: anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          create_user: true,
        }),
      });
      await parse(response);
      return { ok: true };
    },
    async listWorkshops(token) {
      return parse(await fetchImpl(`${url}/rest/v1/workshops?select=*&order=event_date.asc,start_time.asc`, { headers: authHeaders(token) }));
    },
    async listRegistrations(token) {
      return parse(await fetchImpl(`${url}/rest/v1/registrations?select=*&order=created_at.desc`, { headers: authHeaders(token) }));
    },
    async updateRegistrationStatus(id, status, token) {
      return parse(await fetchImpl(`${url}/rest/v1/registrations?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH', headers: { ...authHeaders(token), Prefer: 'return=representation' }, body: JSON.stringify({ status }),
      }));
    },
    async createSession(session, token) {
      return parse(await fetchImpl(`${url}/rest/v1/workshops`, {
        method: 'POST', headers: { ...authHeaders(token), Prefer: 'return=representation' }, body: JSON.stringify(session),
      }));
    },
    async updateWorkshop(id, patch, token) {
      return parse(await fetchImpl(`${url}/rest/v1/workshops?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH', headers: { ...authHeaders(token), Prefer: 'return=representation' }, body: JSON.stringify(patch),
      }));
    },
    async uploadArtwork(storagePath, file, token) {
      const encodedPath = String(storagePath).split('/').map(encodeURIComponent).join('/');
      const response = await fetchImpl(`${url}/storage/v1/object/workshop-artworks/${encodedPath}`, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${token}`,
          'Content-Type': file.type,
          'x-upsert': 'true',
        },
        body: file,
      });
      await parse(response);
      return buildPublicArtworkUrl(url, storagePath);
    },
  };
}

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function dateLabel(date) {
  if (!date) return '';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle:'short', timeZone:'UTC' }).format(new Date(`${date}T12:00:00Z`));
}

function statusLabel(status) {
  return ({ pending_payment:'Aguardando Pix', payment_reported:'Pix informado', confirmed:'Confirmada', cancelled:'Cancelada' })[status] || status;
}

async function initAdmin() {
  const root = document.querySelector('[data-admin-app]');
  if (!root) return;

  let api;
  try { api = createAdminApi(); }
  catch (error) {
    root.innerHTML = `<div class="admin-notice">${esc(error.message)}</div>`;
    return;
  }

  let token;
  const callbackSession = readMagicLinkSession(globalThis.location?.hash || '');
  if (callbackSession?.accessToken) {
    sessionStorage.setItem('socializando-admin-token', callbackSession.accessToken);
    sessionStorage.setItem('socializando-admin-refresh-token', callbackSession.refreshToken || '');
    token = callbackSession.accessToken;
    if (globalThis.history?.replaceState && globalThis.location) {
      globalThis.history.replaceState(null, '', globalThis.location.pathname + globalThis.location.search);
    }
  } else {
    token = sessionStorage.getItem('socializando-admin-token');
  }

  let workshops = [];
  let registrations = [];

  const renderLogin = (message = '') => {
    root.innerHTML = `
      <section class="admin-login">
        <img src="../assets/logo-wordmark-large.png" alt="Socializando" />
        <h1>Gestão de oficinas</h1>
        <p>Acesso restrito à equipe. O login é feito por link seguro enviado ao e-mail autorizado.</p>
        <form data-login-form>
          <label>E-mail<input name="email" type="email" required autocomplete="email" value="gabrieldeblegd@gmail.com" readonly /></label>
          <button type="submit">Enviar link de acesso</button>
          <p class="admin-login__success" data-login-success ${message ? '' : 'hidden'}>${esc(message)}</p>
          <p data-login-error hidden></p>
        </form>
      </section>`;

    root.querySelector('[data-login-form]').addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const errorNode = root.querySelector('[data-login-error]');
      const successNode = root.querySelector('[data-login-success]');
      errorNode.hidden = true;
      successNode.hidden = true;
      try {
        const redirectTo = 'https://www.projetosocializando.com.br/oficinas/admin.html';
        await api.requestMagicLink(data.get('email'), redirectTo);
        successNode.textContent = 'Link de acesso enviado. Abra o e-mail e clique no link para entrar.';
        successNode.hidden = false;
      } catch (error) {
        errorNode.textContent = error.message;
        errorNode.hidden = false;
      }
    });
  };

  const renderDashboard = () => {
    const summaries = summarizeWorkshops(workshops, registrations);
    const sources = [...new Map(workshops.map((w) => [w.experience_key, w])).values()];
    root.innerHTML = `
      <header class="admin-topbar">
        <div><strong>Socializando</strong><span>Gestão de oficinas</span></div>
        <div class="admin-topbar__actions"><a href="../#oficinas">Ver LP</a><button data-logout>Sair</button></div>
      </header>
      <main class="admin-main">
        <section class="admin-panel">
          <div class="admin-panel__heading"><div><span>NOVA TURMA</span><h2>Abrir outra data</h2></div><p>Reaproveita a mesma oficina e valor; a nova turma ganha vagas e contador próprios. A arte da nova data é vinculada separadamente para preservar as criações aprovadas.</p></div>
          <form class="admin-session-form" data-new-session>
            <label>Oficina<select name="sourceId" required>${sources.map(w => `<option value="${esc(w.id)}">${esc(w.title)}</option>`).join('')}</select></label>
            <label>Data<input name="eventDate" type="date" required /></label>
            <label>Início<input name="startTime" type="time" required /></label>
            <label>Fim<input name="endTime" type="time" required /></label>
            <label>Vagas<input name="capacity" type="number" min="1" value="15" required /></label>
            <button type="submit">Criar turma</button>
            <p data-session-error hidden></p>
          </form>
        </section>
        <section class="admin-workshops">
          ${summaries.map(summary => `
            <article class="admin-workshop" data-workshop-id="${esc(summary.id)}">
              <div class="admin-workshop__head">
                <div><span>${esc(dateLabel(summary.event_date))} · ${esc(String(summary.start_time||'').slice(0,5))}</span><h2>${esc(summary.title)}</h2></div>
                <div class="admin-capacity"><strong>${summary.availableSpots}</strong><span>vagas disponíveis</span></div>
              </div>
              <div class="admin-stats">
                <span><b>${summary.confirmedCount}</b> confirmadas</span>
                <span><b>${summary.paymentReportedCount}</b> Pix informado</span>
                <span><b>${summary.pendingCount}</b> aguardando Pix</span>
                <span><b>${summary.capacity}</b> capacidade</span>
              </div>
              <div class="admin-capacity-editor">
                <label>Capacidade <input type="number" min="${summary.confirmedCount || 1}" value="${summary.capacity}" data-capacity-input /></label>
                <button type="button" data-save-capacity>Salvar capacidade</button>
              </div>
              <div class="admin-artwork">
                <div class="admin-artwork__preview">
                  ${summary.image_url
                    ? `<img src="${esc(summary.image_url)}" alt="Arte vinculada a ${esc(summary.title)} em ${esc(dateLabel(summary.event_date))}" />`
                    : '<div class="admin-artwork__empty">Sem arte vinculada a esta turma.</div>'}
                </div>
                <div class="admin-artwork__controls">
                  <strong>Arte desta turma</strong>
                  <span>O arquivo é enviado sem edição, recorte ou recompressão.</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" data-artwork-input />
                  <button type="button" data-upload-art>Vincular arte</button>
                  <small data-artwork-status></small>
                </div>
              </div>
              <div class="admin-registrations">
                ${summary.registrations.length ? summary.registrations.map(reg => `
                  <div class="admin-registration" data-registration-id="${esc(reg.id)}">
                    <div>
                      <strong>${esc(reg.child_name)}</strong>
                      <span>${esc(reg.responsible_name)} · ${esc(reg.responsible_whatsapp)}</span>
                      <small>${esc(reg.responsible_email || '')}</small>
                    </div>
                    <span class="admin-status admin-status--${esc(reg.status)}">${esc(statusLabel(reg.status))}</span>
                    <div class="admin-registration__actions">
                      <button type="button" data-confirm ${canConfirmRegistration(reg, summary) ? '' : 'disabled'}>Confirmar</button>
                      <button type="button" data-cancel ${reg.status === 'cancelled' ? 'disabled' : ''}>Cancelar</button>
                    </div>
                  </div>`).join('') : '<p class="admin-empty">Nenhuma inscrição nesta turma.</p>'}
              </div>
            </article>`).join('')}
        </section>
      </main>`;

    root.querySelector('[data-logout]').addEventListener('click', () => {
      sessionStorage.removeItem('socializando-admin-token'); sessionStorage.removeItem('socializando-admin-refresh-token'); token = null; renderLogin();
    });

    root.querySelector('[data-new-session]').addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const source = workshops.find(w => w.id === data.get('sourceId'));
      const errorNode = root.querySelector('[data-session-error]');
      errorNode.hidden = true;
      try {
        await api.createSession(buildNewSession(source, {
          eventDate:data.get('eventDate'), startTime:data.get('startTime'), endTime:data.get('endTime'), capacity:data.get('capacity')
        }), token);
        await loadDashboard();
      } catch (error) { errorNode.textContent = error.message; errorNode.hidden = false; }
    });

    root.querySelectorAll('.admin-workshop').forEach((card) => {
      const workshop = summaries.find(w => w.id === card.dataset.workshopId);
      card.addEventListener('click', async (event) => {
        const regNode = event.target.closest('[data-registration-id]');
        try {
          if (event.target.matches('[data-confirm]') && regNode) {
            await api.updateRegistrationStatus(regNode.dataset.registrationId, 'confirmed', token); await loadDashboard();
          } else if (event.target.matches('[data-cancel]') && regNode) {
            await api.updateRegistrationStatus(regNode.dataset.registrationId, 'cancelled', token); await loadDashboard();
          } else if (event.target.matches('[data-save-capacity]')) {
            const capacity = Number(card.querySelector('[data-capacity-input]').value);
            if (capacity < workshop.confirmedCount) throw new Error('A capacidade não pode ser menor que o número de inscrições confirmadas.');
            await api.updateWorkshop(workshop.id, { capacity }, token); await loadDashboard();
          } else if (event.target.matches('[data-upload-art]')) {
            const input = card.querySelector('[data-artwork-input]');
            const status = card.querySelector('[data-artwork-status]');
            const file = input?.files?.[0];
            validateArtworkFileMeta(file, workshop);

            const rule = getCanonicalArtworkRule(workshop);
            status.textContent = 'Validando arquivo original...';
            if (rule) {
              const hash = await sha256File(file);
              if (hash !== rule.sha256) {
                throw new Error('A arte selecionada não é o arquivo original aprovado desta oficina.');
              }
            }

            const storagePath = buildArtworkStoragePath(workshop, file);
            status.textContent = 'Enviando arte sem alterações...';
            const publicUrl = await api.uploadArtwork(storagePath, file, token);
            await api.updateWorkshop(workshop.id, { image_url: publicUrl }, token);
            status.textContent = 'Arte vinculada com sucesso.';
            await loadDashboard();
          }
        } catch (error) {
          const status = card.querySelector('[data-artwork-status]');
          if (status && event.target.matches('[data-upload-art]')) status.textContent = error.message;
          else alert(error.message);
        }
      });
    });
  };

  async function loadDashboard() {
    try {
      [workshops, registrations] = await Promise.all([api.listWorkshops(token), api.listRegistrations(token)]);
      renderDashboard();
    } catch (error) {
      sessionStorage.removeItem('socializando-admin-token'); sessionStorage.removeItem('socializando-admin-refresh-token'); token = null;
      renderLogin();
      const errorNode = root.querySelector('[data-login-error]');
      if (errorNode) { errorNode.textContent = `Acesso não autorizado: ${error.message}`; errorNode.hidden = false; }
    }
  }

  if (token) await loadDashboard(); else renderLogin();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAdmin, { once:true });
  else initAdmin();
}
