/** Local-only admin dashboard HTML (served at GET /admin). */
export function renderAdminDashboard(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SplitSOL Admin</title>
  <style>
    :root {
      --bg: #0f172a;
      --card: #1e293b;
      --border: #334155;
      --text: #f1f5f9;
      --muted: #94a3b8;
      --accent: #a855f7;
      --green: #22c55e;
      --amber: #f59e0b;
      --red: #ef4444;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
    }
    .wrap { max-width: 1200px; margin: 0 auto; padding: 24px 20px 48px; }
    header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 28px;
    }
    h1 { margin: 0; font-size: 1.75rem; font-weight: 700; }
    h1 span { color: var(--accent); }
    .sub { color: var(--muted); font-size: 0.875rem; margin-top: 4px; }
    .actions { display: flex; gap: 8px; align-items: center; }
    button {
      background: var(--accent);
      color: white;
      border: none;
      border-radius: 10px;
      padding: 10px 16px;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.875rem;
    }
    button:hover { filter: brightness(1.08); }
    button.secondary {
      background: transparent;
      border: 1px solid var(--border);
      color: var(--text);
    }
    .badge {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      background: #581c87;
      color: #e9d5ff;
      padding: 4px 8px;
      border-radius: 6px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 14px;
      margin-bottom: 28px;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 18px;
    }
    .card.hero {
      grid-column: span 2;
      background: linear-gradient(135deg, #1e293b 0%, #312e81 100%);
      border-color: #4c1d95;
    }
    @media (max-width: 640px) {
      .card.hero { grid-column: span 1; }
    }
    .label { color: var(--muted); font-size: 0.8rem; margin-bottom: 6px; }
    .value { font-size: 1.65rem; font-weight: 700; }
    .value.sm { font-size: 1.25rem; }
    .hint { color: var(--muted); font-size: 0.75rem; margin-top: 6px; }
    section { margin-bottom: 32px; }
    section h2 {
      font-size: 1rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--muted);
      margin: 0 0 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    th, td {
      text-align: left;
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
    }
    th { color: var(--muted); font-weight: 600; }
    .mono { font-family: ui-monospace, monospace; font-size: 0.75rem; color: var(--muted); }
    .type-settlement { color: var(--accent); }
    .type-peer { color: var(--green); }
    .error {
      background: #450a0a;
      border: 1px solid #991b1b;
      color: #fecaca;
      padding: 14px 16px;
      border-radius: 12px;
      margin-bottom: 20px;
    }
    .loading { color: var(--muted); padding: 40px 0; text-align: center; }
    .period-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 14px;
    }
    .period-card h3 { margin: 0 0 12px; font-size: 1rem; }
    .period-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid var(--border);
      font-size: 0.875rem;
    }
    .period-row:last-child { border-bottom: none; }
    .tag-bug { color: var(--red); font-weight: 600; text-transform: capitalize; }
    .tag-suggestion { color: var(--green); font-weight: 600; text-transform: capitalize; }
    .tag-other { color: var(--amber); font-weight: 600; text-transform: capitalize; }
    .feedback-msg { max-width: 420px; white-space: pre-wrap; word-break: break-word; }
    .filter-row { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
    .filter-btn {
      background: var(--card);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 0.8rem;
      cursor: pointer;
    }
    .filter-btn.active { border-color: var(--accent); color: var(--accent); }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <div>
        <h1>Split<span>SOL</span> Admin</h1>
        <p class="sub">Local dashboard — no auth (disabled in production)</p>
      </div>
      <div class="actions">
        <span class="badge" id="status">Loading…</span>
        <button type="button" class="secondary" id="autoBtn">Auto-refresh: ON</button>
        <button type="button" id="refreshBtn">Refresh</button>
      </div>
    </header>
    <div id="error" class="error" hidden></div>
    <div id="content"><p class="loading">Loading stats…</p></div>
  </div>
  <script>
    const fmtUsd = (n) => '$' + Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const fmtNum = (n) => Number(n || 0).toLocaleString();
    const fmtDate = (iso) => new Date(iso).toLocaleString();
    const shortTx = (tx) => tx && tx.length > 16 ? tx.slice(0, 8) + '…' + tx.slice(-6) : tx;

    let autoRefresh = true;
    let timer = null;
    let feedbackFilter = 'all';
    let feedbackItems = [];

    function escapeHtml(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    function statCard(label, value, hint, hero) {
      return '<div class="card' + (hero ? ' hero' : '') + '">' +
        '<div class="label">' + label + '</div>' +
        '<div class="value' + (hero ? '' : ' sm') + '">' + value + '</div>' +
        (hint ? '<div class="hint">' + hint + '</div>' : '') +
      '</div>';
    }

    function periodCard(title, p) {
      const rows = [
        ['Revenue', fmtUsd(p.revenue_usdc)],
        ['Transactions', fmtNum(p.transactions)],
        ['Settlements', fmtNum(p.settlements)],
        ['Peer sends', fmtNum(p.peer_transfers)],
        ['Volume', fmtUsd(p.volume_usdc)],
        ['New users', fmtNum(p.new_users)],
        ['Expenses', fmtNum(p.expenses)],
        ['Expense volume', fmtUsd(p.expense_volume_usdc)],
      ];
      return '<div class="card period-card"><h3>' + title + '</h3>' +
        rows.map(([k, v]) => '<div class="period-row"><span>' + k + '</span><strong>' + v + '</strong></div>').join('') +
      '</div>';
    }

    function render(data) {
      const u = data.users;
      const r = data.revenue;
      const t = data.transactions;
      const g = data.groups;
      const e = data.expenses;
      const s = data.social;
      const f = data.feedback;

      let html = '<div class="grid">';
      html += statCard('Total revenue (platform fees)', fmtUsd(r.total_usdc), r.settlement_count + ' settlements × $' + data.platform.fee_per_settlement_usdc + ' fee', true);
      html += statCard('Total transactions', fmtNum(t.total), t.on_chain + ' on-chain · ' + t.dev_mock + ' dev mock');
      html += statCard('Transaction volume', fmtUsd(t.total_volume_usdc), 'Settlements + peer sends');
      html += statCard('Registered users', fmtNum(u.total), u.with_username + ' with username');
      html += statCard('Active users (7d)', fmtNum(u.active_7d), 'Any app activity in last 7 days');
      html += statCard('Active users (30d)', fmtNum(u.active_30d), 'Any app activity in last 30 days');
      html += statCard('New users (7d)', fmtNum(u.new_7d), 'Accounts created');
      html += statCard('New users (30d)', fmtNum(u.new_30d), 'Accounts created');
      html += statCard('Active groups', fmtNum(g.active), g.archived + ' archived · ' + g.total_memberships + ' memberships');
      html += statCard('Expenses tracked', fmtNum(e.active), fmtUsd(e.total_volume_usdc) + ' total volume');
      html += statCard('Friend pairs', fmtNum(s.mutual_friend_pairs), s.pending_friend_requests + ' pending requests');
      html += statCard('Push-enabled users', fmtNum(u.with_push_token), 'Devices registered for notifications');
      html += statCard('User feedback', fmtNum(f.total), f.bugs + ' bugs · ' + f.suggestions + ' suggestions · ' + f.last_7d + ' this week');
      html += '</div>';

      html += '<section><h2>Period breakdown</h2><div class="period-grid">';
      html += periodCard('Last 7 days', data.periods.last_7d);
      html += periodCard('Last 30 days', data.periods.last_30d);
      html += '</div></section>';

      html += '<section><h2>Platform</h2><div class="grid">';
      html += statCard('Fee wallet', data.platform.wallet_address || 'Not configured', 'Receives settlement fees');
      html += statCard('Settlement volume (debts paid)', fmtUsd(t.settlement_volume_usdc), 'Sum of settlement_transfers');
      html += statCard('Peer send volume', fmtUsd(t.peer_volume_usdc), 'Direct USDC between users');
      html += statCard('On-chain settlements', fmtNum(r.on_chain_settlements), fmtNum(r.dev_mock_settlements) + ' dev mock');
      html += '</div></section>';

      html += '<section><h2>Recent transactions</h2><div class="card" style="padding:0;overflow:hidden">';
      if (!data.recent.length) {
        html += '<p class="loading" style="padding:24px">No transactions yet</p>';
      } else {
        html += '<table><thead><tr><th>Type</th><th>Amount</th><th>Fee</th><th>When</th><th>Tx</th></tr></thead><tbody>';
        for (const item of data.recent) {
          html += '<tr>' +
            '<td class="type-' + item.type.replace('_', '-') + '">' + item.label + '</td>' +
            '<td>' + fmtUsd(item.amount_usdc) + '</td>' +
            '<td>' + (item.platform_fee_usdc != null ? fmtUsd(item.platform_fee_usdc) : '—') + '</td>' +
            '<td>' + fmtDate(item.created_at) + '</td>' +
            '<td class="mono" title="' + item.tx_signature + '">' + shortTx(item.tx_signature) + '</td>' +
          '</tr>';
        }
        html += '</tbody></table>';
      }
      html += '</div></section>';

      html += renderFeedbackSection();

      return html;
    }

    function renderFeedbackSection() {
      const filtered = feedbackFilter === 'all'
        ? feedbackItems
        : feedbackItems.filter((item) => item.category === feedbackFilter);

      let html = '<section id="feedback-section"><h2>User feedback</h2>';
      html += '<div class="filter-row">';
      for (const cat of ['all', 'bug', 'suggestion', 'other']) {
        const label = cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1);
        html += '<button type="button" class="filter-btn' + (feedbackFilter === cat ? ' active' : '') + '" data-filter="' + cat + '">' + label + '</button>';
      }
      html += '</div>';
      html += '<div class="card" style="padding:0;overflow:hidden">';
      if (!filtered.length) {
        html += '<p class="loading" style="padding:24px">No feedback yet</p>';
      } else {
        html += '<table><thead><tr><th>Type</th><th>User</th><th>Message</th><th>Platform</th><th>When</th></tr></thead><tbody>';
        for (const item of filtered) {
          const userLabel = item.user.username
            ? '@' + escapeHtml(item.user.username)
            : escapeHtml(item.user.display_name);
          html += '<tr>' +
            '<td class="tag-' + item.category + '">' + item.category + '</td>' +
            '<td>' + userLabel + '</td>' +
            '<td class="feedback-msg">' + escapeHtml(item.message) + '</td>' +
            '<td class="mono">' + escapeHtml(item.platform || '—') + '</td>' +
            '<td>' + fmtDate(item.created_at) + '</td>' +
          '</tr>';
        }
        html += '</tbody></table>';
      }
      html += '</div></section>';
      return html;
    }

    function bindFeedbackFilters() {
      document.querySelectorAll('.filter-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          feedbackFilter = btn.getAttribute('data-filter') || 'all';
          fetch('/admin/stats')
            .then((r) => r.json())
            .then((data) => {
              document.getElementById('content').innerHTML = render(data);
              bindFeedbackFilters();
            })
            .catch(() => {});
        });
      });
    }

    async function load() {
      const errEl = document.getElementById('error');
      const content = document.getElementById('content');
      const status = document.getElementById('status');
      errEl.hidden = true;
      try {
        const [statsRes, feedbackRes] = await Promise.all([
          fetch('/admin/stats'),
          fetch('/admin/feedback'),
        ]);
        if (!statsRes.ok) {
          const body = await statsRes.json().catch(() => ({}));
          throw new Error(body.error || statsRes.statusText);
        }
        const data = await statsRes.json();
        if (feedbackRes.ok) {
          const fb = await feedbackRes.json();
          feedbackItems = fb.items || [];
        }
        content.innerHTML = render(data);
        bindFeedbackFilters();
        status.textContent = 'Updated ' + fmtDate(data.generated_at);
      } catch (e) {
        errEl.textContent = e.message || 'Failed to load stats';
        errEl.hidden = false;
        status.textContent = 'Error';
        content.innerHTML = '<p class="loading">Could not load stats. Is Supabase configured?</p>';
      }
    }

    function schedule() {
      if (timer) clearInterval(timer);
      if (autoRefresh) timer = setInterval(load, 30000);
    }

    document.getElementById('refreshBtn').addEventListener('click', load);
    document.getElementById('autoBtn').addEventListener('click', () => {
      autoRefresh = !autoRefresh;
      document.getElementById('autoBtn').textContent = 'Auto-refresh: ' + (autoRefresh ? 'ON' : 'OFF');
      schedule();
    });

    load();
    schedule();
  </script>
</body>
</html>`;
}
