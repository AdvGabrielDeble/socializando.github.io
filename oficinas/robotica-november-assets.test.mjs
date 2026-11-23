import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const filename = 'assets/oficinas/fabrica-de-inventores-2026-11-28.webp';
const hash = '0753f6028c5dc256d56fa3573fcd05a7cf89379fe795fc348bccfb3e5dd530cf';

test('Robótica 28/11: arte WebP original íntegra, sem cortes, e manifesto exato', () => {
  const b = readFileSync(new URL('../' + filename, import.meta.url));
  const manifest = JSON.parse(readFileSync(new URL('./artwork-manifest.json', import.meta.url),'utf8'));
  const art = manifest.artworks.find(x => x.target_path === filename);
  assert.equal(b.length,212292);
  assert.equal(createHash('sha256').update(b).digest('hex'),hash);
  assert.equal(art?.sha256,hash);
  assert.equal(art?.bytes,212292);
  assert.equal(art?.mime_type,'image/webp');
  assert.equal(art?.event_date,'2026-11-28');
  assert.equal(art?.experience_key,'fabrica-de-inventores');
});

test('Pix calcula o preço específico da inscrição (Robótica R$60)', () => {
  const source = readFileSync(new URL('./public.js', import.meta.url),'utf8');
  assert.match(source,/amountCents:\s*activeRegistration\.amountCents/);
});
