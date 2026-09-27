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


test('authenticated admin has table privileges needed by the panel while anon does not', () => {
  assert.match(sql, /grant\s+select\s*,\s*insert\s*,\s*update\s+on\s+public\.workshops\s+to\s+authenticated/i);
  assert.match(sql, /grant\s+select\s*,\s*update\s+on\s+public\.registrations\s+to\s+authenticated/i);
  assert.match(sql, /revoke\s+all\s+on\s+public\.registrations\s+from\s+anon/i);
  assert.match(sql, /revoke\s+all\s+on\s+function\s+public\.is_workshop_admin\(\)\s+from\s+public/i);
});


test('PL/pgSQL output names do not collide with registration status columns', () => {
  const createFn = sql.match(/create\s+or\s+replace\s+function\s+public\.create_public_registration[\s\S]*?\$\$;/i)?.[0] || '';
  const reportFn = sql.match(/create\s+or\s+replace\s+function\s+public\.report_public_payment[\s\S]*?\$\$;/i)?.[0] || '';
  assert.match(createFn, /from\s+public\.registrations\s+r[\s\S]*?r\.status\s+in\s*\(\s*'payment_reported'\s*,\s*'confirmed'\s*\)/i);
  assert.match(reportFn, /update\s+public\.registrations\s+as\s+r[\s\S]*?r\.status\s*=\s*'pending_payment'/i);
});


test('public workshop SQL function uses a valid tagged dollar quote', () => {
  const fn = sql.match(/create\s+or\s+replace\s+function\s+public\.list_public_workshops[\s\S]*?(?=create\s+or\s+replace\s+function\s+public\.prevent_overbooking)/i)?.[0] || '';
  assert.match(fn, /as\s+\$sql\$/i);
  assert.match(fn, /\$sql\$;/i);
  assert.doesNotMatch(fn, /as\s+\$\s*\n/i);
});


test('public workshop SELECT applies only to anon while admin policies are action-specific', () => {
  assert.match(sql, /create\s+policy\s+"public can read open workshops"[\s\S]*?for\s+select\s+to\s+anon\s+using/i);
  assert.doesNotMatch(sql, /create\s+policy\s+"admins can manage workshops"[\s\S]*?for\s+all/i);
  assert.match(sql, /create\s+policy\s+"admins can select workshops"[\s\S]*?for\s+select\s+to\s+authenticated/i);
  assert.match(sql, /revoke\s+execute\s+on\s+function\s+public\.is_workshop_admin\(\)\s+from\s+anon/i);
});


test('public RPC grants do not extend to authenticated users', () => {
  assert.match(sql, /grant\s+execute\s+on\s+function\s+public\.list_public_workshops\(\)\s+to\s+anon\s*;/i);
  assert.match(sql, /grant\s+execute\s+on\s+function\s+public\.create_public_registration\([^;]+\)\s+to\s+anon\s*;/i);
  assert.match(sql, /grant\s+execute\s+on\s+function\s+public\.report_public_payment\(uuid,uuid\)\s+to\s+anon\s*;/i);
  assert.doesNotMatch(sql, /grant\s+execute\s+on\s+function\s+public\.(?:list_public_workshops|create_public_registration|report_public_payment)[^;]*to\s+[^;]*authenticated/i);
});


test('schema can be safely reapplied without duplicate admin policies', () => {
  assert.match(sql, /drop\s+policy\s+if\s+exists\s+"admins can select workshops"\s+on\s+public\.workshops/i);
  assert.match(sql, /drop\s+policy\s+if\s+exists\s+"admins can insert workshops"\s+on\s+public\.workshops/i);
  assert.match(sql, /drop\s+policy\s+if\s+exists\s+"admins can update workshops"\s+on\s+public\.workshops/i);
  assert.match(sql, /drop\s+policy\s+if\s+exists\s+"admins can delete workshops"\s+on\s+public\.workshops/i);
});


test('workshop artwork storage is public-read but admin-write', () => {
  assert.match(sql, /insert\s+into\s+storage\.buckets[\s\S]*?'workshop-artworks'[\s\S]*?true/i);
  assert.match(sql, /file_size_limit[\s\S]*?5242880/i);
  assert.match(sql, /allowed_mime_types[\s\S]*?image\/jpeg/i);
  assert.match(sql, /create\s+policy\s+"workshop admins can upload artworks"[\s\S]*?on\s+storage\.objects[\s\S]*?for\s+insert[\s\S]*?to\s+authenticated[\s\S]*?bucket_id\s*=\s*'workshop-artworks'[\s\S]*?public\.is_workshop_admin\(\)/i);
  assert.match(sql, /create\s+policy\s+"workshop admins can update artworks"[\s\S]*?for\s+update[\s\S]*?public\.is_workshop_admin\(\)/i);
  assert.match(sql, /create\s+policy\s+"workshop admins can delete artworks"[\s\S]*?for\s+delete[\s\S]*?public\.is_workshop_admin\(\)/i);
  assert.doesNotMatch(sql, /create\s+policy[^;]*storage\.objects[^;]*to\s+anon[^;]*(?:insert|update|delete)/is);
});


test('PUBLIC function execution is revoked before narrow grants', () => {
  assert.match(sql, /revoke\s+all\s+on\s+function\s+public\.list_public_workshops\(\)\s+from\s+public/i);
  assert.match(sql, /revoke\s+all\s+on\s+function\s+public\.create_public_registration\(uuid,text,text,text,text,integer,date,text\)\s+from\s+public/i);
  assert.match(sql, /revoke\s+all\s+on\s+function\s+public\.report_public_payment\(uuid,uuid\)\s+from\s+public/i);
  assert.match(sql, /grant\s+execute\s+on\s+function\s+public\.list_public_workshops\(\)\s+to\s+anon/i);
  assert.match(sql, /grant\s+execute\s+on\s+function\s+public\.create_public_registration\(uuid,text,text,text,text,integer,date,text\)\s+to\s+anon/i);
  assert.match(sql, /grant\s+execute\s+on\s+function\s+public\.report_public_payment\(uuid,uuid\)\s+to\s+anon/i);
});


test('admin email allowlist enables passwordless first access without exposing the list', () => {
  assert.match(sql, /create\s+table\s+if\s+not\s+exists\s+public\.admin_emails/i);
  assert.match(sql, /email\s+text\s+primary\s+key/i);
  assert.match(sql, /alter\s+table\s+public\.admin_emails\s+enable\s+row\s+level\s+security/i);
  assert.match(sql, /lower\s*\(\s*auth\.jwt\(\)\s*->>\s*'email'\s*\)/i);
  assert.match(sql, /from\s+public\.admin_emails/i);
  assert.doesNotMatch(sql, /create\s+policy[^;]*on\s+public\.admin_emails/is);
  assert.match(sql, /revoke\s+all\s+on\s+public\.admin_emails\s+from\s+anon\s*,\s*authenticated/i);
});


test('admin authorization SQL function uses a valid tagged dollar quote', () => {
  assert.match(sql, /create\s+or\s+replace\s+function\s+public\.is_workshop_admin\(\)[\s\S]*?as\s+\$admin\$[\s\S]*?\$admin\$;/i);
});


test('reported Pix occupies a workshop spot together with confirmed registrations', () => {
  assert.match(sql, /count\(r\.id\)\s+filter\s*\(where\s+r\.status\s+in\s*\(\s*'payment_reported'\s*,\s*'confirmed'\s*\)\s*\)/i);
  assert.match(sql, /greatest\([\s\S]*?w\.capacity\s*-\s*count\(r\.id\)\s+filter\s*\(where\s+r\.status\s+in\s*\(\s*'payment_reported'\s*,\s*'confirmed'\s*\)\s*\)/i);
});

test('capacity lock happens when a registration first enters an occupied payment state', () => {
  const fn = sql.match(/create\s+or\s+replace\s+function\s+public\.prevent_overbooking\(\)[\s\S]*?\$\$;/i)?.[0] || '';
  assert.match(fn, /new\.status\s+in\s*\(\s*'payment_reported'\s*,\s*'confirmed'\s*\)/i);
  assert.match(fn, /old\.status\s+not\s+in\s*\(\s*'payment_reported'\s*,\s*'confirmed'\s*\)/i);
  assert.match(fn, /status\s+in\s*\(\s*'payment_reported'\s*,\s*'confirmed'\s*\)/i);
  assert.match(fn, /for\s+update/i);
});


test('workshop availability view preserves its existing column contract during migration', () => {
  const view = sql.match(/create\s+or\s+replace\s+view\s+public\.workshop_availability[\s\S]*?group\s+by\s+w\.id\s*;/i)?.[0] || '';
  assert.match(view, /confirmed_count[\s\S]*?available_spots/i);
  assert.doesNotMatch(view, /confirmed_count[\s\S]*?occupied_count[\s\S]*?available_spots/i);
});
