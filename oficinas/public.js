import { createRuntimeWorkshopApi } from './api.js';
import { buildPixPayload, formatAvailabilityLabel } from './core.js';
import { OFICINAS_CONFIG } from './config.js';

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' });

export function groupWorkshopSessions(sessions = []) {
  const sorted = [...sessions].sort((a, b) => `${a.eventDate}T${a.startTime || '00:00'}`.localeCompare(`${b.eventDate}T${b.startTime || '00:00'}`));
  const groups = new Map();
  for (const session of sorted) {
    const key = session.experienceKey || session.slug;
    if (!groups.has(key)) {
      groups.set(key, {
        experienceKey: key,
        title: session.title,
        shortDescription: session.shortDescription,
        imageUrl: session.imageUrl,
        ageLabel: session.ageLabel,
        minimumAge: session.minimumAge,
        priceCents: session.priceCents,
        sessions: [],
      });
    }
    const group = groups.get(key);
    if (!group.imageUrl && session.imageUrl) group.imageUrl = session.imageUrl;
    group.sessions.push(session);
  }
  return [...groups.values()];
}

export function buildWorkshopCardModel(group) {
  return {
    experienceKey: group.experienceKey,
    title: group.title,
    shortDescription: group.shortDescription,
    imageUrl: group.imageUrl,
    ageLabel: group.ageLabel || `A partir de ${group.minimumAge} anos`,
    priceLabel: money.format((Number(group.priceCents) || 0) / 100),
    sessions: group.sessions.map((session) => ({
      ...session,
      dateLabel: dateFormatter.format(new Date(`${session.eventDate}T12:00:00Z`)),
      timeLabel: `${String(session.startTime || '').slice(0, 5)} às ${String(session.endTime || '').slice(0, 5)}`,
      availabilityLabel: formatAvailabilityLabel(session.availableSpots),
      canRegister: session.status === 'open' && Number(session.availableSpots) > 0,
    })),
  };
}

export function buildPublicSessionCards(sessions = []) {
  return [...sessions]
    .sort((a, b) => `${a.eventDate}T${a.startTime || '00:00'}`.localeCompare(`${b.eventDate}T${b.startTime || '00:00'}`))
    .map((session) => buildWorkshopCardModel({
      experienceKey: session.experienceKey || session.slug,
      title: session.title,
      shortDescription: session.shortDescription,
      imageUrl: session.imageUrl || null,
      ageLabel: session.ageLabel,
      minimumAge: session.minimumAge,
      priceCents: session.priceCents,
      sessions: [session],
    }));
}

export function getModuleState({ loading, error, groups }) {
  if (loading) return { kind: 'loading', message: 'Consultando oficinas e vagas...' };
  if (error) return { kind: 'unavailable', message: 'Inscrições online temporariamente indisponíveis.' };
  if (!groups?.length) return { kind: 'empty', message: 'Nenhuma oficina com inscrições abertas neste momento.' };
  return { kind: 'ready', message: '' };
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

function ensureSection() {
  let section = document.querySelector('#oficinas');
  if (section) return section;
  section = document.createElement('section');
  section.id = 'oficinas';
  section.className = 'section section--soft workshops-section';
  section.innerHTML = `
    <div class="container">
      <div class="section-heading section-heading--center reveal is-visible">
        <p class="eyebrow eyebrow--purple">Oficinas abertas</p>
        <h2>Experiências especiais do Socializando.</h2>
        <p>Escolha a oficina e a turma disponível. A vaga é confirmada após a conferência do pagamento via Pix.</p>
      </div>
      <div class="workshops-status" data-workshops-status>Consultando oficinas e vagas...</div>
      <div class="workshops-grid" data-workshops-grid></div>
    </div>
  `;
  const gallery = document.querySelector('#galeria');
  if (gallery) gallery.before(section); else document.querySelector('main')?.append(section);
  return section;
}

function ensureNavLink() {
  const nav = document.querySelector('.main-nav');
  if (!nav || nav.querySelector('a[href="#oficinas"]')) return;
  const link = document.createElement('a');
  link.href = '#oficinas';
  link.textContent = 'Oficinas';
  const temporada = nav.querySelector('a[href="#temporada"]');
  temporada?.after(link);
}

function sessionButton(session, selected) {
  const disabled = !session.canRegister;
  return `
    <button class="workshop-session ${selected ? 'is-selected' : ''}" type="button"
      data-session-id="${escapeHtml(session.id)}" ${disabled ? 'disabled' : ''}>
      <strong>${escapeHtml(session.dateLabel)}</strong>
      <span>${escapeHtml(session.timeLabel)}</span>
      <em>${escapeHtml(session.availabilityLabel)}</em>
    </button>`;
}

function cardHtml(model) {
  const firstAvailable = model.sessions.find((session) => session.canRegister) || model.sessions[0];
  const image = model.imageUrl ? `<img class="workshop-card__art" src="${escapeHtml(model.imageUrl)}" alt="Arte oficial da oficina ${escapeHtml(model.title)}" />` : '';
  return `
    <article class="workshop-card" data-experience="${escapeHtml(model.experienceKey)}">
      ${image}
      <div class="workshop-card__body">
        <div class="workshop-card__meta"><span>${escapeHtml(model.ageLabel)}</span><span>${escapeHtml(model.priceLabel)}</span></div>
        <h3>${escapeHtml(model.title)}</h3>
        <p>${escapeHtml(model.shortDescription)}</p>
        <div class="workshop-card__sessions" aria-label="Turmas disponíveis">
          ${model.sessions.map((session) => sessionButton(session, session.id === firstAvailable?.id)).join('')}
        </div>
        <button class="button button--primary workshop-register" type="button" data-register-session="${escapeHtml(firstAvailable?.id || '')}" ${firstAvailable?.canRegister ? '' : 'disabled'}>
          ${firstAvailable?.canRegister ? 'Garantir inscrição' : 'Turma esgotada'}
        </button>
      </div>
    </article>`;
}

function renderState(section, state, cards = []) {
  const status = section.querySelector('[data-workshops-status]');
  const grid = section.querySelector('[data-workshops-grid]');
  status.textContent = state.message;
  status.hidden = state.kind === 'ready';
  grid.innerHTML = state.kind === 'ready' ? cards.map(cardHtml).join('') : '';
}

function loadQrCodeLibrary() {
  if (globalThis.QRCode) return Promise.resolve(globalThis.QRCode);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-qrcode-lib]');
    if (existing) {
      existing.addEventListener('load', () => resolve(globalThis.QRCode), { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
    script.async = true;
    script.dataset.qrcodeLib = 'true';
    script.onload = () => resolve(globalThis.QRCode);
    script.onerror = () => reject(new Error('Não foi possível carregar o gerador de QR Code.'));
    document.head.append(script);
  });
}

function createModal() {
  const dialog = document.createElement('dialog');
  dialog.className = 'workshop-dialog';
  dialog.innerHTML = `
    <form method="dialog" class="workshop-dialog__shell" data-workshop-form>
      <button class="workshop-dialog__close" value="cancel" aria-label="Fechar">×</button>
      <div data-workshop-form-step="form">
        <p class="eyebrow eyebrow--purple">Inscrição</p>
        <h3 data-workshop-title></h3>
        <p class="workshop-dialog__session" data-workshop-session></p>
        <div class="workshop-form-grid">
          <label>Nome do responsável<input name="responsibleName" required minlength="3" autocomplete="name" /></label>
          <label>WhatsApp<input name="responsibleWhatsapp" required inputmode="tel" autocomplete="tel" /></label>
          <label>E-mail<input name="responsibleEmail" required type="email" autocomplete="email" /></label>
          <label>Nome da criança<input name="childName" required minlength="2" /></label>
          <label>Idade da criança<input name="childAge" required type="number" min="5" max="18" /></label>
          <label>Data de nascimento <span>(opcional)</span><input name="childBirthDate" type="date" /></label>
          <label class="workshop-form-grid__wide">Observações importantes <span>(opcional)</span><textarea name="notes" rows="3"></textarea></label>
        </div>
        <label class="workshop-consent"><input type="checkbox" required /> Li e estou ciente de que os dados serão usados para organizar a inscrição e a participação na oficina, nos termos da LGPD.</label>
        <p class="workshop-payment-warning">O cadastro não reserva a vaga. A vaga será confirmada somente após a equipe conferir o pagamento via Pix.</p>
        <button class="button button--primary" type="submit">Continuar para o Pix</button>
        <p class="workshop-form-error" data-workshop-error hidden></p>
      </div>
      <div data-workshop-form-step="pix" hidden>
        <p class="eyebrow eyebrow--purple">Pagamento via Pix</p>
        <h3>Finalize sua inscrição</h3>
        <p>Valor: <strong data-pix-amount></strong></p>
        <div class="workshop-qr" data-pix-qr></div>
        <label>Pix Copia e Cola<textarea readonly rows="5" data-pix-code></textarea></label>
        <div class="workshop-pix-actions">
          <button class="button button--ghost" type="button" data-copy-pix>Copiar Pix</button>
          <button class="button button--primary" type="button" data-report-payment>Já fiz o Pix</button>
        </div>
        <p class="workshop-payment-warning">Informar o pagamento não confirma automaticamente a vaga. A equipe fará a conferência e somente então a vaga será abatida.</p>
        <p class="workshop-form-error" data-pix-error hidden></p>
      </div>
      <div data-workshop-form-step="reported" hidden>
        <p class="eyebrow eyebrow--purple">Recebemos seu aviso</p>
        <h3>Pagamento aguardando conferência.</h3>
        <p>Assim que a equipe confirmar o Pix, sua inscrição ocupará uma das vagas da turma.</p>
        <button class="button button--primary" value="done">Fechar</button>
      </div>
    </form>`;
  document.body.append(dialog);
  return dialog;
}

async function initBrowserModule() {
  ensureNavLink();
  const section = ensureSection();
  renderState(section, getModuleState({ loading: true, error: null, groups: [] }));

  let api;
  let sessions = [];
  try {
    api = createRuntimeWorkshopApi();
    sessions = await api.listOpenWorkshops();
  } catch (error) {
    renderState(section, getModuleState({ loading: false, error, groups: [] }));
    return;
  }

  const cards = buildPublicSessionCards(sessions);
  renderState(section, getModuleState({ loading: false, error: null, groups: cards }), cards);
  if (!cards.length) return;

  const modal = createModal();
  const sessionById = new Map(sessions.map((session) => [session.id, session]));
  let activeSession = null;
  let activeRegistration = null;

  section.addEventListener('click', (event) => {
    const sessionButtonNode = event.target.closest('[data-session-id]');
    if (sessionButtonNode) {
      const card = sessionButtonNode.closest('.workshop-card');
      card.querySelectorAll('[data-session-id]').forEach((node) => node.classList.toggle('is-selected', node === sessionButtonNode));
      const registerButton = card.querySelector('[data-register-session]');
      registerButton.dataset.registerSession = sessionButtonNode.dataset.sessionId;
      registerButton.disabled = sessionButtonNode.disabled;
      registerButton.textContent = sessionButtonNode.disabled ? 'Turma esgotada' : 'Garantir inscrição';
      return;
    }

    const registerButton = event.target.closest('[data-register-session]');
    if (!registerButton || registerButton.disabled) return;
    activeSession = sessionById.get(registerButton.dataset.registerSession);
    if (!activeSession) return;
    modal.querySelector('[data-workshop-title]').textContent = activeSession.title;
    modal.querySelector('[data-workshop-session]').textContent = `${dateFormatter.format(new Date(`${activeSession.eventDate}T12:00:00Z`))} · ${String(activeSession.startTime).slice(0,5)} às ${String(activeSession.endTime).slice(0,5)} · ${activeSession.ageLabel}`;
    modal.querySelector('[name="childAge"]').min = String(activeSession.minimumAge || 5);
    modal.showModal();
  });

  const form = modal.querySelector('[data-workshop-form]');
  form.addEventListener('submit', async (event) => {
    if (event.submitter?.value === 'cancel' || event.submitter?.value === 'done') return;
    event.preventDefault();
    const errorNode = modal.querySelector('[data-workshop-error]');
    errorNode.hidden = true;
    const data = new FormData(form);
    try {
      activeRegistration = await api.createRegistration({
        workshopId: activeSession.id,
        responsibleName: data.get('responsibleName'),
        responsibleWhatsapp: data.get('responsibleWhatsapp'),
        responsibleEmail: data.get('responsibleEmail'),
        childName: data.get('childName'),
        childAge: data.get('childAge'),
        childBirthDate: data.get('childBirthDate'),
        notes: data.get('notes'),
      });
      const payload = buildPixPayload({
        key: OFICINAS_CONFIG.pix.key,
        amountCents: activeRegistration.amountCents,
        merchantName: OFICINAS_CONFIG.pix.merchantName,
        merchantCity: OFICINAS_CONFIG.pix.merchantCity,
        txid: activeRegistration.paymentReference,
      });
      modal.querySelector('[data-pix-amount]').textContent = money.format(activeRegistration.amountCents / 100);
      modal.querySelector('[data-pix-code]').value = payload;
      modal.querySelector('[data-workshop-form-step="form"]').hidden = true;
      modal.querySelector('[data-workshop-form-step="pix"]').hidden = false;
      const qrHost = modal.querySelector('[data-pix-qr]');
      qrHost.innerHTML = '';
      try {
        const QRCodeLib = await loadQrCodeLibrary();
        new QRCodeLib(qrHost, { text: payload, width: 210, height: 210, correctLevel: QRCodeLib.CorrectLevel?.M });
      } catch {
        qrHost.textContent = 'Use o Pix Copia e Cola abaixo.';
      }
    } catch (error) {
      errorNode.textContent = error.message || 'Não foi possível concluir o cadastro.';
      errorNode.hidden = false;
    }
  });

  modal.querySelector('[data-copy-pix]').addEventListener('click', async () => {
    const code = modal.querySelector('[data-pix-code]').value;
    await navigator.clipboard.writeText(code);
    modal.querySelector('[data-copy-pix]').textContent = 'Pix copiado';
  });

  modal.querySelector('[data-report-payment]').addEventListener('click', async () => {
    const errorNode = modal.querySelector('[data-pix-error]');
    errorNode.hidden = true;
    try {
      await api.reportPayment(activeRegistration.registrationId, activeRegistration.publicToken);
      modal.querySelector('[data-workshop-form-step="pix"]').hidden = true;
      modal.querySelector('[data-workshop-form-step="reported"]').hidden = false;
    } catch (error) {
      errorNode.textContent = error.message || 'Não foi possível informar o pagamento.';
      errorNode.hidden = false;
    }
  });

  modal.addEventListener('close', () => {
    form.reset();
    activeRegistration = null;
    modal.querySelector('[data-workshop-form-step="form"]').hidden = false;
    modal.querySelector('[data-workshop-form-step="pix"]').hidden = true;
    modal.querySelector('[data-workshop-form-step="reported"]').hidden = true;
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initBrowserModule, { once: true });
  else initBrowserModule();
}
