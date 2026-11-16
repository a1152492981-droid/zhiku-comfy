            case 'anlasraw': {
                const a = await N.anlasRefresh(true);
                if (!a?.raw) { toastr.warning(a?.error ? `查不到：${a.error}` : '现在的连接方式查不了点数', '智库'); break; }
                const text = JSON.stringify(a.raw, null, 1);
                try { await P.navigator.clipboard.writeText(text); toastr.success('账户信息复制好了，发我之前看一眼有没有不想给人看的', '智库', { timeOut: 3500 }); }
                catch { await promptText('账户信息（长按全选复制）', text, true); }
                break;
            }
