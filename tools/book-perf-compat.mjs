import assert from 'node:assert/strict';

// 0.8.73：画师库一次只画 40 个（下面「再显示」），几百个画师也不卡、不闪退；
// 多选时点一下只改那一格，不整页重画；多选栏加「选没例图的」，批量存进来又不要的能一口气删
export function applyBookPerfCompatibility(s) {
    const patch = (a, b) => { assert.equal(s.split(a).length, 2, a.slice(0, 80)); s = s.replace(a, () => b); };
    patch("    ${view === 'grid' ? `<div class=\"pc-grid2 pc-mt-s\">${refs.map(r => ticketCard(d, r)).join('') || emptyTxt}</div>`\n        : `<div class=\"pc-mt-s\">${refs.map(r => listCard(d, r)).join('') || emptyTxt}</div>`}",
        "    ${(() => { const n = Math.max(40, Number(ui.bookShow) || 40), shown = refs.slice(0, n); return (view === 'grid' ? `<div class=\"pc-grid2 pc-mt-s\">${shown.map(r => ticketCard(d, r)).join('') || emptyTxt}</div>`\n        : `<div class=\"pc-mt-s\">${shown.map(r => listCard(d, r)).join('') || emptyTxt}</div>`) + (refs.length > n ? `<div class=\"pc-center pc-mt-s\"><button class=\"pc-pill dashed\" id=\"pc-bookmore\" data-act=\"bookmore\">再显示 ${Math.min(40, refs.length - n)} 个 · 共 ${refs.length} 个</button></div>` : (refs.length > 40 ? `<div class=\"pc-dim small pc-center pc-mt-s\">全部 ${refs.length} 个都在这里了</div>` : '')); })()}");
    patch("            case 'booktab': ui.bookTab = el.dataset.tab; ui.picked.clear(); render(); break;\n            case 'bookfilter': ui.bookFilter = el.dataset.f; render(); break;",
        "            case 'booktab': ui.bookTab = el.dataset.tab; ui.picked.clear(); ui.bookShow = 40; render(); break;\n            case 'bookfilter': ui.bookFilter = el.dataset.f; ui.bookShow = 40; render(); break;\n            case 'bookmore': ui.bookShow = (Math.max(40, Number(ui.bookShow) || 40)) + 40; render(); break;\n            case 'selempty': { bookList(d).forEach(r => { if (!(itemOf(d, r)?.images || []).length) ui.picked.add(r.id); }); render(); break; }");
    // 多选时点一下：只改那一格和计数，不整页重画（几百张图整页重画手机会卡退）
    patch("            case 'selpick': { const id = el.dataset.id; if (ui.picked.has(id)) ui.picked.delete(id); else ui.picked.add(id); render(); break; }",
        `            case 'selpick': {
                const id = el.dataset.id;
                if (ui.picked.has(id)) ui.picked.delete(id); else ui.picked.add(id);
                const on = ui.picked.has(id);
                root.querySelectorAll('.pc-selbox').forEach(b => { if ((b.dataset.id || b.closest('[data-id]')?.dataset.id) === id) { b.classList.toggle('on', on); b.textContent = on ? '✓' : ''; } });
                const bar = root.querySelector('.pc-selbar');
                if (bar) { const t = bar.querySelector('span'); if (t) t.textContent = \`已选 \${ui.picked.size} 个\`; bar.querySelectorAll('[data-act="seltag"],[data-act="selstring"],[data-act="selban"],[data-act="seldel"]').forEach(x => { x.disabled = !ui.picked.size; }); }
                break;
            }`);
    patch(`<button class="pc-pill dashed tiny" data-act="selall">全选</button>`,
        `<button class="pc-pill dashed tiny" data-act="selall">全选</button><button class="pc-pill dashed tiny" data-act="selempty">选没例图的</button>`);
    // 搜索变了也从头显示
    patch("        if (el.dataset.bind === 'search') { clearTimeout(onInput.t);", "        if (el.dataset.bind === 'search') { ui.bookShow = 40; clearTimeout(onInput.t);");
    return s;
}
