import assert from 'node:assert/strict';

// 0.8.71：画 QQ人时，分人物补 chibi 改在拼提示词时就做，「将会发送的内容」里能看到（以前只在发出去那一刻补，预览里看不到）；
// 选了入画角色时，固定提示词里的 2others / 3others 这类人数词不发（人数由角色带，以前换上的旧内置还带着这些词）
export function applyChibiPreviewCompatibility(s) {
    const patch = (a, b) => { assert.equal(s.split(a).length, 2, a.slice(0, 80)); s = s.replace(a, () => b); };
    // 生图页：分人物
    patch(`    return { framing, ...r, chars: picks.map(p => ({ prompt: soloize(p.tags), uc: p.char.negative || '', center: { x: p.x, y: 0.5 } })), picks };`,
        `    return { framing, ...r, chars: picks.map(p => ({ prompt: soloize(frame && frame.chibi ? M.mergeTags('chibi', p.tags) : p.tags), uc: p.char.negative || '', center: { x: p.x, y: 0.5 } })), picks };`);
    // 生图页：选了入画角色时去掉固定提示词里的 Nothers
    patch(`    const picks = (cast || []).map(e => studioCastPick(e, nsfw, frame)).filter(Boolean);
    if (!picks.length) return { ...E.composeStudio({ pos, neg, scene }), chars: [], picks };`,
        `    const picks = (cast || []).map(e => studioCastPick(e, nsfw, frame)).filter(Boolean);
    if (!picks.length) return { ...E.composeStudio({ pos, neg, scene }), chars: [], picks };
    scene = String(scene || '').replace(/(?:^|,)\\s*(?:\\d+others?|multiple others)\\s*(?=,|$)/gi, '').replace(/^\\s*,\\s*/, '');`);
    // 聊天：分人物
    patch(`        chars: picks.map(p => ({ prompt: soloize([fixedTags(p.char, { nsfw }), p.tags].filter(Boolean).join(', ')),`,
        `        chars: picks.map(p => ({ prompt: soloize([frame && frame.chibi ? 'chibi' : '', fixedTags(p.char, { nsfw }), p.tags].filter(Boolean).join(', ')),`);
    return s;
}
