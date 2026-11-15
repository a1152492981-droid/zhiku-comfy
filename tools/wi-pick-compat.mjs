import assert from 'node:assert/strict';
// 0.8.62：读设定（从角色卡读 / 读出这张卡里所有人）前，可以自己勾要发哪些世界书条目，一次勾好几条
export function applyWiPickCompatibility(s) {
    const patch = (a, b) => { assert.equal(s.split(a).length, 2, a.slice(0, 90)); s = s.replace(a, () => b); };
    // ── descOfFull：世界书条目先收成候选，默认照旧（配角 / 写了设定时只要提到名字的）；choose 给了就让人挑 ──
    patch("async function descOfFull(c, { all = false } = {}) {", "async function descOfFull(c, { all = false, choose = null } = {}) {");
    patch(`    const fromBook = (title, entries, name) => {
        const list = (Array.isArray(entries) ? entries : Object.values(entries || {}))
            .filter(e => e && !e.disable && e.enabled !== false && String(e.content || '').trim());
        const picked = name ? list.filter(e => [e.comment, e.content, ...(e.key || e.keys || [])].some(x => String(x || '').includes(name))) : list;
        for (const e of picked) add(\`\${title}：\${e.comment || (e.key || e.keys || []).join('、') || '条目'}\`, e.content);
    };`,
        `    const cands = [];
    const fromBook = (title, entries, name) => {
        const list = (Array.isArray(entries) ? entries : Object.values(entries || {}))
            .filter(e => e && !e.disable && e.enabled !== false && String(e.content || '').trim());
        for (const e of list) cands.push({ title, e, auto: !name || [e.comment, e.content, ...(e.key || e.keys || [])].some(x => String(x || '').includes(name)) });
    };
    // 把候选条目真正加进设定：没让挑就加默认那些；让挑就弹出来勾
    const flush = async () => {
        let use = cands.filter(x => x.auto);
        if (choose && cands.length) {
            const sel = await choose(cands.map(x => ({ title: x.title, name: x.e.comment || (x.e.key || x.e.keys || []).join('、') || '条目', content: String(x.e.content || ''), auto: x.auto })), c);
            if (!sel) throw Object.assign(new Error('没选条目'), { name: 'AbortError' });
            use = cands.filter((_, i) => sel.has(i));
        }
        for (const x of use) add(\`\${x.title}：\${x.e.comment || (x.e.key || x.e.keys || []).join('、') || '条目'}\`, x.e.content);
        cands.length = 0;
    };`);
    patch("        fromBook('人设世界书', await loadBook(pd.lorebook), parts.length ? c.name : '');\n",
        "        fromBook('人设世界书', await loadBook(pd.lorebook), parts.length ? c.name : '');\n        await flush();\n");
    patch("        if (!side && !hadCard) add('开场白', card?.first_mes || dd.first_mes);",
        "        await flush();\n        if (!side && !hadCard) add('开场白', card?.first_mes || dd.first_mes);");
    // ── 角色页：开关 + 两个读取入口带上 choose ──
    patch("                const desc = await C.descOfFull(main, { all: true });",
        "                const desc = await C.descOfFull(main, { all: true, choose: getData().options.pickWi ? pickWiEntries : null }).catch(e => { if (e?.name === 'AbortError') return null; throw e; });\n"
        + "                if (desc === null) { ui.charBusy = ''; render(); return true; }");
    patch("            const descRaw = await C.descOfFull(c).catch(() => '');",
        "            const descRaw = await C.descOfFull(c, { choose: getData().options.pickWi ? pickWiEntries : null }).catch(e => e?.name === 'AbortError' ? null : '');\n"
        + "            if (descRaw === null) { ui.charBusy = ''; render(); return true; }");
    patch("data-act=\"readchatcast\" ${busy ? 'disabled' : ''}>${busy === 'chatcast' ? '<span class=\"pc-busy\">读取中</span>' : '从聊天正文读出人物（最近 40 楼）'}</button>",
        "data-act=\"readchatcast\" ${busy ? 'disabled' : ''}>${busy === 'chatcast' ? '<span class=\"pc-busy\">读取中</span>' : '从聊天正文读出人物（最近 40 楼）'}</button>"
        + "<label class=\"pc-switch pc-mt-s\"><input type=\"checkbox\" data-pickwi ${d.options.pickWi ? 'checked' : ''}><span></span>读之前自己挑世界书条目<small>点「从角色卡读」「读出这张卡里所有人」时先列出世界书条目，勾哪几条就发哪几条</small></label>");
    patch("    if (el.dataset.outadd !== undefined) {", "    if (el.dataset.pickwi !== undefined) { getData().options.pickWi = el.checked; commit({ silent: true }); return; }\n    if (el.dataset.outadd !== undefined) {");
    // ── 挑条目的弹窗 ──
    patch("function viewCharEdit(d) {", `/** 挑世界书条目：list = [{ title, name, content, auto }]，返回选中的下标 Set；取消返回 null */
function pickWiEntries(list, c) {
    return new Promise(resolve => {
        const sel = new Set(list.map((x, i) => x.auto ? i : -1).filter(i => i >= 0));
        let q = '';
        const box = modal(\`<h3 class="pc-h3">挑要发给 AI 的世界书条目</h3>
          <div class="pc-dim small">读「\${esc(c?.name || '')}」的设定。默认勾好的是插件原本会发的（只要提到名字的那些）。勾得越多越准，但越长越慢、越贵。</div>
          <label class="pc-search pc-mt-s"><span class="pc-sr">搜条目</span>\${ICON.search}<input data-wq placeholder="搜条目名或内容"></label>
          <div class="pc-chips wrap" style="margin-top:6px"><button class="pc-pill dashed tiny" data-wa="all">全选</button><button class="pc-pill dashed tiny" data-wa="none">全不选</button><button class="pc-pill dashed tiny" data-wa="auto">回到默认</button><button class="pc-pill dashed tiny" data-wa="shown">只选搜到的</button></div>
          <div data-wl style="max-height:48vh;overflow:auto;margin-top:8px"></div>
          <div class="pc-dim small" data-wc style="margin-top:6px"></div>
          <div class="pc-actions"><button class="pc-btn" data-wa="no">算了</button><button class="pc-btn dark" data-wa="ok">用这些读</button></div>\`);
        const shown = () => list.map((x, i) => i).filter(i => !q || (list[i].title + list[i].name + list[i].content).toLowerCase().includes(q));
        const draw = () => {
            let last = '';
            box.querySelector('[data-wl]').innerHTML = shown().map(i => { const x = list[i]; const head = x.title !== last ? \`<div class="pc-label" style="margin:10px 0 4px">\${esc(x.title)}</div>\` : ''; last = x.title;
                return head + \`<label style="display:flex;gap:8px;align-items:flex-start;padding:6px 2px;border-bottom:1px dashed var(--pc-dash);cursor:pointer"><input type="checkbox" data-wi="\${i}" \${sel.has(i) ? 'checked' : ''} style="margin-top:3px"><span class="pc-grow"><b style="font-size:13.5px">\${esc(x.name)}</b>\${x.auto ? ' <small class="pc-dim">· 提到了</small>' : ''}<small class="pc-dim" style="display:block;line-height:1.5">\${esc(x.content.slice(0, 70))}\${x.content.length > 70 ? '…' : ''}（\${x.content.length} 字）</small></span></label>\`; }).join('') || '<div class="pc-dim small">没有搜到</div>';
            const chars = [...sel].reduce((n, i) => n + list[i].content.length, 0);
            box.querySelector('[data-wc]').textContent = \`选了 \${sel.size} / \${list.length} 条，约 \${chars} 字\${chars > 60000 ? '（超过 6 万字，后面的会被截掉）' : ''}\`;
        };
        box.addEventListener('input', ev => { if (ev.target.matches('[data-wq]')) { q = ev.target.value.trim().toLowerCase(); draw(); } });
        box.addEventListener('change', ev => { const i = ev.target.dataset?.wi; if (i == null) return; ev.target.checked ? sel.add(Number(i)) : sel.delete(Number(i)); draw(); });
        box.addEventListener('click', ev => {
            const a = ev.target.closest('[data-wa]')?.dataset.wa; if (!a) return;
            if (a === 'no') { box.closeModal(); resolve(null); return; }
            if (a === 'ok') { box.closeModal(); resolve(sel); return; }
            if (a === 'all') list.forEach((_, i) => sel.add(i));
            if (a === 'none') sel.clear();
            if (a === 'auto') { sel.clear(); list.forEach((x, i) => x.auto && sel.add(i)); }
            if (a === 'shown') { sel.clear(); shown().forEach(i => sel.add(i)); }
            draw();
        });
        box.parentElement?.addEventListener('click', ev => { if (ev.target === box.parentElement) resolve(null); });
        draw();
    });
}
function viewCharEdit(d) {`);
    return s;
}
