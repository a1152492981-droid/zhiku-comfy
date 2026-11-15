import assert from 'node:assert/strict';
// 0.8.68：漫画自己的出图参数（步数、CFG、Rescale、采样器、噪声计划），留空就跟生图设置
export function applyComicParamsCompatibility(s) {
    const patch = (a, b) => { assert.equal(s.split(a).length, 2, a.slice(0, 90)); s = s.replace(a, () => b); };
    patch("function buildParameters({ positive, negative, width, height, seed, chars = [], refs = null, director = null, comic = false }) {\n    chars=normalizeNaiChars(chars);\n    const s = settings();",
        "function buildParameters({ positive, negative, width, height, seed, chars = [], refs = null, director = null, comic = false }) {\n    chars=normalizeNaiChars(chars);\n    const s = comic ? comicSettings(settings()) : settings();");
    patch("/** 漫画用的 NAI 模型 */", `/** 漫画自己的参数盖在生图设置上；没填的照旧 */
function comicSettings(s) {
    const o = __mod_store.getData()?.options || {}, out = { ...s };
    const num = (v, lo, hi) => { const n = Number(v); return String(v ?? '').trim() !== '' && Number.isFinite(n) && n >= lo && n <= hi ? n : null; };
    const steps = num(o.comicSteps, 1, 50), cfg = num(o.comicCfg, 0, 30), rescale = num(o.comicRescale, 0, 1);
    if (steps != null) out.novelai_steps = Math.round(steps);
    if (cfg != null) out.nai3Scale = cfg;
    if (rescale != null) out.cfg_rescale = rescale;
    if (o.comicSampler && SAMPLERS.some(x => x[0] === o.comicSampler)) out.novelai_sampler = o.comicSampler;
    if (o.comicSchedule && SCHEDULES.some(x => x[0] === o.comicSchedule)) out.Schedule = o.comicSchedule;
    return out;
}
/** 漫画用的 NAI 模型 */`);
    patch("              <div class=\"pc-label\">用什么画</div>\n",
        `              <div class="pc-label">漫画自己的参数（留空 = 跟生图设置）</div>
              \${(() => { const L = naiLists(), ph = naiNow(), o2 = opts(); return \`<div class="pc-grid2" style="gap:8px">
                <label class="pc-field"><span>步数</span><input class="pc-input" type="number" min="1" max="50" data-cstr="comicSteps" value="\${esc(String(o2.comicSteps ?? ''))}" placeholder="\${esc(String(ph.steps))}"></label>
                <label class="pc-field"><span>CFG</span><input class="pc-input" type="number" min="0" max="30" step="0.1" data-cstr="comicCfg" value="\${esc(String(o2.comicCfg ?? ''))}" placeholder="\${esc(String(ph.cfg))}"></label>
                <label class="pc-field"><span>Rescale</span><input class="pc-input" type="number" min="0" max="1" step="0.02" data-cstr="comicRescale" value="\${esc(String(o2.comicRescale ?? ''))}" placeholder="\${esc(String(ph.rescale))}"></label>
                <label class="pc-field"><span>采样器</span><select class="pc-input" data-cstr="comicSampler"><option value="">跟设置（\${esc(ph.sampler)}）</option>\${L.samplers.map(([v, t]) => \`<option value="\${v}" \${o2.comicSampler === v ? 'selected' : ''}>\${esc(t)}</option>\`).join('')}</select></label>
                <label class="pc-field"><span>噪声计划</span><select class="pc-input" data-cstr="comicSchedule"><option value="">跟设置（\${esc(ph.schedule)}）</option>\${L.schedules.map(([v, t]) => \`<option value="\${v}" \${o2.comicSchedule === v ? 'selected' : ''}>\${esc(t)}</option>\`).join('')}</select></label>
              </div>\`; })()}
              <div class="pc-hint">只管漫画，不影响单张生图和聊天插图。灰字是现在生图设置里的值，不填就用它。步数超过 28 会多扣 Anlas。</div>
              <div class="pc-label">用什么画</div>
`);
    patch("    const naiSize = deps.naiSize || (() => [832, 1216]);",
        "    const naiSize = deps.naiSize || (() => [832, 1216]);\n"
        + "    const naiLists = deps.naiLists || (() => ({ samplers: [], schedules: [] }));\n"
        + "    const naiNow = deps.naiNow || (() => ({ steps: 28, cfg: 5, rescale: 0, sampler: '', schedule: '' }));");
    patch("naiSize: () => { const s = N.settings(); return [Number(s.novelai_width) || 832, Number(s.novelai_height) || 1216]; },",
        "naiSize: () => { const s = N.settings(); return [Number(s.novelai_width) || 832, Number(s.novelai_height) || 1216]; },\n"
        + "        naiLists: () => ({ samplers: N.SAMPLERS, schedules: N.SCHEDULES }),\n"
        + "        naiNow: () => { const s = N.settings(); return { steps: Number(s.novelai_steps) || 28, cfg: Number(s.nai3Scale) || 5, rescale: Number(s.cfg_rescale) || 0, sampler: (N.SAMPLERS.find(x => x[0] === s.novelai_sampler) || [0, s.novelai_sampler || ''])[1], schedule: s.Schedule || 'karras' }; },");
    return s;
}
