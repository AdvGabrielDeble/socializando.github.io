import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
const checkout = readFileSync(new URL('../supabase/functions/pix-checkout/index.ts', import.meta.url), 'utf8');
const webhook = readFileSync(new URL('../supabase/functions/pix-webhook/index.ts', import.meta.url), 'utf8');

test('V5 keeps current workshops on manual Pix unless explicitly enabled', () => {
  assert.match(schema, /payment_mode text not null default 'manual_pix'/);
  assert.match(schema, /payment_mode in \('manual_pix','sicredi_api'\)/);
});

test('V5 creates reservation-aware payment ledger', () => {
  assert.match(schema, /create table if not exists public\.payment_transactions/);
  assert.match(schema, /provider_txid text not null/);
  assert.match(schema, /reservation_expires_at timestamptz/);
  assert.match(schema, /status in \('created','paid','expired','cancelled','failed','refunded','review'\)/);
});

test('V5 reserves atomically and only service role can invoke financial mutations', () => {
  assert.match(schema, /create or replace function public\.reserve_pix_registration/);
  assert.match(schema, /for update;/);
  assert.match(schema, /grant execute on function public\.reserve_pix_registration[\s\S]*to service_role/);
  assert.match(schema, /grant execute on function public\.record_pix_charge[\s\S]*to service_role/);
  assert.match(schema, /grant execute on function public\.confirm_pix_payment[\s\S]*to service_role/);
});

test('V5 public status query exposes only status metadata by token', () => {
  assert.match(schema, /create or replace function public\.get_public_registration_status/);
  assert.match(schema, /r\.id=p_registration_id and r\.public_token=p_public_token/);
  assert.match(schema, /grant execute on function public\.get_public_registration_status\(uuid,uuid\) to anon, authenticated/);
});

test('Sicredi checkout uses mTLS, OAuth client credentials and txid-defined Cob', () => {
  assert.match(checkout, /Deno\.createHttpClient\(\{ cert: cfg\.cert, key: cfg\.key \}\)/);
  assert.match(checkout, /api-pix\.sicredi\.com\.br/);
  assert.match(checkout, /api-pix-h\.sicredi\.com\.br/);
  assert.match(checkout, /grant_type: "client_credentials"/);
  assert.match(checkout, /\/api\/v2\/cob\/\$\{txid\}/);
  assert.match(checkout, /reserve_pix_registration/);
  assert.match(checkout, /record_pix_charge/);
});

test('Sicredi webhook reconciles against Sicredi before confirming locally', () => {
  assert.match(webhook, /SICREDI_PIX_WEBHOOK_TOKEN/);
  assert.match(webhook, /\/api\/v2\/pix\?\$\{query\.toString\(\)\}/);
  assert.match(webhook, /confirm_pix_payment/);
  assert.match(webhook, /moneyToCents\(verified\.valor\)/);
});

test('No bank credential is embedded in repository source', () => {
  for (const source of [checkout, webhook]) {
    assert.doesNotMatch(source, /clientSecret:\s*["'][^"']+["']/);
    assert.doesNotMatch(source, /BEGIN PRIVATE KEY/);
    assert.doesNotMatch(source, /BEGIN CERTIFICATE/);
  }
});
