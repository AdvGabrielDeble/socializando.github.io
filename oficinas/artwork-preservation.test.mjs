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


test('integrated artwork panel preserves natural dimensions and uses a split LP composition', () => {
  const panel = css.match(/\.workshop-experience\s*\{([^}]*)\}/s);
  assert.ok(panel, 'integrated experience panel style must exist');
  assert.match(panel[1], /grid-template-columns\s*:/i);

  const art = css.match(/\.workshop-experience__art\s*\{([^}]*)\}/s);
  assert.ok(art, 'integrated artwork style must exist');
  assert.doesNotMatch(art[1], /object-fit\s*:\s*cover/i);
  assert.doesNotMatch(art[1], /aspect-ratio\s*:/i);
  assert.match(art[1], /object-fit\s*:\s*contain/i);
  assert.match(art[1], /height\s*:\s*auto/i);
});

test('mobile composition remains vertical without cropping the artwork', () => {
  assert.match(css, /@media\s*\(max-width:\s*840px\)[\s\S]*?\.workshop-experience\s*\{[^}]*grid-template-columns\s*:\s*1fr/i);
});
