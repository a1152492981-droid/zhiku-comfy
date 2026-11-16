import assert from 'node:assert/strict';

// 0.8.78：备注随手写
// - 生图页画师串名字下面直接写备注（单个画师也行），和画师库里那条是同一份
// - 批量结果：画师名下面写备注（不在库里的先记在这批结果里，存进库时带上）；单个画师可以直接拉黑，要写理由
// - 拉黑过的画师不再进批量生成；生成中途拉黑的，还没出的那几张直接跳过
// - 删画师时可以顺手写为什么删，以后批量里再出现会提示「删过：理由」
export function applyArtistNotesCompatibility(s) {
    const patch = (a, b) => { assert.equal(s.split(a).length, 2, a.slice(0, 80)); s = s.replace(a, () => b); };

    // ── 通用小工具：删除时写理由的确认框、删过的记录
    patch("function promptText(title, value = '', multiline = false) {",
`function pcDelNoteBox(msg, okText = '删除') {
    return new Promise(resolve => {
        const box = modal(\`<h3 class="pc-h3">\${esc(msg)}</h3>
          <label class="pc-label" style="margin-top:8px">为什么删（可不填）</label>
          <input class="pc-input" data-v placeholder="比如：脸崩、太油、和别的串撞了">
          <div class="pc-dim small" style="margin-top:4px">写了的话，以后批量里再出现这位画师会提示「删过：理由」。</div>
          <div class="pc-actions"><button class="pc-btn" data-m="no">算了</button><button class="pc-btn dark" data-m="ok">\${esc(okText)}</button></div>\`);
        const done = v => { box.closeModal(); resolve(v); };
        box.addEventListener('click', ev => { const m = ev.target.closest('[data-m]')?.dataset.m; if (m === 'ok') done(box.querySelector('[data-v]').value.trim()); if (m === 'no') done(null); });
        box.addEventListener('keydown', ev => { if (ev.key === 'Enter' && !ev.isComposing && ev.keyCode !== 229) done(box.querySelector('[data-v]').value.trim()); });
    });
}
function pcRecordDeleted(d, tags, note) {
    if (!note) return;
    const m = (d.options.deletedNotes ||= {});
    for (const t of tags) if (t) m[M.artistKey(M.normalizeArtistTag(t))] = { tag: M.normalizeArtistTag(t), note, at: Date.now() };
}
function pcDeletedNote(d, tag) { return d.options?.deletedNotes?.[M.artistKey(M.normalizeArtistTag(tag))] || null; }
function promptText(title, value = '', multiline = false) {`);

    // ── 删除时写理由：详情页删除、多选删除、只留选中的
    patch("                if (!(await confirmBox(r.type === 'group' ? `删除画师组「${name}」？组里的画师和他们的例图不会被删。` : `删除画师「${name}」？他的例图会一起删掉，也会从所有画师组里移出。`))) break;\n                const t = M.resolveTicket(d, r);",
        "                const delNote = r.type === 'group' ? ((await confirmBox(`删除画师组「${name}」？组里的画师和他们的例图不会被删。`)) ? '' : null) : await pcDelNoteBox(`删除画师「${name}」？他的例图会一起删掉，也会从所有画师组里移出。`);\n                if (delNote == null) break;\n                const t = M.resolveTicket(d, r);\n                if (r.type === 'artist') pcRecordDeleted(d, [t.item.tag], delNote);");
    patch("                if (!(await confirmBox(type === 'group' ? `删除选中的 ${ids.length} 个画师组？组里的画师不会被删。` : `删除选中的 ${ids.length} 位画师？他们的例图会一起删掉，也会从所有画师组里移出。`, { ok: '删除', cancel: '算了' }))) break;",
        "                const delNote = type === 'group' ? ((await confirmBox(`删除选中的 ${ids.length} 个画师组？组里的画师不会被删。`, { ok: '删除', cancel: '算了' })) ? '' : null) : await pcDelNoteBox(`删除选中的 ${ids.length} 位画师？他们的例图会一起删掉，也会从所有画师组里移出。`);\n                if (delNote == null) break;\n                if (type === 'artist') pcRecordDeleted(d, ids.map(id => d.artists[id]?.tag), delNote);");
    patch("                if (!(await confirmBox(`留下选中的 ${keep} 位，删掉${filtered ? '当前筛选出来的' : ''}其余 ${ids.length} 位画师？他们的例图会一起删掉，也会从所有画师组里移出。`, { ok: `删掉 ${ids.length} 位`, cancel: '算了' }))) break;",
        "                const delNote = await pcDelNoteBox(`留下选中的 ${keep} 位，删掉${filtered ? '当前筛选出来的' : ''}其余 ${ids.length} 位画师？他们的例图会一起删掉，也会从所有画师组里移出。`, `删掉 ${ids.length} 位`);\n                if (delNote == null) break;\n                pcRecordDeleted(d, ids.map(id => d.artists[id]?.tag), delNote);");
    // 多选拉黑：提示写理由
    patch("const note = await promptText(`拉黑选中的 ${ids.length} 位画师——备注（可不填）`, '');",
        "const note = await promptText(`拉黑选中的 ${ids.length} 位画师——理由（可不填）`, '');");

    // ── 生图页：名字下面写备注
    patch("${owner && M.ticketCover(d, owner) ? ' · 点图看大图' : ''}</small></div>",
        "${owner && M.ticketCover(d, owner) ? ' · 点图看大图' : ''}</small>${(() => { const it = owner && M.resolveTicket(d, owner)?.item; if (!it) return ''; return it.note ? `<div class=\"pc-studionote\" data-act=\"studionote\" style=\"margin-top:6px;font-size:13px;line-height:1.5;padding:5px 9px;border-radius:8px;background:rgba(120,90,60,.1);cursor:pointer;white-space:pre-wrap;word-break:break-word\">${esc(it.note)} <span class=\"pc-dim\">✎</span></div>` : '<button class=\"pc-pill dashed tiny\" style=\"margin-top:6px\" data-act=\"studionote\">＋ 写备注</button>'; })()}</div>");
    patch("            case 'studiorename': {",
`            case 'studionote': {
                const ref = M.resolveTicket(getData(), ui.studio.sourceRef) ? ui.studio.sourceRef : null;
                const it = ref && M.resolveTicket(getData(), ref).item;
                if (!it) break;
                const n = await promptText(\`给「\${M.ticketName(getData(), ref)}」写备注\`, it.note || '', true);
                if (n == null || n === (it.note || '')) break;
                it.note = n;
                await __mod_store.commit({ immediate: true, silent: true });
                render(); break;
            }
            case 'studiorename': {`);

    // ── 批量结果：画师名下面备注 / 拉黑 / 删过
    patch("function viewBatchResults(d, head) {",
`function pcBatchRowRef(d, key) {
    const j = (ui.batch.state?.jobs || []).find(o => batchRowKey(o) === key && o.ref && M.resolveTicket(d, o.ref));
    return j ? j.ref : null;
}
function pcBatchRowTag(d, key, text) {
    const ref = pcBatchRowRef(d, key);
    if (ref?.type === 'artist') return d.artists[ref.id]?.tag || '';
    const p = M.parseArtistString(ref ? M.ticketString(d, ref) : text || '');
    return p.members.length === 1 ? p.members[0].tag : '';
}
function pcBatchRowExtra(d, r, mini = false) {
    const ref = pcBatchRowRef(d, r.key), it = ref && M.resolveTicket(d, ref)?.item;
    const note = it ? it.note || '' : ui.batch.state?.rowNotes?.[r.key] || '';
    const tag = pcBatchRowTag(d, r.key, r.text), ban = tag && M.banInfo(d, tag), del = !it && tag && pcDeletedNote(d, tag);
    const k = esc(r.key);
    if (mini) return \`<button class="pc-bnote mini" data-act="batchnote" data-k="\${k}" title="写备注">✎</button>\`;
    return \`\${ban ? \`<em class="pc-bban">已拉黑\${ban.note ? '：' + esc(ban.note) : ''}</em>\` : ''}\${del ? \`<em class="pc-bdel">删过：\${esc(del.note)}</em>\` : ''}
      \${note ? \`<button class="pc-bnote" data-act="batchnote" data-k="\${k}">\${esc(note)} ✎</button>\` : \`<button class="pc-bnote add" data-act="batchnote" data-k="\${k}">＋ 备注</button>\`}
      \${tag && !ban ? \`<button class="pc-bnote ban" data-act="batchban" data-k="\${k}">拉黑</button>\` : ''}\`;
}
function viewBatchResults(d, head) {`);
    patch("<span class=\"pc-btr\" title=\"${esc(r.text)}\">${esc(r.name)}${r.inLib ? '' : '<em>不在库里</em>'}</span>",
        "<span class=\"pc-btr\" title=\"${esc(r.text)}\">${esc(r.name)}${r.inLib ? '' : '<em>不在库里</em>'}${pcBatchRowExtra(d, r)}</span>");
    patch("${table ? '' : `<b class=\"mono\">${esc(batchRowName(d, j))} · ${esc(batchColName(d, j, true))}</b>`}",
        "${table ? '' : `<b class=\"mono\">${esc(batchRowName(d, j))} · ${esc(batchColName(d, j, true))}${pcBatchRowExtra(d, { key: batchRowKey(j), text: j.text }, true)}</b>`}");
    patch(".pc-btable{display:grid;",
        ".pc-studionote{margin-top:6px;font-size:13px;line-height:1.5;padding:5px 9px;border-radius:8px;background:rgba(120,90,60,.1);cursor:pointer;white-space:pre-wrap;word-break:break-word}.pc-bnote{display:block;margin-top:4px;max-width:100%;text-align:left;font:inherit;font-size:11px;line-height:1.35;padding:2px 6px;border-radius:7px;border:0;background:#efe6d6;color:#3a2e26;cursor:pointer;word-break:break-all}.pc-bnote.add,.pc-bnote.ban{display:inline-block;background:#f4efe4;border:1.5px dashed var(--pc-dash);border-radius:999px;margin-right:4px}.pc-bnote.ban{color:#a2593f}.pc-bnote.mini{display:inline;margin:0 0 0 4px;padding:0 4px;background:transparent}.pc-btr .pc-bban,.pc-btr .pc-bdel{display:block;font-style:normal;color:#9b4f45;background:#f4efe4;border-radius:7px;padding:2px 6px;font-size:11px;margin-top:4px;opacity:1}.pc-btable{display:grid;");
    patch("            case 'batchsave': try {",
`            case 'batchnote': {
                const key = el.dataset.k, st = ui.batch.state;
                if (!st) break;
                const ref = pcBatchRowRef(d, key), it = ref && M.resolveTicket(d, ref)?.item;
                const job = st.jobs.find(o => batchRowKey(o) === key);
                const name = it ? M.ticketName(d, ref) : batchRowName(d, job || { text: key.replace(/^t:/, '') });
                const n = await promptText(\`给「\${name}」写备注\`, it ? it.note || '' : st.rowNotes?.[key] || '', true);
                if (n == null) break;
                if (it) { it.note = n; commit({ silent: true }); }
                else { (st.rowNotes ||= {})[key] = n; }
                render(); break;
            }
            case 'batchban': {
                const key = el.dataset.k, st = ui.batch.state;
                const job = st?.jobs.find(o => batchRowKey(o) === key);
                const tag = pcBatchRowTag(d, key, job?.text);
                if (!tag) break;
                const note = await promptText(\`拉黑「\${tag.replace(/^artist:/, '')}」——理由（可不填）\`, '');
                if (note == null) break;
                M.setBan(d, tag, note.trim());
                let skipped = 0;
                for (const o of st.jobs) if (o.status === 'wait' && M.bannedIn(d, o.ref && M.resolveTicket(d, o.ref) ? M.ticketString(d, o.ref) : o.text).length) { o.status = 'skip'; o.error = '拉黑了'; skipped++; }
                commit();
                toastr.info(\`拉黑了\${skipped ? \`，还没出的 \${skipped} 张不画了\` : ''}\`, '智库', { timeOut: 1800 });
                render(); break;
            }
            case 'batchsave': try {`);
    // 存进画师库时带上这批结果里写的备注
    patch("            if (!ref) continue;\n            made++;",
        "            if (!ref) continue;\n            made++;\n            { const rn = ui.batch.state.rowNotes?.['t:' + j.text], it = M.resolveTicket(d, ref)?.item; if (rn && it && !it.note) it.note = rn; if (it && it.note === '批量生成时存的' && rn) it.note = rn; }");

    // ── 拉黑过的画师不进批量
    patch("    for (const u of list) {\n        const ref = findUnit(d, u);",
        "    const pcBanSkipped = [];\n    for (const u of list) {\n        const ref = findUnit(d, u);");
    patch("        const item = ref && M.resolveTicket(d, ref)?.item;\n        for (const t of tpls) {",
        "        const item = ref && M.resolveTicket(d, ref)?.item;\n        if (M.bannedIn(d, item ? M.ticketString(d, ref) : text).length) { pcBanSkipped.push(u.name || text); continue; }\n        for (const t of tpls) {");
    patch("        }\n    }\n    commit();\n    const old = ui.batch.state;",
        "        }\n    }\n    if (!jobs.length && pcBanSkipped.length) { toastr.warning(`这些画师都拉黑了，没有可画的`, '批量生成例图'); return; }\n    if (pcBanSkipped.length) toastr.info(`跳过了 ${pcBanSkipped.length} 串拉黑过的画师`, '批量生成例图');\n    commit();\n    const old = ui.batch.state;");
    patch("    if (!list.length) { toastr.warning('先粘贴几位画师或画师串', '批量生成例图'); return; }",
        "    const pcBanLines = M.parseBatchLines(ui.batch.text).length - list.length;\n    if (!list.length) { toastr.warning(pcBanLines ? `粘贴的 ${pcBanLines} 串里都有拉黑过的画师，没有可画的` : '先粘贴几位画师或画师串', '批量生成例图'); return; }\n    if (pcBanLines) toastr.info(`跳过了 ${pcBanLines} 串拉黑过的画师`, '批量生成例图');");
    patch("skip: '已有，跳过' }", "skip: j.error === '拉黑了' ? '拉黑了，不画' : '已有，跳过' }");
    return s;
}
