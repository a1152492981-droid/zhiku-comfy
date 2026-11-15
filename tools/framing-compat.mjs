import assert from 'node:assert/strict';
import fs from 'node:fs';

// 看镜头删词：画头像 / 上半身时，角色里拍不到的身体部位和衣服不发
export function applyFramingCompatibility(s) {
    const patch = (a, b) => { assert.equal(s.split(a).length, 2, a.slice(0, 100)); s = s.replace(a, () => b); };
    patch('function buildChatPrompt(scene, picks, { nsfw = hasNsfwRating(scene) } = {}) {',
        fs.readFileSync('src/framing.js', 'utf8') + '\nfunction buildChatPrompt(scene, picks, { nsfw = hasNsfwRating(scene) } = {}) {');
    // 聊天里生图：镜头看画面描述、聊天额外正面和当前画师串（串里写了 chibi 就当 QQ人）
    patch("    const chatNeg = [d.active ? M.ticketNeg(d, d.active) : '', d.options.chatNegative || ''].filter(Boolean).join(', ');\n",
        "    const frame = d.options.frameKeep ? '' : frameOf([d.active ? M.ticketString(d, d.active) : '', scene, d.options.chatPositive].filter(Boolean).join(', '));\n    const fixedTags = (c, o) => frameTrim(fixedTagsAll(c, o), frame).text;\n    const chatNeg = [d.active ? M.ticketNeg(d, d.active) : '', d.options.chatNegative || '', frame && frame.chibi ? CHIBI_NEG : ''].filter(Boolean).join(', ');\n");
    patch('function fixedTags(c, { nsfw = false } = {}) {', 'const fixedTagsAll = (...a) => fixedTags(...a);\nfunction fixedTags(c, { nsfw = false } = {}) {');
    // 生图页
    patch('function studioCastPick(e, nsfw = false) {', 'function studioCastPick(e, nsfw = false, frame = \'\') {');
    patch('    const act = String(e.act || \'\').trim(), fit = tagText(out?.tags);',
        '    const lk = frameTrim(look, frame), ft = frameTrim(tagText(out?.tags), frame);\n    look = lk.text;\n    const act = String(e.act || \'\').trim(), fit = ft.text, dropped = [...lk.dropped, ...ft.dropped];');
    patch('    const look = [lookTags(ch), nsfw ? tagText(ch.nsfwBody) : \'\'].filter(Boolean).join(\', \');\n    const lk',
        '    let look = [lookTags(ch), nsfw ? tagText(ch.nsfwBody) : \'\'].filter(Boolean).join(\', \');\n    const lk');
    patch("return { char: ch, pos: CAST_X[e.pos] ? e.pos : 'C', look, act, fit,", "return { char: ch, dropped, pos: CAST_X[e.pos] ? e.pos : 'C', look, act, fit,");
    patch('    const picks = (cast || []).map(e => studioCastPick(e, nsfw)).filter(Boolean);\n    if (!picks.length) return { ...E.composeStudio({ pos, neg, scene }), chars: [], picks };',
        `    const frame = getData().options?.frameKeep ? '' : frameOf([pos, scene].filter(Boolean).join(', '));
    const picks = (cast || []).map(e => studioCastPick(e, nsfw, frame)).filter(Boolean);
    if (!picks.length) return { ...E.composeStudio({ pos, neg, scene }), chars: [], picks };
    const framing = { frame, name: frameName(frame), dropped: [...new Set(picks.flatMap(p => p.dropped || []))] };
    if (frame && frame.chibi) neg = [neg, CHIBI_NEG].filter(Boolean).join(', ');`);
    patch("        return { ...E.composeStudio({ pos: M.mergeTags(pos, lead,", "        return { framing, ...E.composeStudio({ pos: M.mergeTags(pos, lead,");
    patch("    return { ...r, chars: picks.map(p => ({ prompt: soloize(p.tags),", "    return { framing, ...r, chars: picks.map(p => ({ prompt: soloize(p.tags),");
    // 预览里写清楚删了哪些
    patch("    return { pos: esc(c.positive) + charLines + (wait ?",
        "    const fr = c.framing?.dropped?.length ? `<br><i class=\"pc-dim\">${esc(c.framing.name)}，角色里这些词没发：${esc(c.framing.dropped.join(', '))}</i>` : '';\n    return { pos: esc(c.positive) + charLines + fr + (wait ?");
    patch("      ${sw('chatNoSplit', '聊天插图不分人物',", "      ${sw('frameKeep', '画头像、QQ人也发全部角色词', '默认关：正面、固定提示词或聊天画面里写了 portrait、upper body、cowboy shot 这类镜头词时，角色页存的身材、腿脚、下半身衣服这些拍不到的词不发；写了 chibi（QQ人）时，尖脸、身材、身高这些跟大头小身子打架的词也不发，负面自动加上 chibi inset（旁边冒小人）。打开就全部照发。')}\n      ${sw('chatNoSplit', '聊天插图不分人物',");
    // 批量生成例图画角色：同样按模板和画师串的镜头、chibi 删角色词
    patch("    const pos = builtIn\n        ? M.mergeTags(cut(fixed), tpl.nsfw ? 'nsfw, adult' : '', cut(job.charTags), 'solo', SHOT[shot] || SHOT.bust, 'simple background, white background')\n        : M.mergeTags(fixed, job.charTags, tpl.positive);\n    const neg = [neg0, job.charNeg, 'text, watermark, signature, multiple views', builtIn ? '' : tpl.negative].filter(Boolean).join(', ');",
        "    const frame = d.options.frameKeep ? '' : __mod_chars.frameOf([fixed, builtIn ? SHOT[shot] : tpl.positive].filter(Boolean).join(', '));\n    job = { ...job, charTags: __mod_chars.frameTrim(job.charTags, frame).text };\n    const pos = builtIn\n        ? M.mergeTags(cut(fixed), tpl.nsfw ? 'nsfw, adult' : '', cut(job.charTags), 'solo', SHOT[shot] || SHOT.bust, 'simple background, white background')\n        : M.mergeTags(fixed, job.charTags, tpl.positive);\n    const neg = [neg0, job.charNeg, 'text, watermark, signature, multiple views', builtIn ? '' : tpl.negative, frame && frame.chibi ? __mod_chars.CHIBI_NEG : ''].filter(Boolean).join(', ');");
    patch('return { studioCastPrompt, lookTags,', 'return { studioCastPrompt, frameOf, frameTrim, CHIBI_NEG, lookTags,');
    return s;
}
