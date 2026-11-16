import assert from 'node:assert/strict';
import fs from 'node:fs';

// 0.8.80：批量可以单独选模型；生图页 / 批量显示剩余 Anlas 和 V5 额度，生图后自动刷新
const read = f => fs.readFileSync(new URL('./extras-0880/' + f, import.meta.url), 'utf8');

export function applyModelAnlasCompatibility(s) {
    const patch = (a, b) => { assert.equal(s.split(a).length, 2, a.slice(0, 80)); s = s.replace(a, () => b); };
    // NAI 模块
    patch("    swapModelParams(s);\n    return s;\n}",
        "    swapModelParams(s);\n    if (pcModelOverride && pcModelOverride !== s.novelaimode) {\n        const p = (s.modelParams && typeof s.modelParams === 'object' && s.modelParams[pcModelOverride]) || {};\n        const v = { ...s, novelaimode: pcModelOverride, modelParamsLast: pcModelOverride };\n        for (const k of modelParamKeys()) if (p[k] != null) v[k] = p[k];\n        return v;\n    }\n    return s;\n}");
    patch("function anlasText(j) {", read('nai.js') + "function anlasText(j) {");
    patch("        return { image: toDataUrl(b64), sent };\n    }\n    const key = authKey();", "        anlasSoon();\n        return { image: toDataUrl(b64), sent };\n    }\n    const key = authKey();");
    patch("    try{return {image:await imageFromResponse(buf,responseInfo),sent};}catch(e){siteForget('/ai/generate-image');throw e;}",
        "    try{const out={image:await imageFromResponse(buf,responseInfo),sent};anlasSoon();return out;}catch(e){siteForget('/ai/generate-image');throw e;}");
    patch("return { adoptModelParams,", "return { withModel, anlasRefresh, anlasNow: () => pcAnlas, onAnlas: f => { pcAnlasSubs.add(f); return () => pcAnlasSubs.delete(f); }, adoptModelParams,");
    // 批量：每张生成时套上这批的模型
    patch("                const r = await makeBatchImage(job);", "                const r = await N.withModel(job.model || '', () => makeBatchImage(job));");
    patch("    commit();\n    const old = ui.batch.state;", "    { const pcM = typeof pcBatchModelNow === 'function' ? pcBatchModelNow(d) : ''; for (const j of jobs) j.model = pcM; }\n    commit();\n    const old = ui.batch.state;");
    // UI
    patch("function viewBatchResults(d, head) {", read('ui.js') + "function viewBatchResults(d, head) {");
    patch("            case 'batchnote': {", read('actions.js') + "            case 'batchnote': {");
    patch('<div class="pc-row-between"><span>共 ${names.length} 串', '${pcBatchModelPick(d)}\n      <div class="pc-row-between"><span>共 ${names.length} 串');
    patch('<span class="pc-dim small">会用掉 NovelAI 点数</span>', '<span class="pc-dim small">${pcBatchModelNow(d) ? esc((N.MODELS.find(x => x[0] === pcBatchModelNow(d)) || [0, \'\'])[1].replace(\'NAI Diffusion \', \'\')) + \' · \' : \'\'}会用掉 NovelAI 点数</span></div>\n      ${pcAnlasLine(\'text-align:right;margin-top:2px\')}<div style="display:none">');
    patch("      <div class=\"pc-actions wrap\">${(() => { if (st.running) return '';", "      ${pcAnlasLine('margin:6px 0 0')}\n      <div class=\"pc-actions wrap\">${(() => { if (st.running) return '';");
    patch("${st.busy ? '<span class=\"pc-busy\">生成中</span>' : '生成'}</button>", "${st.busy ? '<span class=\"pc-busy\">生成中</span>' : '生成'}</button>\n    ${pcAnlasLine('text-align:center;margin-top:6px')}");
    patch('<div class="pc-row-between pc-mt-s"><button class="pc-btn dark" data-act="naitest">测试</button>',
        '${pcAnlasLine(\'margin-top:8px\')}${[\'key\', \'tavern\'].includes(N.settings().naiMode) ? \'<button class="pc-pill dashed tiny pc-mt-s" data-act="anlasraw">复制账户信息（V5 额度没显示时发我）</button>\' : \'\'}\n      <div class="pc-row-between pc-mt-s"><button class="pc-btn dark" data-act="naitest">测试</button>');
    patch("if (el.dataset.optstr) { d.options[el.dataset.optstr] = el.value.trim();", "if (el.dataset.optstr) { d.options[el.dataset.optstr] = el.value.trim(); if (el.dataset.optstr === 'batchModel') { commit({ silent: true }); render(); return; }");
    patch("if (el.dataset.st === 'naiKey' || el.dataset.st === 'naiSite') ui.naiTest = null;", "if (el.dataset.st === 'naiKey' || el.dataset.st === 'naiSite' || el.dataset.st === 'naiMode') { ui.naiTest = null; void N.anlasRefresh(true); }");
    return s;
}
