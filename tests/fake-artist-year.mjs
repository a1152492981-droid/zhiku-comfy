import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const s=fs.readFileSync(new URL('../runtime.js',import.meta.url),'utf8');
const i=s.indexOf('const __mod_model ='),j=s.indexOf('// ───── store.js',i);
const M=vm.runInNewContext(s.slice(i,j)+'\n__mod_model',{structuredClone});
const t='year_2025, 5::masterpiece, best quality::, 1.2::highres, 4k, detailed eyes, detailed hair::, 1.4::artist:liduke::, artist:ibuki satsuki, -2::artist_collaboration::';
const names=M.parseArtistList(t).map(a=>a.tag);
assert(!names.some(n=>/year|collaboration|detailed/.test(n)),names.join());
assert(names.includes('artist:liduke'));
const bad='artist:year_2025, 5::masterpiece::, 1.4::artist:liduke::, -2::artist:artist_collaboration::';
const tk=M.tokenize(bad);
assert.deepEqual([...tk.filter(x=>x.isArtist).map(x=>x.text)],['artist:liduke']);
// 存进去再拿出来：假画师的 artist: 被去掉
const d=M.emptyData();const r=M.createFromString(d,{text:bad,forceGroup:true});
const out=M.ticketString(d,r);
assert(out.startsWith('year_2025') && out.includes('-2::artist_collaboration::') && !/artist:year|artist:artist_/.test(out),out);
const g=s.slice(s.indexOf('function guessBareArtists'),s.indexOf('function addArtistPrefix'));
const guess=vm.runInNewContext(g+'\nguessBareArtists',{M:{tokenize:M.tokenize,findArtistByTag:()=>null}});
assert.deepEqual([...guess({}, 'year_2025, 5::masterpiece::, liduke, huqu')],[]);
console.log('PASS: year_2025 / artist_collaboration / detailed eyes stay plain words');
// Existing saved fake artists migrate on load, retaining weighted words and images.
const legacy=M.emptyData();const ref=M.createFromString(legacy,{text:'1.4::artist:liduke::, -2::artist:legacy_word::',forceGroup:true});
const fake=Object.values(legacy.artists).find(a=>a.tag==='artist:legacy_word');assert(fake);fake.tag='artist:artist_collaboration';fake.images=[{url:'keep.png'}];
const loaded=M.normalizeData(legacy);const text=M.ticketString(loaded,ref);assert(text.includes('-2::artist_collaboration::'));assert(!text.includes('artist:artist_collaboration'));assert(Object.values(loaded.groups).some(g=>g.images.some(i=>i.url==='keep.png')));
console.log('PASS: legacy load migration preserves weight and images');
