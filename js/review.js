// =============================================================
// review.js: customer codes, reviewer sign-off, rule settings
// =============================================================

function findCase(caseId) {
  return state.cases.find(c => c.id === caseId);
}

function closeCase(c, outcome) {
  c.status = "Resolved";
  c.outcome = outcome;
  c.closed = new Date();
  renderQueueCount();
}

// ---------- Customer verification ----------
function sendCode(caseId) {
  const c = findCase(caseId);
  c.code = {
    value: String(Math.floor(100000 + Math.random() * 900000)),
    sentAt: Date.now(),
    tries: 0
  };
  addAudit("System", "Verification code sent", `${c.id} to phone on file for ${c.account}`);
  renderQueue();
}

function checkCode(caseId) {
  const c = findCase(caseId);
  const typed = $("code-" + caseId).value.trim();
  const errorBox = $("err-" + caseId);
  const account = findAccount(c.account);

  if (!c.code) { errorBox.textContent = "Send a code first."; return; }

  // Expired?
  if ((Date.now() - c.code.sentAt) / 1000 > SETTINGS.codeLifetime) {
    c.code = null;
    addAudit("System", "Code expired", c.id);
    renderQueue();
    return;
  }

  c.code.tries++;

  // Correct code
  if (typed === c.code.value) {
    c.customerVerified = true;
    c.code = null;
    if (c.kind === "verify") {
      closeCase(c, "Customer verified with one-time code");
      addAudit("Customer", "Identity verified", `${c.id}: activity resumed`);
      toast("✅ Verified. Activity resumed.");
    } else {
      // A hold still needs a reviewer
      addAudit("Customer", "Identity verified", `${c.id}: waiting for reviewer`);
      toast("Customer verified. A reviewer must still release the hold.");
    }
    renderQueue();
    return;
  }

  // Wrong code
  addAudit("Customer", "Wrong code", `${c.id} attempt ${c.code.tries}`);
  if (c.code.tries >= SETTINGS.maxCodeTries) {
    c.kind = "block";
    c.code = null;
    account.status = "On hold";
    addAudit("System", "Too many wrong codes", `${c.id}: ${account.id} placed on hold`);
    toast(`⛔ Too many wrong codes. ${account.id} placed on hold.`);
    renderQueue();
    renderAccounts();
  } else {
    errorBox.textContent = `Wrong code. ${SETTINGS.maxCodeTries - c.code.tries} attempt(s) left.`;
  }
}

// ---------- Reviewer sign-off ----------
// Returns an error message, or null if the reviewer is allowed to act
function checkReviewer(c, pin) {
  const reviewer = currentReviewer();
  if (reviewer.level < 1) return "Your role cannot resolve cases.";
  if (pin !== reviewer.pin) return "Wrong PIN.";
  if (c.approvals.includes(reviewer.id)) return "You already approved. A different reviewer must give the second approval.";
  return null;
}

function reviewCase(caseId, action) {
  const c = findCase(caseId);
  const account = findAccount(c.account);
  const reviewer = currentReviewer();
  const note = $("note-" + caseId).value.trim();
  const pin = $("pin-" + caseId).value.trim();
  const errorBox = $("err-" + caseId);

  if (note.length < 10) { errorBox.textContent = "Write a review note (10+ characters)."; return; }

  const problem = checkReviewer(c, pin);
  if (problem) {
    errorBox.textContent = problem;
    addAudit(reviewer.name, "Review refused", `${c.id}: ${problem}`);
    return;
  }

  c.notes.push({ by: reviewer.name, time: new Date(), action, text: note });

  if (action === "approve") {
    c.approvals.push(reviewer.id);
    if (c.needsTwo && c.approvals.length < 2) {
      addAudit(reviewer.name, "First approval", `${c.id}: ${note}`);
      toast("First approval recorded. A second reviewer is needed.");
      renderQueue();
      return;
    }
    closeCase(c, "Approved by reviewer");
    account.status = "Active";
    addAudit(reviewer.name, "Approved and released", `${c.id} · ${account.id}: ${note}`);
    toast(`✅ ${account.id} released.`);
  }

  if (action === "fraud") {
    closeCase(c, "Fraud confirmed: held activity cancelled");
    if (c.kind === "block") account.status = "Suspended";
    addAudit(reviewer.name, "Fraud confirmed", `${c.id} · ${account.id}: ${note}`);
    toast(`${account.id}: fraud confirmed.`);
  }

  if (action === "escalate") {
    c.needsTwo = true;
    addAudit(reviewer.name, "Escalated", `${c.id}: ${note}`);
    toast("Escalated: two reviewers now required.");
  }

  renderQueue();
  renderAccounts();
}

// ---------- Manual hold ----------
function manualHold(accountId) {
  const reviewer = currentReviewer();
  if (reviewer.level < 1) { toast("Your role cannot place holds."); return; }

  const account = findAccount(accountId);
  account.status = "On hold";
  openCase({
    id: "MANUAL", account: accountId, type: "login", time: new Date(),
    country: account.country, device: "—",
    score: SETTINGS.blockAt, reasons: ["Manual hold by " + reviewer.name], decision: "BLOCK"
  }, "block");
  addAudit(reviewer.name, "Manual hold", accountId);
  renderAccounts();
}

// ---------- Rule settings ----------
function toggleRule(index, isOn) {
  RULES[index].on = isOn;
  addAudit(currentReviewer().name, isOn ? "Rule enabled" : "Rule disabled", RULES[index].name);
}

function setWeight(index, value) {
  RULES[index].weight = Number(value);
  addAudit(currentReviewer().name, "Rule weight changed", `${RULES[index].name} → ${value}`);
}

function saveThresholds() {
  const reviewer = currentReviewer();
  if (reviewer.level < 3) { toast("Only a Fraud Ops Manager can change thresholds."); return; }

  const verifyAt = Number($("thVerify").value);
  const blockAt = Number($("thBlock").value);
  const dualAt = Number($("thDual").value);
  if (!(verifyAt < blockAt && blockAt <= dualAt)) {
    toast("Thresholds must be: verify < block ≤ two reviewers.");
    return;
  }
  SETTINGS.verifyAt = verifyAt;
  SETTINGS.blockAt = blockAt;
  SETTINGS.dualAt = dualAt;
  addAudit(reviewer.name, "Thresholds changed", `verify ${verifyAt}, block ${blockAt}, two reviewers ${dualAt}`);
  toast("Thresholds saved.");
}