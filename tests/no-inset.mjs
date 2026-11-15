import assert from 'node:assert/strict';
import fs from 'node:fs';
// 老一点的手机浏览器 / WebView 不认 inset 简写：全屏的东西（漫画阅读、弹窗）会没位置、高度 0，看起来就是「点了没反应」
const src = fs.readFileSync(new URL('../runtime.js', import.meta.url), 'utf8');
const left = src.match(/(?<![\w-])inset:\s*[^;}"'`]+[;}]/g) || [];
assert.equal(left.length, 0, 'runtime.js 里还有 inset 简写：' + left.slice(0, 3).join(' | '));
assert.match(src, /\.pc-comic-book\{position:fixed!important;top:0!important;right:0!important;bottom:0!important;left:0!important;/);
console.log('no-inset ok');
