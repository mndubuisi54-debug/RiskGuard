// =============================================================
// render.js: draws each screen from `state`
// =============================================================

function decisionPill(decision) {
  if (decision === "ALLOW")  return '<span class="pill pill-ok">ALLOW</span>';
  if (decision === "VERIFY") return '<span class="pill pill-warn">VERIFY</span>';
  if (decision === "BLOCK")  return '<span class="pill pill-bad">BLOCK + HOLD</span>';
  return '<span class="pill pill-bad">REJECTED</span>';
}

function statusPill(status) {
  if (status === "Active") return '<span class="pill pill-ok">Active</span>';
  return `<span class="pill pill-bad">${status}</span>`;
}

function scoreClass(score) {
  if (score === null) return "";
  if (score >= SETTINGS.blockAt) return "bad";
  if (score >= SETTINGS.verifyAt) return "warn";
  return "ok";
}

// ---------- Monitor ----------
function renderFeed() {
  if (state.events.length === 0) return;
  $("feed").innerHTML = state.events.slice(0, 120).map(e => `
    <tr>
      <td>${timeText(e.time)}</td>
      <td>${e.account}</td>
      <td>${describeEvent(e)}
        ${e.reasons.length ? `<div class="reasons">${e.reasons.map(escapeHtml).join(" · ")}</div>` : ""}
      </td>
      <td class="${scoreClass(e.score)}"><b>${e.score ?? "—"}</b></td>
      <td>${decisionPill(e.decision)}</td>
    </tr>`).join("");
}

function renderKpis() {
  $("kpiTotal").textContent = state.stats.total;
  $("kpiAllow").textContent = state.stats.allowed;
  $("kpiVerify").textContent = state.stats.verify;
  $("kpiBlock").textContent = state.stats.blocked;
  $("kpiValue").textContent = money(state.stats.valueProtected);
}

// ---------- Review queue ----------
function renderQueueCount() {
  const open = state.cases.filter(c => c.status === "Open").length;
  $("queueCount").textContent = open;
  $("queueCount").classList.toggle("hidden", open === 0);
}

function renderQueue() {
  const filter = $("queueFilter").value;
  const list = state.cases.filter(c =>
    filter === "all" || (filter === "open" ? c.status === "Open" : c.status === "Resolved"));

  if (list.length === 0) {
    $("queue").innerHTML = '<div class="card empty">No cases here.</div>';
    return;
  }
  $("queue").innerHTML = list.map(caseCard).join("");
}

function caseCard(c) {
  const account = findAccount(c.account);
  const e = c.trigger;
  const heldValue = c.held.reduce((sum, ev) => sum + (ev.amount || 0), 0);

  const requirement = c.kind === "block"
    ? `Account on hold. Needs reviewer approval${c.needsTwo ? ` from <b>two different reviewers</b> (${c.approvals.length}/2)` : ""}.`
    : "One activity paused. Resumes when the customer enters the code, or a reviewer approves.";

  const badges =
    (c.kind === "block" ? '<span class="pill pill-bad">ACCOUNT HOLD</span>' : '<span class="pill pill-warn">VERIFY</span>') +
    (c.needsTwo ? ' <span class="pill pill-warn">2 REVIEWERS</span>' : "") +
    (c.customerVerified ? ' <span class="pill pill-ok">CUSTOMER VERIFIED</span>' : "") +
    (c.status === "Resolved" ? ` <span class="pill pill-ok">RESOLVED</span> <span class="reasons">${escapeHtml(c.outcome)}</span>` : "");

  const notes = c.notes.map(n =>
    `<div><b>${escapeHtml(n.by)}</b> <span class="reasons">${timeText(n.time)} · ${n.action}</span><br>${escapeHtml(n.text)}</div>`
  ).join("");

  return `
  <div class="case">
    <div class="case-head">
      <div><b>${c.id}</b> ${badges}</div>
      <div class="reasons">Opened ${timeText(c.opened)}</div>
    </div>
    <div class="case-body">
      <div>
        <div class="details">
          <div>Account</div><div>${account.id} · ${escapeHtml(account.name)} (${account.type})</div>
          <div>Status</div><div>${statusPill(account.status)}</div>
          <div>Trigger</div><div>${describeEvent(e)}</div>
          <div>Risk score</div><div class="${scoreClass(e.score)}"><b>${e.score} / 100</b></div>
          <div>Signals</div><div>${e.reasons.map(r => "• " + escapeHtml(r)).join("<br>")}</div>
          <div>Held activity</div><div>${c.held.length} item(s), ${money(heldValue)}</div>
          <div>To resume</div><div>${requirement}</div>
        </div>
        ${notes ? `<div class="box" style="margin-top:10px"><h4>Review notes</h4>${notes}</div>` : ""}
      </div>
      <div>${c.status === "Open" ? actionPanel(c) : `<div class="box"><h4>Outcome</h4>${escapeHtml(c.outcome)}</div>`}</div>
    </div>
  </div>`;
}

function actionPanel(c) {
  const reviewer = currentReviewer();
  const codeIsLive = c.code && (Date.now() - c.code.sentAt) / 1000 <= SETTINGS.codeLifetime;

  return `
    <div class="box">
      <h4>1 · Customer verification</h4>
      <div class="note">Code goes to the phone already on file, never to details changed recently.</div>
      <div class="row">
        <button onclick="sendCode('${c.id}')">${c.code ? "Resend code" : "Send code"}</button>
        <input id="code-${c.id}" placeholder="6-digit code" maxlength="6" style="width:130px">
        <button onclick="checkCode('${c.id}')" ${c.code ? "" : "disabled"}>Verify</button>
      </div>
      ${codeIsLive ? `<div class="phone">📱 Customer's phone: your code is <b>${c.code.value}</b></div>` : ""}
    </div>
    <div class="box">
      <h4>2 · Authorised review</h4>
      <div class="note">Signed in as <b>${escapeHtml(reviewer.name)}</b> (${reviewer.role})</div>
      <textarea id="note-${c.id}" rows="2" style="width:100%;margin-top:8px" placeholder="Review note (required)"></textarea>
      <div class="row">
        <input id="pin-${c.id}" type="password" placeholder="PIN" style="width:90px">
        <button class="good" onclick="reviewCase('${c.id}', 'approve')">Approve</button>
        <button class="danger" onclick="reviewCase('${c.id}', 'fraud')">Confirm fraud</button>
        ${c.needsTwo ? "" : `<button onclick="reviewCase('${c.id}', 'escalate')">Escalate</button>`}
      </div>
      <div class="note">Demo PINs: Patel 1111 · Okafor 2222 · Chen 3333</div>
    </div>
    <div class="err" id="err-${c.id}"></div>`;
}

// ---------- Accounts ----------
function renderAccounts() {
  $("accounts").innerHTML = ACCOUNTS.map(a => `
    <tr>
      <td>${a.id}<div class="reasons">${escapeHtml(a.name)}</div></td>
      <td>${a.type}</td>
      <td>${a.country}</td>
      <td>${a.devices.join("<br>")}</td>
      <td>${a.avgOrder ? money(a.avgOrder) : "Balance " + money(a.balance)}</td>
      <td>${statusPill(a.status)}</td>
      <td>${a.status === "Active" ? `<button onclick="manualHold('${a.id}')">Place hold</button>` : ""}</td>
    </tr>`).join("");
}

// ---------- Rules ----------
function renderRules() {
  $("rules").innerHTML = RULES.map((rule, i) => `
    <div class="rule">
      <input type="checkbox" ${rule.on ? "checked" : ""} onchange="toggleRule(${i}, this.checked)">
      <div><b>${rule.name}</b><small>${rule.desc}</small></div>
      <input type="number" min="0" max="100" value="${rule.weight}" onchange="setWeight(${i}, this.value)">
    </div>`).join("");

  $("thVerify").value = SETTINGS.verifyAt;
  $("thBlock").value = SETTINGS.blockAt;
  $("thDual").value = SETTINGS.dualAt;
}

// ---------- Audit ----------
function renderAudit() {
  if (state.audit.length === 0) {
    $("audit").innerHTML = '<tr><td colspan="4" class="empty">No entries yet.</td></tr>';
    return;
  }
  $("audit").innerHTML = state.audit.map(a => `
    <tr>
      <td>${timeText(a.time)}</td>
      <td>${escapeHtml(a.actor)}</td>
      <td><b>${escapeHtml(a.action)}</b></td>
      <td class="reasons">${escapeHtml(a.detail)}</td>
    </tr>`).join("");
}

// ---------- Switch tabs ----------
function showView(view) {
  state.view = view;
  document.querySelectorAll("nav a").forEach(a => a.classList.toggle("active", a.dataset.view === view));
  document.querySelectorAll("main > section").forEach(s => s.classList.toggle("hidden", s.id !== "view-" + view));

  if (view === "queue") renderQueue();
  if (view === "accounts") renderAccounts();
  if (view === "rules") renderRules();
  if (view === "audit") renderAudit();
}