// =============================================================
// pipeline.js: every event goes through processEvent()
// =============================================================

function processEvent(event) {
  event.id = "EV-" + nextEventNumber++;
  event.time = new Date();
  state.stats.total++;

  const account = findAccount(event.account);

  // 1. Account already on hold? Reject without scoring.
  if (account.status !== "Active") {
    event.decision = "REJECTED";
    event.score = null;
    event.reasons = ["Account " + account.status.toLowerCase()];
    state.stats.blocked++;
    if (event.amount) state.stats.valueProtected += event.amount;

    const existingCase = state.cases.find(c => c.account === account.id && c.status === "Open" && c.kind === "block");
    if (existingCase) existingCase.held.push(event);

    addAudit("System", "Activity rejected", `${event.id} ${EVENT_LABELS[event.type]} on ${account.id}: account ${account.status.toLowerCase()}`);
    addToFeed(event);
    return;
  }

  // 2. Score first, then remember
  const result = scoreEvent(event);
  rememberEvent(event);
  event.score = result.score;
  event.reasons = result.reasons;

  // 3. Decide
  if (event.score >= SETTINGS.blockAt) {
    event.decision = "BLOCK";
    account.status = "On hold";
    state.stats.blocked++;
    if (event.amount) state.stats.valueProtected += event.amount;
    openCase(event, "block");
    addAudit("System", "Account placed on hold", `${account.id} · ${event.id} scored ${event.score}: ${event.reasons.join(", ")}`);
    toast(`⛔ ${account.id} placed on hold (score ${event.score})`);

  } else if (event.score >= SETTINGS.verifyAt) {
    event.decision = "VERIFY";
    state.stats.verify++;
    openCase(event, "verify");
    addAudit("System", "Paused for verification", `${event.id} on ${account.id} scored ${event.score}: ${event.reasons.join(", ")}`);

  } else {
    event.decision = "ALLOW";
    state.stats.allowed++;
  }

  addToFeed(event);
}

function openCase(event, kind) {
  const newCase = {
    id: "CASE-" + String(nextCaseNumber++).padStart(4, "0"),
    kind: kind,                 // "verify" or "block"
    account: event.account,
    trigger: event,
    held: [event],
    opened: new Date(),
    status: "Open",
    needsTwo: event.score >= SETTINGS.dualAt,
    approvals: [],              // reviewers who approved
    notes: [],
    code: null,                 // one-time code info
    customerVerified: false,
    outcome: null
  };
  state.cases.unshift(newCase);
  renderQueueCount();
  if (state.view === "queue") renderQueue();
}

function addToFeed(event) {
  state.events.unshift(event);
  if (state.events.length > 300) state.events.pop();
  renderFeed();
  renderKpis();
  if (state.view === "accounts") renderAccounts();
}