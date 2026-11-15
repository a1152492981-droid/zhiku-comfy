/** 看镜头删词：正面、固定提示词写了只拍头 / 上半身 / 到大腿，角色里拍不到的身体部位和衣服就不发；
 *  写了 chibi（QQ人）时，角色里尖脸、身材、身高这些跟大头小身子打架的词也不发。
 *  只删角色页存的外貌、身材和衣服，自己在正面里写的词一个都不动。 */
const FRAME_RULES = {
    full: /^(?:full body|wide shot|very wide shot|lower body|feet|foot focus|feet focus|legs|leg focus|ass focus|thigh focus)$/,
    cowboy: /^(?:cowboy shot|thigh up|thighs up|knee up|knees up)$/,
    upper: /^(?:upper body|bust shot|waist up|chest up|medium shot)$/,
    head: /^(?:portrait|close-?up|extreme close-?up|face focus|headshot|head shot|id photo|passport photo|head and shoulders|bust portrait|face only)$/,
};
const FRAME_NAME = { cowboy: '画到大腿', upper: '画上半身', head: '画头像' };
const CHIBI_ON = /^(?:chibi|super deformed|chibi only|[23]-head-tall|deformed proportions)$/;
const W = s => new RegExp(`(?:^|\\s)(?:${s})(?:\\s|$)`);
const FRAME_FEET = W('feet|foot|toes?|soles?|ankles?|barefoot|shoes?|boots?|heels|high heels|sandals?|sneakers?|loafers?|slippers?|socks?|kneehighs?|footwear|legwear');
const FRAME_LOWER = W('tall|tall female|tall male|very tall|hips?|thighs?|thigh gap|legs?|knees?|calf|calves|ass|butt|buttocks|crotch|groin|lower body|pubic hair|penis|pussy|vagina|testicles|bulge|skirt|miniskirt|pants|trousers|shorts|jeans|leggings|pantyhose|stockings?|thighhighs|garter belt|garter straps|panties|underwear|briefs|boxers|fundoshi|hakama|long dress|maxi dress|belt');
const FRAME_BODY = W('breasts?|cleavage|underboob|sideboob|nipples?|areolae|chest|pectorals|abs|navel|midriff|stomach|belly|waist|narrow waist|curvy|voluptuous|hourglass figure|plump');
/** QQ人：脸型、五官比例、身材、身高这类会把大头小身子拉回正常比例的词 */
const CHIBI_DROP = W('sharp face|pointed chin|slender face|thin face|narrow face|long face|angular face|oval face|sharp jawline|jawline|defined jawline|defined cheekbones|high cheekbones|cheekbones|hollow cheeks|mature face|adult face|narrow eyes|small eyes|small pupils|adam\'s apple|long neck|slender neck|thick neck|mature female|mature male|milf|dilf|muscular|muscular male|muscular female|toned|toned male|toned female|lean|lean muscular|slender|skinny|thin|tall|tall female|tall male|very tall|broad shoulders|wide shoulders|long legs|long arms|long torso|large breasts|huge breasts|gigantic breasts|wide hips|thick thighs|curvy|voluptuous|hourglass figure|pectorals|abs|biceps|veins|narrow waist|realistic proportions');
const frameWords = text => M.tokenize(String(text || '')).filter(t => t.weight > 0 && !t.isArtist).map(t => String(t.text || '').toLowerCase().replace(/_/g, ' ').replace(/^artist\s*:\s*/, '').trim());
/** 正面里写的是哪种镜头；写了全身、腿、脚之类就当全身，不删。chibi 单独标出来 */
function frameOf(text) {
    const words = frameWords(text);
    const has = k => words.some(w => FRAME_RULES[k].test(w));
    const shot = has('full') ? '' : has('cowboy') ? 'cowboy' : has('upper') ? 'upper' : has('head') ? 'head' : '';
    const chibi = words.some(w => CHIBI_ON.test(w));
    return shot || chibi ? { shot, chibi } : '';
}
/** 按镜头和 QQ人 删掉不该发的词，返回 { text, dropped } */
function frameTrim(text, frame) {
    const src = String(text || '');
    if (!frame || !src.trim()) return { text: src, dropped: [] };
    const { shot, chibi } = typeof frame === 'string' ? { shot: frame, chibi: false } : frame;
    const dropped = [], kept = [];
    for (const t of M.tokenize(src)) {
        const w = String(t.text || '').toLowerCase().replace(/_/g, ' ').trim();
        const out = (shot && FRAME_FEET.test(w)) || ((shot === 'upper' || shot === 'head') && FRAME_LOWER.test(w)) || (shot === 'head' && FRAME_BODY.test(w)) || (chibi && CHIBI_DROP.test(w));
        const raw = t.raw || (Math.abs(t.weight - 1) < 0.001 ? t.text : `${M.fmtWeight(t.weight)}::${t.text}::`);
        (out ? dropped : kept).push(out ? t.text : raw);
    }
    return { text: kept.join(', '), dropped };
}
const frameName = f => !f ? '' : [f.shot ? FRAME_NAME[f.shot] : '', f.chibi ? '画QQ人' : ''].filter(Boolean).join('、');
const CHIBI_NEG = 'chibi inset, multiple views, realistic proportions';
