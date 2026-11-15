import assert from 'node:assert/strict';

// 0.8.63：设置 → 数据 →「打包给 AI 看」：全部画师串和单个画师 + 例图 + 清单，打成一个 zip 发给 AI 分析每位画师的作用
export function applyAiPackCompatibility(s) {
    const patch = (a, b) => { assert.equal(s.split(a).length, 2, a.slice(0, 80)); s = s.replace(a, () => b); };
    patch('async function shrinkDataUrl(dataUrl, maxSide = 1024, quality = 0.88) {', 'async function shrinkDataUrl(dataUrl, maxSide = 1024, quality = 0.88, forceJpeg = false) {');
    patch('if (scale === 1 && dataUrl.length < 1.5e6) return dataUrl;', 'if (!forceJpeg && scale === 1 && dataUrl.length < 1.5e6) return dataUrl;');
    patch('function exportData() {', `/** 打包给 AI 看：清单 + 每串、每位画师的例图（缩小成 640 的 jpg，免得包太大） */
async function aiPackExport(d) {
    if (ui.aiPackBusy) return;
    const withNsfw = !!d.options.aiPackNsfw;
    const safe = x => String(x || '').replace(/^artist\\s*:\\s*/i, '').replace(/[\\\\/:*?"<>|\\s]+/g, '_').slice(0, 40) || 'x';
    const tplName = img => d.templates[img.template]?.name || (img.nsfw ? 'NSFW' : 'SFW');
    const pickImgs = imgs => (imgs || []).filter(im => withNsfw || !im.nsfw);
    const groups = Object.values(d.groups).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    const artists = Object.values(d.artists).sort((a, b) => String(a.tag).localeCompare(String(b.tag)));
    const total = [...groups, ...artists].reduce((n, x) => n + pickImgs(x.images).length, 0);
    if (!groups.length && !artists.length) { toastr.warning('画师库是空的', '打包给 AI'); return; }
    ui.aiPackBusy = true;
    const files = [], lines = [], index = { app: 'zhiku-ai-pack', version: 1, createdAt: new Date().toISOString(), withNsfw, strings: [], artists: [] };
    let done = 0, failed = 0;
    const tick = () => { if (done % 20 === 0) toastr.info(\`正在打包 \${done}/\${total} 张…\`, '打包给 AI', { timeOut: 1500 }); };
    const addImgs = async (imgs, dir) => {
        const out = [];
        for (const [k, im] of pickImgs(imgs).entries()) {
            try {
                const raw = String(im.url || '').startsWith('data:') ? im.url : await urlToDataUrl(imgUrl(im));
                const small = await shrinkDataUrl(raw, 640, 0.85, true);
                const name = \`\${dir}/\${String(k + 1).padStart(2, '0')}_\${safe(tplName(im))}\${im.nsfw ? '_NSFW' : ''}.jpg\`;
                files.push({ name, data: await dataUrlBytes(small) });
                out.push({ file: name, template: tplName(im), nsfw: !!im.nsfw });
            } catch (e) { failed++; console.warn('[智库] 打包例图失败', e); }
            done++; tick();
        }
        return out;
    };
    try {
        toastr.info(\`共 \${groups.length} 串、\${artists.length} 位画师、\${total} 张例图，开始打包…\`, '打包给 AI', { timeOut: 2500 });
        lines.push('# 画师串（多位画师）', '');
        for (const [i, g] of groups.entries()) {
            const no = 'S' + String(i + 1).padStart(3, '0');
            const text = M.ticketString(d, { type: 'group', id: g.id });
            const members = (g.members || []).map(m => ({ tag: d.artists[m.artistId]?.tag || '', weight: m.weight ?? 1 })).filter(m => m.tag);
            const images = await addImgs(g.images, \`画师串/\${no}_\${safe(g.name)}\`);
            index.strings.push({ no, name: g.name || '', note: g.note || '', text, members, images });
            lines.push(\`\${no} \${g.name || '(没起名)'}\${g.note ? '｜' + g.note : ''}\`, text, \`画师：\${members.map(m => m.tag.replace(/^artist:/, '') + (m.weight !== 1 ? ' ×' + m.weight : '')).join('、') || '无'}\`, \`例图：\${images.length} 张\`, '');
        }
        lines.push('# 单个画师', '');
        for (const [i, a] of artists.entries()) {
            const no = 'A' + String(i + 1).padStart(3, '0');
            const images = await addImgs(a.images, \`单个画师/\${no}_\${safe(a.tag)}\`);
            const inStrings = groups.filter(g => (g.members || []).some(m => m.artistId === a.id)).length;
            index.artists.push({ no, tag: a.tag, note: a.note || '', inStrings, images });
            lines.push(\`\${no} \${a.tag.replace(/^artist:/, '')}\${a.note ? '｜' + a.note : ''}｜在 \${inStrings} 串里｜例图 \${images.length} 张\`);
        }
        const readme = [
            '这是智库画师库的打包，用来请 AI 分析每位画师在画师串里起什么作用。',
            '',
            '里面有：',
            '- 清单.txt：每一串的完整正面、里面有哪些画师和权重、备注；每位单个画师的备注和用在几串里。',
            '- 清单.json：同样的内容，方便程序读。',
            '- 画师串/：每串一个文件夹，放这串的例图。',
            '- 单个画师/：每位画师一个文件夹，放单独测这位画师的例图。',
            '- 例图模板.txt：生成例图用的固定提示词（每张图文件名里写了用的是哪个模板）。',
            '',
            '想请 AI 做的事：对比单个画师的例图，和包含这位画师的画师串的例图，说清楚每位画师对脸型、眼睛、上色、线条、光影、身材、构图的影响，权重高了会怎样，适合和谁搭。',
            withNsfw ? '这份包含 NSFW 例图。' : '这份只带了 SFW 例图。',
        ].join('\\n');
        const tpls = Object.values(d.templates).map(t => \`## \${t.name}\${t.nsfw ? '（NSFW）' : ''}\\n正面：\${t.positive}\\n负面：\${t.negative || ''}\\n\`).join('\\n');
        const enc = new TextEncoder();
        files.unshift({ name: '说明.txt', data: enc.encode(readme) }, { name: '清单.txt', data: enc.encode(lines.join('\\n')) }, { name: '清单.json', data: enc.encode(JSON.stringify(index, null, 1)) }, { name: '例图模板.txt', data: enc.encode(tpls) });
        saveBlob(makeZip(files), \`智库画师库_给AI看_\${new Date().toISOString().slice(0, 10)}.zip\`);
        toastr.success(\`打包好了：\${groups.length} 串、\${artists.length} 位画师、\${done - failed} 张例图\${failed ? \`，\${failed} 张读不到跳过了\` : ''}\`, '打包给 AI');
    } finally { ui.aiPackBusy = false; }
}
function exportData() {`);
    patch('        <button class="pc-btn" data-act="exportdata">导出</button>\n',
        '        <button class="pc-btn" data-act="exportdata">导出</button>\n        <button class="pc-btn" data-act="aipack">打包给 AI 看</button>\n');
    patch("      <div class=\"pc-hint\">「导入画师串包」用来导入场外脚本",
        "      ${sw('aiPackNsfw', '打包给 AI 时带上 NSFW 例图', '默认只带 SFW 例图。打开后 NSFW 例图也会打进包里，文件名带 _NSFW。')}\n      <div class=\"pc-hint\">「打包给 AI 看」：把全部画师串、单个画师和它们的例图打成一个 zip（图缩小到 640），附带清单，发给 AI 就能让它分析每位画师的作用。</div>\n      <div class=\"pc-hint\">「导入画师串包」用来导入场外脚本");
    patch("            case 'exportdata': exportData(); break;", "            case 'exportdata': exportData(); break;\n            case 'aipack': try { await aiPackExport(getData()); } catch (e) { toastr.error(e.message, '打包给 AI'); } break;");
    return s;
}
