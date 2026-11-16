import assert from 'node:assert/strict';

// 0.8.75：存档大的时候（例如氛围图带编码）每次点按钮后保存会卡住好几秒。
// - 记录删除只留各库的 id，不再整份 structuredClone
// - localStorage 备份大于 1.5MB 就不写（本来也写不进去，还要白卡一次），300KB 以上挪到空闲时写
// - 上传前转 base64 改成浏览器异步转换；读回校验先直接比文字
// - 保存过程中不再重复把整份存档转成文字/解析
export function applyStorePerfCompatibility(s) {
    const patch = (a, b) => { assert.equal(s.split(a).length, 2, a.slice(0, 80)); s = s.replace(a, () => b); };

    patch("function recordLibraryDeletes(data, before) {",
        "function pcIdSnap(value) {\n    const out = {};\n    for (const key of LIBRARY_MAPS) out[key] = Object.fromEntries(Object.keys(value?.[key] || {}).map(id => [id, 1]));\n    return out;\n}\nfunction recordLibraryDeletes(data, before) {");
    patch("    observed = structuredClone(data);\n", "    observed = pcIdSnap(data);\n");
    patch("    recordLibraryDeletes(data, observed); observed = structuredClone(data);",
        "    recordLibraryDeletes(data, observed); observed = pcIdSnap(data);");

    patch(`function snapshotData() {
    const json = JSON.stringify(data);
    // Synchronous local backup happens before waiting for any older network request.
    try { localStorage.setItem(LOCAL_BACKUP, json); } catch {}
    void idbSet('data', json);
    if (!fileOk) saveExt(JSON.parse(json));
    return json;
}`, `const PC_LOCAL_MAX = 1500000;
let pcLocalTimer = null, pcLocalJson = '';
function pcLocalBackup(json, now = false) {
    pcLocalJson = json;
    const write = () => { pcLocalTimer = null; const j = pcLocalJson; pcLocalJson = ''; if (j && j.length < PC_LOCAL_MAX) try { localStorage.setItem(LOCAL_BACKUP, j); } catch {} };
    if (now || json.length < 300000) { if (pcLocalTimer) { clearTimeout(pcLocalTimer); pcLocalTimer = null; } write(); return; }
    if (!pcLocalTimer) pcLocalTimer = setTimeout(() => globalThis.requestIdleCallback ? requestIdleCallback(write, { timeout: 4000 }) : write(), 2500);
}
function snapshotData(now = false) {
    const json = JSON.stringify(data);
    // 大存档的 localStorage 备份会同步卡住界面：IndexedDB 一直有一份，localStorage 只在空闲时补
    pcLocalBackup(json, now);
    void idbSet('data', json);
    if (!fileOk) saveExt(JSON.parse(json));
    return json;
}
function pcBase64(str) {
    if (str.length < 200000 || typeof FileReader === 'undefined' || typeof Blob === 'undefined') return Promise.resolve(utf8ToBase64(str));
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => { const u = String(r.result || ''); resolve(u.slice(u.indexOf(',') + 1)); };
        r.onerror = () => reject(r.error || new Error('转码失败'));
        r.readAsDataURL(new Blob([str], { type: 'application/octet-stream' }));
    });
}
// 让出一下主线程，让点按先响应（MessageChannel 比 setTimeout 快，没有就直接继续）
const pcYield = () => typeof MessageChannel === 'undefined' ? Promise.resolve() : new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => { c.port1.close(); r(); }; c.port2.postMessage(0); });`);

    patch(`            const target = JSON.parse(json), added = mergeLibraryAdditions(target, remote);
            target.options.savedAt = Math.max(savedAt(target), savedAt(remote) + 1);
            body = JSON.stringify(target);
            const before = JSON.stringify(data), visibleAdded = mergeLibraryAdditions(data, remote);
            if (savedAt(data) <= savedAt(JSON.parse(json))) data.options.savedAt = target.options.savedAt;
            observed = structuredClone(data); snapshotData();
            if (visibleAdded) toastr.info(\`已并入其它设备或页面新增的 \${visibleAdded} 项\`, '智库');
            if (JSON.stringify(data) !== before) emit();
            await tryFile(body);`,
`            await pcYield();
            const target = JSON.parse(json), jsonAt = savedAt(target), added = mergeLibraryAdditions(target, remote);
            target.options.savedAt = Math.max(jsonAt, savedAt(remote) + 1);
            body = JSON.stringify(target);
            const keysBefore = JSON.stringify(pcIdSnap(data)), visibleAdded = mergeLibraryAdditions(data, remote);
            if (savedAt(data) <= jsonAt) data.options.savedAt = target.options.savedAt;
            observed = pcIdSnap(data);
            const changed = visibleAdded || JSON.stringify(observed) !== keysBefore;
            await pcYield(); snapshotData();
            if (visibleAdded) toastr.info(\`已并入其它设备或页面新增的 \${visibleAdded} 项\`, '智库');
            if (changed) emit();
            await pcYield();
            await tryFile(body);`);

    patch(`    const res = await fileRequest('/api/files/upload', { method: 'POST', headers: headers(), body: JSON.stringify({ name: DATA_FILE, data: utf8ToBase64(json) }) });`,
        `    const res = await fileRequest('/api/files/upload', { method: 'POST', headers: headers(), body: JSON.stringify({ name: DATA_FILE, data: await pcBase64(json) }) });`);
    patch(`    const back = check.ok && backupData(check.text);
    if (!back || JSON.stringify(back) !== json) throw new Error('上传后未读回同一份画师库，已保留其它备份');`,
        `    await pcYield();
    const same = check.ok && check.text === json;
    const back = same ? JSON.parse(json) : check.ok && backupData(check.text);
    if (!back || (!same && JSON.stringify(back) !== json)) throw new Error('上传后未读回同一份画师库，已保留其它备份');`);

    // 切到后台时立刻写一份 localStorage（小存档）
    patch("const flushNow = () => { if (saveTimer !== null) commit({ immediate: true, silent: true }); };",
        "const flushNow = () => { if (saveTimer !== null) commit({ immediate: true, silent: true }); if (pcLocalTimer) pcLocalBackup(pcLocalJson, true); };");
    // 检查存档里显示存档大小，方便看是不是太大才卡
    patch("    L.push(`文件可写：", "    try { const big = Object.entries(data).map(([k, v]) => [k, JSON.stringify(v ?? null).length]).sort((a, b) => b[1] - a[1]); const mb = n => (n / 1048576).toFixed(2) + 'MB'; L.push(`【存档大小】${mb(big.reduce((a, b) => a + b[1], 0))} · 最大的：${big.slice(0, 3).map(([k, n]) => k + ' ' + mb(n)).join('，')}`); } catch {}\n    L.push(`文件可写：");
    return s;
}
