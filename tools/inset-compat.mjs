import assert from 'node:assert/strict';
// 0.8.68：手机上漫画阅读打不开——老一点的手机浏览器 / WebView 不认 CSS 的 inset 简写，
// .pc-comic-book 的 position:fixed;inset:0 就没了位置和大小，整个阅读器在屏幕外、高度 0。
// 所有 inset 都展开成 top/right/bottom/left；漫画书再补上全屏的宽高（vw/vh/dvh 回退），跟设置弹窗一样。
const SIDES = v => { const p = v.trim().split(/\s+/); const [t, r = t, b = t, l = r] = p; return [t, r, b, l]; };
export function applyInsetCompatibility(s) {
    let n = 0;
    s = s.replace(/(?<![\w-])inset:\s*([^;}"'`!]+?)\s*(!important)?\s*(?=[;}])/g, (m, v, imp) => {
        const parts = v.trim().split(/\s+/);
        if (!parts.length || parts.length > 4) return m;
        n++;
        const [t, r, b, l] = SIDES(v), i = imp ? ' !important' : '';
        return `top:${t}${i};right:${r}${i};bottom:${b}${i};left:${l}${i}`;
    });
    assert.ok(n >= 15, '展开的 inset 太少：' + n);
    const a = '.pc-comic-book{position:fixed;top:0;right:0;bottom:0;left:0;z-index:2147480300;';
    assert.equal(s.split(a).length, 2, '找不到漫画书样式');
    s = s.replace(a, () => '.pc-comic-book{position:fixed!important;top:0!important;right:0!important;bottom:0!important;left:0!important;width:100vw;width:100%;height:100vh;height:100dvh;max-width:none;max-height:none;margin:0;transform:none;z-index:2147480300;');
    return s;
}
