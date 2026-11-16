// ───── 0.8.80：点数显示
function pcAnlasHtml() {
    const s = N.settings();
    if (s.naiMode !== 'key' && s.naiMode !== 'tavern') return '';
    void N.anlasRefresh();
    const a = N.anlasNow();
    if (!a || (a.anlas == null && !a.error)) return '<span class="pc-dim">查点数中…</span>';
    if (a.anlas == null) return `<span class="pc-dim">查不到点数：${esc(a.error)}</span>`;
    const used = a.prev != null && a.prev > a.anlas ? ` <span class="pc-dim">（刚才 −${(a.prev - a.anlas).toLocaleString()}）</span>` : '';
    const q = (a.quota || []).slice(0, 3).map(([k, v]) => `${esc(k.split('.').slice(-2).join('.'))} ${Number(v).toLocaleString()}`).join(' · ');
    return `剩 <b>${a.anlas.toLocaleString()}</b> 点 Anlas${used}${q ? ` · <span class="pc-dim">${q}</span>` : ''}`;
}
let pcAnlasHooked = false;
function pcAnlasHook() {
    if (pcAnlasHooked) return; pcAnlasHooked = true;
    N.onAnlas(() => { try { for (const el of root?.querySelectorAll('[data-anlas]') || []) el.innerHTML = pcAnlasHtml(); } catch {} });
}
function pcAnlasLine(style = '') { pcAnlasHook(); const h = pcAnlasHtml(); return h ? `<div style="${style}"><span data-anlas style="display:inline-block;padding:3px 12px;border-radius:999px;background:#f4efe4;color:#5b4a3c;font-size:12px;line-height:1.5">${h}</span></div>` : ''; }
function pcBatchModelNow(d) {
    const s = N.settings();
    if (!['key', 'site', 'tavern'].includes(s.naiMode)) return '';
    const m = String(d.options.batchModel || '');
    return m && N.MODELS.some(x => x[0] === m) ? m : '';
}
function pcBatchModelPick(d) {
    const s = N.settings();
    if (!['key', 'site', 'tavern'].includes(s.naiMode)) return '';
    const cur = String(d.options.batchModel || ''), nowName = (N.MODELS.find(x => x[0] === s.novelaimode) || [0, s.novelaimode])[1];
    const pick = cur || s.novelaimode;
    return `<label class="pc-label">用哪个模型</label>
      <select class="pc-input" data-optstr="batchModel"><option value="">跟生图页一样（现在是 ${esc(nowName)}）</option>${N.MODELS.map(([v, n]) => `<option value="${esc(v)}" ${cur === v ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
      <div class="pc-hint">只管批量，不改生图页的模型。步数、CFG 这些用你上次在那个模型下的设置。${/nai-diffusion-5/.test(pick) ? 'V5 有每周额度，用完会扣 Anlas；Opus 用 4.5 出普通尺寸单张不扣点，想省就选 4.5。' : ''}</div>`;
}
