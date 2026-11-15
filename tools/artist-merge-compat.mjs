import assert from 'node:assert/strict';

// 0.8.67：打开时自动整理画师名：artist:artist_xxx 去掉多出来的 artist_；
// 同一位画师的不同写法（mochizuki_kei / mochizuki kei、Zhibujiloom / zhibuji loom）合成一位，例图、备注、收藏夹、画师串里的位置都并过去
export function applyArtistMergeCompatibility(s) {
    const patch = (a, b) => { assert.equal(s.split(a).length, 2, a.slice(0, 80)); s = s.replace(a, () => b); };
    patch('    migrateNonArtists(d, fake);\n', '    migrateNonArtists(d, fake);\n    mergeDupArtists(d);\n');
    patch('// Move misclassified quality tags back into prompt text without losing example images.\n', `/** 同一位画师的几种写法合成一位：留带空格或下划线的写法（danbooru 的写法），一样的话留例图多的 */
function mergeDupArtists(d) {
    for (const a of Object.values(d.artists)) {
        const t = String(a.tag || '').replace(/^artist\\s*:\\s*artist[ _](?!collaboration)/i, 'artist:');
        if (t !== a.tag && t.replace(/^artist:/, '').trim()) a.tag = t;
    }
    const loose = a => artistKey(a.tag).replace(/[\\s_]+/g, '');
    const score = a => (/[ _]/.test(a.tag.replace(/^artist:/i, '').trim()) ? 1000 : 0) + (a.images?.length || 0) * 10 + (/[A-Z]/.test(a.tag) ? 0 : 1);
    const byKey = new Map();
    for (const a of Object.values(d.artists)) { const k = loose(a); if (!k) continue; (byKey.get(k) || byKey.set(k, []).get(k)).push(a); }
    const moved = new Map();
    for (const list of byKey.values()) {
        if (list.length < 2) continue;
        list.sort((x, y) => score(y) - score(x) || (x.createdAt || 0) - (y.createdAt || 0));
        const keep = list[0];
        keep.images ||= [];
        for (const a of list.slice(1)) {
            const imageKey = x => x.id || x.path || x.url || JSON.stringify(x);
            const seen = new Set(keep.images.map(imageKey));
            for (const im of a.images || []) { const key = imageKey(im); if (!seen.has(key)) { seen.add(key); keep.images.push(im); } }
            if (a.note && !String(keep.note || '').includes(a.note)) keep.note = [keep.note, a.note].filter(Boolean).join('；');
            keep.collections = [...new Set([...(keep.collections || []), ...(a.collections || [])])];
            if (a.fav) keep.fav = true;
            moved.set(a.id, keep.id);
            delete d.artists[a.id];
        }
    }
    if (!moved.size) return;
    for (const g of Object.values(d.groups)) {
        const seen = new Set();
        g.members = (g.members || []).map(m => moved.has(m.artistId) ? { ...m, artistId: moved.get(m.artistId) } : m).filter(m => !seen.has(m.artistId) && seen.add(m.artistId));
    }
    const remap = ref => ref?.type === 'artist' && moved.has(ref.id) ? { type: 'artist', id: moved.get(ref.id) } : ref;
    for (const key of ['active', 'previousActive', 'beforeBinding']) if (d[key]) d[key] = remap(d[key]);
    d.recent = (Array.isArray(d.recent) ? d.recent : []).map(remap).filter(Boolean);
    for (const [key, ref] of Object.entries(d.bindings || {})) d.bindings[key] = remap(ref);
}

// Move misclassified quality tags back into prompt text without losing example images.
`);
    return s;
}
