import assert from 'node:assert/strict';

// 0.8.81：共享「只看男性的 / 只看女性的」只认裸体标签：只选了「男性裸体」的才算男性。
// BL / BG / GB / GL 是题材标签，随便选，不再拿来推断图里是谁；没选裸体标签的 NSFW 分享只在「男女都看」里出现
export function applyLobbyWhoCompatibility(s) {
    const patch = (a, b) => { assert.equal(s.split(a).length, 2, a.slice(0, 80)); s = s.replace(a, () => b); };
    patch("/** 这条分享的 NSFW 图里是谁：新标签直接看；旧的按性向、题材推 */", "/** 这条分享的 NSFW 图里是谁：只看裸体标签，题材标签（BL/BG/GB/GL）不算 */");
    patch("    if (!who.size) { if (t.has('BL')) who.add('male'); if (t.has('GL')) who.add('female'); if (t.has('BG') || t.has('GB')) { who.add('male'); who.add('female'); } }\n", "");
    patch("    // 只看男性 / 女性的 NSFW：带 NSFW 的分享只留对得上的；没有 NSFW 的照常显示\n", "    // 只看男性 / 女性的：带 NSFW 的分享只留裸体标签只选了这一种的（题材标签不算）；没有 NSFW 的照常显示\n");
    return s;
}
