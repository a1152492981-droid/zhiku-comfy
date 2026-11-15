import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const s=fs.readFileSync(new URL('../runtime.js',import.meta.url),'utf8');const part=(a,b)=>{let i=s.indexOf(a),j=s.indexOf(b,i);assert(i>=0&&j>i);return s.slice(i,j)};
let calls=0,fail=null;const ctx={console:{warn(){}},normPairs:a=>a||[],hasChinese:()=>false,pickJson:JSON.parse,askVision:async()=>{calls++;if(calls%2===1)return JSON.stringify({people:['1girl'],action:['hand near face','chin rest'],camera:['portrait']});if(fail)throw fail;return JSON.stringify({tags:[{en:'pov hands',zh:''},{en:"another's hand on face",zh:''}]})}};
const run=vm.runInNewContext(part('const GESTURE_RE =','/** 看图提取衣服 */')+part('async function imageToPrompt(', 'const GESTURE_ZH =')+'\nimageToPrompt',ctx);
let result=await run('image');assert.equal(calls,2);assert(result.positive.includes('pov hands'));assert(!result.positive.includes('chin rest'));assert(!result.positive.includes('hand near face'));
fail=Error('vision offline');result=await run('image');assert(result.positive.includes('chin rest'));
fail=Object.assign(Error('cancel'),{name:'AbortError'});await assert.rejects(()=>run('image'),{name:'AbortError'});
console.log('PASS: full-image hand review merge, failure fallback and cancellation');
