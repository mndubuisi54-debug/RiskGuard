// =============================================================
// main.js: connects the buttons and starts the app
// =============================================================

// Fill the reviewer menu
$("reviewer").innerHTML = REVIEWERS
  .map(r => `<option value="${r.id}">${r.name} · ${r.role}</option>`)
  .join("");

$("reviewer").addEventListener("change", () => {
  addAudit(currentReviewer().name, "Signed in", currentReviewer().role);
  if (state.view === "queue") renderQueue();
});

// Tabs
document.querySelectorAll("nav a").forEach(link => {
  link.addEventListener("click", () => showView(link.dataset.view));
});

// Header controls
$("liveBtn").addEventListener("click", toggleLive);
$("speed").addEventListener("change", restartTimer);

// Scenario buttons
document.querySelectorAll("[data-scenario]").forEach(button => {
  button.addEventListener("click", () => runScenario(button.dataset.scenario));
});

// Queue filter and thresholds
$("queueFilter").addEventListener("change", renderQueue);
$("saveThresholds").addEventListener("click", saveThresholds);

// First draw
renderKpis();
renderAccounts();
addAudit("System", "Monitoring started", RULES.length + " rules loaded");