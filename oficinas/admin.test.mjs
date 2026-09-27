import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeWorkshops, canConfirmRegistration, buildNewSession } from './admin.js';

const workshops = [
  { id:'w1', experience_key:'expedicao-jurassica', slug:'expedicao-jurassica-2026-10-10', title:'Expedição Jurássica', event_date:'2026-10-10', start_time:'14:00:00', end_time:'15:30:00', minimum_age:5, age_label:'A partir de 5 anos', price_cents:5000, capacity:15, status:'open', image_url:'jurassica.jpeg' },
  { id:'w2', experience_key:'fabrica-dos-squishs-magicos', slug:'fabrica-dos-squishs-magicos-2026-10-10', title:'Fábrica dos Squishs Mágicos', event_date:'2026-10-10', start_time:'15:30:00', end_time:'17:00:00', minimum_age:5, age_label:'A partir de 5 anos', price_cents:5000, capacity:15, status:'open', image_url:'squish.jpeg' },
];
const regs = [
  { id:'r1', workshop_id:'w1', status:'confirmed', child_name:'A' },
  { id:'r2', workshop_id:'w1', status:'payment_reported', child_name:'B' },
  { id:'r3', workshop_id:'w1', status:'pending_payment', child_name:'C' },
  { id:'r4', workshop_id:'w1', status:'cancelled', child_name:'D' },
];

test('summarizeWorkshops computes confirmed and available by turma', () => {
  const rows = summarizeWorkshops(workshops, regs);
  assert.equal(rows[0].confirmedCount, 1);
  assert.equal(rows[0].paymentReportedCount, 1);
  assert.equal(rows[0].pendingCount, 1);
  assert.equal(rows[0].availableSpots, 14);
  assert.equal(rows[1].availableSpots, 15);
});

test('canConfirmRegistration only permits payment_reported while capacity remains', () => {
  const row = summarizeWorkshops(workshops, regs)[0];
  assert.equal(canConfirmRegistration(regs[1], row), true);
  assert.equal(canConfirmRegistration(regs[2], row), false);
  assert.equal(canConfirmRegistration(regs[0], row), false);
  assert.equal(canConfirmRegistration(regs[1], { ...row, availableSpots: 0 }), false);
});

test('buildNewSession reuses experience data but creates independent date and slug', () => {
  const result = buildNewSession(workshops[0], { eventDate:'2026-10-17', startTime:'14:00', endTime:'15:30', capacity:15 });
  assert.equal(result.experience_key, 'expedicao-jurassica');
  assert.equal(result.slug, 'expedicao-jurassica-2026-10-17');
  assert.equal(result.event_date, '2026-10-17');
  assert.equal(result.price_cents, 5000);
  assert.equal(result.capacity, 15);
  assert.equal(result.image_url, 'jurassica.jpeg');
});
