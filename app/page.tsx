const items = [
  { task: "Ship checkout retry fix", owner: "Sarah Chen", due: "Today", status: "In review", tone: "review" },
  { task: "Publish Q3 onboarding brief", owner: "Marcus Lee", due: "Sep 2", status: "Open", tone: "open" },
  { task: "Confirm analytics event names", owner: "Priya Shah", due: "Aug 28", status: "Stale", tone: "stale" },
  { task: "Update enterprise pricing page", owner: "Jon Bell", due: "Aug 30", status: "Done", tone: "done" },
];

export default function Home() {
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">L</span><span>LoopClose</span></div>
        <nav aria-label="Main navigation">
          <a className="nav-link active" href="#"><span>⌂</span> Overview</a>
          <a className="nav-link" href="#items"><span>✓</span> Action items <b>12</b></a>
          <a className="nav-link" href="/meetings/new"><span>▤</span> Meetings</a>
          <a className="nav-link" href="/qa"><span>◎</span> QA review <i>3</i></a>
          <a className="nav-link" href="#"><span>✉</span> Notifications</a>
        </nav>
        <div className="sidebar-bottom">
          <a className="nav-link" href="/approvals"><span>⚙</span> Approvals</a>
          <div className="profile"><span className="avatar">AM</span><div><strong>Alex Morgan</strong><small>Team manager</small></div><span>•••</span></div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="mobile-brand">LoopClose</div>
          <label className="search"><span>⌕</span><input aria-label="Search" placeholder="Search action items, meetings..." /></label>
          <div className="top-actions"><button className="icon-button" aria-label="Notifications">♢<em /></button><a className="primary-button button-link" href="/meetings/new">＋ New meeting</a></div>
        </header>

        <div className="content">
          <div className="page-heading"><div><p className="eyebrow">Sunday, 30 August</p><h1>Good morning, Alex.</h1><p>Here’s what needs your attention across the team.</p></div><button className="secondary-button">Last 30 days⌄</button></div>

          <section className="metrics" aria-label="Summary">
            <article><span className="metric-icon violet">✓</span><div><small>Open items</small><strong>12</strong><p><b>↑ 3</b> from last week</p></div></article>
            <article><span className="metric-icon amber">!</span><div><small>Need attention</small><strong>4</strong><p><b>2 overdue</b> · 2 ambiguous</p></div></article>
            <article><span className="metric-icon green">↗</span><div><small>Closed this month</small><strong>28</strong><p><b>94%</b> verified accurately</p></div></article>
            <article><span className="metric-icon blue">◉</span><div><small>Meetings tracked</small><strong>9</strong><p>Across 3 active projects</p></div></article>
          </section>

          <div className="main-grid">
            <section className="panel action-panel" id="items">
              <div className="panel-head"><div><h2>Action items</h2><p>Commitments that are still moving</p></div><a href="#">View all →</a></div>
              <div className="table-head"><span>Task</span><span>Owner</span><span>Due</span><span>Status</span></div>
              {items.map((item) => <div className="item-row" key={item.task}><div><span className={`status-dot ${item.tone}`} /><strong>{item.task}</strong></div><div className="owner"><span>{item.owner.split(" ").map(n => n[0]).join("")}</span>{item.owner}</div><time>{item.due}</time><span className={`pill ${item.tone}`}>{item.status}</span></div>)}
            </section>

            <aside className="panel attention-panel">
              <div className="panel-head"><div><h2>Needs attention</h2><p>Review before these move forward</p></div><span className="count">3</span></div>
              <article className="alert-card"><div className="alert-icon">?</div><div><span className="alert-type">AMBIGUOUS UPDATE</span><strong>“Finalize pricing model”</strong><p>Possible completion mentioned by Marcus, but the evidence is unclear.</p><div><button>Review evidence</button><button className="quiet">Dismiss</button></div></div></article>
              <article className="alert-card"><div className="alert-icon overdue">!</div><div><span className="alert-type overdue-text">OVERDUE · 2 DAYS</span><strong>“Confirm analytics events”</strong><p>Priya hasn’t mentioned this commitment in the last two meetings.</p><div><button>Draft reminder</button></div></div></article>
            </aside>
          </div>

          <section className="activity"><div className="panel-head"><div><h2>Recent agent activity</h2><p>Every autonomous decision, with its evidence</p></div><a href="#">View audit log →</a></div><div className="activity-row"><span className="activity-icon">✓</span><div><strong>Auto-closed “Update enterprise pricing page”</strong><p>Jon said: “The pricing page updates are live now.”</p></div><span className="confidence">96% confidence</span><time>18 min ago</time></div></section>
        </div>
      </section>
    </main>
  );
}
