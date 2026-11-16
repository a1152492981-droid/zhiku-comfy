import assert from 'node:assert/strict';

// 0.8.76：内置固定提示词加「黑白」画风：黑白漫画的网点、排线、分格、速度线。人数照旧不写，由入画角色自己带
const BW_NEG = 'colorful, color, watermark, signature';
const BW = [
    { name: "黑白漫画·单格大图", tags: ["单人", "黑白", "半身"], scene: "monochrome, greyscale, manga, comic, screentone, halftone, ink, lineart, hatching (texture), high contrast, looking at viewer, upper body, white background" },
    { name: "黑白漫画·四格日常", tags: ["单人", "黑白", "漫画格", "日常"], scene: "monochrome, greyscale, 4koma, comic, manga, multiple views, screentone, surprised, smile, sweatdrop, :o, empty speech bubble, simple background" },
    { name: "黑白漫画·多格分镜", tags: ["双人", "黑白", "漫画格"], scene: "monochrome, greyscale, manga, comic, multiple panels, panel layout, close-up, eye focus, looking at another, from side, empty speech bubble, screentone, speed lines" },
    { name: "黑白·速度线冲刺", tags: ["单人", "黑白", "全身", "战斗"], scene: "monochrome, greyscale, manga, speed lines, motion lines, running, dynamic pose, foreshortening, from below, screentone, high contrast, action, emphasis lines" },
    { name: "黑白·对峙特写", tags: ["双人", "黑白", "特写", "对峙"], scene: "monochrome, greyscale, manga, face-to-face, staring, close-up, eye focus, shaded face, serious, dramatic lighting, high contrast, screentone, emphasis lines" },
    { name: "黑白·雨夜回眸", tags: ["单人", "黑白", "背影", "雨天", "夜晚"], scene: "monochrome, greyscale, manga, rain, from behind, looking back, wet hair, night, streetlight, screentone, hatching (texture), high contrast, cowboy shot" },
    { name: "黑白·少女漫花背景", tags: ["双人", "黑白", "半身", "约会"], scene: "monochrome, greyscale, shoujo manga, faces close together, looking at another, eye contact, blush, floral background, sparkle, bubble background, screentone, upper body" },
    { name: "黑白·钢笔线稿", tags: ["单人", "黑白", "立绘", "全身"], scene: "monochrome, greyscale, lineart, sketch, ink, traditional media, standing, full body, white background, clean lines" },
    { name: "黑白·QQ人四格", tags: ["单人", "黑白", "QQ人", "漫画格"], scene: "chibi, super deformed, monochrome, greyscale, 4koma, comic, manga, screentone, multiple views, angry, crying, laughing, sweatdrop, simple background" },
].map(p => ({ ...p, sceneNeg: BW_NEG }));

export function applyBwMangaCompatibility(s) {
    const patch = (a, b) => { assert.equal(s.split(a).length, 2, a.slice(0, 80)); s = s.replace(a, () => b); };
    patch("['画风', ['QQ人', '立绘', '头像', '证件照', '漫画格', '构图']]", "['画风', ['QQ人', '黑白', '立绘', '头像', '证件照', '漫画格', '构图']]");
    patch("const BUILTIN_SCENES = [\n", "const BUILTIN_SCENES = [\n" + BW.map(p => '    ' + JSON.stringify(p).replace(/"(\w+)":/g, '$1: ') + ',\n').join(''));
    patch("scene: p.scene, sceneNeg: '', sceneEn: ''", "scene: p.scene, sceneNeg: p.sceneNeg || '', sceneEn: ''");
    patch("<small class=\"mono\">${esc(p.scene)}</small></div>\n      <div class=\"pc-promptacts\">${cur ? '' : `<button class=\"pc-pill tiny on\" data-act=\"sceneuse\" data-kind=\"builtin\"",
        "<small class=\"mono\">${esc(p.scene)}</small>${p.sceneNeg ? `<small class=\"mono pc-dim\">负面：${esc(p.sceneNeg)}</small>` : ''}</div>\n      <div class=\"pc-promptacts\">${cur ? '' : `<button class=\"pc-pill tiny on\" data-act=\"sceneuse\" data-kind=\"builtin\"");
    return s;
}
