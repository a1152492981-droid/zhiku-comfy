import assert from 'node:assert/strict';
export function applyStudioFakeArtistCompatibility(s) {
    const patch = (a, b) => { assert.equal(s.split(a).length, 2, a); s = s.replace(a, () => b); };
    patch('|source_\\w+)$/i;', '|source_\\w+|mini[ _]person|flat[ _]colou?r|lineart|line[ _]art|no[ _]lineart|monochrome|greyscale|sketch|simple[ _]background|white[ _]background|cel[ _]shading|watercolor(?:[ _]\\(medium\\))?|traditional[ _]media|pixel[ _]art|realistic|photorealistic|3d|thick[ _]outlines)$/i;');
    patch('/** 把一串画师名（换行或逗号隔开）拆成一个个画师 */', String.raw`/** 清理误加的画师前缀，保留原有权重及真正的画师名。 */
const cleanFakeArtists = text => String(text || '').replace(/\bartist\s*:\s*([^,:{}\[\]()\n]+(?:\([^()\n]*\))?)/gi, (m, n) => fakeArtistName(n) ? n.trim() : m);

/** 把一串画师名（换行或逗号隔开）拆成一个个画师 */`);
    patch('return { DATA_VERSION, SHOTS,', 'return { DATA_VERSION, fakeArtistName, cleanFakeArtists, SHOTS,');
    patch("    st.pos = saved.pos ?? (d.active ? M.ticketString(d, d.active) : '');", "    st.pos = M.cleanFakeArtists(saved.pos ?? (d.active ? M.ticketString(d, d.active) : ''));");
    patch('        if (t.isArtist) continue;\n        const name = t.text.trim();', '        if (t.isArtist) continue;\n        const name = t.text.trim();\n        if (M.fakeArtistName(name)) { lead = false; continue; }');
    patch(String.raw`    if (rawStillValid(data, t.item)) return t.item.raw.replace(/\bartist\s*:\s*([^,:{}\[\]()\n]+)/gi, (m, n) => fakeArtistName(n) ? n.trim() : m);`, '    if (rawStillValid(data, t.item)) return cleanFakeArtists(t.item.raw);');
    return s;
}
