import { useEffect, useRef, useState } from 'react';
import { Activity, ArrowDown, ArrowRight, BookOpen, Check, ChevronRight, Cloud, Code2, Database, GitFork, Link2, MessageCircle, MousePointer2, Play, RadioTower, RefreshCw, Server, ShieldCheck, Sparkles, Star, Waves, Zap } from 'lucide-react';
import { CATALOG, CHAPTERS, EFFICIENCY_TARGET, LIMIT, costOf, fingerprint, restoreSave } from './levelModel';

const readProgress = () => {
  try { return { save: restoreSave(localStorage.getItem('system-sandbox:first-level:v2')), available: true }; }
  catch { return { save: null, available: false }; }
};

function BoardPreview({ design }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const draw = () => {
      const rect = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      const nodes = design?.nodes || [
        { id: 'internet', type: 'internet', x: 6, y: 44 },
        { id: 'api', type: 'api', x: 39, y: 23 },
        { id: 'db', type: 'database', x: 72, y: 44 },
      ];
      const edges = design?.edges || [{ from: 'internet', to: 'api' }, { from: 'api', to: 'db' }];
      const width = Math.max(48, Math.min(88, rect.width * .16));
      const height = Math.max(40, Math.min(58, rect.height * .22));
      const point = n => ({ x: 12 + n.x / 85 * (rect.width - width - 24), y: 10 + n.y / 82 * (rect.height - height - 20) });
      edges.forEach(edge => {
        const from = nodes.find(n => n.id === edge.from), to = nodes.find(n => n.id === edge.to);
        if (!from || !to) return;
        const a = point(from), b = point(to);
        ctx.beginPath(); ctx.moveTo(a.x + width, a.y + height / 2);
        ctx.bezierCurveTo(a.x + width + 28, a.y + height / 2, b.x - 28, b.y + height / 2, b.x, b.y + height / 2);
        ctx.strokeStyle = '#7da088'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(b.x - 6, b.y + height / 2, 3.5, 0, Math.PI * 2); ctx.fillStyle = '#e4b257'; ctx.fill();
      });
      nodes.forEach(n => {
        const p = point(n), config = CATALOG[n.type], color = config?.color || '#7e9b89';
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.roundRect(p.x, p.y + 5, width, height, n.type === 'database' ? [19, 19, 14, 14] : 13); ctx.fill();
        ctx.fillStyle = '#fff9e7'; ctx.strokeStyle = color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(p.x, p.y, width, height, n.type === 'database' ? [19, 19, 14, 14] : 13); ctx.fill(); ctx.stroke();
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.roundRect(p.x + 9, p.y + 6, 17, 13, 4); ctx.fill();
        ctx.strokeStyle = '#fffae6'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(p.x + 12, p.y + 11); ctx.lineTo(p.x + 23, p.y + 11); ctx.moveTo(p.x + 12, p.y + 15); ctx.lineTo(p.x + 20, p.y + 15); ctx.stroke();
        ctx.fillStyle = '#4c705c'; ctx.font = 'bold 9px system-ui';
        ctx.fillText(config?.short || 'Visitors', p.x + 9, p.y + height - 13, width - 15);
        ctx.fillStyle = '#758367'; ctx.font = '7px system-ui';
        ctx.fillText(n.type === 'internet' ? 'shorten + redirect' : config?.tiers[n.tier || 0].name, p.x + 9, p.y + height - 4, width - 15);
      });
    };
    const observer = new ResizeObserver(draw);
    observer.observe(canvas); draw();
    return () => observer.disconnect();
  }, [design]);
  return <canvas ref={ref} className="hub-preview-canvas" role="img" aria-label={design ? `Saved architecture preview: ${design.nodes.length - 1} components and ${design.edges.length} connections` : 'Illustrated URL shortener: visitors call an API, which calls a database'} />;
}

export default function CampaignHome({ onOpenLevel, onOpenTutorial }) {
  const [progress, setProgress] = useState(readProgress);
  useEffect(() => {
    const refresh = () => setProgress(readProgress());
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => { window.removeEventListener('storage', refresh); window.removeEventListener('focus', refresh); };
  }, []);
  const save = progress.save;
  const hasDesign = Boolean(save && save.design.nodes.length > 1);
  const signature = save ? fingerprint(save.design) : null;
  const passed = CHAPTERS.map(chapter => Boolean(save?.history.some(r => r.chapter === chapter.id && r.passed && r.fingerprint === signature)));
  const passedCount = passed.filter(Boolean).length;
  const cost = save ? costOf(save.design.nodes) : 0;
  const completed = passedCount === 3;
  const chapter = CHAPTERS[save?.chapter || 0];
  const cta = hasDesign ? completed ? 'Return to your system' : 'Continue building' : 'Play your first level';
  const milestones = [
    { name: 'First link', description: 'Make a working short link.', earned: Boolean(save?.history.some(r => r.chapter === 0 && r.passed)) },
    { name: 'Traffic tested', description: 'Pass all three with one design.', earned: completed },
    { name: 'Small & mighty', description: `Pass all three for $${EFFICIENCY_TARGET}/mo or less.`, earned: completed && cost <= EFFICIENCY_TARGET },
  ];

  return <div className="hub-shell">
    <a className="hub-skip" href="#main-content">Skip to main content</a>
    <header className="hub-header">
      <a className="hub-brand" href="#" aria-label="System Sandbox home"><span><GitFork size={26} /></span><div><strong>SYSTEM SANDBOX</strong><small>A LITTLE LAB FOR BIG IDEAS</small></div></a>
      <nav aria-label="Main navigation"><a className="active" href="#missions"><span className="hub-status-dot" /> Play</a><a href="#how-to-play"><BookOpen size={15} /> How to play</a></nav>
      <div className="hub-local"><ShieldCheck size={17} /><span>{hasDesign ? 'Your work is saved' : 'No account needed'}<small>{progress.available ? 'RIGHT HERE, ON THIS DEVICE' : 'BROWSER STORAGE UNAVAILABLE'}</small></span></div>
    </header>

    <main id="main-content" className="hub-main">
      <section className="hub-hero" aria-labelledby="hero-title">
        <div className="hub-hero-copy">
          <span className="hub-eyebrow"><span className="hub-status-dot" /> {hasDesign ? 'WELCOME BACK TO THE WORKBENCH' : 'A PLAYGROUND FOR SYSTEM THINKERS'}</span>
          <h1 id="hero-title">Build systems.<br />Send traffic.<br /><em>Learn what breaks.</em></h1>
          <p>Little servers. Big decisions. Connect the pieces, turn up the traffic, and discover why your system works—or why it doesn’t.</p>
          <div className="hub-hero-actions"><button className="hub-primary" onClick={onOpenLevel}><Play size={18} fill="currentColor" />{cta}<ArrowRight size={18} /></button><a className="hub-quiet-link" href="#how-to-play">Show me how <ArrowDown size={15} /></a></div>
          <div className="hub-play-note">{hasDesign ? <><RefreshCw size={13} /><span>Resume “{chapter.name}” · {save.design.nodes.length - 1} components · ${cost}/mo</span></> : <><MousePointer2 size={14} /><span>No coding required. Learn by playing.</span></>}</div>
        </div>
        <div className="hub-preview-wrap">
          <div className="hub-preview-sticker"><Sparkles size={16} /><span>YOUR IDEAS.<br /><b>YOUR ARCHITECTURE.</b></span></div>
          <div className="hub-preview">
            <div className="hub-preview-top"><span><i className="hub-status-dot" />{hasDesign ? 'YOUR SAVED DESIGN' : 'A PEEK AT THE WORKBENCH'}</span><span>01 / THE LITTLE LINK</span></div>
            <div className="hub-preview-board"><BoardPreview design={hasDesign ? save.design : null} /><span className="hub-preview-caption">{hasDesign ? 'Exactly where you left it.' : 'One small link. A whole system behind it.'}</span></div>
            <div className="hub-preview-bottom"><span><Link2 size={16} /> lnk / bakery</span><span>{hasDesign ? `${passedCount} / 3 challenges tested` : 'BUILD → TEST → UNDERSTAND'}</span></div>
          </div>
          <div className="hub-preview-note"><span>↳</span> There’s more than one right answer.</div>
        </div>
      </section>

      <section id="missions" className="hub-missions" aria-labelledby="missions-title">
        <div className="hub-section-heading"><div><span className="hub-eyebrow">THE CAMPAIGN</span><h2 id="missions-title">Start small. Think bigger.</h2></div><span className="hub-available"><span className="hub-status-dot" /> 1 playable level · more on the drawing board</span></div>
        <div className="hub-mission-grid">
          <article className="hub-featured hub-paper">
            <div className="hub-featured-top"><span className="hub-level-number">01</span><span className="hub-badge">{completed ? <><Check size={12} /> CONTRACT COMPLETE</> : hasDesign ? 'IN PROGRESS' : 'START HERE'}</span></div>
            <div className="hub-featured-title"><span className="hub-link-icon"><Link2 size={28} /></span><div><small>URL SHORTENER</small><h3>The little link</h3></div></div>
            <p>A neighbourhood bakery needs a short link. Build the system that remembers it, then help it handle its first taste of fame.</p>
            <div className="hub-challenge-path" aria-label="Current design progress">{CHAPTERS.map((c, i) => <div key={c.id} className={passed[i] ? 'done' : hasDesign && c.id === chapter.id ? 'current' : ''}><span>{passed[i] ? <Check size={12} /> : `0${i + 1}`}</span><strong>{c.name}</strong><small>{c.tagline}</small></div>)}</div>
            <div className="hub-featured-footer"><span><Activity size={14} /> 3 traffic challenges <i /> Unlimited retries</span><button className="hub-round-button" onClick={onOpenLevel} aria-label={hasDesign ? 'Resume The little link' : 'Open The little link'}><ArrowRight size={20} /></button></div>
          </article>

          <aside className="hub-progress hub-paper" aria-label={hasDesign ? 'Your progress' : 'First time here'}>
            <span className="hub-eyebrow">{hasDesign ? 'YOUR WORKBENCH' : 'FIRST TIME HERE?'}</span>
            <h3>{hasDesign ? completed ? 'A little system, proven.' : 'Pick up your next idea.' : 'You already know enough to start.'}</h3>
            <p>{hasDesign ? completed ? 'Try a different architecture or see how little you can spend. Your current design passed every challenge.' : `Your saved board is on “${chapter.name}.” Change one thing, rerun the same traffic, and see what happens.` : 'Start with two building blocks. The first level introduces everything else as you need it.'}</p>
            {hasDesign ? <div className="hub-save-stats"><span><b>{save.design.nodes.length - 1}</b>components</span><span><b>${cost}</b>monthly cost</span><span><b>{passedCount}<i>/3</i></b>tests passed</span></div> : <div className="hub-starter-tools"><span><Server size={24} /><strong>API server</strong><small>Runs the logic</small></span><PlusSymbol /><span><Database size={24} /><strong>Database</strong><small>Remembers links</small></span></div>}
            <button className="hub-tutorial-button" onClick={onOpenTutorial}><BookOpen size={16} /><span>{hasDesign ? 'Revisit the introduction' : 'Start with the guided introduction'}</span><ChevronRight size={16} /></button>
            <small className="hub-progress-foot">{hasDesign ? 'Revisiting the introduction keeps your saved board.' : 'Hints when you want them. Room to experiment.'}</small>
          </aside>
        </div>

        {hasDesign && <div className="hub-milestones" aria-label="Learning milestones"><div><Star size={18} /><span>Little milestones</span><small>Tested progress, not just placed pieces.</small></div>{milestones.map(m => <div key={m.name} className={m.earned ? 'earned' : ''}><span>{m.earned ? <Check size={14} /> : <Star size={14} />}</span><div><strong>{m.name}</strong><small>{m.description}</small></div></div>)}</div>}

        <div className="hub-next-heading"><span>ON THE DRAWING BOARD</span><span>Future levels · not playable yet</span></div>
        <div className="hub-future-grid">{[
          { number: '02', name: 'The social feed', text: 'One post. A thousand timelines. Who does the work?', icon: RadioTower, tag: 'Fan-out & feeds', tone: 'purple' },
          { number: '03', name: 'Keep the conversation', text: 'Get every message to the right person, in the right order.', icon: MessageCircle, tag: 'Realtime & delivery', tone: 'blue' },
          { number: '04', name: 'Opening night', text: 'The whole world presses play. Keep the show running.', icon: Cloud, tag: 'Storage & streaming', tone: 'orange' },
        ].map(item => { const Icon = item.icon; return <article className={`hub-future ${item.tone}`} key={item.number}><div><span className="hub-future-icon"><Icon size={22} /></span><small>{item.number}</small></div><h3>{item.name}</h3><p>{item.text}</p><span>{item.tag}</span></article>; })}</div>
      </section>

      <section id="how-to-play" className="hub-how" aria-labelledby="how-title">
        <div className="hub-section-heading"><div><span className="hub-eyebrow">THE JOY IS IN FIGURING IT OUT</span><h2 id="how-title">Your next “oh, that’s why.”</h2></div><a className="hub-quiet-link" href="#missions">Back to the workbench <ArrowRight size={14} /></a></div>
        <div className="hub-how-grid">{[
          { icon: GitFork, number: '01', title: 'Build a possibility.', body: 'Place components and connect their calls. Pick the sizes and strategies that make sense to you.' },
          { icon: Waves, number: '02', title: 'Give it some traffic.', body: 'A quiet morning. A viral link. A burst of new data. Watch where your design starts to feel the pressure.' },
          { icon: Zap, number: '03', title: 'Follow your curiosity.', body: 'Pause. Trace one request. Inspect the bottleneck. Change your idea and try the same traffic again.' },
        ].map(step => { const Icon = step.icon; return <article key={step.number}><div><span><Icon size={24} /></span><small>{step.number}</small></div><h3>{step.title}</h3><p>{step.body}</p></article>; })}</div>
        <div className="hub-reassurance"><Code2 size={19} /><p>You’re designing how a system works. <strong>You don’t need to write code to play.</strong></p><span>Build · test · understand · repeat</span></div>
      </section>
    </main>
    <footer className="hub-footer"><span><GitFork size={17} /> SYSTEM SANDBOX <i>Small systems. Satisfying discoveries.</i></span><span>{progress.available ? 'Progress stays in this browser. Clearing site data removes it.' : 'Saving is unavailable in this browser session.'}</span></footer>
  </div>;
}

function PlusSymbol() { return <span className="hub-tool-plus" aria-hidden="true">+</span>; }
