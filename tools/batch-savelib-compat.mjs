import assert from 'node:assert/strict';

// 0.8.74：批量生成例图加开关「画师库里已有的，出的图自动存进例图」。关掉时库里已有的也只放在结果里，看中了勾选「存进画师库」才存
export function applyBatchSaveLibCompatibility(s) {
    const patch = (a, b) => { assert.equal(s.split(a).length, 2, a.slice(0, 80)); s = s.replace(a, () => b); };
    patch("    if (ref && !job.char) return { image: await makeSampleFor(ref, tpl.id, { soloWeight: job.soloWeight ?? 1 }), saved: true };",
        "    if (ref && !job.char && job.save !== false) return { image: await makeSampleFor(ref, tpl.id, { soloWeight: job.soloWeight ?? 1 }), saved: true };");
    patch("    const neg0 = ref ? M.ticketNeg(d, ref) : '';\n    const w = Number(d.options.sampleSoloWeight) || 1;",
        "    const neg0 = ref ? M.ticketNeg(d, ref) : '';\n    const w = Number(job.soloWeight ?? d.options.sampleSoloWeight) || 1;");
    patch("            else jobs.push({ ref, text, name: u.name || '', templateId: t, soloWeight: Number(d.options.sampleSoloWeight) || 1, char: '',",
        "            else jobs.push({ ref, text, name: u.name || '', templateId: t, soloWeight: Number(d.options.sampleSoloWeight) || 1, save: d.options.batchSaveLib !== false, char: '',");
    patch("      <div class=\"pc-dim small\">画师库里已有的串，出的图照旧存进例图；不在库里的<b>不会自动建成画师串</b>，看中了再勾选存进去。</div>",
        "      <label class=\"pc-switch\"><input type=\"checkbox\" data-opt=\"batchSaveLib\" ${d.options.batchSaveLib !== false ? 'checked' : ''}><span></span>画师库里已有的，出的图自动存进例图<small>关掉的话，库里已有的也只放在结果里，看中了勾选「存进画师库」再存。画角色的图一直不自动存。</small></label>\n      <div class=\"pc-dim small\">不在库里的<b>不会自动建成画师串</b>，看中了再勾选存进去。</div>");
    return s;
}
