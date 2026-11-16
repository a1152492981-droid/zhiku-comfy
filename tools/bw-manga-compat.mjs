import assert from 'node:assert/strict';

// 0.8.76/77：内置固定提示词加「黑白」画风：只写黑白漫画的画风（线条、网点、排线、笔触），不写场景动作
const BW_NEG = 'colorful, color, watermark, signature';
const BW = [
    { name: "黑白·少年漫粗线", tags: ["黑白"], scene: "monochrome, greyscale, manga, comic, bold lineart, thick outlines, high contrast, screentone, speed lines, emphasis lines, dynamic angle" },
    { name: "黑白·少女漫细线", tags: ["黑白"], scene: "monochrome, greyscale, shoujo manga, comic, thin lineart, delicate lines, soft shading, screentone, sparkle, floral background, bubble background" },
    { name: "黑白·剧画写实排线", tags: ["黑白"], scene: "monochrome, greyscale, gekiga, realistic, ink, cross-hatching, hatching (texture), heavy shading, high contrast, detailed" },
    { name: "黑白·重网点", tags: ["黑白"], scene: "monochrome, greyscale, manga, screentone, halftone, dithering, flat shading, clean lineart, high contrast" },
    { name: "黑白·钢笔线稿", tags: ["黑白"], scene: "monochrome, lineart, ink, pen (medium), clean lineart, white background, traditional media" },
    { name: "黑白·铅笔速写", tags: ["黑白"], scene: "monochrome, greyscale, sketch, rough sketch, graphite (medium), traditional media, unfinished, white background" },
    { name: "黑白·水墨笔刷", tags: ["黑白"], scene: "monochrome, greyscale, ink wash painting, brush stroke, ink splatter, traditional media, high contrast, white background" },
    { name: "黑白·复古老漫画", tags: ["黑白"], scene: "monochrome, greyscale, retro artstyle, 1980s (style), manga, comic, screentone, film grain, faded" },
    { name: "黑白·恐怖漫画", tags: ["黑白"], scene: "monochrome, greyscale, horror (theme), manga, cross-hatching, hatching (texture), heavy shadow, dark, eerie, high contrast" },
    { name: "黑白·QQ人简笔", tags: ["黑白", "QQ人"], scene: "chibi, super deformed, monochrome, greyscale, manga, simple lineart, screentone, simple background" },
].map(p => ({ ...p, sceneNeg: BW_NEG }));

export function applyBwMangaCompatibility(s) {
    const patch = (a, b) => { assert.equal(s.split(a).length, 2, a.slice(0, 80)); s = s.replace(a, () => b); };
    patch("['画风', ['QQ人', '立绘', '头像', '证件照', '漫画格', '构图']]", "['画风', ['QQ人', '黑白', '立绘', '头像', '证件照', '漫画格', '构图']]");
    patch("const BUILTIN_SCENES = [\n", "const BUILTIN_SCENES = [\n" + BW.map(p => '    ' + JSON.stringify(p).replace(/"(\w+)":/g, '$1: ') + ',\n').join(''));
    patch("scene: p.scene, sceneNeg: '', sceneEn: ''", "scene: p.scene, sceneNeg: p.sceneNeg || '', sceneEn: ''");
    patch("<small class=\"mono\">${esc(p.scene)}</small></div>\n      <div class=\"pc-promptacts\">${cur ? '' : `<button class=\"pc-pill tiny on\" data-act=\"sceneuse\" data-kind=\"builtin\"",
        "<small class=\"mono\">${esc(p.scene)}</small>${p.sceneNeg ? `<small class=\"mono pc-dim\">负面：${esc(p.sceneNeg)}</small>` : ''}</div>\n      <div class=\"pc-promptacts\">${cur ? '' : `<button class=\"pc-pill tiny on\" data-act=\"sceneuse\" data-kind=\"builtin\"");
    // 黑白画风只是画风：「叠上去」接在现在的固定提示词后面，不换掉原来的姿势
    patch('<button class="pc-pill tiny dashed" data-act="scenecopy" data-i="${i}">存一份改</button></div></div>`;',
        '${p.tags.includes(\'黑白\') ? `<button class="pc-pill tiny dashed" data-act="scenestack" data-i="${i}">叠上去</button>` : \'\'}<button class="pc-pill tiny dashed" data-act="scenecopy" data-i="${i}">存一份改</button></div></div>`;');
    patch("            case 'scenecopy': {",
        `            case 'scenestack': {
                const p = BUILTIN_SCENES[Number(el.dataset.i)];
                if (!p) break;
                const st = ui.studio;
                const join = (a, b) => { const seen = new Set(), out = []; for (const x of [...String(a || '').split(','), ...String(b || '').split(',')].map(v => v.trim()).filter(Boolean)) { const k = x.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(x); } } return out.join(', '); };
                if (!String(st.scene || '').trim()) { applyScene(p); toastr.info(\`固定提示词换成了「\${p.name}」\`, '固定提示词', { timeOut: 1800 }); render(); break; }
                st.scene = join(st.scene, p.scene); st.sceneNeg = join(st.sceneNeg, p.sceneNeg); st.sceneEn = ''; st.sceneFrom = ''; st.sceneOn = true;
                saveStudio();
                toastr.info(\`「\${p.name}」叠在现在的固定提示词后面了\`, '固定提示词', { timeOut: 1800 }); render(); break;
            }
            case 'scenecopy': {`);
    return s;
}
