import assert from 'node:assert/strict';

// 0.8.82：标记里的人物位置也认 NAI 网页那种 5×5 格子写法（|centers:b2）：
// A～E 从左到右，1～5 从上到下，取格子中心；以前只认 |centers:0.3,0.5，格子写法会原样混进人物标签
export function applyCentersGridCompatibility(s) {
    const patch = (a, b) => { assert.equal(s.split(a).length, 2, a.slice(0, 80)); s = s.replace(a, () => b); };
    patch("            const centerMatch = block.value.match(/\\|centers:\\s*([\\d.]+)\\s*,\\s*([\\d.]+)\\s*$/i);\n            const center = centerMatch ? { x: Number(centerMatch[1]), y: Number(centerMatch[2]) } : null;",
        "            const gridMatch = block.value.match(/\\|\\s*centers?\\s*:\\s*([a-e])\\s*([1-5])\\s*$/i);\n            const centerMatch = gridMatch || block.value.match(/\\|centers:\\s*([\\d.]+)\\s*,\\s*([\\d.]+)\\s*$/i);\n            const center = gridMatch ? { x: Math.round((0.1 + 0.2 * ('abcde'.indexOf(gridMatch[1].toLowerCase()))) * 10) / 10, y: Math.round((0.1 + 0.2 * (Number(gridMatch[2]) - 1)) * 10) / 10 } : centerMatch ? { x: Number(centerMatch[1]), y: Number(centerMatch[2]) } : null;");
    return s;
}
