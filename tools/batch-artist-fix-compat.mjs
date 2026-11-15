import assert from 'node:assert/strict';

// 0.8.66：批量里「标题行 + 画师串行」时，串里的 chibi、super deformed 之类不再被加上 artist:；
// 这类画风词加进非画师名单，已经存错的打开时自动放回普通词；artist:xxx:: 结尾多出的冒号去掉
export function applyBatchArtistFixCompatibility(s) {
    const patch = (a, b) => { assert.equal(s.split(a).length, 2, a.slice(0, 80)); s = s.replace(a, () => b); };
    patch("        if (label) push(batchUnit(toks.map(t => batchNameLike(bare(t)) ? batchWithArtist(t) : t)));\n        else if (tokenize(line).some(t => t.isArtist)) push(batchUnit([line]));",
        "        if (tokenize(line).some(t => t.isArtist)) push(batchUnit([line]));\n        else if (label) push(batchUnit(toks.map(t => batchNameLike(bare(t)) ? batchWithArtist(t) : t)));");
    patch('|artist[ _]collaboration|(?:finely[ _])?detailed[ _]',
        '|artist[ _]collaboration|chibi|chibi[ _]inset|chibi[ _]only|super[ _]deformed|deformed|oversized[ _]head|small[ _]body|big[ _]head|[23]-head-tall|multiple[ _]views|incredibly[ _]absurdres|clean[ _]rendering|[\\w -]+[ _]emphasis|[\\w -]+[ _]rendering|semi-realistic[ _]skin|full[ _]color|anime[ _]coloring|flat[ _]color|stunning[ _]quality|high[ _]resolution|(?:finely[ _])?detailed[ _]');
    patch("    let t = String(text || '').trim().replace(/^(artist\\s*:\\s*)+/i, 'artist:');",
        "    let t = String(text || '').trim().replace(/^(artist\\s*:\\s*)+/i, 'artist:').replace(/\\s*:+\\s*$/, '');");
    return s;
}
