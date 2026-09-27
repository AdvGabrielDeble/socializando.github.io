import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

test('canonical workshop artwork is displayed without cropping or forced ratio', () => {
  const match = css.match(/\.workshop-card__art\s*\{([^}]*)\}/s);
  assert.ok(match, 'workshop artwork style must exist');
  const rules = match[1];
  assert.doesNotMatch(rules, /object-fit\s*:\s*cover/i);
  assert.doesNotMatch(rules, /aspect-ratio\s*:/i);
  assert.match(rules, /object-fit\s*:\s*contain/i);
  assert.match(rules, /height\s*:\s*auto/i);
});
