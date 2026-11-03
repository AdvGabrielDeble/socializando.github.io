import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const path = 'assets/oficinas/fabrica-de-inventores-2026-12-05.jpeg';
const expectedHash = 'cfe3d5bc1c69e2e26779734d778b688df47d3b480d912bdf42e0f072fb1f191f';

test('Inventores 05/12: imagem original preservada e manifesto consistente', () => {
  const bytes = readFileSync(new URL('../' + path, import.meta.url));
  const manifest = JSON.parse(readFileSync(new URL('./artwork-manifest.json', import.meta.url), 'utf8'));
  const artwork = manifest.artworks.find(item => item.target_path === path);

  assert.equal(bytes.length, 358280);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), expectedHash);
  assert.equal(artwork?.sha256, expectedHash);
  assert.equal(artwork?.bytes, 358280);
  assert.equal(artwork?.experience_key, 'fabrica-de-inventores');
  assert.equal(artwork?.event_date, '2026-12-05');
  assert.equal(artwork?.mime_type, 'image/jpeg');
});

test('Pix: valor de cobrança por inscrição, não preço fixo de oficina', () => {
  const source = readFileSync(new URL('./public.js', import.meta.url), 'utf8');
  assert.match(source, /amountCents:\s*activeRegistration\.amountCents/);
  assert.doesNotMatch(source, /amountCents:\s*OFICINAS_CONFIG\.pix\.amountCents/);
});
