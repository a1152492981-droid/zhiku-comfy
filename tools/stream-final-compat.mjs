import assert from 'node:assert/strict';

// 0.8.83：生图返回是流（中间预览 + 最终图）时，按尺寸挑最终图；连接中途断了只收到预览的，
// 不再把满屏噪点的预览当成结果，直接报「只收到预览图」，可以重试
export function applyStreamFinalCompatibility(s) {
    const patch = (a, b) => { assert.equal(s.split(a).length, 2, a.slice(0, 80)); s = s.replace(a, () => b); };
    patch("    const pick = (list, what) => { info.format = list.length > 1 ? `${what}，里面 ${list.length} 张图，用了最后一张` : what; return list[list.length - 1]; };",
`    const pngSize = f => { try { if (f[0] !== 137 || f[1] !== 80) return 0; const dv = new DataView(f.buffer, f.byteOffset, f.byteLength); return dv.getUint32(16) * dv.getUint32(20); } catch { return 0; } };
    const want = info.want && info.want.w && info.want.h ? info.want.w * info.want.h : 0;
    const pick = (list, what) => {
        let best = list.length - 1;
        const sizes = list.map(f => (f instanceof Uint8Array ? pngSize(f) : 0));
        if (sizes.some(Boolean)) { const max = Math.max(...sizes); best = sizes.lastIndexOf(max); }
        info.format = list.length > 1 ? \`\${what}，里面 \${list.length} 张图，\${best === list.length - 1 ? '用了最后一张' : \`用了最大的第 \${best + 1} 张\`}\` : what;
        if (want && sizes[best] > 1 && sizes[best] < want * 0.25) { info.format += '（只是生成中的预览）'; throw Object.assign(new Error('只收到生成中的预览图，最终图没传回来（多半是连接中途断了或站点超时）。重试一下；老是这样就把尺寸或步数调小，或换个连接方式'), { retryable: true }); }
        return list[best];
    };`);
    patch("        if (more.length) return asUrl(pick(more, 'PNG 图片'));", "        if (more.length) return asUrl(pick(more, 'PNG 图片'));\n        if (mime === 'image/png') return asUrl(pick([u8], 'PNG 图片'));");
    patch("    try{const out={image:await imageFromResponse(buf,responseInfo),sent};", "    responseInfo.want={w:Number(params.width)||0,h:Number(params.height)||0};\n    try{const out={image:await imageFromResponse(buf,responseInfo),sent};");
    patch("'NovelAI 服务器返回 '+e.status+'，等待 '+wait+' 秒后重试'", "(e.status?'NovelAI 服务器返回 '+e.status:'只收到生成中的预览图')+'，等待 '+wait+' 秒后重试'");
    patch("(e.status===429?'限流 429':'服务器 '+e.status)", "(e.status===429?'限流 429':e.status?'服务器 '+e.status:'只收到预览图')");
    return s;
}
