import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const manifest=JSON.parse(readFileSync(new URL('./artwork-manifest.json', import.meta.url),'utf8'));
const artworks=[
  {
    key:'oficina-de-squish',
    date:'2026-11-14',
    path:'assets/oficinas/oficina-squish-2026-11-14.jpeg',
    size:359907,
    sha:'d48d2043ea92d2359fbdd01e30dd2f334151e716e6881ed186f80cf2a3ac8b8d',
  },
  {
    key:'oficina-de-slime',
    date:'2026-11-21',
    path:'assets/oficinas/oficina-slime-2026-11-21.jpeg',
    size:375316,
    sha:'facf338fe3e08241edcad23a4ea4ab6db5fc02665013bcf1269d22d34d72a580',
  },
  {
    key:'oficina-de-gloss',
    date:'2026-11-28',
    path:'assets/oficinas/oficina-gloss-2026-11-28.jpeg',
    size:378335,
    sha:'05d7819869a3d77fa3acb09850dd169d427e1a3f00bc9d7ea28bb65de82b1752',
  },
];

for (const asset of artworks) {
  test(`november ${asset.key}: official JPEG exactly matches supplied source`,()=>{
    const file=readFileSync(new URL('../'+asset.path,import.meta.url));
    const actualHash=createHash('sha256').update(file).digest('hex');
    const recorded=manifest.artworks.find(x=>x.target_path===asset.path);
    assert.equal(file.length,asset.size);
    assert.equal(actualHash,asset.sha);
    assert.equal(recorded?.sha256,asset.sha);
    assert.equal(recorded?.bytes,asset.size);
    assert.equal(recorded?.event_date,asset.date);
    assert.equal(recorded?.experience_key,asset.key);
    assert.equal(recorded?.mime_type,'image/jpeg');
  });
}

test('Pix checkout amount comes from the actual registration and not fixed global config',()=>{
  const content=readFileSync(new URL('./public.js',import.meta.url),'utf8');
  assert.match(content,/amountCents:\s*activeRegistration\.amountCents/);
  assert.doesNotMatch(content,/amountCents:\s*OFICINAS_CONFIG\.pix\.amountCents/);
});
