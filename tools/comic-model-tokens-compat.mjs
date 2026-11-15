import assert from 'node:assert/strict';
// 0.8.68：漫画——可以选用 NAI 4.5 画（原来固定 V5）；漫画改编的回复长度可以单独填（模型常截断时调大）
export function applyComicModelTokensCompatibility(s) {
    const patch = (a, b, n = 1) => { assert.equal(s.split(a).length, n + 1, a.slice(0, 90)); s = s.split(a).join(b); };
    // 漫画用哪个 NAI 模型：v5（默认）/ v45 / follow（跟生图设置，V3 不行就退回 V5）
    patch("    const model = comic ? 'nai-diffusion-5-full' : s.novelaimode;",
        "    const model = comic ? comicNaiModel(s) : s.novelaimode;");
    patch("    const model = opts.comic ? 'nai-diffusion-5-full' : s.novelaimode;",
        "    const model = opts.comic ? comicNaiModel(s) : s.novelaimode;");
    patch("opts.comic ? 'nai-diffusion-5-full（漫画）' : s0.novelaimode,", "opts.comic ? comicNaiModel(s0) + '（漫画）' : s0.novelaimode,");
    patch("function buildParameters({", `/** 漫画用的 NAI 模型 */
function comicNaiModel(s = settings()) {
    const m = String(__mod_store.getData()?.options?.comicModel || 'v5');
    if (m === 'v45') return 'nai-diffusion-4-5-full';
    if (m === 'follow' && /^nai-diffusion-(4|5)/.test(String(s.novelaimode || ''))) return s.novelaimode;
    return 'nai-diffusion-5-full';
}
function buildParameters({`);
    patch("              <div class=\"pc-label\">用什么画</div>\n",
        "              <div class=\"pc-label\">NovelAI 用哪个模型</div>\n"
        + "              ${seg('comicModel', [['v5', 'V5 Full'], ['v45', 'V4.5 Full'], ['follow', '跟生图设置']], 'v5')}\n"
        + "              <div class=\"pc-hint\">V5 排分格和画字最稳；V4.5 画风选择多、有的画师串在 4.5 上更好看。「跟生图设置」用设置里选的模型（V3 不支持分人物，会用 V5）。</div>\n"
        + "              <div class=\"pc-label\">用什么画</div>\n");
    // 回复长度
    patch("const wantTokens = opts => userMaxTokens() || Math.max(LLM_DEFAULT_TOKENS, opts.maxTokens || 800);",
        "const wantTokens = opts => (Number(opts.exactTokens) >= 256 ? Math.min(Number(opts.exactTokens), 200000) : 0) || userMaxTokens() || Math.max(LLM_DEFAULT_TOKENS, opts.maxTokens || 800);");
    patch("    const want = wantTokens(opts), steps = userMaxTokens() ? [want] : [want, 8000, 4000]",
        "    const want = wantTokens(opts), steps = userMaxTokens() || Number(opts.exactTokens) >= 256 ? [want] : [want, 8000, 4000]");
    patch("askLLM: (s, u, o) => __mod_translate.askLLM(s, u, { ...o, fn: 'comic' }),",
        "askLLM: (s, u, o) => { const n = Math.round(Number(getData().options.comicMaxTokens)); return __mod_translate.askLLM(s, u, { ...o, fn: 'comic', ...(n >= 256 ? { exactTokens: n } : {}) }); },");
    patch("              <label class=\"pc-field pc-mt-s\"><span>给 AI 的改编要求（可不填）</span>",
        "              <label class=\"pc-field pc-mt-s\"><span>漫画改编的回复长度上限（可不填）</span><input class=\"pc-input\" type=\"number\" min=\"0\" step=\"1000\" data-cstr=\"comicMaxTokens\" value=\"${esc(String(opts().comicMaxTokens || ''))}\" placeholder=\"不填 = 自动（按页数算，最多 16000）\"></label>\n"
        + "              <div class=\"pc-hint\">AI 写分镜写到一半断掉（DeepSeek、带思考的模型常见）就填大一点，比如 16000、32000。只管漫画，不影响别的功能；设置里的「回复长度上限」填了的话，这里优先。</div>\n"
        + "              <label class=\"pc-field pc-mt-s\"><span>给 AI 的改编要求（可不填）</span>");
    return s;
}
