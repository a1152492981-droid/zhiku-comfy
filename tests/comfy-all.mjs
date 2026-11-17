import assert from 'node:assert/strict';
import fs from 'node:fs';import vm from 'node:vm';import {webcrypto} from 'node:crypto';
// 本地 ComfyUI 版：「所有生图都用本地 ComfyUI」打开后，没有 NovelAI key 也能出图，且不发任何 NovelAI 请求
const src=fs.readFileSync(new URL('../runtime.js',import.meta.url),'utf8');
const between=(a,b)=>{const i=src.indexOf(a),j=src.indexOf(b,i);assert(i>=0&&j>i,a);return src.slice(i,j);};
const config={naiMode:'key',naiKey:'',novelaimode:'nai-diffusion-4-5-full',comfyUrl:'http://127.0.0.1:8188',comfyModel:'pony.safetensors',comfyQuality:'score_9',comfyNeg:'',comfySeed:'7'};
const requests=[];let uploads=0;
const fetch=async(url,options={})=>{
 if(url.endsWith('/upload/image')){const f=options.body.get('image');requests.push({url,name:f.name});return {ok:true,json:async()=>({name:'up'+(++uploads)+'.png',subfolder:''})};}
 requests.push({url,body:options.body&&typeof options.body==='string'?JSON.parse(options.body):null});
 if(url==='/api/sd/comfy/generate')return {ok:true,json:async()=>({format:'png',data:'AAAA'})};
 return {ok:false,status:401,headers:{get:()=>null},text:async()=>'no key',arrayBuffer:async()=>new TextEncoder().encode('no key').buffer};
};
const N=vm.runInNewContext(between('const __mod_nai =','const __mod_engine =')+'\n__mod_nai',{
 __shim:{extension_settings:{piaoce_nai:config},getRequestHeaders:()=>({'Content-Type':'application/json'}),saveSettingsDebounced(){}},
 fetch,FormData,Blob,atob,setTimeout,clearTimeout,TextDecoder,TextEncoder,Uint8Array,toastr:{info(){}},btoa:s=>Buffer.from(s,'binary').toString('base64')});
const M=vm.runInNewContext(between('const __mod_model =','// ───── store.js')+'\n__mod_model',{structuredClone});
const data=M.emptyData();data.vibeActive='v';data.vibeGroups.v={vibes:[{path:'never-read.png'}]};
const E=vm.runInNewContext(between('const __mod_engine =','// ───── translate.js')+'\n__mod_engine',{
 __mod_model:M,__mod_nai:N,__mod_store:{getData:()=>data,commit(){},urlToDataUrl:async()=>assert.fail('Comfy should not load NAI references')},crypto:webcrypto,toastr:{warning(){},info(){}}});
const noNai=()=>assert(!requests.some(r=>/novelai|\/ai\/|encode-vibe/.test(r.url)),'must not call NovelAI');
const lastWf=()=>JSON.parse(requests.filter(r=>r.url==='/api/sd/comfy/generate').at(-1).body.prompt).prompt;
try {
 // 关着：和原版一样，没 key 就报错，一个请求都不发
 assert.equal(N.isReady(),false);assert.equal(N.genReady(),false);assert.equal(N.chatBackend(),'nai');
 await assert.rejects(E.generateFull({positive:'1girl',negative:''}),/还没填 NovelAI key/);assert.equal(requests.length,0);
 // 打开
 config.comfyAll='true';
 assert.equal(N.genReady(),true);assert.equal(N.isReady(),false);assert.equal(N.chatBackend(),'comfy');
 // 「角色」页给角色生图：E.generateFull 不带 backend，还带了角色参考
 const img=await E.generateFull({positive:'1girl, silver hair',negative:'lowres',width:832,height:1216,director:[{data:'ref'}]});
 assert.match(img,/^data:image\/png;base64,/);let wf=lastWf();
 assert.equal(wf[4].inputs.ckpt_name,'pony.safetensors');assert.match(wf[6].inputs.text,/silver hair.*score_9/);assert.equal(wf[3].inputs.seed,7);assert.equal(wf[3].inputs.denoise,1);
 assert.equal(E.runtime.lastSent.director,0);noNai();
 // 例图 / 批量
 await E.generateSample({fixed:'artist:alpha',template:{positive:'portrait',negative:''}});assert.equal(requests.at(-1).url,'/api/sd/comfy/generate');noNai();
 // 直接调 N.generate（不经过 run）也走 ComfyUI；显式写了 nai 也一样
 await N.generate({positive:'x',negative:'',backend:'nai'});assert.equal(requests.at(-1).url,'/api/sd/comfy/generate');noNai();
 // 垫图：先传图，再用 LoadImage → VAEEncode，denoise = 强度
 const n0=requests.length;
 await E.generateFull({positive:'standing',negative:'',width:768,height:1024,i2i:{image:'aGVsbG8=',strength:0.45}});
 assert.equal(requests[n0].url,'http://127.0.0.1:8188/upload/image');wf=lastWf();
 assert.equal(wf[11].class_type,'LoadImage');assert.equal(wf[11].inputs.image,'up1.png');assert.equal(wf[3].inputs.denoise,0.45);assert.deepEqual(wf[3].inputs.latent_image,['10',0]);assert.equal(wf[5],undefined);noNai();
 // 局部重绘
 const out=await N.inpaint({image:'aGVsbG8=',mask:'aGVsbG8=',prompt:'red eyes',negative:'',width:512,height:512,strength:0.6});
 assert.match(out,/^data:image\/png;base64,/);wf=lastWf();
 assert.equal(wf[12].class_type,'SetLatentNoiseMask');assert.equal(wf[13].inputs.image,'up3.png');assert.equal(wf[3].inputs.denoise,0.6);noNai();
 // 自定义工作流 + 垫图：给出明确的中文提示，不偷偷走 NovelAI
 config.comfyWf='file:x.json';config.comfyWfApi=JSON.stringify(N.COMFY_Q?{1:{class_type:'KSampler',inputs:{positive:['2',0]}},2:{class_type:'CLIPTextEncode',inputs:{text:'a'}}}:{});
 await assert.rejects(E.generateFull({positive:'x',negative:'',i2i:{image:'aGVsbG8='}}),/自定义工作流暂不支持垫图/);noNai();
 config.comfyWf='';config.comfyWfApi='';
 // 没填 ComfyUI 地址：报 ComfyUI 的错，不改走 NovelAI
 config.comfyUrl='';assert.equal(N.genReady(),false);const n1=requests.length;
 await assert.rejects(E.generateFull({positive:'x',negative:''}),/还没连上 ComfyUI/);assert.equal(requests.length,n1);
 config.comfyUrl='http://127.0.0.1:8188';
 // 漫画不受这个开关影响（还是看漫画页自己选的通道）
 const c0=requests.filter(r=>r.url==='/api/sd/comfy/generate').length;await assert.rejects(N.generate({positive:'x',negative:'',comic:true}));assert.equal(requests.filter(r=>r.url==='/api/sd/comfy/generate').length,c0);
} finally {N.stopQueue();}
assert(src.includes('data-st-check="comfyAll"')&&src.includes('所有生图都用本地 ComfyUI'));
console.log('PASS: comfyAll routes character/sample/direct/i2i/inpaint generation to ComfyUI without a NovelAI key and without NovelAI requests; off keeps original behaviour; comic untouched');
