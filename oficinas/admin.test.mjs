import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summarizeWorkshops, canConfirmRegistration, buildNewSession, buildNewWorkshop, buildWorkshopPatch, adjustCapacity, filterRegistrations, getCanonicalArtworkRule, buildArtworkStoragePath, validateArtworkFileMeta, buildPublicArtworkUrl, createAdminApi, buildAdminRegistrationWhatsAppMessage, buildAdminRegistrationWhatsAppUrl } from './admin.js';

const workshops = [
  { id:'w1', experience_key:'expedicao-jurassica', slug:'expedicao-jurassica-2026-10-10', title:'Expedição Jurássica', event_date:'2026-10-10', start_time:'14:00:00', end_time:'15:30:00', minimum_age:5, age_label:'A partir de 5 anos', price_cents:5000, capacity:15, status:'open', image_url:'jurassica-10-out.jpeg' },
  { id:'w2', experience_key:'fabrica-dos-squishy-magicos', slug:'fabrica-dos-squishy-magicos-2026-10-10', title:'Fábrica dos Squishy Mágicos', event_date:'2026-10-10', start_time:'15:30:00', end_time:'17:00:00', minimum_age:5, age_label:'A partir de 5 anos', price_cents:5000, capacity:15, status:'open', image_url:'assets/oficinas/fabrica-squishy-magicos-2026-10-10.png' },
];
const regs = [
  { id:'r1', workshop_id:'w1', status:'confirmed', child_name:'A' },
  { id:'r2', workshop_id:'w1', status:'payment_reported', child_name:'B' },
  { id:'r3', workshop_id:'w1', status:'pending_payment', child_name:'C' },
  { id:'r4', workshop_id:'w1', status:'cancelled', child_name:'D' },
];

test('summarizeWorkshops computes occupied and available by turma', () => {
  const rows = summarizeWorkshops(workshops, regs);
  assert.equal(rows[0].confirmedCount, 1);
  assert.equal(rows[0].paymentReportedCount, 1);
  assert.equal(rows[0].pendingCount, 1);
  assert.equal(rows[0].occupiedCount, 2);
  assert.equal(rows[0].availableSpots, 13);
  assert.equal(rows[1].availableSpots, 15);
});

test('canConfirmRegistration permits payment_reported even when it already occupies the last spot', () => {
  const row = summarizeWorkshops(workshops, regs)[0];
  assert.equal(canConfirmRegistration(regs[1], row), true);
  assert.equal(canConfirmRegistration(regs[2], row), true);
  assert.equal(canConfirmRegistration(regs[0], row), false);
  assert.equal(canConfirmRegistration(regs[1], { ...row, availableSpots: 0 }), true);
  assert.equal(canConfirmRegistration(regs[2], { ...row, availableSpots: 0 }), false);
  assert.equal(canConfirmRegistration(regs[3], row), false);
});

test('buildNewSession reuses experience data but never reuses a date-stamped artwork for another date', () => {
  const result = buildNewSession(workshops[0], { eventDate:'2026-10-17', startTime:'14:00', endTime:'15:30', capacity:15 });
  assert.equal(result.experience_key, 'expedicao-jurassica');
  assert.equal(result.slug, 'expedicao-jurassica-2026-10-17');
  assert.equal(result.event_date, '2026-10-17');
  assert.equal(result.price_cents, 5000);
  assert.equal(result.capacity, 15);
  assert.equal(result.image_url, null);
});


test('canonical 10 October artwork rules are immutable and date-specific', () => {
  const jurassica = getCanonicalArtworkRule({
    experience_key: 'expedicao-jurassica',
    event_date: '2026-10-10',
  });
  assert.deepEqual(jurassica, {
    storagePath: 'expedicao-jurassica-2026-10-10-v2.webp',
    sha256: 'c0dacfae9358056a43bd2d3ee339c7734b8cafa755f3622c1edb9a418608bcf4',
    sizeBytes: 673534,
    mimeType: 'image/webp',
  });

  const future = getCanonicalArtworkRule({
    experience_key: 'expedicao-jurassica',
    event_date: '2026-10-17',
  });
  assert.equal(future, null);
});

test('storage path for a future artwork stays tied to its own turma date', () => {
  assert.equal(
    buildArtworkStoragePath(
      { experience_key:'expedicao-jurassica', event_date:'2026-10-17' },
      { name:'nova-arte.JPG', type:'image/jpeg' }
    ),
    'expedicao-jurassica-2026-10-17.jpeg'
  );
});

test('artwork file metadata rejects transformations or unexpected canonical bytes', () => {
  assert.throws(() => validateArtworkFileMeta(
    { name:'arte.webp', type:'image/webp', size:673533 },
    { experience_key:'expedicao-jurassica', event_date:'2026-10-10' }
  ), /arquivo original aprovado/i);

  assert.throws(() => validateArtworkFileMeta(
    { name:'arte.jpeg', type:'image/jpeg', size:673534 },
    { experience_key:'expedicao-jurassica', event_date:'2026-10-10' }
  ), /arte oficial aprovada/i);

  assert.doesNotThrow(() => validateArtworkFileMeta(
    { name:'arte.webp', type:'image/webp', size:673534 },
    { experience_key:'expedicao-jurassica', event_date:'2026-10-10' }
  ));
});

test('public artwork URL is deterministic and uses the public storage endpoint', () => {
  assert.equal(
    buildPublicArtworkUrl(
      'https://example.supabase.co',
      'expedicao-jurassica-2026-10-10-v2.webp'
    ),
    'https://example.supabase.co/storage/v1/object/public/workshop-artworks/expedicao-jurassica-2026-10-10-v2.webp'
  );
});


test('admin artwork controls have responsive visual treatment', () => {
  const css = readFileSync(new URL('./admin.css', import.meta.url), 'utf8');
  assert.match(css, /\.admin-artwork\s*\{[^}]*display\s*:\s*grid/i);
  assert.match(css, /\.admin-artwork__preview\s*\{[^}]*border-radius/i);
  assert.match(css, /\.admin-artwork__preview\s+img\s*\{[^}]*object-fit\s*:\s*contain/i);
  assert.match(css, /\.admin-artwork__controls\s*\{[^}]*display\s*:\s*grid/i);
  assert.match(css, /@media\s*\(max-width:\s*900px\)[\s\S]*?\.admin-artwork\s*\{[^}]*grid-template-columns\s*:\s*1fr/i);
});


test('admin login exchanges SOCIALIZANDO + password for a Supabase session without embedding the password', async () => {
  let request;
  const api = createAdminApi({
    config: { url:'https://example.supabase.co', anonKey:'sb_publishable_example' },
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok:true, status:200, async json(){ return { access_token:'jwt', refresh_token:'refresh' }; } };
    },
  });

  const session = await api.signInWithPassword('socializando', 'senha-fornecida-em-runtime');
  assert.equal(session.access_token, 'jwt');
  assert.match(request.url, /\/functions\/v1\/admin-login$/);
  assert.equal(request.options.headers.apikey, 'sb_publishable_example');
  assert.equal(request.options.headers.Authorization, undefined);
  const body = JSON.parse(request.options.body);
  assert.equal(body.username, 'SOCIALIZANDO');
  assert.equal(body.password, 'senha-fornecida-em-runtime');
});

test('admin login rejects any username other than SOCIALIZANDO before calling Supabase', async () => {
  let called = false;
  const api = createAdminApi({
    config: { url:'https://example.supabase.co', anonKey:'sb_publishable_example' },
    fetchImpl: async () => {
      called = true;
      return { ok:true, status:200, async json(){ return {}; } };
    },
  });

  await assert.rejects(() => api.signInWithPassword('OUTRO', 'senha'), /usuário ou senha inválidos/i);
  assert.equal(called, false);
});

test('admin session refresh uses the refresh token endpoint', async () => {
  let request;
  const api = createAdminApi({
    config: { url:'https://example.supabase.co', anonKey:'sb_publishable_example' },
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok:true, status:200, async json(){ return { access_token:'new-jwt', refresh_token:'new-refresh' }; } };
    },
  });

  const session = await api.refreshSession('refresh-123');
  assert.equal(session.access_token, 'new-jwt');
  assert.match(request.url, /grant_type=refresh_token$/);
  assert.equal(request.options.headers.Authorization, undefined);
  assert.deepEqual(JSON.parse(request.options.body), { refresh_token:'refresh-123' });
});


test('admin data API never falls back to the publishable key as Bearer', async () => {
  let called = false;
  const api = createAdminApi({
    config: { url:'https://example.supabase.co', anonKey:'sb_publishable_example' },
    fetchImpl: async () => { called = true; return { ok:true, status:200, async json(){ return []; } }; },
  });

  await assert.rejects(() => api.listWorkshops(''), /sessão administrativa inválida/i);
  assert.equal(called, false);
});


test('fabrica squishy canonical artwork uses the updated approved PNG exactly', () => {
  assert.deepEqual(getCanonicalArtworkRule({
    experience_key: 'fabrica-dos-squishy-magicos',
    event_date: '2026-10-10',
  }), {
    storagePath: 'fabrica-squishy-magicos-2026-10-10.png',
    sha256: '2ed21c9bd59f01659f5812d3d9a7a6574bdbb95cdf6b972dca558e9f61ecd339',
    sizeBytes: 3529499,
    mimeType: 'image/png',
  });
});


test('reported Pix is already counted as occupied in admin availability', () => {
  const workshops = [{ id:'w1', capacity:15, experience_key:'expedicao-jurassica' }];
  const registrations = [
    { workshop_id:'w1', status:'confirmed' },
    { workshop_id:'w1', status:'payment_reported' },
    { workshop_id:'w1', status:'pending_payment' },
  ];
  const row = summarizeWorkshops(workshops, registrations)[0];
  assert.equal(row.confirmedCount, 1);
  assert.equal(row.paymentReportedCount, 1);
  assert.equal(row.occupiedCount, 2);
  assert.equal(row.availableSpots, 13);
});

test('a payment_reported registration can still be confirmed when it already occupies the last spot', () => {
  const registration = { status:'payment_reported' };
  assert.equal(canConfirmRegistration(registration, { availableSpots:0 }), true);
});


test('buildNewWorkshop creates a fully manageable new experience', () => {
  const result = buildNewWorkshop({
    title: 'Laboratório dos Monstros',
    shortDescription: 'Uma nova experiência especial.',
    eventDate: '2026-10-24',
    startTime: '14:00',
    endTime: '15:30',
    minimumAge: 6,
    priceReais: '65,00',
    capacity: 18,
  });

  assert.equal(result.experience_key, 'laboratorio-dos-monstros');
  assert.equal(result.slug, 'laboratorio-dos-monstros-2026-10-24');
  assert.equal(result.title, 'Laboratório dos Monstros');
  assert.equal(result.short_description, 'Uma nova experiência especial.');
  assert.equal(result.event_date, '2026-10-24');
  assert.equal(result.start_time, '14:00');
  assert.equal(result.end_time, '15:30');
  assert.equal(result.minimum_age, 6);
  assert.equal(result.age_label, 'A partir de 6 anos');
  assert.equal(result.price_cents, 6500);
  assert.equal(result.capacity, 18);
  assert.equal(result.status, 'open');
  assert.equal(result.image_url, null);
});

test('adjustCapacity supports quick +1 +5 and never drops below occupied spots', () => {
  assert.equal(adjustCapacity(15, 1, 8), 16);
  assert.equal(adjustCapacity(15, 5, 8), 20);
  assert.equal(adjustCapacity(15, -1, 8), 14);
  assert.equal(adjustCapacity(8, -1, 8), 8);
  assert.equal(adjustCapacity(9, -5, 8), 8);
});

test('buildWorkshopPatch edits operational fields without changing experience identity', () => {
  const patch = buildWorkshopPatch({
    title: 'Expedição Jurássica Especial',
    shortDescription: 'Nova descrição.',
    eventDate: '2026-10-17',
    startTime: '16:00',
    endTime: '17:30',
    minimumAge: 5,
    priceReais: '55',
    capacity: 20,
    status: 'open',
  }, 9);

  assert.deepEqual(patch, {
    title: 'Expedição Jurássica Especial',
    short_description: 'Nova descrição.',
    event_date: '2026-10-17',
    start_time: '16:00',
    end_time: '17:30',
    minimum_age: 5,
    age_label: 'A partir de 5 anos',
    price_cents: 5500,
    capacity: 20,
    status: 'open',
  });

  assert.throws(() => buildWorkshopPatch({ capacity: 8, status:'open' }, 9), /vagas já ocupadas/i);
});

test('filterRegistrations supports operational status filters', () => {
  const registrations = [
    { id:'a', status:'pending_payment' },
    { id:'b', status:'payment_reported' },
    { id:'c', status:'confirmed' },
    { id:'d', status:'cancelled' },
  ];
  assert.equal(filterRegistrations(registrations, 'all').length, 4);
  assert.deepEqual(filterRegistrations(registrations, 'payment_reported').map(r => r.id), ['b']);
  assert.deepEqual(filterRegistrations(registrations, 'confirmed').map(r => r.id), ['c']);
  assert.deepEqual(filterRegistrations(registrations, 'pending_payment').map(r => r.id), ['a']);
  assert.deepEqual(filterRegistrations(registrations, 'cancelled').map(r => r.id), ['d']);
});

test('admin UI exposes separate actions for new workshop, new session and quick capacity controls', () => {
  const source = readFileSync(new URL('./admin.js', import.meta.url), 'utf8');
  assert.match(source, /data-new-workshop/);
  assert.match(source, /Criar nova oficina/);
  assert.match(source, /Abrir nova turma/);
  assert.match(source, /data-capacity-delta="1"/);
  assert.match(source, /data-capacity-delta="5"/);
  assert.match(source, /data-capacity-delta="-1"/);
  assert.match(source, /data-edit-workshop/);
  assert.match(source, /data-workshop-status/);
  assert.match(source, /data-registration-filter/);
});

test('admin API can read the audit log ordered newest first', async () => {
  let request;
  const api = createAdminApi({
    config: { url:'https://example.supabase.co', anonKey:'sb_publishable_example' },
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok:true, status:200, async json(){ return []; } };
    },
  });

  await api.listAuditLog('jwt-token');
  assert.match(request.url, /admin_audit_log\?select=\*&order=created_at\.desc/);
  assert.equal(request.options.headers.Authorization, 'Bearer jwt-token');
});


test('admin source has no Magic Link flow or embedded administrative password', () => {
  const source = readFileSync(new URL('./admin.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /requestMagicLink|readMagicLinkSession|\/auth\/v1\/otp|Magic Link/i);
  assert.match(source, /name="username"/);
  assert.match(source, /name="password"/);
  assert.match(source, /SOCIALIZANDO/);
  assert.doesNotMatch(source, /65ca77tieli1086/);
  assert.match(source, /\/functions\/v1\/admin-login/);
  assert.doesNotMatch(source, /gabrieldeblegd@gmail\.com/);
});


test('admin login surfaces backend authentication errors instead of generic HTTP status', async () => {
  const api = createAdminApi({
    config: { url:'https://example.supabase.co', anonKey:'sb_publishable_example' },
    fetchImpl: async () => ({
      ok:false,
      status:401,
      async json(){ return { error:'Usuário ou senha inválidos.' }; },
    }),
  });

  await assert.rejects(
    () => api.signInWithPassword('SOCIALIZANDO', 'senha-incorreta'),
    /Usuário ou senha inválidos\./
  );
});

test('manual confirmation is permitted from pending Pix when there is space, without bypassing capacity', () => {
  assert.equal(canConfirmRegistration({ status:'pending_payment' }, { availableSpots:1 }), true);
  assert.equal(canConfirmRegistration({ status:'pending_payment' }, { availableSpots:0 }), false);
  assert.equal(canConfirmRegistration({ status:'payment_reported' }, { availableSpots:0 }), true);
  assert.equal(canConfirmRegistration({ status:'confirmed' }, { availableSpots:3 }), false);
  assert.equal(canConfirmRegistration({ status:'cancelled' }, { availableSpots:3 }), false);
});

test('admin WhatsApp handoff carries all registration fields including age, birth date and notes', () => {
  const message = buildAdminRegistrationWhatsAppMessage({
    workshop: {
      title:'Expedição Jurássica',
      event_date:'2026-10-10',
      start_time:'14:00:00',
      end_time:'15:30:00',
    },
    registration: {
      responsible_name:'Maria da Silva',
      responsible_whatsapp:'53999999999',
      responsible_email:'maria@example.com',
      child_name:'João da Silva',
      child_age:7,
      child_birth_date:'2019-04-12',
      notes:'Alergia a amendoim',
      amount_cents:4500,
      payment_reference:'SJABC123',
      status:'pending_payment',
    },
  });
  for (const fragment of [
    'OFICINA: EXPEDIÇÃO JURÁSSICA',
    'Data: 10/10/2026',
    'Horário: 14:00 às 15:30',
    'Responsável: Maria da Silva',
    'WhatsApp: 53999999999',
    'E-mail: maria@example.com',
    'Criança: João da Silva',
    'Idade: 7 anos',
    'Data de nascimento: 12/04/2019',
    'Observações: Alergia a amendoim',
    'Valor: R$ 45,00',
    'Referência: SJABC123',
    'Situação: Aguardando Pix',
  ]) assert.ok(message.includes(fragment), `Campo ausente: ${fragment}`);
  assert.doesNotMatch(message, /public_token|SECRET-TOKEN/);
  assert.doesNotMatch(message, /pagamento confirmado/i);
});

test('admin WhatsApp link goes to the official Socializando account with complete content', () => {
  const url = buildAdminRegistrationWhatsAppUrl('5553999519569', {
    title:'Expedição Jurássica',
    event_date:'2026-10-10', start_time:'14:00',end_time:'15:30',
  }, {child_name:'Mariana',child_age:8,status:'confirmed',amount_cents:4500});
  assert.match(url, /^https:\/\/wa\.me\/5553999519569\?text=/);
  const message = decodeURIComponent(url.split('?text=')[1]);
  assert.match(message, /Idade: 8 anos/);
  assert.match(message, /Situação: Confirmada/);
});

test('admin UI displays full registration data and manual confirmation from awaiting Pix', () => {
  const source=readFileSync(new URL('./admin.js',import.meta.url),'utf8');
  for(const field of [
    'reg.child_age','reg.child_birth_date','reg.notes','reg.responsible_name',
    'reg.responsible_email','reg.responsible_whatsapp','reg.amount_cents',
    'reg.payment_reference','data-confirm','data-socializando-whatsapp',
  ]) assert.ok(source.includes(field),`Campo do cadastro ausente do painel: ${field}`);
  assert.match(source, /Confirmar manualmente/);
  assert.match(source, /canConfirmRegistration\(reg, summary\)/);
});
