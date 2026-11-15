import assert from 'node:assert/strict';

// 0.8.67：批量页一键放进画师库全部画师串 / 全部（串 + 单个画师）重跑例图；不是画师的单个画师打开时直接删掉
export function applyBatchRefillCompatibility(s) {
    const patch = (a, b) => { assert.equal(s.split(a).length, 2, a.slice(0, 80)); s = s.replace(a, () => b); };
    patch('<button class="pc-pill dashed tiny" data-act="batchfill" data-v="empty">只放还没有例图的</button></div>',
        '<button class="pc-pill dashed tiny" data-act="batchfill" data-v="empty">只放还没有例图的</button><button class="pc-pill dashed tiny" data-act="batchfill" data-v="groups">放进全部画师串</button><button class="pc-pill dashed tiny" data-act="batchfill" data-v="every">画师串和单个画师全部</button></div>\n      <div class="pc-hint">画师库里已有的串和画师，生成的例图会直接存回原来那一串 / 那位画师。想全部换成同一个模板对比，就选好下面的提示词，关掉「已经有这种例图的跳过」。</div>');
    patch("            case 'batchfill': {\n                const arts = Object.values(d.artists).filter(a => (el.dataset.v === 'all' || !a.images.length) && !M.banInfo(d, a.tag));\n                ui.batch.text = arts.map(a => a.tag.replace(/^artist:/, '')).join('\\n');",
        "            case 'batchfill': {\n                const v = el.dataset.v;\n                const arts = v === 'groups' ? [] : Object.values(d.artists).filter(a => (v !== 'empty' || !a.images.length) && !M.banInfo(d, a.tag));\n                const groups = v === 'groups' || v === 'every' ? Object.values(d.groups).filter(g => (g.members || []).length).map(g => M.ticketString(d, { type: 'group', id: g.id })).filter(t => t && !M.bannedIn(d, t).length) : [];\n                ui.batch.text = [...groups, ...arts.map(a => a.tag.replace(/^artist:/, ''))].join('\\n');\n                toastr.info(`放进 ${groups.length} 串、${arts.length} 位画师`, '批量生成例图', { timeOut: 2000 });");
    // 不是画师的单个画师：不再改成画师串留着，直接删掉；以前这样留下来的空串也删掉
    patch('    mergeDupArtists(d);\n', "    mergeDupArtists(d);\n    for (const g of Object.values(d.groups)) if (g.migratedArtistId && !(g.members || []).length && !(g.images || []).length) { deleteGroup(d, g.id); if (d.beforeBinding?.type === 'group' && d.beforeBinding.id === g.id) d.beforeBinding = null; }\n");
    return s;
}
