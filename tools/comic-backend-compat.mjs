import assert from 'node:assert/strict';
// 0.8.62：漫画——尺寸可以「跟生图设置」（用设置里填的宽高）；可以选用 ComfyUI 画（对白自动改成插件叠字）
export function applyComicBackendCompatibility(s) {
    const patch = (a, b) => { assert.equal(s.split(a).length, 2, a.slice(0, 90)); s = s.replace(a, () => b); };
    patch("    const { document: doc, getContext, getData, commit, generatePage, storeImage, resolveUrl, recordImage, dropImage, askLLM, notify, modal, esc } = deps;",
        "    const { document: doc, getContext, getData, commit, generatePage, storeImage, resolveUrl, recordImage, dropImage, askLLM, notify, modal, esc } = deps;\n"
        + "    const naiSize = deps.naiSize || (() => [832, 1216]);");
    // 尺寸：跟生图设置
    patch("    const size = () => String(opts().comicSize || '832x1216').split('x').map(Number);",
        "    const size = () => opts().comicSize === 'follow' ? naiSize() : String(opts().comicSize || '832x1216').split('x').map(Number);");
    patch("              ${seg('comicSize', [['832x1216', '竖'], ['1216x832', '横'], ['1024x1024', '方']], '832x1216')}",
        "              ${seg('comicSize', [['832x1216', '竖'], ['1216x832', '横'], ['1024x1024', '方'], ['follow', '跟生图设置']], '832x1216')}\n"
        + "              <div class=\"pc-hint\">「跟生图设置」用设置里填的宽高。步数、CFG、采样器本来就跟着设置走（NovelAI 通道）；用 ComfyUI 画时，跟着「Comfy」页的设置。</div>");
    // 用什么画
    patch("              <div class=\"pc-label\">颜色</div>\n              ${seg('comicColor',",
        "              <div class=\"pc-label\">用什么画</div>\n"
        + "              ${seg('comicBackend', [['nai', 'NovelAI'], ['comfy', '本地 ComfyUI']], 'nai')}\n"
        + "              <div class=\"pc-hint\">ComfyUI 用「Comfy」页选的模型、工作流和参数。分人物的提示词会合在一起发；ComfyUI 画不了字，对白会自动改成「插件叠字」。</div>\n"
        + "              <div class=\"pc-label\">颜色</div>\n              ${seg('comicColor',");
    patch("            const textMode = ['draw', 'overlay', 'none'].includes(opts().comicText) ? opts().comicText : 'overlay';",
        "            const comfy = opts().comicBackend === 'comfy';\n"
        + "            const textMode0 = ['draw', 'overlay', 'none'].includes(opts().comicText) ? opts().comicText : 'overlay';\n"
        + "            const textMode = comfy && textMode0 === 'draw' ? 'overlay' : textMode0;");
    patch("            const r = await generatePage(req);", "            const r = await generatePage(req, { backend: comfy ? 'comfy' : 'nai' });");
    patch("generatePage: req => N.generate({ ...req, comic: true }),",
        "generatePage: (req, o = {}) => N.generate({ ...req, comic: true, ...(o.backend === 'comfy' ? { backend: 'comfy', src: '漫画' } : { src: '漫画' }) }), naiSize: () => { const s = N.settings(); return [Number(s.novelai_width) || 832, Number(s.novelai_height) || 1216]; },");
    patch("模型: opts.comic ? 'nai-diffusion-5-full（漫画）' : s0.novelaimode,", "模型: opts.backend === 'comfy' ? (String(s0.comfyModel || '').trim() || '自定义工作流') + (opts.comic ? '（漫画）' : '') : opts.comic ? 'nai-diffusion-5-full（漫画）' : s0.novelaimode,");
    return s;
}
