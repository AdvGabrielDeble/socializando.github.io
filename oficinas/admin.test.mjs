import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summarizeWorkshops, canConfirmRegistration, buildNewSession, getCanonicalArtworkRule, buildArtworkStoragePath, validateArtworkFileMeta, buildPublicArtworkUrl } from './admin.js';

const workshops = [
  { id:'w1', experience_key:'expedicao-jurassica', slug:'expedicao-jurassica-2026-10-10', title:'Expedição Jurássica', event_date:'2026-10-10', start_time:'14:00:00', end_time:'15:30:00', minimum_age:5, age_label:'A partir de 5 anos', price_cents:5000, capacity:15, status:'open', image_url:'jurassica-10-out.jpeg' },
  { id:'w2', experience_key:'fabrica-dos-squishs-magicos', slug:'fabrica-dos-squishs-magicos-2026-10-10', title:'Fábrica dos Squishs Mágicos', event_date:'2026-10-10', start_time:'15:30:00', end_time:'17:00:00', minimum_age:5, age_label:'A partir de 5 anos', price_cents:5000, capacity:15, status:'open', image_url:'squish-10-out.jpeg' },
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
    storagePath: 'expedicao-jurassica-2026-10-10.jpeg',
    sha256: 'b0727c5769961fb392a43eeab70eaaf394e5efeb72202455b8b82bfa6f03f132',
    sizeBytes: 479180,
    mimeType: 'image/jpeg',
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
    { name:'arte.jpeg', type:'image/jpeg', size:479179 },
    { experience_key:'expedicao-jurassica', event_date:'2026-10-10' }
  ), /arquivo original aprovado/i);

  assert.throws(() => validateArtworkFileMeta(
    { name:'arte.png', type:'image/png', size:479180 },
    { experience_key:'expedicao-jurassica', event_date:'2026-10-10' }
  ), /JPEG original aprovado/i);

  assert.doesNotThrow(() => validateArtworkFileMeta(
    { name:'arte.jpeg', type:'image/jpeg', size:479180 },
    { experience_key:'expedicao-jurassica', event_date:'2026-10-10' }
  ));
});

test('public artwork URL is deterministic and uses the public storage endpoint', () => {
  assert.equal(
    buildPublicArtworkUrl(
      'https://example.supabase.co',
      'expedicao-jurassica-2026-10-10.jpeg'
    ),
    'https://example.supabase.co/storage/v1/object/public/workshop-artworks/expedicao-jurassica-2026-10-10.jpeg'
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
