export function summarizeWorkshops(workshops = [], registrations = []) {
  return workshops.map((workshop) => {
    const workshopRegistrations = registrations.filter((registration) => registration.workshop_id === workshop.id);
    const confirmedCount = workshopRegistrations.filter((registration) => registration.status === 'confirmed').length;
    const paymentReportedCount = workshopRegistrations.filter((registration) => registration.status === 'payment_reported').length;
    const pendingCount = workshopRegistrations.filter((registration) => registration.status === 'pending_payment').length;
    return {
      ...workshop,
      registrations: workshopRegistrations,
      confirmedCount,
      paymentReportedCount,
      pendingCount,
      availableSpots: Math.max(0, Number(workshop.capacity) - confirmedCount),
    };
  });
}

export function canConfirmRegistration(registration, workshopSummary) {
  return registration?.status === 'payment_reported' && Number(workshopSummary?.availableSpots) > 0;
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
    image_url: source.image_url ?? null,
  };
}

function createAdminApi({ config = globalThis.SOCIALIZANDO_SUPABASE, fetchImpl = globalThis.fetch } = {}) {
  const url = String(config?.url || '').replace(/\/$/, '');
  const anonKey = String(config?.anonKey || '').trim();
  if (!url || !anonKey) throw new Error('Configuração Supabase ainda não definida.');

  const parse = async (response) => {
    let body = null;
    try { body = await response.json(); } catch { body = null; }
    if (!response.ok) throw new Error(body?.message || body?.error_description || body?.hint || `Erro HTTP ${response.status}`);
    return body;
  };
  const authHeaders = (token) => ({ apikey: anonKey, Authorization: `Bearer ${token || anonKey}`, 'Content-Type': 'application/json' });

  return {
    async signIn(email, password) {
      const response = await fetchImpl(`${url}/auth/v1/token?grant_type=password`, {
        method: 'POST', headers: { apikey: anonKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await parse(response);
      if (!body?.access_token) throw new Error('Login administrativo inválido.');
      return body.access_token;
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
  let workshops = [];
  let registrations = [];

  const renderLogin = () => {
    root.innerHTML = `
      <section class="admin-login">
        <img src="../assets/logo-wordmark-large.png" alt="Socializando" />
        <h1>Gestão de oficinas</h1>
        <p>Acesso restrito à equipe.</p>
        <form data-login-form>
          <label>E-mail<input name="email" type="email" required autocomplete="username" /></label>
          <label>Senha<input name="password" type="password" required autocomplete="current-password" /></label>
          <button type="submit">Entrar</button>
          <p data-login-error hidden></p>
        </form>
      </section>`;
    root.querySelector('[data-login-form]').addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const errorNode = root.querySelector('[data-login-error]');
      errorNode.hidden = true;
      try {
        token = await api.signIn(data.get('email'), data.get('password'));
        sessionStorage.setItem('socializando-admin-token', token);
        await loadDashboard();
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
          <div class="admin-panel__heading"><div><span>NOVA TURMA</span><h2>Abrir outra data</h2></div><p>Reaproveita a mesma oficina, arte e valor; a nova turma ganha vagas e contador próprios.</p></div>
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
      sessionStorage.removeItem('socializando-admin-token'); token = null; renderLogin();
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
          }
        } catch (error) { alert(error.message); }
      });
    });
  };

  async function loadDashboard() {
    try {
      [workshops, registrations] = await Promise.all([api.listWorkshops(token), api.listRegistrations(token)]);
      renderDashboard();
    } catch (error) {
      sessionStorage.removeItem('socializando-admin-token'); token = null;
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
