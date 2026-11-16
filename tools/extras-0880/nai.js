// ───── 0.8.80：批量指定模型（只在这一张生成期间换，不动生图页的设置）
var pcModelOverride = null;
async function withModel(model, fn) {
    const prev = pcModelOverride;
    pcModelOverride = model && /^nai-diffusion/.test(model) ? model : null;
    try { return await fn(); } finally { pcModelOverride = prev; }
}
// ───── 0.8.80：点数和 V5 额度（生图后自动刷新）
var pcAnlas = null, pcAnlasTimer = null, pcAnlasBusy = false;
const pcAnlasSubs = new Set();
// NovelAI 没公开 V5 额度字段叫什么：把返回里像「额度」的数字都找出来显示
function pcScanQuota(j) {
    const out = [];
    const walk = (o, path, depth) => {
        if (!o || typeof o !== 'object' || depth > 5) return;
        for (const [k, v] of Object.entries(o)) {
            const p = path ? path + '.' + k : k;
            if (v && typeof v === 'object') walk(v, p, depth + 1);
            else if (typeof v === 'number' && /v5|quota|allowance|refill|recover|regen|bucket|budget|remaining|usage|limit/i.test(p) && !/trainingSteps|maxPriority|moduleTraining|contextTokens|textLength|tier|expires|actions/i.test(p)) out.push([p, v]);
        }
    };
    walk(j, '', 0);
    return out;
}
async function anlasRefresh(force = false) {
    const s = settings();
    if (s.naiMode !== 'key' && s.naiMode !== 'tavern') return pcAnlas;
    if (!force && pcAnlas && Date.now() - pcAnlas.at < (pcAnlas.anlas == null ? 5000 : 30000)) return pcAnlas;
    if (pcAnlasBusy) return pcAnlas;
    pcAnlasBusy = true;
    try {
        let j;
        if (s.naiMode === 'tavern') {
            const r = await http('/api/novelai/status', { method: 'POST', headers: getRequestHeaders(), body: '{}' });
            if (!r.ok) throw new Error(`酒馆返回 ${r.status}`);
            j = await r.json();
        } else {
            const key = authKey();
            if (!key) return pcAnlas;
            const r = await http('https://api.novelai.net/user/subscription', { headers: { Authorization: 'Bearer ' + key } });
            if (!r.ok) throw new Error(`NovelAI 返回 ${r.status}`);
            j = await r.json();
        }
        const t = j?.trainingStepsLeft || j?.subscription?.trainingStepsLeft;
        const anlas = t ? (t.fixedTrainingStepsLeft || 0) + (t.purchasedTrainingSteps || 0) : null;
        pcAnlas = { at: Date.now(), anlas, prev: pcAnlas?.anlas ?? null, quota: pcScanQuota(j), raw: j };
    } catch (e) {
        pcAnlas = { ...(pcAnlas || {}), at: Date.now(), error: e instanceof TypeError ? '这台设备连不上 api.novelai.net' : String(e?.message || e) };
    } finally { pcAnlasBusy = false; }
    for (const f of pcAnlasSubs) try { f(pcAnlas); } catch {}
    return pcAnlas;
}
function anlasSoon() { if (!pcAnlasSubs.size) return; clearTimeout(pcAnlasTimer); pcAnlasTimer = setTimeout(() => anlasRefresh(true), 2500); }
