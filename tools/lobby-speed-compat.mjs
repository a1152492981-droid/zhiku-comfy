import assert from 'node:assert/strict';

// 0.8.65：共享页不卡：列表里的例图先缩成小图再显示（记在内存里，换页、点赞、换下一张都不再重新下载和解码大图）
export function applyLobbySpeedCompatibility(s) {
    const patch = (a, b, n = 1) => { assert.equal(s.split(a).length, n + 1, a.slice(0, 80)); s = s.split(a).join(b); };
    patch("const lobbyImgUrl = u => (u && u.startsWith('/') ? serverBase() + u : u);\n", `const lobbyImgUrl = u => (u && u.startsWith('/') ? serverBase() + u : u);
/** 列表用的小图：原图下载一次、缩到 480 宽的 jpg，存成 blob 网址；同一时间最多下 4 张 */
const thumbCache = new Map(), thumbWait = [], THUMB_MAX = 400;
let thumbBusy = 0, thumbStopped = false;
const thumbPending = new Set(), thumbControllers = new Set();
function cacheThumb(url, value) {
    thumbCache.set(url, value);
    while (thumbCache.size > THUMB_MAX) { const [k, v] = thumbCache.entries().next().value; if (v?.startsWith('blob:')) URL.revokeObjectURL(v); thumbCache.delete(k); }
}
function stopThumbs() {
    thumbStopped = true; thumbWait.length = 0; thumbPending.clear();
    for (const c of thumbControllers) c.abort(); thumbControllers.clear();
    for (const v of thumbCache.values()) if (v?.startsWith('blob:')) URL.revokeObjectURL(v);
    thumbCache.clear();
}
function thumbPump() {
    while (!thumbStopped && thumbBusy < 4 && thumbWait.length) {
        const url = thumbWait.shift();
        thumbBusy++;
        makeThumb(url).then(t => {
            if (thumbStopped) { if (t?.startsWith('blob:')) URL.revokeObjectURL(t); return; }
            cacheThumb(url, t);
            for (const el of DOC.querySelectorAll('img[data-lthumb]')) if (el.dataset.lthumb === url) { el.src = t; el.classList.add('pc-thumb-in'); }
        }).catch(() => { if (thumbStopped) return; cacheThumb(url, url); for (const el of DOC.querySelectorAll('img[data-lthumb]')) if (el.dataset.lthumb === url) el.src = url; })
            .finally(() => { thumbPending.delete(url); thumbBusy--; thumbPump(); });
    }
}
async function makeThumb(url) {
    const controller = new AbortController(); thumbControllers.add(controller);
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error('图片 HTTP ' + response.status);
    const blob = await response.blob();
    const bmp = await createImageBitmap(blob);
    const scale = Math.min(1, 480 / bmp.width);
    if (scale === 1 && blob.size < 300000) { bmp.close?.(); return URL.createObjectURL(blob); }
    const c = DOC.createElement('canvas');
    c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close?.();
    const small = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.82));
    return URL.createObjectURL(small || blob);
    } finally { clearTimeout(timer); thumbControllers.delete(controller); }
}
/** 卡片里的 <img> 属性：有小图直接用，没有就先空着，等小图做好再填进去 */
function lobbyThumbAttr(u) {
    const url = lobbyImgUrl(u);
    const hit = thumbCache.get(url);
    if (!thumbStopped && !hit && !thumbPending.has(url)) { thumbPending.add(url); thumbWait.push(url); setTimeout(thumbPump, 0); }
    const esc = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    return \`data-lthumb="\${esc(url)}" \${hit ? \`src="\${esc(hit)}" class="pc-thumb-in"\` : ''}\`;
}
`);
    patch('return { serverBase, lobbyImgUrl,', 'return { serverBase, lobbyImgUrl, lobbyThumbAttr, stopThumbs,');
    patch('<img src="${esc(L.lobbyImgUrl(img.url))}" loading="lazy" alt="">', '<img ${L.lobbyThumbAttr(img.url)} decoding="async" alt="">', 2);
    // 卡片在屏幕外时不排版不绘制；小图淡入
    patch("    ${view === 'grid' ? `<style>", "    <style>.pc-lobby-card,.pc-lobbygrid>.pc-ticket{content-visibility:auto;contain-intrinsic-size:auto 320px}.pc-lobby-img img:not([src]),.pc-ticket-img img:not([src]){visibility:hidden}.pc-thumb-in{animation:pcThumbIn .25s ease}@keyframes pcThumbIn{from{opacity:0}to{opacity:1}}</style>\n    ${view === 'grid' ? `<style>");
    patch("        try { await __mod_script_entry.stop(); }", "        try { __mod_lobby.stopThumbs(); await __mod_script_entry.stop(); }");
    return s;
}
