            case 'trashrestore': case 'trashrestoreall': {
                const tids = act === 'trashrestoreall' ? pcTrash(d).map(e => e.tid) : [el.dataset.t];
                const n = pcTrashRestore(d, tids);
                if (!pcTrash(d).length) ui.bookTab = 'artists';
                commit(); render();
                toastr.success(`放回了 ${n} 个`, '智库', { timeOut: 1800 });
                break;
            }
            case 'trashpurge': case 'trashempty': {
                const tids = act === 'trashempty' ? pcTrash(d).map(e => e.tid) : [el.dataset.t];
                if (!tids.length) break;
                if (!(await confirmBox(act === 'trashempty' ? `清空回收站？${tids.length} 个会彻底删掉，例图也一起删，不能再放回。` : '彻底删掉？例图也一起删，不能再放回。', { ok: '彻底删', cancel: '算了' }))) break;
                pcTrashPurge(d, tids);
                if (!pcTrash(d).length) ui.bookTab = 'artists';
                commit(); render();
                break;
            }
            case 'batchstar': {
                const key = el.dataset.k, v = Number(el.dataset.v) || 0, st = ui.batch.state;
                if (!st) break;
                const ref = pcBatchRowRef(d, key), it = ref && M.resolveTicket(d, ref)?.item;
                const cur = Number(it ? it.stars : st.rowStars?.[key]) || 0, next = cur === v ? 0 : v;
                if (it) { it.stars = next; commit({ silent: true }); } else (st.rowStars ||= {})[key] = next;
                render(); break;
            }
            case 'batchretry': {
                const st = ui.batch.state;
                if (!st || st.running) break;
                let n = 0;
                for (const j of st.jobs) if (j.status === 'error' || j.status === 'wait') { j.status = 'wait'; j.error = ''; n++; }
                if (!n) break;
                st.run(); render();
                toastr.info(`重新画 ${n} 张`, '批量生成例图', { timeOut: 1500 });
                break;
            }
            case 'delnoteclear': case 'delnoteclearall': {
                if (act === 'delnoteclearall') { if (!(await confirmBox('清掉全部「删过」的记录？', { ok: '清掉', cancel: '算了' }))) break; d.options.deletedNotes = {}; }
                else delete d.options.deletedNotes?.[el.dataset.key];
                commit(); render(); break;
            }
            case 'seedrandom': { N.settings().novelai_seed = '0'; N.save(); render(); toastr.info('种子改回随机了', '生成图片', { timeOut: 1500 }); break; }
