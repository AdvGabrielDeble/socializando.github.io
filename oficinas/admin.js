const CANONICAL_ARTWORK_RULES = Object.freeze({
  'expedicao-jurassica|2026-10-10': Object.freeze({
    storagePath: 'expedicao-jurassica-2026-10-10-v2.webp',
    sha256: 'c0dacfae9358056a43bd2d3ee339c7734b8cafa755f3622c1edb9a418608bcf4',
    sizeBytes: 673534,
    mimeType: 'image/webp',
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
      throw new Error('Para esta turma, envie a arte oficial aprovada.');
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


function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function reaisToCents(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return 0;
  const normalized = raw
    .replace(/\s/g, '')
    .replace(/^R\$/i, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const number = Number(normalized);
  if (!Number.isFinite(number) || number < 0) throw new Error('Valor inválido.');
  return Math.round(number * 100);
}

export function adjustCapacity(currentCapacity, delta, occupiedCount = 0) {
  const current = Math.max(1, Number(currentCapacity) || 1);
  const occupied = Math.max(0, Number(occupiedCount) || 0);
  const next = Math.trunc(current + Number(delta || 0));
  return Math.max(occupied || 1, next);
}

export function buildNewWorkshop({
  title,
  shortDescription,
  eventDate,
  startTime,
  endTime,
  minimumAge,
  priceReais,
  capacity,
}) {
  const cleanTitle = String(title || '').trim();
  const experienceKey = slugify(cleanTitle);
  if (!cleanTitle || !experienceKey || !eventDate) throw new Error('Preencha nome e data da nova oficina.');
  const age = Math.max(0, Number(minimumAge) || 0);
  const spots = Math.max(1, Number(capacity) || 1);

  return {
    experience_key: experienceKey,
    slug: `${experienceKey}-${eventDate}`,
    title: cleanTitle,
    short_description: String(shortDescription || '').trim() || null,
    event_date: eventDate,
    start_time: startTime || null,
    end_time: endTime || null,
    minimum_age: age,
    age_label: `A partir de ${age} anos`,
    price_cents: reaisToCents(priceReais),
    capacity: spots,
    status: 'open',
    image_url: null,
  };
}

export function buildWorkshopPatch({
  title,
  shortDescription,
  eventDate,
  startTime,
  endTime,
  minimumAge,
  priceReais,
  capacity,
  status,
}, occupiedCount = 0) {
  const occupied = Math.max(0, Number(occupiedCount) || 0);
  const spots = Math.max(1, Number(capacity) || 1);
  if (spots < occupied) {
    throw new Error(`A capacidade não pode ficar abaixo das ${occupied} vagas já ocupadas.`);
  }
  const age = Math.max(0, Number(minimumAge) || 0);
  return {
    title: String(title || '').trim(),
    short_description: String(shortDescription || '').trim() || null,
    event_date: eventDate || null,
    start_time: startTime || null,
    end_time: endTime || null,
    minimum_age: age,
    age_label: `A partir de ${age} anos`,
    price_cents: reaisToCents(priceReais),
    capacity: spots,
    status: status || 'draft',
  };
}

export function filterRegistrations(registrations = [], filter = 'all') {
  if (!filter || filter === 'all') return [...registrations];
  return registrations.filter((registration) => registration.status === filter);
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
    if (!response.ok) throw new Error(body?.message || body?.error || body?.error_description || body?.hint || `Erro HTTP ${response.status}`);
    return body;
  };
  const authHeaders = (token) => {
    const sessionToken = String(token || '').trim();
    if (!sessionToken) throw new Error('Sessão administrativa inválida.');
    return { apikey: anonKey, Authorization: `Bearer ${sessionToken}`, 'Content-Type': 'application/json' };
  };

  return {
    async signInWithPassword(username, password) {
      const normalizedUsername = String(username || '').trim().toUpperCase();
      const secret = String(password || '');
      if (normalizedUsername !== 'SOCIALIZANDO' || !secret) {
        throw new Error('Usuário ou senha inválidos.');
      }

      const response = await fetchImpl(`${url}/functions/v1/admin-login`, {
        method: 'POST',
        headers: { apikey: anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: normalizedUsername,
          password: secret,
        }),
      });
      return parse(response);
    },
    async refreshSession(refreshToken) {
      const sessionRefreshToken = String(refreshToken || '').trim();
      if (!sessionRefreshToken) throw new Error('Sessão administrativa expirada.');

      const response = await fetchImpl(`${url}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { apikey: anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: sessionRefreshToken }),
      });
      return parse(response);
    },
    async signOut(token) {
      const sessionToken = String(token || '').trim();
      if (!sessionToken) return { ok: true };
      const response = await fetchImpl(`${url}/auth/v1/logout`, {
        method: 'POST',
        headers: authHeaders(sessionToken),
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
    async listAuditLog(token) {
      return parse(await fetchImpl(`${url}/rest/v1/admin_audit_log?select=*&order=created_at.desc&limit=50`, { headers: authHeaders(token) }));
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

  let token = sessionStorage.getItem('socializando-admin-token');
  let refreshToken = sessionStorage.getItem('socializando-admin-refresh-token');

  if (refreshToken) {
    try {
      const session = await api.refreshSession(refreshToken);
      token = session?.access_token || '';
      refreshToken = session?.refresh_token || refreshToken;
      if (!token) throw new Error('Sessão administrativa inválida.');
      sessionStorage.setItem('socializando-admin-token', token);
      sessionStorage.setItem('socializando-admin-refresh-token', refreshToken);
    } catch {
      sessionStorage.removeItem('socializando-admin-token');
      sessionStorage.removeItem('socializando-admin-refresh-token');
      token = null;
      refreshToken = null;
    }
  }

  let workshops = [];
  let registrations = [];
  let auditLog = [];

  const renderLogin = () => {
    root.innerHTML = `
      <section class="admin-login">
        <img src="../assets/logo-wordmark-large.png" alt="Socializando" />
        <h1>Gestão de oficinas</h1>
        <p>Acesso restrito à equipe administrativa.</p>
        <form data-login-form>
          <label>Usuário<input name="username" type="text" required autocomplete="username" autocapitalize="characters" spellcheck="false" /></label>
          <label>Senha<input name="password" type="password" required autocomplete="current-password" /></label>
          <button type="submit">Entrar</button>
          <p data-login-error hidden></p>
        </form>
      </section>`;

    root.querySelector('[data-login-form]').addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const errorNode = root.querySelector('[data-login-error]');
      const submitButton = event.currentTarget.querySelector('button[type="submit"]');
      errorNode.hidden = true;
      submitButton.disabled = true;
      submitButton.textContent = 'Entrando...';
      try {
        const session = await api.signInWithPassword(data.get('username'), data.get('password'));
        token = session?.access_token || '';
        refreshToken = session?.refresh_token || '';
        if (!token || !refreshToken) throw new Error('Não foi possível iniciar a sessão administrativa.');
        sessionStorage.setItem('socializando-admin-token', token);
        sessionStorage.setItem('socializando-admin-refresh-token', refreshToken);
        event.currentTarget.reset();
        await loadDashboard();
      } catch (error) {
        errorNode.textContent = error.message === 'Invalid login credentials'
          ? 'Usuário ou senha inválidos.'
          : error.message;
        errorNode.hidden = false;
        submitButton.disabled = false;
        submitButton.textContent = 'Entrar';
      }
    });
  };

  const renderDashboard = () => {
    const summaries = summarizeWorkshops(workshops, registrations);
    const sources = [...new Map(workshops.map((w) => [w.experience_key, w])).values()];
    const totalAvailable = summaries.reduce((sum, item) => sum + item.availableSpots, 0);
    const totalOccupied = summaries.reduce((sum, item) => sum + item.occupiedCount, 0);
    const totalReported = summaries.reduce((sum, item) => sum + item.paymentReportedCount, 0);
    const statusOptions = [
      ['draft','Rascunho'],
      ['open','Inscrições abertas'],
      ['closed','Inscrições encerradas'],
      ['sold_out','Esgotada'],
      ['archived','Arquivada'],
    ];

    const priceInput = (cents) => ((Number(cents) || 0) / 100).toFixed(2).replace('.', ',');
    const whatsappHref = (value) => {
      const digits = String(value || '').replace(/\D/g, '');
      const normalized = digits.startsWith('55') ? digits : `55${digits}`;
      return digits ? `https://wa.me/${normalized}` : '#';
    };
    const auditActionLabel = (item) => ({
      workshop_created:'Oficina/turma criada',
      workshop_updated:'Oficina/turma alterada',
      workshop_deleted:'Oficina/turma excluída',
      registration_status_changed:'Status de inscrição alterado',
    })[item.action] || item.action;

    root.innerHTML = `
      <header class="admin-topbar">
        <div><strong>Socializando</strong><span>Gestão de oficinas · V4.8.2</span></div>
        <div class="admin-topbar__actions"><a href="../#oficinas">Ver LP</a><button data-logout>Sair</button></div>
      </header>

      <main class="admin-main">
        <section class="admin-summary-grid">
          <article><span>Turmas</span><strong>${summaries.length}</strong></article>
          <article><span>Vagas disponíveis</span><strong>${totalAvailable}</strong></article>
          <article><span>Vagas ocupadas</span><strong>${totalOccupied}</strong></article>
          <article><span>Pix aguardando conferência</span><strong>${totalReported}</strong></article>
        </section>

        <section class="admin-command-grid">
          <section class="admin-panel">
            <div class="admin-panel__heading">
              <div><span>NOVA OFICINA</span><h2>Criar nova oficina</h2></div>
              <p>Cria uma experiência nova, com identidade, data, horário, preço e vagas próprios.</p>
            </div>
            <form class="admin-create-form" data-new-workshop>
              <label>Nome da oficina<input name="title" required placeholder="Ex.: Laboratório dos Monstros" /></label>
              <label class="admin-create-form__wide">Descrição<input name="shortDescription" placeholder="Descrição curta para a LP" /></label>
              <label>Data<input name="eventDate" type="date" required /></label>
              <label>Início<input name="startTime" type="time" required /></label>
              <label>Fim<input name="endTime" type="time" required /></label>
              <label>Idade mínima<input name="minimumAge" type="number" min="0" value="5" required /></label>
              <label>Valor (R$)<input name="priceReais" inputmode="decimal" value="45,00" required /></label>
              <label>Vagas<input name="capacity" type="number" min="1" value="15" required /></label>
              <button type="submit">Criar nova oficina</button>
              <p data-workshop-create-error hidden></p>
            </form>
          </section>

          <section class="admin-panel">
            <div class="admin-panel__heading">
              <div><span>NOVA TURMA</span><h2>Abrir nova turma</h2></div>
              <p>Reaproveita uma oficina existente. Data, horário, vagas e arte da nova turma são independentes.</p>
            </div>
            <form class="admin-session-form" data-new-session>
              <label>Oficina<select name="sourceId" required>${sources.map(w => `<option value="${esc(w.id)}">${esc(w.title)}</option>`).join('')}</select></label>
              <label>Data<input name="eventDate" type="date" required /></label>
              <label>Início<input name="startTime" type="time" required /></label>
              <label>Fim<input name="endTime" type="time" required /></label>
              <label>Vagas<input name="capacity" type="number" min="1" value="15" required /></label>
              <button type="submit">Abrir nova turma</button>
              <p data-session-error hidden></p>
            </form>
          </section>
        </section>

        <section class="admin-workshops">
          ${summaries.map(summary => `
            <article class="admin-workshop" data-workshop-id="${esc(summary.id)}">
              <div class="admin-workshop__head">
                <div>
                  <span>${esc(dateLabel(summary.event_date))} · ${esc(String(summary.start_time||'').slice(0,5))}–${esc(String(summary.end_time||'').slice(0,5))}</span>
                  <h2>${esc(summary.title)}</h2>
                  <small>${esc(summary.short_description || '')}</small>
                </div>
                <div class="admin-capacity"><strong>${summary.availableSpots}</strong><span>vagas disponíveis</span></div>
              </div>

              <div class="admin-stats">
                <span><b>${summary.occupiedCount}</b> ocupadas</span>
                <span><b>${summary.confirmedCount}</b> confirmadas</span>
                <span><b>${summary.paymentReportedCount}</b> Pix informado</span>
                <span><b>${summary.pendingCount}</b> aguardando Pix</span>
                <span><b>${summary.capacity}</b> capacidade</span>
              </div>

              <div class="admin-workshop-toolbar">
                <label>Status
                  <select data-workshop-status>
                    ${statusOptions.map(([value,label]) => `<option value="${value}" ${summary.status===value?'selected':''}>${label}</option>`).join('')}
                  </select>
                </label>
                <div class="admin-capacity-quick">
                  <span>Vagas</span>
                  <button type="button" data-capacity-delta="-1">−1</button>
                  <button type="button" data-capacity-delta="1">+1</button>
                  <button type="button" data-capacity-delta="5">+5</button>
                </div>
                <div class="admin-capacity-editor">
                  <label>Capacidade
                    <input type="number" min="${summary.occupiedCount || 1}" value="${summary.capacity}" data-capacity-input />
                  </label>
                  <button type="button" data-save-capacity>Salvar</button>
                </div>
              </div>

              <details class="admin-edit">
                <summary>Editar turma</summary>
                <form class="admin-edit-form" data-edit-workshop>
                  <label>Nome<input name="title" value="${esc(summary.title)}" required /></label>
                  <label class="admin-edit-form__wide">Descrição<input name="shortDescription" value="${esc(summary.short_description || '')}" /></label>
                  <label>Data<input name="eventDate" type="date" value="${esc(summary.event_date)}" required /></label>
                  <label>Início<input name="startTime" type="time" value="${esc(String(summary.start_time||'').slice(0,5))}" required /></label>
                  <label>Fim<input name="endTime" type="time" value="${esc(String(summary.end_time||'').slice(0,5))}" required /></label>
                  <label>Idade mínima<input name="minimumAge" type="number" min="0" value="${summary.minimum_age}" required /></label>
                  <label>Valor (R$)<input name="priceReais" value="${priceInput(summary.price_cents)}" required /></label>
                  <label>Capacidade<input name="capacity" type="number" min="${summary.occupiedCount || 1}" value="${summary.capacity}" required /></label>
                  <label>Status
                    <select name="status">${statusOptions.map(([value,label]) => `<option value="${value}" ${summary.status===value?'selected':''}>${label}</option>`).join('')}</select>
                  </label>
                  <button type="submit">Salvar alterações</button>
                  <p data-edit-error hidden></p>
                </form>
              </details>

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

              <div class="admin-registration-heading">
                <div><strong>Inscrições</strong><span>${summary.registrations.length} registros</span></div>
                <label>Filtrar
                  <select data-registration-filter>
                    <option value="all">Todos</option>
                    <option value="payment_reported">Pix efetuado</option>
                    <option value="confirmed">Confirmados</option>
                    <option value="pending_payment">Aguardando Pix</option>
                    <option value="cancelled">Cancelados</option>
                  </select>
                </label>
              </div>

              <div class="admin-registrations">
                ${summary.registrations.length ? summary.registrations.map(reg => `
                  <div class="admin-registration" data-registration-id="${esc(reg.id)}" data-registration-status="${esc(reg.status)}">
                    <div>
                      <strong>${esc(reg.child_name)}</strong>
                      <span>${esc(reg.responsible_name)}</span>
                      <a href="${esc(whatsappHref(reg.responsible_whatsapp))}" target="_blank" rel="noopener">WhatsApp: ${esc(reg.responsible_whatsapp)}</a>
                      <small>${esc(reg.responsible_email || '')}</small>
                      <small>Ref.: ${esc(reg.payment_reference || '')}</small>
                    </div>
                    <span class="admin-status admin-status--${esc(reg.status)}">${esc(statusLabel(reg.status))}</span>
                    <div class="admin-registration__actions">
                      <button type="button" data-confirm ${canConfirmRegistration(reg) ? '' : 'disabled'}>Confirmar</button>
                      <button type="button" data-cancel ${reg.status === 'cancelled' ? 'disabled' : ''}>Cancelar</button>
                    </div>
                  </div>`).join('') : '<p class="admin-empty">Nenhuma inscrição nesta turma.</p>'}
              </div>
            </article>`).join('')}
        </section>

        <section class="admin-panel admin-audit">
          <div class="admin-panel__heading">
            <div><span>HISTÓRICO</span><h2>Últimas alterações administrativas</h2></div>
            <p>Registro de criação e alterações de oficinas, vagas e status de inscrições.</p>
          </div>
          <div class="admin-audit-list">
            ${auditLog.length ? auditLog.slice(0,20).map(item => `
              <div class="admin-audit-item">
                <div><strong>${esc(auditActionLabel(item))}</strong><span>${esc(item.actor_email || 'Administrador')}</span></div>
                <time>${esc(new Date(item.created_at).toLocaleString('pt-BR'))}</time>
              </div>`).join('') : '<p class="admin-empty">Nenhuma alteração administrativa registrada ainda.</p>'}
          </div>
        </section>
      </main>`;

    root.querySelector('[data-logout]').addEventListener('click', async () => {
      try { await api.signOut(token); } catch { /* sessão local será encerrada mesmo assim */ }
      sessionStorage.removeItem('socializando-admin-token');
      sessionStorage.removeItem('socializando-admin-refresh-token');
      token = null;
      refreshToken = null;
      renderLogin();
    });

    root.querySelector('[data-new-workshop]').addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const errorNode = root.querySelector('[data-workshop-create-error]');
      errorNode.hidden = true;
      try {
        await api.createSession(buildNewWorkshop({
          title:data.get('title'),
          shortDescription:data.get('shortDescription'),
          eventDate:data.get('eventDate'),
          startTime:data.get('startTime'),
          endTime:data.get('endTime'),
          minimumAge:data.get('minimumAge'),
          priceReais:data.get('priceReais'),
          capacity:data.get('capacity'),
        }), token);
        await loadDashboard();
      } catch (error) {
        errorNode.textContent = error.message;
        errorNode.hidden = false;
      }
    });

    root.querySelector('[data-new-session]').addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const source = workshops.find(w => w.id === data.get('sourceId'));
      const errorNode = root.querySelector('[data-session-error]');
      errorNode.hidden = true;
      try {
        await api.createSession(buildNewSession(source, {
          eventDate:data.get('eventDate'),
          startTime:data.get('startTime'),
          endTime:data.get('endTime'),
          capacity:data.get('capacity')
        }), token);
        await loadDashboard();
      } catch (error) {
        errorNode.textContent = error.message;
        errorNode.hidden = false;
      }
    });

    root.querySelectorAll('.admin-workshop').forEach((card) => {
      const workshop = summaries.find(w => w.id === card.dataset.workshopId);

      card.querySelector('[data-registration-filter]').addEventListener('change', (event) => {
        const filter = event.target.value;
        card.querySelectorAll('[data-registration-id]').forEach((row) => {
          row.hidden = filter !== 'all' && row.dataset.registrationStatus !== filter;
        });
      });

      card.querySelector('[data-workshop-status]').addEventListener('change', async (event) => {
        try {
          await api.updateWorkshop(workshop.id, { status:event.target.value }, token);
          await loadDashboard();
        } catch (error) {
          alert(error.message);
        }
      });

      card.querySelector('[data-edit-workshop]').addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const errorNode = event.currentTarget.querySelector('[data-edit-error]');
        errorNode.hidden = true;
        try {
          const patch = buildWorkshopPatch({
            title:data.get('title'),
            shortDescription:data.get('shortDescription'),
            eventDate:data.get('eventDate'),
            startTime:data.get('startTime'),
            endTime:data.get('endTime'),
            minimumAge:data.get('minimumAge'),
            priceReais:data.get('priceReais'),
            capacity:data.get('capacity'),
            status:data.get('status'),
          }, workshop.occupiedCount);
          await api.updateWorkshop(workshop.id, patch, token);
          await loadDashboard();
        } catch (error) {
          errorNode.textContent = error.message;
          errorNode.hidden = false;
        }
      });

      card.addEventListener('click', async (event) => {
        const regNode = event.target.closest('[data-registration-id]');
        try {
          if (event.target.matches('[data-confirm]') && regNode) {
            await api.updateRegistrationStatus(regNode.dataset.registrationId, 'confirmed', token);
            await loadDashboard();
          } else if (event.target.matches('[data-cancel]') && regNode) {
            await api.updateRegistrationStatus(regNode.dataset.registrationId, 'cancelled', token);
            await loadDashboard();
          } else if (event.target.matches('[data-capacity-delta]')) {
            const capacity = adjustCapacity(workshop.capacity, Number(event.target.dataset.capacityDelta), workshop.occupiedCount);
            if (capacity !== Number(workshop.capacity)) {
              await api.updateWorkshop(workshop.id, { capacity }, token);
              await loadDashboard();
            }
          } else if (event.target.matches('[data-save-capacity]')) {
            const capacity = Number(card.querySelector('[data-capacity-input]').value);
            if (capacity < workshop.occupiedCount) {
              throw new Error('A capacidade não pode ser menor que o número de vagas já ocupadas.');
            }
            await api.updateWorkshop(workshop.id, { capacity }, token);
            await loadDashboard();
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
            await api.updateWorkshop(workshop.id, { image_url:publicUrl }, token);
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
      [workshops, registrations, auditLog] = await Promise.all([
        api.listWorkshops(token),
        api.listRegistrations(token),
        api.listAuditLog(token),
      ]);
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
