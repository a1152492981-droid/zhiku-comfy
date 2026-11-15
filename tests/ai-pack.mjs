import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const s=fs.readFileSync(new URL('../runtime.js',import.meta.url),'utf8');
const cut=(a,b)=>{const i=s.indexOf(a),j=s.indexOf(b,i);assert(i>=0&&j>i,a);return s.slice(i,j)};
const i=s.indexOf('const __mod_model ='),j=s.indexOf('// ───── store.js',i);
const M=vm.runInNewContext(s.slice(i,j)+'\n__mod_model',{structuredClone});
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const d=M.emptyData();
const r=M.createFromString(d,{text:'1.3::artist:liduke::, artist:huqu, year_2025',forceGroup:true});
const g=d.groups[r.id]; g.name='测试串'; g.images=[{url:png,template:'sfw_head',nsfw:false},{url:png,template:'nsfw_head',nsfw:true}];
Object.values(d.artists)[0].images=[{url:png,template:'sfw_bust',nsfw:false}];
let saved=null; const msgs=[];
const ctx={M,ui:{},toastr:{info:m=>msgs.push(m),success:m=>msgs.push(m),warning:m=>msgs.push(m)},
  shrinkDataUrl:async (u,max,q,force)=>{assert.equal(max,640);assert.equal(force,true);return u;}, fileToDataUrl:async()=>png, imgUrl:x=>x.url, fetch:async()=>({blob:async()=>null}),
  saveBlob:(b,n)=>{saved={b,n}}, TextEncoder, Blob, Uint8Array, Uint32Array, DataView, ArrayBuffer, atob, console, Date, JSON, Object, String, Math, Set, Map};
vm.runInNewContext(cut('function makeZip(files)','/** 导出这批')+cut('async function aiPackExport','function exportData()')+'\nthis.run=aiPackExport;',ctx);
await ctx.run(d);
assert(saved && saved.n.endsWith('.zip'), msgs.join('|'));

const unpack=async blob=>{const b=Buffer.from(await blob.arrayBuffer()),out=new Map();let at=0;while(b.readUInt32LE(at)===0x04034b50){const size=b.readUInt32LE(at+18),n=b.readUInt16LE(at+26),extra=b.readUInt16LE(at+28),start=at+30+n+extra;out.set(b.subarray(at+30,at+30+n).toString('utf8'),b.subarray(start,start+size));at=start+size;}return out;};
let files=await unpack(saved.b);let index=JSON.parse(files.get('清单.json'));
assert.equal(index.strings[0].images.length,1);assert.equal(index.artists.reduce((n,a)=>n+a.images.length,0),1);assert.equal(index.strings[0].members[0].weight,1.3);assert(index.strings[0].text.includes('year_2025'));assert(![...files.keys()].some(x=>x.includes('_NSFW')));assert(!files.get('说明.txt').toString().includes('\\n'));assert.equal(ctx.ui.aiPackBusy,false);
d.options.aiPackNsfw=true;await ctx.run(d);files=await unpack(saved.b);index=JSON.parse(files.get('清单.json'));assert.equal(index.strings[0].images.length,2);assert([...files.keys()].some(x=>x.includes('_NSFW')));
ctx.urlToDataUrl=async()=>{throw Error('HTTP 404')};g.images.push({url:'/missing',nsfw:false});ctx.console={warn(){}};await ctx.run(d);assert.equal(ctx.ui.aiPackBusy,false);assert(msgs.at(-1).includes('1 张读不到'));
ctx.saveBlob=()=>{throw Error('download failed')};await assert.rejects(()=>ctx.run(d),/download failed/);assert.equal(ctx.ui.aiPackBusy,false);
console.log('PASS: ZIP entries/manifest/weights, SFW and NSFW filters, missing image skip and busy cleanup');
