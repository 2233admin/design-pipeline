'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LOCALES, detectLocale, t, type Locale } from '@/lib/i18n';

type Depth = 'structure' | 'full';
type OutputKey = 'site' | 'product' | 'dataModel' | 'backend' | 'design';
type TaskStatus =
  | 'created' | 'awaiting-login' | 'crawling' | 'planning'
  | 'building' | 'distilling' | 'analyzing' | 'done' | 'error';

interface ProgressEntry { at: string; step: string; msg: string }
interface TaskDoc { key: OutputKey; title: string; file: string }
interface TaskResult { types?: number; pages?: number; assets?: number; siteIndex?: string; docs?: TaskDoc[] }
interface Task {
  id: string; domain: string; rootUrl: string; name: string;
  createdAt: string; updatedAt: string;
  options: { depth: Depth; outputs: OutputKey[]; maxPages?: number };
  status: TaskStatus; progress: ProgressEntry[]; result?: TaskResult; error?: string;
}
interface DomainInfo { domain: string; count: number }

const DEPTHS: Depth[] = ['structure', 'full'];
const OUTPUTS: OutputKey[] = ['site', 'product', 'dataModel', 'backend', 'design'];
const TERMINAL = (s: TaskStatus) => s === 'done' || s === 'error';

// 固定 3 模型: 显示标题 → 实际模型名
const MODELS: Array<{ id: string; title: string }> = [
  { id: 'codex-5.5', title: 'Gpt-5.5' },
  { id: 'gemini-3.5-flash', title: 'Gemini-3.5-flash' },
  { id: 'kiro-opus-4.8', title: 'Claude-opus-4.8' },
];

export default function SiteClonePage() {
  const [locale, setLocale] = useState<Locale>('en');
  useEffect(() => {
    const saved = (typeof localStorage !== 'undefined' && localStorage.getItem('clone-locale')) as Locale | null;
    setLocale(saved && LOCALES.some((l) => l.code === saved) ? saved : detectLocale());
  }, []);
  const changeLocale = (l: Locale) => {
    setLocale(l);
    try { localStorage.setItem('clone-locale', l); } catch { /* ignore */ }
  };
  const tr = useCallback((k: string, v?: Record<string, string | number>) => t(locale, k, v), [locale]);

  // 建任务表单
  const [url, setUrl] = useState('https://openai.com/');
  const [name, setName] = useState('');
  const [depth, setDepth] = useState<Depth>('structure');
  const [outputs, setOutputs] = useState<OutputKey[]>(['site', 'product', 'dataModel', 'backend', 'design']);

  // 登录门 / 运行
  const [phase, setPhase] = useState<'form' | 'login' | 'running'>('form');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [reused, setReused] = useState(false);
  const [active, setActive] = useState<Task | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 设置(常驻内联面板)
  const [sModel, setSModel] = useState('codex-5.5');
  const [sKey, setSKey] = useState('');
  const [keyInfo, setKeyInfo] = useState<{ hasKey: boolean; mask: string }>({ hasKey: false, mask: '' });
  const [savedFlag, setSavedFlag] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // 历史
  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [openDomain, setOpenDomain] = useState<string | null>(null);
  const [domainTasks, setDomainTasks] = useState<Record<string, Task[]>>({});

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toggleOutput = (k: OutputKey) =>
    setOutputs((o) => (o.includes(k) ? o.filter((x) => x !== k) : [...o, k]));

  const loadDomains = useCallback(async () => {
    const r = await fetch('/api/crawl/task/list').then((x) => x.json()).catch(() => null);
    if (r?.success) setDomains(r.domains || []);
  }, []);

  const loadDomainTasks = useCallback(async (domain: string) => {
    const r = await fetch(`/api/crawl/task/list?domain=${encodeURIComponent(domain)}`)
      .then((x) => x.json()).catch(() => null);
    if (r?.success) setDomainTasks((m) => ({ ...m, [domain]: r.tasks || [] }));
  }, []);

  const loadSettings = useCallback(async () => {
    const r = await fetch('/api/crawl/settings').then((x) => x.json()).catch(() => null);
    if (r?.success) {
      setSModel(r.model || 'codex-5.5');
      setKeyInfo({ hasKey: !!r.hasKey, mask: r.keyMask || '' });
    }
  }, []);

  useEffect(() => { loadDomains(); loadSettings(); }, [loadDomains, loadSettings]);

  // 轮询运行中的任务
  useEffect(() => {
    if (phase !== 'running' || !active) return;
    const tick = async () => {
      const r = await fetch(`/api/crawl/task/status?domain=${encodeURIComponent(active.domain)}&id=${active.id}`)
        .then((x) => x.json()).catch(() => null);
      if (r?.success) {
        setActive(r.task);
        if (TERMINAL(r.task.status)) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          loadDomains();
          loadDomainTasks(r.task.domain);
        }
      }
    };
    pollRef.current = setInterval(tick, 2000);
    tick();
    return () => { if (pollRef.current) clearInterval(pollRef.current); pollRef.current = null; };
  }, [phase, active?.id, loadDomains, loadDomainTasks]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveSettings() {
    setSavingSettings(true); setSavedFlag(false);
    try {
      const r = await fetch('/api/crawl/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: sModel, mdboxKey: sKey }),
      }).then((x) => x.json());
      if (!r.success) throw new Error(r.error);
      setSavedFlag(true);
      setSKey('');
      await loadSettings();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setSavingSettings(false); }
  }

  // 建任务 → 自动开浏览器进登录门
  async function createAndOpen() {
    setErr(null);
    if (!outputs.length) { setErr(tr('form.needOutput')); return; }
    setBusy(true);
    try {
      const cr = await fetch('/api/crawl/task/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootUrl: url, name, locale, depth, outputs, maxPages: depth === 'full' ? 200 : undefined }),
      }).then((x) => x.json());
      if (!cr.success) throw new Error(cr.error);
      await openBrowserFor(cr.task);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }

  async function openBrowserFor(task: Task) {
    setActive(task);
    const op = await fetch('/api/crawl/open', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: task.rootUrl }),
    }).then((x) => x.json());
    if (!op.success) throw new Error(op.error);
    setSessionId(op.sessionId);
    setReused(!!op.reusedProfile);
    setPhase('login');
  }

  // 点开始 → 后台跑管线, 进入轮询
  async function startRun() {
    if (!active || !sessionId) return;
    setErr(null); setBusy(true);
    try {
      const r = await fetch('/api/crawl/task/run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: active.domain, id: active.id, sessionId }),
      }).then((x) => x.json());
      if (!r.success) throw new Error(r.error);
      setPhase('running');
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }

  async function cancelLogin() {
    if (sessionId) {
      await fetch('/api/crawl/close', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      }).catch(() => {});
    }
    resetToForm();
  }

  function resetToForm() {
    setSessionId(null); setReused(false); setActive(null); setPhase('form'); setErr(null);
  }

  async function rerun(task: Task) {
    setErr(null); setBusy(true);
    try { await openBrowserFor(task); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  }

  async function removeTask(task: Task) {
    if (!confirm(tr('history.confirmDelete', { name: task.name }))) return;
    await fetch('/api/crawl/task/delete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: task.domain, id: task.id }),
    }).catch(() => {});
    loadDomainTasks(task.domain);
    loadDomains();
  }

  const running = active && phase === 'running';
  const statusLabel = (s: TaskStatus) => tr(`status.${s}`);

  return (
    <main style={{ maxWidth: 780, margin: '40px auto', padding: '0 20px', fontFamily: 'system-ui, sans-serif' }}>
      {/* 顶栏: 标题 + 语言切换 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 4 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{tr('app.title')}</h1>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          {LOCALES.map((l) => (
            <button key={l.code} onClick={() => changeLocale(l.code)} style={langBtn(locale === l.code)}>{l.label}</button>
          ))}
        </div>
      </div>
      <p style={{ color: '#666', marginBottom: 20, fontSize: 14 }}>{tr('app.subtitle')}</p>

      {/* 设置面板(常驻内联) */}
      <div style={card('#fff', '#e5e7eb')}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <b style={{ fontSize: 15 }}>⚙ {tr('settings.title')}</b>
          <a href="https://mdbox.ai" target="_blank" rel="noreferrer" style={{ ...link, fontSize: 13 }}>{tr('settings.getKey')}</a>
        </div>

        <label style={{ ...lbl, marginTop: 14 }}>{tr('settings.model')}</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
          {MODELS.map((m) => (
            <button key={m.id} onClick={() => setSModel(m.id)} style={pill(sModel === m.id)}>
              <b>{m.title}</b>
              <span style={pillHint}>{m.id}</span>
            </button>
          ))}
        </div>
        <p style={hintP}>{tr('settings.model.hint')}</p>

        <label style={{ ...lbl, marginTop: 12 }}>
          {tr('settings.key')} ·{' '}
          <span style={{ color: keyInfo.hasKey ? '#16a34a' : '#dc2626', fontWeight: 400 }}>
            {keyInfo.hasKey ? `${tr('settings.key.set')} (${keyInfo.mask})` : tr('settings.key.unset')}
          </span>
        </label>
        <input type="password" value={sKey} onChange={(e) => setSKey(e.target.value)}
          placeholder={tr('settings.key.ph')} style={inp} autoComplete="off" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <button onClick={saveSettings} disabled={savingSettings} style={btn(!savingSettings, '#2563eb')}>
            {savingSettings ? tr('settings.saving') : tr('settings.save')}
          </button>
          {savedFlag ? <span style={{ color: '#16a34a', fontSize: 13 }}>✓ {tr('settings.saved')}</span> : null}
        </div>
      </div>

      {/* 建任务表单 */}
      {phase === 'form' ? (
        <div style={card('#fff', '#e5e7eb')}>
          <label style={lbl}>{tr('form.startUrl')}</label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." style={inp} />

          <label style={{ ...lbl, marginTop: 14 }}>{tr('form.taskName')}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={tr('form.taskNamePh')} style={inp} />

          <label style={{ ...lbl, marginTop: 16 }}>{tr('form.depth')}</label>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            {DEPTHS.map((d) => (
              <button key={d} onClick={() => setDepth(d)} style={pill(depth === d)}>
                <b>{tr(`depth.${d}`)}</b>
                <span style={pillHint}>{tr(`depth.${d}.hint`)}</span>
              </button>
            ))}
          </div>

          <label style={{ ...lbl, marginTop: 16 }}>{tr('form.outputs')}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
            {OUTPUTS.map((o) => (
              <button key={o} onClick={() => toggleOutput(o)} style={pill(outputs.includes(o))}>
                <b>{tr(`out.${o}`)}</b>
                <span style={pillHint}>{tr(`out.${o}.hint`)}</span>
              </button>
            ))}
          </div>
          <p style={hintP}>{tr('form.aiNote')}</p>

          <button onClick={createAndOpen} disabled={busy || !outputs.length}
            style={{ ...btn(!busy && !!outputs.length, '#2563eb'), marginTop: 16 }}>
            {busy ? tr('form.creating') : tr('form.create')}
          </button>
        </div>
      ) : null}

      {/* 登录门 */}
      {phase === 'login' && active ? (
        <div style={card('#eff6ff', '#bfdbfe')}>
          <p style={{ margin: 0, fontWeight: 600, color: '#1e40af' }}>{active.name} · {tr('login.title')}</p>
          <p style={{ margin: '8px 0 0', fontSize: 14, color: '#1e40af' }}>
            {reused ? tr('login.reused') : tr('login.fresh')}
          </p>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={startRun} disabled={busy} style={btn(!busy, '#10b981')}>
              {busy ? tr('login.starting') : tr('login.start')}
            </button>
            <button onClick={cancelLogin} style={btn(true, '#6b7280')}>{tr('login.cancel')}</button>
          </div>
        </div>
      ) : null}

      {/* 运行进度 */}
      {running ? (
        <div style={card('#f8fafc', '#e2e8f0')}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>
            {active!.name}
            <span style={{ marginLeft: 10, padding: '2px 10px', borderRadius: 20, fontSize: 12,
              background: active!.status === 'error' ? '#fee2e2' : active!.status === 'done' ? '#dcfce7' : '#dbeafe',
              color: active!.status === 'error' ? '#b91c1c' : active!.status === 'done' ? '#166534' : '#1e40af' }}>
              {statusLabel(active!.status)}
            </span>
          </p>
          <ProgressLog entries={active!.progress} waiting={tr('run.waiting')} />
          {TERMINAL(active!.status) ? (
            <div style={{ marginTop: 12 }}>
              <TaskProducts task={active!} tr={tr} />
              <button onClick={resetToForm} style={{ ...btn(true, '#2563eb'), marginTop: 12 }}>{tr('run.newTask')}</button>
            </div>
          ) : (
            <p style={{ fontSize: 12, color: '#64748b', margin: '10px 0 0' }}>{tr('run.hint')}</p>
          )}
        </div>
      ) : null}

      {err ? <p style={{ color: '#dc2626', fontSize: 14, marginTop: 14 }}>⚠ {err}</p> : null}

      {/* 历史(按域名) */}
      <h2 style={{ fontSize: 17, fontWeight: 700, margin: '28px 0 10px' }}>{tr('history.title')}</h2>
      {domains.length === 0 ? (
        <p style={{ color: '#9ca3af', fontSize: 14 }}>{tr('history.empty')}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {domains.map((d) => (
            <div key={d.domain} style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
              <button
                onClick={() => {
                  const next = openDomain === d.domain ? null : d.domain;
                  setOpenDomain(next);
                  if (next) loadDomainTasks(next);
                }}
                style={{ width: '100%', textAlign: 'left', padding: '10px 14px', background: '#f9fafb', border: 'none',
                  cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                <span>{openDomain === d.domain ? '▾' : '▸'} {d.domain}</span>
                <span style={{ color: '#9ca3af', fontWeight: 400 }}>{tr('history.count', { n: d.count })}</span>
              </button>
              {openDomain === d.domain ? (
                <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(domainTasks[d.domain] || []).map((tk) => (
                    <div key={tk.id} style={{ border: '1px solid #f1f5f9', borderRadius: 8, padding: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                        <b style={{ fontSize: 14 }}>{tk.name}</b>
                        <span style={{ fontSize: 12, color: statusColor(tk.status) }}>{statusLabel(tk.status)}</span>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280' }}>
                        {tr(`depth.short.${tk.options.depth}`)} · {tk.options.outputs.map((o) => tr(`out.${o}`)).join(' / ')}
                        {'  ·  '}{new Date(tk.createdAt).toLocaleString()}
                      </p>
                      {tk.status === 'error' && tk.error ? <p style={{ margin: '4px 0 0', fontSize: 12, color: '#dc2626' }}>⚠ {tk.error}</p> : null}
                      <div style={{ marginTop: 6 }}><TaskProducts task={tk} tr={tr} /></div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button onClick={() => rerun(tk)} disabled={busy || !!running} style={smallBtn(!busy && !running, '#2563eb')}>{tr('history.rerun')}</button>
                        <button onClick={() => removeTask(tk)} style={smallBtn(true, '#ef4444')}>{tr('history.delete')}</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function ProgressLog({ entries, waiting }: { entries: ProgressEntry[]; waiting: string }) {
  const last = entries.slice(-10);
  return (
    <div style={{ marginTop: 10, maxHeight: 220, overflowY: 'auto', background: '#0f172a', color: '#cbd5e1',
      borderRadius: 8, padding: 10, fontSize: 12, fontFamily: 'monospace', lineHeight: 1.6 }}>
      {last.length === 0 ? <span style={{ color: '#64748b' }}>{waiting}</span> :
        last.map((e, i) => (
          <div key={i}><span style={{ color: '#64748b' }}>{new Date(e.at).toLocaleTimeString()} </span>
            <span style={{ color: '#7dd3fc' }}>[{e.step}]</span> {e.msg}</div>
        ))}
    </div>
  );
}

function TaskProducts({ task, tr }: { task: Task; tr: (k: string, v?: Record<string, string | number>) => string }) {
  const r = task.result;
  if (!r || task.status !== 'done') return null;
  const base = `/site-clone/${task.domain}/${task.id}`;
  const openDir = async () => {
    await fetch('/api/crawl/task/reveal', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain: task.domain, id: task.id }),
    }).catch(() => {});
  };
  return (
    <div style={{ fontSize: 13 }}>
      {r.siteIndex ? (
        <div style={{ marginBottom: 4 }}>
          <a href={`${base}/${r.siteIndex}`} target="_blank" rel="noreferrer" style={link}>{tr('prod.openSite')}</a>
          <span style={{ color: '#9ca3af', marginLeft: 8 }}>{tr('prod.pagesAssets', { pages: r.pages ?? 0, assets: r.assets ?? 0 })}</span>
        </div>
      ) : null}
      {r.docs?.length ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {r.docs.map((d) => (
            <a key={d.key} href={`${base}/${d.file}`} target="_blank" rel="noreferrer" style={link}>📄 {tr(`out.${d.key}`)}</a>
          ))}
        </div>
      ) : null}
      <div style={{ marginTop: 6 }}>
        <button onClick={openDir} style={{ ...link, background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}>
          {tr('prod.openDir')}
        </button>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151' };
const link: React.CSSProperties = { color: '#2563eb', textDecoration: 'none', fontWeight: 600 };
const inp: React.CSSProperties = { width: '100%', height: 40, padding: '0 12px', border: '1px solid #ddd', borderRadius: 8, fontSize: 15, boxSizing: 'border-box', marginTop: 6 };
const hintP: React.CSSProperties = { fontSize: 12, color: '#9ca3af', margin: '8px 0 0' };
const pillHint: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 400, opacity: 0.8, marginTop: 2 };

function statusColor(s: TaskStatus) {
  return s === 'error' ? '#dc2626' : s === 'done' ? '#16a34a' : '#2563eb';
}

function langBtn(active: boolean): React.CSSProperties {
  return {
    padding: '4px 10px', fontSize: 12, borderRadius: 8, cursor: 'pointer',
    background: active ? '#2563eb' : '#fff', color: active ? '#fff' : '#374151',
    border: `1px solid ${active ? '#2563eb' : '#e5e7eb'}`,
  };
}

function pill(active: boolean): React.CSSProperties {
  return {
    flex: '1 1 auto', minWidth: 130, textAlign: 'left', padding: '8px 12px',
    background: active ? '#eff6ff' : '#fff', color: active ? '#1e40af' : '#374151',
    border: `1.5px solid ${active ? '#3b82f6' : '#e5e7eb'}`, borderRadius: 10,
    cursor: 'pointer', fontSize: 13,
  };
}

function btn(enabled: boolean, color = '#2563eb'): React.CSSProperties {
  return {
    height: 42, padding: '0 18px', background: enabled ? color : '#cbd5e1', color: '#fff',
    border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 600,
    cursor: enabled ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap',
  };
}

function smallBtn(enabled: boolean, color: string): React.CSSProperties {
  return {
    height: 30, padding: '0 12px', background: enabled ? color : '#cbd5e1', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: enabled ? 'pointer' : 'not-allowed',
  };
}

function card(bg: string, border: string): React.CSSProperties {
  return { background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: 16, marginTop: 8 };
}
