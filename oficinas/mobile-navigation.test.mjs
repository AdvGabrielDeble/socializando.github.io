import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
const script = readFileSync(new URL('../script.js', import.meta.url), 'utf8');

test('mobile header has an explicit menu toggle controlling the existing main navigation', () => {
  assert.match(html, /class="mobile-nav-toggle"/i);
  assert.match(html, /data-nav-toggle/i);
  assert.match(html, /aria-controls="main-nav"/i);
  assert.match(html, /aria-expanded="false"/i);
  assert.match(html, /<nav[^>]+class="main-nav"[^>]+id="main-nav"/i);
});

test('mobile navigation can reveal all approved LP links instead of hiding them permanently', () => {
  assert.match(css, /@media\s*\(max-width:\s*840px\)[\s\S]*?\.main-nav\.is-open\s*\{[^}]*display\s*:\s*grid/i);
  assert.match(css, /\.mobile-nav-toggle\s*\{/i);
  assert.match(script, /setupMobileNavigation/);
  assert.match(script, /data-nav-toggle/);
  assert.match(script, /aria-expanded/);
});

test('mobile navigation closes after choosing a section', () => {
  assert.match(script, /querySelectorAll\(["']a\[href\^=/);
  assert.match(script, /classList\.remove\(["']is-open["']\)/);
});


test('v4.6.1 cache-busts changed CSS, site JS and workshop JS on publication', () => {
  assert.match(html, /styles\.css\?v=461/);
  assert.match(html, /script\.js\?v=461/);
  assert.match(html, /oficinas\/supabase-config\.js\?v=461/);
  assert.match(html, /oficinas\/public\.js\?v=462/);
});
