import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkshopApi } from './api.js';

function response(data, ok = true, status = 200) {
  return { ok, status, async json() { return data; } };
}

test('listOpenWorkshops maps safe RPC availability without inventing spots', async () => {
  const calls = [];
  const api = createWorkshopApi({
    supabaseUrl: 'https://example.supabase.co',
    supabaseAnonKey: 'anon-key',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return response([{
        id: 'w1', experience_key: 'expedicao-jurassica', slug: 'expedicao-jurassica-2026-10-10',
        title: 'Expedição Jurássica', event_date: '2026-10-10', start_time: '14:00:00', end_time: '15:30:00',
        minimum_age: 5, age_label: 'A partir de 5 anos', price_cents: 5000, capacity: 15,
        status: 'open', image_url: null, confirmed_count: 7, available_spots: 8,
      }]);
    },
  });

  const result = await api.listOpenWorkshops();
  assert.equal(result[0].experienceKey, 'expedicao-jurassica');
  assert.equal(result[0].availableSpots, 8);
  assert.equal(result[0].priceCents, 5000);
  assert.match(calls[0].url, /rpc\/list_public_workshops$/);
});

test('createRegistration sends only RPC registration payload', async () => {
  let request;
  const api = createWorkshopApi({
    supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'anon-key',
    fetchImpl: async (url, options) => {
      request = { url, options };
      return response([{ registration_id: 'r1', public_token: 't1', amount_cents: 5000, payment_reference: 'SJABC', status: 'pending_payment' }]);
    },
  });
  const result = await api.createRegistration({
    workshopId: 'w1', responsibleName: 'Maria Silva', responsibleWhatsapp: '53999999999', responsibleEmail: 'maria@example.com',
    childName: 'Ana', childAge: 7, childBirthDate: null, notes: 'Sem observações',
  });
  assert.match(request.url, /rpc\/create_public_registration$/);
  const body = JSON.parse(request.options.body);
  assert.equal(body.p_workshop_id, 'w1');
  assert.equal(body.p_child_age, 7);
  assert.equal(result.registrationId, 'r1');
  assert.equal(result.publicToken, 't1');
});

test('reportPayment sends registration id and public token', async () => {
  let body;
  const api = createWorkshopApi({
    supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'anon-key',
    fetchImpl: async (_url, options) => {
      body = JSON.parse(options.body);
      return response([{ status: 'payment_reported', payment_reported_at: '2026-09-26T22:00:00Z' }]);
    },
  });
  const result = await api.reportPayment('r1', 't1');
  assert.deepEqual(body, { p_registration_id: 'r1', p_public_token: 't1' });
  assert.equal(result.status, 'payment_reported');
});

test('missing Supabase configuration fails closed', () => {
  assert.throws(() => createWorkshopApi({ supabaseUrl: '', supabaseAnonKey: '' }), /Configuração do módulo de oficinas indisponível/);
});

test('backend error is propagated and never replaced by fake availability', async () => {
  const api = createWorkshopApi({
    supabaseUrl: 'https://example.supabase.co', supabaseAnonKey: 'anon-key',
    fetchImpl: async () => response({ message: 'backend offline' }, false, 503),
  });
  await assert.rejects(() => api.listOpenWorkshops(), /backend offline/);
});
