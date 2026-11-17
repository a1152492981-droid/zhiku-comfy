import assert from 'node:assert/strict';
// 本地 ComfyUI 版：设置开关「所有生图都用本地 ComfyUI」（comfyAll，默认关）。
// 打开后除漫画外的生图（生图页、角色、衣柜、服装设计、例图、批量、聊天插图、垫图、局部重绘）都走「Comfy」页的设置，不需要 NovelAI key。
export function applyComfyAllCompatibility(s) {
    const patch = (a, b, n = 1) => { assert.equal(s.split(a).length, n + 1, a.slice(0, 90)); s = s.replaceAll(a, () => b); };
    patch("const chatBackend = (s = settings()) => String(s.comfyChat) === 'true' ? 'comfy' : 'nai';",
`const chatBackend = (s = settings()) => String(s.comfyChat) === 'true' || String(s.comfyAll) === 'true' ? 'comfy' : 'nai';
/** 「所有生图都用本地 ComfyUI」：打开时除漫画外的生图都走 ComfyUI */
const comfyAll = (s = settings()) => String(s.comfyAll) === 'true';
/** 生图前的检查：全走 ComfyUI 时看 ComfyUI 地址，否则看 NovelAI key */
const genReady = (s = settings()) => comfyAll(s) ? comfyReady(s) : isReady();`);
    patch(', comfyReady, chatBackend, comfyAutoConfig,', ', comfyReady, chatBackend, comfyAll, genReady, comfyAutoConfig,');
    patch("    opts={...opts,src:opts.src || '其他生图入口'};\n    const cfg=settings(),nai=opts.backend!=='comfy'&&cfg.naiMode!=='gpt';",
        "    opts={...opts,src:opts.src || '其他生图入口'};\n    if(comfyAll()&&!opts.comic&&opts.backend!=='comfy')opts={...opts,backend:'comfy',director:null,refs:null};\n    const cfg=settings(),nai=opts.backend!=='comfy'&&cfg.naiMode!=='gpt';");
    // 垫图 / 局部重绘：内置工作流换成 LoadImage → VAEEncode（局部重绘再加 SetLatentNoiseMask），denoise = 强度
    patch("        if (opts.i2i?.image) throw new Error('ComfyUI 通道暂不支持这里的垫图，请使用 NovelAI 通道');",
        "        if (opts.i2i?.image && !comfyAll(s)) throw new Error('ComfyUI 通道暂不支持这里的垫图，请使用 NovelAI 通道');");
    patch("const comfyUrl = (s = settings()) =>",
`/** 垫图用的内置工作流：底图从 ComfyUI 的 input 文件夹读（先传上去） */
const COMFY_I2I = (() => {
    const wf = JSON.parse(JSON.stringify(COMFY_WORKFLOW));
    delete wf[5];
    wf[3].inputs.denoise = '%denoise%'; wf[3].inputs.latent_image = ['10', 0];
    wf[10] = { class_type: 'VAEEncode', inputs: { pixels: ['11', 0], vae: ['4', 2] } };
    wf[11] = { class_type: 'LoadImage', inputs: { image: '%image%' } };
    return wf;
})();
/** 局部重绘用的内置工作流：遮罩白色 = 重画 */
const COMFY_INPAINT = (() => {
    const wf = JSON.parse(JSON.stringify(COMFY_I2I));
    wf[3].inputs.latent_image = ['12', 0];
    wf[12] = { class_type: 'SetLatentNoiseMask', inputs: { samples: ['10', 0], mask: ['13', 0] } };
    wf[13] = { class_type: 'LoadImageMask', inputs: { image: '%mask%', channel: 'red' } };
    return wf;
})();
/** 把一张 PNG（不带前缀的 base64）传进 ComfyUI 的 input 文件夹，返回 LoadImage 认的文件名 */
async function comfyUpload(url, b64, name) {
    const fd = new FormData();
    fd.append('image', b64ToBlob(b64, 'image/png'), name);
    fd.append('overwrite', 'true');
    let r;
    try { r = await fetch(url + '/upload/image', { method: 'POST', body: fd }); }
    catch { throw new Error('浏览器传不了图给 ComfyUI：垫图和局部重绘要 ComfyUI 启动时加上 --enable-cors-header'); }
    if (!r.ok) throw new Error('ComfyUI 收图失败（HTTP ' + r.status + '）');
    const j = await r.json();
    return j.subfolder ? j.subfolder + '/' + j.name : j.name;
}
const comfyUrl = (s = settings()) =>`);
    patch("    let api = COMFY_WORKFLOW;\n    if (custom) {",
`    let api = COMFY_WORKFLOW;
    if (opts.i2i?.image) {
        if (custom) throw new Error('自定义工作流暂不支持垫图和局部重绘：到智库「Comfy」页把工作流切回内置，并选好模型');
        const unit = (v, fallback) => v != null && Number.isFinite(Number(v)) ? Math.max(0, Math.min(1, Number(v))) : fallback;
        const tag = Date.now() + '_' + Math.floor(Math.random() * 1e6);
        vals.denoise = unit(opts.i2i.strength, 0.7) || 0.01;
        vals.image = await comfyUpload(url, opts.i2i.image, 'zhiku_i2i_' + tag + '.png');
        if (opts.mask) vals.mask = await comfyUpload(url, opts.mask, 'zhiku_mask_' + tag + '.png');
        api = opts.mask ? COMFY_INPAINT : COMFY_I2I;
    }
    else if (custom) {`);
    patch("function inpaint(opts){return __naiGate.run(()=>inpaintRequest(opts)).catch(e=>{throw netError(e);});}",
        "function inpaint(opts){return __naiGate.run(()=>comfyAll()?comfyInpaint(opts):inpaintRequest(opts)).catch(e=>{throw netError(e);});}\nasync function comfyInpaint({ image, mask, prompt, negative, width, height, strength = 0.7 }) {\n    return (await comfyGenerate({ positive: prompt, negative, width, height, i2i: { image, strength }, mask }, settings())).image;\n}");
    patch("async function run(opts) {\n    if (opts.backend === 'comfy') {",
        "async function run(opts) {\n    if (N.comfyAll?.()) opts.backend = 'comfy';\n    if (opts.backend === 'comfy') {");
    // 生图前的 NovelAI key 检查：全走 ComfyUI 时改看 ComfyUI
    patch("    if (!view && !N.isReady()) view = 'settings';", "    if (!view && !(N.genReady?.() ?? N.isReady())) view = 'settings';");
    patch("    ${!N.isReady() ? `<section class=\"pc-card pc-pad pc-warn-card\"><b>还没填 NovelAI key</b>", "    ${!(N.genReady?.() ?? N.isReady()) ? `<section class=\"pc-card pc-pad pc-warn-card\"><b>还没填 NovelAI key</b>");
    patch("    <section class=\"pc-card pc-pad ${!N.isReady() ? 'pc-mt' : ''}\">", "    <section class=\"pc-card pc-pad ${!(N.genReady?.() ?? N.isReady()) ? 'pc-mt' : ''}\">");
    patch("if (!N.isReady()) { toastr.warning('先到设置里填 NovelAI key', '服装设计'); return; }", "if (!(N.genReady?.() ?? N.isReady())) { toastr.warning('先到设置里填 NovelAI key', '服装设计'); return; }");
    patch("if (!N.isReady()) { toastr.warning('先到设置里填 NovelAI key', '衣柜'); return true; }", "if (!(N.genReady?.() ?? N.isReady())) { toastr.warning('先到设置里填 NovelAI key', '衣柜'); return true; }");
    patch("if (!N.isReady()) { toastr.warning('先到设置里填 NovelAI key', '角色'); return true; }", "if (!(N.genReady?.() ?? N.isReady())) { toastr.warning('先到设置里填 NovelAI key', '角色'); return true; }", 2);
    patch("if (mode === 'gen' && !N.isReady()) {", "if (mode === 'gen' && !(N.genReady?.() ?? N.isReady())) {");
    patch("if (!N.isReady()) { toastr.warning('先到设置里填 NovelAI key', '生成图片');", "if (!(N.genReady?.() ?? N.isReady())) { toastr.warning('先到设置里填 NovelAI key', '生成图片');");
    patch("if (!N.isReady()) { toastr.warning('先到设置里填 NovelAI key', '批量生成例图'); return; }", "if (!(N.genReady?.() ?? N.isReady())) { toastr.warning('先到设置里填 NovelAI key', '批量生成例图'); return; }");
    // 开关：放在「聊天插图也用 ComfyUI」下面
    const a = s.indexOf('data-st-check="comfyChat"'), b = s.indexOf('</label>', a) + '</label>'.length;
    assert(a > 0 && b > a && s.indexOf('data-st-check="comfyChat"', a + 1) < 0);
    s = s.slice(0, b) + "\n      <label class=\"pc-switch\"><input type=\"checkbox\" data-st-check=\"comfyAll\" ${String(s.comfyAll) === 'true' ? 'checked' : ''}><span></span>所有生图都用本地 ComfyUI<small>打开后生图页、角色、衣柜、服装设计、例图、批量、聊天插图、垫图和局部重绘都用这页的 ComfyUI 设置，不需要 NovelAI key。漫画还是用漫画页自己选的通道。ComfyUI 用不了氛围和角色参考图。</small></label>" + s.slice(b);
    return s;
}
