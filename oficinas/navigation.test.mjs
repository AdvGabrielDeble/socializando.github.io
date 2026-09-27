import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('top navigation contains Oficinas in the approved order', () => {
  const nav = html.match(/<nav class="main-nav"[^>]*>([\s\S]*?)<\/nav>/i);
  assert.ok(nav, 'main navigation must exist');

  const labels = [...nav[1].matchAll(/<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/g)]
    .map(([, href, label]) => ({ href, label: label.trim() }));

  assert.deepEqual(labels, [
    { href: '#projeto', label: 'Projeto' },
    { href: '#habilidades', label: 'Habilidades' },
    { href: '#temporada', label: 'Temporada' },
    { href: '#oficinas', label: 'Oficinas' },
    { href: '#galeria', label: 'Galeria' },
    { href: '#duvidas', label: 'Dúvidas' },
  ]);
});


test('workshop section is statically integrated between Temporada and Galeria', () => {
  const temporada = html.indexOf('id="temporada"');
  const oficinas = html.indexOf('id="oficinas"');
  const galeria = html.indexOf('id="galeria"');

  assert.ok(temporada >= 0, 'Temporada section must exist');
  assert.ok(oficinas > temporada, 'Oficinas must come after Temporada');
  assert.ok(galeria > oficinas, 'Galeria must come after Oficinas');

  const section = html.slice(oficinas, galeria);
  assert.match(section, /data-workshops-status/);
  assert.match(section, /data-workshops-grid/);
  assert.match(section, /Experiências especiais do Socializando/);
});
