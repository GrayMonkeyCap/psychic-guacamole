import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Cloud, Database, FlaskConical, Gauge, GitFork, KeyRound, Link2, MousePointer2, Pause, Play, Plus, RotateCcw, Server, SkipForward, Star, Trash2, Undo2, X, Zap } from 'lucide-react';
import { CATALOG, CHAPTERS, EMPTY_DESIGN, EFFICIENCY_TARGET, LIMIT, STRATEGIES, MODEL_VERSION, SAVE_KEY, SAVE_VERSION, CONTRACT_RULES, connectionError, costOf, isCurrentResult, passedChapters, recordCertificate, report, restoreSave, tick, traceRequest, validate } from './levelModel';
import OutcomePicker from './OutcomePicker';
import { componentLabel, traceOutcome } from './trafficEvidence.js';
import LinkExperiment from './LinkExperiment.jsx';
import { createLinkExperiment } from './linkExperiment.js';
import { behaviorChanged, emptyEditHistory, rememberEdit, sameDesign, travelHistory } from './editorHistory.js';
import { Redo2 } from 'lucide-react';
import ConnectionPlanner from './ConnectionPlanner.jsx';
import { describeConnection } from './connectionGuidance.js';
import { contextualHelp } from './contextualHelp.js';
import SaveBackups from './SaveBackups.jsx';
import { readStoredProgress, RECOVERY_KEY } from './saveBackups.js';
import { createSaveSession, SAVE_LOCK } from './saveSession.js';
import SaveConflict from './SaveConflict.jsx';

const ICONS = { internet: Activity, api: Server, database: Database, cache: Zap, loadBalancer: GitFork, idGenerator: KeyRound, cdn: Cloud };
const round = n => Math.round(n || 0).toLocaleString();
const latencyLabel = n => n == null ? 'No completed requests' : `${n} ms`;
const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
const bounded = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const nameOf = node => node?.type === 'internet' ? 'Visitors' : CATALOG[node?.type]?.name || 'Component';
const readSave = () => { try {
  const raw = localStorage.getItem(SAVE_KEY);
  return { ...readStoredProgress({ getItem: key => key === SAVE_KEY ? raw : localStorage.getItem(key) }), raw };
} catch { return { save: null, available: false, recovered: false, raw: null }; } };

function useFocusDialog(ref, close) {
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.querySelector('button')?.focus();
    const key = e => {
      if (e.key === 'Escape') close();
      if (e.key !== 'Tab') return;
      const targets = ref.current?.querySelectorAll('button:not(:disabled), a[href], input, select');
      if (!targets?.length) return;
      if (e.shiftKey && document.activeElement === targets[0]) { e.preventDefault(); targets[targets.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === targets[targets.length - 1]) { e.preventDefault(); targets[0].focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); previous?.focus(); };
  }, [ref, close]);
}

function Briefing({ onClose }) {
  const ref = useRef(null);
  useFocusDialog(ref, onClose);
  return <div className="l1-shade"><section className="l1-dialog l1-welcome" ref={ref} role="dialog" aria-modal="true" aria-labelledby="welcome-title">
    <span className="l1-stamp"><Link2 size={30} /></span><small>YOUR FIRST SYSTEM · ABOUT 10–15 MINUTES</small>
    <h1 id="welcome-title">Small link.<br />Big responsibility.</h1>
    <p>The neighbourhood bakery needs a short link. Build the system behind it. Then find out what happens when everyone clicks.</p>
    <div className="l1-welcome-loop"><span><MousePointer2 />Build</span><ChevronRight /><span><Play />Send traffic</span><ChevronRight /><span><FlaskConical />Learn why</span></div>
    <p className="l1-muted">Three challenges. As many attempts as you like. Your architecture is yours to invent.</p>
    <button className="l1-primary" onClick={onClose}>Let’s build a link <ArrowRight size={18} /></button>
  </section></div>;
}

function Guide({ type, onClose }) {
  const ref = useRef(null), config = CATALOG[type], Icon = ICONS[type];
  useFocusDialog(ref, onClose);
  return <div className="l1-shade"><section className="l1-dialog" ref={ref} role="dialog" aria-modal="true" aria-labelledby="guide-title">
    <button className="l1-close" aria-label="Close component guide" onClick={onClose}><X size={20} /></button>
    <span className="l1-stamp" style={{ background: config.color }}><Icon size={30} /></span><small>COMPONENT FIELD GUIDE</small>
    <h2 id="guide-title">{config.name}</h2><p>{config.role}</p>
    <div className="l1-guide-flow">{type === 'cache' ? 'API → cache → API → database on a miss' : type === 'database' ? 'short code → stored mapping → destination' : type === 'idGenerator' ? 'API → allocate code → API → save mapping' : type === 'loadBalancer' ? 'one stream → balanced requests → API replicas' : type === 'cdn' ? 'visitor → edge hit, or forward to origin' : 'request → application logic → response'}</div>
    <h3>What changes in your system?</h3><p>{config.lesson}</p>
    <div className="l1-callout"><BookOpen size={18} /><span>{config.caution}</span></div>
    <button className="l1-primary" onClick={onClose}>Back to the board <ArrowRight size={17} /></button>
  </section></div>;
}

function TrafficLines({ design, metrics, running, traceStep, size }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !size.width) return;
    const ctx = canvas.getContext('2d'), dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr; canvas.height = size.height * dpr;
    ctx.scale(dpr, dpr);
    let frame;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const draw = time => {
      ctx.clearRect(0, 0, size.width, size.height);
      for (const edge of design.edges) {
        const from = design.nodes.find(n => n.id === edge.from), to = design.nodes.find(n => n.id === edge.to);
        if (!from || !to) continue;
        const a = { x: from.x / 100 * size.width + 138, y: from.y / 100 * size.height + 56 };
        const b = { x: to.x / 100 * size.width, y: to.y / 100 * size.height + 56 };
        const bend = Math.max(35, Math.abs(b.x - a.x) * .45);
        const p = t => { const u = 1 - t; return { x: u ** 3 * a.x + 3 * u * u * t * (a.x + bend) + 3 * u * t * t * (b.x - bend) + t ** 3 * b.x, y: u ** 3 * a.y + 3 * u * u * t * a.y + 3 * u * t * t * b.y + t ** 3 * b.y }; };
        const active = traceStep && ((traceStep.from === from.id && traceStep.node === to.id) || (traceStep.from === to.id && traceStep.node === from.id));
        const load = metrics?.edges?.[`${from.id}>${to.id}`];
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.bezierCurveTo(a.x + bend, a.y, b.x - bend, b.y, b.x, b.y);
        ctx.strokeStyle = active ? '#db9637' : load ? '#497d77' : '#8cae9f'; ctx.lineWidth = active ? 5 : 3; ctx.stroke();
        const mid = p(.65), before = p(.63), angle = Math.atan2(mid.y - before.y, mid.x - before.x);
        ctx.save(); ctx.translate(mid.x, mid.y); ctx.rotate(angle); ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(0, 0); ctx.lineTo(-6, 4); ctx.strokeStyle = '#42776d'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
        if ((running && load || active) && !reduced) {
          const amount = active ? 2 : Math.min(7, 2 + Math.floor((load.reads + load.writes) / 500));
          for (let i = 0; i < amount; i++) {
            const t = (time / 2200 + i / amount) % 1;
            const dot = p(traceStep?.reply && active ? 1 - t : t);
            ctx.fillStyle = active ? '#ffe387' : i / amount < load.reads / Math.max(1, load.reads + load.writes) ? '#247ea0' : '#d97a40';
            ctx.beginPath(); ctx.arc(dot.x, dot.y, 3.5, 0, Math.PI * 2); ctx.fill();
          }
          if (running && !active) { const dot = p(1 - (time / 2800) % 1); ctx.fillStyle = '#fffbed'; ctx.beginPath(); ctx.arc(dot.x, dot.y, 2.5, 0, Math.PI * 2); ctx.fill(); }
        }
      }
      if ((running || traceStep) && !reduced) frame = requestAnimationFrame(draw);
    };
    draw(performance.now());
    return () => cancelAnimationFrame(frame);
  }, [design, metrics, running, traceStep, size]);
  return <canvas className="l1-wires" ref={ref} aria-hidden="true" />;
}

function Plot({ frames = [], index, onScrub }) {
  return <div className="l1-plot" aria-label="Traffic test timeline">
    <div className="l1-bars">{frames.filter((_, i) => i % 2 === 0).map((f, i) => <i key={i} className={f.errorRate > CONTRACT_RULES.maxError || f.estimatedLatencyMs > CONTRACT_RULES.maxLatencyMs ? 'bad' : ''} style={{ height: `${Math.max(5, f.rps / 2400 * 100)}%`, opacity: index == null || i * 2 <= index ? 1 : .3 }} title={`${f.time.toFixed(1)}s · ${round(f.rps)} req/s · ${latencyLabel(f.estimatedLatencyMs)}`} />)}</div>
    {onScrub && <input type="range" min="0" max={Math.max(0, frames.length - 1)} value={index ?? frames.length - 1} onChange={e => onScrub(Number(e.target.value))} aria-label="Scrub traffic test" />}
  </div>;
}

export default function FirstLevel({ onExit, onLevelResult, forceTutorial = false }) {
  const [loaded] = useState(readSave);
  const [saveSession] = useState(() => createSaveSession({ getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value) }, loaded.raw,
    globalThis.navigator?.locks ? action => navigator.locks.request(SAVE_LOCK, action) : null));
  const saved = loaded.save;
  const [design, setDesign] = useState(saved?.design || EMPTY_DESIGN);
  const [chapterId, setChapterId] = useState(saved?.chapter || 0);
  const [unlocked, setUnlocked] = useState(saved?.unlocked || 0);
  const [history, setHistory] = useState(saved?.history || []);
  const [certificates, setCertificates] = useState(saved?.certificates || []);
  const [guided, setGuided] = useState(forceTutorial || saved?.guided !== false);
  const [welcome, setWelcome] = useState(forceTutorial || !saved);
  const [guide, setGuide] = useState(null);
  const [modelGuide, setModelGuide] = useState(false);
  const [experimentOpen, setExperimentOpen] = useState(false);
  const [experimentState, setExperimentState] = useState(createLinkExperiment);
  const [backupsOpen, setBackupsOpen] = useState(false);
  const [recovery, setRecovery] = useState(() => { try { return restoreSave(localStorage.getItem(RECOVERY_KEY)); } catch { return null; } });
  const [selected, setSelected] = useState('internet');
  const [wire, setWire] = useState(null);
  const [moveTarget, setMoveTarget] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [allTools, setAllTools] = useState(false);
  const [notice, setNotice] = useState(loaded.recovered ? 'Recovered your board from the last recovery copy. Download a backup to keep a separate copy.' : '');
  const [saveStatus, setSaveStatus] = useState({ status: 'saving' });
  const [savingRestore, setSavingRestore] = useState(false);
  const saveRevision = useRef(0);
  const [edits, setEdits] = useState(emptyEditHistory);
  const [sim, setSim] = useState({ running: false, paused: false, frames: [], report: null, suite: false });
  const [scrub, setScrub] = useState(null);
  const [trace, setTrace] = useState(null);
  const [traceKind, setTraceKind] = useState('read');
  const [traceHot, setTraceHot] = useState(false);
  const [helpSteps, setHelpSteps] = useState({});
  const [size, setSize] = useState({ width: 800, height: 560 });
  const board = useRef(null), drag = useRef(null), suppressClick = useRef(false), timerState = useRef(null), priorState = useRef(null);
  const chapter = CHAPTERS[chapterId], validation = useMemo(() => validate(design), [design]);
  const cost = costOf(design.nodes);
  const node = design.nodes.find(n => n.id === selected);
  const metrics = sim.frames[scrub ?? sim.frames.length - 1];
  const traceStep = trace?.steps[trace.index];
  const help = contextualHelp(design, chapter, sim.report, sim.report ? sim.frames[sim.report.worstIndex] : metrics);
  const helpStep = helpSteps[help.key] ?? -1;
  const currentPasses = passedChapters(certificates, design);
  const certified = currentPasses.every(Boolean);
  const previousResult = history.filter(h => h.chapter === chapterId && isCurrentResult(h)).at(-2);
  const outdatedResults = certificates.some(c => !isCurrentResult(c));
  const closeWelcome = useCallback(() => setWelcome(false), []);
  const closeGuide = useCallback(() => setGuide(null), []);
  const closeModelGuide = useCallback(() => setModelGuide(false), []);
  const closeExperiment = useCallback(() => setExperimentOpen(false), []);
  const closeBackups = useCallback(() => setBackupsOpen(false), []);
  const currentSave = { version: SAVE_VERSION, design, chapter: chapterId, unlocked, guided, history, certificates };
  async function retrySave() {
    const revision = ++saveRevision.current;
    setSaveStatus({ status: 'saving' });
    const result = await saveSession.write(currentSave);
    if (revision !== saveRevision.current) return;
    setSaveStatus(result);
    if (result.status === 'saved' && result.recovery) setRecovery(result.recovery);
  }
  async function restoreBackup(next, options) {
    setSavingRestore(true);
    const revision = ++saveRevision.current;
    const snapshot = options || saveSession.inspect();
    const result = await saveSession.write(next, { expectedRaw: snapshot.raw, recovery: snapshot.keepLocal ? snapshot.save : currentSave });
    setSavingRestore(false);
    if (revision !== saveRevision.current) return { error: 'The save changed during restore. Review it again.' };
    setSaveStatus(result);
    if (result.status !== 'saved') return { error: result.status === 'conflict' ? 'The browser save changed again. Nothing was replaced. Review the latest copy below.' : 'Could not safely store the recovery copy and restored board. Nothing was replaced; download a backup and retry when storage is available.' };
    if (result.recovery) setRecovery(result.recovery);
    if (snapshot.keepLocal) return {};
    setDesign(next.design); setChapterId(next.chapter); setUnlocked(next.unlocked); setGuided(next.guided);
    setHistory(next.history); setCertificates(next.certificates); setEdits(emptyEditHistory());
    setExperimentState(createLinkExperiment()); setHelpSteps({});
    setSelected('internet'); setSelectedEdge(null); setTrace(null); setScrub(null); setWire(null); setMoveTarget(null);
    timerState.current = null; priorState.current = null;
    setSim({ running: false, paused: false, frames: [], report: null, suite: false });
    return {};
  }

  useEffect(() => {
    if (certified) onLevelResult({ stars: cost <= EFFICIENCY_TARGET ? 3 : 2 });
    else if (certificates.some(r => r.chapter === 0)) onLevelResult({ stars: 1 });
  }, [certified, cost, certificates, onLevelResult]);

  useEffect(() => {
    const revision = ++saveRevision.current;
    setSaveStatus(previous => previous.status === 'conflict' ? previous : { status: 'saving' });
    saveSession.write({ version: SAVE_VERSION, design, chapter: chapterId, unlocked, guided, history, certificates }).then(result => {
      if (revision !== saveRevision.current) return;
      setSaveStatus(result);
      if (result.status === 'saved' && result.recovery) setRecovery(result.recovery);
    });
  }, [design, chapterId, unlocked, guided, history, certificates, saveSession]);
  useEffect(() => {
    const changed = event => {
      if (event.key !== SAVE_KEY && event.key !== null) return;
      const result = saveSession.inspect();
      if (result.status !== 'saved') { ++saveRevision.current; setSaveStatus(result); }
    };
    window.addEventListener('storage', changed);
    return () => window.removeEventListener('storage', changed);
  }, [saveSession]);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    if (board.current) observer.observe(board.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => { if (notice) { const id = setTimeout(() => setNotice(''), 6000); return () => clearTimeout(id); } }, [notice]);

  const applyDesign = useCallback(next => {
    if (behaviorChanged(design, next)) {
      setTrace(null); setScrub(null); setSelectedEdge(null); setWire(null); setMoveTarget(null);
      setSim({ running: false, paused: false, frames: [], report: null, suite: false });
    }
    setDesign(next);
    setSelected(id => next.nodes.some(n => n.id === id) ? id : 'internet');
  }, [design]);
  const change = useCallback(next => {
    if (sim.running || sameDesign(design, next)) return;
    setEdits(current => rememberEdit(current, design, next));
    applyDesign(next);
  }, [design, sim.running, applyDesign]);
  const travel = useCallback(direction => {
    if (sim.running) return;
    const result = travelHistory(edits, design, direction);
    if (result.design === design) return;
    setEdits(result.history); applyDesign(result.design);
  }, [sim.running, edits, design, applyDesign]);
  const undo = useCallback(() => travel('undo'), [travel]);
  const redo = useCallback(() => travel('redo'), [travel]);
  const remove = useCallback(id => {
    if (id === 'internet') return;
    change({ nodes: design.nodes.filter(n => n.id !== id), edges: design.edges.filter(e => e.from !== id && e.to !== id) }); setSelected('internet'); setWire(null);
  }, [design, change]);
  const connect = useCallback(id => {
    if (!wire || sim.running) return;
    const error = connectionError(design, wire, id);
    if (error) { setNotice(error); return; }
    change({ ...design, edges: [...design.edges, { id: uid(), from: wire, to: id }] }); setWire(null); setSelected(id);
  }, [wire, sim.running, design, change]);
  useEffect(() => {
    const key = e => {
      if (welcome || guide || modelGuide || experimentOpen || backupsOpen || e.target.isContentEditable || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.key === 'Escape') { setWire(null); setMoveTarget(null); setTrace(null); setSelectedEdge(null); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      if (e.ctrlKey && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
      if (e.key === 'Delete' && !sim.running) {
        const face = e.target.closest('.l1-node-face'), edge = e.target.closest('.l1-edge-tag');
        if (face) { e.preventDefault(); remove(face.dataset.nodeId); }
        else if (edge) { e.preventDefault(); change({ ...design, edges: design.edges.filter(item => item.id !== edge.dataset.edgeId) }); }
      }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [welcome, guide, modelGuide, experimentOpen, backupsOpen, undo, redo, remove, sim.running, change, design]);

  useEffect(() => {
    if (!sim.running || sim.paused) return;
    const interval = setInterval(() => {
      const run = timerState.current;
      if (!run) return;
      run.step += 1;
      const time = run.step / 5;
      const frame = tick(run.design, CHAPTERS[run.chapter], time, priorState.current);
      priorState.current = frame; run.frames.push(frame);
      if (run.step >= CHAPTERS[run.chapter].duration * 5) {
        const result = report(run.design, CHAPTERS[run.chapter], run.frames);
        const { frames, ...summary } = result;
        setHistory(h => [...h.slice(-11), summary]);
        setCertificates(c => recordCertificate(c, summary));
        if (result.passed) setUnlocked(u => Math.max(u, Math.min(2, run.chapter + 1)));
        if (run.suite && result.passed && run.chapter < 2) {
          run.chapter += 1; run.step = 0; run.frames = []; priorState.current = null;
          setChapterId(run.chapter); setSim({ running: true, paused: false, frames: [], report: null, suite: true });
        } else {
          timerState.current = null;
          setSim({ running: false, paused: false, frames: [...run.frames], report: result, suite: run.suite });
          if (run.suite && result.passed && run.chapter === 2) onLevelResult({ stars: costOf(run.design.nodes) <= EFFICIENCY_TARGET ? 3 : 2 });
        }
      } else setSim(s => ({ ...s, frames: [...run.frames] }));
    }, 200);
    return () => clearInterval(interval);
  }, [sim.running, sim.paused, onLevelResult]);

  function start(suite = false) {
    if (sim.running) return;
    if (!validation.valid) { setNotice(validation.issues[0].text); setSelected(validation.issues[0].node); return; }
    if (cost > LIMIT) { setNotice(`Your design is $${cost - LIMIT} over budget. Choose smaller tiers or remove unused components.`); return; }
    const id = suite ? 0 : chapterId;
    timerState.current = { step: 0, chapter: id, frames: [], design, suite }; priorState.current = null;
    setChapterId(id); setWire(null); setMoveTarget(null); setTrace(null); setScrub(null);
    setSim({ running: true, paused: false, frames: [], report: null, suite });
  }
  function add(type, point) {
    if (sim.running) return;
    if (design.nodes.length >= 16) { setNotice('This first-level board supports 15 components. Remove or upgrade one to make room.'); return; }
    const slots = [{ x: 37, y: 43 }, { x: 69, y: 43 }, { x: 69, y: 12 }, { x: 37, y: 12 }, { x: 69, y: 73 }, { x: 37, y: 73 }, { x: 7, y: 12 }, { x: 7, y: 73 }];
    const slot = point || slots.find(p => !design.nodes.some(n => Math.abs(n.x - p.x) < 15 && Math.abs(n.y - p.y) < 18)) || { x: 45, y: 30 };
    const id = uid();
    change({ ...design, nodes: [...design.nodes, { id, type, x: slot.x, y: slot.y, tier: 0, ...(type === 'api' ? { strategy: 'sequence' } : {}) }] }); setSelected(id);
  }
  function edit(patch) { change({ ...design, nodes: design.nodes.map(n => n.id === selected ? { ...n, ...patch } : n) }); }
  function switchChapter(id) {
    if (sim.running) return;
    setChapterId(id); setScrub(null); setTrace(null); setMoveTarget(null);
    setSim({ running: false, paused: false, frames: [], report: null, suite: false });
  }
  function startTrace() {
    setTrace({ steps: traceRequest(design, traceKind, traceHot), index: 0 }); setWire(null); setSelectedEdge(null);
  }
  function inspectOutcome(index) {
    if (!metrics || sim.running && !sim.paused) return;
    const outcome = metrics.outcomes[index], steps = traceOutcome(design, outcome);
    if (!steps.length) { setNotice('Recorded path unavailable for this sample. Run traffic again.'); return; }
    setTraceKind(outcome.kind); setWire(null); setSelectedEdge(null);
    setTrace({ source: 'recorded', steps, index: 0, time: metrics.time, rate: outcome.rate });
  }
  function beginDrag(e, n) {
    if (sim.running || moveTarget || n.type === 'internet' || e.button !== 0 || e.target.closest('.l1-port')) return;
    suppressClick.current = false;
    (e.target.closest('.l1-node-face') || e.currentTarget).setPointerCapture(e.pointerId);
    drag.current = { id: n.id, startX: e.clientX, startY: e.clientY, x: n.x, y: n.y, before: design, moved: false };
  }
  function moveDrag(e) {
    const d = drag.current;
    if (!d) return;
    if (Math.abs(e.clientX - d.startX) + Math.abs(e.clientY - d.startY) < 4) return;
    d.moved = true;
    const x = bounded(d.x + (e.clientX - d.startX) / size.width * 100, 2, Math.min(82, (size.width - 152) / size.width * 100));
    const y = bounded(d.y + (e.clientY - d.startY) / size.height * 100, 8, Math.min(78, (size.height - 128) / size.height * 100));
    setDesign(prev => ({ ...prev, nodes: prev.nodes.map(n => n.id === d.id ? { ...n, x, y } : n) }));
  }
  function endDrag() {
    const completed = drag.current;
    if (completed?.moved) { setEdits(prev => rememberEdit(prev, completed.before, design)); suppressClick.current = true; }
    drag.current = null;
  }
  function placeSelected(e) {
    if (!moveTarget || sim.running || e.target.closest('button, .l1-node, .l1-wire-coach')) return;
    const rect = board.current.getBoundingClientRect();
    const x = bounded((e.clientX - rect.left - 69) / size.width * 100, 2, Math.min(82, (size.width - 152) / size.width * 100));
    const y = bounded((e.clientY - rect.top - 56) / size.height * 100, 8, Math.min(78, (size.height - 128) / size.height * 100));
    change({ ...design, nodes: design.nodes.map(n => n.id === moveTarget ? { ...n, x, y } : n) });
    setMoveTarget(null); setNotice('Component moved. Undo restores its previous position.');
  }
  const coachText = !validation.valid ? `${help.question} Use “Give me a nudge” for the specific evidence.` : !sim.frames.length ? 'Your connections satisfy the functional contract. Try a mapping or send traffic to test capacity.' : 'Select a component to see its load. Pause traffic to inspect recorded outcomes.';

  return <div className="l1-shell factory-game-shell">
    <header className="factory-hud-top l1-header">
      <button className="factory-back" onClick={onExit} disabled={sim.running}><ArrowLeft size={17} /><span><small>SYSTEM SANDBOX / 01</small><strong>The little link</strong></span></button>
      <nav className="l1-chapters" aria-label="Level challenges">{CHAPTERS.map(c => <button key={c.id} disabled={sim.running || c.id > unlocked} aria-label={`${c.name} · ${currentPasses[c.id] ? 'Passed for this design' : c.id > unlocked ? 'Not yet unlocked' : 'Not yet passed for this design'}`} aria-current={chapterId === c.id ? 'step' : undefined} className={chapterId === c.id ? 'active' : ''} onClick={() => switchChapter(c.id)}><b>{currentPasses[c.id] ? <Check size={16} /> : `0${c.id + 1}`}</b><span><small>{c.tagline}</small><strong>{c.name}</strong></span></button>)}</nav>
      <div className={`factory-budget ${cost > LIMIT ? 'is-over' : ''}`}><span><small>MONTHLY BUDGET</small><strong>${cost}<i> / ${LIMIT}</i></strong></span><div className="l1-budget-ring" style={{ '--spent': `${Math.min(100, cost / LIMIT * 100)}%` }}><span>$</span></div></div>
    </header>

    <main className="l1-layout">
      <aside className="l1-mission l1-paper">
        <div className="l1-eyebrow"><span className="l1-live-dot" /> CONTRACT 001</div>
        <h1>{chapterId === 0 ? <>A link worth<br />remembering.</> : chapterId === 1 ? <>Everyone wants<br />a little piece.</> : <>New links.<br />New pressure.</>}</h1>
        <p>{chapter.brief}</p>
        <div className="l1-link-example"><small>BAKERY.EXAMPLE/MENU</small><ArrowRight size={13} /><strong>lnk / bakery</strong></div>
        <div className="l1-contract"><small>YOUR SYSTEM MUST</small>{['Answer the request', 'Remember the mapping', 'Create a unique code'].map((label, i) => <div key={label} className={validation.capabilities[i] ? 'complete' : ''}><span>{validation.capabilities[i] ? <Check size={12} /> : i + 1}</span>{label}</div>)}</div>
        <div className="l1-forecast"><small>TRAFFIC FORECAST</small><div><strong>{round(chapter.peak)}</strong><span>requests / sec</span></div><div className="l1-mix"><i style={{ width: `${chapter.reads * 100}%` }} /></div><span><i className="l1-dot read" />{Math.round(chapter.reads * 100)}% redirects <i className="l1-dot write" />{Math.round((1 - chapter.reads) * 100)}% creations</span>{chapterId === 1 && <b>92% of reads visit one hot link.</b>}</div>
        <div className="l1-rules"><span>Success / sample <b>≥ {100 - CONTRACT_RULES.maxError}%</b></span><span>Est. latency <b>≤ {CONTRACT_RULES.maxLatencyMs} ms</b></span><span>Monthly cost <b>≤ ${LIMIT}</b></span></div>
        <button className="l1-text-button" onClick={() => setModelGuide(true)}><FlaskConical size={15} /> How tests are measured</button>
        <button className="l1-guide-button" disabled={sim.running && !sim.paused} onClick={() => setExperimentOpen(true)}><Link2 size={16} /> Try creating a real mapping <ChevronRight size={14} /></button>
        <button className="l1-text-button" disabled={helpStep === 2} onClick={() => setHelpSteps(steps => ({ ...steps, [help.key]: Math.min(2, helpStep + 1) }))}><BookOpen size={15} />{helpStep < 0 ? 'Give me a nudge' : helpStep === 0 ? 'Show the evidence' : helpStep === 1 ? 'Suggest an experiment' : 'All hints shown'}</button>
        {helpStep >= 0 && <section className="l1-help-ladder" aria-label="Contextual help"><strong>{help.question}</strong>{helpStep >= 1 && <p>{help.evidence}</p>}{helpStep >= 2 && <p>{help.experiment}</p>}{helpStep >= 1 && help.node && <button className="l1-text-button" onClick={() => { setSelected(help.node); setSelectedEdge(null); setTrace(null); setWire(null); if (sim.report) setScrub(sim.report.worstIndex); }}>Inspect the evidence</button>}<button className="l1-text-button" onClick={() => setHelpSteps(steps => ({ ...steps, [help.key]: -1 }))}>Dismiss help</button></section>}
        <div className="l1-mission-foot"><FlaskConical size={15} /><span>Same traffic every retry.<br />Make a change. Compare the result.</span></div>
      </aside>

      <section className="l1-workspace">
        <div className="l1-board-toolbar"><span><span className="l1-live-dot" />{sim.running ? sim.paused ? 'TRAFFIC PAUSED' : 'LIVE TRAFFIC' : trace ? 'FOLLOW ONE REQUEST' : sim.report ? 'TEST RECORDING' : 'YOUR ARCHITECTURE'}</span><div><button onClick={undo} disabled={!edits.past.length || sim.running} title="Undo · Ctrl Z" aria-label="Undo last edit"><Undo2 size={16} /></button><button onClick={redo} disabled={!edits.future.length || sim.running} title="Redo · Ctrl Shift Z / Ctrl Y" aria-label="Redo last edit"><Redo2 size={16} /></button><button onClick={() => setGuided(g => !g)} className={guided ? 'enabled' : ''} aria-pressed={guided} title="Toggle coach"><BookOpen size={16} /></button></div></div>
        <div className="l1-board-scroll"><div className={`l1-board ${wire ? 'wiring' : ''} ${moveTarget ? 'placing' : ''}`} ref={board} onClick={placeSelected} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const type = e.dataTransfer.getData('text/plain'); if (!CATALOG[type]) return; const rect = board.current.getBoundingClientRect(); add(type, { x: bounded((e.clientX - rect.left - 69) / size.width * 100, 2, Math.min(80, (size.width - 150) / size.width * 100)), y: bounded((e.clientY - rect.top - 56) / size.height * 100, 8, 75) }); }}>
          <span className="l1-board-label">A SMALL SYSTEM. ROOM TO GROW.</span><div className="l1-legend"><span><i className="l1-dot read" />Read</span><span><i className="l1-dot write" />Write</span><span><i className="l1-dot reply" />Reply</span></div>
          <TrafficLines design={design} metrics={metrics} running={sim.running && !sim.paused} traceStep={traceStep} size={size} />
          {design.edges.map(edge => {
            const from = design.nodes.find(n => n.id === edge.from), to = design.nodes.find(n => n.id === edge.to);
            const edgeMetric = metrics?.edges[`${edge.from}>${edge.to}`];
            return <button key={edge.id} data-edge-id={edge.id} className={`l1-edge-tag ${selectedEdge === edge.id ? 'selected' : ''}`} style={{ left: `calc(${(from.x + to.x) / 2}% + 69px)`, top: `calc(${(from.y + to.y) / 2}% + 56px)` }} aria-label={`Inspect connection from ${nameOf(from)} to ${nameOf(to)}`} onClick={() => { setSelectedEdge(edge.id); setTrace(null); }}>
              {edgeMetric ? `${round(edgeMetric.reads + edgeMetric.writes)}/s` : to.type === 'database' ? 'lookup / save' : to.type === 'cache' ? 'lookup / fill' : to.type === 'idGenerator' ? 'allocate' : 'HTTP'}<span>↔</span></button>;
          })}
          {design.nodes.map(n => {
            const config = CATALOG[n.type], Icon = ICONS[n.type], load = metrics?.loads[n.id];
            const active = traceStep?.node === n.id, isSelected = selected === n.id;
            const canReceive = wire && !connectionError(design, wire, n.id);
            return <div key={n.id} className={`l1-node ${isSelected ? 'selected' : ''} ${active ? 'trace-active' : ''} ${load?.ratio > 1 ? 'overloaded' : ''} ${wire === n.id ? 'calling' : ''} ${canReceive ? 'can-receive' : ''} shape-${n.type}`} style={{ left: `${n.x}%`, top: `${n.y}%`, '--component': config?.color || '#718e8d' }} onPointerDown={e => beginDrag(e, n)}>
              <button className="l1-node-face" data-node-id={n.id} onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } wire ? connect(n.id) : setSelected(n.id); }} onKeyDown={e => { if (sim.running || n.type === 'internet' || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return; e.preventDefault(); change({ ...design, nodes: design.nodes.map(item => item.id === n.id ? { ...item, x: bounded(item.x + (e.key === 'ArrowRight' ? 2 : e.key === 'ArrowLeft' ? -2 : 0), 2, 78), y: bounded(item.y + (e.key === 'ArrowDown' ? 2 : e.key === 'ArrowUp' ? -2 : 0), 8, 75) } : item) }); }} aria-label={`Inspect ${nameOf(n)}`}><span className="l1-node-head"><Icon size={25} strokeWidth={1.7} /><span><strong>{config?.short || 'Visitors'}</strong><small>{n.type === 'api' ? STRATEGIES[n.strategy || 'sequence'].short : config?.tiers[n.tier].name || 'The outside world'}</small></span></span><span className="l1-node-readout"><b>{load ? `${round(load.ratio * 100)}%` : n.type === 'internet' ? metrics ? `${round(metrics.rps)}/s` : '100/s' : 'Ready'}</b><small>{load?.rejected ? `${round(load.rejected)} rejected/s` : load ? `${round(load.rate)} ops/s` : config?.verb || 'shorten + redirect'}</small></span><span className="l1-load-track"><i style={{ width: `${Math.min(100, (load?.ratio || 0) * 100)}%` }} /></span></button>
              {n.type !== 'internet' && <button className="l1-port receive" aria-label={`Connect to ${nameOf(n)}`} title={wire && describeConnection(design, wire, n.id).valid ? describeConnection(design, wire, n.id).request : 'Called by another service'} disabled={!wire || sim.running} onClick={() => connect(n.id)} />}
              {['internet', 'api', 'loadBalancer', 'cdn'].includes(n.type) && <button className="l1-port call" aria-label={`Start call from ${nameOf(n)}`} title="Calls another service · replies automatically" disabled={sim.running} onClick={() => { setMoveTarget(null); setWire(w => w === n.id ? null : n.id); setSelected(n.id); setTrace(null); }}><Plus size={10} /></button>}
            </div>;
          })}
          {design.nodes.length === 1 && <div className="l1-empty"><div className="l1-empty-symbol"><Server /><span>+</span><Database /></div><strong>Every system starts somewhere.</strong><span>Add an API and storage from the workbench.<br />You decide how they work together.</span></div>}
          {wire && <div className="l1-wire-coach"><span><b>{nameOf(design.nodes.find(n => n.id === wire))} calls…</b> Choose a highlighted component. Replies come back automatically.</span><button aria-label="Cancel connection" onClick={() => setWire(null)}><X size={16} /></button></div>}
          {moveTarget && <div className="l1-wire-coach"><span><b>Move {componentLabel(design, moveTarget)}</b> · Click or tap an empty spot. Escape cancels. No dragging needed.</span><button aria-label="Cancel move" onClick={() => setMoveTarget(null)}><X size={16} /></button></div>}
          {!wire && !moveTarget && guided && chapterId === 0 && !trace && !sim.report && <div className="l1-coach"><span>✦</span><p>{coachText}</p><button onClick={() => setGuided(false)} aria-label="Dismiss coach"><X size={14} /></button></div>}
          {trace && <div className="l1-trace-caption"><b>{trace.index + 1} / {trace.steps.length}</b><span>{traceStep.title}</span><button disabled={trace.index === trace.steps.length - 1} onClick={() => setTrace(t => ({ ...t, index: t.index + 1 }))}>Next <ArrowRight size={15} /></button></div>}
        </div></div>

        <div className="l1-workbench"><div className="l1-workbench-heading"><span>COMPONENT WORKBENCH</span><button onClick={() => setAllTools(v => !v)}>{allTools ? 'Focus tools' : 'Show all tools'}</button></div><div className="l1-tools">{Object.entries(CATALOG).filter(([type]) => allTools || ['api', 'database'].includes(type) || chapterId >= 1 && ['cache', 'loadBalancer', 'cdn'].includes(type) || chapterId >= 2).map(([type, config]) => {
          const Icon = ICONS[type];
          return <button key={type} draggable={!sim.running} disabled={sim.running} onDragStart={e => e.dataTransfer.setData('text/plain', type)} onClick={() => add(type)} aria-label={`Add ${config.name}`} style={{ '--component': config.color }}><span><Icon size={23} /><Plus size={12} /></span><strong>{config.short}</strong><small>${config.tiers[0].cost}/mo</small></button>;
        })}</div></div>
      </section>

      <aside className="l1-inspector l1-paper">
        <div className="l1-eyebrow">{trace ? 'REQUEST INSPECTOR' : selectedEdge ? 'CONNECTION INSPECTOR' : 'COMPONENT INSPECTOR'}</div>
        {wire ? <ConnectionPlanner key={wire} design={design} from={wire} onConnect={connect} onCancel={() => setWire(null)} /> : trace ? <>
          <div className="l1-inspector-heading"><h2>{trace.source === 'recorded' ? traceKind === 'read' ? 'Recorded redirects' : 'Recorded creations' : traceKind === 'read' ? 'Follow a redirect' : 'Create a link'}</h2><button className="l1-text-button" onClick={() => setTrace(null)} aria-label="Close request trace"><X size={18} /></button></div>
          <p className="l1-muted">{trace.source === 'recorded' ? `${trace.time.toFixed(1)}s sample · ≈ ${trace.rate.toLocaleString(undefined, { maximumFractionDigits: 1 })} requests/sec. Calls and outcomes come from this run; reply steps explain the synchronous return path. This is a request group, not an individual capture.` : 'One illustrative request through your architecture, not evidence from a traffic run. Click any step to follow the conversation.'}</p>
          <ol className="l1-trace-steps">{trace.steps.map((step, i) => <li key={i}><button className={i === trace.index ? 'active' : ''} onClick={() => setTrace(t => ({ ...t, index: i }))}><b>{i < trace.index ? <Check size={12} /> : i + 1}</b><span>{step.title}<small>{componentLabel(design, step.node)}</small></span></button></li>)}</ol>
          <div className="l1-trace-detail"><strong>{traceStep.title}</strong><p>{traceStep.detail}</p></div>
        </> : selectedEdge ? (() => { const edge = design.edges.find(e => e.id === selectedEdge); return edge && <><h2>One call. Two directions.</h2><p>{nameOf(design.nodes.find(n => n.id === edge.from))} calls {nameOf(design.nodes.find(n => n.id === edge.to))}. The result returns on the same connection.</p><div className="l1-callout">→ request<br />← response</div><p className="l1-muted">A reverse wire would mean a different service call, not a reply.</p><button className="l1-danger-button" disabled={sim.running} onClick={() => { change({ ...design, edges: design.edges.filter(e => e.id !== selectedEdge) }); setSelectedEdge(null); }}><Trash2 size={15} /> Disconnect call</button><button className="l1-text-button" onClick={() => setSelectedEdge(null)}>Back to component</button></>; })() : node && CATALOG[node.type] ? (() => {
          const config = CATALOG[node.type], Icon = ICONS[node.type], load = metrics?.loads[node.id];
          return <><div className="l1-inspector-heading"><span className="l1-inspector-icon" style={{ background: config.color }}><Icon size={24} /></span><div><h2>{config.name}</h2><small>{config.verb}</small></div></div><p>{config.role}</p>
            <button className="l1-guide-button" onClick={() => setGuide(node.type)}><BookOpen size={15} /> How this component works <ChevronRight size={14} /></button>
            <button className="l1-guide-button" disabled={sim.running} onClick={() => { setMoveTarget(node.id); setWire(null); }}><MousePointer2 size={15} /> Move without dragging</button>
            <div className="l1-section-label">CAPACITY <span>GAME UNITS</span></div><div className="l1-tiers">{config.tiers.map((tier, i) => <button disabled={sim.running} key={i} className={node.tier === i ? 'active' : ''} onClick={() => edit({ tier: i })}><strong>{tier.name}</strong><b>${tier.cost}</b><small>{round(tier.capacity)} {node.type === 'database' ? 'reads/s' : 'ops/s'}</small>{tier.writes && <small>{round(tier.writes)} writes/s</small>}</button>)}</div>
            {node.type === 'api' && <div className="l1-strategy"><label htmlFor="code-strategy">SHORT CODE STRATEGY</label><select id="code-strategy" value={node.strategy || 'sequence'} onChange={e => edit({ strategy: e.target.value })} disabled={sim.running}>{Object.entries(STRATEGIES).map(([key, p]) => <option value={key} key={key}>{p.name}</option>)}</select><p>{STRATEGIES[node.strategy || 'sequence'].description}</p></div>}
            {load && <><div className="l1-node-telemetry"><span>Read work offered <b>{round(load.reads)}/s</b></span><span>Write work offered <b>{round(load.writes)}/s</b></span><span>Requests admitted <b>{round(load.admitted)}/s</b></span><span>Rejected here <b>{round(load.rejected)}/s</b></span>{['cache', 'cdn'].includes(node.type) && <><span>Served from memory <b>{round(load.hits)}/s</b></span><span>Successful fills <b>{round(load.fills)}/s</b></span><span>Skipped optional fills <b>{round(load.skippedFills)}/s</b></span></>}</div>{load.rejected > 0 && <div className="l1-small-warning">{round(metrics.outcomes.filter(o => o.blockedBy === node.id && o.kind === 'read').reduce((n, o) => n + o.rate, 0))} redirects/s and {round(metrics.outcomes.filter(o => o.blockedBy === node.id && o.kind === 'write').reduce((n, o) => n + o.rate, 0))} creations/s stopped here. They made no further dependency calls.</div>}</>}
            {!validation.reachable.has(node.id) && <div className="l1-small-warning">Unconnected: costs money, serves no traffic.</div>}
            {node.type === 'idGenerator' && !design.nodes.some(n => n.type === 'api' && n.strategy === 'service' && design.edges.some(e => e.from === n.id && e.to === node.id)) && <div className="l1-small-warning">Unused: connect an API and select its ID service strategy.</div>}
            <button className="l1-danger-button" disabled={sim.running} onClick={() => remove(node.id)}><Trash2 size={14} /> Remove component</button>
          </>;
        })() : <><span className="l1-inspector-illustration"><MousePointer2 size={36} /></span><h2>A system you can explain.</h2><p>Select a component to see its job, tune its capacity, and understand its tradeoffs.</p><div className="l1-callout"><Link2 size={17} /><span>Choose a round <b>+</b> connector, then the service it calls. One wire carries the request and its reply.</span></div><p className="l1-muted">Drag a component to arrange your board. Arrow keys move a focused component. Click a wire label to disconnect it. Undo and redo work while building. Delete only removes the focused component or connection.</p></>}
        {!trace && metrics && (!sim.running || sim.paused) && <OutcomePicker frame={metrics} design={design} onSelect={inspectOutcome} />}
        {!trace && sim.running && !sim.paused && <p className="l1-muted">Pause traffic to inspect recorded paths, or wait for the test to finish.</p>}
        {!trace && <div className="l1-trace-launch"><div className="l1-section-label">ILLUSTRATIVE WALKTHROUGH</div><div className="l1-segment"><button onClick={() => setTraceKind('read')} className={traceKind === 'read' ? 'active' : ''}>Redirect</button><button onClick={() => setTraceKind('write')} className={traceKind === 'write' ? 'active' : ''}>Create link</button></div>{traceKind === 'read' && <label className="l1-check"><input type="checkbox" checked={traceHot} onChange={e => setTraceHot(e.target.checked)} /> Assume a warm cached entry</label>}<button className="l1-trace-button" disabled={sim.running} onClick={startTrace}><RouteIcon /> Follow one request <ArrowRight size={15} /></button></div>}
        {metrics?.accounting && <div className="l1-accounting" aria-label="Request accounting for selected sample"><div className="l1-section-label">THIS SAMPLE · ESTIMATED REQ/S</div><div><span>Incoming</span><b>{round(metrics.rps)}</b></div><div><span>Completed</span><b>{round(metrics.accounting.completed / .2)}</b></div><div><span>Rejected</span><b>{round(metrics.accounting.rejected / .2)}</b></div><p>Every request completes or is rejected. This level has no waiting queue or retries.</p></div>}
        <div className="l1-save-note" role="status">{saveStatus.status === 'conflict' ? 'Autosave paused: the browser copy changed or is unsupported. Your open board is safe here. Open backups to compare and choose.' : saveStatus.status === 'saved' ? 'Design and earned passes saved on this device.' : saveStatus.status === 'saving' ? 'Saving your design…' : 'Unsaved: browser storage or safe cross-tab locking is unavailable. Keep this tab open and download a backup.'}{outdatedResults && <p>Earlier-rule passes are kept. Retest to certify this design under the current rules.</p>}</div>
        {saveStatus.status === 'unavailable' && <button className="l1-guide-button" onClick={retrySave}>Retry saving</button>}
        <button className="l1-guide-button" disabled={sim.running} onClick={() => setBackupsOpen(true)}>Save backups & restore <ChevronRight size={15} /></button>
      </aside>
    </main>

    {sim.report && <section className={`l1-postmortem ${sim.report.passed ? 'passed' : 'failed'}`} aria-label="Traffic test results"><div className="l1-result-title"><span>{sim.report.passed ? <Check size={23} /> : <Activity size={23} />}</span><div><small>{sim.report.passed ? 'CHALLENGE PASSED' : 'A USEFUL FAILURE'}</small><strong>{sim.report.passed ? certified ? 'Every challenge, one design.' : 'Your link held up.' : 'Now you know where it hurts.'}</strong></div></div><div className="l1-result-explanation"><p>{sim.report.reason}</p><small>Worst success: {(100 - sim.report.maxError).toFixed(1)}% · Highest estimated latency: {latencyLabel(sim.report.estimatedLatencyMs)} · ${sim.report.cost}/mo</small>{!sim.report.passed && <button className="l1-text-button" onClick={() => { setSelected(sim.report.bottleneck); setSelectedEdge(null); setTrace(null); }}>{sim.report.alternatives}</button>}{previousResult && <small>Previous attempt: ${previousResult.cost} · {latencyLabel(previousResult.estimatedLatencyMs)}. This attempt: ${sim.report.cost} · {sim.report.estimatedLatencyMs} ms.</small>}</div><div className="l1-result-actions">{!sim.report.passed ? <button className="l1-primary" onClick={() => { setSelected(sim.report.bottleneck); setSelectedEdge(null); setTrace(null); setScrub(sim.report.worstIndex); }}>Inspect bottleneck <Gauge size={17} /></button> : chapterId < 2 ? <button className="l1-primary" onClick={() => switchChapter(chapterId + 1)}>Next challenge <ArrowRight size={17} /></button> : <button className="l1-primary" onClick={() => start(true)}>{certified ? 'Replay the full contract' : 'Test all three'}<Play size={16} /></button>}<small>{certified ? `★ Solved ${cost <= EFFICIENCY_TARGET ? '★ Efficient' : `· Try under $${EFFICIENCY_TARGET}`} · Keep experimenting` : 'Edits keep challenges unlocked; retest to certify your new design.'}</small></div></section>}

    <footer className="l1-controls">
      <div className="l1-system-state"><span className={`l1-status-orb ${metrics && (metrics.errorRate > CONTRACT_RULES.maxError || metrics.estimatedLatencyMs > CONTRACT_RULES.maxLatencyMs) ? 'danger' : sim.running ? 'live' : ''}`} /><div><small>{sim.running ? sim.suite ? 'FULL CONTRACT TEST' : 'TRAFFIC TEST' : sim.report ? 'REPLAY & INSPECT' : 'BUILD MODE'}</small><strong>{sim.running ? sim.paused ? 'Paused. Take a look.' : `${chapter.name} · ${(metrics?.time || 0).toFixed(0)} / ${chapter.duration}s` : sim.report ? 'Drag the timeline to inspect' : validation.valid ? 'Ready for visitors' : 'Connect your first system'}</strong></div></div>
      <div className="l1-metrics"><div><small>INCOMING</small><strong>{metrics ? round(metrics.rps) : '—'}<i>/s</i></strong></div><div className={metrics?.estimatedLatencyMs > CONTRACT_RULES.maxLatencyMs ? 'bad' : ''}><small>EST. LATENCY</small><strong>{metrics?.estimatedLatencyMs ?? '—'}<i>ms</i></strong></div><div className={metrics?.errorRate > CONTRACT_RULES.maxError ? 'bad' : ''}><small>SUCCESS</small><strong>{metrics ? (100 - metrics.errorRate).toFixed(1) : '—'}<i>%</i></strong></div></div>
      <Plot frames={sim.frames} index={scrub} onScrub={!sim.running && sim.frames.length ? index => { setTrace(null); setScrub(index); } : undefined} />
      <div className="l1-run-buttons">{sim.running ? <><button className="l1-secondary" onClick={() => { setTrace(null); setSim(s => ({ ...s, paused: !s.paused })); }} aria-label={sim.paused ? 'Resume traffic' : 'Pause traffic'}>{sim.paused ? <Play size={18} /> : <Pause size={18} />}</button><button className="l1-secondary" onClick={() => { timerState.current = null; setSim(s => ({ ...s, running: false, paused: false })); }} title="Stop test and edit">Edit <X size={16} /></button></> : <><button className="l1-secondary" disabled={unlocked < 2} onClick={() => start(true)} title={unlocked < 2 ? 'Complete the challenges to unlock full-contract testing' : 'Test this design against all three challenges'}><SkipForward size={16} /><span>All three</span></button><button className="l1-primary" onClick={() => start(false)}><Play size={18} fill="currentColor" />{sim.frames.length ? 'Try again' : 'Send traffic'}</button></>}</div>
    </footer>
    {notice && <div className="l1-notice" role="alert"><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss message"><X size={18} /></button></div>}
    {welcome && <Briefing onClose={closeWelcome} />}
    {guide && <Guide type={guide} onClose={closeGuide} />}
    {modelGuide && <ModelGuide onClose={closeModelGuide} />}
    {experimentOpen && <LinkExperimentDialog design={design} state={experimentState} onChange={setExperimentState} onClose={closeExperiment} />}
    {backupsOpen && <BackupsDialog onClose={closeBackups} save={currentSave} recovery={recovery} onRestore={restoreBackup} restoreDisabled={savingRestore || saveStatus.status === 'conflict'} conflict={saveStatus.status === 'conflict' ? <SaveConflict snapshot={saveStatus} currentSave={currentSave} busy={savingRestore} onResolve={restoreBackup} /> : null} />}
  </div>;
}

function RouteIcon() { return <GitFork size={15} />; }

function BackupsDialog({ onClose, conflict, ...props }) {
  const ref = useRef(null);
  useFocusDialog(ref, onClose);
  return <div className="l1-shade"><section ref={ref} className="l1-dialog l1-model-guide" role="dialog" aria-modal="true" aria-labelledby="backups-title"><button className="l1-text-button" onClick={onClose} aria-label="Close save backups"><X size={18} /> Back to your system</button><h2 id="backups-title">Keep your experiments safe.</h2>{conflict}<SaveBackups {...props} /></section></div>;
}

function LinkExperimentDialog({ onClose, ...props }) {
  const ref = useRef(null);
  useFocusDialog(ref, onClose);
  return <div className="l1-shade"><section ref={ref} className="l1-dialog l1-link-lab-dialog" role="dialog" aria-modal="true" aria-labelledby="link-lab-title">
    <button className="l1-text-button" onClick={onClose} aria-label="Close link experiment"><X size={18} /> Back to your system</button>
    <h2 id="link-lab-title">Where does your link live?</h2>
    <LinkExperiment {...props} />
  </section></div>;
}

function ModelGuide({ onClose }) {
  const ref = useRef(null);
  useFocusDialog(ref, onClose);
  return <div className="l1-shade"><section className="l1-dialog l1-model-guide" ref={ref} role="dialog" aria-modal="true" aria-labelledby="model-guide-title">
    <button className="l1-text-button" onClick={onClose} aria-label="Close test measurements"><X size={18} /> Back to your system</button>
    <h2 id="model-guide-title">What does a passing test mean?</h2>
    <p>A repeatable game contract, not a production benchmark. Every retry starts with cold caches and the same five-second traffic ramp.</p>
    <dl>
      <dt>Success · every 0.2 simulation seconds</dt><dd>Every incoming request either completes or is rejected. Components admit only the work they can serve; rejected work stops before the next dependency. Every sample must reach {100 - CONTRACT_RULES.maxError}%; a good average cannot hide a failing burst. There is no waiting queue, retry or timeout in this level.</dd>
      <dt>Estimated latency · at most {CONTRACT_RULES.maxLatencyMs} ms</dt><dd>We add estimated service delays along successful paths, then select the path delay covering 99% of completed traffic. Rejected requests do not masquerade as fast successes. This is not a measured request-time percentile. With no completions, latency is unavailable. The report shows the highest available estimate.</dd>
      <dt>Cost · at most ${LIMIT}/month</dt><dd>All placed components count, including unused ones. Prices and capacities are game units, not cloud-provider quotes.</dd>
      <dt>How does cache warm up?</dt><dd>All callers see the same cache state at the start of a sample. Only a successful origin read can fill it, using capacity left after lookups. A skipped optional fill does not fail that redirect. Successful fills affect later samples.</dd>
      <dt>What is simplified?</dt><dd>Traffic uses fractional request groups, not individual keys or packets. Work within a sample completes immediately; real queueing and network delays are not simulated. Cache warmth estimates reuse rather than tracking entries or expiration. Recorded outcomes follow calls from the selected traffic sample; reply steps explain their synchronous return. “Follow one request” is a separate illustrative walkthrough. Optional cache fills are sample-level work, not claimed as individual trace events.</dd>
      <dt>Your passes stay yours</dt><dd>Recent attempts may roll off the timeline history; earned passes do not. Each pass belongs to a design and a set of rules. Moving components does not change certification. Changing their behavior requires a matching pass; undoing that change restores it.</dd>
    </dl>
    <p className="l1-muted">Model: {MODEL_VERSION}. Rule changes keep old records but require new tests. Replication, failures, real collision probabilities and production sizing are outside this model.</p>
  </section></div>;
}
