import assert from 'node:assert/strict';

// 0.8.70：画 QQ人（正面里有 chibi / super deformed）时，分人物的每个角色也补上 chibi，负面补 chibi inset。
// 只在正面里写 chibi 时，NAI 4.5 / 5 的分人物提示词会把人拉回正常比例（出来是正常人，或者旁边飘个小人）。
export function applyChibiCharsCompatibility(s) {
    const patch = (a, b) => { assert.equal(s.split(a).length, 2, a.slice(0, 80)); s = s.replace(a, () => b); };
    patch(`        const r = await N.generate(opts);
        const vg = getData().vibeGroups?.[getData().vibeActive];`, `        chibiChars(opts);
        const r = await N.generate(opts);
        const vg = getData().vibeGroups?.[getData().vibeActive];`);
    patch(`async function run(opts) {
    if (opts.backend === 'comfy')`, `const CHIBI_WORD = /(?:^|[\\s,:(])(?:artist:\\s*)?(?:chibi|super[ _]deformed)(?=$|[\\s,:)])/i;
function chibiChars(opts) {
    if (getData().options?.frameKeep) return;
    if (!CHIBI_WORD.test(', ' + (opts.positive || ''))) return;
    if (opts.chars?.length) opts.chars = opts.chars.map(c => CHIBI_WORD.test(', ' + (c.prompt || '')) ? c : { ...c, prompt: ['1.5::chibi, super deformed::', c.prompt].filter(Boolean).join(', ') });
    if (!/\\bchibi inset\\b/i.test(opts.negative || '')) opts.negative = [opts.negative, 'chibi inset'].filter(Boolean).join(', ');
}

async function run(opts) {
    if (opts.backend === 'comfy')`);
    return s;
}
