import assert from 'node:assert/strict';

// 0.8.75：画师库多选加「反选」和「删掉没选的」——勾住想留的画师，一键删掉当前列表里其它的
export function applySelRestCompatibility(s) {
    const patch = (a, b) => { assert.equal(s.split(a).length, 2, a.slice(0, 80)); s = s.replace(a, () => b); };
    patch(`<button class="pc-pill dashed tiny" data-act="selall">全选</button><button class="pc-pill dashed tiny" data-act="selempty">选没例图的</button>`,
        `<button class="pc-pill dashed tiny" data-act="selall">全选</button><button class="pc-pill dashed tiny" data-act="selinvert">反选</button><button class="pc-pill dashed tiny" data-act="selempty">选没例图的</button>`);
    patch(`      <button class="pc-pill tiny danger-solid" data-act="seldel" \${ui.picked.size ? '' : 'disabled'}>删除</button></div>\` : ''}`,
        `      <button class="pc-pill tiny danger-solid" data-act="seldel" \${ui.picked.size ? '' : 'disabled'}>删除</button>
      \${ui.bookTab === 'artists' ? \`<button class="pc-pill tiny danger" data-act="seldelrest" \${ui.picked.size ? '' : 'disabled'}>只留选中的，删掉没选的</button>\` : ''}</div>\` : ''}`);
    patch(`[data-act="seldel"]').forEach`, `[data-act="seldel"],[data-act="seldelrest"]').forEach`);
    patch(`            case 'selall': {`,
        `            case 'selinvert': { const refs = bookList(d); refs.forEach(r => { if (ui.picked.has(r.id)) ui.picked.delete(r.id); else ui.picked.add(r.id); }); render(); break; }
            case 'seldelrest': {
                if (ui.bookTab !== 'artists' || !ui.picked.size) break;
                const keep = ui.picked.size;
                const ids = bookList(d).map(r => r.id).filter(id => !ui.picked.has(id) && d.artists[id]);
                if (!ids.length) { toastr.info('当前列表里没有没选的画师', '智库'); break; }
                const filtered = !!String(ui.search || '').trim() || (ui.bookFilter || 'all') !== 'all';
                if (!(await confirmBox(\`留下选中的 \${keep} 位，删掉\${filtered ? '当前筛选出来的' : ''}其余 \${ids.length} 位画师？他们的例图会一起删掉，也会从所有画师组里移出。\`, { ok: \`删掉 \${ids.length} 位\`, cancel: '算了' }))) break;
                const imgs = ids.flatMap(id => (d.artists[id].images || []).map(i => i.path));
                for (const id of ids) M.deleteArtist(d, id);
                ui.picked.clear(); ui.selecting = false;
                commit();
                imgs.forEach(p => deleteImageFile(p));
                toastr.success(\`删掉了 \${ids.length} 位，留下 \${keep} 位\`, '智库');
                break;
            }
            case 'selall': {`);
    return s;
}
