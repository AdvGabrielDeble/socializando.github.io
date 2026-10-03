import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { groupWorkshopSessions, buildWorkshopCardModel, buildPublicSessionCards, getModuleState, getExperienceTheme, buildWorkshopExperienceHtml, buildWorkshopWhatsAppMessage, buildWorkshopWhatsAppUrl } from './public.js';

const sessions = [
  {
    id: 'j1', experienceKey: 'expedicao-jurassica', slug: 'expedicao-jurassica-2026-10-10', title: 'Expedição Jurássica',
    shortDescription: 'Monte, explore e crie seu dinossauro!', eventDate: '2026-10-10', startTime: '14:00:00', endTime: '15:30:00',
    minimumAge: 5, ageLabel: 'A partir de 5 anos', priceCents: 5000, capacity: 15, status: 'open', imageUrl: 'jurassica.jpeg', availableSpots: 8,
  },
  {
    id: 'j2', experienceKey: 'expedicao-jurassica', slug: 'expedicao-jurassica-2026-10-17', title: 'Expedição Jurássica',
    shortDescription: 'Monte, explore e crie seu dinossauro!', eventDate: '2026-10-17', startTime: '14:00:00', endTime: '15:30:00',
    minimumAge: 5, ageLabel: 'A partir de 5 anos', priceCents: 5000, capacity: 15, status: 'open', imageUrl: 'jurassica.jpeg', availableSpots: 15,
  },
  {
    id: 's1', experienceKey: 'fabrica-dos-squishy-magicos', slug: 'fabrica-dos-squishy-magicos-2026-10-10', title: 'Fábrica dos Squishy Mágicos',
    shortDescription: 'Oficina de Paper Squishy especial do Dia das Crianças.', eventDate: '2026-10-10', startTime: '15:30:00', endTime: '17:00:00',
    minimumAge: 5, ageLabel: 'A partir de 5 anos', priceCents: 5000, capacity: 15, status: 'open', imageUrl: 'assets/oficinas/fabrica-squishy-magicos-2026-10-10.png', availableSpots: 1,
  },
];

test('groupWorkshopSessions groups a second turma by experience without duplicating experience', () => {
  const grouped = groupWorkshopSessions(sessions);
  assert.equal(grouped.length, 2);
  assert.equal(grouped[0].sessions.length, 2);
  assert.deepEqual(grouped[0].sessions.map(s => s.id), ['j1', 'j2']);
});

test('buildWorkshopCardModel exposes exact price age and availability labels', () => {
  const card = buildWorkshopCardModel(groupWorkshopSessions(sessions)[1]);
  assert.equal(card.priceLabel, 'R$ 50,00');
  assert.equal(card.ageLabel, 'A partir de 5 anos');
  assert.equal(card.sessions[0].availabilityLabel, 'Última vaga');
  assert.equal(card.sessions[0].canRegister, true);
});

test('sold out session disables registration', () => {
  const sold = { ...sessions[0], availableSpots: 0 };
  const card = buildWorkshopCardModel(groupWorkshopSessions([sold])[0]);
  assert.equal(card.sessions[0].availabilityLabel, 'Esgotada');
  assert.equal(card.sessions[0].canRegister, false);
});

test('module state is explicit when backend is unavailable', () => {
  assert.deepEqual(getModuleState({ loading: false, error: new Error('offline'), groups: [] }), {
    kind: 'unavailable', message: 'Inscrições online temporariamente indisponíveis.'
  });
});

test('empty successful list is not confused with backend failure', () => {
  assert.deepEqual(getModuleState({ loading: false, error: null, groups: [] }), {
    kind: 'empty', message: 'Nenhuma oficina com inscrições abertas neste momento.'
  });
});


test('public cards never reuse a date-stamped artwork across different session dates', () => {
  const dated = [
    { ...sessions[0], imageUrl: 'jurassica-10-out.jpeg' },
    { ...sessions[1], imageUrl: null },
  ];
  const cards = buildPublicSessionCards(dated);
  assert.equal(cards.length, 2);
  assert.equal(cards[0].sessions.length, 1);
  assert.equal(cards[0].imageUrl, 'jurassica-10-out.jpeg');
  assert.equal(cards[0].sessions[0].eventDate, '2026-10-10');
  assert.equal(cards[1].sessions.length, 1);
  assert.equal(cards[1].imageUrl, null);
  assert.equal(cards[1].sessions[0].eventDate, '2026-10-17');
});


test('experience themes integrate each artwork with the LP without modifying the source image', () => {
  assert.equal(getExperienceTheme('expedicao-jurassica').className, 'workshop-experience--jurassica');
  assert.equal(getExperienceTheme('fabrica-dos-squishy-magicos').className, 'workshop-experience--squish');
});

test('experience panel keeps multiple turmas together and artwork remains session-specific', () => {
  const grouped = groupWorkshopSessions([
    { ...sessions[0], imageUrl: 'assets/oficinas/expedicao-jurassica-2026-10-10-v2.webp' },
    { ...sessions[1], imageUrl: null },
  ]);
  const model = buildWorkshopCardModel(grouped[0]);
  assert.equal(model.sessions.length, 2);
  assert.equal(model.sessions[0].imageUrl, 'assets/oficinas/expedicao-jurassica-2026-10-10-v2.webp');
  assert.equal(model.sessions[1].imageUrl, null);
  assert.equal(model.activeArtworkUrl, 'assets/oficinas/expedicao-jurassica-2026-10-10-v2.webp');
});

test('experience HTML renders artwork as an integrated visual panel with a live availability bridge', () => {
  const model = buildWorkshopCardModel(groupWorkshopSessions([
    { ...sessions[0], imageUrl: 'assets/oficinas/expedicao-jurassica-2026-10-10-v2.webp' },
    { ...sessions[1], imageUrl: null },
  ])[0]);
  const html = buildWorkshopExperienceHtml(model);
  assert.match(html, /workshop-experience--jurassica/);
  assert.match(html, /workshop-experience__visual/);
  assert.match(html, /workshop-experience__art/);
  assert.match(html, /workshop-experience__availability/);
  assert.match(html, /data-workshop-art/);
  assert.match(html, /data-art-url=/);
  assert.match(html, /workshop-experience__content/);
  assert.match(html, /Turmas disponíveis/);
});


test('WhatsApp control message starts with the workshop name and includes form and payment data in order', () => {
  const message = buildWorkshopWhatsAppMessage({
    session: sessions[0],
    registration: {
      paymentReference: 'SJABC123',
      amountCents: 5000,
      registrationId: 'reg-1',
      publicToken: 'SECRET-TOKEN-NOT-SHARED',
    },
    formData: {
      responsibleName: 'Maria da Silva',
      responsibleWhatsapp: '53999999999',
      responsibleEmail: 'maria@example.com',
      childName: 'João da Silva',
      childAge: 7,
      childBirthDate: '2019-04-12',
      notes: 'Alergia informada pela responsável',
    },
  });

  const lines = message.split('\n');
  assert.equal(lines[0], '*OFICINA: EXPEDIÇÃO JURÁSSICA*');
  assert.match(message, /Data: 10\/10\/2026/);
  assert.match(message, /Horário: 14:00 às 15:30/);
  assert.match(message, /Responsável: Maria da Silva/);
  assert.match(message, /WhatsApp: 53999999999/);
  assert.match(message, /E-mail: maria@example\.com/);
  assert.match(message, /Criança: João da Silva/);
  assert.match(message, /Idade: 7 anos/);
  assert.match(message, /Data de nascimento: 12\/04\/2019/);
  assert.match(message, /Observações: Alergia informada pela responsável/);
  assert.match(message, /Pagamento: Pix efetuado — R\$ 50,00/);
  assert.match(message, /Referência: SJABC123/);
  assert.match(message, /Situação: vaga abatida no site — aguardando conferência do pagamento/);
  assert.doesNotMatch(message, /SECRET-TOKEN-NOT-SHARED/);
});

test('WhatsApp URL targets the official Socializando number with the complete encoded message', () => {
  const url = buildWorkshopWhatsAppUrl('5553999519569', 'Mensagem de controle');
  assert.equal(url, 'https://wa.me/5553999519569?text=Mensagem%20de%20controle');
});

test('reported payment step includes explicit WhatsApp control handoff', () => {
  const source = readFileSync(new URL('./public.js', import.meta.url), 'utf8');
  assert.match(source, /data-whatsapp-registration/);
  assert.match(source, /Enviar dados da inscrição no WhatsApp/);
  assert.match(source, /buildWorkshopWhatsAppUrl/);
});


test('dialog close control bypasses form validation and closes explicitly', () => {
  const source = readFileSync(new URL('./public.js', import.meta.url), 'utf8');
  assert.match(source, /class="workshop-dialog__close"[^>]*type="button"[^>]*data-close-workshop-dialog/i);
  assert.match(source, /querySelector\('\[data-close-workshop-dialog\]'\)\.addEventListener\('click',[\s\S]*?modal\.close\('cancel'\)/i);
});

test('reported Pix refreshes public availability before WhatsApp handoff', () => {
  const source = readFileSync(new URL('./public.js', import.meta.url), 'utf8');
  const reportBlock = source.match(/\[data-report-payment\][\s\S]*?catch \(error\)/i)?.[0] || '';
  assert.match(reportBlock, /await\s+api\.reportPayment/i);
  assert.match(reportBlock, /await\s+refreshWorkshops\(\)/i);
  assert.match(reportBlock, /data-whatsapp-registration/);
});

test('payment copy explains that reporting the Pix immediately consumes one available spot', () => {
  const source = readFileSync(new URL('./public.js', import.meta.url), 'utf8');
  assert.match(source, /Ao informar o Pix como efetuado, uma vaga será abatida imediatamente/i);
  assert.match(source, /Pagamento: Pix efetuado —/i);
});


test('gendered workshop targeting is absent from the public workshop sources', () => {
  const sources = [
    readFileSync(new URL('../index.html', import.meta.url), 'utf8'),
    readFileSync(new URL('./public.js', import.meta.url), 'utf8'),
    readFileSync(new URL('./seed.sql', import.meta.url), 'utf8'),
  ].join('\n');
  assert.doesNotMatch(sources, /para\s+(?:meninos|meninas)/i);
});
