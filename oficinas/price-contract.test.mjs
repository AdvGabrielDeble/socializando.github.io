import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const config = readFileSync(new URL('./config.js', import.meta.url), 'utf8');
const seed = readFileSync(new URL('./seed.sql', import.meta.url), 'utf8');
const admin = readFileSync(new URL('./admin.js', import.meta.url), 'utf8');

test('approved workshop price is R$ 45,00 in every operational default', () => {
  assert.match(config, /amountCents:\s*4500/);
  assert.doesNotMatch(config, /amountCents:\s*5000/);

  const initialPriceMatches = [...seed.matchAll(/\n\s*4500,\n\s*15,/g)];
  assert.equal(initialPriceMatches.length, 2);
  assert.doesNotMatch(seed, /\n\s*5000,\n\s*15,/);

  assert.match(admin, /name="priceReais"[^>]*value="45,00"/);
  assert.doesNotMatch(admin, /name="priceReais"[^>]*value="50,00"/);
});
