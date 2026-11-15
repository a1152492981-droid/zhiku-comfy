/**
 * 第二遍只看手。一次看整张图时，模型（尤其小模型）常把手势读成「手在脸边」，也分不清是不是画面外别人的手。
 * 单独问一遍手，返回 [{en, zh}]；读不出来返回 []
 */
const GESTURE_RE = /\b(finger heart|heart hands|v sign|double v|v over eye|ok sign|thumbs up|pointing|index finger raised|finger to (own |another's )?mouth|shushing|finger gun|claw pose|paw pose|fox shadow puppet|\\m\/|waving|salute|peace sign)\b/i;
const OTHER_HAND_RE = /another's|\bpov hands?\b|disembodied/i;
async function readHands(imageDataUrl) {
    const sys = `你只看图里的手，别的都不管。一只一只看清楚：
1. 这只手是谁的：画里的人自己的（own），还是从画面边上伸进来的别人的手（another，常见是镜头前的人，也就是 POV）。看手臂从哪里连过来，接不到画里人的肩膀就是别人的手。
2. 手指怎么摆：哪根伸直、哪根弯，拇指和食指有没有交叉，两只手是不是合在一起。
3. 手势是什么，从这些里挑最准的：finger heart（拇指和食指交叉的单手比心，常放在脸边）、heart hands（双手合成心形）、v sign、double v、v over eye、ok sign、thumbs up、pointing、pointing at viewer、index finger raised、finger to mouth、shushing、finger gun、claw pose、paw pose、fox shadow puppet、\\m/、waving、salute、fist、open hand。没有特别的手势就不写手势。
4. 手在碰什么：hand on own cheek / chin / chest、hand in own hair、holding xx。
5. 别人的手要写互动：pov hands，再写 holding another's wrist、holding another's hand、another's hand on face、hand on another's face、hand on another's head、kissing another's fingers、finger to another's mouth、licking another's fingers、pulling another's tie、grabbing another's collar 等，分清谁抓着谁。
只输出 JSON：{"hands":[{"whose":"own 或 another","zh":"中文一句话说这只手"}],"tags":[{"en":"标签","zh":"中文"}]}`;
    const j = pickJson(await askVision(sys, '只看手：每只手是谁的、手指怎么摆、是什么手势、在碰什么。', imageDataUrl, { maxTokens: 800, fn: 'pose' }));
    return normPairs(j.tags);
}
/** 把读手的结果并进姿势：具体手势顶掉「手在脸边」，别人的手顶掉「自己托腮」 */
function mergeHands(pose, hands) {
    if (!hands.length) return pose;
    const other = hands.some(h => OTHER_HAND_RE.test(h.en)), gesture = hands.some(h => GESTURE_RE.test(h.en));
    let out = pose.filter(p => !(gesture || other) || !/^hands? (near|by|close to) (own )?face$/i.test(p.en));
    if (other) out = out.filter(p => !/^(hand on own (face|cheek|chin)|chin rest|head on hand|hand to own mouth)$/i.test(p.en) || hands.some(h => h.en.toLowerCase() === p.en.toLowerCase()));
    const have = new Set(out.map(p => p.en.toLowerCase()));
    return [...hands.filter(h => !have.has(h.en.toLowerCase())), ...out];
}
