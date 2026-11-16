// 0.8.79：氛围编码另存一个文件，画师库存档里不再带（存档小、保存快）
const ENC_FILE = 'zhiku_vibe_enc.json';
let pcEncSafeSig = '';
const PC_ENC_DROP = (k, v) => k === 'encodings' && v && typeof v === 'object' ? undefined : v;
function pcEncSig(obj) {
    let sig = '';
    for (const g of Object.values(obj?.vibeGroups || {})) for (const v of g?.vibes || []) {
        const e = v?.encodings; if (!e || typeof e !== 'object') continue;
        for (const [k, x] of Object.entries(e)) if (x) sig += `${v.id}|${k}|${String(x).length};`;
    }
    return sig;
}
// 只有编码文件已经存好、而且内容对得上，才从存档里去掉编码；否则照旧一起存，不会丢
function pcSerialize(obj) {
    if (pcEncSafeSig && pcEncSig(obj) === pcEncSafeSig) return JSON.stringify(obj, PC_ENC_DROP);
    return JSON.stringify(obj);
}
function pcEncMap(obj) {
    const map = {};
    for (const g of Object.values(obj?.vibeGroups || {})) for (const v of g?.vibes || []) if (v?.id && v.encodings && Object.values(v.encodings).some(Boolean)) map[v.id] = v.encodings;
    return map;
}
async function pcEncFlush() {
    if (!fileOk) return;
    const sig = pcEncSig(data);
    if (!sig || sig === pcEncSafeSig) return;
    try {
        const json = JSON.stringify(pcEncMap(data));
        void idbSet('vibeEnc', json);
        const up = await fileRequest('/api/files/upload', { method: 'POST', headers: headers(), body: JSON.stringify({ name: ENC_FILE, data: await pcBase64(json) }) });
        if (!up.ok) throw new Error(`HTTP ${up.status}`);
        const back = await fileRequest(`/user/files/${ENC_FILE}?t=${Date.now()}`, { cache: 'no-store' });
        if (!back.ok || back.text !== json) throw new Error('读回不一致');
        if (pcEncSig(data) === sig) pcEncSafeSig = sig;
    } catch (e) { console.warn('[智库] 氛围编码另存失败，先照旧存在画师库里', e); }
}
async function pcEncLoad(target) {
    const vibes = Object.values(target?.vibeGroups || {}).flatMap(g => g?.vibes || []).filter(v => v?.id);
    if (!vibes.some(v => !v.encodings || !Object.values(v.encodings).some(Boolean))) return;
    const maps = [];
    try { const r = await fileRequest(`/user/files/${ENC_FILE}?t=${Date.now()}`, { cache: 'no-store' }); if (r.ok) maps.push(JSON.parse(r.text)); } catch {}
    try { const raw = await idbGet('vibeEnc'); if (raw) maps.push(JSON.parse(raw)); } catch {}
    for (const v of vibes) for (const m of maps) {
        const e = m && typeof m === 'object' ? m[v.id] : null;
        if (!e || typeof e !== 'object') continue;
        v.encodings ||= {};
        for (const [k, x] of Object.entries(e)) if (x && !v.encodings[k]) v.encodings[k] = x;
    }
}
