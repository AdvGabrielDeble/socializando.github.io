import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');

test('schema supports multiple sessions of one experience', () => {
  assert.match(sql, /experience_key\s+text\s+not\s+null/i);
});

test('registrations have public token but no public SELECT policy', () => {
  assert.match(sql, /public_token\s+uuid\s+not\s+null\s+default\s+gen_random_uuid\(\)/i);
  assert.doesNotMatch(sql, /create\s+policy[^;]*public[^;]*on\s+public\.registrations[^;]*for\s+select/is);
});

test('public registration is created through security definer RPC', () => {
  assert.match(sql, /create\s+or\s+replace\s+function\s+public\.create_public_registration/i);
  assert.match(sql, /security\s+definer/i);
  assert.doesNotMatch(sql, /create\s+policy[^;]*on\s+public\.registrations[^;]*for\s+insert[^;]*to\s+anon/is);
});

test('report payment requires registration id and public token and is idempotent', () => {
  assert.match(sql, /report_public_payment\s*\(\s*p_registration_id\s+uuid\s*,\s*p_public_token\s+uuid\s*\)/i);
  assert.match(sql, /status\s*=\s*'payment_reported'/i);
  assert.match(sql, /status\s*=\s*'pending_payment'/i);
});

test('confirmation still locks workshop capacity', () => {
  assert.match(sql, /for\s+update/i);
  assert.match(sql, /Oficina sem vagas disponíveis/i);
});

test('only authenticated admins can list and update registrations', () => {
  assert.match(sql, /create\s+table\s+if\s+not\s+exists\s+public\.admin_users/i);
  assert.match(sql, /is_workshop_admin\s*\(/i);
  assert.match(sql, /for\s+select\s+to\s+authenticated\s+using\s*\(public\.is_workshop_admin\(\)\)/i);
  assert.match(sql, /for\s+update\s+to\s+authenticated\s+using\s*\(public\.is_workshop_admin\(\)\)/i);
});


test('public availability is exposed by safe RPC without registration table access', () => {
  assert.match(sql, /create\s+or\s+replace\s+function\s+public\.list_public_workshops\s*\(\s*\)/i);
  assert.match(sql, /grant\s+execute\s+on\s+function\s+public\.list_public_workshops\(\)\s+to\s+anon/i);
  assert.doesNotMatch(sql, /grant\s+select\s+on\s+public\.workshop_availability\s+to\s+anon/i);
});
