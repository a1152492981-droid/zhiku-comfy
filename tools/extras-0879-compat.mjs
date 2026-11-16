import assert from 'node:assert/strict';
import fs from 'node:fs';

// 0.8.79：删除可撤销 + 回收站、批量重画失败的、批量打星、删过的画师管理、生图页显示固定种子、氛围编码另存
const read = f => fs.readFileSync(new URL('./extras-0879/' + f, import.meta.url), 'utf8');

export function applyExtras0879Compatibility(s) {
    const patch = (a, b) => { assert.equal(s.split(a).length, 2, a.slice(0, 80)); s = s.replace(a, () => b); };

    // ── 氛围编码另存（store 模块）
    patch("function snapshotData(now = false) {\n    const json = JSON.stringify(data);", read('store.js') + "function snapshotData(now = false) {\n    const json = pcSerialize(data);");
    patch("            body = JSON.stringify(target);", "            body = pcSerialize(target);");
    patch("            await pcYield();\n            await tryFile(body);", "            await pcYield();\n            const pcPre = pcEncSafeSig;\n            await pcEncFlush();\n            if (pcEncSafeSig !== pcPre && pcEncSig(target) === pcEncSafeSig) body = pcSerialize(target);\n            await tryFile(body);");
    patch("    if (server && best?.[0] !== 'file') mergeLibraryAdditions(data, server);\n    loadedFromServer = true; fileOk = serverOk;",
        "    if (server && best?.[0] !== 'file') mergeLibraryAdditions(data, server);\n    try { await pcEncLoad(data); } catch (e) { console.warn('[智库] 读氛围编码失败', e); }\n    loadedFromServer = true; fileOk = serverOk;");
    patch("JSON.stringify(v ?? null).length", "JSON.stringify(v ?? null, PC_ENC_DROP).length");

    // ── UI 小工具
    patch("function viewBatchResults(d, head) {", read('ui.js') + "function viewBatchResults(d, head) {");
    patch("            case 'batchnote': {", read('actions.js') + "            case 'batchnote': {");

    // ── 删除进回收站 + 撤销
    patch("                if (r.type === 'group') M.deleteGroup(d, r.id); else M.deleteArtist(d, r.id);",
        "                const pcTids = pcTrashPut(d, [r], delNote);\n                if (r.type === 'group') M.deleteGroup(d, r.id); else M.deleteArtist(d, r.id);");
    patch("imgs.forEach(i => deleteImageFile(i.path));\n                break;", "pcUndoDelete(pcTids, `「${name}」`);\n                break;");
    patch("                for (const id of ids) { if (type === 'group') M.deleteGroup(d, id); else M.deleteArtist(d, id); }",
        "                const pcTids = pcTrashPut(d, ids.map(id => ({ type, id })), delNote);\n                for (const id of ids) { if (type === 'group') M.deleteGroup(d, id); else M.deleteArtist(d, id); }");
    patch("imgs.forEach(p => deleteImageFile(p));\n                toastr.success(`删掉了 ${ids.length} 个`, '智库');", "pcUndoDelete(pcTids, `${ids.length} 个`);");
    patch("                for (const id of ids) M.deleteArtist(d, id);",
        "                const pcTids = pcTrashPut(d, ids.map(id => ({ type: 'artist', id })), delNote);\n                for (const id of ids) M.deleteArtist(d, id);");
    patch("imgs.forEach(p => deleteImageFile(p));\n                toastr.success(`删掉了 ${ids.length} 位，留下 ${keep} 位`, '智库');", "pcUndoDelete(pcTids, `${ids.length} 位，留下 ${keep} 位`);");
    // 回收站标签页
    patch("function viewBook(d) {\n", "function viewBook(d) {\n    if (ui.bookTab === 'trash') return pcTrashView(d);\n");
    patch(`    <div class="pc-seg pc-mt-s">
      <button class="\${ui.bookTab === 'groups' ? 'on' : ''}" data-act="booktab" data-tab="groups">画师组 · \${Object.keys(d.groups).length}</button>
      <button class="\${ui.bookTab === 'artists' ? 'on' : ''}" data-act="booktab" data-tab="artists">单个画师 · \${Object.keys(d.artists).length}</button>
    </div>`, "    ${pcBookSeg(d)}");

    // ── 打星：批量每行、画师库卡片、「有星的」筛选
    patch("${pcBatchRowExtra(d, r)}</span>", "${pcBatchStars(d, r)}${pcBatchRowExtra(d, r)}</span>");
    patch(".pc-btable{display:grid;", ".pc-bstars{display:block;margin-top:3px;white-space:nowrap}.pc-bstars button{font:inherit;font-size:15px;line-height:1;border:0;background:transparent;padding:0 1px;color:#c7b8a0;cursor:pointer}.pc-bstars button.on{color:#c98a3e}.pc-btable{display:grid;");
    patch("if (it && it.note === '批量生成时存的' && rn) it.note = rn; }",
        "if (it && it.note === '批量生成时存的' && rn) it.note = rn; const rs = ui.batch.state.rowStars?.['t:' + j.text]; if (rs && it && !it.stars) it.stars = rs; }");
    patch('<div class="pc-ticket-text"><b>${esc(name)}</b>', '<div class="pc-ticket-text"><b>${esc(name)}${Number(it.stars) > 0 ? ` <span style="color:#c98a3e;font-weight:400">${\'★\'.repeat(Number(it.stars))}</span>` : \'\'}</b>');
    patch("[['all', '全部'], ['fav', '收藏'], ...cols", "[['all', '全部'], ['fav', '收藏'], ['star', '★ 有星的'], ...cols");
    patch("    if (ui.bookFilter === 'fav') list = list.filter(x => x.fav);", "    if (ui.bookFilter === 'fav') list = list.filter(x => x.fav);\n    else if (ui.bookFilter === 'star') list = list.filter(x => Number(x.stars) > 0);");
    patch("    else list.sort((a, b) => a.tag.localeCompare(b.tag));\n    return list.map",
        "    else list.sort((a, b) => a.tag.localeCompare(b.tag));\n    if (ui.bookFilter === 'star') list.sort((a, b) => (Number(b.stars) || 0) - (Number(a.stars) || 0));\n    return list.map");

    // ── 批量重画失败的
    patch('      <div class="pc-actions wrap"><button class="pc-btn" data-act="batchsetup">',
        '      <div class="pc-actions wrap">${(() => { if (st.running) return \'\'; const err = st.jobs.filter(j => j.status === \'error\').length, rest = st.jobs.filter(j => j.status === \'wait\').length; return err + rest ? `<button class="pc-btn dark" data-act="batchretry">${err && rest ? `重画失败的 ${err} 张、接着画剩下的 ${rest} 张` : err ? `重画失败的 ${err} 张` : `接着画剩下的 ${rest} 张`}</button>` : \'\'; })()}<button class="pc-btn" data-act="batchsetup">');

    // ── 设置：删过的画师
    patch("＋ 拉黑画师</button>`);", "＋ 拉黑画师</button>`) + pcDeletedFold(d);");

    // ── 生图页：固定种子提示
    patch('    <button class="pc-btn dark big pc-mt" data-act="generate" ${st.busy ? \'disabled\' : \'\'}>',
        '    ${Number(s.novelai_seed) > 0 ? `<div class="pc-row-between pc-mt-s" style="font-size:13px;padding:6px 10px;border-radius:10px;background:#f4efe4;border:1.5px dashed #c98a3e"><span>种子：固定 <b class="mono">${esc(s.novelai_seed)}</b> · 每张都会很像</span><button class="pc-pill tiny dashed" data-act="seedrandom">改回随机</button></div>` : \'\'}\n    <button class="pc-btn dark big pc-mt" data-act="generate" ${st.busy ? \'disabled\' : \'\'}>');
    patch("        if (el.dataset.st === 'size') render();\n        return;", "        if (el.dataset.st === 'size' || el.dataset.st === 'novelai_seed') render();\n        return;");
    return s;
}
