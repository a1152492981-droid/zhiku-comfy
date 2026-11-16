// ───── 0.8.79：回收站（删掉的先放 7 天，能撤销、能放回）
const PC_TRASH_DAYS = 7;
function pcTrash(d) { return Array.isArray(d.options.trash) ? d.options.trash : (d.options.trash = []); }
function pcTrashPut(d, refs, note = '') {
    const out = [];
    for (const r of refs) {
        const it = r.type === 'group' ? d.groups[r.id] : d.artists[r.id];
        if (!it) continue;
        const groups = r.type === 'artist' ? Object.values(d.groups).flatMap(g => (g.members || []).filter(m => m.artistId === r.id).map(m => ({ gid: g.id, weight: m.weight ?? 1 }))) : [];
        const e = { tid: M.uid('tr_'), type: r.type, item: structuredClone(it), groups, at: Date.now(), note: note || '' };
        pcTrash(d).unshift(e); out.push(e.tid);
    }
    return out;
}
// 放回时换一个新 id：旧 id 已经记成「删过」，用旧 id 会被别的设备的记录再删一次
function pcTrashRestore(d, tids) {
    const list = pcTrash(d); let n = 0;
    for (const tid of tids) {
        const i = list.findIndex(e => e.tid === tid); if (i < 0) continue;
        const e = list[i]; list.splice(i, 1);
        if (e.type === 'artist') {
            const exist = M.findArtistByTag(d, e.item.tag);
            let id;
            if (exist) {
                id = exist.id;
                const have = new Set((exist.images || []).map(x => x.path));
                for (const im of e.item.images || []) if (!have.has(im.path)) (exist.images ||= []).push(im);
                if (!exist.note && e.item.note) exist.note = e.item.note;
                if (!exist.stars && e.item.stars) exist.stars = e.item.stars;
            } else { id = M.uid('a_'); d.artists[id] = { ...structuredClone(e.item), id }; }
            for (const g of e.groups) { const grp = d.groups[g.gid]; if (grp && !grp.members.some(m => m.artistId === id)) grp.members.push({ artistId: id, weight: g.weight ?? 1 }); }
            if (d.options.deletedNotes) delete d.options.deletedNotes[M.artistKey(M.normalizeArtistTag(e.item.tag))];
        } else {
            const id = M.uid('g_'), g = { ...structuredClone(e.item), id };
            g.members = (g.members || []).filter(m => d.artists[m.artistId]);
            d.groups[id] = g;
        }
        n++;
    }
    return n;
}
function pcTrashPurge(d, only = null) {
    const list = pcTrash(d), cut = Date.now() - PC_TRASH_DAYS * 864e5;
    const drop = list.filter(e => only ? only.includes(e.tid) : e.at < cut);
    if (!drop.length) return 0;
    d.options.trash = list.filter(e => !drop.includes(e));
    const live = new Set([...Object.values(d.artists), ...Object.values(d.groups), ...d.options.trash.map(e => e.item)].flatMap(x => (x.images || []).map(i => i.path)));
    for (const e of drop) for (const i of e.item.images || []) if (i.path && !live.has(i.path)) deleteImageFile(i.path);
    return drop.length;
}
function pcUndoBar(text, onUndo) {
    DOC.getElementById('pc-undobar')?.remove();
    const el = DOC.createElement('div'); el.id = 'pc-undobar';
    el.setAttribute('style', 'position:fixed;left:12px;right:12px;bottom:max(18px,env(safe-area-inset-bottom));z-index:2147483646;display:flex;align-items:center;gap:10px;max-width:520px;margin:0 auto;padding:10px 14px;border-radius:14px;background:#3a2e26;color:#f4efe4;font-size:14px;box-shadow:0 6px 20px rgba(0,0,0,.25);box-sizing:border-box');
    el.innerHTML = `<span style="flex:1">${esc(text)}</span><button type="button" style="font:inherit;border:0;border-radius:999px;padding:4px 14px;background:#f4efe4;color:#3a2e26;cursor:pointer">撤销</button>`;
    el.querySelector('button').addEventListener('click', ev => { ev.stopPropagation(); el.remove(); onUndo(); });
    pcMount(el);
    setTimeout(() => el.remove(), 9000);
}
function pcUndoDelete(tids, what) {
    pcUndoBar(`删掉了 ${what} · 回收站里 ${PC_TRASH_DAYS} 天内能放回`, () => {
        const n = pcTrashRestore(getData(), tids);
        commit(); render();
        toastr.success(`放回了 ${n} 个`, '智库', { timeOut: 1800 });
    });
}
function pcBookSeg(d) {
    const n = pcTrash(d).length;
    const bs = n ? ' style="flex:1;min-width:0;white-space:nowrap;padding-left:4px;padding-right:4px"' : '';
    return `<div class="pc-seg pc-mt-s"${n ? ' style="display:flex;flex-wrap:nowrap"' : ''}>
      <button${bs} class="${ui.bookTab === 'groups' ? 'on' : ''}" data-act="booktab" data-tab="groups">画师组 · ${Object.keys(d.groups).length}</button>
      <button${bs} class="${ui.bookTab === 'artists' ? 'on' : ''}" data-act="booktab" data-tab="artists">单个画师 · ${Object.keys(d.artists).length}</button>
      ${n || ui.bookTab === 'trash' ? `<button${bs || ' style="flex:1;min-width:0;white-space:nowrap;padding-left:4px;padding-right:4px"'} class="${ui.bookTab === 'trash' ? 'on' : ''}" data-act="booktab" data-tab="trash">回收站 · ${n}</button>` : ''}
    </div>`;
}
function pcTrashView(d) {
    if (pcTrashPurge(d)) commit({ silent: true });
    const list = pcTrash(d);
    const fmt = t => { const x = new Date(t); return `${x.getMonth() + 1}/${x.getDate()} ${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`; };
    const left = e => Math.max(1, Math.ceil((e.at + PC_TRASH_DAYS * 864e5 - Date.now()) / 864e5));
    const row = e => {
        const name = e.type === 'group' ? e.item.name || '没起名的画师组' : String(e.item.tag || '').replace(/^artist:/, '');
        const n = (e.item.images || []).length;
        return `<div class="pc-li" style="display:flex;gap:10px;align-items:center">
          <div class="pc-grow" style="min-width:0"><b class="mono" style="word-break:break-all">${esc(name)}</b>
            <div class="pc-dim small">${e.type === 'group' ? '画师组' : '画师'} · 删于 ${fmt(e.at)} · 还剩 ${left(e)} 天${n ? ` · ${n} 张例图` : ''}${e.note ? ` · ${esc(e.note)}` : ''}</div></div>
          <button class="pc-pill tiny on" data-act="trashrestore" data-t="${esc(e.tid)}">放回</button>
          <button class="pc-pill tiny dashed danger" data-act="trashpurge" data-t="${esc(e.tid)}">彻底删</button></div>`;
    };
    return `${pcBookSeg(d)}
    <section class="pc-card pc-pad pc-mt-s"><div class="pc-dim small" style="margin:0">删掉的画师和画师组先放在这里，例图也先留着，${PC_TRASH_DAYS} 天后自动清掉。放回后会回到原来的画师组里。</div>
    ${list.length ? `<div class="pc-actions wrap pc-mt-s"><button class="pc-pill dashed tiny" data-act="trashrestoreall">全部放回</button><button class="pc-pill tiny danger" data-act="trashempty">清空回收站</button></div>` : ''}</section>
    <div class="pc-mt-s">${list.map(row).join('') || empty('回收站是空的', '删掉的画师会先放在这里。')}</div>
    <div style="height:24px"></div>`;
}
// ───── 0.8.79：批量打星
function pcBatchStars(d, r) {
    const ref = pcBatchRowRef(d, r.key), it = ref && M.resolveTicket(d, ref)?.item;
    const v = Number(it ? it.stars : ui.batch.state?.rowStars?.[r.key]) || 0;
    return `<span class="pc-bstars">${[1, 2, 3].map(n => `<button data-act="batchstar" data-k="${esc(r.key)}" data-v="${n}" class="${n <= v ? 'on' : ''}" aria-label="${n} 星">★</button>`).join('')}</span>`;
}
// ───── 0.8.79：删过的画师（设置里管理）
function pcDeletedFold(d) {
    const dl = Object.entries(d.options.deletedNotes || {}).sort((a, b) => (b[1].at || 0) - (a[1].at || 0));
    return setFold('deleted', '删过的画师', dl.length ? `${dl.length} 位` : '没有', `
      <div class="pc-dim small">删画师时写了理由的记在这里，批量里再粘贴到会提示「删过：理由」。清掉后就不提示了。</div>
      ${dl.map(([k, x]) => `<div class="pc-banrow"><b class="mono">${esc(String(x.tag || '').replace(/^artist:/, ''))}</b><span class="pc-dim small pc-grow" style="padding:0 8px">${esc(x.note)}</span><button class="pc-x" data-act="delnoteclear" data-key="${esc(k)}" aria-label="清掉">×</button></div>`).join('')}
      ${dl.length > 1 ? '<button class="pc-pill dashed tiny pc-mt-s" data-act="delnoteclearall">全部清掉</button>' : ''}`);
}
