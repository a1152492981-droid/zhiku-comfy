import assert from 'node:assert/strict';
import fs from 'node:fs';
export function applyLegacyHandsCompatibility(s) {
const patch=(a,b)=>{assert.equal(s.split(a).length,2,a);s=s.replace(a,()=>b)};
patch('/** 看图提取衣服 */',fs.readFileSync('src/legacy-hands.js','utf8')+'\n/** 看图提取衣服 */');
patch('    if (!list.length && j.tags) list = arr(j.tags);','    if (!list.length && j.tags) list = arr(j.tags);\n'+"    // 第二遍只看手，手部标签插在人数后面\n    try {\n        const hands = await readHands(imageDataUrl);\n        if (hands.length) {\n            const np = arr(j.people).length;\n            const merged = mergeHands(list.slice(np).map(en => ({ en, zh: '' })), hands).map(x => x.en);\n            list = [...list.slice(0, np), ...(hands.some(h => OTHER_HAND_RE.test(h.en)) && !list.some(t => /\\bpov\\b/i.test(t)) ? ['pov'] : []), ...merged];\n        }\n    } catch (e) { if (e?.name === 'AbortError') throw e; console.warn('[智库] 读手没成功', e); }");
return s;
}
