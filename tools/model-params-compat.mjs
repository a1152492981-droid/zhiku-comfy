import assert from 'node:assert/strict';
// 0.8.68：每个模型记住自己的步数、CFG、采样器、噪声计划、Rescale、Variety；换模型（设置、生图页、画师串绑定）时自动换过去
export function applyModelParamsCompatibility(s) {
    const patch = (a, b) => { assert.equal(s.split(a).length, 2, a.slice(0, 90)); s = s.replace(a, () => b); };
    patch("    for (const [k, v] of Object.entries(DEFAULTS)) if (s[k] === undefined || s[k] === null) s[k] = v;\n    return s;\n}\nconst save = () => saveSettingsDebounced();",
        `    for (const [k, v] of Object.entries(DEFAULTS)) if (s[k] === undefined || s[k] === null) s[k] = v;
    swapModelParams(s);
    return s;
}
const save = () => saveSettingsDebounced();
// 用函数声明：settings() 可能在这几行之前就被调用，const 会报「声明前使用」
function modelParamKeys() { return ['novelai_steps', 'nai3Scale', 'novelai_sampler', 'Schedule', 'cfg_rescale', 'nai3Variety']; }
function pickModelParams(s) { return Object.fromEntries(modelParamKeys().map(k => [k, s[k]])); }
/** 模型变了：把现在的参数记到旧模型名下，新模型记过就换上 */
function swapModelParams(s) {
    const now = s.novelaimode, last = s.modelParamsLast;
    if (!last) { s.modelParamsLast = now; return; }
    if (now === last) return;
    s.modelParamsLast = now;
    if (String(s.modelParamsOn) === 'false') return;
    const mem = (s.modelParams && typeof s.modelParams === 'object') ? s.modelParams : (s.modelParams = {});
    mem[last] = pickModelParams(s);
    const got = mem[now];
    if (got && modelParamKeys().some(k => got[k] != null && String(got[k]) !== String(s[k]))) {
        for (const k of modelParamKeys()) if (got[k] != null) s[k] = got[k];
        const name = (MODELS.find(m => m[0] === now) || [now, now])[1];
        try { toastr.info(\`换到 \${name}，参数换成上次用它时的：\${s.novelai_steps} 步 · CFG \${s.nai3Scale} · \${(SAMPLERS.find(x => x[0] === s.novelai_sampler) || [0, s.novelai_sampler])[1]}\`, '智库', { timeOut: 3500 }); } catch {}
    }
    saveSettingsDebounced();
}
/** 参数是一起给定的（比如套用分享里的参数）：直接记到现在的模型名下，不当成换模型 */
function adoptModelParams(s = settings()) {
    s.modelParamsLast = s.novelaimode;
    ((s.modelParams && typeof s.modelParams === 'object') ? s.modelParams : (s.modelParams = {}))[s.novelaimode] = pickModelParams(s);
    saveSettingsDebounced();
}`);
    patch("return { comfyReady, ", "return { adoptModelParams, comfyReady, ");
    patch("    if (positive(pr.width) && positive(pr.height)) { s.novelai_width = Number(pr.width); s.novelai_height = Number(pr.height); }\n    N.save(); return true;",
        "    if (positive(pr.width) && positive(pr.height)) { s.novelai_width = Number(pr.width); s.novelai_height = Number(pr.height); }\n    N.adoptModelParams(s); N.save(); return true;");
    patch("    const s = N.settings(), positive = v => Number.isFinite(Number(v)) && Number(v) > 0;", "    const s = N.settings(), positive = v => Number.isFinite(Number(v)) && Number(v) > 0;\n    N.adoptModelParams(s);");
    // 设置页：模型下拉旁边加开关
    patch("<label class=\"pc-field\"><span>模型</span><select data-st=\"novelaimode\">",
        "<label class=\"pc-switch pc-mt-s span2\"><input type=\"checkbox\" data-st-check=\"modelParamsOn\" ${String(n.modelParamsOn) !== 'false' ? 'checked' : ''}><span></span>每个模型记住自己的参数<small>步数、CFG、采样器、噪声计划、Rescale 跟着模型走：在 4.5 上调好一次，以后换回 4.5（设置、生图页、画师串绑定的模型）就自动换上那套</small></label>\n      <label class=\"pc-field\"><span>模型</span><select data-st=\"novelaimode\">");
    return s;
}
