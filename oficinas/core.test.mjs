import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateAvailableSpots,
  formatAvailabilityLabel,
  buildPixPayload,
  crc16Ccitt,
} from './core.js';

test('calculateAvailableSpots returns remaining confirmed capacity', () => {
  assert.equal(calculateAvailableSpots(15, 0), 15);
  assert.equal(calculateAvailableSpots(15, 15), 0);
  assert.equal(calculateAvailableSpots(15, 18), 0);
});

test('formatAvailabilityLabel uses exact public labels', () => {
  assert.equal(formatAvailabilityLabel(0), 'Esgotada');
  assert.equal(formatAvailabilityLabel(1), 'Última vaga');
  assert.equal(formatAvailabilityLabel(2), '2 vagas disponíveis');
  assert.equal(formatAvailabilityLabel(15), '15 vagas disponíveis');
});

test('buildPixPayload builds deterministic BR Code for direct CNPJ Pix', () => {
  const payload = buildPixPayload({
    key: '59.380.867/0001-62',
    amountCents: 5000,
    merchantName: 'SOCIALIZANDO',
    merchantCity: 'BAGÉ',
    txid: 'SJ-ABC123',
  });

  assert.match(payload, /^000201/);
  assert.match(payload, /BR\.GOV\.BCB\.PIX/);
  assert.match(payload, /59380867000162/);
  assert.match(payload, /540550\.00/);
  assert.match(payload, /SOCIALIZANDO/);
  assert.match(payload, /BAGE/);
  assert.match(payload, /ABC123/);
  assert.match(payload, /6304[0-9A-F]{4}$/);

  const body = payload.slice(0, -4);
  const crc = payload.slice(-4);
  assert.equal(crc16Ccitt(body), crc);
});

test('buildPixPayload sanitizes TXID to uppercase alphanumeric max 25 chars', () => {
  const payload = buildPixPayload({
    key: '59.380.867/0001-62',
    amountCents: 5000,
    merchantName: 'Socializando',
    merchantCity: 'Bagé',
    txid: 'inscrição-1234567890-abcdef-XYZ',
  });
  const additionalData = payload.match(/62\d{2}(.*?)6304/)[1];
  const txid = additionalData.match(/05\d{2}([A-Z0-9]+)/)[1];
  assert.ok(txid.length <= 25);
  assert.match(txid, /^[A-Z0-9]+$/);
});
